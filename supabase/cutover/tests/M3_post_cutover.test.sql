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
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

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

select * from finish();
rollback;
