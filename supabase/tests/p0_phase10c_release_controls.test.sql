-- =====================================================================
-- PHASE 10C — 기능 출시 audit RPC · 정지 후 재개 Readiness (pgTAP)
-- ---------------------------------------------------------------------
-- 실행: npx supabase test db   (local Supabase 전용 · remote 금지)
-- 하나의 transaction · 끝나면 rollback → 이 파일에서 출시한 기능은 남지 않는다 (어떤 기능도 실제로 출시하지 않음).
--
-- 그룹:
--   R  set_capability_release: HQ Admin 만 · 사유 · 동시성 · blocker invariant(DB) · 직접 UPDATE 회수 · audit · 런타임 권한 불변
--   C  suspended → active: 활성화와 같은 Readiness (CT005) · HQ Admin · 사유 · ended 불변 · 최초 활성화 기록 유지
-- Fixture (가상 · 이 transaction 안에서만):
--   Org X = 계약 준비가 끝난 기관 (반 x1 · 1주 차시 · 테스트 전용 상품 버전 = class_mode + weekly_report)
--   (seed 상품은 모두 parent_portal(CO-12 blocker)을 포함해 Ready 가 될 수 없으므로 테스트 전용 버전을 쓴다)
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

set local session_replication_role = replica;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'hq-admin@test.local'),
  ('00000000-0000-0000-0000-00000000a002', 'hq-sales@test.local'),
  ('00000000-0000-0000-0000-00000000b001', 'director-x@test.local'),
  ('00000000-0000-0000-0000-00000000b002', 'teacher-x@test.local');

insert into public.profiles (user_id, display_name)
select id, split_part(email, '@', 1) from auth.users
where email like '%@test.local'
on conflict (user_id) do nothing;

insert into private.admin_users (user_id, role) values
  ('00000000-0000-0000-0000-00000000a001', 'admin'),
  ('00000000-0000-0000-0000-00000000a002', 'sales');

insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-0000000010c1', 'Org X', 'active');

insert into public.organization_members (id, organization_id, user_id, role, status) values
  ('20000000-0000-0000-0000-0000000010c1', '10000000-0000-0000-0000-0000000010c1', '00000000-0000-0000-0000-00000000b001', 'director', 'active'),
  ('20000000-0000-0000-0000-0000000010c2', '10000000-0000-0000-0000-0000000010c1', '00000000-0000-0000-0000-00000000b002', 'teacher', 'active');

insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000010c1', '10000000-0000-0000-0000-0000000010c1', '해님반', 2026, 'active');

insert into public.class_teachers (organization_id, class_id, organization_member_id) values
  ('10000000-0000-0000-0000-0000000010c1', '30000000-0000-0000-0000-0000000010c1', '20000000-0000-0000-0000-0000000010c2');

insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('50000000-0000-0000-0000-0000000010c1', 'P10C-TEST', 'Test Program 10C', 1, 'published');

insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status) values
  ('51000000-0000-0000-0000-0000000010c1', '50000000-0000-0000-0000-0000000010c1', 1, 1, '1주 수업', 'published');

insert into public.lesson_sections (lesson_id, section_code, body)
select '51000000-0000-0000-0000-0000000010c1', s.code, '가상 ' || s.code
from unnest(private.required_lesson_sections()) as s(code);

insert into public.class_program_assignments (id, organization_id, class_id, program_id, status) values
  ('70000000-0000-0000-0000-0000000010c1', '10000000-0000-0000-0000-0000000010c1', '30000000-0000-0000-0000-0000000010c1', '50000000-0000-0000-0000-0000000010c1', 'active');

-- 테스트 전용 상품 버전 (1주 · class_mode + weekly_report)
insert into public.product_versions (id, product_id, version_label, lifecycle, week_from, week_to, published_at)
select '11000000-0000-0000-0000-0000000010c1', p.id, '10C-TEST', 'published', 1, 1, now()
from public.products p where p.code = 'starter';

insert into public.product_version_features (product_version_id, feature_code) values
  ('11000000-0000-0000-0000-0000000010c1', 'class_mode'),
  ('11000000-0000-0000-0000-0000000010c1', 'weekly_report');

set local session_replication_role = origin;


-- ---------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------
create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

create or replace function pg_temp.cap_ts(p_code text) returns timestamptz language sql as $$
  select updated_at from public.platform_capabilities where code = p_code;
$$;

create or replace function pg_temp.cid() returns uuid language sql as $$
  select id from public.contracts where organization_id = '10000000-0000-0000-0000-0000000010c1';
$$;

create or replace function pg_temp.contract_ts() returns timestamptz language sql as $$
  select updated_at from public.contracts where organization_id = '10000000-0000-0000-0000-0000000010c1';
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

-- anon 으로 실행 → sqlstate (역할 전환은 함수 안에서만)
create or replace function pg_temp.anon_sqlstate(p_sql text) returns text language plpgsql as $$
begin
  execute 'set local role anon';
  execute p_sql;
  execute 'reset role';
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;

-- 재개 시도 → sqlstate · detail 의 실패 항목 (GET STACKED DIAGNOSTICS)
create or replace function pg_temp.resume_result() returns text language plpgsql as $$
declare
  v_detail text;
begin
  perform public.change_contract_status(pg_temp.cid(), 'active', '재개 확인', pg_temp.contract_ts());
  return 'resumed';
exception when others then
  get stacked diagnostics v_detail = pg_exception_detail;
  return sqlstate || coalesce(':' || (
    select string_agg((e ->> 'code') || '=' || coalesce(e ->> 'reason', ''), ',' order by e ->> 'code')
    from jsonb_array_elements(v_detail::jsonb -> 'items') e
    where (e ->> 'ok')::boolean is not true
  ), '');
end;
$$;

-- 최근 capability.changed audit (as postgres)
create or replace function pg_temp.last_cap_audit(p_code text) returns public.audit_events language sql as $$
  select * from public.audit_events
  where event_type = 'capability.changed' and metadata ->> 'code' = p_code
  order by created_at desc, id desc limit 1;
$$;

set local role authenticated;


-- =====================================================================
-- R — set_capability_release
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');

-- 입력 검사
select throws_ok(
  $$ select public.set_capability_release('class_mode', true, '   ', pg_temp.cap_ts('class_mode')) $$,
  'CP001', '출시 · 미출시 변경 사유를 입력해 주세요.', 'R3: empty reason rejected');
select throws_ok(
  $$ select public.set_capability_release('class_mode', true, null, pg_temp.cap_ts('class_mode')) $$,
  'CP001', null, 'R3: null reason rejected');
select throws_ok(
  $$ select public.set_capability_release('class_mode', true, '출시 승인', null) $$,
  'CP001', null, 'R: expected_updated_at is mandatory');
select throws_ok(
  $$ select public.set_capability_release('no_such_feature', true, '출시 승인', now()) $$,
  'CP001', '알 수 없는 기능입니다.', 'R: unknown capability code rejected');
select throws_ok(
  $$ select public.set_capability_release('class_mode', true, '출시 승인', pg_temp.cap_ts('class_mode') - interval '1 second') $$,
  'CP004', null, 'R8: stale expected_updated_at rejected');

-- blocker invariant (RPC · DB)
select throws_ok(
  $$ select public.set_capability_release('parent_portal', true, '출시 승인', pg_temp.cap_ts('parent_portal')) $$,
  'CP003', '정책 결정 대기 중인 기능은 출시할 수 없습니다.', 'R2: release with blocked_by (CO-12) rejected');
select is((select blocked_by from public.platform_capabilities where code = 'parent_portal'), array['CO-12'],
  'R2: blocked_by is not silently cleared');

-- 역할
select pg_temp.act_as('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$ select public.set_capability_release('bulk_print', true, '출시 승인', pg_temp.cap_ts('bulk_print')) $$,
  'CP002', null, 'R4: HQ Sales rejected');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select throws_ok(
  $$ select public.set_capability_release('bulk_print', true, '출시 승인', pg_temp.cap_ts('bulk_print')) $$,
  'CP002', null, 'R5: Director rejected');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select throws_ok(
  $$ select public.set_capability_release('bulk_print', true, '출시 승인', pg_temp.cap_ts('bulk_print')) $$,
  'CP002', null, 'R6: Teacher rejected');
reset role;
select set_config('request.jwt.claims', '', true);
select is(pg_temp.anon_sqlstate($f$select public.set_capability_release('bulk_print', true, '출시 승인', now())$f$),
  '42501', 'R7: anon rejected (no EXECUTE)');
select is((select is_released from public.platform_capabilities where code = 'bulk_print'), false,
  'R4-7: rejected callers changed nothing');

-- 직접 UPDATE 회수 (HQ Admin 도 is_released 직접 UPDATE 불가)
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select is(pg_temp.try_sql($f$update public.platform_capabilities set is_released = true where code = 'bulk_print'$f$),
  '42501', 'R9: direct authenticated UPDATE of is_released rejected (even HQ Admin)');
select is(pg_temp.try_sql($f$update public.platform_capabilities set note = note where code = 'bulk_print'$f$),
  'rows=1', 'R9: existing note / blocked_by administration grant unchanged (release state untouched)');

-- DB invariant: 권한 우회 경로(superuser)도 blocker 있는 기능을 출시할 수 없다
reset role;
select throws_ok(
  $$ update public.platform_capabilities set is_released = true where code = 'parent_portal' $$,
  'CP003', null, 'R2: DB trigger enforces blocked_by = empty on every release path');

-- 정상 출시 (HQ Admin · RPC)
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.set_capability_release('class_mode', true, 'PHASE 10C 로컬 검증 출시', pg_temp.cap_ts('class_mode')) $$,
  'R1: HQ Admin releases a clean capability through the RPC');
select throws_ok(
  $$ select public.set_capability_release('class_mode', true, '다시 출시', pg_temp.cap_ts('class_mode')) $$,
  'CP001', '이미 출시 상태입니다.', 'R: no-op release is reported, not silently repeated');
reset role;
select is((select is_released from public.platform_capabilities where code = 'class_mode'), true,
  'R1: class_mode released (this transaction only)');
select is((select updated_by from public.platform_capabilities where code = 'class_mode'), '00000000-0000-0000-0000-00000000a001'::uuid,
  'R: updated_by = auth.uid()');
select is((pg_temp.last_cap_audit('class_mode')).reason, 'PHASE 10C 로컬 검증 출시',
  'R10: audit event carries the explicit reason');
select is((pg_temp.last_cap_audit('class_mode')).actor_user_id, '00000000-0000-0000-0000-00000000a001'::uuid,
  'R11: audit event identifies the actor');
select is((select (a.metadata ->> 'released_from') || '->' || (a.metadata ->> 'released_to') || ':' || (a.metadata ->> 'via')
           from pg_temp.last_cap_audit('class_mode') a),
  'false->true:set_capability_release', 'R10: audit records from / to release state and path');
select is((select count(*)::int from public.audit_events
           where event_type = 'capability.changed' and metadata ->> 'code' = 'class_mode'), 1,
  'R: one release = one audit event (no duplicate)');

-- weekly_report 출시 → 계약 활성화 준비
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.set_capability_release('weekly_report', true, 'PHASE 10C 로컬 검증 출시', pg_temp.cap_ts('weekly_report')) $$,
  'R1: HQ Admin releases weekly_report through the RPC');


-- =====================================================================
-- C — 계약 활성화 · 정지 · 재개
-- =====================================================================
select lives_ok(
  $$ insert into public.contracts (organization_id, product_version_id, start_date, end_date)
     values ('10000000-0000-0000-0000-0000000010c1', '11000000-0000-0000-0000-0000000010c1',
             private.local_today() - 7, private.local_today() + 60) $$,
  'C: draft contract created');
select lives_ok(
  $$ insert into public.contract_classes (organization_id, contract_id, class_id)
     values ('10000000-0000-0000-0000-0000000010c1', pg_temp.cid(), '30000000-0000-0000-0000-0000000010c1') $$,
  'C: class scope added');
select lives_ok(
  $$ select public.activate_contract(pg_temp.cid(), pg_temp.contract_ts()) $$,
  'C: ready draft contract activates (fixture is genuinely ready)');

reset role;
create temp table p10c_first_activation on commit drop as
  select activated_at, activated_by from public.contracts where id = pg_temp.cid();
create temp table p10c_write_before on commit drop as
  select f.code, private.class_write_allowed('30000000-0000-0000-0000-0000000010c1', f.code) as allowed
  from unnest(array['class_mode', 'weekly_report', 'director_dashboard']) as f(code);

-- R12 · R13: 미출시로 바꿔도 audit · 런타임 권한은 그대로
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.set_capability_release('weekly_report', false, '로컬 검증 미출시', pg_temp.cap_ts('weekly_report')) $$,
  'R12: HQ Admin unreleases weekly_report');
reset role;
select is((select a.reason || '|' || (a.metadata ->> 'released_from') || '->' || (a.metadata ->> 'released_to')
           from pg_temp.last_cap_audit('weekly_report') a),
  '로컬 검증 미출시|true->false', 'R12: release -> unrelease is audited with reason');
select is((select count(*)::int from public.audit_events
           where event_type = 'capability.changed' and metadata ->> 'code' = 'weekly_report'), 2,
  'R12: release and unrelease = two audit events');
select is(
  (select array_agg(private.class_write_allowed('30000000-0000-0000-0000-0000000010c1', b.code) = b.allowed order by b.code)
   from p10c_write_before b),
  array[true, true, true],
  'R13: release state does not change class_write_allowed (runtime entitlement)');

-- 정지
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.change_contract_status(pg_temp.cid(), 'suspended', '운영 점검', pg_temp.contract_ts()) $$,
  'C: HQ Admin suspends the contract');

-- C17: 미출시 기능 → 재개 거부
select is(pg_temp.resume_result(), 'CT005:feature:weekly_report=not_released',
  'C17 / C15: not-ready suspended contract (feature not released) cannot resume (CT005 · readiness detail)');

-- C16: 정책 blocker → 재개 거부
select lives_ok(
  $$ select public.set_capability_release('weekly_report', true, '로컬 검증 재출시', pg_temp.cap_ts('weekly_report')) $$,
  'C: weekly_report released again');
reset role;
update public.platform_capabilities set blocked_by = array['TEST-POLICY'] where code = 'class_mode';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select is(pg_temp.resume_result(), 'CT005:feature:class_mode=policy_blocked',
  'C16: a policy blocker on a promised feature blocks resume');
reset role;
update public.platform_capabilities set blocked_by = '{}' where code = 'class_mode';

-- 기관 정지 → 재개 거부
update public.organizations set status = 'suspended' where id = '10000000-0000-0000-0000-0000000010c1';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select is(pg_temp.resume_result(), 'CT005:contract=organization_suspended',
  'C: suspended organization blocks resume (contract item keeps its organization reason)');
reset role;
update public.organizations set status = 'active' where id = '10000000-0000-0000-0000-0000000010c1';

-- C18: HQ Admin 만
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a002');
select ok(pg_temp.try_sql($f$select public.change_contract_status(pg_temp.cid(), 'active', '재개', pg_temp.contract_ts())$f$) in ('CT007', 'CT008'),
  'C18: HQ Sales cannot resume');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select ok(pg_temp.try_sql($f$select public.change_contract_status(pg_temp.cid(), 'active', '재개', pg_temp.contract_ts())$f$) in ('CT007', 'CT008'),
  'C18: Director cannot resume');
reset role;
select set_config('request.jwt.claims', '', true);
select throws_ok(
  $$ update public.contracts set status = 'active', status_reason = '재개' where id = pg_temp.cid() $$,
  '42501', null, 'C18: resume without an HQ Admin identity is rejected by the trigger (any write path)');
select is((select status from public.contracts where id = pg_temp.cid()), 'suspended',
  'C18: contract still suspended after rejected attempts');

-- C19: 사유 필수
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select throws_ok(
  $$ select public.change_contract_status(pg_temp.cid(), 'active', '  ', pg_temp.contract_ts()) $$,
  'CT004', null, 'C19: resume still requires a status reason');

-- C14: 준비된 계약 재개 성공 · C21: 최초 활성화 기록 유지
select is(pg_temp.resume_result(), 'resumed', 'C14: ready suspended contract resumes');
reset role;
select ok((select c.activated_at = f.activated_at and c.activated_by = f.activated_by
           from public.contracts c, p10c_first_activation f where c.id = pg_temp.cid()),
  'C21: original first activation (activated_at · activated_by) is preserved');
select is((select a.reason || '|' || (a.metadata ->> 'from') || '->' || (a.metadata ->> 'to')
           from public.audit_events a
           where a.event_type = 'contract.status_changed' and a.target_id = pg_temp.cid()
           order by a.created_at desc, a.id desc limit 1),
  '재개 확인|suspended->active', 'C: resume is audited with its reason');

-- C20: ended 는 재개 불가
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.change_contract_status(pg_temp.cid(), 'ended', '계약 종료', pg_temp.contract_ts()) $$,
  'C: contract ended');
select throws_ok(
  $$ select public.change_contract_status(pg_temp.cid(), 'active', '재개', pg_temp.contract_ts()) $$,
  'CT002', null, 'C20: ended contract cannot be reactivated (RPC)');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select throws_ok(
  $$ update public.contracts set status = 'active', status_reason = '재개' where id = pg_temp.cid() $$,
  'CT002', null, 'C20: ended contract is immutable (any write path)');

select * from finish();
rollback;
