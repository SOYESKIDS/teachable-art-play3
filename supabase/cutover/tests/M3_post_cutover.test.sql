-- =====================================================================
-- PHASE 07 · POST-CUTOVER — M3 entitlement write gate (pgTAP · local 전용)
-- ---------------------------------------------------------------------
-- 실행: node supabase/cutover/tests/run-local.mjs M3_post_cutover.test.sql  (local DB 컨테이너 전용)
-- `supabase test db` 대상이 아니다 (cutover SQL 이 test 컨테이너에 mount 되지 않음).
-- 이 파일은 transaction 안에서 supabase/cutover/M3_entitlement_write_gates.sql 을
-- 직접 적용(\ir)한 뒤 gate 동작을 검증하고, 끝나면 전부 rollback 한다.
-- 일반 `db reset` 상태(PRE-CUTOVER)는 바뀌지 않는다.
--
-- Fixture (가상):
--   Org A = STARTER 유효 계약 (반 a1 범위 안 · a3 범위 밖)
--   Org C = cutover 시점 'suspended'(비운영) → cutover 후 계약 없이 다시 active 로 전환
--   Org S = 'suspended' 유지 (비운영 기관은 G-1 차단 조건에서 제외)
-- 계약 active 상태는 replica 모드 fixture 로만 만든다 (정상 활성화 경로는 CO-12 등으로 막혀 있음 ·
-- 이 파일은 "활성 계약이 존재하는 미래 상태"에서 gate 동작만 검증한다).
-- PHASE 08 (§3 · §4): D4 onboarding(초안 Org N · 시작 전 Org F) · D5 배정 재개 · FK 정리 UPDATE · legacy 표면 gate (ISSUE1) ·
--   rollback 파일(M3_entitlement_write_gates_rollback.sql) · 재적용 · G-1 이후 신규 기관 onboarding 전 과정 (ISSUE4).
-- PHASE 09E: 기간 만료 계약 쓰기 불가 · Weekly 쓰기 권한 = 계약 범위 · STARTER 승격 없음 · Pilot 별도 Offer (+11).
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(70);

set local session_replication_role = replica;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'hq-admin@test.local'),
  ('00000000-0000-0000-0000-00000000b002', 'teacher-a1@test.local'),
  ('00000000-0000-0000-0000-00000000d001', 'teacher-c@test.local');

insert into public.profiles (user_id, display_name) values
  ('00000000-0000-0000-0000-00000000a001', 'HQ Admin'),
  ('00000000-0000-0000-0000-00000000b002', 'Teacher A1'),
  ('00000000-0000-0000-0000-00000000d001', 'Teacher C')
on conflict (user_id) do nothing;

insert into private.admin_users (user_id, role) values
  ('00000000-0000-0000-0000-00000000a001', 'admin');

insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'Org A', 'active'),
  ('10000000-0000-0000-0000-00000000000c', 'Org C', 'suspended'),
  ('10000000-0000-0000-0000-00000000000d', 'Org S', 'suspended');

insert into public.organization_members (id, organization_id, user_id, role, status) values
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b002', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000d001', 'teacher', 'active');

insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '햇님반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '구름반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', '바다반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-00000000000d', '숲속반', 2026, 'active');

insert into public.class_teachers (organization_id, class_id, organization_member_id) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1');

insert into public.children (id, organization_id, class_id, name, status) values
  ('40000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '가상아이A1', 'active'),
  ('40000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '가상아이C1', 'active');

insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('50000000-0000-0000-0000-000000000001', 'TEST-P', 'Test Program', 8, 'published'),
  ('50000000-0000-0000-0000-000000000002', 'TEST-P2', 'Test Program 24', 24, 'published');

insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status) values
  ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1, 1, '1주 수업', 'published'),
  ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 2, 1, '2주 수업', 'published'),
  ('52000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 2, 1, 'P2 2주 수업', 'published'),
  ('52000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000002', 9, 1, 'P2 9주 수업', 'published');

update public.product_versions pv
set lifecycle = 'published', published_at = now()
from public.products p
where p.id = pv.product_id and p.code = 'starter';

insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
select '60000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', pv.id, 'active',
       private.local_today() - 30, private.local_today() + 60
from public.product_versions pv join public.products p on p.id = pv.product_id
where p.code = 'starter';

insert into public.contract_classes (organization_id, contract_id, class_id) values
  ('10000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1');

insert into public.class_program_assignments (id, organization_id, class_id, program_id, status) values
  ('70000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', 'active'),
  ('70000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '50000000-0000-0000-0000-000000000001', 'active');

insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status, week_no) values
  ('80000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today(), 'in_progress', 1),
  ('80000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '70000000-0000-0000-0000-0000000000c1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today(), 'in_progress', 1);

set local session_replication_role = origin;

create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

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


-- ---------------------------------------------------------------------
-- 1. cutover 적용 (local · 이 transaction 안에서만)
-- ---------------------------------------------------------------------
select is((select count(*) from pg_catalog.pg_trigger where tgname like '%entitlement_gate%')::int, 0,
  'PRE: no entitlement gate triggers before cutover');

\ir ../M3_entitlement_write_gates.sql

select is((select count(*) from pg_catalog.pg_trigger where tgname like '%entitlement_gate%')::int, 4,
  'CUTOVER: 4 entitlement gate triggers installed');
select is((select count(*) from public.audit_events where event_type = 'cutover.m3_entitlement_gates_applied')::int, 1,
  'CUTOVER: application is audited');
select ok(pg_get_functiondef('private.is_soyes_admin()'::regprocedure) like '%''sales''%',
  'CUTOVER: G-1 does not perform the G-2 role split (legacy is_soyes_admin unchanged)');

-- 반복 적용 안전 (G-1 조건이 여전히 충족될 때)
\ir ../M3_entitlement_write_gates.sql

select is((select count(*) from pg_catalog.pg_trigger where tgname like '%entitlement_gate%')::int, 4,
  'CUTOVER: re-applying is idempotent (still 4 triggers)');
select is((select count(*) from private.g1_blocking_organizations())::int, 0,
  'CUTOVER: guard sees no blocking organization (suspended orgs excluded)');


-- ---------------------------------------------------------------------
-- 2. gate 동작 (p0_hardening 에서 옮긴 7개 + 추가)
-- ---------------------------------------------------------------------
select throws_ok(
  $$ insert into public.class_program_assignments (organization_id, class_id, program_id, status)
     values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a3', '50000000-0000-0000-0000-000000000002', 'active') $$,
  'EN001', null, 'POST: out-of-scope class cannot get a program assignment');
select lives_ok(
  $$ insert into public.class_program_assignments (id, organization_id, class_id, program_id, status)
     values ('70000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000002', 'active') $$,
  'POST: in-scope class assignment permitted');
select is((select origin_contract_id from public.class_program_assignments where id = '70000000-0000-0000-0000-0000000000a2'),
  '60000000-0000-0000-0000-00000000000a'::uuid, 'POST: assignment records its origin contract');
select throws_ok(
  $$ insert into public.class_sessions (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
     values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a2',
             '50000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000009', private.local_today() + 7, 'scheduled') $$,
  'EN002', null, 'POST: week outside STARTER range (1~8) rejected');
select lives_ok(
  $$ insert into public.class_sessions (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
     values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a2',
             '50000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', private.local_today() + 7, 'scheduled') $$,
  'POST: in-scope class, entitled week session permitted');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select lives_ok(
  $$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000a1',
       '[{"child_id":"40000000-0000-0000-0000-0000000000a1","attendance_status":"present"}]'::jsonb) $$,
  'POST: entitled legacy attendance write succeeds');
select lives_ok(
  $$ select public.save_class_observation('80000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
       '색을 섞어 보았다', null, 'complete', '[]'::jsonb, null) $$,
  'POST: entitled observation write succeeds');

-- 비운영 기관이 계약 없이 다시 운영 상태가 되면 (새 미등록 기관과 같은 상태)
reset role;
update public.organizations set status = 'active' where id = '10000000-0000-0000-0000-00000000000c';

select throws_ok($$ select private.assert_g1_preflight_clean() $$, 'G1001', null,
  'POST: guard detects an operating organization without an effective contract');
select is((select count(*) from private.g1_blocking_organizations()
           where organization_id = '10000000-0000-0000-0000-00000000000d')::int, 0,
  'POST: suspended organization is excluded from G-1 blocking');
select throws_ok(
  $$ insert into public.class_sessions (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
     values ('10000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '70000000-0000-0000-0000-0000000000c1',
             '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', private.local_today() + 7, 'scheduled') $$,
  'EN002', null, 'POST: organization without contract cannot add a session');

select pg_temp.act_as('00000000-0000-0000-0000-00000000d001');
select throws_ok(
  $$ insert into public.class_session_observations (organization_id, class_session_id, class_id, child_id, teacher_note, record_status)
     values ('10000000-0000-0000-0000-00000000000c', '80000000-0000-0000-0000-0000000000c1', '30000000-0000-0000-0000-0000000000c1',
             '40000000-0000-0000-0000-0000000000c1', '직접 기록', 'complete') $$,
  'EN003', null, 'POST: gate trigger rejects direct observation write without entitlement');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d001');
select throws_ok(
  $$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000c1',
       '[{"child_id":"40000000-0000-0000-0000-0000000000c1","attendance_status":"present"}]'::jsonb) $$,
  'EN003', null, 'POST: legacy attendance RPC blocked without entitlement');
select throws_ok(
  $$ select public.save_class_session_observation_atomic('80000000-0000-0000-0000-0000000000c1', '40000000-0000-0000-0000-0000000000c1',
       null, '관찰', 'complete', '{}'::text[], null) $$,
  'EN003', null, 'POST: legacy observation RPC blocked without entitlement');

-- 정지 = 읽기 전용 (legacy 경로 포함)
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.change_contract_status('60000000-0000-0000-0000-00000000000a', 'suspended', '운영 점검',
       (select updated_at from public.contracts where id = '60000000-0000-0000-0000-00000000000a')) $$,
  'POST: HQ admin suspends contract with reason');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select throws_ok(
  $$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000a1',
       '[{"child_id":"40000000-0000-0000-0000-0000000000a1","attendance_status":"late"}]'::jsonb) $$,
  'EN003', null, 'POST: suspended contract blocks legacy attendance edits');
select is((select count(*) from public.class_session_attendance
           where class_session_id = '80000000-0000-0000-0000-0000000000a1' and attendance_status = 'present')::int, 1,
  'POST: existing attendance remains readable and unchanged while read_only');

select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.change_contract_status('60000000-0000-0000-0000-00000000000a', 'active', '점검 완료',
       (select updated_at from public.contracts where id = '60000000-0000-0000-0000-00000000000a')) $$,
  'POST: HQ admin resumes contract with reason');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select lives_ok(
  $$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000a1',
       '[{"child_id":"40000000-0000-0000-0000-0000000000a1","attendance_status":"late"}]'::jsonb) $$,
  'POST: resumed contract allows attendance edits again');

reset role;

-- PHASE 09E: 기간이 끝난 계약 (ended · 기간 만료) = 쓰기 불가 · Weekly 권한 · STARTER 승격 없음 · Pilot 별도 Offer
set local session_replication_role = replica;
update public.contracts set start_date = private.local_today() - 90, end_date = private.local_today() - 1
where id = '60000000-0000-0000-0000-00000000000a';
set local session_replication_role = origin;
select isnt(private.org_service_mode('10000000-0000-0000-0000-00000000000a'), 'active',
  '09E: contract past its end date → service mode no longer active');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select throws_ok(
  $$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000a1',
       '[{"child_id":"40000000-0000-0000-0000-0000000000a1","attendance_status":"present"}]'::jsonb) $$,
  'EN003', null, '09E: ended (expired) contract blocks record writes (EN003)');
reset role;
set local session_replication_role = replica;
update public.contracts set start_date = private.local_today() - 30, end_date = private.local_today() + 60
where id = '60000000-0000-0000-0000-00000000000a';
set local session_replication_role = origin;

select is(private.class_write_allowed('30000000-0000-0000-0000-0000000000a1', 'weekly_report'), true,
  '09E: STARTER in-scope class keeps weekly_report write authority under G-1');
select is(private.class_write_allowed('30000000-0000-0000-0000-0000000000a3', 'weekly_report'), false,
  '09E: out-of-scope class has no weekly_report write authority');
select is(private.class_has_feature('30000000-0000-0000-0000-0000000000a1', 'director_dashboard'), false,
  '09E: STARTER class has no director_dashboard entitlement');
select is(private.class_has_feature('30000000-0000-0000-0000-0000000000a1', 'monthly_report'), false,
  '09E: STARTER class has no monthly_report (no STANDARD escalation)');
select is(private.class_has_feature('30000000-0000-0000-0000-0000000000a1', 'semester_report'), false,
  '09E: STARTER class has no semester_report (no PREMIUM escalation)');
select is(private.class_has_feature('30000000-0000-0000-0000-0000000000a1', 'ai_assist'), false,
  '09E: STARTER class has no ai_assist entitlement');
select is((select pv.week_from || '-' || pv.week_to || ' / ' || pv.children_per_class || ' / ' || pv.max_classes
           from public.product_versions pv join public.products p on p.id = pv.product_id
           where p.code = 'pilot' and pv.version_label = '2026.1'), '1-4 / 15 / 2',
  '09E: Pilot remains a separate offer (weeks 1-4 · 15 per class · max 2 classes)');
select is((select count(*) from public.product_version_features f
           join public.product_versions pv on pv.id = f.product_version_id
           join public.products p on p.id = pv.product_id
           where p.code = 'pilot' and f.feature_code in ('monthly_report', 'semester_report'))::int, 0,
  '09E: Pilot reports are Weekly only (no monthly / semester)');
select isnt((select pv.id from public.product_versions pv join public.products p on p.id = pv.product_id where p.code = 'pilot' and pv.version_label = '2026.1'),
            (select pv.id from public.product_versions pv join public.products p on p.id = pv.product_id where p.code = 'starter' and pv.version_label = '2026.1'),
  '09E: Pilot is not the STARTER product version');


-- ---------------------------------------------------------------------
-- 3. PHASE 08 — D4 onboarding (초안 · 시작 전) · D5 배정 재개 · FK 정리 · gate 교체 · 되돌리기
-- ---------------------------------------------------------------------
-- Org N = 신규 기관 · STARTER 초안 계약 (반 n1 범위 · n2 범위 밖)
-- Org F = STARTER 활성화 · 시작일 +10 (before_start) · 반 f1 범위
set local session_replication_role = replica;
insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-00000000000e', 'Org N', 'active'),
  ('10000000-0000-0000-0000-00000000000f', 'Org F', 'active');
insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000e', '새싹반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-00000000000e', '잎새반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000f1', '10000000-0000-0000-0000-00000000000f', '열매반', 2026, 'active');
insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
select '60000000-0000-0000-0000-00000000000f', '10000000-0000-0000-0000-00000000000f', pv.id, 'active',
       private.local_today() + 10, private.local_today() + 70
from public.product_versions pv join public.products p on p.id = pv.product_id
where p.code = 'starter';
insert into public.contract_classes (organization_id, contract_id, class_id) values
  ('10000000-0000-0000-0000-00000000000f', '60000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-0000000000f1');
-- 범위 밖 반 a3 의 종료된 배정 (재개 시도용) · Org C 진행 중 수업의 관찰 (FK 정리용)
insert into public.class_program_assignments (id, organization_id, class_id, program_id, status) values
  ('70000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a3', '50000000-0000-0000-0000-000000000001', 'completed');
insert into public.class_session_observations (id, organization_id, class_session_id, class_id, child_id, teacher_note, record_status, created_by, updated_by) values
  ('90000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', '80000000-0000-0000-0000-0000000000c1', '30000000-0000-0000-0000-0000000000c1',
   '40000000-0000-0000-0000-0000000000c1', 'legacy 관찰', 'complete', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000d001');
set local session_replication_role = origin;

-- 초안 계약은 정상 경로(HQ 초안 생성 · 반 범위)로 만든다
insert into public.contracts (id, organization_id, product_version_id, start_date, end_date)
select '60000000-0000-0000-0000-00000000000e', '10000000-0000-0000-0000-00000000000e', pv.id,
       private.local_today() + 7, private.local_today() + 90
from public.product_versions pv join public.products p on p.id = pv.product_id
where p.code = 'starter';
insert into public.contract_classes (organization_id, contract_id, class_id) values
  ('10000000-0000-0000-0000-00000000000e', '60000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e1');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ insert into public.class_program_assignments (organization_id, class_id, program_id, status)
     values ('10000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e1', '50000000-0000-0000-0000-000000000001', 'active') $$,
  'D4: draft-contract scope class can receive a program assignment (onboarding · no deadlock)');
select throws_ok(
  $$ insert into public.class_program_assignments (organization_id, class_id, program_id, status)
     values ('10000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e2', '50000000-0000-0000-0000-000000000001', 'active') $$,
  'EN001', null, 'D4: class outside every contract scope still rejected (no permanent bypass)');
select throws_ok(
  $$ insert into public.class_sessions (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
     values ('10000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e1', (select id from public.class_program_assignments where class_id = '30000000-0000-0000-0000-0000000000e1'),
             '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today() + 8, 'scheduled') $$,
  'EN002', null, 'D4: no service write (session) before activation');
select lives_ok(
  $$ insert into public.class_program_assignments (organization_id, class_id, program_id, status)
     values ('10000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-0000000000f1', '50000000-0000-0000-0000-000000000002', 'active') $$,
  'D4: before_start contract scope class can receive a program assignment');
select lives_ok(
  $$ insert into public.class_sessions (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
     values ('10000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-0000000000f1', (select id from public.class_program_assignments where class_id = '30000000-0000-0000-0000-0000000000f1'),
             '50000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', private.local_today() + 12, 'scheduled') $$,
  'D4: before_start allows schedule preparation inside the contract week range');
select throws_ok(
  $$ insert into public.class_sessions (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
     values ('10000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-0000000000f1', (select id from public.class_program_assignments where class_id = '30000000-0000-0000-0000-0000000000f1'),
             '50000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000009', private.local_today() + 12, 'scheduled') $$,
  'EN002', null, 'D4: before_start still limits the week range (STARTER 1~8)');
select throws_ok(
  $$ update public.class_program_assignments set status = 'active' where id = '70000000-0000-0000-0000-0000000000a3' $$,
  'EN001', null, 'D5: re-activating an assignment outside the contract scope rejected');
reset role;

select is((select origin_contract_id from public.class_program_assignments where class_id = '30000000-0000-0000-0000-0000000000e1'),
  '60000000-0000-0000-0000-00000000000e'::uuid, 'D4: onboarding assignment records the draft contract as provenance');
select is((select origin_contract_id from public.class_program_assignments where class_id = '30000000-0000-0000-0000-0000000000f1'),
  '60000000-0000-0000-0000-00000000000f'::uuid, 'D4: before_start assignment records the upcoming contract');
select is((select (e ->> 'ok')::boolean
           from jsonb_array_elements(private.contract_readiness_internal('60000000-0000-0000-0000-00000000000e') -> 'items') e
           where e ->> 'code' = 'program_assignment'), true,
  'D4: readiness program_assignment item can now be satisfied before activation');
select is(private.class_write_allowed('30000000-0000-0000-0000-0000000000e1', 'class_mode')
          or private.class_write_allowed('30000000-0000-0000-0000-0000000000f1', 'class_mode'), false,
  'D4: draft / before_start classes still have no class_mode write (hard entitlement after activation only)');
select lives_ok(
  $$ update public.class_session_observations set created_by = null where id = '90000000-0000-0000-0000-0000000000c1' $$,
  'D5/D7: FK clean-up style update (audit columns only) is not blocked by the record gate');
select is((select count(*) from pg_catalog.pg_trigger
           where tgname in ('trg_class_sessions_status_g1_gate', 'trg_observation_domains_g1_gate'))::int, 2,
  'ISSUE1: legacy-surface gates (direct start · domain links) are installed by G-1 itself');

-- Issue 1: G-1 이 켜는 legacy 공유 쓰기 표면 판정 (일반 migration 에는 없다) — Org C (운영 중 · 계약 없음)
set local session_replication_role = replica;
insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status, week_no) values
  ('80000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '70000000-0000-0000-0000-0000000000c1',
   '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', private.local_today(), 'scheduled', 2);
set local session_replication_role = origin;

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d001');
select is(pg_temp.try_sql($f$update public.class_sessions set status = 'completed' where id = '80000000-0000-0000-0000-0000000000c2'$f$),
  'EN003', 'ISSUE1/POST: legacy direct scheduled -> completed rejected without entitlement (G-1)');
select is(pg_temp.try_sql($f$insert into public.class_session_observation_domains (observation_id, domain_code)
    select '90000000-0000-0000-0000-0000000000c1', code from public.observation_domains order by sort_order limit 1$f$),
  'EN003', 'ISSUE1/POST: legacy domain link rejected without entitlement (G-1)');
select is(private.can_upload_observation_media_object(
  '10000000-0000-0000-0000-00000000000c/80000000-0000-0000-0000-0000000000c1/40000000-0000-0000-0000-0000000000c1/85000000-0000-0000-0000-0000000000c9.jpg'),
  false, 'ISSUE1/POST: photo upload refused without entitlement (G-1)');
reset role;

-- 되돌리기 (PHASE 08 rollback 파일)
\ir ../M3_entitlement_write_gates_rollback.sql

select is((select count(*) from pg_catalog.pg_trigger
           where tgname like '%entitlement_gate%' or tgname like '%\_g1\_gate')::int, 0,
  'ROLLBACK: all G-1 gate triggers removed');
select ok(to_regprocedure('private.gate_class_record_write()') is null
          and to_regprocedure('private.gate_class_session_direct_start()') is null
          and to_regprocedure('private.assert_g1_preflight_clean()') is null,
  'ROLLBACK: G-1 functions removed (PRE-CUTOVER shape)');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d001');
select is(private.can_upload_observation_media_object(
  '10000000-0000-0000-0000-00000000000c/80000000-0000-0000-0000-0000000000c1/40000000-0000-0000-0000-0000000000c1/85000000-0000-0000-0000-0000000000c9.jpg'),
  true, 'ROLLBACK: photo upload judgement back to the normal-migration rule (consent only)');
select is(pg_temp.try_sql($f$update public.class_sessions set status = 'completed' where id = '80000000-0000-0000-0000-0000000000c2'$f$),
  'rows=1', 'ROLLBACK: legacy direct completion back to pre-G1 behaviour (M5 not applied)');
reset role;
select is((select count(*) from public.audit_events where event_type = 'cutover.m3_entitlement_gates_rolled_back')::int, 1,
  'ROLLBACK: rollback is audited');

-- 재적용 (G-1 조건을 다시 맞춘 뒤): G1001 은 적용 시점의 cleanliness guard — 계약 없는 기관(C)과
-- onboarding 중(초안 N · 시작 전 F)이면서 운영 중 반이 있는 기관은 적용 창에서 정지 상태여야 한다
update public.organizations set status = 'suspended'
where id in ('10000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-00000000000e', '10000000-0000-0000-0000-00000000000f');

\ir ../M3_entitlement_write_gates.sql

select is((select count(*) from pg_catalog.pg_trigger where tgname like '%entitlement_gate%')::int, 4,
  'RE-APPLY: G-1 entitlement gates installed again');
select is((select count(*) from pg_catalog.pg_trigger where tgname like '%\_g1\_gate')::int, 2,
  'RE-APPLY: legacy-surface gates installed again');


-- ---------------------------------------------------------------------
-- 4. ISSUE 4 — G-1 적용 후 신규 기관 onboarding 전 과정 (G1001 은 실행되지 않는다)
-- ---------------------------------------------------------------------
-- Org W = G-1 적용 이후 새로 온 기관. 가짜 계약 · bypass 없이:
--   초안 계약 → 반 범위 → 배정(provenance) → Readiness → 활성화 → 정상 쓰기
-- [SIMULATION] 정책 blocker(CO-12 등) 해소 이후 상태를 transaction 안에서만 가정한다 (실제 registry 는 바꾸지 않음 · rollback).
update public.platform_capabilities set is_released = true, blocked_by = '{}'
where code in ('class_mode', 'weekly_report', 'parent_portal');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000f0f1', 'onboard-teacher@test.local');
insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-0000000000f0', 'Org W (post-G1 onboarding)', 'active');
insert into public.organization_members (id, organization_id, user_id, role, status) values
  ('20000000-0000-0000-0000-0000000000f0', '10000000-0000-0000-0000-0000000000f0', '00000000-0000-0000-0000-00000000f0f1', 'teacher', 'active');
insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000000f0', '10000000-0000-0000-0000-0000000000f0', '새반', 2026, 'active');
insert into public.class_teachers (organization_id, class_id, organization_member_id) values
  ('10000000-0000-0000-0000-0000000000f0', '30000000-0000-0000-0000-0000000000f0', '20000000-0000-0000-0000-0000000000f0');
insert into public.children (id, organization_id, class_id, name, status) values
  ('40000000-0000-0000-0000-0000000000f0', '10000000-0000-0000-0000-0000000000f0', '30000000-0000-0000-0000-0000000000f0', '가상아이W', 'active');
insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('50000000-0000-0000-0000-0000000000f0', 'G1-ONB', 'Onboarding Program', 8, 'published');
insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status)
select ('5f000000-0000-0000-0000-00000000000' || w)::uuid, '50000000-0000-0000-0000-0000000000f0', w, 1, w || '주 수업', 'draft'
from generate_series(1, 8) as w;
insert into public.lesson_sections (lesson_id, section_code, body)
select ('5f000000-0000-0000-0000-00000000000' || w)::uuid, s.code, '가상 ' || s.code
from generate_series(1, 8) as w
cross join unnest(private.required_lesson_sections()) as s(code);
-- 콘텐츠 흐름대로: 초안 차시에 섹션을 채운 뒤 게시
update public.curriculum_lessons set status = 'published' where program_id = '50000000-0000-0000-0000-0000000000f0';

-- 초안 계약 · 반 범위 (정상 경로)
insert into public.contracts (id, organization_id, product_version_id, start_date, end_date)
select '60000000-0000-0000-0000-0000000000f0', '10000000-0000-0000-0000-0000000000f0', pv.id,
       private.local_today(), private.local_today() + 60
from public.product_versions pv join public.products p on p.id = pv.product_id
where p.code = 'starter';
insert into public.contract_classes (organization_id, contract_id, class_id) values
  ('10000000-0000-0000-0000-0000000000f0', '60000000-0000-0000-0000-0000000000f0', '30000000-0000-0000-0000-0000000000f0');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ insert into public.class_program_assignments (organization_id, class_id, program_id, status)
     values ('10000000-0000-0000-0000-0000000000f0', '30000000-0000-0000-0000-0000000000f0', '50000000-0000-0000-0000-0000000000f0', 'active') $$,
  'ISSUE4: post-G1 draft-contract assignment bootstrap');
reset role;
select is((select origin_contract_id from public.class_program_assignments where class_id = '30000000-0000-0000-0000-0000000000f0'),
  '60000000-0000-0000-0000-0000000000f0'::uuid, 'ISSUE4: assignment provenance = the draft contract (no fake contract)');
select is((private.contract_readiness_internal('60000000-0000-0000-0000-0000000000f0') ->> 'ready')::boolean, true,
  'ISSUE4: readiness evaluates to READY after bootstrap');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.activate_contract('60000000-0000-0000-0000-0000000000f0',
       (select updated_at from public.contracts where id = '60000000-0000-0000-0000-0000000000f0')) $$,
  'ISSUE4: HQ Admin activates the contract through the normal readiness gate');
reset role;
select is(private.org_service_mode('10000000-0000-0000-0000-0000000000f0'), 'active', 'ISSUE4: service mode active after activation');
select is((select count(*) from public.contracts where organization_id = '10000000-0000-0000-0000-0000000000f0')::int, 1,
  'ISSUE4: exactly one contract (no auto-created contract)');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000f0f1');
select lives_ok(
  $$ insert into public.class_sessions (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
     values ('10000000-0000-0000-0000-0000000000f0', '30000000-0000-0000-0000-0000000000f0',
             (select id from public.class_program_assignments where class_id = '30000000-0000-0000-0000-0000000000f0'),
             '50000000-0000-0000-0000-0000000000f0', '5f000000-0000-0000-0000-000000000001', private.local_today(), 'scheduled') $$,
  'ISSUE4: normal write — session scheduled under G-1 (EN002 passes)');
select lives_ok(
  $$ select public.confirm_session_before((select id from public.class_sessions where class_id = '30000000-0000-0000-0000-0000000000f0'), true, true) $$,
  'ISSUE4: BEFORE confirmation');
select lives_ok(
  $$ select public.start_class_session((select id from public.class_sessions where class_id = '30000000-0000-0000-0000-0000000000f0')) $$,
  'ISSUE4: V2 start (required sections · entitlement)');
select lives_ok(
  $$ select public.save_class_session_attendance_atomic((select id from public.class_sessions where class_id = '30000000-0000-0000-0000-0000000000f0'),
       '[{"child_id":"40000000-0000-0000-0000-0000000000f0","attendance_status":"present"}]'::jsonb) $$,
  'ISSUE4: attendance under G-1');
select lives_ok(
  $$ select public.save_class_observation((select id from public.class_sessions where class_id = '30000000-0000-0000-0000-0000000000f0'),
       '40000000-0000-0000-0000-0000000000f0', '색을 섞어 보았다', null, 'complete',
       '[{"metric_code":"creative_attempt","stage":"independent"}]'::jsonb, null) $$,
  'ISSUE4: Growth5 observation under G-1');
reset role;
select is((select count(*) from public.audit_events where event_type = 'cutover.m3_entitlement_gates_applied')::int, 3,
  'ISSUE4: G-1 was not re-applied during onboarding (G1001 is a cutover-time guard only)');

select * from finish();
rollback;
