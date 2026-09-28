-- =====================================================================
-- PRODUCTION-SHAPED LOCAL VALIDATION (pgTAP · LOCAL ONLY · rollback)
-- ---------------------------------------------------------------------
-- 전제: 01_legacy_seed.sql 을 PHASE 07 이전 스키마에 적재한 뒤 `migration up --local` 완료.
-- 실행: node supabase/cutover/tests/run-local.mjs supabase/validation/production_shaped/03_validation.test.sql
-- 전체가 한 transaction 이고 rollback 된다 (cutover · 계약 · 발행 모두 되돌려짐).
--
-- 단계
--   1. M2 backfill · reference seed — 사실 보존 · 창작 없음
--   2. PRE-CUTOVER — legacy 쓰기 유지 · 미등록 기관 탐지 · 새 경로는 entitlement 필요
--   3. 실제 HQ 경로 mapping — 버전 발행 · 계약 초안 · 범위 · Readiness
--      → policy blocker(CO-12 · AR-8 · CO-8)로 활성화 불가가 "올바른 현재 결과"
--   4. [SIMULATION] 활성 계약 — replica 모드 fixture. blocker 해소 이후의 미래 상태를 가정해
--      cutover 동작만 검증한다. 운영 경로가 아니다 (readiness 우회를 제품 동작으로 쓰지 않음).
--   5. CUTOVER (실제 파일 \ir) · POST-CUTOVER enforcement · M4 on legacy data
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(83);

create or replace function pg_temp.u(p text) returns uuid language sql immutable as $$
  select md5('ps:' || p)::uuid;
$$;

create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

create or replace function pg_temp.pv(p_code text) returns uuid language sql as $$
  select pv.id from public.product_versions pv join public.products p on p.id = pv.product_id where p.code = p_code;
$$;

create or replace function pg_temp.cid(p_org text, p_product text) returns uuid language sql as $$
  select c.id from public.contracts c
  where c.organization_id = pg_temp.u(p_org) and c.product_version_id = pg_temp.pv(p_product);
$$;

create or replace function pg_temp.readiness_item(p_contract uuid, p_code text) returns jsonb language sql as $$
  select e from jsonb_array_elements(private.contract_readiness_internal(p_contract) -> 'items') e
  where e ->> 'code' = p_code;
$$;

create or replace function pg_temp.blocking_orgs() returns bigint language sql as $$
  select count(*) from public.organizations o
  where o.status = 'active'
    and exists (select 1 from public.classes cl where cl.organization_id = o.id and cl.status = 'active')
    and private.org_service_mode(o.id) <> 'active';
$$;

create or replace function pg_temp.try_sql(p_sql text) returns text language plpgsql as $$
declare v_rows integer;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return 'rows=' || v_rows;
exception when others then
  return sqlstate;
end;
$$;


-- =====================================================================
-- 1. M2 backfill · reference seed
-- =====================================================================
select is((select count(*) from public.class_sessions where week_no is null)::int, 0,
  'M2: every existing session has week_no backfilled');
select is((select count(*) from public.class_sessions s join public.curriculum_lessons l on l.id = s.lesson_id
           where s.week_no is distinct from l.week_no)::int, 0,
  'M2: backfilled week_no equals the lesson week (fact copy, not invented)');
select is(pg_temp.try_sql($$ update public.class_sessions s set week_no = l.week_no from public.curriculum_lessons l
                             where l.id = s.lesson_id and s.week_no is null $$), 'rows=0',
  'M2: re-running the backfill statement changes nothing');
select is((select count(*) from public.class_session_observations where taxonomy <> 'legacy_domains')::int, 0,
  'M2: existing observations keep legacy taxonomy');
select is((select count(*) from public.observation_growth_selections)::int, 0,
  'M2: no Growth5 selections invented for legacy observations');
select is((select count(*) from public.class_session_observation_media where hidden_at is not null or storage_status <> 'stored')::int, 0,
  'M2: existing media stay visible with storage_status stored');
select is((select count(*) from public.class_program_assignments where origin_contract_id is not null)::int, 0,
  'M2: no contract provenance invented for existing assignments');
select is((select count(*) from public.contracts)::int, 0, 'M2: no contracts auto-created (DB-7)');
select is((select count(*) from public.reports)::int, 0, 'M2: legacy reports are not converted into the new report model');
select is((select count(*) from public.product_versions where lifecycle <> 'draft')::int, 0,
  'M2/G-3: all seeded product versions remain draft');
select ok((select bool_and(not is_released) from public.platform_capabilities)
          and (select 'CO-12' = any (blocked_by) from public.platform_capabilities where code = 'parent_portal')
          and (select 'AR-8' = any (blocked_by) from public.platform_capabilities where code = 'ai_assist')
          and (select 'CO-8' = any (blocked_by) from public.platform_capabilities where code = 'branding'),
  'M2: capabilities unreleased · parent_portal=CO-12 · ai_assist=AR-8 · branding=CO-8');


-- =====================================================================
-- 2. PRE-CUTOVER
-- =====================================================================
select is((select count(*) from pg_catalog.pg_trigger where tgname like '%entitlement_gate%')::int, 0,
  'PRE: no entitlement write gates after normal migrations');
select is(pg_temp.blocking_orgs()::int, 5,
  'PRE: G-1 preflight detects 5 operating organizations without an effective contract');
select is((select count(*) from public.organizations o where o.id = pg_temp.u('o4')
           and o.status = 'suspended')::int, 1,
  'PRE: suspended organization o4 is outside the G-1 blocking set');

select lives_ok(
  $$ insert into public.class_sessions (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
     values (pg_temp.u('o5'), pg_temp.u('o5c1'), pg_temp.u('a:o5c1'), pg_temp.u('p8'), pg_temp.u('p8:w8'), private.local_today() + 30, 'scheduled') $$,
  'PRE: HQ can still schedule a session for an unmapped organization (legacy path)');

set local role authenticated;
select pg_temp.act_as(pg_temp.u('o5:t1'));
select lives_ok(
  $$ select public.save_class_session_attendance_atomic(pg_temp.u('s:o5c1:w4'),
       jsonb_build_array(jsonb_build_object('child_id', pg_temp.u('o5c1:ch1'), 'attendance_status', 'present'))) $$,
  'PRE: legacy attendance RPC works for an unmapped organization');
select lives_ok(
  $$ select public.save_class_session_observation_atomic(pg_temp.u('s:o5c1:w4'), pg_temp.u('o5c1:ch1'),
       null, '가상 legacy 관찰', 'complete', array['color_expression'], null) $$,
  'PRE: legacy observation RPC works for an unmapped organization');
select throws_ok($$ select public.confirm_session_before(pg_temp.u('s:o5c1:w5'), true, true) $$,
  'SS005', null, 'PRE: new Class Mode path requires an entitled contract (SS005)');
select throws_ok(
  $$ select public.save_class_observation(pg_temp.u('s:o5c1:w4'), pg_temp.u('o5c1:ch2'), '새 관찰', null, 'complete', '[]'::jsonb, null) $$,
  'OB007', null, 'PRE: new observation path requires an entitled contract (OB007)');

select pg_temp.act_as(pg_temp.u('o2:dir'));
select lives_ok($$ select public.recover_complete_class_session(pg_temp.u('s:o2c2:w4'), '방치된 수업 정리') $$,
  'PRE: director can recover an abandoned in_progress session without a contract');
select pg_temp.act_as(pg_temp.u('o1:t1'));
select lives_ok($$ select public.finish_class_session(pg_temp.u('s:o1c1:w4')) $$,
  'PRE: teacher can finish an in_progress session without a contract');
select ok((select count(*) from public.class_session_observation_ai_drafts) > 0,
  'PRE: assigned teacher still reads own class legacy AI drafts');
select ok((select count(*) from public.child_growth_reports) > 0,
  'PRE: teacher still reads legacy growth reports');

-- legacy 화면 계열(Production 기본)의 수업 시작 = 직접 status UPDATE (M5 전 · 계약 무관)
select is(pg_temp.try_sql($f$update public.class_sessions set status = 'in_progress' where id = pg_temp.u('s:o1c1:w5')$f$),
  'rows=1', 'PRE: legacy route direct session start works without a contract (pre-M5)');

-- PRE-G2: 일반 migration 만으로는 HQ 권한이 줄지 않는다 (현재 앱 호환)
select pg_temp.act_as(pg_temp.u('o1:dir'));
select ok((select count(*) from public.class_session_observation_ai_drafts) > 0,
  'PRE-G2: legacy director AI draft policy unchanged before G-2');
select pg_temp.act_as(pg_temp.u('hq:sales'));
select ok((select count(*) from public.children) > 0, 'PRE-G2: legacy Sales-via-admin children read not revoked before G-2');
select ok((select count(*) from public.lead_submissions) = 3, 'PRE-G2: HQ Sales keeps lead access');
select pg_temp.act_as(pg_temp.u('hq:admin'));
select ok((select count(*) from public.class_session_observations) > 0, 'PRE-G2: HQ admin legacy observation read not revoked before G-2');
select lives_ok($$ select * from public.hq_completed_legacy_report_counts(null) $$,
  'PRE: HQ admin legacy report metadata RPC works');

reset role;
set local role anon;
select is((select count(*) from public.read_shared_growth_report(pg_temp.u('sh:o1:active'), rpad('psShareTokeno1active', 43, 'x')))::int, 1,
  'PRE: legacy parent share (active) still readable');
select is((select count(*) from public.read_shared_growth_report(pg_temp.u('sh:o2:expired'), rpad('psShareTokeno2expired', 43, 'x')))::int, 0,
  'PRE: legacy expired share stays unreadable');
select is((select count(*) from public.read_shared_growth_report(pg_temp.u('sh:o1:revoked'), rpad('psShareTokeno1revoked', 43, 'x')))::int, 0,
  'PRE: legacy revoked share stays unreadable');
reset role;


-- =====================================================================
-- 2-1. G-2 CUTOVER (HQ 역할 · 민감 접근) — G-1 과 별개
-- =====================================================================
\set g2_app_preflight passed
\ir ../../cutover/M3_hq_role_split_sensitive_access.sql

select is((select count(*) from pg_catalog.pg_trigger where tgname like '%entitlement_gate%')::int, 0,
  'G-2: HQ role cutover does not install G-1 gates');
set local role authenticated;
select pg_temp.act_as(pg_temp.u('o1:dir'));
select is((select count(*) from public.class_session_observation_ai_drafts)::int, 0,
  'G-2: director no longer reads observation AI drafts');
select pg_temp.act_as(pg_temp.u('o1:t1'));
select ok((select count(*) from public.class_session_observation_ai_drafts) > 0,
  'G-2: assigned teacher keeps own class AI drafts');
select pg_temp.act_as(pg_temp.u('hq:sales'));
select is((select count(*) from public.children)::int, 0, 'G-2: HQ Sales reads no children');
select is((select count(*) from public.class_session_observations)::int, 0, 'G-2: HQ Sales reads no observations');
select ok((select count(*) from public.lead_submissions) = 3, 'G-2: HQ Sales keeps lead access');
select pg_temp.act_as(pg_temp.u('hq:admin'));
select is((select count(*) from public.class_session_observations)::int, 0, 'G-2: HQ admin has no blanket observation SELECT');
select ok((select count(*) from public.children) > 0, 'G-2: HQ admin keeps operational child metadata');
reset role;


-- =====================================================================
-- 3. 실제 HQ 경로 mapping (transaction 안 · rollback)
-- =====================================================================
set local role authenticated;
select pg_temp.act_as(pg_temp.u('o1:dir'));
select throws_ok(
  $$ select public.publish_product_version(pg_temp.pv('premium'),
       (select updated_at from public.product_versions where id = pg_temp.pv('premium'))) $$,
  'CT008', null, 'G-3: director cannot publish a product version');

select pg_temp.act_as(pg_temp.u('hq:admin'));
select lives_ok(
  $$ select public.publish_product_version(pv.id, pv.updated_at)
     from public.product_versions pv join public.products p on p.id = pv.product_id
     where p.code in ('starter', 'standard', 'pilot', 'premium') $$,
  'G-3: HQ admin publishes versions (transaction-scoped)');
select throws_ok($$ update public.product_versions set week_to = 9 where id = pg_temp.pv('starter') $$,
  '23514', null, 'G-3: published version is immutable');

select lives_ok(
  $$ insert into public.contracts (organization_id, product_version_id, start_date, end_date) values
       (pg_temp.u('o1'), pg_temp.pv('starter'),  private.local_today() - 1, private.local_today() + 90),
       (pg_temp.u('o2'), pg_temp.pv('standard'), private.local_today() - 1, private.local_today() + 90),
       (pg_temp.u('o2'), pg_temp.pv('premium'),  private.local_today() + 100, private.local_today() + 200),
       (pg_temp.u('o3'), pg_temp.pv('pilot'),    private.local_today() - 1, private.local_today() + 60),
       (pg_temp.u('o6'), pg_temp.pv('starter'),  private.local_today() - 1, private.local_today() + 90) $$,
  'MAP: HQ admin creates draft contracts');
select lives_ok(
  $$ insert into public.contract_classes (organization_id, contract_id, class_id) values
       (pg_temp.u('o1'), pg_temp.cid('o1', 'starter'), pg_temp.u('o1c1')),
       (pg_temp.u('o1'), pg_temp.cid('o1', 'starter'), pg_temp.u('o1c2')),
       (pg_temp.u('o2'), pg_temp.cid('o2', 'standard'), pg_temp.u('o2c1')),
       (pg_temp.u('o2'), pg_temp.cid('o2', 'standard'), pg_temp.u('o2c2')),
       (pg_temp.u('o2'), pg_temp.cid('o2', 'premium'), pg_temp.u('o2c1')),
       (pg_temp.u('o3'), pg_temp.cid('o3', 'pilot'), pg_temp.u('o3c1')),
       (pg_temp.u('o3'), pg_temp.cid('o3', 'pilot'), pg_temp.u('o3c2')),
       (pg_temp.u('o6'), pg_temp.cid('o6', 'starter'), pg_temp.u('o6c1')) $$,
  'MAP: HQ admin maps class scope');
select throws_ok(
  $$ insert into public.contract_classes (organization_id, contract_id, class_id)
     values (pg_temp.u('o1'), pg_temp.cid('o1', 'starter'), pg_temp.u('o2c1')) $$,
  null::char(5), null::text, 'MAP: class of another organization cannot join a contract scope');

reset role;
select ok((pg_temp.readiness_item(pg_temp.cid('o1', 'starter'), 'feature:parent_portal') ->> 'reason') = 'policy_blocked',
  'READINESS: STARTER blocked by parent_portal (CO-12)');
select ok((pg_temp.readiness_item(pg_temp.cid('o1', 'starter'), 'content') ->> 'ok')::boolean = false,
  'READINESS: content not auto-marked ready (lesson sections missing)');
select ok((pg_temp.readiness_item(pg_temp.cid('o1', 'starter'), 'class_scope') ->> 'ok')::boolean,
  'READINESS: STARTER class scope satisfied');
select ok((pg_temp.readiness_item(pg_temp.cid('o2', 'standard'), 'feature:ai_assist') ->> 'reason') = 'policy_blocked',
  'READINESS: STANDARD blocked by ai_assist (AR-8)');
select ok((pg_temp.readiness_item(pg_temp.cid('o2', 'premium'), 'feature:branding') ->> 'reason') = 'policy_blocked',
  'READINESS: PREMIUM blocked by branding (CO-8)');
select ok((pg_temp.readiness_item(pg_temp.cid('o3', 'pilot'), 'pilot_capacity') ->> 'reason') = 'pilot_capacity_exceeded',
  'READINESS: Pilot class with 16 children fails pilot_capacity');

set local role authenticated;
select pg_temp.act_as(pg_temp.u('hq:admin'));
select lives_ok(
  $$ delete from public.contract_classes where contract_id = pg_temp.cid('o3', 'pilot') and class_id = pg_temp.u('o3c2') $$,
  'MAP: HQ removes the 16-child class from Pilot scope');
reset role;
select ok((pg_temp.readiness_item(pg_temp.cid('o3', 'pilot'), 'pilot_capacity') ->> 'ok')::boolean,
  'READINESS: Pilot class with exactly 15 children passes pilot_capacity');

set local role authenticated;
select pg_temp.act_as(pg_temp.u('hq:admin'));
select throws_ok(
  $$ select public.activate_contract(pg_temp.cid('o1', 'starter'),
       (select updated_at from public.contracts where id = pg_temp.cid('o1', 'starter'))) $$,
  'CT005', null, 'READINESS: activation refused while a promised feature is policy-blocked (correct current result)');
reset role;
select is((select count(*) from public.contracts where status = 'active')::int, 0,
  'MAP: no contract is active through the real path');
select is(pg_temp.blocking_orgs()::int, 5, 'MAP: draft contracts do not clear G-1 (still 5 blocking)');


-- =====================================================================
-- 4. [SIMULATION] 활성 계약 (replica fixture · blocker 해소 이후 가정 · 운영 경로 아님)
-- =====================================================================
set local session_replication_role = replica;
update public.contracts set status = 'active', activated_at = now()
where id in (pg_temp.cid('o1', 'starter'), pg_temp.cid('o2', 'standard'), pg_temp.cid('o3', 'pilot'), pg_temp.cid('o6', 'starter'));
set local session_replication_role = origin;

select is(pg_temp.blocking_orgs()::int, 1, 'SIM: only the unmapped organization o5 still blocks G-1');
-- 운영자 조치: 미등록 기관 o5 를 기존 모델의 비운영 상태로 전환 (새 bypass 필드 아님)
update public.organizations set status = 'suspended' where id = pg_temp.u('o5');
select is(pg_temp.blocking_orgs()::int, 0, 'SIM: G-1 preflight clean after mapping + marking o5 non-operating');


-- =====================================================================
-- 5. CUTOVER (실제 파일) · POST-CUTOVER
-- =====================================================================
\ir ../../cutover/M3_entitlement_write_gates.sql

select is((select count(*) from pg_catalog.pg_trigger where tgname like '%entitlement_gate%')::int, 4,
  'CUTOVER: gates installed on production-shaped data');

set local role authenticated;
select pg_temp.act_as(pg_temp.u('o1:t2'));
select lives_ok(
  $$ select public.save_class_session_attendance_atomic(pg_temp.u('s:o1c2:w4'),
       jsonb_build_array(jsonb_build_object('child_id', pg_temp.u('o1c2:ch1'), 'attendance_status', 'present'))) $$,
  'POST: entitled in-scope class keeps legacy attendance writes');
select pg_temp.act_as(pg_temp.u('o3:t2'));
select throws_ok(
  $$ select public.save_class_session_attendance_atomic(pg_temp.u('s:o3c2:w4'),
       jsonb_build_array(jsonb_build_object('child_id', pg_temp.u('o3c2:ch1'), 'attendance_status', 'present'))) $$,
  'EN003', null, 'POST: class outside contract scope becomes read-only');
select pg_temp.act_as(pg_temp.u('o4:t1'));
select throws_ok(
  $$ select public.save_class_session_attendance_atomic(pg_temp.u('s:o4c1:w4'),
       jsonb_build_array(jsonb_build_object('child_id', pg_temp.u('o4c1:ch1'), 'attendance_status', 'present'))) $$,
  'AT002', null, 'POST: suspended organization write denied (existing org-status access rule applies before the gate)');

reset role;
select throws_ok(
  $$ insert into public.class_program_assignments (organization_id, class_id, program_id, status)
     values (pg_temp.u('o3'), pg_temp.u('o3c2'), pg_temp.u('p24'), 'active') $$,
  'EN001', null, 'POST: out-of-scope class cannot get a new assignment');
select lives_ok(
  $$ insert into public.class_program_assignments (id, organization_id, class_id, program_id, status)
     values (pg_temp.u('a:o1c1:new24'), pg_temp.u('o1'), pg_temp.u('o1c1'), pg_temp.u('p24'), 'active') $$,
  'POST: in-scope class gets a new assignment');
select is((select origin_contract_id from public.class_program_assignments where id = pg_temp.u('a:o1c1:new24')),
  pg_temp.cid('o1', 'starter'), 'POST: new assignment records origin contract');
select throws_ok(
  $$ insert into public.class_sessions (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
     values (pg_temp.u('o1'), pg_temp.u('o1c1'), pg_temp.u('a:o1c1:new24'), pg_temp.u('p24'), pg_temp.u('p24:w9'), private.local_today() + 7, 'scheduled') $$,
  'EN002', null, 'POST: STARTER cannot schedule week 9');

set local role authenticated;
select pg_temp.act_as(pg_temp.u('hq:admin'));
select lives_ok(
  $$ select public.change_contract_status(pg_temp.cid('o6', 'starter'), 'suspended', '정지 시뮬레이션',
       (select updated_at from public.contracts where id = pg_temp.cid('o6', 'starter'))) $$,
  'POST: HQ admin suspends o6 contract with reason');
select pg_temp.act_as(pg_temp.u('o6:t1'));
select throws_ok(
  $$ select public.save_class_session_attendance_atomic(pg_temp.u('s:o6c1:w1'),
       jsonb_build_array(jsonb_build_object('child_id', pg_temp.u('o6c1:ch1'), 'attendance_status', 'late'))) $$,
  'EN003', null, 'POST: suspended contract makes attendance read-only');
select ok((select count(*) from public.class_session_attendance where class_id = pg_temp.u('o6c1')) > 0,
  'POST: suspended contract keeps existing attendance readable');

reset role;
select is(private.org_has_feature(pg_temp.u('o1'), 'director_dashboard'), false, 'POST: STARTER has no dashboard');
select is(private.class_ai_capability_allowed(pg_temp.u('o2c1'), 'c1'), false, 'POST: AI remains blocked (AR-8)');
select ok((select 'CO-12' = any (blocked_by) and not is_released from public.platform_capabilities where code = 'parent_portal'),
  'POST: parent_portal capability still blocked by CO-12 (production portal not activatable)');

-- 정규 기준 인원 초과: 등록 허용 · 이벤트 기록 · 청구 없음
select lives_ok(
  $$ insert into public.children (organization_id, class_id, name, status)
     select pg_temp.u('o1'), pg_temp.u('o1c2'), '가상-추가-' || n, 'active' from generate_series(1, 4) as n $$,
  'POST: regular class may grow past 15 (registration not blocked)');
select is((select count(*) from public.audit_events where event_type = 'capacity.overage_started' and target_id = pg_temp.u('o1c2'))::int, 1,
  'POST: regular overage recorded as an event');
select lives_ok(
  $$ update public.children set class_id = pg_temp.u('o1c1')
     where class_id = pg_temp.u('o1c2') and name like '가상-추가-%' $$,
  'POST: bulk move of 4 children out of the over-capacity class');
select is((select count(*) from public.audit_events where event_type = 'capacity.overage_cleared' and target_id = pg_temp.u('o1c2'))::int, 1,
  'POST: bulk move records exactly one overage_cleared event');
select lives_ok(
  $$ insert into public.children (organization_id, class_id, name, status)
     values (pg_temp.u('o3'), pg_temp.u('o3c1'), '가상-파일럿-16', 'active') $$,
  'POST: Pilot class registration beyond 15 is not blocked (warning only)');

-- M4 on legacy data
set local role authenticated;
select pg_temp.act_as(pg_temp.u('o1:t1'));
select lives_ok($$ select public.create_weekly_report_draft(pg_temp.u('o1c1:ch1'), pg_temp.u('a:o1c1'), 1) $$,
  'M4: weekly draft on production-shaped legacy data');
select lives_ok(
  $$ select public.save_report_draft(rv.id,
       '{"topic":"p8 1주 수업","teacher_observation":"가상 관찰","family_conversation":"가상 가정연계"}'::jsonb, '{}'::uuid[], rv.updated_at)
     from public.report_revisions rv join public.reports r on r.id = rv.report_id
     where r.child_id = pg_temp.u('o1c1:ch1') and r.week_no = 1 and rv.status = 'draft' $$,
  'M4: save draft');
select lives_ok(
  $$ select public.complete_report_revision(rv.id, rv.updated_at)
     from public.report_revisions rv join public.reports r on r.id = rv.report_id
     where r.child_id = pg_temp.u('o1c1:ch1') and r.week_no = 1 and rv.status = 'draft' $$,
  'M4: complete weekly using legacy complete observation as evidence');
select is(
  (select e.teacher_note_snapshot from public.report_revision_evidence e
   join public.report_revisions rv on rv.id = e.revision_id
   join public.reports r on r.id = rv.report_id
   where r.child_id = pg_temp.u('o1c1:ch1') and r.week_no = 1),
  '가상 관찰 o1c1 1주 1', 'M4: evidence snapshot preserves the legacy observation text');

reset role;
set local role anon;
select is((select count(*) from public.read_shared_growth_report(pg_temp.u('sh:o1:active'), rpad('psShareTokeno1active', 43, 'x')))::int, 1,
  'POST: legacy parent share still readable after cutover');
reset role;

select * from finish();
rollback;
