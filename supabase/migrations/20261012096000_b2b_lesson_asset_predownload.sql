-- =====================================================================
-- B2b — 권한 · 다운로드 정책에 따른 자료 사전 다운로드 (사용자 지시 항목 1)
-- ---------------------------------------------------------------------
-- 배경: B2(20261012092000) 가 `lesson_assets.download_allowed` 를 **기본 false**
--       로 두었다. 유형별 정책(워크북은 인쇄 필요 · 영상은 스트리밍)이 확정되지
--       않았기 때문이다. 재생 경로(`resolve_lesson_asset_path`)는 그 값을 보지
--       않는다 — 재생과 다운로드는 다른 허용이다.
--
-- 이 migration 이 더하는 것
--   ① 다운로드 전용 경로 해석 — `download_allowed` 를 **반드시** 확인한다
--   ② 내려받아 둔 자산의 재확인 — 정책이 바뀌면 기기에서 지우게 만든다
--   ③ HQ 가 자산 정책을 바꾸는 단일 경로 — 사유 필수 · audit 기록
--
-- ★ 기본값을 바꾸지 않는다.
--   이 migration 은 어떤 자산의 `download_allowed` 도 켜지 않는다. 정책이
--   정해지면 HQ 가 ③ 으로 자산마다 켠다.
--
-- ★ 재생 허용을 다운로드 허용으로 넓히지 않는다.
--   `class_asset_playable` 에 손대지 않는다. 다운로드는 그 판정 **위에**
--   `download_allowed` 를 하나 더 요구한다.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 다운로드 경로 해석
-- ---------------------------------------------------------------------
-- ★ `resolve_lesson_asset_path` 를 바꾸지 않고 별도 함수를 둔다.
--   재생만 되는 자산을 실수로 내려받게 만들 수 없게, 호출 지점부터 다르게 둔다.
-- ★ 결과를 클라이언트로 보내지 않는다. 서버가 서명 URL 을 만드는 데만 쓴다.
-- ★ 판정에 실패하면 null 이다. 왜 실패했는지 알려 주지 않는다.

create or replace function public.resolve_lesson_asset_download_path(
  p_class_id uuid,
  p_asset_id uuid
)
returns text
language sql
security invoker
set search_path = ''
stable
as $$
  select a.storage_path
  from public.lesson_assets a
  where a.id = p_asset_id
    -- ★ 다운로드 정책. 이 한 줄이 이 함수의 존재 이유다.
    and a.download_allowed = true
    -- 외부 호스팅 자산은 내려받지 않는다. 우리 저장소의 파일만 받는다.
    and a.storage_path is not null
    and private.class_asset_playable(p_class_id, p_asset_id)
    and (
      (select private.is_assigned_class_teacher(p_class_id))
      or (select private.is_hq_admin())
      or exists (
        select 1
        from public.classes c
        where c.id = p_class_id
          and (select private.has_org_role(c.organization_id, array['director']))
      )
    );
$$;

revoke execute on function public.resolve_lesson_asset_download_path(uuid, uuid)
  from public, anon;
grant execute on function public.resolve_lesson_asset_download_path(uuid, uuid)
  to authenticated;


-- ---------------------------------------------------------------------
-- 2. 내려받아 둔 자산 재확인
-- ---------------------------------------------------------------------
-- ★ 기기에 받아 둔 파일은 서버가 지울 수 없다. 그래서 앱이 물어보고 지운다.
--   이 함수는 "지금도 허용되는가"만 돌려준다.
-- ★ **허용되지 않는 자산은 행을 돌려주지 않는다.** 앱은 "행이 없음 = 허용 안 됨"
--   으로 처리한다. 이유를 돌려주지 않는 이유는, 이 호출이 기기에 이미 파일이
--   있는 상태에서 일어나기 때문이다 — 이유를 알려 주는 것보다 지우는 쪽이 먼저다.
-- ★ 한 번에 확인할 개수를 제한한다. 목록 전체를 긁어 가는 호출을 만들지 않는다.

create or replace function public.lesson_asset_download_status(
  p_class_id uuid,
  p_asset_ids uuid[]
)
returns table (asset_id uuid)
language plpgsql
security invoker
set search_path = ''
stable
as $$
begin
  if p_asset_ids is null or cardinality(p_asset_ids) = 0 then
    return;
  end if;

  if cardinality(p_asset_ids) > 50 then
    raise exception '한 번에 50개까지 확인할 수 있습니다.' using errcode = 'LA008';
  end if;

  return query
  select a.id
  from public.lesson_assets a
  where a.id = any (p_asset_ids)
    and a.download_allowed = true
    and a.storage_path is not null
    and private.class_asset_playable(p_class_id, a.id)
    and (
      (select private.is_assigned_class_teacher(p_class_id))
      or (select private.is_hq_admin())
      or exists (
        select 1
        from public.classes c
        where c.id = p_class_id
          and (select private.has_org_role(c.organization_id, array['director']))
      )
    );
end;
$$;

comment on function public.lesson_asset_download_status(uuid, uuid[]) is
  '지금도 내려받아 둘 수 있는 자산 id 만 돌려준다. 빠진 id 는 허용되지 않는다는 뜻이며, 앱이 기기에서 지운다.';

revoke execute on function public.lesson_asset_download_status(uuid, uuid[])
  from public, anon;
grant execute on function public.lesson_asset_download_status(uuid, uuid[])
  to authenticated;


-- ---------------------------------------------------------------------
-- 3. HQ 자산 정책 변경 (등록 · 승인 · 권리 · 다운로드)
-- ---------------------------------------------------------------------
-- ★ 화면에서 테이블을 직접 UPDATE 하지 않는다. 이 RPC 만 쓴다.
--   사유를 필수로 받고 audit 에 남기기 위해서다. 다운로드 허용은 되돌리기
--   어려운 결정이다 — 파일이 이미 기기에 가 있을 수 있다.
--
-- ★ 낙관적 동시성. 호출자가 본 `updated_at` 을 넘긴다.
--
-- ★ 제약을 우회하지 않는다.
--   published 는 저장 경로와 권리 확인(cleared)을 요구하는 CHECK 가 B2 에
--   이미 있다. 여기서 그 조건을 비껴가지 않는다 — UPDATE 가 그대로 거절된다.

-- ★ SECURITY DEFINER 다.
--   ① audit 기록 helper(`private.record_audit_event`)는 소유자 권한으로만
--      호출할 수 있다 — `authenticated` 에게서 EXECUTE 가 회수되어 있다.
--   ② 이 함수가 쓰는 테이블에 `authenticated` 쓰기 grant 를 주지 않았다.
--   그래서 권한 판정을 함수 안에서 직접 한다. 아래 is_hq_admin 검사가 그 게이트다.

create or replace function public.set_lesson_asset_policy(
  p_asset_id uuid,
  p_approval_status text,
  p_rights_status text,
  p_download_allowed boolean,
  p_rights_note text,
  p_reason text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before record;
  v_updated_at timestamptz;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not (select private.is_hq_admin()) then
    raise exception '권한이 없습니다.' using errcode = 'LA401';
  end if;

  if v_reason is null or char_length(v_reason) > 500 then
    raise exception '변경 사유를 500자 이내로 입력해 주세요.' using errcode = 'LA400';
  end if;

  if p_approval_status not in ('draft', 'reviewed', 'approved', 'published', 'archived') then
    raise exception '알 수 없는 승인 상태입니다.' using errcode = 'LA400';
  end if;

  if p_rights_status not in ('unverified', 'cleared', 'restricted') then
    raise exception '알 수 없는 권리 상태입니다.' using errcode = 'LA400';
  end if;

  if p_download_allowed and p_rights_status <> 'cleared' then
    raise exception '권리 확인이 끝난 자산만 내려받기를 허용할 수 있습니다.' using errcode = 'LA400';
  end if;

  select a.id, a.approval_status, a.rights_status, a.download_allowed
  into v_before
  from public.lesson_assets a
  where a.id = p_asset_id;

  if not found then
    raise exception '자산을 찾을 수 없거나 권한이 없습니다.' using errcode = 'LA402';
  end if;

  update public.lesson_assets a
  set
    approval_status = p_approval_status,
    rights_status = p_rights_status,
    download_allowed = p_download_allowed,
    rights_note = nullif(btrim(coalesce(p_rights_note, '')), ''),
    updated_at = pg_catalog.clock_timestamp()
  where a.id = p_asset_id
    and a.updated_at = p_expected_updated_at
  returning a.updated_at into v_updated_at;

  if not found then
    raise exception '다른 관리자가 먼저 변경했습니다. 최신 내용을 다시 불러와 확인해 주세요.'
      using errcode = 'LA008';
  end if;

  perform private.record_audit_event(
    null,
    'lesson_asset.policy_changed',
    'lesson_asset',
    p_asset_id,
    v_reason,
    jsonb_build_object(
      'approval_from', v_before.approval_status,
      'approval_to', p_approval_status,
      'rights_from', v_before.rights_status,
      'rights_to', p_rights_status,
      'download_from', v_before.download_allowed,
      'download_to', p_download_allowed
    )
  );

  return jsonb_build_object('asset_id', p_asset_id, 'updated_at', v_updated_at);
end;
$$;

revoke execute on function public.set_lesson_asset_policy(
  uuid, text, text, boolean, text, text, timestamptz) from public, anon;
grant execute on function public.set_lesson_asset_policy(
  uuid, text, text, boolean, text, text, timestamptz) to authenticated;


-- ---------------------------------------------------------------------
-- 4. HQ 자산 등록 · 목록
-- ---------------------------------------------------------------------
-- ★ HQ 화면이 저장 경로를 보내지 않는다.
--   파일 업로드 후의 경로는 서버가 정한다 (`private.lesson_asset_object_prefix`
--   규칙은 B2 의 storage 정책이 강제한다). 이 RPC 는 메타데이터만 받는다.

-- ★ SECURITY DEFINER 다.
--   ① audit 기록 helper(`private.record_audit_event`)는 소유자 권한으로만
--      호출할 수 있다 — `authenticated` 에게서 EXECUTE 가 회수되어 있다.
--   ② 이 함수가 쓰는 테이블에 `authenticated` 쓰기 grant 를 주지 않았다.
--   그래서 권한 판정을 함수 안에서 직접 한다. 아래 is_hq_admin 검사가 그 게이트다.

create or replace function public.register_lesson_asset(
  p_lesson_id uuid,
  p_asset_type text,
  p_title text,
  p_sort_order integer,
  p_usage_point text default null,
  p_usage_note text default null,
  p_source_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
begin
  if not (select private.is_hq_admin()) then
    raise exception '권한이 없습니다.' using errcode = 'LA401';
  end if;

  if v_title is null or char_length(v_title) > 200 then
    raise exception '자산 이름을 200자 이내로 입력해 주세요.' using errcode = 'LA400';
  end if;

  if not private.is_known_asset_type(p_asset_type) then
    raise exception '알 수 없는 자산 유형입니다.' using errcode = 'LA400';
  end if;

  if p_usage_point is not null and not private.is_known_asset_usage_point(p_usage_point) then
    raise exception '알 수 없는 사용 시점입니다.' using errcode = 'LA400';
  end if;

  -- ★ 기본값으로 만든다 — draft · unverified · download_allowed = false.
  --   "등록"은 "제공"이 아니다. 자리를 만드는 것이다.
  insert into public.lesson_assets (
    lesson_id, asset_type, title, sort_order, usage_point, usage_note, source_ref
  )
  values (
    p_lesson_id, p_asset_type, v_title, coalesce(p_sort_order, 1),
    p_usage_point,
    nullif(btrim(coalesce(p_usage_note, '')), ''),
    nullif(btrim(coalesce(p_source_ref, '')), '')
  )
  returning id into v_id;

  perform private.record_audit_event(
    null, 'lesson_asset.registered', 'lesson_asset', v_id, null,
    jsonb_build_object('lesson_id', p_lesson_id, 'asset_type', p_asset_type)
  );

  return jsonb_build_object('asset_id', v_id);
end;
$$;

revoke execute on function public.register_lesson_asset(
  uuid, text, text, integer, text, text, text) from public, anon;
grant execute on function public.register_lesson_asset(
  uuid, text, text, integer, text, text, text) to authenticated;


-- HQ 관리 화면용 목록. 저장 경로 대신 "등록됨" 여부만 돌려준다.
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
    a.approval_status, a.rights_status, a.rights_note, a.download_allowed,
    (a.storage_path is not null or a.external_url is not null) as has_source,
    a.usage_point, a.usage_note, a.source_ref, a.sort_order, a.updated_at
  from public.lesson_assets a
  where a.lesson_id = p_lesson_id
    and (select private.is_hq_admin())
  order by a.asset_type, a.sort_order;
$$;

revoke execute on function public.list_lesson_assets_for_admin(uuid) from public, anon;
grant execute on function public.list_lesson_assets_for_admin(uuid) to authenticated;


-- =====================================================================
-- 변경하지 않은 것 (명시)
-- ---------------------------------------------------------------------
--   private.class_asset_playable            그대로 (재생 판정)
--   public.resolve_lesson_asset_path        그대로 (재생 경로)
--   lesson_assets 의 모든 행                 그대로. download_allowed 를 켜지 않는다
--   storage 버킷 정책 · public = false       그대로
--   platform_capabilities.content_playback  그대로 (미출시 · HQ 가 켠다)
-- =====================================================================
