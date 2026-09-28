-- =====================================================================
-- PHASE 07 · local validation hardening — P0 negative / invariant tests (pgTAP)
-- ---------------------------------------------------------------------
-- 실행: npx supabase test db   (local Supabase 전용 · remote 금지)
-- 전체가 하나의 transaction 이고 끝나면 rollback 된다 (fixture 잔존 없음).
-- p0_security_baseline.test.sql (30 assertions) 과 독립 — 이전 실행 결과에 의존하지 않는다.
--
-- 대상 (그룹):
--   A. Weekly 사진 0~3 · 4장째 거부 (서버)
--   B. Weekly 완료 최소 근거 (DEC-066) · 사진 · Growth5 · 인용 · AI 불필요
--   C. 숨김 리포트는 학부모 portal 에 나오지 않음 · 사유 비노출
--   D. 동시 effective 계약 1개 (Pilot 포함)
--   E. 완료 revision 불변 · 수정본 경로 · latest pointer 무결성
--   F. Portal 발급 · 중지 · token hash only · 만료 없음 (CO-12)
--   G. Entitlement (RPC 경로) · STARTER · AI(AR-8) · parent_portal(CO-12) · 정지/종료 = 읽기 전용
--      + PRE-CUTOVER: write gate 미설치 · legacy 쓰기 경로 유지 (gate 자체는 p0_post_cutover.test.sql)
--   H. 세션 보안 (+ M5 cutover 후 직접 status UPDATE 차단)
--   I. Quick Memo 작성자 전용 · 근거로 자동 사용 안 됨
--   J. Sales · HQ 민감 접근
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(116);

-- ---------------------------------------------------------------------
-- Fixtures (trigger 우회: replica 모드로 사실 행만 적재 · 가상 데이터)
--   Org A = STARTER active (반 a1 · a2 계약 범위, a3 범위 밖)
--   Org B = STANDARD active (반 b1)
--   Org C = 계약 없음 (반 c1)
-- ---------------------------------------------------------------------
set local session_replication_role = replica;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'hq-admin@test.local'),
  ('00000000-0000-0000-0000-00000000a002', 'hq-sales@test.local'),
  ('00000000-0000-0000-0000-00000000b001', 'director-a@test.local'),
  ('00000000-0000-0000-0000-00000000b002', 'teacher-a1@test.local'),
  ('00000000-0000-0000-0000-00000000b003', 'teacher-a2@test.local'),
  ('00000000-0000-0000-0000-00000000c001', 'director-b@test.local'),
  ('00000000-0000-0000-0000-00000000d001', 'teacher-c@test.local');

insert into public.profiles (user_id, display_name) values
  ('00000000-0000-0000-0000-00000000a001', 'HQ Admin'),
  ('00000000-0000-0000-0000-00000000a002', 'HQ Sales'),
  ('00000000-0000-0000-0000-00000000b001', 'Director A'),
  ('00000000-0000-0000-0000-00000000b002', 'Teacher A1'),
  ('00000000-0000-0000-0000-00000000b003', 'Teacher A2'),
  ('00000000-0000-0000-0000-00000000c001', 'Director B'),
  ('00000000-0000-0000-0000-00000000d001', 'Teacher C')
on conflict (user_id) do nothing;

insert into private.admin_users (user_id, role) values
  ('00000000-0000-0000-0000-00000000a001', 'admin'),
  ('00000000-0000-0000-0000-00000000a002', 'sales');

insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'Org A', 'active'),
  ('10000000-0000-0000-0000-00000000000b', 'Org B', 'active'),
  ('10000000-0000-0000-0000-00000000000c', 'Org C', 'active');

insert into public.organization_members (id, organization_id, user_id, role, status) values
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b001', 'director', 'active'),
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b002', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b003', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000c001', 'director', 'active'),
  ('20000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000d001', 'teacher', 'active');

insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '햇님반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '달님반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '구름반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '별님반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', '바다반', 2026, 'active');

-- Teacher A1 = 햇님반 · 구름반 / Teacher A2 = 달님반 / Teacher C = 바다반
insert into public.class_teachers (organization_id, class_id, organization_member_id) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a3', '20000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-0000000000a3'),
  ('10000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1');

insert into public.children (id, organization_id, class_id, name, status) values
  ('40000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '가상아이A1', 'active'),
  ('40000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a2', '가상아이A2', 'active'),
  ('40000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a3', '가상아이A3', 'active'),
  ('40000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '가상아이B1', 'active'),
  ('40000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '가상아이C1', 'active');

insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('50000000-0000-0000-0000-000000000001', 'TEST-P', 'Test Program', 8, 'published'),
  ('50000000-0000-0000-0000-000000000002', 'TEST-P2', 'Test Program 24', 24, 'published');

-- 차시마다 id 가 다르다: class_sessions_open_assignment_lesson_key 는 같은 배정 × 차시의
-- 열린 세션(scheduled · in_progress)을 하나만 허용한다.
insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status) values
  ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1, 1, '1주 수업', 'published'),
  ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 2, 1, '2주 수업', 'published'),
  ('52000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 2, 1, 'P2 2주 수업', 'published'),
  ('52000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000002', 9, 1, 'P2 9주 수업', 'published');

insert into public.lesson_sections (lesson_id, section_code, body) values
  ('51000000-0000-0000-0000-000000000001', 's13', '가정에서 오늘 만든 색을 함께 찾아보세요.');

update public.product_versions pv
set lifecycle = 'published', published_at = now()
from public.products p
where p.id = pv.product_id and p.code in ('starter', 'standard', 'pilot');

insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
select '60000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', pv.id, 'active',
       private.local_today() - 30, private.local_today() + 60
from public.product_versions pv join public.products p on p.id = pv.product_id
where p.code = 'starter';

insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
select '60000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', pv.id, 'active',
       private.local_today() - 30, private.local_today() + 60
from public.product_versions pv join public.products p on p.id = pv.product_id
where p.code = 'standard';

insert into public.contract_classes (organization_id, contract_id, class_id) values
  ('10000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-00000000000b', '60000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1');

-- a3 · c1 배정은 replica 모드로만 존재할 수 있다 (gate 가 켜진 뒤에는 만들 수 없는 상태를 재현)
insert into public.class_program_assignments (id, organization_id, class_id, program_id, status) values
  ('70000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', 'active'),
  ('70000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a3', '50000000-0000-0000-0000-000000000001', 'active'),
  ('70000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-000000000001', 'active'),
  ('70000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '50000000-0000-0000-0000-000000000001', 'active');

-- s1 진행 중(1주) · s2 예정(2주) · s3 완료(1주 · 지난 회차) · s4 범위 밖 반 · s5 계약 없는 기관
insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status, week_no) values
  ('80000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today(), 'in_progress', 1),
  ('80000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', private.local_today() + 7, 'scheduled', 2),
  ('80000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today() - 1, 'completed', 1),
  ('80000000-0000-0000-0000-0000000000a4', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a3', '70000000-0000-0000-0000-0000000000a3', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today(), 'in_progress', 1),
  ('80000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '70000000-0000-0000-0000-0000000000c1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today(), 'in_progress', 1);

-- 날짜는 서비스 기준일(private.local_today() · Asia/Seoul)로 잡는다. DB current_date(UTC)를 쓰면
-- 한국 월요일 00~09시에 "이번 주" 판정이 어긋난다 (IB-6).

-- 가상 사진 메타데이터 4장 (아이 A1 · s1)
insert into public.class_session_observation_media (id, organization_id, class_session_id, class_id, child_id, storage_path, mime_type, byte_size)
select ('85000000-0000-0000-0000-00000000000' || n)::uuid,
       '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1',
       '30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
       '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-0000000000a1/85000000-0000-0000-0000-00000000000' || n || '.jpg',
       'image/jpeg', 1000
from generate_series(1, 4) as n;

-- PHASE 08 (A4): Weekly 사진 선택은 동의 운영 상태 consented 원아의 사진만 (DEC-088) → 아이 A1 동의 기록
insert into public.child_media_consents (organization_id, child_id, status)
values ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a1', 'consented');

set local session_replication_role = origin;


-- ---------------------------------------------------------------------
-- helpers (invoker 권한 · 현재 role 의 RLS 로 실행)
-- ---------------------------------------------------------------------
create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

create or replace function pg_temp.rid() returns uuid language sql as $$
  select id from public.reports
  where child_id = '40000000-0000-0000-0000-0000000000a1' and report_type = 'weekly' and week_no = 1;
$$;

create or replace function pg_temp.draft_rev() returns uuid language sql as $$
  select id from public.report_revisions where report_id = pg_temp.rid() and status = 'draft';
$$;

create or replace function pg_temp.draft_ts() returns timestamptz language sql as $$
  select updated_at from public.report_revisions where report_id = pg_temp.rid() and status = 'draft';
$$;

create or replace function pg_temp.rev1() returns uuid language sql as $$
  select id from public.report_revisions where report_id = pg_temp.rid() and revision_no = 1;
$$;

create or replace function pg_temp.contract_ts(p_id uuid) returns timestamptz language sql as $$
  select updated_at from public.contracts where id = p_id;
$$;

-- 문장을 실행하고 영향 행 수 또는 SQLSTATE 를 돌려준다 (RLS 로 0행이 되는 경로 확인용)
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

-- 가상 portal token (43자 base64url 형식) 과 sha256 hex
select set_config('test.token', repeat('Ab3_', 10) || 'xyz', true);
select set_config('test.hash', encode(sha256(convert_to(repeat('Ab3_', 10) || 'xyz', 'UTF8')), 'hex'), true);

set local role authenticated;


-- =====================================================================
-- A · B · I — Weekly 작성 · 사진 0~3 · 최소 근거 · Quick Memo 비사용
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');

select lives_ok($$ select public.save_quick_memo('80000000-0000-0000-0000-0000000000a1', 'QM-SECRET-7F3 재료 부족', null) $$,
  'I: teacher saves quick memo');
select is((select count(*) from public.quick_memos)::int, 1, 'I: author reads own quick memo');

select lives_ok($$ select public.create_weekly_report_draft('40000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', 1) $$,
  'B: weekly draft created by deterministic assembly (no AI)');
select throws_ok($$ select public.complete_report_revision(pg_temp.draft_rev(), pg_temp.draft_ts()) $$,
  'RP006', null, 'B: complete without a completed observation is rejected (DEC-066)');

select lives_ok(
  $$ select public.save_class_observation('80000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
       '손가락으로 두 색을 섞어 보았다', null, 'complete', '[]'::jsonb, null) $$,
  'B: observation completed with no Growth5 and no child quote');

select lives_ok(
  $$ select public.save_report_draft(pg_temp.draft_rev(),
       '{"topic":"1주 수업","teacher_observation":"두 색을 섞어 보았다","family_conversation":"집에서 색 찾기"}'::jsonb,
       array['85000000-0000-0000-0000-000000000001','85000000-0000-0000-0000-000000000002','85000000-0000-0000-0000-000000000003']::uuid[],
       pg_temp.draft_ts()) $$,
  'A: 3 report photos allowed');
select is((select count(*) from public.report_revision_media where revision_id = pg_temp.draft_rev())::int, 3,
  'A: 3 photo refs stored');
select throws_ok(
  $$ insert into public.report_revision_media (organization_id, revision_id, media_id, sort_order)
     values ('10000000-0000-0000-0000-00000000000a', pg_temp.draft_rev(), '85000000-0000-0000-0000-000000000004', 3) $$,
  'RP008', null, 'A: 4th photo rejected server-side even by direct insert');
select throws_ok(
  $$ select public.save_report_draft(pg_temp.draft_rev(), '{"topic":"1주 수업"}'::jsonb,
       array['85000000-0000-0000-0000-000000000001','85000000-0000-0000-0000-000000000002',
             '85000000-0000-0000-0000-000000000003','85000000-0000-0000-0000-000000000004']::uuid[],
       pg_temp.draft_ts()) $$,
  'RP008', null, 'A: 4 photos via save RPC rejected');

select lives_ok(
  $$ select public.save_report_draft(pg_temp.draft_rev(),
       '{"topic":"1주 수업","teacher_observation":"두 색을 섞어 보았다"}'::jsonb, '{}'::uuid[], pg_temp.draft_ts()) $$,
  'B: draft saved without family connection');
select throws_ok($$ select public.complete_report_revision(pg_temp.draft_rev(), pg_temp.draft_ts()) $$,
  'RP006', null, 'B: complete without family connection is rejected (DEC-066)');

select lives_ok(
  $$ select public.save_report_draft(pg_temp.draft_rev(),
       '{"topic":"1주 수업","teacher_observation":"두 색을 섞어 보았다","family_conversation":"집에서 색 찾기"}'::jsonb,
       '{}'::uuid[], pg_temp.draft_ts()) $$,
  'A: 0 photos allowed · no quote');
select lives_ok($$ select public.complete_report_revision(pg_temp.draft_rev(), pg_temp.draft_ts()) $$,
  'B: weekly completes with no photo, no Growth5, no quote, no AI');

select is((select count(*) from public.report_revision_evidence where revision_id = pg_temp.rev1())::int, 1,
  'B: evidence snapshot recorded on completion');
select is(
  (select count(*) from public.report_revisions rv
    where rv.report_id = pg_temp.rid() and rv.content::text like '%QM-SECRET-7F3%')::int
  + (select count(*) from public.report_revision_evidence e
      where e.revision_id = pg_temp.rev1()
        and (coalesce(e.teacher_note_snapshot, '') like '%QM-SECRET-7F3%'
             or coalesce(e.child_voice_snapshot, '') like '%QM-SECRET-7F3%'))::int,
  0, 'I: quick memo is not used as report content or evidence');
select is((select latest_completed_revision_id from public.reports where id = pg_temp.rid()), pg_temp.rev1(),
  'E: latest_completed_revision_id points to the completed revision');


-- =====================================================================
-- E — 완료 revision 불변 · 수정본 · pointer
-- =====================================================================
select throws_ok(
  $$ select public.save_report_draft(pg_temp.rev1(), '{"topic":"변조"}'::jsonb, '{}'::uuid[],
       (select updated_at from public.report_revisions where id = pg_temp.rev1())) $$,
  'RP004', null, 'E: completed revision cannot be edited via RPC');
select is(pg_temp.try_sql(format($f$update public.report_revisions set content = '{"topic":"변조"}'::jsonb where id = %L$f$, pg_temp.rev1())),
  'rows=0', 'E: direct UPDATE of completed revision affects no rows (RLS)');
select throws_ok($$ select public.start_report_correction(pg_temp.rid(), '   ') $$,
  'RP005', null, 'E: correction requires a reason');
select lives_ok($$ select public.start_report_correction(pg_temp.rid(), '오타 수정') $$,
  'E: correction creates a working revision');
select is((select revision_no from public.report_revisions where report_id = pg_temp.rid() and status = 'draft'), 2,
  'E: correction revision is revision 2');
select throws_ok($$ select public.start_report_correction(pg_temp.rid(), '두 번째 수정') $$,
  'RP003', null, 'E: only one working revision at a time');
select is((select latest_completed_revision_id from public.reports where id = pg_temp.rid()), pg_temp.rev1(),
  'E: latest completed pointer unchanged while correcting');
select is((select content ->> 'topic' from public.report_revisions where id = pg_temp.rev1()), '1주 수업',
  'E: completed revision content unchanged');
select throws_ok(
  $$ update public.reports set latest_completed_revision_id = pg_temp.draft_rev() where id = pg_temp.rid() $$,
  '42501', null, 'E: clients cannot update the report pointer directly');

-- trigger 계층 (RLS · 권한과 별개): 권한 있는 연결 + 담당 교사 신원
reset role;
select throws_ok(
  $$ update public.report_revisions set content = '{"topic":"변조"}'::jsonb where id = pg_temp.rev1() $$,
  'RP004', null, 'E: trigger rejects completed revision update regardless of RLS');
select throws_ok(
  $$ update public.reports set latest_completed_revision_id = pg_temp.draft_rev() where id = pg_temp.rid() $$,
  'RP001', null, 'E: pointer cannot target a draft revision');
select throws_ok(
  $$ update public.reports set latest_completed_revision_id = gen_random_uuid() where id = pg_temp.rid() $$,
  'RP001', null, 'E: pointer cannot target a non-existent revision');
set local role authenticated;


-- =====================================================================
-- I — Quick Memo 다른 역할 비노출
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000b003');
select is((select count(*) from public.quick_memos)::int, 0, 'I: another teacher cannot read the memo');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*) from public.quick_memos)::int, 0, 'I: director cannot read the memo');
select pg_temp.act_as('00000000-0000-0000-0000-00000000a002');
select is((select count(*) from public.quick_memos)::int, 0, 'I: HQ Sales cannot read the memo');


-- =====================================================================
-- F · C — Portal 발급 · 숨김 · 중지
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select lives_ok($$ select public.issue_child_portal('40000000-0000-0000-0000-0000000000a1', current_setting('test.hash')) $$,
  'F: director issues child portal with hash only');
select throws_ok($$ select token_hash from public.child_portals $$,
  '42501', null, 'F: director cannot read token_hash');

reset role;
select set_config('test.pub',
  (select public_id::text from public.child_portals where child_id = '40000000-0000-0000-0000-0000000000a1' and status = 'active'), true);
select ok(
  (select p.token_hash = current_setting('test.hash')
          and row_to_json(p)::text not like '%' || current_setting('test.token') || '%'
   from public.child_portals p where p.public_id = current_setting('test.pub')::uuid),
  'F: raw token is not stored (sha256 only)');
select ok(
  (select expires_at is null from public.child_portals where public_id = current_setting('test.pub')::uuid),
  'F: no expiry imposed (CO-12 open)');

set local role anon;
select is(jsonb_array_length(public.read_child_portal(current_setting('test.pub')::uuid, current_setting('test.token')) -> 'this_week'), 1,
  'C: eligible completed weekly is visible to parent');
select is(public.read_child_portal(current_setting('test.pub')::uuid, repeat('Zz9-', 10) || 'abc'), null::jsonb,
  'F: wrong token returns no data');
select is(public.read_child_portal(current_setting('test.pub')::uuid, 'short'), null::jsonb,
  'F: malformed token returns no data');

reset role;
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select throws_ok($$ select public.hide_report(pg_temp.rid(), '  ') $$, 'RP005', null, 'C: hide requires a reason');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select throws_ok($$ select public.hide_report(pg_temp.rid(), '교사 숨김 시도') $$, 'RP002', null, 'C: teacher cannot hide');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select lives_ok($$ select public.hide_report(pg_temp.rid(), 'HIDE-REASON-Q9 동의 확인 중') $$, 'C: director hides report with reason');

reset role;
set local role anon;
select ok(
  (select jsonb_array_length(v -> 'this_week') = 0 and jsonb_array_length(v -> 'past') = 0
   from (select public.read_child_portal(current_setting('test.pub')::uuid, current_setting('test.token')) as v) x),
  'C: hidden report is not returned to parent');
select ok(
  (select v::text not like '%HIDE-REASON-Q9%' and v::text not like '%hidden%'
   from (select public.read_child_portal(current_setting('test.pub')::uuid, current_setting('test.token')) as v) x),
  'C: parent response exposes no hidden flag or reason');

reset role;
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select lives_ok($$ select public.unhide_report(pg_temp.rid(), '동의 확인 완료') $$, 'C: director unhides with reason');

reset role;
set local role anon;
select is(jsonb_array_length(public.read_child_portal(current_setting('test.pub')::uuid, current_setting('test.token')) -> 'this_week'), 1,
  'C: unhidden report is returned again');

reset role;
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select lives_ok(
  $$ select public.revoke_child_portal((select id from public.child_portals where public_id = current_setting('test.pub')::uuid)) $$,
  'F: director revokes portal');

reset role;
set local role anon;
select is(public.read_child_portal(current_setting('test.pub')::uuid, current_setting('test.token')), null::jsonb,
  'F: revoked portal can no longer read');
select throws_ok($$ select count(*) from public.child_portals $$, '42501', null, 'F: anon cannot select child_portals');
select throws_ok($$ select count(*) from public.children $$, '42501', null, 'F: anon cannot select children');
select throws_ok($$ select count(*) from public.report_revisions $$, '42501', null, 'F: anon cannot select report_revisions');
select throws_ok($$ select count(*) from public.quick_memos $$, '42501', null, 'I: anon cannot select quick_memos');

reset role;
select is(
  (select count(*) from public.audit_events
    where event_type in ('report.hidden', 'report.unhidden', 'portal.issued', 'portal.revoked'))::int, 4,
  'C/F: hide, unhide, portal issue and revoke are audited');
select is(
  (select reason from public.audit_events where event_type = 'report.hidden'), 'HIDE-REASON-Q9 동의 확인 중',
  'C: hide reason recorded in audit (staff-only)');


-- =====================================================================
-- G — Entitlement · 정책 blocker · write gate
-- =====================================================================
select ok(
  (select 'CO-12' = any (blocked_by) and not is_released from public.platform_capabilities where code = 'parent_portal'),
  'G: parent_portal remains blocked by CO-12');
select ok(
  (select 'AR-8' = any (blocked_by) and not is_released from public.platform_capabilities where code = 'ai_assist'),
  'G: ai_assist remains blocked by AR-8');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ insert into public.contracts (organization_id, product_version_id, start_date, end_date)
     select '10000000-0000-0000-0000-00000000000c', pv.id, private.local_today(), private.local_today() + 90
     from public.product_versions pv join public.products p on p.id = pv.product_id where p.code = 'standard' $$,
  'G: HQ admin creates a draft STANDARD contract for Org C');
select ok(
  (select (e ->> 'ok')::boolean = false and e ->> 'reason' = 'policy_blocked'
   from jsonb_array_elements(public.contract_readiness(
          (select id from public.contracts where organization_id = '10000000-0000-0000-0000-00000000000c')) -> 'items') e
   where e ->> 'code' = 'feature:parent_portal'),
  'G: readiness shows parent_portal policy_blocked (CO-12)');
select ok(
  (select (e ->> 'ok')::boolean = false and e ->> 'reason' = 'policy_blocked'
   from jsonb_array_elements(public.contract_readiness(
          (select id from public.contracts where organization_id = '10000000-0000-0000-0000-00000000000c')) -> 'items') e
   where e ->> 'code' = 'feature:ai_assist'),
  'G: readiness shows ai_assist policy_blocked (AR-8)');
select ok(
  (select (public.contract_readiness(
     (select id from public.contracts where organization_id = '10000000-0000-0000-0000-00000000000c')) ->> 'ready')::boolean = false),
  'G: contract with policy-blocked features is not ready to activate');
select is(private.class_ai_capability_allowed('30000000-0000-0000-0000-0000000000b1', 'c1'), false,
  'G: AI C1 blocked at runtime even with STANDARD contract (AR-8)');
select is(private.org_has_feature('10000000-0000-0000-0000-00000000000a', 'director_dashboard'), false,
  'G: STARTER has no director_dashboard');
select is(private.org_has_feature('10000000-0000-0000-0000-00000000000b', 'director_dashboard'), true,
  'G: STANDARD has director_dashboard (control)');
select is(private.class_write_allowed('30000000-0000-0000-0000-0000000000a1', 'weekly_report'), true,
  'G: STARTER weekly permitted for in-scope class');
select is(private.class_write_allowed('30000000-0000-0000-0000-0000000000a3', 'class_mode'), false,
  'G: class outside contract scope has no write entitlement');

-- PRE-CUTOVER (G-1): normal migration 만 적용된 상태에서는 entitlement write gate 가 없다.
-- 기존(legacy) 운영 쓰기 경로는 계약 mapping 전에도 막히지 않아야 한다.
-- gate 자체 검증(EN001 · EN002 · EN003 · origin_contract_id)은 p0_post_cutover.test.sql 로 옮겼다.
reset role;
select is((select count(*) from pg_catalog.pg_trigger where tgname like '%entitlement_gate%')::int, 0,
  'PRE: normal migrations install no entitlement write gate triggers');
select ok(to_regprocedure('private.gate_class_record_write()') is null,
  'PRE: gate functions exist only in the cutover SQL');
select lives_ok(
  $$ insert into public.class_program_assignments (organization_id, class_id, program_id, status)
     values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a3', '50000000-0000-0000-0000-000000000002', 'active') $$,
  'PRE: out-of-scope class assignment is not blocked before cutover (legacy compatible)');
select lives_ok(
  $$ insert into public.class_program_assignments (id, organization_id, class_id, program_id, status)
     values ('70000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000002', 'active') $$,
  'PRE: in-scope class assignment permitted');
select is((select origin_contract_id from public.class_program_assignments where id = '70000000-0000-0000-0000-0000000000a2'),
  null::uuid, 'PRE: origin_contract_id provenance is recorded only after cutover');
select lives_ok(
  $$ insert into public.class_sessions (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
     values ('10000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '70000000-0000-0000-0000-0000000000c1',
             '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', private.local_today() + 7, 'scheduled') $$,
  'PRE: organization without contract can still schedule a session (legacy path)');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d001');
select lives_ok(
  $$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000c1',
       '[{"child_id":"40000000-0000-0000-0000-0000000000c1","attendance_status":"present"}]'::jsonb) $$,
  'PRE: legacy attendance RPC still works for an unmapped organization');
select lives_ok(
  $$ select public.save_class_session_observation_atomic('80000000-0000-0000-0000-0000000000c1', '40000000-0000-0000-0000-0000000000c1',
       null, '가상 legacy 관찰', 'complete', array['color_expression'], null) $$,
  'PRE: legacy observation RPC (legacy teacher page) still works for an unmapped organization');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d001');
select throws_ok(
  $$ select public.save_class_observation('80000000-0000-0000-0000-0000000000c1', '40000000-0000-0000-0000-0000000000c1',
       '관찰', null, 'complete', '[]'::jsonb, null) $$,
  'OB007', null, 'G: organization without contract cannot write observations');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select throws_ok(
  $$ select public.save_class_observation('80000000-0000-0000-0000-0000000000a4', '40000000-0000-0000-0000-0000000000a3',
       '관찰', null, 'complete', '[]'::jsonb, null) $$,
  'OB007', null, 'G: class outside contract scope cannot write observations');

-- 정규 기준 인원 초과 이벤트 (DEC-095): 여러 명을 한 번에 등록 · 이동해도 넘어섬 1건만 기록
reset role;
select lives_ok(
  $$ insert into public.children (organization_id, class_id, name, status)
     select '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a2', '가상-대량-' || n, 'active'
     from generate_series(1, 16) as n $$,
  'G: bulk registration past 15 is allowed (regular)');
select is(
  (select count(*) from public.audit_events
    where event_type = 'capacity.overage_started' and target_id = '30000000-0000-0000-0000-0000000000a2')::int, 1,
  'G: bulk registration records exactly one overage_started event');

-- 계약 정지 = 읽기 전용 (DEC-050 · DEC-052)
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select throws_ok(
  $$ select public.change_contract_status('60000000-0000-0000-0000-00000000000a', 'suspended', '  ',
       pg_temp.contract_ts('60000000-0000-0000-0000-00000000000a')) $$,
  'CT004', null, 'G: suspend requires a reason');
select lives_ok(
  $$ select public.change_contract_status('60000000-0000-0000-0000-00000000000a', 'suspended', '운영 점검',
       pg_temp.contract_ts('60000000-0000-0000-0000-00000000000a')) $$,
  'G: HQ admin suspends contract with reason');
select is(private.org_service_mode('10000000-0000-0000-0000-00000000000a'), 'read_only',
  'G: suspended contract puts organization in read_only');

select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select throws_ok(
  $$ select public.save_class_observation('80000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
       '정지 중 기록', null, 'complete', '[]'::jsonb, null) $$,
  'OB007', null, 'G: suspended contract blocks new observation writes');
select throws_ok(
  $$ select public.create_weekly_report_draft('40000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', 2) $$,
  'RP007', null, 'G: suspended contract blocks new weekly reports');
select is((select count(*) from public.reports where organization_id = '10000000-0000-0000-0000-00000000000a')::int, 1,
  'G: existing records remain readable while read_only');

select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.change_contract_status('60000000-0000-0000-0000-00000000000a', 'active', '점검 완료',
       pg_temp.contract_ts('60000000-0000-0000-0000-00000000000a')) $$,
  'G: HQ admin resumes contract with reason');


-- =====================================================================
-- D — 동시 effective 계약 1개 (Pilot 포함)
-- =====================================================================
select lives_ok(
  $$ insert into public.contracts (organization_id, product_version_id, start_date, end_date)
     select '10000000-0000-0000-0000-00000000000a', pv.id, private.local_today() + 10, private.local_today() + 100
     from public.product_versions pv join public.products p on p.id = pv.product_id where p.code = 'starter' $$,
  'D: overlapping draft contract may exist (not effective)');
select throws_ok(
  $$ select public.activate_contract(c.id, c.updated_at)
     from public.contracts c
     join public.product_versions pv on pv.id = c.product_version_id
     join public.products p on p.id = pv.product_id
     where c.organization_id = '10000000-0000-0000-0000-00000000000a' and c.status = 'draft' and p.code = 'starter' $$,
  'CT003', null, 'D: activating an overlapping regular contract is rejected');
select lives_ok(
  $$ insert into public.contracts (organization_id, product_version_id, start_date, end_date)
     select '10000000-0000-0000-0000-00000000000a', pv.id, private.local_today(), private.local_today() + 20
     from public.product_versions pv join public.products p on p.id = pv.product_id where p.code = 'pilot' $$,
  'D: pilot draft for the same organization may exist');
select throws_ok(
  $$ select public.activate_contract(c.id, c.updated_at)
     from public.contracts c
     join public.product_versions pv on pv.id = c.product_version_id
     join public.products p on p.id = pv.product_id
     where c.organization_id = '10000000-0000-0000-0000-00000000000a' and c.status = 'draft' and p.code = 'pilot' $$,
  'CT003', null, 'D: pilot cannot be effective concurrently with a regular contract');
select throws_ok(
  $$ insert into public.contracts (organization_id, product_version_id, start_date, end_date, status)
     select '10000000-0000-0000-0000-00000000000c', pv.id, private.local_today(), private.local_today() + 30, 'active'
     from public.product_versions pv join public.products p on p.id = pv.product_id where p.code = 'starter' $$,
  '42501', null, 'D: contracts cannot be inserted directly as active');

select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select throws_ok(
  $$ insert into public.contracts (organization_id, product_version_id, start_date, end_date)
     select '10000000-0000-0000-0000-00000000000a', pv.id, private.local_today() + 200, private.local_today() + 300
     from public.product_versions pv join public.products p on p.id = pv.product_id where p.code = 'starter' $$,
  '42501', null, 'D: director cannot create contracts');


-- =====================================================================
-- H — 세션 보안
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000b003');
select throws_ok($$ select public.confirm_session_before('80000000-0000-0000-0000-0000000000a2', true, true) $$,
  'SS002', null, 'H: non-assigned teacher cannot record BEFORE');
select throws_ok($$ select public.start_class_session('80000000-0000-0000-0000-0000000000a2') $$,
  'SS002', null, 'H: non-assigned teacher cannot start');

select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select throws_ok($$ select public.start_class_session('80000000-0000-0000-0000-0000000000a2') $$,
  'SS004', null, 'H: start without BEFORE confirmation rejected');
select throws_ok($$ select public.finish_class_session('80000000-0000-0000-0000-0000000000a2') $$,
  'SS003', null, 'H: scheduled -> completed via finish impossible');
select throws_ok($$ select public.recover_complete_class_session('80000000-0000-0000-0000-0000000000a1', '교사 복구 시도') $$,
  'SS002', null, 'H: teacher cannot recovery-complete');

select pg_temp.act_as('00000000-0000-0000-0000-00000000a002');
select throws_ok($$ select public.recover_complete_class_session('80000000-0000-0000-0000-0000000000a1', '영업 복구 시도') $$,
  null::char(5), null::text, 'H: HQ Sales cannot recovery-complete');

select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select throws_ok($$ select public.recover_complete_class_session('80000000-0000-0000-0000-0000000000a2', '사유') $$,
  'SS003', null, 'H: recovery cannot complete a scheduled session');
select throws_ok($$ select public.recover_complete_class_session('80000000-0000-0000-0000-0000000000a3', '사유') $$,
  'SS003', null, 'H: recovery cannot re-complete a completed session');
select throws_ok($$ select public.recover_complete_class_session('80000000-0000-0000-0000-0000000000a1', '   ') $$,
  'SS006', null, 'H: recovery requires a reason');
select lives_ok($$ select public.recover_complete_class_session('80000000-0000-0000-0000-0000000000a1', '교사 기기 문제로 종료 불가') $$,
  'H: director recovery in_progress -> completed with reason');
select is(
  (select completion_kind || '|' || status from public.class_sessions where id = '80000000-0000-0000-0000-0000000000a1'),
  'recovery|completed', 'H: recovered session is marked as recovery completion');

-- legacy 화면 계열(G-2 rollout · Production 기본)의 수업 시작: M5 전에는 담당 교사의 직접 status UPDATE 가 동작한다
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select is(pg_temp.try_sql($f$update public.class_sessions set status = 'in_progress' where id = '80000000-0000-0000-0000-0000000000a2'$f$),
  'rows=1', 'PRE-M5: legacy route direct start (scheduled -> in_progress) still works for the assigned teacher');
reset role;

-- M5 cutover 시뮬레이션 (이 transaction 안에서만 · rollback): 직접 status UPDATE 회수
reset role;
revoke update (status) on public.class_sessions from authenticated;
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select throws_ok(
  $$ update public.class_sessions set status = 'completed' where id = '80000000-0000-0000-0000-0000000000a2' $$,
  '42501', null, 'H: after M5 cutover, direct status UPDATE (scheduled -> completed) is denied');


-- =====================================================================
-- J — Sales · HQ 민감 접근
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000a002');
-- PRE-G2: 차단 검증은 supabase/cutover/tests/G2_post_cutover.test.sql (G-2 cutover 적용 후)
select ok((select count(*) from public.children) > 0, 'PRE-G2: legacy Sales-via-admin children read not revoked before G-2');
select ok((select count(*) from public.class_session_observations) > 0, 'PRE-G2: legacy Sales-via-admin observation read not revoked before G-2');
select is((select count(*) from public.reports)::int, 0, 'J: Sales cannot read reports');
select is((select count(*) from public.report_revisions)::int, 0, 'J: Sales cannot read report revisions');
select is((select count(*) from public.child_portals)::int, 0, 'J: Sales cannot read portals');
select throws_ok(
  $$ select public.hq_support_open_observation(
       (select id from public.class_session_observations limit 1), '영업 열람 시도') $$,
  '42501', null, 'J: Sales cannot use support access');

reset role;
select set_config('test.obs',
  (select id::text from public.class_session_observations where child_id = '40000000-0000-0000-0000-0000000000a1'), true);
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select ok((select count(*) from public.class_session_observations) > 0, 'PRE-G2: HQ admin legacy observation read not revoked before G-2');
select is((select count(*) from public.report_revisions)::int, 0, 'J: HQ admin has no blanket report content SELECT');
select throws_ok($$ select public.hq_support_open_observation(current_setting('test.obs')::uuid, '') $$,
  'HS001', null, 'J: support access requires a reason');
select lives_ok($$ select public.hq_support_open_observation(current_setting('test.obs')::uuid, '학부모 문의 확인') $$,
  'J: HQ admin support access with reason');
select is(
  (select count(*) from public.audit_events
    where event_type = 'support.observation_opened' and reason = '학부모 문의 확인')::int, 1,
  'J: support access is audited with its reason');

-- 계약 종료 = 읽기 전용 (마지막: 되돌릴 수 없는 전환)
select lives_ok(
  $$ select public.change_contract_status('60000000-0000-0000-0000-00000000000b', 'ended', '계약 만료 처리',
       pg_temp.contract_ts('60000000-0000-0000-0000-00000000000b')) $$,
  'G: HQ admin ends contract with reason');
select is(private.org_service_mode('10000000-0000-0000-0000-00000000000b'), 'read_only',
  'G: ended contract puts organization in read_only');
select is(private.class_write_allowed('30000000-0000-0000-0000-0000000000b1', 'class_mode'), false,
  'G: ended contract blocks class mode writes');

reset role;

select * from finish();
rollback;
