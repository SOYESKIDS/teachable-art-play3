-- =====================================================================
-- PHASE 10D — STARTER "8주 기록 모아보기" DB 수락 테스트 (pgTAP)
-- ---------------------------------------------------------------------
-- 실행: npx supabase test db   또는   node supabase/cutover/tests/run-local.mjs supabase/tests/p0_phase10d_starter_summary.test.sql
--       (local Supabase 전용 · remote 금지)
-- 하나의 transaction · 끝나면 rollback.
--
-- 앱 loader(src/lib/staff/program-summary-queries.ts)가 쓰는 질의를 그대로 각 역할로 실행해 판정한다:
--   S  STARTER = 8주 (week 1~8) · 기능 = class_mode · weekly_report · parent_portal (ai_assist 없음)
--   A  범위: 담당 교사 = 담당 반 아이만 · 다른 반 교사 0 · 원장 = 기관 · 완료본만 · 다른 기관 원장 0
--   W  구간: 1~8 밖 Weekly(9주) 제외 · 완료본 없는 주(초안만 · 기록 없음)는 행이 없다 (지어내지 않음)
--   G  점수 · 순위 · 진단 저장 열 없음 · entitlement RPC = STABLE
--   M  조회 전후 reports · report_revisions · audit_events 지문 동일 (조회는 쓰지 않는다)
-- Fixture (가상 · 이 transaction 안에서만):
--   Org S (STARTER 활성 계약) = 반 S1 (교사 T1 · 아이 C1) · 반 S2 (교사 T2 · 아이 C2) · 원장 DS
--   Org O = 원장 DO (다른 기관)
--   C1 Weekly: 1 · 2 · 3 · 5 주 완료 · 4 주 초안만 · 9 주 완료(replica 로만 가능한 범위 밖 상태 재현)
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

set local session_replication_role = replica;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000d0001', 'director-s@test.local'),
  ('00000000-0000-0000-0000-0000000d0002', 'teacher-s1@test.local'),
  ('00000000-0000-0000-0000-0000000d0003', 'teacher-s2@test.local'),
  ('00000000-0000-0000-0000-0000000d0004', 'director-o@test.local');

insert into public.profiles (user_id, display_name)
select id, split_part(email, '@', 1) from auth.users
where email like '%@test.local'
on conflict (user_id) do nothing;

insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-0000000d00a0', 'Org S', 'active'),
  ('10000000-0000-0000-0000-0000000d00b0', 'Org O', 'active');

insert into public.organization_members (id, organization_id, user_id, role, status) values
  ('20000000-0000-0000-0000-0000000d00a1', '10000000-0000-0000-0000-0000000d00a0', '00000000-0000-0000-0000-0000000d0001', 'director', 'active'),
  ('20000000-0000-0000-0000-0000000d00a2', '10000000-0000-0000-0000-0000000d00a0', '00000000-0000-0000-0000-0000000d0002', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000d00a3', '10000000-0000-0000-0000-0000000d00a0', '00000000-0000-0000-0000-0000000d0003', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000d00b1', '10000000-0000-0000-0000-0000000d00b0', '00000000-0000-0000-0000-0000000d0004', 'director', 'active');

insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000d00a1', '10000000-0000-0000-0000-0000000d00a0', '반 S1', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000d00a2', '10000000-0000-0000-0000-0000000d00a0', '반 S2', 2026, 'active');

insert into public.class_teachers (organization_id, class_id, organization_member_id) values
  ('10000000-0000-0000-0000-0000000d00a0', '30000000-0000-0000-0000-0000000d00a1', '20000000-0000-0000-0000-0000000d00a2'),
  ('10000000-0000-0000-0000-0000000d00a0', '30000000-0000-0000-0000-0000000d00a2', '20000000-0000-0000-0000-0000000d00a3');

insert into public.children (id, organization_id, class_id, name, status) values
  ('40000000-0000-0000-0000-0000000d00c1', '10000000-0000-0000-0000-0000000d00a0', '30000000-0000-0000-0000-0000000d00a1', '가상아이C1', 'active'),
  ('40000000-0000-0000-0000-0000000d00c2', '10000000-0000-0000-0000-0000000d00a0', '30000000-0000-0000-0000-0000000d00a2', '가상아이C2', 'active');

insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('50000000-0000-0000-0000-0000000d0001', 'TEST-10D', 'Test Program 10D', 8, 'published');

update public.product_versions pv
set lifecycle = 'published', published_at = now()
from public.products p
where p.id = pv.product_id and p.code = 'starter';

insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
select '60000000-0000-0000-0000-0000000d00a0', '10000000-0000-0000-0000-0000000d00a0', pv.id, 'active',
       private.local_today() - 30, private.local_today() + 60
from public.product_versions pv join public.products p on p.id = pv.product_id
where p.code = 'starter';

insert into public.contract_classes (organization_id, contract_id, class_id) values
  ('10000000-0000-0000-0000-0000000d00a0', '60000000-0000-0000-0000-0000000d00a0', '30000000-0000-0000-0000-0000000d00a1'),
  ('10000000-0000-0000-0000-0000000d00a0', '60000000-0000-0000-0000-0000000d00a0', '30000000-0000-0000-0000-0000000d00a2');

insert into public.class_program_assignments (id, organization_id, class_id, program_id, status) values
  ('70000000-0000-0000-0000-0000000d00a1', '10000000-0000-0000-0000-0000000d00a0', '30000000-0000-0000-0000-0000000d00a1', '50000000-0000-0000-0000-0000000d0001', 'active'),
  ('70000000-0000-0000-0000-0000000d00a2', '10000000-0000-0000-0000-0000000d00a0', '30000000-0000-0000-0000-0000000d00a2', '50000000-0000-0000-0000-0000000d0001', 'active');

-- C1 Weekly: 완료 1 · 2 · 3 · 5 · 9 주 (revision 1 complete) · 4 주 초안만 (latest_completed 없음)
insert into public.reports (id, organization_id, class_id, child_id, class_program_assignment_id, report_type, week_no, latest_completed_revision_id)
select ('90000000-0000-0000-0000-0000000d00' || lpad(w::text, 2, '0'))::uuid,
       '10000000-0000-0000-0000-0000000d00a0', '30000000-0000-0000-0000-0000000d00a1', '40000000-0000-0000-0000-0000000d00c1',
       '70000000-0000-0000-0000-0000000d00a1', 'weekly', w,
       case when w = 4 then null else ('91000000-0000-0000-0000-0000000d00' || lpad(w::text, 2, '0'))::uuid end
from unnest(array[1, 2, 3, 4, 5, 9]) as w;

insert into public.report_revisions (id, organization_id, report_id, revision_no, status, content, completed_at)
select ('91000000-0000-0000-0000-0000000d00' || lpad(w::text, 2, '0'))::uuid,
       '10000000-0000-0000-0000-0000000d00a0',
       ('90000000-0000-0000-0000-0000000d00' || lpad(w::text, 2, '0'))::uuid,
       1,
       case when w = 4 then 'draft' else 'complete' end,
       jsonb_build_object('topic', w || '주 주제(가상)', 'quote_choice', '가상 아이의 말'),
       case when w = 4 then null else now() end
from unnest(array[1, 2, 3, 4, 5, 9]) as w;

-- C2 (반 S2) Weekly 1 주 완료 — T1 에게 보이면 안 된다
insert into public.reports (id, organization_id, class_id, child_id, class_program_assignment_id, report_type, week_no, latest_completed_revision_id)
values ('90000000-0000-0000-0000-0000000d0c21', '10000000-0000-0000-0000-0000000d00a0', '30000000-0000-0000-0000-0000000d00a2',
        '40000000-0000-0000-0000-0000000d00c2', '70000000-0000-0000-0000-0000000d00a2', 'weekly', 1,
        '91000000-0000-0000-0000-0000000d0c21');
insert into public.report_revisions (id, organization_id, report_id, revision_no, status, content, completed_at)
values ('91000000-0000-0000-0000-0000000d0c21', '10000000-0000-0000-0000-0000000d00a0', '90000000-0000-0000-0000-0000000d0c21',
        1, 'complete', '{"topic":"C2 주제(가상)"}'::jsonb, now());

set local session_replication_role = origin;


-- ---------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------
create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- loader 와 같은 질의: 같은 아이 · 같은 배정 · 구간 안 · 완료본 있는 Weekly (week 오름차순)
create or replace function pg_temp.summary_weeks(p_from int, p_to int) returns int[] language sql as $$
  select coalesce(array_agg(r.week_no order by r.week_no), '{}')
  from public.reports r
  where r.report_type = 'weekly'
    and r.child_id = '40000000-0000-0000-0000-0000000d00c1'
    and r.class_program_assignment_id = '70000000-0000-0000-0000-0000000d00a1'
    and r.week_no between p_from and p_to
    and r.latest_completed_revision_id is not null;
$$;

create or replace function pg_temp.visible_revisions(p_status text) returns int language sql as $$
  select count(*)::int from public.report_revisions rv
  where rv.report_id in (select id from public.reports where child_id = '40000000-0000-0000-0000-0000000d00c1')
    and rv.status = p_status;
$$;

create or replace function pg_temp.fingerprint() returns text language sql as $$
  select md5(
    coalesce((select string_agg(t::text, '|' order by t.id) from public.reports t where t.organization_id = '10000000-0000-0000-0000-0000000d00a0'), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.report_revisions t where t.organization_id = '10000000-0000-0000-0000-0000000d00a0'), '')
    || (select count(*) from public.audit_events)::text);
$$;

select set_config('test.fp_before', pg_temp.fingerprint(), true);


-- ---------------------------------------------------------------------
-- S. STARTER 정의
-- ---------------------------------------------------------------------
select is(
  (select array[pv.week_from, pv.week_to] from public.product_versions pv join public.products p on p.id = pv.product_id
   where p.code = 'starter' and pv.version_label = '2026.1'),
  array[1, 8],
  'S1: STARTER 2026.1 = week 1~8 (8주)'
);

select is(
  (select array_agg(f.feature_code order by f.feature_code) from public.product_version_features f
   join public.product_versions pv on pv.id = f.product_version_id join public.products p on p.id = pv.product_id
   where p.code = 'starter' and pv.version_label = '2026.1'),
  array['class_mode', 'parent_portal', 'weekly_report'],
  'S2: STARTER 기능 = class_mode · parent_portal · weekly_report (ai_assist · 대시보드 · 월간 · 학기 없음)'
);


-- ---------------------------------------------------------------------
-- A · W. 역할별 범위 · 구간 (authenticated · RLS)
-- ---------------------------------------------------------------------
set local role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000d0002');  -- T1 (반 S1 담당)

select is(
  (select array[(e ->> 'week_from')::int, (e ->> 'week_to')::int]
   from (select public.organization_entitlements('10000000-0000-0000-0000-0000000d00a0') as e) x),
  array[1, 8],
  'W1: 담당 교사의 entitlement 구간 = 1~8 (loader 구간 계산 입력)'
);

select is(pg_temp.summary_weeks(1, 8), array[1, 2, 3, 5],
  'W2: 담당 교사 모아보기 = 완료 1 · 2 · 3 · 5 주 (4 주 초안 · 9 주 범위 밖 제외)');

select is((select count(*)::int from public.reports where child_id = '40000000-0000-0000-0000-0000000d00c1' and week_no between 6 and 8), 0,
  'W3: 기록 없는 6~8 주는 행이 없다 (화면은 빈 주 · 지어내지 않음)');

select is(pg_temp.visible_revisions('complete'), 5, 'A1: 담당 교사 = 아이 C1 완료 revision 전부(9 주 포함 5) 조회 가능');
select is(pg_temp.visible_revisions('draft'), 1, 'A2: 담당 교사 = 자기 반 초안도 조회 가능 (모아보기는 완료본만 사용)');

select is((select count(*)::int from public.reports where child_id = '40000000-0000-0000-0000-0000000d00c2'), 0,
  'A3: 담당 교사에게 다른 반(S2) 아이 Weekly 는 보이지 않는다');

select pg_temp.act_as('00000000-0000-0000-0000-0000000d0003');  -- T2 (반 S2 담당)

select is(pg_temp.summary_weeks(1, 8), '{}'::int[], 'A4: 다른 반 교사의 C1 모아보기 = 0 행');
select is((select count(*)::int from public.reports where id = '90000000-0000-0000-0000-0000000d0001'), 0,
  'A5: 다른 반 교사는 기준 Weekly 자체를 읽을 수 없다 (loader not_found)');
select is(pg_temp.visible_revisions('complete'), 0, 'A6: 다른 반 교사 = C1 revision 0');

select pg_temp.act_as('00000000-0000-0000-0000-0000000d0001');  -- DS (Org S 원장)

select is(pg_temp.summary_weeks(1, 8), array[1, 2, 3, 5], 'A7: 원장 모아보기 = 기관 아이 완료 1 · 2 · 3 · 5 주');
select is(pg_temp.visible_revisions('complete'), 5, 'A8: 원장 = 완료 revision 조회 가능');
select is(pg_temp.visible_revisions('draft'), 0, 'A9: 원장 = 초안 revision 은 보이지 않는다 (완료본만)');

select pg_temp.act_as('00000000-0000-0000-0000-0000000d0004');  -- DO (다른 기관 원장)

select is(pg_temp.summary_weeks(1, 8), '{}'::int[], 'A10: 다른 기관 원장의 모아보기 = 0 행');
select is(pg_temp.visible_revisions('complete'), 0, 'A11: 다른 기관 원장 = revision 0');
select throws_ok(
  $$ select public.organization_entitlements('10000000-0000-0000-0000-0000000d00a0') $$,
  '42501', NULL,
  'A12: 다른 기관 원장은 Org S entitlement 를 읽을 수 없다'
);

reset role;


-- ---------------------------------------------------------------------
-- G. 점수 · 순위 · 진단 저장 없음 · 조회 경로 STABLE
-- ---------------------------------------------------------------------
select is(
  (select count(*)::int from information_schema.columns
   where table_schema = 'public' and table_name in ('reports', 'report_revisions', 'report_revision_media')
     and column_name ~* '(score|rank|grade|percent|diagnos|point)'),
  0,
  'G1: Weekly 저장 열에 점수 · 순위 · 등급 · 백분율 · 진단 열이 없다'
);

select is(
  (select p.provolatile::text from pg_proc p where p.oid = 'public.organization_entitlements(uuid)'::regprocedure),
  's',
  'G2: organization_entitlements = STABLE (모아보기가 부르는 유일한 RPC · 쓰기 없음)'
);

select ok(
  exists (select 1 from public.reports where child_id = '40000000-0000-0000-0000-0000000d00c1' and week_no = 9),
  'G3: 9 주 완료 Weekly 는 실제로 있다 → W2 의 제외는 구간 필터 때문 (조용히 섞지 않음)'
);


-- ---------------------------------------------------------------------
-- M. 조회는 과거 기록을 바꾸지 않는다
-- ---------------------------------------------------------------------
select is(pg_temp.fingerprint(), current_setting('test.fp_before'),
  'M1: 역할별 모아보기 조회 전후 reports · report_revisions · audit_events 지문 동일');

select is(
  (select count(*)::int from public.report_revisions where organization_id = '10000000-0000-0000-0000-0000000d00a0' and status = 'complete'),
  6,
  'M2: 완료 revision 수 불변 (C1 5 + C2 1)'
);

select * from finish();
rollback;
