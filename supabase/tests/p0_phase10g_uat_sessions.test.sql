-- =====================================================================
-- PHASE 10G — Staging UAT 반 SOYE-STARTER W1~W8 예정 수업 생성 local rehearsal (pgTAP)
-- ---------------------------------------------------------------------
-- 실행: node supabase/cutover/tests/run-local.mjs supabase/tests/p0_phase10g_uat_sessions.test.sql
--       (local Supabase 전용 · 하나의 transaction · 끝나면 rollback)
-- PHASE 10F 와 같은 id 의 합성 fixture → load · publish · 반 전환 → **같은 수업 생성 파일**
-- (supabase/content/starter_2026_1_staging_uat_sessions.sql) 을 ir 로 실행해 판정한다.
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

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

create or replace function pg_temp.old_fp() returns text language sql as $$
  select md5(coalesce(string_agg(s::text, '|' order by s.id), '')) from public.class_sessions s
  where s.class_program_assignment_id = '3c7d7ceb-0043-d005-45f5-018e8d5e4085';
$$;
create or replace function pg_temp.rec_fp() returns text language sql as $$
  select md5(
    coalesce((select string_agg(t::text, '|' order by t.id) from public.contracts t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.class_session_attendance t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.class_session_observations t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.reports t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.children t), ''));
$$;
create or replace function pg_temp.new_sessions() returns table (week_no int, scheduled_date date, status text) language sql as $$
  select s.week_no, s.scheduled_date, s.status from public.class_sessions s
  where s.class_program_assignment_id = '794fbfb1-97d5-3231-a4bf-67ce781bf92c' order by s.week_no;
$$;

\ir ../content/starter_2026_1_load.sql
\ir ../content/starter_2026_1_publish.sql
\ir ../content/starter_2026_1_staging_uat_switch.sql

select set_config('test.old_before', pg_temp.old_fp(), true);
select set_config('test.rec_before', pg_temp.rec_fp(), true);

-- 수업 생성 (Staging 에 적용할 파일 그대로)
\ir ../content/starter_2026_1_staging_uat_sessions.sql

select is((select count(*)::int from pg_temp.new_sessions()), 8, 'C1: SOYE-STARTER 배정에 수업 8건');
select is((select array_agg(week_no order by week_no) from pg_temp.new_sessions()), array[1,2,3,4,5,6,7,8], 'C2: W1~W8 (주차 중복 없음 · week_no trigger 로 채움)');
select is((select array_agg(scheduled_date::text order by week_no) from pg_temp.new_sessions()),
  array['2026-10-01','2026-10-05','2026-10-12','2026-10-19','2026-10-26','2026-11-02','2026-11-09','2026-11-16'],
  'C3: W1 = 2026-10-01 (즉시 시험) · W2~W8 = 기존 월요일 주기');
select is((select count(*)::int from pg_temp.new_sessions() where status = 'scheduled'), 8, 'C4: 모두 scheduled (출결 · 관찰 · 리포트 자동 생성 없음)');
select is((select count(*)::int from public.class_sessions s join public.curriculum_lessons l on l.id = s.lesson_id
           where s.class_program_assignment_id = '794fbfb1-97d5-3231-a4bf-67ce781bf92c' and l.program_id = '4f54cc7e-620f-374e-8937-e808e2afc1a9' and l.week_no = s.week_no and l.status = 'published'), 8,
  'C5: 각 수업 = 같은 주차의 published SOYE-STARTER 차시');
select is(pg_temp.old_fp(), current_setting('test.old_before'), 'C6: 기존 STAGING-P8 수업(예정 4 · 완료 1) 불변');
select is(pg_temp.rec_fp(), current_setting('test.rec_before'), 'C7: 계약 · 출결 · 관찰 · 리포트 · 원아 불변');
select is((select status from public.contracts where id = '9b9eef88-6e5c-02ba-946a-1db2b34c06be'), 'active', 'C8: 계약 ACTIVE');

select is(pg_temp.starter_2026_1_staging_uat_sessions(), 'already_scheduled', 'I1: 두 번째 실행 = already_scheduled');
select is((select count(*)::int from public.class_sessions where class_program_assignment_id = '794fbfb1-97d5-3231-a4bf-67ce781bf92c'), 8, 'I2: 추가 행 없음');

-- W1 은 시작 가능한 상태 (부모 행 active · published · 필수 section) — 실제 시작은 BEFORE 확인 · 담당 교사가 필요 (여기서 시작하지 않는다)
select ok(private.is_active_assignment('794fbfb1-97d5-3231-a4bf-67ce781bf92c'), 'W1: 새 배정 active (시작 trigger 의 부모 조건)');
select is((select count(*)::int from unnest(private.required_lesson_sections()) r(code)
           where not exists (select 1 from public.lesson_sections s where s.lesson_id = '0e412aa2-d8f4-3247-a8d8-7c79a8768646' and s.section_code = r.code)), 0,
  'W2: W1 차시 필수 section 완비 (SS008)');
select is((select title from public.curriculum_lessons where id = '0e412aa2-d8f4-3247-a8d8-7c79a8768646'), '유치원 가는 날', 'W3: W1 차시 제목 = 원본');

-- N. 거부: 상태 변경 + 실행을 예외 블록 안에서 (블록이 끝나면 변경은 자동 취소 · pgTAP 결과는 그대로)
create or replace function pg_temp.refusal(p_setup text) returns text language plpgsql as $neg$
begin
  execute p_setup;
  perform pg_temp.starter_2026_1_staging_uat_sessions();
  raise exception 'NO_ERROR';
exception when others then
  return sqlerrm;
end;
$neg$;

select alike(pg_temp.refusal($$ delete from public.class_sessions where id = '6c20f425-1d4d-32e0-b40b-b688e83bbe85' $$), '%일부만%', 'N1: 일부만 있으면 거부');
select alike(pg_temp.refusal($$ set local session_replication_role = replica; update public.contracts set status = 'suspended' where id = '9b9eef88-6e5c-02ba-946a-1db2b34c06be' $$), '%active 가 아니다%', 'N2: 계약 suspended 면 거부');
select alike(pg_temp.refusal($$ insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000f0e02', 'real-person@school.kr') $$), '%합성 계정이 아닌 사용자%', 'N3: 합성 아닌 사용자가 있으면 거부');
select is((select count(*)::int from public.class_sessions where class_program_assignment_id = '794fbfb1-97d5-3231-a4bf-67ce781bf92c'), 8, 'N4: 거부 검사 후 상태 원래대로 (수업 8 · 계약 · 사용자 변경 없음)');

select * from finish();
rollback;
