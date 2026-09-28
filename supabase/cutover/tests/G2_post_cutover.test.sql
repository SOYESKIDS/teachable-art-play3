-- =====================================================================
-- PHASE 07 · POST-G2 — HQ role / sensitive-access cutover (pgTAP · local 전용)
-- ---------------------------------------------------------------------
-- 실행: node supabase/cutover/tests/run-local.mjs G2_post_cutover.test.sql  (local DB 컨테이너 전용)
-- transaction 안에서 supabase/cutover/M3_hq_role_split_sensitive_access.sql 을 적용 → 검증 →
-- rollback 스크립트 → 재적용까지 확인하고 전부 rollback 한다.
-- 기본 suite 에서 옮긴 8개 assertion (N-3 · N-4 · N-13 · J) 을 그대로 포함한다.
-- PHASE 08: §5 기관 구성원 직접 쓰기 회수 (audited RPC 만) · §6 AI 초안 저장 gate (ai_assist ∧ AR-8) · 되돌리기 · 재적용 포함.
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

set local session_replication_role = replica;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'hq-admin@test.local'),
  ('00000000-0000-0000-0000-00000000a002', 'hq-sales@test.local'),
  ('00000000-0000-0000-0000-00000000c001', 'director-b@test.local'),
  ('00000000-0000-0000-0000-00000000c002', 'teacher-b@test.local');

insert into public.profiles (user_id, display_name) values
  ('00000000-0000-0000-0000-00000000a001', 'HQ Admin'),
  ('00000000-0000-0000-0000-00000000a002', 'HQ Sales'),
  ('00000000-0000-0000-0000-00000000c001', 'Director B'),
  ('00000000-0000-0000-0000-00000000c002', 'Teacher B')
on conflict (user_id) do nothing;

insert into private.admin_users (user_id, role) values
  ('00000000-0000-0000-0000-00000000a001', 'admin'),
  ('00000000-0000-0000-0000-00000000a002', 'sales');

insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-00000000000b', 'Org B', 'active');

insert into public.organization_members (id, organization_id, user_id, role, status) values
  ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000c001', 'director', 'active'),
  ('20000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000c002', 'teacher', 'active');

insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '별님반', 2026, 'active');

insert into public.class_teachers (organization_id, class_id, organization_member_id) values
  ('10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b2');

insert into public.children (id, organization_id, class_id, name, status) values
  ('40000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '가상아이B1', 'active');

insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('50000000-0000-0000-0000-000000000001', 'TEST-P', 'Test Program', 8, 'published');
insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status) values
  ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1, 1, '1주 수업', 'published');
insert into public.class_program_assignments (id, organization_id, class_id, program_id, status) values
  ('70000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-000000000001', 'active');
insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status, week_no) values
  ('80000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '70000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today(), 'completed', 1);

insert into public.class_session_observations (id, organization_id, class_session_id, class_id, child_id, teacher_note, record_status) values
  ('90000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '80000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b1', '관찰 B', 'complete');

insert into public.class_session_observation_ai_drafts (
  organization_id, class_session_id, class_id, child_id, observation_id,
  source_observation_updated_at, generated_text, provider, model, prompt_version)
select o.organization_id, o.class_session_id, o.class_id, o.child_id, o.id, o.updated_at, '정리 초안', 'test', 'test-model', 'test.v1'
from public.class_session_observations o where o.id = '90000000-0000-0000-0000-0000000000b1';

insert into public.class_session_observation_media (id, organization_id, class_session_id, class_id, child_id, storage_path, mime_type, byte_size) values
  ('85000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '80000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b1',
   '10000000-0000-0000-0000-00000000000b/80000000-0000-0000-0000-0000000000b1/40000000-0000-0000-0000-0000000000b1/85000000-0000-0000-0000-0000000000b1.jpg', 'image/jpeg', 1000);

insert into public.lead_submissions (submission_type, institution_name, contact_name, phone, privacy_agreed, status)
values ('consult', '가상 문의 기관', '가상 담당자', '010-0000-0000', true, 'new');

set local session_replication_role = origin;

create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

create or replace function pg_temp.count_as(p_user uuid, p_sql text) returns bigint language plpgsql as $$
declare v bigint;
begin
  perform pg_temp.act_as(p_user);
  execute 'set local role authenticated';
  execute p_sql into v;
  execute 'reset role';
  return v;
end;
$$;

-- 기준선 (PRE-G2): legacy 동작이 살아 있음
select is(pg_temp.count_as('00000000-0000-0000-0000-00000000a002', 'select count(*) from public.children'), 1::bigint,
  'PRE-G2: Sales still reads children through legacy is_soyes_admin');


-- ---------------------------------------------------------------------
-- G-2 cutover 적용 (운영자 확인 변수 포함)
-- ---------------------------------------------------------------------
\set g2_app_preflight passed
\ir ../M3_hq_role_split_sensitive_access.sql

select is((select count(*) from public.audit_events where event_type = 'cutover.g2_hq_role_split_applied')::int, 1,
  'G-2: cutover application is audited');
select is((select count(*) from pg_catalog.pg_trigger where tgname like '%entitlement_gate%')::int, 0,
  'G-2: applying G-2 does not install G-1 entitlement gates');


-- ---------------------------------------------------------------------
-- 기본 suite 에서 옮긴 assertion (N-3 · N-4 · N-13 · J)
-- ---------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a002');
select is((select count(*) from public.children)::int, 0, 'N-3: Sales cannot read children');
select is((select count(*) from public.class_session_observations)::int, 0, 'N-3: Sales cannot read observations');
select is((select private.is_soyes_admin()), false, 'legacy is_soyes_admin excludes sales');
select is((select count(*) from public.children)::int, 0, 'J: Sales cannot read children');
select is((select count(*) from public.class_session_observations)::int, 0, 'J: Sales cannot read observations');
select is((select count(*) from public.child_growth_reports)::int, 0, 'G-2: Sales cannot read legacy growth reports');
select is((select count(*) from public.lead_submissions)::int, 1, 'G-2: Sales keeps lead access');
select lives_ok($$ select * from public.hq_sales_organization_summary() $$, 'G-2: Sales keeps the commercial summary');
select throws_ok($$ select public.hq_support_open_observation('90000000-0000-0000-0000-0000000000b1', '영업 열람 시도') $$,
  '42501', null, 'G-2: Sales cannot use support access');

select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select is((select count(*) from public.class_session_observations)::int, 0, 'N-4: HQ Admin has no blanket observation SELECT');
select is((select count(*) from public.class_session_observations)::int, 0, 'J: HQ admin has no blanket observation SELECT');
select is((select count(*) from public.class_session_observation_media)::int, 0, 'G-2: HQ admin has no blanket photo metadata SELECT');
select is((select count(*) from public.children)::int, 1, 'G-2: HQ admin keeps operational child metadata');
select is((select count(*) from public.lead_submissions)::int, 1, 'G-2: HQ admin keeps lead access');
select throws_ok($$ select public.hq_support_open_observation('90000000-0000-0000-0000-0000000000b1', '') $$,
  'HS001', null, 'G-2: support access requires a reason');
select lives_ok($$ select public.hq_support_open_observation('90000000-0000-0000-0000-0000000000b1', '학부모 문의 확인') $$,
  'G-2: HQ admin support access with reason');
select is((select count(*) from public.audit_events where event_type = 'support.observation_opened' and reason = '학부모 문의 확인')::int, 1,
  'G-2: support access is audited');
select is(private.can_read_observation_media_object(
  '10000000-0000-0000-0000-00000000000b/80000000-0000-0000-0000-0000000000b1/40000000-0000-0000-0000-0000000000b1/85000000-0000-0000-0000-0000000000b1.jpg'),
  false, 'G-2: HQ admin cannot sign observation photos');

select pg_temp.act_as('00000000-0000-0000-0000-00000000c001');
select is((select count(*) from public.class_session_observation_ai_drafts)::int, 0, 'N-13: Director cannot read observation AI drafts');
select is(private.can_read_observation_media_object(
  '10000000-0000-0000-0000-00000000000b/80000000-0000-0000-0000-0000000000b1/40000000-0000-0000-0000-0000000000b1/85000000-0000-0000-0000-0000000000b1.jpg'),
  true, 'G-2: director still signs own organization photos');
select pg_temp.act_as('00000000-0000-0000-0000-00000000c002');
select is((select count(*) from public.class_session_observation_ai_drafts)::int, 1, 'G-2: assigned teacher keeps own AI drafts');
reset role;


-- ---------------------------------------------------------------------
-- PHASE 08 §5 (D2) · §6 (A1)
-- ---------------------------------------------------------------------
create or replace function pg_temp.try_sql(p_sql text) returns text language plpgsql as $$
declare
  v_rows integer;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return 'rows=' || v_rows;
exception when others then
  return sqlstate;
end;
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000009001', 'g2-new-teacher@test.local'),
  ('00000000-0000-0000-0000-000000009002', 'g2-new-teacher-2@test.local');

select is(has_any_column_privilege('authenticated', 'public.organization_members', 'INSERT'), false,
  'G-2/P08: authenticated has no direct organization_members INSERT');
select is(has_any_column_privilege('authenticated', 'public.organization_members', 'UPDATE'), false,
  'G-2/P08: authenticated has no direct organization_members UPDATE');
select is((select count(*) from pg_catalog.pg_trigger where tgname like '%release_gate%')::int, 2,
  'G-2/P08: AI draft release gates installed');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select is(pg_temp.try_sql($f$insert into public.organization_members (organization_id, user_id, role, status)
    values ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000009001', 'teacher', 'active')$f$),
  '42501', 'G-2/P08: HQ Admin direct membership INSERT closed');
select lives_ok(
  $$ select public.hq_add_organization_member('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000009001', 'teacher', 'G-2 이후 교사 등록') $$,
  'G-2/P08: HQ Admin audited membership RPC still works');
select pg_temp.act_as('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$ select public.hq_add_organization_member('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000009002', 'teacher', '영업 등록 시도') $$,
  '42501', null, 'G-2/P08: HQ Sales membership RPC denied');
select is(pg_temp.try_sql($f$insert into public.organization_members (organization_id, user_id, role, status)
    values ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000a002', 'director', 'active')$f$),
  '42501', 'G-2/P08: HQ Sales direct self-grant closed');
select is(pg_temp.try_sql($f$insert into public.organization_members (organization_id, user_id, role, status)
    values ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000009002', 'teacher', 'active')$f$),
  '42501', 'G-2/P08: HQ Sales organization_members INSERT (other user) denied');
select is(pg_temp.try_sql($f$update public.organization_members set status = 'disabled' where user_id = '00000000-0000-0000-0000-000000009001'$f$),
  '42501', 'G-2/P08: HQ Sales organization_members UPDATE denied');
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select is(pg_temp.try_sql($f$update public.organization_members set status = 'disabled' where user_id = '00000000-0000-0000-0000-000000009001'$f$),
  '42501', 'G-2/P08: HQ Admin direct organization_members UPDATE denied');
select lives_ok(
  $$ select public.hq_change_organization_member((select id from public.organization_members where user_id = '00000000-0000-0000-0000-000000009001'), '10000000-0000-0000-0000-00000000000b',
       null, 'disabled', 'G-2 이후 상태 변경', (select updated_at from public.organization_members where user_id = '00000000-0000-0000-0000-000000009001')) $$,
  'G-2/P08: HQ Admin audited change RPC succeeds');

select pg_temp.act_as('00000000-0000-0000-0000-00000000c002');
select is(pg_temp.try_sql($f$select public.save_observation_ai_generated_atomic('90000000-0000-0000-0000-0000000000b1', '새 AI 초안', 'test', 'test-model', 'test.v1')$f$),
  'AG002', 'G-2/P08: AI draft save without ai_assist / AR-8 rejected by DB');
select is(pg_temp.try_sql($f$update public.class_session_observation_ai_drafts set generated_text = '직접 재생성'
    where observation_id = '90000000-0000-0000-0000-0000000000b1'$f$),
  'AG002', 'G-2/P08: direct AI draft regeneration rejected by DB');
reset role;
select is((select count(*) from public.audit_events
           where event_type in ('membership.added', 'membership.changed') and metadata ->> 'via' = 'rpc'
             and reason in ('G-2 이후 교사 등록', 'G-2 이후 상태 변경'))::int, 2,
  'G-2/P08: RPC membership add / change audited with reason (via rpc)');
select is((select count(*) from public.audit_events where event_type like 'membership.%' and metadata ->> 'via' = 'direct')::int, 0,
  'G-2/P08: no direct membership write happened after G-2');


-- ---------------------------------------------------------------------
-- 되돌리기 → 재적용 (forward-fix 경로 확인)
-- ---------------------------------------------------------------------
\ir ../M3_hq_role_split_rollback.sql

select is(pg_temp.count_as('00000000-0000-0000-0000-00000000a002', 'select count(*) from public.children'), 1::bigint,
  'ROLLBACK: legacy Sales read restored');
select is((select count(*) from public.audit_events where event_type = 'cutover.g2_hq_role_split_rolled_back')::int, 1,
  'ROLLBACK: rollback is audited');
select is(has_any_column_privilege('authenticated', 'public.organization_members', 'INSERT'), true,
  'ROLLBACK/P08: direct membership INSERT restored (legacy app)');
select is((select count(*) from pg_catalog.pg_trigger where tgname like '%release_gate%')::int, 0,
  'ROLLBACK/P08: AI draft release gates removed');

\ir ../M3_hq_role_split_sensitive_access.sql

select is(pg_temp.count_as('00000000-0000-0000-0000-00000000a002', 'select count(*) from public.children'), 0::bigint,
  'RE-APPLY: cutover can be re-applied (Sales read closed again)');
select is(pg_temp.count_as('00000000-0000-0000-0000-00000000c001', 'select count(*) from public.class_session_observation_ai_drafts'), 0::bigint,
  'RE-APPLY: director AI draft access closed again');
select is(has_any_column_privilege('authenticated', 'public.organization_members', 'INSERT'), false,
  'RE-APPLY/P08: direct membership INSERT closed again');
select is((select count(*) from pg_catalog.pg_trigger where tgname like '%release_gate%')::int, 2,
  'RE-APPLY/P08: AI draft release gates installed again');

select * from finish();
rollback;
