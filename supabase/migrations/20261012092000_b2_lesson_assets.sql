-- =====================================================================
-- 실행 묶음 B2 — 수업 자산 (EBOOK · 마음동화 · VOD · MV · 음원 · 워크북 · 활동자료)
-- ---------------------------------------------------------------------
-- 근거: 통합 실행 지침 §6 B2 · content-governance.md · 02_원본1-15주_전수대조 §4
--
-- 문제:
--   원본 교사용 가이드의 §2 "연계 콘텐츠" 와 §10 "EBOOK·음원·뮤직비디오 활용" 에는
--   주차마다 어떤 자산을 언제 쓰는지가 적혀 있다. 그런데 저장소에는 그 자산을
--   가리키는 데이터가 없다. 자산 목록 · 형식 · 권리 · 승인 · 버전 · 소속 주차 ·
--   계약 접근 범위를 담을 자리가 없으면, 화면은 빈 링크를 "재생"으로 그리게 된다.
--
-- 이 migration 이 하는 것:
--   · 자산 1건의 메타데이터 테이블 (형식 · 권리 · 승인 · 버전 · 소속 · 사용 시점)
--   · 보호 자산 전용 Storage 버킷 (public = false)
--   · "지금 이 반이 이 자산을 쓸 수 있는가" 판정 (승인 ∧ 차시 공개 ∧ 계약 주차 ∧ 기능)
--   · 교직원용 목록 RPC — **storage_path 를 클라이언트로 내보내지 않는다**
--
-- 이 migration 이 하지 않는 것:
--   ★ 자산을 등록하지 않는다. 실제 EBOOK · VOD · 음원 파일이 확보되지 않았다.
--     행이 0건이면 화면은 "자산 미등록"으로 표시한다. 샘플을 넣어 납품 콘텐츠처럼
--     보이게 하지 않는다.
--   ★ 어떤 기능도 출시하지 않는다. content_playback 은 PROVISIONAL 로 남아 있다.
--   ★ 교안 원문을 넣지 않는다. 이 테이블은 자산 **메타데이터**만 담는다.
--     수업안 본문은 기존 lesson_sections 가 갖는다.
--
-- 적용 상태: **원격 미적용.** 로컬 파일로만 둔다.
-- 의존: 20260825_create_curriculum_foundation.sql (curriculum_lessons)
--       20261001091000_m1_commerce_entitlement_foundation.sql (class_week_entitled · class_has_feature)
--       20261001110000_m3_hq_role_foundation.sql (is_hq_admin)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 자산 종류 · 사용 시점
-- ---------------------------------------------------------------------

create or replace function private.is_known_asset_type(p_code text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_code in (
    'ebook',            -- 그림책 전자책 (PDF · 이미지)
    'story',            -- 마음동화 (원문 그림책)
    'vod',              -- 수업 영상
    'music_video',      -- 캐릭터 뮤직비디오
    'audio',            -- 활동 음원
    'workbook',         -- 개인 워크북 (인쇄용)
    'teacher_guide',    -- 교사용 수업가이드
    'activity_material' -- 도안 · 활동자료
  );
$$;

revoke execute on function private.is_known_asset_type(text) from public;
revoke execute on function private.is_known_asset_type(text) from anon;

/**
 * 수업 흐름 안에서 어디에 쓰이는가.
 * 원본 §10 의 "권장 사용 시점" 을 코드로 둔다.
 */
create or replace function private.is_known_asset_usage_point(p_code text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_code in (
    'arrival',      -- 등원 · 도입
    'intro',        -- 도입
    'story',        -- 그림책
    'core',         -- 핵심활동
    'creative',     -- 미술 · 창작
    'closing',      -- 마무리
    'workbook',     -- 워크북 (연계 · 확장 시간)
    'extension'     -- 별도 콘텐츠 시간
  );
$$;

revoke execute on function private.is_known_asset_usage_point(text) from public;
revoke execute on function private.is_known_asset_usage_point(text) from anon;


-- ---------------------------------------------------------------------
-- 2. 보호 자산 버킷
-- ---------------------------------------------------------------------
-- 기존 observation-media 와 같은 원칙: public = false, 서명 URL 만.
-- 교안·자산이 공개 번들이나 공개 URL 로 새지 않게 한다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-assets',
  'lesson-assets',
  false,
  -- 영상이 들어올 수 있어 한도를 크게 둔다 (512 MiB).
  536870912,
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg',
    'video/mp4', 'video/webm'
  ]
)
on conflict (id) do update set
  -- 대시보드에서 실수로 공개로 바뀌는 것을 매번 되돌린다.
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ---------------------------------------------------------------------
-- 3. lesson_assets
-- ---------------------------------------------------------------------

create table if not exists public.lesson_assets (

  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null
    references public.curriculum_lessons (id) on delete restrict,

  asset_type text not null
    constraint lesson_assets_asset_type_check
    check (private.is_known_asset_type(asset_type)),

  title text not null
    constraint lesson_assets_title_check
    check (char_length(btrim(title)) between 1 and 200),

  /*
   * 어디에 저장되어 있는가.
   *
   * ★ 둘 다 null 이면 "자산 미등록" 이다.
   *   목록에는 보이고(원본 가이드에 그 자산이 있다는 사실), 재생은 되지 않는다.
   *   화면은 이것을 "제작 중 · 미제공" 으로 구분해 표시한다.
   *
   * ★ storage_path 는 클라이언트로 내보내지 않는다.
   *   서버가 이 값으로 서명 URL 을 만든다. 아래 목록 RPC 는 경로를 반환하지 않는다.
   */
  storage_path text
    constraint lesson_assets_storage_path_check
    check (
      storage_path is null
      or (char_length(storage_path) between 1 and 400 and storage_path !~ '\.\.')
    ),

  /** 외부 호스팅 자산 (예: 영상 CDN). 권리 확인이 끝난 것만 넣는다. */
  external_url text
    constraint lesson_assets_external_url_check
    check (external_url is null or external_url ~ '^https://'),

  /** MIME. storage 의 allowed_mime_types 와 같은 범위여야 한다. */
  content_type text
    constraint lesson_assets_content_type_check
    check (content_type is null or char_length(content_type) <= 100),

  /** 영상·음원 길이. 원본 가이드에 미표기인 주차가 많아 nullable 이다. */
  duration_seconds integer
    constraint lesson_assets_duration_check
    check (duration_seconds is null or duration_seconds between 1 and 36000),

  /** 워크북 페이지 수. 원본에 미표기인 주차가 많아 nullable 이다. */
  page_count integer
    constraint lesson_assets_page_count_check
    check (page_count is null or page_count between 1 and 500),

  /** 자산 버전. 재편집·리마스터가 자산 단위로 일어난다. */
  version_label text not null default 'v1'
    constraint lesson_assets_version_label_check
    check (char_length(btrim(version_label)) between 1 and 40),

  /*
   * 승인 상태 — content-governance.md 의 5단계와 같은 이름을 쓴다.
   * published 가 아니면 기관에 보이지 않는다.
   */
  approval_status text not null default 'draft'
    constraint lesson_assets_approval_status_check
    check (approval_status in ('draft', 'reviewed', 'approved', 'published', 'archived')),

  /*
   * 권리 확인 상태.
   *
   * ★ 기본값은 unverified 다. 그림책 · 음원 · MV 의 저작권 범위가 확인되지 않았다
   *   (02_원본1-15주_전수대조 BC-14). cleared 가 아니면 제공하지 않는다.
   */
  rights_status text not null default 'unverified'
    constraint lesson_assets_rights_status_check
    check (rights_status in ('unverified', 'cleared', 'restricted')),

  /** 권리 메모. 계약·범위를 적는다. 자격증명·URL 토큰을 넣지 않는다. */
  rights_note text
    constraint lesson_assets_rights_note_check
    check (rights_note is null or char_length(rights_note) <= 500),

  /*
   * 다운로드 허용 여부.
   *
   * ★ 기본값은 false 다. 유형별 정책(워크북은 인쇄 필요 · 영상은 스트리밍)이
   *   확정되지 않았다. 확정 전에는 열지 않는다.
   */
  download_allowed boolean not null default false,

  /** 수업 흐름 안의 사용 시점 (원본 §10). 모르면 null */
  usage_point text
    constraint lesson_assets_usage_point_check
    check (usage_point is null or private.is_known_asset_usage_point(usage_point)),

  /** 사용 시점 설명 (원본 §10 의 "수업 흐름 속 역할") */
  usage_note text
    constraint lesson_assets_usage_note_check
    check (usage_note is null or char_length(usage_note) <= 300),

  sort_order integer not null default 1
    constraint lesson_assets_sort_order_check
    check (sort_order between 1 and 200),

  /** 원본 근거 (파일명 · 섹션). SOURCE EXISTS ≠ READY */
  source_ref text
    constraint lesson_assets_source_ref_check
    check (source_ref is null or char_length(source_ref) <= 300),

  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  /*
   * 승인·발행된 자산은 받을 곳이 있어야 한다.
   * draft 단계에서는 자리만 만들어 두는 것을 허용한다 ("자산 미등록").
   */
  constraint lesson_assets_published_needs_source_check
    check (
      approval_status <> 'published'
      or storage_path is not null
      or external_url is not null
    ),

  /*
   * 발행된 자산은 권리 확인이 끝나 있어야 한다.
   * 저작권 범위가 확인되지 않은 자산을 기관에 내보내지 않는다.
   */
  constraint lesson_assets_published_needs_rights_check
    check (approval_status <> 'published' or rights_status = 'cleared'),

  constraint lesson_assets_lesson_sort_key unique (lesson_id, asset_type, sort_order)
);

comment on table public.lesson_assets is
  '수업 자산 메타데이터. 교안 본문은 담지 않는다. storage_path 는 클라이언트로 내보내지 않는다.';

create index if not exists lesson_assets_lesson_idx
  on public.lesson_assets (lesson_id, asset_type, sort_order);

create index if not exists lesson_assets_published_idx
  on public.lesson_assets (lesson_id)
  where approval_status = 'published';


drop trigger if exists trg_lesson_assets_updated_at on public.lesson_assets;

create trigger trg_lesson_assets_updated_at
before update on public.lesson_assets
for each row
execute function private.set_updated_at();


-- ---------------------------------------------------------------------
-- 4. "이 반이 이 자산을 쓸 수 있는가"
-- ---------------------------------------------------------------------
-- 네 조건을 모두 통과해야 한다 (content-governance.md §7-1 과 같은 구조):
--   ① 자산이 published      ② 차시가 published
--   ③ 계약이 그 주차를 포함  ④ 계약에 콘텐츠 재생 기능이 있다
--
-- ★ 여기서 "권한 없음" 과 "미등록" 을 구분하지 않는다.
--   구분은 앱이 한다 — 교직원에게는 왜 못 쓰는지 알려 주어야 하기 때문이다.
--   이 함수는 접근 가능 여부만 판정한다.

create or replace function private.class_asset_playable(
  p_class_id uuid,
  p_asset_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.lesson_assets a
    join public.curriculum_lessons l on l.id = a.lesson_id
    where a.id = p_asset_id
      and a.approval_status = 'published'
      and a.rights_status = 'cleared'
      and private.is_published_lesson(l.id)
      and private.class_week_entitled(p_class_id, l.week_no)
      and private.class_has_feature(p_class_id, 'content_playback')
  );
$$;

revoke execute on function private.class_asset_playable(uuid, uuid) from public;
revoke execute on function private.class_asset_playable(uuid, uuid) from anon;
grant execute on function private.class_asset_playable(uuid, uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------
-- 읽기: HQ Admin (전부) · 교직원 (published 자산 + 담당/소속 범위)
-- 쓰기: HQ Admin 만
--
-- ★ storage_path · external_url 은 SELECT GRANT 목록에서 빼서,
--   교직원 세션이 테이블을 직접 읽어도 경로를 가져갈 수 없게 한다.

alter table public.lesson_assets enable row level security;

drop policy if exists lesson_assets_select_hq on public.lesson_assets;

create policy lesson_assets_select_hq
  on public.lesson_assets
  for select
  to authenticated
  using ((select private.is_hq_admin()));

drop policy if exists lesson_assets_select_staff on public.lesson_assets;

create policy lesson_assets_select_staff
  on public.lesson_assets
  for select
  to authenticated
  using (
    approval_status = 'published'
    and (select private.is_active_org_member())
    and (select private.is_published_lesson(lesson_id))
  );

drop policy if exists lesson_assets_write_hq on public.lesson_assets;

create policy lesson_assets_write_hq
  on public.lesson_assets
  for insert
  to authenticated
  with check ((select private.is_hq_admin()));

drop policy if exists lesson_assets_update_hq on public.lesson_assets;

create policy lesson_assets_update_hq
  on public.lesson_assets
  for update
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));

-- DELETE 정책을 두지 않는다. 발행 이력이 있는 자산은 archived 로 내린다.

revoke all on public.lesson_assets from anon;
revoke all on public.lesson_assets from authenticated;

-- ★ storage_path · external_url 이 목록에 없다.
grant select (
  id, lesson_id, asset_type, title, content_type, duration_seconds, page_count,
  version_label, approval_status, rights_status, download_allowed,
  usage_point, usage_note, sort_order, source_ref, created_at, updated_at
) on public.lesson_assets to authenticated;

grant insert, update on public.lesson_assets to authenticated;


-- ---------------------------------------------------------------------
-- 6. Storage 정책
-- ---------------------------------------------------------------------
-- 경로 규칙: lesson/{lesson_id}/{asset_id}/{파일명}
-- 읽기는 메타데이터 행이 published 이고 권리 확인이 끝났을 때만 허용한다.
-- 업로드는 HQ Admin 만.

create or replace function private.can_read_lesson_asset_object(p_name text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.lesson_assets a
    where a.storage_path = p_name
      and (
        (select private.is_hq_admin())
        or (
          a.approval_status = 'published'
          and a.rights_status = 'cleared'
          and (select private.is_active_org_member())
        )
      )
  );
$$;

revoke execute on function private.can_read_lesson_asset_object(text) from public;
revoke execute on function private.can_read_lesson_asset_object(text) from anon;
grant execute on function private.can_read_lesson_asset_object(text) to authenticated;


drop policy if exists "lesson assets readable by entitled staff" on storage.objects;

create policy "lesson assets readable by entitled staff"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'lesson-assets'
    and (select private.can_read_lesson_asset_object(name))
  );

drop policy if exists "lesson assets uploadable by hq admin" on storage.objects;

create policy "lesson assets uploadable by hq admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'lesson-assets'
    and (select private.is_hq_admin())
    and name ~ '^lesson/[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]{1,200}$'
  );

drop policy if exists "lesson assets removable by hq admin" on storage.objects;

create policy "lesson assets removable by hq admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'lesson-assets'
    and (select private.is_hq_admin())
  );


-- ---------------------------------------------------------------------
-- 7. 교직원 목록 RPC
-- ---------------------------------------------------------------------
-- ★ 경로를 반환하지 않는다.
--   `has_source` 로 "받을 것이 있는가"만 알려 주고, 실제 서명 URL 은
--   서버(route handler · server action)가 storage API 로 따로 만든다.
--
-- ★ 왜 못 쓰는지 구분해 돌려준다.
--   교직원 화면이 "미등록 · 승인 대기 · 권리 확인 전 · 계약 범위 밖 · 기능 미출시"
--   를 각각 다르게 안내할 수 있어야 한다. 빈 링크에 재생을 표시하지 않기 위해서다.

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
    (a.storage_path is not null or a.external_url is not null) as has_source,
    private.class_asset_playable(p_class_id, a.id) as playable,
    case
      when a.storage_path is null and a.external_url is null then 'not_registered'
      when a.approval_status <> 'published' then 'awaiting_approval'
      when a.rights_status <> 'cleared' then 'rights_unverified'
      when not private.class_has_feature(p_class_id, 'content_playback') then 'feature_unreleased'
      when not private.class_week_entitled(p_class_id, l.week_no) then 'out_of_contract_scope'
      else null
    end as unavailable_reason
  from public.lesson_assets a
  join public.curriculum_lessons l on l.id = a.lesson_id
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


/**
 * 서버가 서명 URL 을 만들기 전에 경로를 받는 함수.
 *
 * ★ `authenticated` 에게 EXECUTE 를 준다. 그러나 접근 판정을 통과해야 경로가 나온다.
 *   판정에 실패하면 null 을 돌려준다 — 왜 실패했는지 알려 주지 않는다.
 * ★ 이 함수의 결과를 그대로 클라이언트로 보내지 않는다. 서버에서만 쓴다.
 */
create or replace function public.resolve_lesson_asset_path(
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

revoke execute on function public.resolve_lesson_asset_path(uuid, uuid) from public;
revoke execute on function public.resolve_lesson_asset_path(uuid, uuid) from anon;
grant execute on function public.resolve_lesson_asset_path(uuid, uuid) to authenticated;


-- =====================================================================
-- 변경하지 않은 것 (명시)
-- ---------------------------------------------------------------------
--   curriculum_lessons · lesson_sections                    그대로
--   observation-media 버킷과 그 정책                          그대로
--   platform_capabilities (content_playback 미출시)           그대로
--   class_week_entitled · class_has_feature · is_published_lesson  그대로 (호출만 한다)
--   자산 행을 하나도 넣지 않는다 — 실제 파일이 확보되지 않았다.
--     행이 0건이면 화면은 "자산 미등록" 으로 표시한다.
-- =====================================================================
