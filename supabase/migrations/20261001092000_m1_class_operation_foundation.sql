-- =====================================================================
-- PHASE 07 · M1 (additive only) — Session · BEFORE · Transition log ·
--                                 Quick Memo · Growth5 · Media hide ·
--                                 Consent operational state
-- ---------------------------------------------------------------------
-- 근거: DEC-036 · DEC-046 · DEC-047 · DEC-084 ~ DEC-088 · DEC-098 · DEC-099
--
-- · 기존 테이블에는 nullable 컬럼 · 추가 unique 제약만 더한다.
-- · 신규 테이블은 RLS ON · SELECT 정책만 둔다. 쓰기 정책 · 검증 trigger ·
--   RPC 는 M3 migration 에서 추가한다.
-- · HQ Admin 에게 민감 교육 데이터 blanket SELECT 를 주지 않는다 (DEC-093).
-- · 기존 class_sessions.status 직접 UPDATE 권한은 여기서 바꾸지 않는다
--   (회수는 M5 cutover · supabase/cutover/ 참고).
--
-- DB-8: 운영 DB 크기 미확인. 아래 add constraint unique 는 인덱스를 만든다.
--       대형 테이블이면 적용 전 lock 시간 검토 필요.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. class_program_assignments — origin contract provenance (DEC-084)
-- ---------------------------------------------------------------------

alter table public.class_program_assignments
  add column if not exists origin_contract_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'class_program_assignments_id_org_class_key'
  ) then
    alter table public.class_program_assignments
      add constraint class_program_assignments_id_org_class_key
      unique (id, organization_id, class_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'class_program_assignments_origin_contract_fk'
  ) then
    alter table public.class_program_assignments
      add constraint class_program_assignments_origin_contract_fk
      foreign key (origin_contract_id, organization_id)
      references public.contracts (id, organization_id)
      on delete restrict;
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. class_sessions — week_no · 시작 · 종료 · 복구 기록 (DEC-085)
-- ---------------------------------------------------------------------
-- 새 컬럼은 authenticated 의 컬럼 GRANT 에 없다 → client 가 직접 쓸 수 없고,
-- M3 의 transition trigger (SECURITY DEFINER) 만 기록한다.

alter table public.class_sessions
  add column if not exists week_no integer,
  add column if not exists started_at timestamptz,
  add column if not exists started_by uuid,
  add column if not exists finished_at timestamptz,
  add column if not exists finished_by uuid,
  add column if not exists completion_kind text,
  add column if not exists recovery_reason text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'class_sessions_week_no_check') then
    alter table public.class_sessions
      add constraint class_sessions_week_no_check
      check (week_no is null or week_no between 1 and 52);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'class_sessions_completion_kind_check') then
    alter table public.class_sessions
      add constraint class_sessions_completion_kind_check
      check (completion_kind is null or completion_kind in ('normal', 'recovery'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'class_sessions_recovery_reason_check') then
    alter table public.class_sessions
      add constraint class_sessions_recovery_reason_check
      check (
        recovery_reason is null
        or (char_length(recovery_reason) <= 500 and btrim(recovery_reason) <> '')
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'class_sessions_started_by_fk') then
    alter table public.class_sessions
      add constraint class_sessions_started_by_fk
      foreign key (started_by) references auth.users (id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'class_sessions_finished_by_fk') then
    alter table public.class_sessions
      add constraint class_sessions_finished_by_fk
      foreign key (finished_by) references auth.users (id) on delete set null;
  end if;
end;
$$;


-- week_no 는 세션 생성 시 lesson 에서 복사해 불변으로 둔다 (AD-11 · DEC-085).
create or replace function private.fill_class_session_week_no()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select l.week_no into new.week_no
    from public.curriculum_lessons l
    where l.id = new.lesson_id;
  elsif new.week_no is distinct from old.week_no and old.week_no is not null then
    raise exception '수업 주차는 바꿀 수 없습니다.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function private.fill_class_session_week_no() from public;

drop trigger if exists trg_class_sessions_week_no on public.class_sessions;
create trigger trg_class_sessions_week_no
  before insert or update on public.class_sessions
  for each row execute function private.fill_class_session_week_no();


-- ---------------------------------------------------------------------
-- 3. class_session_observations — taxonomy (DEC-086)
-- ---------------------------------------------------------------------
-- 기존 행은 모두 구 5영역 기록이다 → 상수 default 'legacy_domains' 로
-- 사실 그대로 채워진다 (추론 backfill 아님). 신규 Growth5 경로는 M3 RPC 가
-- 'growth5' 로 명시 저장한다. 구 영역 → Growth5 자동 매핑은 하지 않는다.

alter table public.class_session_observations
  add column if not exists taxonomy text not null default 'legacy_domains';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'class_session_observations_taxonomy_check') then
    alter table public.class_session_observations
      add constraint class_session_observations_taxonomy_check
      check (taxonomy in ('legacy_domains', 'growth5'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'class_session_observations_id_org_key') then
    alter table public.class_session_observations
      add constraint class_session_observations_id_org_key
      unique (id, organization_id);
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 4. class_session_observation_media — hide · storage 정리 상태 (DEC-088)
-- ---------------------------------------------------------------------
-- metadata hide 와 Storage 물리 삭제는 한 DB transaction 이 아니다.
--   hidden_at 이 채워지면 즉시 조회 · 서명 대상에서 빠진다 (M3).
--   storage_status 는 서버 orchestration 이 기록한다 (재시도 가능).

alter table public.class_session_observation_media
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid,
  add column if not exists storage_status text not null default 'stored',
  add column if not exists storage_status_updated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'class_session_observation_media_storage_status_check') then
    alter table public.class_session_observation_media
      add constraint class_session_observation_media_storage_status_check
      check (storage_status in ('stored', 'delete_pending', 'deleted', 'delete_failed'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'class_session_observation_media_hidden_by_fk') then
    alter table public.class_session_observation_media
      add constraint class_session_observation_media_hidden_by_fk
      foreign key (hidden_by) references auth.users (id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'class_session_observation_media_id_org_key') then
    alter table public.class_session_observation_media
      add constraint class_session_observation_media_id_org_key
      unique (id, organization_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'class_session_observation_media_hidden_state_check') then
    alter table public.class_session_observation_media
      add constraint class_session_observation_media_hidden_state_check
      check (storage_status = 'stored' or hidden_at is not null);
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 5. session_before_confirmations (DEC-036 · 세션 단위 · 서버 보존)
-- ---------------------------------------------------------------------

create table if not exists public.session_before_confirmations (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  class_id uuid not null,
  class_session_id uuid not null,

  -- 필수 확인 (안전 · 사진/개인정보). 둘 다 true 여야 행이 존재한다.
  safety_confirmed boolean not null,
  privacy_confirmed boolean not null,

  confirmed_by uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint session_before_confirmations_required_check
    check (safety_confirmed and privacy_confirmed),

  constraint session_before_confirmations_session_fk
    foreign key (class_session_id, organization_id, class_id)
    references public.class_sessions (id, organization_id, class_id)
    on delete restrict,

  -- 필수 확인은 세션 단위로 공유된다 (class-mode-flow §3-1)
  constraint session_before_confirmations_session_key
    unique (class_session_id)
);

alter table public.session_before_confirmations enable row level security;
revoke all on public.session_before_confirmations from anon, authenticated;
grant select on public.session_before_confirmations to authenticated;

drop policy if exists "before confirmations readable by org staff" on public.session_before_confirmations;
create policy "before confirmations readable by org staff"
  on public.session_before_confirmations
  for select
  to authenticated
  using (
    private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
    or (select private.is_hq_admin())
  );


-- ---------------------------------------------------------------------
-- 6. class_session_transitions (세션 상태 전환 명령 · 감사 로그)
-- ---------------------------------------------------------------------
-- 설계 (PHASE 05 transaction-rpc §1 "INVOKER RPC 와 직접 UPDATE 차단의 양립"):
--   INVOKER RPC 가 이 테이블에 전환 명령 1행을 INSERT 한다.
--   SECURITY DEFINER BEFORE INSERT trigger (M3) 가 역할 · 상태 · BEFORE 확인 ·
--   entitlement · 사유를 검증하고 class_sessions 를 갱신한다.
--   → M5 에서 client 의 status 컬럼 UPDATE 권한을 회수해도 정상 경로는 유지된다.

create table if not exists public.class_session_transitions (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  class_id uuid not null,
  class_session_id uuid not null,

  transition text not null
    constraint class_session_transitions_transition_check
    check (transition in ('start', 'finish', 'recovery_complete', 'cancel')),

  from_status text not null
    constraint class_session_transitions_from_status_check
    check (from_status in ('scheduled', 'in_progress')),

  to_status text not null
    constraint class_session_transitions_to_status_check
    check (to_status in ('in_progress', 'completed', 'cancelled')),

  actor_user_id uuid references auth.users (id) on delete set null,

  reason text
    constraint class_session_transitions_reason_check
    check (reason is null or (char_length(reason) <= 500 and btrim(reason) <> '')),

  created_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint class_session_transitions_session_fk
    foreign key (class_session_id, organization_id, class_id)
    references public.class_sessions (id, organization_id, class_id)
    on delete restrict,

  -- scheduled → completed 는 어떤 전환으로도 만들 수 없다 (DEC-047 · DEC-085)
  constraint class_session_transitions_shape_check
    check (
      (transition = 'start' and from_status = 'scheduled' and to_status = 'in_progress')
      or (transition = 'finish' and from_status = 'in_progress' and to_status = 'completed')
      or (transition = 'recovery_complete' and from_status = 'in_progress'
          and to_status = 'completed' and reason is not null)
      or (transition = 'cancel' and to_status = 'cancelled')
    )
);

create index if not exists class_session_transitions_session_idx
  on public.class_session_transitions (class_session_id, created_at);

alter table public.class_session_transitions enable row level security;
revoke all on public.class_session_transitions from anon, authenticated;
grant select on public.class_session_transitions to authenticated;

drop policy if exists "session transitions readable by org staff" on public.class_session_transitions;
create policy "session transitions readable by org staff"
  on public.class_session_transitions
  for select
  to authenticated
  using (
    private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
    or (select private.is_hq_admin())
  );


-- ---------------------------------------------------------------------
-- 7. quick_memos (DEC-035 · DEC-087 · author only)
-- ---------------------------------------------------------------------

create table if not exists public.quick_memos (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  class_id uuid not null,
  class_session_id uuid not null,

  author_user_id uuid not null
    references auth.users (id) on delete cascade,

  body text not null
    constraint quick_memos_body_check
    check (char_length(body) between 1 and 2000 and btrim(body) <> ''),

  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint quick_memos_session_fk
    foreign key (class_session_id, organization_id, class_id)
    references public.class_sessions (id, organization_id, class_id)
    on delete restrict,

  -- 교사 1명 · 세션 1개 = 메모 1장
  constraint quick_memos_session_author_key
    unique (class_session_id, author_user_id)
);

drop trigger if exists trg_quick_memos_updated_at on public.quick_memos;
create trigger trg_quick_memos_updated_at
  before update on public.quick_memos
  for each row execute function private.set_updated_at_clock();

alter table public.quick_memos enable row level security;
revoke all on public.quick_memos from anon, authenticated;
grant select on public.quick_memos to authenticated;

-- 작성 교사 본인만 (Director · HQ · Parent · AI 접근 없음)
drop policy if exists "quick memos readable by author" on public.quick_memos;
create policy "quick memos readable by author"
  on public.quick_memos
  for select
  to authenticated
  using (author_user_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 8. growth_metrics (Growth5 catalog · DEC-005 · DEC-086)
-- ---------------------------------------------------------------------
-- code 는 구 5영역(observation_domains.code)과 겹치지 않는 별도 stable code 다.

create table if not exists public.growth_metrics (
  code text primary key
    constraint growth_metrics_code_check
    check (code ~ '^[a-z][a-z0-9_]{2,39}$'),

  label text not null
    constraint growth_metrics_label_check
    check (char_length(btrim(label)) between 1 and 40),

  -- 교사용 1줄 관찰 가이드
  guide text not null
    constraint growth_metrics_guide_check
    check (char_length(btrim(guide)) between 1 and 200),

  sort_order integer not null
    constraint growth_metrics_sort_order_check
    check (sort_order between 1 and 20),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  constraint growth_metrics_sort_order_key unique (sort_order)
);

alter table public.growth_metrics enable row level security;
revoke all on public.growth_metrics from anon, authenticated;
grant select on public.growth_metrics to authenticated;

drop policy if exists "growth metrics readable" on public.growth_metrics;
create policy "growth metrics readable"
  on public.growth_metrics
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (select private.is_active_org_member())
  );


-- ---------------------------------------------------------------------
-- 9. observation_growth_selections (행 없음 = 기록 없음 · stage NOT NULL)
-- ---------------------------------------------------------------------

create table if not exists public.observation_growth_selections (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  observation_id uuid not null,

  metric_code text not null
    references public.growth_metrics (code) on delete restrict,

  -- 저장 코드. UI 표시: 함께 · 보고 나서 · 스스로. 숫자 변환 없음 (DEC-065).
  stage text not null
    constraint observation_growth_selections_stage_check
    check (stage in ('together', 'after_modeling', 'independent')),

  created_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint observation_growth_selections_observation_fk
    foreign key (observation_id, organization_id)
    references public.class_session_observations (id, organization_id)
    on delete cascade,

  constraint observation_growth_selections_observation_metric_key
    unique (observation_id, metric_code)
);

alter table public.observation_growth_selections enable row level security;
revoke all on public.observation_growth_selections from anon, authenticated;
grant select on public.observation_growth_selections to authenticated;

drop policy if exists "growth selections readable by org staff" on public.observation_growth_selections;
create policy "growth selections readable by org staff"
  on public.observation_growth_selections
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_session_observations o
      where o.id = observation_growth_selections.observation_id
        and o.organization_id = observation_growth_selections.organization_id
        and (
          private.is_assigned_class_teacher(o.class_id)
          or (
            private.has_org_role(o.organization_id, array['director'])
            and o.record_status = 'complete'
          )
        )
    )
  );


-- ---------------------------------------------------------------------
-- 10. child_media_consents (운영 상태 · 법적 충분성 아님 · DEC-088)
-- ---------------------------------------------------------------------
-- unknown · declined → 공개 불가. consented 는 운영 기록이며 법적 공개 허가가
-- 아니다 (CO-10). Production Parent 사진은 CO-9 · CO-10 · DB-9 해결 전 비활성.

create table if not exists public.child_media_consents (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  child_id uuid not null,

  status text not null default 'unknown'
    constraint child_media_consents_status_check
    check (status in ('unknown', 'consented', 'declined')),

  -- 기관이 보관하는 동의서 등의 운영 참조 (문서 원본 아님)
  evidence_ref text
    constraint child_media_consents_evidence_ref_check
    check (evidence_ref is null or (char_length(evidence_ref) <= 200 and btrim(evidence_ref) <> '')),

  recorded_by uuid references auth.users (id) on delete set null,
  recorded_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint child_media_consents_child_fk
    foreign key (child_id, organization_id)
    references public.children (id, organization_id)
    on delete restrict,

  constraint child_media_consents_child_key unique (child_id)
);

drop trigger if exists trg_child_media_consents_updated_at on public.child_media_consents;
create trigger trg_child_media_consents_updated_at
  before update on public.child_media_consents
  for each row execute function private.set_updated_at_clock();

alter table public.child_media_consents enable row level security;
revoke all on public.child_media_consents from anon, authenticated;
grant select on public.child_media_consents to authenticated;

-- 원장(기록) · 담당 교사(BEFORE 확인) · HQ Admin (상태 확인만 · DEC-059)
drop policy if exists "media consents readable by org staff and hq admin" on public.child_media_consents;
create policy "media consents readable by org staff and hq admin"
  on public.child_media_consents
  for select
  to authenticated
  using (
    private.has_org_role(organization_id, array['director'])
    or exists (
      select 1 from public.children ch
      where ch.id = child_media_consents.child_id
        and ch.class_id is not null
        and private.is_assigned_class_teacher(ch.class_id)
    )
    or (select private.is_hq_admin())
  );
