-- =====================================================================
-- PHASE 10F — Staging UAT 반 배정 전환 local rehearsal (pgTAP)
-- ---------------------------------------------------------------------
-- 실행: node supabase/cutover/tests/run-local.mjs supabase/tests/p0_phase10f_uat_switch.test.sql
--       (local Supabase 전용 · 하나의 transaction · 끝나면 rollback)
--
-- Staging 과 같은 id 로 합성 UAT fixture 를 만들고(계약 · 반 · STAGING-P8 · 기존 배정 · 예정 수업 4 + 완료 수업 1 · 출결 · 관찰 · 리포트),
-- 콘텐츠 패키지(load · publish)와 **같은 전환 파일**(supabase/content/starter_2026_1_staging_uat_switch.sql)을 \ir 로 실행한다.
--   S  전환: 기존 배정 completed (보존) · 새 배정 active · 반의 현재 배정 1 · origin_contract_id
--   P  보존: 계약 ACTIVE · 계약 · 원아 · 수업 · 출결 · 관찰 · 리포트 지문 동일 · STAGING-P8 프로그램/차시 불변
--   R  Readiness: content ok · missing_weeks [] · program_assignment ok
--   I  반복: 두 번째 실행 = already_switched (변화 없음)
--   N  거부: 계약 suspended · 합성 아닌 사용자 · 기대와 다른 배정 상태
--   O  운영 영향: 기존 예정 수업은 시작 불가(완료 · 취소만) · 새 배정에는 수업을 예정할 수 있다
--   B  되돌리기 경로(삭제 없음): 새 배정 completed + STAGING-P8 새 active 배정
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

set local session_replication_role = replica;

insert into public.organizations (id, name, status) values
  ('dad40381-5965-c087-5462-23169a6e3971', 'STAGING_가상 유치원', 'active');
insert into public.classes (id, organization_id, name, school_year, status) values
  ('6169936b-c450-c53d-2f45-62ed03293221', 'dad40381-5965-c087-5462-23169a6e3971', '가상 햇살반', 2026, 'active');
insert into public.children (id, organization_id, class_id, name, status) values
  ('40000000-0000-0000-0000-0000000f00c1', 'dad40381-5965-c087-5462-23169a6e3971', '6169936b-c450-c53d-2f45-62ed03293221', '가상아이1', 'active'),
  ('40000000-0000-0000-0000-0000000f00c2', 'dad40381-5965-c087-5462-23169a6e3971', '6169936b-c450-c53d-2f45-62ed03293221', '가상아이2', 'active');

update public.product_versions pv set lifecycle = 'published', published_at = now()
from public.products p where p.id = pv.product_id and p.code = 'starter';

insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
select '9b9eef88-6e5c-02ba-946a-1db2b34c06be', 'dad40381-5965-c087-5462-23169a6e3971', pv.id, 'active',
       private.local_today() - 30, private.local_today() + 60
from public.product_versions pv join public.products p on p.id = pv.product_id where p.code = 'starter';
insert into public.contract_classes (organization_id, contract_id, class_id) values
  ('dad40381-5965-c087-5462-23169a6e3971', '9b9eef88-6e5c-02ba-946a-1db2b34c06be', '6169936b-c450-c53d-2f45-62ed03293221');

-- STAGING-P8 (가상) · 8 차시 · 필수 section 11 (합성)
insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('c66a3734-85aa-765a-c882-329f9b73ad4d', 'STAGING-P8', 'Staging 8주 통합예술 과정(가상)', 8, 'published');
insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status)
select ('51000000-0000-0000-0000-0000000f000' || w)::uuid, 'c66a3734-85aa-765a-c882-329f9b73ad4d', w, 1, w || '주 색과 모양 놀이(가상)', 'published'
from generate_series(1, 8) as w;
insert into public.lesson_sections (lesson_id, section_code, body)
select ('51000000-0000-0000-0000-0000000f000' || w)::uuid, r.code, '가상 본문'
from generate_series(1, 8) as w cross join unnest(private.required_lesson_sections()) as r(code);

insert into public.class_program_assignments (id, organization_id, class_id, program_id, start_date, status) values
  ('3c7d7ceb-0043-d005-45f5-018e8d5e4085', 'dad40381-5965-c087-5462-23169a6e3971', '6169936b-c450-c53d-2f45-62ed03293221',
   'c66a3734-85aa-765a-c882-329f9b73ad4d', '2026-09-28', 'active');

-- 예정 4 (W1~W4) + 완료 1 (W5 · 기록 보존 확인용)
insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status, week_no)
select ('80000000-0000-0000-0000-0000000f000' || w)::uuid, 'dad40381-5965-c087-5462-23169a6e3971', '6169936b-c450-c53d-2f45-62ed03293221',
       '3c7d7ceb-0043-d005-45f5-018e8d5e4085', 'c66a3734-85aa-765a-c882-329f9b73ad4d', ('51000000-0000-0000-0000-0000000f000' || w)::uuid,
       date '2026-09-28' + (w - 1) * 7, case when w = 5 then 'completed' else 'scheduled' end, w
from generate_series(1, 5) as w;
insert into public.class_session_attendance (organization_id, class_session_id, class_id, child_id, attendance_status) values
  ('dad40381-5965-c087-5462-23169a6e3971', '80000000-0000-0000-0000-0000000f0005', '6169936b-c450-c53d-2f45-62ed03293221', '40000000-0000-0000-0000-0000000f00c1', 'present');
insert into public.class_session_observations (id, organization_id, class_session_id, class_id, child_id, teacher_note, record_status, taxonomy) values
  ('90000000-0000-0000-0000-0000000f00b1', 'dad40381-5965-c087-5462-23169a6e3971', '80000000-0000-0000-0000-0000000f0005', '6169936b-c450-c53d-2f45-62ed03293221',
   '40000000-0000-0000-0000-0000000f00c1', '가상 관찰', 'complete', 'growth5');
insert into public.reports (id, organization_id, class_id, child_id, class_program_assignment_id, report_type, week_no) values
  ('90000000-0000-0000-0000-0000000f00e1', 'dad40381-5965-c087-5462-23169a6e3971', '6169936b-c450-c53d-2f45-62ed03293221',
   '40000000-0000-0000-0000-0000000f00c1', '3c7d7ceb-0043-d005-45f5-018e8d5e4085', 'weekly', 5);

set local session_replication_role = origin;

create or replace function pg_temp.biz_fp() returns text language sql as $$
  select md5(
    coalesce((select string_agg(t::text, '|' order by t.id) from public.contracts t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.organizations t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.classes t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.children t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.class_sessions t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.class_session_attendance t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.class_session_observations t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.reports t), ''));
$$;
create or replace function pg_temp.p8_fp() returns text language sql as $$
  select md5(cp::text
    || coalesce((select string_agg(l::text, '|' order by l.id) from public.curriculum_lessons l where l.program_id = cp.id), '')
    || coalesce((select string_agg(s::text, '|' order by s.lesson_id, s.section_code) from public.lesson_sections s
                 join public.curriculum_lessons l on l.id = s.lesson_id where l.program_id = cp.id), ''))
  from public.curriculum_programs cp where cp.id = 'c66a3734-85aa-765a-c882-329f9b73ad4d';
$$;
create or replace function pg_temp.content_item() returns jsonb language sql as $$
  select e from jsonb_array_elements(private.contract_readiness_internal('9b9eef88-6e5c-02ba-946a-1db2b34c06be') -> 'items') e where e ->> 'code' = 'content';
$$;

\ir ../content/starter_2026_1_load.sql
\ir ../content/starter_2026_1_publish.sql

select set_config('test.biz_before', pg_temp.biz_fp(), true);
select set_config('test.p8_before', pg_temp.p8_fp(), true);

-- 전환 (Staging 에 적용할 파일 그대로)
\ir ../content/starter_2026_1_staging_uat_switch.sql


-- S. 전환
select is((select status from public.class_program_assignments where id = '3c7d7ceb-0043-d005-45f5-018e8d5e4085'), 'completed',
  'S1: 기존 STAGING-P8 배정 = completed (삭제 없이 보존)');
select is((select array[status, program_id::text, origin_contract_id::text] from public.class_program_assignments where id = '794fbfb1-97d5-3231-a4bf-67ce781bf92c'),
  array['active', '4f54cc7e-620f-374e-8937-e808e2afc1a9', '9b9eef88-6e5c-02ba-946a-1db2b34c06be'],
  'S2: 새 배정 = active · SOYE-STARTER-2026.1 · origin_contract_id = UAT 계약');
select is((select array_agg(cp.code) from public.class_program_assignments a join public.curriculum_programs cp on cp.id = a.program_id
           where a.class_id = '6169936b-c450-c53d-2f45-62ed03293221' and a.status = 'active'), array['SOYE-STARTER-2026.1'],
  'S3: 반의 현재(active) 배정 = SOYE-STARTER-2026.1 하나');
select is((select count(*)::int from public.class_program_assignments where class_id = '6169936b-c450-c53d-2f45-62ed03293221'), 2,
  'S4: 배정 이력 2행 (기존 completed + 새 active)');

-- P. 보존
select is((select status from public.contracts where id = '9b9eef88-6e5c-02ba-946a-1db2b34c06be'), 'active', 'P1: UAT 계약 ACTIVE 그대로');
select is(pg_temp.biz_fp(), current_setting('test.biz_before'), 'P2: 계약 · 기관 · 반 · 원아 · 수업 · 출결 · 관찰 · 리포트 지문 동일');
select is(pg_temp.p8_fp(), current_setting('test.p8_before'), 'P3: STAGING-P8 프로그램 · 차시 · section 불변 (이력 보존)');
select is((select count(*)::int from public.class_sessions where class_program_assignment_id = '3c7d7ceb-0043-d005-45f5-018e8d5e4085'), 5,
  'P4: 기존 배정의 수업 5건 그대로 (예정 4 · 완료 1)');
select is((select count(*)::int from public.reports where class_program_assignment_id = '3c7d7ceb-0043-d005-45f5-018e8d5e4085'), 1,
  'P5: 기존 배정의 리포트 그대로');

-- R. Readiness
select is((pg_temp.content_item() ->> 'ok')::boolean, true, 'R1: content readiness ok (실제 W1~W8 · 현재 배정 기준)');
select is(pg_temp.content_item() -> 'detail' -> 'missing_weeks', '[]'::jsonb, 'R2: missing_weeks = []');
select is((select (e ->> 'ok')::boolean from jsonb_array_elements(private.contract_readiness_internal('9b9eef88-6e5c-02ba-946a-1db2b34c06be') -> 'items') e
           where e ->> 'code' = 'program_assignment'), true, 'R3: program_assignment readiness ok');

-- I. 반복
select is(pg_temp.starter_2026_1_staging_uat_switch(), 'already_switched', 'I1: 두 번째 실행 = already_switched');
select is(pg_temp.biz_fp(), current_setting('test.biz_before'), 'I2: 두 번째 실행 후에도 업무 데이터 지문 동일');
select is((select count(*)::int from public.class_program_assignments where class_id = '6169936b-c450-c53d-2f45-62ed03293221'), 2, 'I3: 배정 행 추가 없음');

-- O. 운영 영향 (문서화 대상)
select throws_ok(
  $$ update public.class_sessions set status = 'in_progress' where id = '80000000-0000-0000-0000-0000000f0002' $$,
  '23514', NULL, 'O1: 종료된 배정의 예정 수업은 시작할 수 없다 (enforce_class_session_update)');
select lives_ok(
  $$ insert into public.class_sessions (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
     select 'dad40381-5965-c087-5462-23169a6e3971', '6169936b-c450-c53d-2f45-62ed03293221', '794fbfb1-97d5-3231-a4bf-67ce781bf92c',
            '4f54cc7e-620f-374e-8937-e808e2afc1a9', l.id, private.local_today() + 1, 'scheduled'
     from public.curriculum_lessons l where l.program_id = '4f54cc7e-620f-374e-8937-e808e2afc1a9' and l.week_no = 1 $$,
  'O2: 새 배정(SOYE-STARTER W1)에는 수업을 예정할 수 있다 (UAT 다음 단계 경로 · 이 test 안에서만)');
select lives_ok(
  $$ update public.class_sessions set status = 'cancelled' where id = '80000000-0000-0000-0000-0000000f0001' $$,
  'O3: 종료된 배정의 예정 수업은 취소(정리)할 수 있다 (이 test 안에서만)');

-- N. 거부 (상태를 바꾼 뒤 savepoint 로 되돌린다)
savepoint n1;
set local session_replication_role = replica;
update public.contracts set status = 'suspended' where id = '9b9eef88-6e5c-02ba-946a-1db2b34c06be';
set local session_replication_role = origin;
select throws_like($$ select pg_temp.starter_2026_1_staging_uat_switch() $$, '%active 가 아니다%', 'N1: 계약 suspended 면 거부');
rollback to savepoint n1;

savepoint n2;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000f0e01', 'real-person@school.kr');
select throws_like($$ select pg_temp.starter_2026_1_staging_uat_switch() $$, '%합성 계정이 아닌 사용자%', 'N2: 합성 아닌 사용자가 있으면 거부');
rollback to savepoint n2;

savepoint n3;
update public.class_program_assignments set status = 'cancelled' where id = '794fbfb1-97d5-3231-a4bf-67ce781bf92c';
select throws_like($$ select pg_temp.starter_2026_1_staging_uat_switch() $$, '%기대%다르다%', 'N3: 기대와 다른 배정 상태(새 배정 cancelled)면 거부');
rollback to savepoint n3;

-- B. 되돌리기 경로 (삭제 · 재활성화 없이): 새 배정 completed + STAGING-P8 새 active 배정
savepoint b1;
update public.class_program_assignments set status = 'completed' where id = '794fbfb1-97d5-3231-a4bf-67ce781bf92c';
insert into public.class_program_assignments (organization_id, class_id, program_id, start_date, status, origin_contract_id) values
  ('dad40381-5965-c087-5462-23169a6e3971', '6169936b-c450-c53d-2f45-62ed03293221', 'c66a3734-85aa-765a-c882-329f9b73ad4d', private.local_today(), 'active', '9b9eef88-6e5c-02ba-946a-1db2b34c06be');
select is((select count(*)::int from public.class_program_assignments where class_id = '6169936b-c450-c53d-2f45-62ed03293221'), 3,
  'B1: 되돌리기 = 이력 3행 (삭제 없음) · 기존 행 재활성화 없음');
select is((select array_agg(cp.code) from public.class_program_assignments a join public.curriculum_programs cp on cp.id = a.program_id
           where a.class_id = '6169936b-c450-c53d-2f45-62ed03293221' and a.status = 'active'), array['STAGING-P8'],
  'B2: 되돌리기 후 현재 배정 = STAGING-P8 (새 행)');
rollback to savepoint b1;

select is((select status from public.contracts where id = '9b9eef88-6e5c-02ba-946a-1db2b34c06be'), 'active', 'P6: 모든 검사 후 계약 ACTIVE');

select * from finish();
rollback;
