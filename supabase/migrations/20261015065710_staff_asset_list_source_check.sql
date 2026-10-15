-- Read only sanitized metadata from protected columns; do not grant path access.
-- The public list RPCs stay SECURITY INVOKER and keep their existing RLS.
-- This private definer is necessary only for columns that staff cannot SELECT.
create or replace function private.lesson_asset_display_state(p_asset_id uuid, p_class_id uuid default null)
returns table (has_source boolean, rights_note text)
language sql stable security definer set search_path = ''
as $$
  select (a.storage_path is not null or a.external_url is not null),
         case when private.is_hq_admin() then a.rights_note else null::text end
  from public.lesson_assets a
  where a.id = p_asset_id
    and auth.uid() is not null
    and (
      private.is_hq_admin()
      or (
        p_class_id is not null
        and (private.is_assigned_class_teacher(p_class_id) or private.is_org_director_of_class(p_class_id))
        and private.class_lesson_scenes_readable(p_class_id, a.lesson_id)
      )
    );
$$;
revoke execute on function private.lesson_asset_display_state(uuid, uuid) from public, anon;
grant execute on function private.lesson_asset_display_state(uuid, uuid) to authenticated;

create or replace function public.list_lesson_assets_for_class(
  p_class_id uuid,
  p_lesson_id uuid
)
returns table (
  asset_id uuid,
  asset_type text,
  title text,
  content_type text,
  duration_seconds integer,
  page_count integer,
  version_label text,
  usage_point text,
  usage_note text,
  sort_order integer,
  download_allowed boolean,
  has_source boolean,
  playable boolean,
  unavailable_reason text
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    a.id,
    a.asset_type,
    a.title,
    a.content_type,
    a.duration_seconds,
    a.page_count,
    a.version_label,
    a.usage_point,
    a.usage_note,
    a.sort_order,
    a.download_allowed,
    display.has_source,
    private.class_asset_playable(p_class_id, a.id) as playable,
    case
      when not display.has_source then 'not_registered'
      when a.approval_status <> 'published' then 'awaiting_approval'
      when a.rights_status <> 'cleared' then 'rights_unverified'
      when not private.class_has_feature(p_class_id, 'content_playback') then 'feature_unreleased'
      when not private.class_week_entitled(p_class_id, l.week_no) then 'out_of_contract_scope'
      else null
    end as unavailable_reason
  from public.lesson_assets a
  join public.curriculum_lessons l on l.id = a.lesson_id
  cross join lateral private.lesson_asset_display_state(a.id, p_class_id) display
  where a.lesson_id = p_lesson_id
    -- 담당 교사 또는 같은 기관 원장만. 서버에서 다시 확인한다.
    and (
      (select private.is_assigned_class_teacher(p_class_id))
      or (select private.is_hq_admin())
      or exists (
        select 1
        from public.classes c
        where c.id = p_class_id
          and (select private.has_org_role(c.organization_id, array['director']))
      )
    )
  order by a.asset_type, a.sort_order;
$$;

comment on function public.list_lesson_assets_for_class(uuid, uuid) is
  '한 차시의 자산 목록. 저장 경로를 반환하지 않고, 쓸 수 없는 이유를 구분해 돌려준다.';

revoke execute on function public.list_lesson_assets_for_class(uuid, uuid) from public;
revoke execute on function public.list_lesson_assets_for_class(uuid, uuid) from anon;
grant execute on function public.list_lesson_assets_for_class(uuid, uuid) to authenticated;

create or replace function public.list_lesson_assets_for_admin(p_lesson_id uuid)
returns table (
  asset_id uuid,
  asset_type text,
  title text,
  version_label text,
  approval_status text,
  rights_status text,
  rights_note text,
  download_allowed boolean,
  has_source boolean,
  usage_point text,
  usage_note text,
  source_ref text,
  sort_order integer,
  updated_at timestamptz
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    a.id, a.asset_type, a.title, a.version_label,
    a.approval_status, a.rights_status, display.rights_note, a.download_allowed,
    display.has_source,
    a.usage_point, a.usage_note, a.source_ref, a.sort_order, a.updated_at
  from public.lesson_assets a
  cross join lateral private.lesson_asset_display_state(a.id, null::uuid) display
  where a.lesson_id = p_lesson_id
    and (select private.is_hq_admin())
  order by a.asset_type, a.sort_order;
$$;

revoke execute on function public.list_lesson_assets_for_admin(uuid) from public, anon;
grant execute on function public.list_lesson_assets_for_admin(uuid) to authenticated;
