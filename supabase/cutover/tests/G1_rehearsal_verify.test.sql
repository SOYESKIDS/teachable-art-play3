-- =====================================================================
-- PHASE 09E · G-1 REHEARSAL VERIFY — G-2 위에 G-1 (Staging 과 같은 순서) · pgTAP · local 전용
-- ---------------------------------------------------------------------
-- 실행: node supabase/cutover/tests/run-local.mjs G1_rehearsal_verify.test.sql  (local DB 컨테이너 전용)
-- transaction 안에서: G-2 적용 → [PRE-G1] → G-1 적용 → trigger disable 감지 → G-1 rollback (G-2 유지 확인)
--   → G-1 재적용 → G-2 rollback 회귀 감지 → 전부 rollback. local DB 는 바뀌지 않는다.
-- 운영자용 읽기 전용 확인 SQL 두 개를 그대로 펼쳐 판정한다:
--   supabase/validation/staging_e2e/sql/g1_post_verify.sql · g2_post_verify.sql
-- 함께 확인: Staging 과 같은 STARTER 유효 계약 반에서 G-1 적용 후에도 교사 기록 쓰기가 계속되고,
--           계약 범위 밖 반은 EN003 으로 막힌다 (entitlement 우회 없음).
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

set local session_replication_role = replica;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000e0001', 'g1r-teacher@test.local'),
  ('00000000-0000-0000-0000-0000000e0002', 'g1r-teacher-out@test.local');

insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-0000000e0001', 'G1R Org (가상)', 'active');

insert into public.organization_members (id, organization_id, user_id, role, status) values
  ('20000000-0000-0000-0000-0000000e0001', '10000000-0000-0000-0000-0000000e0001', '00000000-0000-0000-0000-0000000e0001', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000e0002', '10000000-0000-0000-0000-0000000e0001', '00000000-0000-0000-0000-0000000e0002', 'teacher', 'active');

insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000e0001', '10000000-0000-0000-0000-0000000e0001', '계약반(가상)', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000e0002', '10000000-0000-0000-0000-0000000e0001', '범위밖반(가상)', 2026, 'active');

insert into public.class_teachers (organization_id, class_id, organization_member_id) values
  ('10000000-0000-0000-0000-0000000e0001', '30000000-0000-0000-0000-0000000e0001', '20000000-0000-0000-0000-0000000e0001'),
  ('10000000-0000-0000-0000-0000000e0001', '30000000-0000-0000-0000-0000000e0002', '20000000-0000-0000-0000-0000000e0002');

insert into public.children (id, organization_id, class_id, name, status) values
  ('40000000-0000-0000-0000-0000000e0001', '10000000-0000-0000-0000-0000000e0001', '30000000-0000-0000-0000-0000000e0001', '가상아이E1', 'active'),
  ('40000000-0000-0000-0000-0000000e0002', '10000000-0000-0000-0000-0000000e0001', '30000000-0000-0000-0000-0000000e0002', '가상아이E2', 'active');

insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('50000000-0000-0000-0000-0000000e0001', 'G1R-P', 'G1R Program', 8, 'published');
insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status) values
  ('51000000-0000-0000-0000-0000000e0001', '50000000-0000-0000-0000-0000000e0001', 1, 1, '1주 수업', 'published');

update public.product_versions pv set lifecycle = 'published', published_at = now()
from public.products p where p.id = pv.product_id and p.code = 'starter';

insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
select '60000000-0000-0000-0000-0000000e0001', '10000000-0000-0000-0000-0000000e0001', pv.id, 'active',
       private.local_today() - 30, private.local_today() + 60
from public.product_versions pv join public.products p on p.id = pv.product_id where p.code = 'starter';
insert into public.contract_classes (organization_id, contract_id, class_id) values
  ('10000000-0000-0000-0000-0000000e0001', '60000000-0000-0000-0000-0000000e0001', '30000000-0000-0000-0000-0000000e0001');

insert into public.class_program_assignments (id, organization_id, class_id, program_id, status) values
  ('70000000-0000-0000-0000-0000000e0001', '10000000-0000-0000-0000-0000000e0001', '30000000-0000-0000-0000-0000000e0001', '50000000-0000-0000-0000-0000000e0001', 'active'),
  ('70000000-0000-0000-0000-0000000e0002', '10000000-0000-0000-0000-0000000e0001', '30000000-0000-0000-0000-0000000e0002', '50000000-0000-0000-0000-0000000e0001', 'active');
insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status, week_no) values
  ('80000000-0000-0000-0000-0000000e0001', '10000000-0000-0000-0000-0000000e0001', '30000000-0000-0000-0000-0000000e0001', '70000000-0000-0000-0000-0000000e0001', '50000000-0000-0000-0000-0000000e0001', '51000000-0000-0000-0000-0000000e0001', private.local_today(), 'in_progress', 1),
  ('80000000-0000-0000-0000-0000000e0002', '10000000-0000-0000-0000-0000000e0001', '30000000-0000-0000-0000-0000000e0002', '70000000-0000-0000-0000-0000000e0002', '50000000-0000-0000-0000-0000000e0001', '51000000-0000-0000-0000-0000000e0001', private.local_today(), 'in_progress', 1);

set local session_replication_role = origin;

create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- ---------------------------------------------------------------------
-- G-2 먼저 (Staging 현재 상태와 같게)
-- ---------------------------------------------------------------------
\set g2_app_preflight passed
\ir ../M3_hq_role_split_sensitive_access.sql

create temp view g2_verify as
\ir ../../validation/staging_e2e/sql/g2_post_verify.sql
create temp view g1_verify as
\ir ../../validation/staging_e2e/sql/g1_post_verify.sql

select is((select verdict from g2_verify), 'G-2 ACTIVE — VERIFIED', 'PRE-G1: G-2 active (Staging-equivalent starting point)');
select is((select verdict like 'G-1 NOT VERIFIED%' from g1_verify), true, 'PRE-G1: g1_post_verify = NOT VERIFIED');
select is((select not exists (select 1 from unnest(missing) m where m like 'g2\_%') from g1_verify), true,
  'PRE-G1: only G-1 items are missing (G-2 part of g1_post_verify passes)');
select is((select m5_applied from g1_verify), false, 'PRE-G1: M5 not applied (info column)');
select is((select g1_blocking_organizations from g1_verify), 0, 'PRE-G1: no G-1 blocking organization (same condition as G1001)');

-- ---------------------------------------------------------------------
-- G-1 적용
-- ---------------------------------------------------------------------
\ir ../M3_entitlement_write_gates.sql

select is((select verdict || ' ' || missing::text from g1_verify), 'G-1 ACTIVE — VERIFIED {}',
  'POST-G1: g1_post_verify = G-1 ACTIVE — VERIFIED (nothing missing)');
select is((select verdict from g2_verify), 'G-2 ACTIVE — VERIFIED', 'POST-G1: G-2 still verified (no G-2 regression)');
select is((select g1_gate_triggers_enabled and g1_gate_functions_present and g1_functions_not_client_executable
                  and g1_media_upload_judgement_active and evidence_gate_triggers_enabled from g1_verify), true,
  'POST-G1: 6 gate triggers · 8 functions · no client EXECUTE · G-1 media judgement · evidence gates');

-- Staging 과 같은 STARTER 유효 계약 반: 교사 기록 쓰기가 계속된다 (G-1 이 정상 경로를 막지 않음)
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000e0001');
select lives_ok(
  $$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000e0001',
       '[{"child_id":"40000000-0000-0000-0000-0000000e0001","attendance_status":"present"}]'::jsonb) $$,
  'POST-G1: entitled STARTER class attendance still works (teacher)');
select is(private.class_write_allowed('30000000-0000-0000-0000-0000000e0001', 'weekly_report'), true,
  'POST-G1: entitled STARTER class keeps weekly_report write authority');
-- 계약 범위 밖 반(운영 중이지만 contract_classes 에 없음): 담당 교사라도 EN003 (entitlement 우회 없음)
select pg_temp.act_as('00000000-0000-0000-0000-0000000e0002');
select throws_ok(
  $$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000e0002',
       '[{"child_id":"40000000-0000-0000-0000-0000000e0002","attendance_status":"present"}]'::jsonb) $$,
  'EN003', null, 'POST-G1: class outside the contract scope is denied (EN003) even for its assigned teacher');
reset role;

-- 켜져 있지 않은 gate 는 확인 SQL 이 잡아야 한다
alter table public.class_session_attendance disable trigger trg_attendance_entitlement_gate;
select is((select 'g1_gate_triggers_enabled' = any (missing) and verdict like 'G-1 NOT VERIFIED%' from g1_verify), true,
  'VERIFY: a disabled G-1 gate trigger is flagged');
alter table public.class_session_attendance enable trigger trg_attendance_entitlement_gate;
select is((select verdict from g1_verify), 'G-1 ACTIVE — VERIFIED', 'VERIFY: re-enabled trigger → VERIFIED again');

-- ---------------------------------------------------------------------
-- G-1 rollback → G-2 는 그대로
-- ---------------------------------------------------------------------
\ir ../M3_entitlement_write_gates_rollback.sql

select is((select verdict like 'G-1 NOT VERIFIED%' from g1_verify), true, 'G-1 ROLLBACK: g1_post_verify = NOT VERIFIED');
select is((select 'g1_applied_audit_latest' = any (missing) and 'g1_gate_triggers_enabled' = any (missing)
                  and 'g1_media_upload_judgement_active' = any (missing) from g1_verify), true,
  'G-1 ROLLBACK: gates · media judgement · latest audit flagged');
select is((select verdict from g2_verify), 'G-2 ACTIVE — VERIFIED', 'G-1 ROLLBACK: G-2 stays ACTIVE — VERIFIED (rollback does not undo G-2)');
select is((select not exists (select 1 from unnest(missing) m where m like 'g2\_%') from g1_verify), true,
  'G-1 ROLLBACK: no G-2 item missing');
select is((select evidence_gate_triggers_enabled from g1_verify), true,
  'G-1 ROLLBACK: normal-migration evidence gates remain (not G-1 objects)');
select is((select count(*) from public.audit_events where event_type = 'cutover.m3_entitlement_gates_rolled_back')::int, 1,
  'G-1 ROLLBACK: rollback is audited');

-- ---------------------------------------------------------------------
-- G-1 재적용
-- ---------------------------------------------------------------------
\ir ../M3_entitlement_write_gates.sql

select is((select verdict from g1_verify), 'G-1 ACTIVE — VERIFIED', 'G-1 RE-APPLY: VERIFIED again');
select is((select count(*) from public.audit_events where event_type = 'cutover.m3_entitlement_gates_applied')::int, 2,
  'G-1 RE-APPLY: each application is audited');

-- ---------------------------------------------------------------------
-- G-2 회귀 감지 (G-2 rollback 은 이 test transaction 안에서만)
-- ---------------------------------------------------------------------
\ir ../M3_hq_role_split_rollback.sql

select is((select verdict like 'G-1 NOT VERIFIED%' from g1_verify), true, 'G-2 REGRESSION: g1_post_verify = NOT VERIFIED');
select is((select 'g2_is_soyes_admin_admin_only' = any (missing) and 'g2_release_gate_triggers_enabled' = any (missing)
                  and 'g2_member_direct_write_closed' = any (missing) and 'g2_applied_audit_latest' = any (missing) from g1_verify), true,
  'G-2 REGRESSION: all four G-2 items flagged');
select is((select g1_gate_triggers_enabled from g1_verify), true, 'G-2 REGRESSION: G-1 gates themselves untouched by the G-2 rollback');

select * from finish();
rollback;
