-- =====================================================================
-- PHASE 07 · M0 — P0 security / decision regression baseline (pgTAP)
-- ---------------------------------------------------------------------
-- 실행: npx supabase test db   (local Supabase + Docker 필요)
-- 이 파일은 transaction 안에서 실행되고 끝나면 rollback 된다.
--
-- 대상 (rls-security-architecture.md §7 · PHASE 07 §115 · §117):
--   Sales ≠ Admin · HQ 민감 SELECT 없음 · Director AI 초안 없음 ·
--   Teacher 다른 반 · Director 다른 기관 · Quick Memo author only ·
--   BEFORE 없이 시작 불가 · scheduled→completed 불가 · Director 일반 완료 불가 ·
--   Recovery 사유 필수 · Growth5 stage 필수 · 사진 4장 불가 ·
--   근거 없는 리포트 완료 불가 · anon 테이블 접근 불가 · portal 무효 · 숨김 ·
--   STARTER 대시보드 없음 · audit 원장 비노출 · 동시 effective 계약 불가
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

-- ---------------------------------------------------------------------
-- Fixtures (trigger 우회: replica 모드로 사실 행만 적재)
-- ---------------------------------------------------------------------
set local session_replication_role = replica;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'hq-admin@test.local'),
  ('00000000-0000-0000-0000-00000000a002', 'hq-sales@test.local'),
  ('00000000-0000-0000-0000-00000000b001', 'director-a@test.local'),
  ('00000000-0000-0000-0000-00000000b002', 'teacher-a1@test.local'),
  ('00000000-0000-0000-0000-00000000b003', 'teacher-a2@test.local'),
  ('00000000-0000-0000-0000-00000000c001', 'director-b@test.local');

insert into public.profiles (user_id, display_name) values
  ('00000000-0000-0000-0000-00000000a001', 'HQ Admin'),
  ('00000000-0000-0000-0000-00000000a002', 'HQ Sales'),
  ('00000000-0000-0000-0000-00000000b001', 'Director A'),
  ('00000000-0000-0000-0000-00000000b002', 'Teacher A1'),
  ('00000000-0000-0000-0000-00000000b003', 'Teacher A2'),
  ('00000000-0000-0000-0000-00000000c001', 'Director B')
on conflict (user_id) do nothing;

insert into private.admin_users (user_id, role) values
  ('00000000-0000-0000-0000-00000000a001', 'admin'),
  ('00000000-0000-0000-0000-00000000a002', 'sales');

insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'Org A', 'active'),
  ('10000000-0000-0000-0000-00000000000b', 'Org B', 'active');

insert into public.organization_members (id, organization_id, user_id, role, status) values
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b001', 'director', 'active'),
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b002', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b003', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000c001', 'director', 'active');

insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '햇님반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '달님반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '별님반', 2026, 'active');

-- Teacher A1 = 햇님반 · Teacher A2 = 달님반 (+ 햇님반 공동 담당: Quick Memo 테스트)
insert into public.class_teachers (organization_id, class_id, organization_member_id) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-0000000000a3'),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a3');

insert into public.children (id, organization_id, class_id, name, status) values
  ('40000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '아이A1', 'active'),
  ('40000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a2', '아이A2', 'active'),
  ('40000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '아이B1', 'active');

insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('50000000-0000-0000-0000-000000000001', 'TEST-P', 'Test Program', 8, 'published');

-- 51…02 (2주 수업): 두 번째 scheduled 세션(a2)용. class_sessions_open_assignment_lesson_key 는
-- 같은 배정 × 차시에 열린(scheduled · in_progress) 세션을 하나만 허용하므로 별도 차시가 필요하다.
insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status) values
  ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1, 1, '1주 수업', 'published'),
  ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 2, 1, '2주 수업', 'published');

insert into public.lesson_sections (lesson_id, section_code, body) values
  ('51000000-0000-0000-0000-000000000001', 's13', '가정에서 오늘 만든 색을 함께 찾아보세요.');

-- STARTER published version · 계약 (org A · 햇님반/달님반) / STANDARD 계약 (org B)
update public.product_versions pv
set lifecycle = 'published', published_at = now()
from public.products p
where p.id = pv.product_id and p.code in ('starter', 'standard');

insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
select '60000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', pv.id, 'active',
       current_date - 30, current_date + 60
from public.product_versions pv join public.products p on p.id = pv.product_id
where p.code = 'starter';

insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
select '60000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', pv.id, 'active',
       current_date - 30, current_date + 60
from public.product_versions pv join public.products p on p.id = pv.product_id
where p.code = 'standard';

insert into public.contract_classes (organization_id, contract_id, class_id) values
  ('10000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-00000000000b', '60000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1');

insert into public.class_program_assignments (id, organization_id, class_id, program_id, status) values
  ('70000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', 'active'),
  ('70000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-000000000001', 'active');

insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status, week_no) values
  ('80000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', current_date, 'scheduled', 1),
  ('80000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', current_date + 7, 'scheduled', 2),
  ('80000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '70000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', current_date, 'completed', 1);

insert into public.class_session_observations (id, organization_id, class_session_id, class_id, child_id, teacher_note, record_status, taxonomy) values
  ('90000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '80000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b1', '관찰 B', 'complete', 'growth5');

insert into public.class_session_observation_ai_drafts (
  organization_id, class_session_id, class_id, child_id, observation_id,
  source_observation_updated_at, generated_text, provider, model, prompt_version
)
select o.organization_id, o.class_session_id, o.class_id, o.child_id, o.id,
       o.updated_at, '정리 초안', 'test', 'test-model', 'test.v1'
from public.class_session_observations o
where o.id = '90000000-0000-0000-0000-0000000000b1';

set local session_replication_role = origin;


-- helper: JWT 사용자 전환
create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;


-- ---------------------------------------------------------------------
-- 1. HQ Sales ≠ Admin (DEC-079)
-- ---------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a002');

-- PRE-G2: G-2 cutover(supabase/cutover/M3_hq_role_split_sensitive_access.sql) 전에는 legacy Sales-via-admin
-- 조회가 남아 있어야 현재 앱이 깨지지 않는다. 차단 검증(N-3 · N-4 · N-13)은 G2_post_cutover.test.sql 로 옮겼다.
select is((select count(*) from public.children)::int, 3, 'PRE-G2: legacy Sales-via-admin children read is not revoked before G-2');
select is((select count(*) from public.class_session_observations)::int, 1, 'PRE-G2: legacy Sales-via-admin observation read is not revoked before G-2');
select is((select count(*) from public.reports)::int, 0, 'N-3: Sales cannot read reports');
select is((select private.is_soyes_admin()), true, 'PRE-G2: legacy is_soyes_admin still includes sales until G-2');
select lives_ok($$ select * from public.hq_sales_organization_summary() $$, 'Sales can read commercial summary');

-- ---------------------------------------------------------------------
-- 2. HQ Admin: 민감 본문 blanket SELECT 없음 · 지원 열람은 사유 필수 (DEC-093)
-- ---------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');

select is((select count(*) from public.class_session_observations)::int, 1, 'PRE-G2: HQ Admin legacy observation read is not revoked before G-2');
select is((select count(*) from public.children)::int, 3, 'HQ Admin keeps operational child metadata');
select throws_ok(
  $$ select public.hq_support_open_observation('90000000-0000-0000-0000-0000000000b1', '') $$,
  'HS001', null, 'Support access requires reason');
select lives_ok(
  $$ select public.hq_support_open_observation('90000000-0000-0000-0000-0000000000b1', '학부모 문의 확인') $$,
  'Support access with reason');
select is(
  (select count(*) from public.audit_events where event_type = 'support.observation_opened')::int, 1,
  'Support access is audited');

-- ---------------------------------------------------------------------
-- 3. Director 경계
-- ---------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000c001');
select is((select count(*) from public.class_session_observation_ai_drafts)::int, 1, 'PRE-G2: legacy director AI draft policy unchanged before G-2 (UI already hides it)');
select is((select count(*) from public.audit_events)::int, 0, 'N-24: Director cannot read audit_events');

select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*) from public.children where organization_id = '10000000-0000-0000-0000-00000000000b')::int, 0,
  'N-1: Director A cannot read Org B children');
select is((select private.org_has_feature('10000000-0000-0000-0000-00000000000a', 'director_dashboard')), false,
  'STARTER has no director_dashboard');

-- ---------------------------------------------------------------------
-- 4. 세션 전환 (DEC-046 · DEC-047 · DEC-085)
-- ---------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');

select throws_ok($$ select public.start_class_session('80000000-0000-0000-0000-0000000000a1') $$,
  'SS004', null, 'N-6: start requires BEFORE confirmation');
select throws_ok($$ select public.finish_class_session('80000000-0000-0000-0000-0000000000a1') $$,
  'SS003', null, 'N-7: scheduled -> completed via finish is impossible');
select lives_ok($$ select public.confirm_session_before('80000000-0000-0000-0000-0000000000a1', true, true) $$,
  'Teacher records BEFORE confirmation');
select lives_ok($$ select public.start_class_session('80000000-0000-0000-0000-0000000000a1') $$,
  'Teacher starts after BEFORE');

select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select throws_ok($$ select public.finish_class_session('80000000-0000-0000-0000-0000000000a1') $$,
  'SS002', null, 'N-9: Director has no normal finish');
select throws_ok($$ select public.recover_complete_class_session('80000000-0000-0000-0000-0000000000a1', '  ') $$,
  'SS006', null, 'N-8: Recovery requires reason');
select throws_ok($$ select public.recover_complete_class_session('80000000-0000-0000-0000-0000000000a2', '교사 부재') $$,
  'SS003', null, 'Recovery cannot complete a scheduled session');
select lives_ok($$ select public.recover_complete_class_session('80000000-0000-0000-0000-0000000000a1', '교사 기기 문제로 종료 불가') $$,
  'Director recovery with reason');

-- ---------------------------------------------------------------------
-- 5. Quick Memo author only (DEC-087)
-- ---------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select lives_ok($$ select public.save_quick_memo('80000000-0000-0000-0000-0000000000a1', '재료 부족', null) $$,
  'Teacher A1 saves quick memo');

select pg_temp.act_as('00000000-0000-0000-0000-00000000b003');
select is((select count(*) from public.quick_memos)::int, 0, 'N-12: co-teacher cannot read another teacher memo');

select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*) from public.quick_memos)::int, 0, 'N-12: Director cannot read quick memo');

-- ---------------------------------------------------------------------
-- 6. Observation · Growth5 · Teacher 다른 반 (DEC-086)
-- ---------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select throws_ok(
  $$ select public.save_class_observation('80000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
       '색을 섞어 보았다', null, 'complete', '[{"metric_code":"creative_attempt"}]'::jsonb, null) $$,
  'GM005', null, 'Growth5 metric without stage is rejected');
select lives_ok(
  $$ select public.save_class_observation('80000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
       '색을 섞어 보았다', null, 'complete', '[{"metric_code":"creative_attempt","stage":"independent"}]'::jsonb, null) $$,
  'Teacher saves Growth5 observation');
select is(
  (select count(*) from public.class_session_observations where class_id = '30000000-0000-0000-0000-0000000000a2')::int, 0,
  'N-2: Teacher A1 cannot see other class observations');

-- ---------------------------------------------------------------------
-- 7. anon (Parent) — 테이블 직접 접근 없음 · 무효 portal
-- ---------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.reports $$, '42501', null, 'N-17: anon cannot select reports');
select is(public.read_child_portal(gen_random_uuid(), repeat('a', 43)), null::jsonb, 'N-18: invalid portal returns null');

reset role;

select * from finish();
rollback;
