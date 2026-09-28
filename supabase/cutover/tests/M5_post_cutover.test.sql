-- =====================================================================
-- PHASE 08 · POST-M5 — legacy 쓰기 회수 cutover (pgTAP · local 전용)
-- ---------------------------------------------------------------------
-- 실행: node supabase/cutover/tests/run-local.mjs M5_post_cutover.test.sql  (local DB 컨테이너 전용)
-- transaction 안에서 runbook 순서대로 G-2 → G-1 → M5 를 적용(\ir)한 뒤 검증하고,
-- M5 rollback → 재적용까지 확인한 다음 전부 rollback 한다. 일반 db reset 상태는 바뀌지 않는다.
-- M5001 (확인 변수 없음) · M5002 (선행 cutover 없음) 는 파일 전체를 중단시키므로 이 transaction 안에서
-- 검증하지 않는다 → docs/08-security-hardening/test-matrix.md 의 guard 실행 기록 참조.
--
-- Fixture (가상): Org A = STARTER 유효 계약 (반 a1) · 교사 T · 원장 D · HQ Admin
--   legacy 형식 관찰 · 관찰영역 연결 · legacy 관찰 AI 초안 · legacy 리포트(작성 중 · 완료) · 공유 링크
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(46);

set local session_replication_role = replica;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'hq-admin@test.local'),
  ('00000000-0000-0000-0000-00000000b001', 'director-a@test.local'),
  ('00000000-0000-0000-0000-00000000b002', 'teacher-a@test.local');

insert into public.profiles (user_id, display_name) values
  ('00000000-0000-0000-0000-00000000a001', 'HQ Admin'),
  ('00000000-0000-0000-0000-00000000b001', 'Director A'),
  ('00000000-0000-0000-0000-00000000b002', 'Teacher A')
on conflict (user_id) do nothing;

insert into private.admin_users (user_id, role) values
  ('00000000-0000-0000-0000-00000000a001', 'admin');

insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'Org A', 'active');

insert into public.organization_members (id, organization_id, user_id, role, status) values
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b001', 'director', 'active'),
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b002', 'teacher', 'active');

insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '햇님반', 2026, 'active');

insert into public.class_teachers (organization_id, class_id, organization_member_id) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2');

insert into public.children (id, organization_id, class_id, name, status) values
  ('40000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '가상아이A1', 'active'),
  ('40000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '가상아이A2', 'active');

insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('50000000-0000-0000-0000-000000000001', 'M5-TEST', 'Test Program', 8, 'published');

insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status)
select ('51000000-0000-0000-0000-00000000000' || w)::uuid, '50000000-0000-0000-0000-000000000001', w, 1, w || '주 수업', 'published'
from generate_series(1, 2) as w;

insert into public.lesson_sections (lesson_id, section_code, body)
select ('51000000-0000-0000-0000-00000000000' || w)::uuid, s.code, '가상 ' || s.code
from generate_series(1, 2) as w
cross join unnest(private.required_lesson_sections()) as s(code);

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

insert into public.class_program_assignments (id, organization_id, class_id, program_id, status, origin_contract_id) values
  ('70000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1',
   '50000000-0000-0000-0000-000000000001', 'active', '60000000-0000-0000-0000-00000000000a');

-- s1 1주 진행 중 · s2 2주 예정
insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status, week_no) values
  ('80000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1',
   '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today(), 'in_progress', 1),
  ('80000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1',
   '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', private.local_today() + 7, 'scheduled', 2);

-- legacy 형식 관찰 (A1) · 관찰영역 연결 · legacy 관찰 AI 초안
insert into public.class_session_observations (id, organization_id, class_session_id, class_id, child_id, teacher_note, record_status) values
  ('90000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1',
   '40000000-0000-0000-0000-0000000000a1', 'legacy 관찰', 'complete');
insert into public.class_session_observation_domains (observation_id, domain_code)
select '90000000-0000-0000-0000-0000000000a1', d.code from public.observation_domains d order by d.sort_order limit 1;
insert into public.class_session_observation_ai_drafts (
  organization_id, class_session_id, class_id, child_id, observation_id,
  source_observation_updated_at, generated_text, provider, model, prompt_version)
select o.organization_id, o.class_session_id, o.class_id, o.child_id, o.id, o.updated_at, '정리 초안', 'test', 'test-model', 'test.v1'
from public.class_session_observations o where o.id = '90000000-0000-0000-0000-0000000000a1';

-- legacy 리포트: 작성 중(r1) · 완료(r2) + 공유 링크 (token 43자 가상 값)
insert into public.child_growth_reports (id, organization_id, class_id, child_id, period_start, period_end, title, status) values
  ('95000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
   private.local_today() - 30, private.local_today(), '작성 중 legacy 리포트', 'draft');
insert into public.child_growth_reports (id, organization_id, class_id, child_id, period_start, period_end, title, status,
                                         growth_changes, observation_summary, next_support, completed_at, completed_by) values
  ('95000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
   private.local_today() - 60, private.local_today() - 31, '완료 legacy 리포트', 'complete', '변화', '요약', '지원', now(), '00000000-0000-0000-0000-00000000b002');
insert into public.child_growth_report_shares (id, organization_id, report_id, token_hash, expires_at) values
  ('96000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '95000000-0000-0000-0000-0000000000a2',
   encode(sha256(convert_to(repeat('Ab3_', 10) || 'xyz', 'UTF8')), 'hex'), now() + interval '10 days');

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

create or replace function pg_temp.share_rows() returns int language plpgsql as $$
declare
  v int;
begin
  execute 'set local role anon';
  select count(*) into v from public.read_shared_growth_report('96000000-0000-0000-0000-0000000000a2', repeat('Ab3_', 10) || 'xyz');
  execute 'reset role';
  return v;
end;
$$;

-- 회수 대상 권한 한 줄 요약 (true = 아직 열려 있음)
create or replace function pg_temp.legacy_write_open() returns boolean language sql as $$
  select has_column_privilege('authenticated', 'public.class_sessions', 'status', 'UPDATE')
      or has_any_column_privilege('authenticated', 'public.child_growth_reports', 'INSERT')
      or has_any_column_privilege('authenticated', 'public.child_growth_reports', 'UPDATE')
      or has_any_column_privilege('authenticated', 'public.child_growth_report_sources', 'INSERT')
      or has_table_privilege('authenticated', 'public.child_growth_report_sources', 'DELETE')
      or has_any_column_privilege('authenticated', 'public.child_growth_report_ai_drafts', 'INSERT')
      or has_any_column_privilege('authenticated', 'public.child_growth_report_ai_drafts', 'UPDATE')
      or has_any_column_privilege('authenticated', 'public.child_growth_report_shares', 'INSERT')
      or has_any_column_privilege('authenticated', 'public.class_session_observation_domains', 'INSERT')
      or has_table_privilege('authenticated', 'public.class_session_observation_domains', 'DELETE')
      or has_any_column_privilege('authenticated', 'public.class_session_observation_ai_drafts', 'INSERT')
      or has_any_column_privilege('authenticated', 'public.class_session_observation_ai_drafts', 'UPDATE')
      or has_function_privilege('authenticated', 'public.save_class_session_observation_atomic(uuid, uuid, text, text, text, text[], timestamptz)', 'EXECUTE')
      or has_function_privilege('authenticated', 'public.create_or_refresh_child_growth_report(uuid, uuid, date, date, text)', 'EXECUTE')
      or has_function_privilege('authenticated', 'public.save_child_growth_report_atomic(uuid, text, text, text, text, text, timestamptz)', 'EXECUTE')
      or has_function_privilege('authenticated', 'public.save_child_growth_report_ai_draft(uuid, text, text, text, text, text, text)', 'EXECUTE')
      or has_function_privilege('authenticated', 'public.apply_child_growth_report_ai_draft(uuid, timestamptz)', 'EXECUTE')
      or has_function_privilege('authenticated', 'public.create_child_growth_report_share(uuid, text)', 'EXECUTE')
      or has_function_privilege('authenticated', 'public.save_observation_ai_generated_atomic(uuid, text, text, text, text)', 'EXECUTE')
      or has_function_privilege('authenticated', 'public.save_observation_ai_review_atomic(uuid, text, timestamptz)', 'EXECUTE');
$$;


-- ---------------------------------------------------------------------
-- 0. 선행 cutover: G-2 → G-1 (runbook 순서)
-- ---------------------------------------------------------------------
select ok(pg_temp.legacy_write_open(), 'PRE-M5: legacy write paths are open before M5');

\set g2_app_preflight passed
\ir ../M3_hq_role_split_sensitive_access.sql
\ir ../M3_entitlement_write_gates.sql

select is((select count(*) from public.audit_events
           where event_type in ('cutover.g2_hq_role_split_applied', 'cutover.m3_entitlement_gates_applied'))::int, 2,
  'PRE-M5: G-2 and G-1 applied first');


-- ---------------------------------------------------------------------
-- 1. M5 적용 (운영자 확인 변수 포함)
-- ---------------------------------------------------------------------
\set m5_preflight passed
\ir ../M5_legacy_write_revoke.sql

select is((select count(*) from public.audit_events where event_type = 'cutover.m5_legacy_writes_revoked')::int, 1,
  'M5: application is audited');
select ok(not pg_temp.legacy_write_open(), 'M5: every legacy write grant / RPC in the inventory is revoked');

-- 권한 (정밀)
select is(has_column_privilege('authenticated', 'public.class_sessions', 'status', 'UPDATE'), false, 'M5-A: session status direct UPDATE revoked');
select is(has_column_privilege('authenticated', 'public.class_sessions', 'scheduled_date', 'UPDATE'), true, 'M5-A: scheduled_date UPDATE kept');
select is(has_any_column_privilege('authenticated', 'public.child_growth_reports', 'UPDATE'), false, 'M5-B: legacy report UPDATE revoked');
select is(has_any_column_privilege('authenticated', 'public.child_growth_report_shares', 'INSERT'), false, 'M5-C: legacy share INSERT revoked');
select is(has_column_privilege('authenticated', 'public.child_growth_report_shares', 'revoked_at', 'UPDATE'), true, 'M5-C: legacy share revocation kept (DEC-041)');
select is(has_function_privilege('authenticated', 'public.revoke_child_growth_report_share(uuid)', 'EXECUTE'), true, 'M5-C: legacy share revoke RPC kept');
select is(has_table_privilege('authenticated', 'public.class_session_observation_domains', 'DELETE'), false, 'M5-D: legacy domain link DELETE revoked');
select is(has_any_column_privilege('authenticated', 'public.class_session_observations', 'INSERT'), true, 'M5-E: observation INSERT grant kept for SaaS 2.0');
select is(has_function_privilege('authenticated', 'public.save_class_session_attendance_atomic(uuid, jsonb)', 'EXECUTE'), true, 'M5: shared attendance RPC kept (SaaS 2.0 Class Mode)');
select is(has_function_privilege('anon', 'public.read_shared_growth_report(uuid, text)', 'EXECUTE'), true, 'M5: legacy share read kept for anon');
select is(has_table_privilege('authenticated', 'public.child_growth_reports', 'SELECT'), true, 'M5: legacy report SELECT kept');


-- 동작 (교사)
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');

select throws_ok($$ update public.class_sessions set status = 'completed' where id = '80000000-0000-0000-0000-0000000000a2' $$,
  '42501', null, 'M5-A: legacy direct scheduled -> completed denied');
select throws_ok($$ update public.class_sessions set status = 'in_progress' where id = '80000000-0000-0000-0000-0000000000a2' $$,
  '42501', null, 'M5-A: legacy direct start denied');
select is(pg_temp.try_sql($f$update public.class_sessions set scheduled_date = private.local_today() + 8 where id = '80000000-0000-0000-0000-0000000000a2'$f$),
  'rows=1', 'M5-A: reschedule (scheduled_date) still works');
select throws_ok(
  $$ select public.save_class_session_observation_atomic('80000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a2',
       null, '관찰', 'complete', '{}'::text[], null) $$,
  '42501', null, 'M5-D: legacy observation RPC denied');
select throws_ok(
  $$ insert into public.class_session_observations (organization_id, class_session_id, class_id, child_id, teacher_note, record_status)
     values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1',
             '40000000-0000-0000-0000-0000000000a2', '직접 legacy 관찰', 'complete') $$,
  'OB008', null, 'M5-E: direct legacy-format observation INSERT denied');
select throws_ok(
  $$ update public.class_session_observations set teacher_note = '고침' where id = '90000000-0000-0000-0000-0000000000a1' $$,
  'OB008', null, 'M5-E: legacy-format observation edit denied');
select throws_ok(
  $$ delete from public.class_session_observation_domains where observation_id = '90000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'M5-D: legacy domain link delete denied');
select throws_ok(
  $$ select public.save_observation_ai_generated_atomic('90000000-0000-0000-0000-0000000000a1', '새 초안', 'test', 'm', 'v1') $$,
  '42501', null, 'M5-F: legacy observation AI save RPC denied');
select throws_ok(
  $$ select public.save_observation_ai_review_atomic('90000000-0000-0000-0000-0000000000a1', '검토', now()) $$,
  '42501', null, 'M5-F: legacy observation AI review RPC denied');
select throws_ok(
  $$ select public.create_or_refresh_child_growth_report('30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
       private.local_today() - 7, private.local_today(), '새 legacy 리포트') $$,
  '42501', null, 'M5-B: legacy report creation RPC denied');
select throws_ok(
  $$ update public.child_growth_reports set title = '고침' where id = '95000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'M5-B: legacy draft report direct edit denied');
select throws_ok(
  $$ insert into public.child_growth_reports (organization_id, class_id, child_id, period_start, period_end, title)
     values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
             private.local_today() - 7, private.local_today(), '직접 리포트') $$,
  '42501', null, 'M5-B: legacy report direct INSERT denied');

-- SaaS 2.0 경로는 그대로
select lives_ok(
  $$ select public.save_class_observation('80000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a2',
       '색을 섞어 보았다', null, 'complete', '[{"metric_code":"creative_attempt","stage":"independent"}]'::jsonb, null) $$,
  'M5: SaaS 2.0 Growth5 observation still works');
select lives_ok(
  $$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000a1',
       '[{"child_id":"40000000-0000-0000-0000-0000000000a2","attendance_status":"present"}]'::jsonb) $$,
  'M5: attendance still works (G-1 entitled)');
select lives_ok($$ select public.finish_class_session('80000000-0000-0000-0000-0000000000a1') $$,
  'M5: SaaS 2.0 finish RPC still works');
select lives_ok($$ select public.confirm_session_before('80000000-0000-0000-0000-0000000000a2', true, true) $$,
  'M5: BEFORE confirmation still works');
select lives_ok($$ select public.start_class_session('80000000-0000-0000-0000-0000000000a2') $$,
  'M5: SaaS 2.0 start RPC still works (transition path is not the revoked direct UPDATE)');

-- legacy historical read 유지
select is((select count(*) from public.child_growth_reports)::int, 2, 'M5: teacher still reads legacy reports');
select is((select count(*) from public.class_session_observation_ai_drafts)::int, 1, 'M5: teacher still reads legacy AI drafts');
reset role;
select is(pg_temp.share_rows(), 1, 'M5: existing legacy share link still readable (DEC-041)');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select throws_ok($$ select public.create_child_growth_report_share('95000000-0000-0000-0000-0000000000a2', repeat('0', 64)) $$,
  '42501', null, 'M5-C: new legacy share issuance stopped');
select lives_ok($$ select public.revoke_child_growth_report_share('96000000-0000-0000-0000-0000000000a2') $$,
  'M5-C: director can still stop an existing legacy share');
reset role;
select is(pg_temp.share_rows(), 0, 'M5-C: stopped share is no longer readable');


-- ---------------------------------------------------------------------
-- 2. 되돌리기 → 재적용
-- ---------------------------------------------------------------------
\ir ../M5_legacy_write_rollback.sql

select ok(pg_temp.legacy_write_open(), 'ROLLBACK: legacy write paths restored');
select is(has_column_privilege('authenticated', 'public.class_sessions', 'status', 'UPDATE'), true, 'ROLLBACK: session status UPDATE restored');
select is((select count(*) from pg_catalog.pg_trigger where tgname = 'trg_observations_legacy_write_closed')::int, 0,
  'ROLLBACK: legacy observation closure trigger removed');
select is((select count(*) from public.audit_events where event_type = 'cutover.m5_legacy_writes_restored')::int, 1,
  'ROLLBACK: rollback is audited');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select is(pg_temp.try_sql($f$update public.child_growth_reports set title = '되돌린 뒤 고침' where id = '95000000-0000-0000-0000-0000000000a1'$f$),
  'rows=1', 'ROLLBACK: legacy draft report editable again');
reset role;

\ir ../M5_legacy_write_revoke.sql

select ok(not pg_temp.legacy_write_open(), 'RE-APPLY: legacy write paths revoked again (idempotent)');
select is((select count(*) from pg_catalog.pg_trigger where tgname = 'trg_observations_legacy_write_closed')::int, 1,
  'RE-APPLY: exactly one closure trigger');
select is((select count(*) from public.audit_events where event_type = 'cutover.m5_legacy_writes_revoked')::int, 2,
  'RE-APPLY: each application is audited');

select * from finish();
rollback;
