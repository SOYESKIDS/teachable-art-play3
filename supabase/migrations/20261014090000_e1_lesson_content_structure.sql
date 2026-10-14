-- =====================================================================
-- E1 — 24주 교안 콘텐츠 저장 구조
--
-- ── 왜 필요한가 ──────────────────────────────────────────────────
--
-- 지금 `lesson_sections.body` 는 **평문 한 덩어리**다. 그런데 24주 전사본은
-- 구조를 갖고 있고, 그 구조가 뜻을 지탱한다.
--
--   · 표의 열 제목이 권마다 다르다. 14번 가운데 칸은 1·2권 「피해야 할 반응」
--     (하지 말 것), 3권 「교사가 볼 점」(살펴볼 것) — 뜻이 정반대다.
--     평문으로 합치면 교사가 거꾸로 읽는다.
--   · 묶음 소제목이 주차마다 다르다 (「진행 방법」·「영상편지 준비 안내」·
--     「안내 문구 예시」…).
--   · `null`(원문에 없다)과 `[]`(원문이 「없음」이라고 밝혔다)와 빈 문자열이
--     평문에서는 구분되지 않는다.
--
-- ── 무엇을 하지 않는가 ──────────────────────────────────────────
--
-- ★ 기존 `body` 를 **건드리지 않는다.** 기존 조회·RLS·게시 게이트·
--   `supabase/content/starter_2026_1_load.sql` 이 그대로 동작한다.
-- ★ 같은 목적의 표를 새로 만들지 않는다. 버전은 이미 `curriculum_programs`
--   행이 들고 있고(STARTER 2026.1), 게시 상태는 `curriculum_lessons.status`
--   가 들고 있다. 그 둘을 다시 만들지 않는다.
-- ★ 사용자·계약·수업·관찰·리포트 데이터를 건드리지 않는다. 삭제 없다.
--
-- 적용 순서: 이 파일 → 20261014091000_e2_lesson_publish_gate.sql
-- 되돌리기: 20261014090000_e1_lesson_content_structure_rollback.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. lesson_sections.body_json — 구조를 잃지 않는 자리
-- ---------------------------------------------------------------------

-- 기존 행은 null 이다. null 은 「구조 없음(평문만)」이고, 조회하는 쪽이
-- body 로 떨어진다. 기존 1~8주 적재본이 그대로 읽힌다.
alter table public.lesson_sections
  add column if not exists body_json jsonb;

comment on column public.lesson_sections.body_json is
  '구조가 있는 본문 (표의 열 제목·묶음 소제목·null/빈 배열 구분). null 이면 body 평문만 쓴다. body 는 항상 채운다 — 구조를 모르는 기존 조회가 읽는 자리다.';

-- 객체여야 한다. 배열·숫자·문자열을 넣으면 읽는 쪽이 모양을 가정할 수 없다.
alter table public.lesson_sections
  drop constraint if exists lesson_sections_body_json_shape_check;
alter table public.lesson_sections
  add constraint lesson_sections_body_json_shape_check
  check (body_json is null or jsonb_typeof(body_json) = 'object');

-- 너무 큰 본문이 들어오면 조회가 느려지고 실수도 늦게 발견된다.
alter table public.lesson_sections
  drop constraint if exists lesson_sections_body_json_size_check;
alter table public.lesson_sections
  add constraint lesson_sections_body_json_size_check
  check (body_json is null or pg_catalog.length(body_json::text) <= 60000);

-- 기존 컬럼 단위 grant 에 맞춰 새 컬럼도 연다 (HQ 정책이 실제 통제다).
grant insert (body_json) on public.lesson_sections to authenticated;
grant update (body_json) on public.lesson_sections to authenticated;


-- ---------------------------------------------------------------------
-- 2. lesson_source_documents — 원문 출처와 해시
-- ---------------------------------------------------------------------
--
-- 「무엇을 보고 옮겼는지」가 남아야 재대조할 수 있다. 원문 PDF 자체는
-- 저장소에도 DB 에도 넣지 않는다 — 파일명·해시·쪽수만 남긴다.

create table if not exists public.lesson_source_documents (
  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null
    references public.curriculum_lessons (id) on delete restrict,

  file_name text not null
    constraint lesson_source_documents_file_name_check
    check (char_length(btrim(file_name)) between 1 and 300),

  -- 소문자 16진 64자. 대문자나 접두사를 섞으면 대조가 어긋난다.
  sha256 text not null
    constraint lesson_source_documents_sha256_check
    check (sha256 ~ '^[0-9a-f]{64}$'),

  page_count integer not null
    constraint lesson_source_documents_page_count_check
    check (page_count between 1 and 500),

  byte_size bigint
    constraint lesson_source_documents_byte_size_check
    check (byte_size is null or byte_size > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint lesson_source_documents_lesson_file_key
    unique (lesson_id, file_name)
);

comment on table public.lesson_source_documents is
  '차시가 어느 원문 파일에서 왔는지. 파일 자체는 저장하지 않는다 — 이름·SHA-256·쪽수만.';

drop trigger if exists trg_lesson_source_documents_updated_at on public.lesson_source_documents;
create trigger trg_lesson_source_documents_updated_at
  before update on public.lesson_source_documents
  for each row execute function private.set_updated_at_clock();

create index if not exists lesson_source_documents_lesson_idx
  on public.lesson_source_documents (lesson_id);


-- ---------------------------------------------------------------------
-- 3. lesson_scenes — 교실 화면 장면
-- ---------------------------------------------------------------------

create table if not exists public.lesson_scenes (
  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null
    references public.curriculum_lessons (id) on delete restrict,

  scene_no integer not null
    constraint lesson_scenes_scene_no_check
    check (scene_no between 1 and 60),

  scene_type text not null
    constraint lesson_scenes_scene_type_check
    check (scene_type in (
      'intro', 'story', 'promise', 'play', 'workbook', 'create', 'share', 'home'
    )),

  -- 아이 화면 큰 문장. 원문 발문·연결 문장에서 가져온다.
  kid_text text not null
    constraint lesson_scenes_kid_text_check
    check (char_length(btrim(kid_text)) between 1 and 500),

  stage_label text
    constraint lesson_scenes_stage_label_check
    check (stage_label is null or char_length(btrim(stage_label)) between 1 and 200),

  -- ★ 같은 TV 에 열린다. 공통 진행 안내만 넣는다 — 원아별 관찰·개인정보 금지.
  teacher_note text
    constraint lesson_scenes_teacher_note_check
    check (teacher_note is null or char_length(teacher_note) <= 2000),

  source_ref text not null
    constraint lesson_scenes_source_ref_check
    check (char_length(btrim(source_ref)) between 1 and 300),

  -- 원안 권장 시간(초). 3권(17~24주)은 단계별 시간이 없어 전부 null 이다.
  -- ★ null 을 0 이나 기본값으로 채우지 않는다. 없는 시간을 만들면 교사가
  --   그 분을 배분한다.
  base_seconds integer
    constraint lesson_scenes_base_seconds_check
    check (base_seconds is null or base_seconds between 1 and 7200),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint lesson_scenes_lesson_scene_key
    unique (lesson_id, scene_no)
);

comment on table public.lesson_scenes is
  '교실 화면 장면. base_seconds 가 null 인 것은 원문에 단계별 시간이 없다는 뜻이다 (3권 전체).';

drop trigger if exists trg_lesson_scenes_updated_at on public.lesson_scenes;
create trigger trg_lesson_scenes_updated_at
  before update on public.lesson_scenes
  for each row execute function private.set_updated_at_clock();

create index if not exists lesson_scenes_lesson_idx
  on public.lesson_scenes (lesson_id, scene_no);


-- ---------------------------------------------------------------------
-- 4. lesson_review_notes — 전사·검수 주의 기록
-- ---------------------------------------------------------------------
--
-- ★ 이 표는 **본사 전용**이다. 기관·교사·보호자 경로로 나가지 않는다.
--   「전사 중 무엇이 분명하지 않았나」는 내부 검수 정보다.

create table if not exists public.lesson_review_notes (
  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null
    references public.curriculum_lessons (id) on delete restrict,

  -- 원문 섹션 이름 (예: "7. 핵심활동 PLAY 2 · 순서 표")
  section_label text not null
    constraint lesson_review_notes_section_label_check
    check (char_length(btrim(section_label)) between 1 and 200),

  page_no integer not null
    constraint lesson_review_notes_page_no_check
    check (page_no between 1 and 500),

  issue text not null
    constraint lesson_review_notes_issue_check
    check (char_length(btrim(issue)) between 1 and 4000),

  -- 해결하는 방법이 달라서 나눈다.
  --   extraction : 쪽을 렌더링해 눈으로 대조하면 풀린다
  --   structure  : 원문 구조가 다른 것. 시각 확인 후 그대로 반영했으면 해결
  --   decision   : 전사자가 풀 수 없다 — 본사 결정
  category text not null
    constraint lesson_review_notes_category_check
    check (category in ('extraction', 'structure', 'decision')),

  status text not null default 'unresolved'
    constraint lesson_review_notes_status_check
    check (status in ('unresolved', 'resolved')),

  evidence text
    constraint lesson_review_notes_evidence_check
    check (evidence is null or char_length(btrim(evidence)) between 1 and 4000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  -- ★ 해결로 표시했으면 근거가 **반드시** 있다. 근거 없는 해결은
  --   「확인했다고 적기만 한 것」이다.
  constraint lesson_review_notes_resolved_needs_evidence_check
    check (status <> 'resolved' or evidence is not null),

  constraint lesson_review_notes_lesson_section_page_key
    unique (lesson_id, section_label, page_no)
);

comment on table public.lesson_review_notes is
  '전사·검수 주의 기록. 본사 전용 — 기관·공개 경로로 나가지 않는다. 미해결이 남으면 발행이 막힌다.';

drop trigger if exists trg_lesson_review_notes_updated_at on public.lesson_review_notes;
create trigger trg_lesson_review_notes_updated_at
  before update on public.lesson_review_notes
  for each row execute function private.set_updated_at_clock();

create index if not exists lesson_review_notes_lesson_idx
  on public.lesson_review_notes (lesson_id);

-- 발행 판정이 「이 차시에 미해결이 몇 건인가」를 센다. 그 조회를 받는 인덱스.
create index if not exists lesson_review_notes_unresolved_idx
  on public.lesson_review_notes (lesson_id)
  where status = 'unresolved';


-- ---------------------------------------------------------------------
-- 5. lesson_hq_decisions — 본사 결정과 이력
-- ---------------------------------------------------------------------

-- CHECK 제약은 서브쿼리를 담을 수 없다. 배열 원소 범위 확인을 immutable 함수로
-- 빼낸다 (함수 안에서는 unnest 를 쓸 수 있다).
create or replace function private.week_numbers_in_range(p_weeks integer[])
returns boolean
language sql
immutable
set search_path = ''
as $fn$
  select p_weeks is not null
    and not exists (select 1 from unnest(p_weeks) w where w is null or w < 1 or w > 52);
$fn$;

revoke execute on function private.week_numbers_in_range(integer[]) from public;
grant execute on function private.week_numbers_in_range(integer[]) to authenticated;

--
-- 주의 기록은 「무엇이 모호했나」만 적는다. 결정하려면 권장안과 영향 주차가
-- 필요하다. 그리고 **누가 언제 무엇으로 정했는지**가 남아야 한다.

create table if not exists public.lesson_hq_decisions (
  id uuid primary key default gen_random_uuid(),

  -- 코드에서 쓰는 안정된 키 (예: 'w06-core-message')
  decision_key text not null
    constraint lesson_hq_decisions_decision_key_key unique
    constraint lesson_hq_decisions_decision_key_check
    check (decision_key ~ '^[a-z0-9][a-z0-9-]{2,60}$'),

  lesson_id uuid not null
    references public.curriculum_lessons (id) on delete restrict,

  source_location text not null
    constraint lesson_hq_decisions_source_location_check
    check (char_length(btrim(source_location)) between 1 and 300),

  conflict text not null
    constraint lesson_hq_decisions_conflict_check
    check (char_length(btrim(conflict)) between 1 and 4000),

  current_value text not null
    constraint lesson_hq_decisions_current_value_check
    check (char_length(btrim(current_value)) between 1 and 2000),

  -- 전사자의 권장안. 적용본이 아니다.
  recommendation text not null
    constraint lesson_hq_decisions_recommendation_check
    check (char_length(btrim(recommendation)) between 1 and 4000),

  -- 결정이 바뀌면 함께 손봐야 하는 주차
  -- ★ CHECK 안에는 서브쿼리를 쓸 수 없다. 범위 확인은 아래 immutable 함수가 한다.
  affected_weeks integer[] not null
    constraint lesson_hq_decisions_affected_weeks_check
    check (
      array_length(affected_weeks, 1) between 1 and 24
      and private.week_numbers_in_range(affected_weeks)
    ),

  -- true 면 결정 후 원문 PDF 수정이 선행되어야 한다.
  -- 코드만 고치면 다음 전사 때 원문과 다시 어긋난다.
  needs_source_fix boolean not null,

  state text not null default 'open'
    constraint lesson_hq_decisions_state_check
    check (state in ('open', 'decided', 'withdrawn')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp()
);

comment on table public.lesson_hq_decisions is
  '본사 결정 대기 목록. 원문만으로는 정할 수 없는 것들. 본사 전용 — 기관·공개 경로로 나가지 않는다.';

drop trigger if exists trg_lesson_hq_decisions_updated_at on public.lesson_hq_decisions;
create trigger trg_lesson_hq_decisions_updated_at
  before update on public.lesson_hq_decisions
  for each row execute function private.set_updated_at_clock();

create index if not exists lesson_hq_decisions_lesson_idx
  on public.lesson_hq_decisions (lesson_id);


-- 결정 이력. 행을 덮어쓰지 않고 쌓는다 — 「언제 무엇으로 정했는가」가 남아야
-- 나중에 다시 물을 수 있다.
create table if not exists public.lesson_hq_decision_events (
  id uuid primary key default gen_random_uuid(),

  decision_id uuid not null
    references public.lesson_hq_decisions (id) on delete restrict,

  event_type text not null
    constraint lesson_hq_decision_events_event_type_check
    check (event_type in ('opened', 'decided', 'withdrawn', 'reopened', 'note')),

  -- 무엇으로 정했는가 (decided 일 때)
  decided_value text
    constraint lesson_hq_decision_events_decided_value_check
    check (decided_value is null or char_length(btrim(decided_value)) between 1 and 2000),

  memo text
    constraint lesson_hq_decision_events_memo_check
    check (memo is null or char_length(btrim(memo)) between 1 and 4000),

  -- 누가. 계정이 지워져도 이력은 남아야 하므로 on delete set null.
  actor_id uuid
    references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),

  -- decided 면 무엇으로 정했는지가 있어야 한다. 「정했다」만 남기면 쓸모없다.
  constraint lesson_hq_decision_events_decided_needs_value_check
    check (event_type <> 'decided' or decided_value is not null)
);

comment on table public.lesson_hq_decision_events is
  '본사 결정 이력. 덮어쓰지 않고 쌓는다. 본사 전용.';

create index if not exists lesson_hq_decision_events_decision_idx
  on public.lesson_hq_decision_events (decision_id, created_at desc);


-- ---------------------------------------------------------------------
-- 6. product_version_programs — 상품 버전 ↔ 교안 프로그램
-- ---------------------------------------------------------------------
--
-- ── 왜 필요한가 ──────────────────────────────────────────────────
--
-- 지금은 상품 버전이 `week_from`·`week_to` 만 들고 있다. 즉 **주차 번호로만**
-- 콘텐츠와 이어진다. 그런데 같은 1~8주를 담은 프로그램이 여럿일 수 있다
-- (STARTER 2026.1 과 2026.2). 주차 번호만으로는 어느 것인지 정해지지 않는다.
--
-- ★ 콘텐츠 식별은 프로그램·차시로 한다. 주차 번호는 사람이 읽는 라벨이다.

create table if not exists public.product_version_programs (
  id uuid primary key default gen_random_uuid(),

  product_version_id uuid not null
    references public.product_versions (id) on delete restrict,

  program_id uuid not null
    references public.curriculum_programs (id) on delete restrict,

  created_at timestamptz not null default now(),

  -- 한 상품 버전은 한 프로그램만 가리킨다. 둘을 가리키면 어느 쪽을 보여줄지
  -- 런타임이 정해야 하는데, 그 결정은 코드가 아니라 상품이 해야 한다.
  constraint product_version_programs_version_key
    unique (product_version_id),

  constraint product_version_programs_pair_key
    unique (product_version_id, program_id)
);

comment on table public.product_version_programs is
  '상품 버전이 어느 교안 프로그램을 쓰는가. 주차 번호가 아니라 프로그램 id 로 잇는다.';

create index if not exists product_version_programs_program_idx
  on public.product_version_programs (program_id);


-- ---------------------------------------------------------------------
-- 7. 권한 — 검수 정보는 본사 밖으로 나가지 않는다
-- ---------------------------------------------------------------------

alter table public.lesson_source_documents enable row level security;
alter table public.lesson_scenes enable row level security;
alter table public.lesson_review_notes enable row level security;
alter table public.lesson_hq_decisions enable row level security;
alter table public.lesson_hq_decision_events enable row level security;
alter table public.product_version_programs enable row level security;

revoke all on public.lesson_source_documents from anon, authenticated;
revoke all on public.lesson_scenes from anon, authenticated;
revoke all on public.lesson_review_notes from anon, authenticated;
revoke all on public.lesson_hq_decisions from anon, authenticated;
revoke all on public.lesson_hq_decision_events from anon, authenticated;
revoke all on public.product_version_programs from anon, authenticated;

-- 장면은 교실에서 쓴다 → 게시된 차시만 기관 구성원이 읽는다.
grant select, insert, update, delete on public.lesson_scenes to authenticated;

drop policy if exists "lesson scenes readable" on public.lesson_scenes;
create policy "lesson scenes readable"
  on public.lesson_scenes
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (
      (select private.is_active_org_member())
      and private.is_published_lesson(lesson_id)
    )
  );

drop policy if exists "lesson scenes write by hq admin" on public.lesson_scenes;
create policy "lesson scenes write by hq admin"
  on public.lesson_scenes
  for all
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));


-- ★ 아래 넷은 **본사만**이다. 읽기도 본사만이다.
--   「전사 중 무엇이 분명하지 않았나」·「어느 원문 해시에서 왔나」·
--   「무엇을 결정해야 하나」는 기관에 보낼 정보가 아니다.
grant select, insert, update, delete on public.lesson_source_documents to authenticated;
grant select, insert, update, delete on public.lesson_review_notes to authenticated;
grant select, insert, update, delete on public.lesson_hq_decisions to authenticated;
grant select, insert on public.lesson_hq_decision_events to authenticated;

drop policy if exists "lesson source documents hq only" on public.lesson_source_documents;
create policy "lesson source documents hq only"
  on public.lesson_source_documents
  for all
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));

drop policy if exists "lesson review notes hq only" on public.lesson_review_notes;
create policy "lesson review notes hq only"
  on public.lesson_review_notes
  for all
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));

drop policy if exists "lesson hq decisions hq only" on public.lesson_hq_decisions;
create policy "lesson hq decisions hq only"
  on public.lesson_hq_decisions
  for all
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));

drop policy if exists "lesson hq decision events hq only" on public.lesson_hq_decision_events;
create policy "lesson hq decision events hq only"
  on public.lesson_hq_decision_events
  for all
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));


-- 상품 ↔ 프로그램 연결은 계약 화면에서 본다 → 기관 구성원도 읽는다.
grant select on public.product_version_programs to authenticated;
grant insert, update, delete on public.product_version_programs to authenticated;

drop policy if exists "product version programs readable" on public.product_version_programs;
create policy "product version programs readable"
  on public.product_version_programs
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (select private.is_active_org_member())
  );

drop policy if exists "product version programs write by hq admin" on public.product_version_programs;
create policy "product version programs write by hq admin"
  on public.product_version_programs
  for all
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));
