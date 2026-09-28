-- =====================================================================
-- PHASE 07 · M1 (additive only) — Report 2.0 · Revision · Snapshot ·
--                                 Child Portal
-- ---------------------------------------------------------------------
-- 근거: DEC-066 · DEC-073 · DEC-074 · DEC-089 · DEC-090 · DEC-091 · DEC-092
--
-- · 신규 2.0 경로에는 AI 필수 의존이 없다 (ai_draft_id · reviewed_text_snapshot
--   · source_ai_updated_at 같은 컬럼을 만들지 않는다 · DEC-091).
-- · legacy child_growth_reports 계열은 그대로 둔다 (M5 cutover 까지).
-- · published boolean 없음 · 학부모 visibility 는 매번 계산 (DEC-074).
-- · working revision 은 포인터 없이 status = 'draft' 부분 unique 로 파생.
-- · latest_completed_revision_id 는 같은 리포트의 complete revision 만 (DI-6).
-- · 완료 revision · 스냅샷은 불변 (DI-4 · 검증 trigger 는 M4).
-- · portal token 원문은 저장하지 않는다 (sha256 hex 만 · DEC-092).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. reports (논리 리포트)
-- ---------------------------------------------------------------------

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  class_id uuid not null,
  child_id uuid not null,
  class_program_assignment_id uuid not null,

  report_type text not null
    constraint reports_report_type_check
    check (report_type in ('weekly', 'monthly', 'semester')),

  -- weekly: program week · monthly: 4주 block 번호 · semester: reporting term key
  week_no integer
    constraint reports_week_no_check
    check (week_no is null or week_no between 1 and 52),

  block_no integer
    constraint reports_block_no_check
    check (block_no is null or block_no between 1 and 13),

  reporting_term_key text
    constraint reports_reporting_term_key_check
    check (reporting_term_key is null or reporting_term_key ~ '^[a-z0-9_-]{1,40}$'),

  latest_completed_revision_id uuid,

  -- Emergency Hide (DEC-043 · DEC-074) — 논리 리포트 단위
  hidden_at timestamptz,
  hidden_by uuid references auth.users (id) on delete set null,
  hidden_reason text
    constraint reports_hidden_reason_check
    check (hidden_reason is null or (char_length(hidden_reason) <= 500 and btrim(hidden_reason) <> '')),

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint reports_period_shape_check
    check (
      (report_type = 'weekly' and week_no is not null and block_no is null and reporting_term_key is null)
      or (report_type = 'monthly' and block_no is not null and week_no is null and reporting_term_key is null)
      or (report_type = 'semester' and reporting_term_key is not null and week_no is null and block_no is null)
    ),

  constraint reports_hidden_shape_check
    check ((hidden_at is null) = (hidden_reason is null)),

  constraint reports_child_fk
    foreign key (child_id, organization_id)
    references public.children (id, organization_id)
    on delete restrict,

  constraint reports_assignment_fk
    foreign key (class_program_assignment_id, organization_id, class_id)
    references public.class_program_assignments (id, organization_id, class_id)
    on delete restrict,

  constraint reports_id_org_key unique (id, organization_id)
);

create unique index if not exists reports_weekly_identity_key
  on public.reports (child_id, class_program_assignment_id, week_no)
  where report_type = 'weekly';

create unique index if not exists reports_monthly_identity_key
  on public.reports (child_id, class_program_assignment_id, block_no)
  where report_type = 'monthly';

create unique index if not exists reports_semester_identity_key
  on public.reports (child_id, class_program_assignment_id, reporting_term_key)
  where report_type = 'semester';

create index if not exists reports_class_week_idx
  on public.reports (class_id, report_type, week_no);

drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at
  before update on public.reports
  for each row execute function private.set_updated_at_clock();


-- ---------------------------------------------------------------------
-- 2. report_revisions
-- ---------------------------------------------------------------------

create table if not exists public.report_revisions (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  report_id uuid not null,

  -- 표시 · 순서용
  revision_no integer not null
    constraint report_revisions_revision_no_check
    check (revision_no between 1 and 1000),

  status text not null default 'draft'
    constraint report_revisions_status_check
    check (status in ('draft', 'complete')),

  -- revision 2 이상은 정정 사유 필수 (DEC-073)
  correction_reason text
    constraint report_revisions_correction_reason_check
    check (correction_reason is null or (char_length(correction_reason) <= 500 and btrim(correction_reason) <> '')),

  template_version text not null default 'weekly.v1'
    constraint report_revisions_template_version_check
    check (template_version ~ '^[a-z]+\.v[0-9]{1,3}$'),

  -- Final Content Snapshot (서버 검증 JSON · DEC-090)
  content jsonb not null default '{}'::jsonb
    constraint report_revisions_content_check
    check (jsonb_typeof(content) = 'object' and pg_column_size(content) <= 65536),

  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  completed_by uuid references auth.users (id) on delete set null,
  completed_at timestamptz,

  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint report_revisions_report_fk
    foreign key (report_id, organization_id)
    references public.reports (id, organization_id)
    on delete restrict,

  constraint report_revisions_report_revision_no_key unique (report_id, revision_no),
  constraint report_revisions_id_report_key unique (id, report_id),
  constraint report_revisions_id_org_key unique (id, organization_id),

  constraint report_revisions_correction_required_check
    check (revision_no = 1 or correction_reason is not null),

  constraint report_revisions_completion_shape_check
    check ((status = 'complete') = (completed_at is not null))
);

-- working revision 파생: 리포트당 draft 최대 1 (DI-5)
create unique index if not exists report_revisions_one_draft_key
  on public.report_revisions (report_id)
  where status = 'draft';

drop trigger if exists trg_report_revisions_updated_at on public.report_revisions;
create trigger trg_report_revisions_updated_at
  before update on public.report_revisions
  for each row execute function private.set_updated_at_clock();

-- latest_completed_revision_id → 같은 리포트의 revision (DI-6 · complete 확인은 M4 trigger)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reports_latest_completed_revision_fk') then
    alter table public.reports
      add constraint reports_latest_completed_revision_fk
      foreign key (latest_completed_revision_id, id)
      references public.report_revisions (id, report_id)
      on delete restrict
      deferrable initially deferred;
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 3. report_revision_evidence (Evidence Snapshot · 정규화 행 · AI 컬럼 없음)
-- ---------------------------------------------------------------------

create table if not exists public.report_revision_evidence (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  revision_id uuid not null,

  -- 원천 관찰 ref
  observation_id uuid not null,

  class_session_id uuid not null,
  session_date date,
  week_no integer,
  lesson_title text
    constraint report_revision_evidence_lesson_title_check
    check (lesson_title is null or char_length(lesson_title) <= 150),

  teacher_note_snapshot text
    constraint report_revision_evidence_teacher_note_check
    check (teacher_note_snapshot is null or char_length(teacher_note_snapshot) <= 2000),

  -- 인용 스냅샷 = 관찰 child_voice 원문 복사 (DI-9)
  child_voice_snapshot text
    constraint report_revision_evidence_child_voice_check
    check (child_voice_snapshot is null or char_length(child_voice_snapshot) <= 1000),

  -- [{ "metric_code": "...", "stage": "together|after_modeling|independent" }]
  growth_snapshot jsonb not null default '[]'::jsonb
    constraint report_revision_evidence_growth_snapshot_check
    check (jsonb_typeof(growth_snapshot) = 'array'),

  created_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint report_revision_evidence_revision_fk
    foreign key (revision_id, organization_id)
    references public.report_revisions (id, organization_id)
    on delete cascade,

  constraint report_revision_evidence_observation_fk
    foreign key (observation_id, organization_id)
    references public.class_session_observations (id, organization_id)
    on delete restrict,

  constraint report_revision_evidence_revision_observation_key
    unique (revision_id, observation_id)
);


-- ---------------------------------------------------------------------
-- 4. report_revision_media (사진 reference · 표시 여부는 매번 계산)
-- ---------------------------------------------------------------------

create table if not exists public.report_revision_media (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  revision_id uuid not null,
  media_id uuid not null,

  -- 사진 0~3장 (DEC-039 · DEC-101)
  sort_order integer not null
    constraint report_revision_media_sort_order_check
    check (sort_order between 1 and 3),

  created_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint report_revision_media_revision_fk
    foreign key (revision_id, organization_id)
    references public.report_revisions (id, organization_id)
    on delete cascade,

  constraint report_revision_media_media_fk
    foreign key (media_id, organization_id)
    references public.class_session_observation_media (id, organization_id)
    on delete restrict,

  constraint report_revision_media_revision_media_key unique (revision_id, media_id),
  constraint report_revision_media_revision_order_key unique (revision_id, sort_order)
);


-- ---------------------------------------------------------------------
-- 5. child_portals (아동 단위 · token hash · DEC-040 · DEC-092)
-- ---------------------------------------------------------------------

create table if not exists public.child_portals (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  child_id uuid not null,

  -- URL 에 쓰는 공개 id (token 과 별개)
  public_id uuid not null default gen_random_uuid()
    constraint child_portals_public_id_key unique,

  -- sha256(token) hex. 원문 token 은 저장 · 로그하지 않는다.
  token_hash text not null
    constraint child_portals_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),

  status text not null default 'active'
    constraint child_portals_status_check
    check (status in ('active', 'revoked')),

  -- 만료 · 재발급 기간은 CO-12 OPEN → 값을 정하지 않는다 (nullable 확장 지점)
  expires_at timestamptz,

  issued_by uuid references auth.users (id) on delete set null,
  issued_at timestamptz not null default pg_catalog.clock_timestamp(),
  revoked_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,

  constraint child_portals_child_fk
    foreign key (child_id, organization_id)
    references public.children (id, organization_id)
    on delete restrict,

  constraint child_portals_revoked_shape_check
    check ((status = 'revoked') = (revoked_at is not null))
);

-- 아동당 활성 portal 1개
create unique index if not exists child_portals_one_active_key
  on public.child_portals (child_id)
  where status = 'active';


-- ---------------------------------------------------------------------
-- 6. RLS (읽기 정책 · 쓰기 경로는 M4)
-- ---------------------------------------------------------------------
-- HQ Admin 은 민감 교육 콘텐츠를 일반 SELECT 하지 않는다 (DEC-093).
-- Director 는 complete revision 만 본다 (교사 draft 비노출).
-- Parent(anon) 는 테이블 SELECT 없음 — read_child_portal RPC 만 (M4).

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;

drop policy if exists "reports readable by teacher and director" on public.reports;
create policy "reports readable by teacher and director"
  on public.reports
  for select
  to authenticated
  using (
    private.is_assigned_class_teacher(class_id)
    or private.has_org_role(organization_id, array['director'])
  );


alter table public.report_revisions enable row level security;
revoke all on public.report_revisions from anon, authenticated;
grant select on public.report_revisions to authenticated;

drop policy if exists "report revisions readable by teacher and director" on public.report_revisions;
create policy "report revisions readable by teacher and director"
  on public.report_revisions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_revisions.report_id
        and r.organization_id = report_revisions.organization_id
        and (
          private.is_assigned_class_teacher(r.class_id)
          or (
            private.has_org_role(r.organization_id, array['director'])
            and report_revisions.status = 'complete'
          )
        )
    )
  );


alter table public.report_revision_evidence enable row level security;
revoke all on public.report_revision_evidence from anon, authenticated;
grant select on public.report_revision_evidence to authenticated;

drop policy if exists "report evidence readable by teacher and director" on public.report_revision_evidence;
create policy "report evidence readable by teacher and director"
  on public.report_revision_evidence
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.report_revisions rv
      join public.reports r on r.id = rv.report_id
      where rv.id = report_revision_evidence.revision_id
        and (
          private.is_assigned_class_teacher(r.class_id)
          or (
            private.has_org_role(r.organization_id, array['director'])
            and rv.status = 'complete'
          )
        )
    )
  );


alter table public.report_revision_media enable row level security;
revoke all on public.report_revision_media from anon, authenticated;
grant select on public.report_revision_media to authenticated;

drop policy if exists "report media refs readable by teacher and director" on public.report_revision_media;
create policy "report media refs readable by teacher and director"
  on public.report_revision_media
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.report_revisions rv
      join public.reports r on r.id = rv.report_id
      where rv.id = report_revision_media.revision_id
        and (
          private.is_assigned_class_teacher(r.class_id)
          or (
            private.has_org_role(r.organization_id, array['director'])
            and rv.status = 'complete'
          )
        )
    )
  );


alter table public.child_portals enable row level security;
revoke all on public.child_portals from anon, authenticated;

-- token_hash 는 어떤 client 에도 SELECT 로 주지 않는다.
grant select (
  id,
  organization_id,
  child_id,
  public_id,
  status,
  expires_at,
  issued_by,
  issued_at,
  revoked_by,
  revoked_at
) on public.child_portals to authenticated;

drop policy if exists "child portals readable by director" on public.child_portals;
create policy "child portals readable by director"
  on public.child_portals
  for select
  to authenticated
  using (private.has_org_role(organization_id, array['director']));
