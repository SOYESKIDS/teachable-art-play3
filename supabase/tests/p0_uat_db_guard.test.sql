-- =====================================================================
-- PHASE UAT-DB-GUARD — 미래 수업 쓰기 · 학부모 공유 신규 발급 DB 최종 판정 (pgTAP)
-- ---------------------------------------------------------------------
-- 실행: npx supabase test db   (local Supabase 전용 · remote 금지) · 하나의 transaction · rollback
-- 앱 서버 행동을 거치지 않는 "직접 호출"(RPC · PostgREST 표 쓰기 · Storage 정책)을 검증한다.
-- fixture 는 p0_phase08_security.test.sql 과 같은 가상 기관 A (STARTER active) + 아래 추가 수업.
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

set local session_replication_role = replica;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'hq-admin@test.local'),
  ('00000000-0000-0000-0000-00000000a002', 'hq-sales@test.local'),
  ('00000000-0000-0000-0000-00000000b001', 'director-a@test.local'),
  ('00000000-0000-0000-0000-00000000b002', 'teacher-a1@test.local'),
  ('00000000-0000-0000-0000-00000000b003', 'teacher-a2@test.local'),
  ('00000000-0000-0000-0000-00000000b004', 'director-a2@test.local'),
  ('00000000-0000-0000-0000-00000000c001', 'director-b@test.local'),
  ('00000000-0000-0000-0000-00000000c002', 'teacher-b@test.local'),
  ('00000000-0000-0000-0000-00000000e001', 'director-l@test.local'),
  ('00000000-0000-0000-0000-00000000e002', 'teacher-l@test.local'),
  ('00000000-0000-0000-0000-00000000f001', 'director-p@test.local'),
  ('00000000-0000-0000-0000-000000009001', 'new-teacher-1@test.local'),
  ('00000000-0000-0000-0000-000000009002', 'new-teacher-2@test.local');

insert into public.profiles (user_id, display_name)
select id, split_part(email, '@', 1) from auth.users
where email like '%@test.local'
on conflict (user_id) do nothing;

insert into private.admin_users (user_id, role) values
  ('00000000-0000-0000-0000-00000000a001', 'admin'),
  ('00000000-0000-0000-0000-00000000a002', 'sales');

insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'Org A', 'active'),
  ('10000000-0000-0000-0000-00000000000b', 'Org B', 'active'),
  ('10000000-0000-0000-0000-00000000000e', 'Org L', 'active'),
  ('10000000-0000-0000-0000-00000000000f', 'Org P', 'active'),
  ('10000000-0000-0000-0000-00000000000d', 'Org Q', 'active');

insert into public.organization_members (id, organization_id, user_id, role, status) values
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b001', 'director', 'active'),
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b002', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b003', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000c001', 'director', 'active'),
  ('20000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000c002', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000e001', 'director', 'active'),
  ('20000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000e002', 'teacher', 'active'),
  ('20000000-0000-0000-0000-0000000000f1', '10000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000f001', 'director', 'active');

insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '햇님반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '달님반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '구름반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000a4', '10000000-0000-0000-0000-00000000000a', '무지개반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '별님반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-00000000000b', '옛반', 2025, 'archived'),
  ('30000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000e', '바다반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000f1', '10000000-0000-0000-0000-00000000000f', '파일럿1반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000f2', '10000000-0000-0000-0000-00000000000f', '파일럿2반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000f3', '10000000-0000-0000-0000-00000000000f', '파일럿3반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000f4', '10000000-0000-0000-0000-00000000000f', '파일럿4반', 2026, 'active'),
  ('30000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-00000000000d', '준비반', 2026, 'active');

insert into public.class_teachers (organization_id, class_id, organization_member_id) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a3', '20000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-0000000000a3'),
  ('10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b2'),
  ('10000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-0000000000e2');

insert into public.children (id, organization_id, class_id, name, status) values
  ('40000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '가상아이A1', 'active'),
  ('40000000-0000-0000-0000-0000000000a5', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '가상아이A5', 'active'),
  ('40000000-0000-0000-0000-0000000000a6', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '가상아이A6', 'active'),
  ('40000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a3', '가상아이A3', 'active'),
  ('40000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '가상아이B1', 'active'),
  ('40000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e1', '가상아이L1', 'active'),
  ('40000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e1', '가상아이L2', 'inactive');

-- 16명 반: Pilot f3 (한도 15 초과) · 정규 a4 (초과 인원 허용)
insert into public.children (organization_id, class_id, name, status)
select '10000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-0000000000f3', '파일럿아이' || n, 'active'
from generate_series(1, 16) as n;
insert into public.children (organization_id, class_id, name, status)
select '10000000-0000-0000-0000-00000000000d', '30000000-0000-0000-0000-0000000000d1', '준비아이' || n, 'active'
from generate_series(1, 16) as n;
insert into public.children (organization_id, class_id, name, status)
select '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a4', '무지개아이' || n, 'active'
from generate_series(1, 16) as n;

-- 동의 운영 상태: A1 consented · A6 declined · A5 기록 없음(unknown)
insert into public.child_media_consents (organization_id, child_id, status) values
  ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a1', 'consented'),
  ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a6', 'declined');

insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('50000000-0000-0000-0000-000000000001', 'P08-TEST', 'Test Program', 8, 'published');

-- 1 · 3 · 4주 = 필수 섹션 전체 · 2주 = 섹션 없음
insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status)
select ('51000000-0000-0000-0000-00000000000' || w)::uuid, '50000000-0000-0000-0000-000000000001', w, 1, w || '주 수업', 'published'
from generate_series(1, 4) as w;

insert into public.lesson_sections (lesson_id, section_code, body)
select ('51000000-0000-0000-0000-00000000000' || w)::uuid, s.code, '가상 ' || s.code
from unnest(array[1, 3, 4]) as w
cross join unnest(private.required_lesson_sections()) as s(code);

update public.product_versions pv
set lifecycle = 'published', published_at = now()
from public.products p
where p.id = pv.product_id and p.code in ('starter', 'standard', 'pilot');

insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
select c.id::uuid, c.org::uuid, pv.id, c.status, private.local_today() + c.s, private.local_today() + c.e
from (values
  ('60000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'starter',  'active', -30, 60),
  ('60000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'standard', 'active', -30, 60),
  ('60000000-0000-0000-0000-00000000000f', '10000000-0000-0000-0000-00000000000f', 'pilot',    'active',  -7, 21),
  ('60000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-00000000000d', 'pilot',    'draft',    7, 34)
) as c(id, org, product, status, s, e)
join public.products p on p.code = c.product
join public.product_versions pv on pv.product_id = p.id;

insert into public.contract_classes (organization_id, contract_id, class_id) values
  ('10000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-00000000000b', '60000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1'),
  ('10000000-0000-0000-0000-00000000000b', '60000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b2'),
  ('10000000-0000-0000-0000-00000000000f', '60000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-0000000000f1');

insert into public.class_program_assignments (id, organization_id, class_id, program_id, status) values
  ('70000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', 'active'),
  ('70000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a3', '50000000-0000-0000-0000-000000000001', 'active'),
  ('70000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-000000000001', 'active'),
  ('70000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e1', '50000000-0000-0000-0000-000000000001', 'active');

insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status, week_no) values
  -- sA1 1주 예정 (시작 성공) · sA2 2주 예정 (섹션 없음) · sA3 3주 진행 중 · sA4 4주 예정
  ('80000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today(), 'scheduled', 1),
  ('80000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', private.local_today(), 'scheduled', 2),
  ('80000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003', private.local_today(), 'in_progress', 3),
  ('80000000-0000-0000-0000-0000000000a4', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000004', private.local_today() + 7, 'scheduled', 4),
  -- sX 범위 밖 반 a3 진행 중
  ('80000000-0000-0000-0000-0000000000a5', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a3', '70000000-0000-0000-0000-0000000000a3', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today(), 'in_progress', 1),
  ('80000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '70000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today(), 'in_progress', 1),
  -- legacy 기관: sL1 예정 · sL2 진행 중
  ('80000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e1', '70000000-0000-0000-0000-0000000000e1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', private.local_today(), 'scheduled', 1),
  ('80000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e1', '70000000-0000-0000-0000-0000000000e1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003', private.local_today(), 'in_progress', 3);

insert into public.class_session_observations (id, organization_id, class_session_id, class_id, child_id, teacher_note, record_status, taxonomy) values
  ('90000000-0000-0000-0000-0000000000a4', '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a4', '30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', '미리 적은 관찰', 'complete', 'growth5'),
  ('90000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a3', '30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', '색을 섞어 보았다', 'complete', 'growth5'),
  ('90000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '80000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b1', '모양을 이어 붙였다', 'complete', 'growth5'),
  ('90000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-00000000000e', '80000000-0000-0000-0000-0000000000e2', '30000000-0000-0000-0000-0000000000e1', '40000000-0000-0000-0000-0000000000e1', 'legacy 관찰', 'complete', 'legacy_domains');

-- 사진 metadata: m1 A1 저장 · m2 A5(동의 없음) 저장 · m3 A1 숨김 · m4 A1 숨김(저장소 객체 남음)
insert into public.class_session_observation_media (id, organization_id, class_session_id, class_id, child_id, storage_path, mime_type, byte_size, hidden_at, storage_status)
select m.id::uuid, '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a3', '30000000-0000-0000-0000-0000000000a1', m.child::uuid,
       '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000a3/' || m.child || '/' || m.id || '.jpg',
       'image/jpeg', 1000, m.hidden, m.storage
from (values
  ('85000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000a1', null::timestamptz, 'stored'),
  ('85000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-0000000000a5', null::timestamptz, 'stored'),
  ('85000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-0000000000a1', now(), 'delete_pending'),
  ('85000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-0000000000a1', now(), 'delete_pending')
) as m(id, child, hidden, storage);

insert into storage.objects (bucket_id, name) values
  ('observation-media', '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000a3/40000000-0000-0000-0000-0000000000a1/85000000-0000-0000-0000-000000000004.jpg'),
  ('observation-media', '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000a3/40000000-0000-0000-0000-0000000000a6/85000000-0000-0000-0000-0000000000d1.jpg');

-- legacy 성장 리포트 · 공유 (token 은 43자 base64url 가상 값)
insert into public.child_growth_reports (id, organization_id, class_id, child_id, period_start, period_end, title, status,
                                         growth_changes, observation_summary, next_support, completed_at, completed_by) values
  ('95000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e1', '40000000-0000-0000-0000-0000000000e1',
   private.local_today() - 30, private.local_today(), '가상 리포트 L1', 'complete', '변화', '요약', '지원', now(), '00000000-0000-0000-0000-00000000e002'),
  ('95000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-0000000000e1', '40000000-0000-0000-0000-0000000000e2',
   private.local_today() - 30, private.local_today(), '가상 리포트 L2', 'complete', '변화', '요약', '지원', now(), '00000000-0000-0000-0000-00000000e002'),
  ('95000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1',
   private.local_today() - 30, private.local_today(), '가상 리포트 A1', 'complete', '변화', '요약', '지원', now(), '00000000-0000-0000-0000-00000000b002');
insert into public.child_growth_reports (id, organization_id, class_id, child_id, period_start, period_end, title, status) values
  ('95000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b1',
   private.local_today() - 30, private.local_today(), '가상 리포트 B1 (작성 중)', 'draft');

insert into public.child_growth_report_shares (id, organization_id, report_id, token_hash, expires_at)
select s.id::uuid, s.org::uuid, s.report::uuid, encode(sha256(convert_to(s.token, 'UTF8')), 'hex'), now() + interval '10 days'
from (values
  ('96000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000e', '95000000-0000-0000-0000-0000000000e1', repeat('Ab3_', 10) || 'xyz'),
  ('96000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-00000000000e', '95000000-0000-0000-0000-0000000000e2', repeat('Cd4_', 10) || 'xyz'),
  ('96000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '95000000-0000-0000-0000-0000000000a1', repeat('Ef5_', 10) || 'xyz')
) as s(id, org, report, token);

-- ---------------------------------------------------------------------
-- UAT-DB-GUARD fixture (가상 · 반 a1 · 담당 교사 b002 · 5~8주 차시 · 필수 섹션 있음)
--   f1 미래(+5) 예정 · 시작 전 확인 있음   f2 미래(+3) 진행 중(과거 데이터 가정)
--   f3 미래(+10) 예정 (취소 정책 확인)     c9 지난(-7) 진행 중
-- ---------------------------------------------------------------------
insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status)
select ('51000000-0000-0000-0000-00000000000' || w)::uuid, '50000000-0000-0000-0000-000000000001', w, 1, w || '주 수업', 'published'
from generate_series(5, 8) as w;

insert into public.lesson_sections (lesson_id, section_code, body)
select ('51000000-0000-0000-0000-00000000000' || w)::uuid, s.code, '가상 ' || s.code
from generate_series(5, 8) as w
cross join unnest(private.required_lesson_sections()) as s(code);

insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status, week_no) values
  ('80000000-0000-0000-0000-0000000000f1', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000005', private.local_today() + 5, 'scheduled', 5),
  ('80000000-0000-0000-0000-0000000000f2', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000006', private.local_today() + 3, 'in_progress', 6),
  ('80000000-0000-0000-0000-0000000000f3', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000007', private.local_today() + 10, 'scheduled', 7),
  ('80000000-0000-0000-0000-0000000000c9', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000008', private.local_today() - 7, 'in_progress', 8);

insert into public.session_before_confirmations (organization_id, class_id, class_session_id, safety_confirmed, privacy_confirmed, confirmed_by) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '80000000-0000-0000-0000-0000000000f1', true, true, '00000000-0000-0000-0000-00000000b002');

insert into storage.objects (bucket_id, name) values
  ('observation-media', '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000f2/40000000-0000-0000-0000-0000000000a1/85000000-0000-0000-0000-0000000000f2.jpg');

-- 기존 학부모 공유 링크 (중지 기능 유지 확인용 · 원아 a5)
insert into public.child_portals (id, organization_id, child_id, token_hash, status, issued_by) values
  ('97000000-0000-0000-0000-0000000000a5', '10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a5', repeat('a', 64), 'active', '00000000-0000-0000-0000-00000000b001');

set local session_replication_role = origin;


-- ---------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------
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

create or replace function pg_temp.share_rows(p_share uuid, p_token text) returns int language plpgsql as $$
declare
  v int;
begin
  execute 'set local role anon';
  select count(*) into v from public.read_shared_growth_report(p_share, p_token);
  execute 'set local role authenticated';
  return v;
end;
$$;

create or replace function pg_temp.member_ts(p_id uuid) returns timestamptz language sql as $$
  select updated_at from public.organization_members where id = p_id;
$$;

create or replace function pg_temp.contract_ts(p_id uuid) returns timestamptz language sql as $$
  select updated_at from public.contracts where id = p_id;
$$;

create or replace function pg_temp.draft_rev(p_child uuid) returns uuid language sql as $$
  select rv.id from public.report_revisions rv join public.reports r on r.id = rv.report_id
  where r.child_id = p_child and r.week_no = 3 and rv.status = 'draft';
$$;

create or replace function pg_temp.draft_ts(p_child uuid) returns timestamptz language sql as $$
  select rv.updated_at from public.report_revisions rv join public.reports r on r.id = rv.report_id
  where r.child_id = p_child and r.week_no = 3 and rv.status = 'draft';
$$;

set local role authenticated;


-- =====================================================================
-- DENIED — 미래 수업 직접 쓰기 (SS009) · 담당 교사 b002
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select is(pg_temp.try_sql($q$select public.confirm_session_before('80000000-0000-0000-0000-0000000000f3', true, true)$q$), 'SS009', 'future: confirm_session_before RPC denied');
select is(pg_temp.try_sql($q$select public.start_class_session('80000000-0000-0000-0000-0000000000f1')$q$), 'SS009', 'future: start_class_session RPC denied (confirmation · sections · entitlement all OK)');
select is(pg_temp.try_sql($q$insert into public.class_session_transitions (organization_id, class_id, class_session_id, transition) values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '80000000-0000-0000-0000-0000000000f1', 'start')$q$), 'SS009', 'future: direct transition INSERT (start) denied');
select is(pg_temp.try_sql($q$update public.class_sessions set status = 'in_progress' where id = '80000000-0000-0000-0000-0000000000f1'$q$), 'SS009', 'future: legacy direct status UPDATE denied');
select is(pg_temp.try_sql($q$select public.finish_class_session('80000000-0000-0000-0000-0000000000f2')$q$), 'SS009', 'future: finish_class_session RPC denied');
select is(pg_temp.try_sql($q$select public.save_quick_memo('80000000-0000-0000-0000-0000000000f1', '미래 메모', null)$q$), 'SS009', 'future: save_quick_memo RPC denied');
select is(pg_temp.try_sql($q$insert into public.quick_memos (organization_id, class_id, class_session_id, body) values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', '80000000-0000-0000-0000-0000000000f1', '직접 메모')$q$), 'SS009', 'future: direct quick_memos INSERT denied');
select is(pg_temp.try_sql($q$select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000f1', '[{"child_id":"40000000-0000-0000-0000-0000000000a1","attendance_status":"present"}]'::jsonb)$q$), 'SS009', 'future: attendance RPC denied');
select is(pg_temp.try_sql($q$insert into public.class_session_attendance (organization_id, class_session_id, class_id, child_id, attendance_status) values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', 'present')$q$), 'SS009', 'future: direct attendance INSERT denied');
select is(pg_temp.try_sql($q$select public.save_class_observation('80000000-0000-0000-0000-0000000000f2', '40000000-0000-0000-0000-0000000000a6', '미래 관찰', null, 'complete', '[{"metric_code":"creative_attempt","stage":"together"}]'::jsonb, null)$q$), 'SS009', 'future: save_class_observation RPC denied (in-progress future session)');
select is(pg_temp.try_sql($q$insert into public.class_session_observations (organization_id, class_session_id, class_id, child_id, teacher_note, record_status) values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a6', '직접 legacy 관찰', 'complete')$q$), 'SS009', 'future: direct legacy observation INSERT denied');
select is(pg_temp.try_sql($q$insert into public.class_session_observation_media (organization_id, class_session_id, class_id, child_id, storage_path, mime_type, byte_size) values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000f2', '30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000f2/40000000-0000-0000-0000-0000000000a1/85000000-0000-0000-0000-0000000000f2.jpg', 'image/jpeg', 1000)$q$), 'SS009', 'future: direct media metadata INSERT denied');
select is(private.can_upload_observation_media_object('10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000f2/40000000-0000-0000-0000-0000000000a1/85000000-0000-0000-0000-0000000000f9.jpg'), false, 'future: Storage upload helper denies');
select is(pg_temp.try_sql($q$insert into storage.objects (bucket_id, name) values ('observation-media', '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000f2/40000000-0000-0000-0000-0000000000a1/85000000-0000-0000-0000-0000000000f8.jpg')$q$), '42501', 'future: direct Storage object INSERT denied by policy');

-- =====================================================================
-- DENIED — 학부모 공유 신규 발급 (PT004) · 원장 b001
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select is(pg_temp.try_sql($q$select public.issue_child_portal('40000000-0000-0000-0000-0000000000a1', repeat('b', 64))$q$), 'PT004', 'parent share: issue_child_portal RPC denied before release');
select is(pg_temp.try_sql($q$insert into public.child_portals (organization_id, child_id, token_hash) values ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a6', repeat('c', 64))$q$), 'PT004', 'parent share: direct child_portals INSERT denied before release');
select is(pg_temp.try_sql($q$select public.revoke_child_portal('97000000-0000-0000-0000-0000000000a5')$q$), 'rows=1', 'parent share: revoking an existing link still works');

-- =====================================================================
-- REGRESSION — 오늘 · 지난 수업은 기존 규칙 그대로 · 취소 정책 · 역할 경계
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select lives_ok($$ select public.confirm_session_before('80000000-0000-0000-0000-0000000000a1', true, true) $$, 'today: confirm allowed');
select lives_ok($$ select public.start_class_session('80000000-0000-0000-0000-0000000000a1') $$, 'today: start allowed');
select lives_ok($$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000a3', '[{"child_id":"40000000-0000-0000-0000-0000000000a1","attendance_status":"present"}]'::jsonb) $$, 'today: attendance allowed');
select is(private.can_upload_observation_media_object('10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000a3/40000000-0000-0000-0000-0000000000a1/85000000-0000-0000-0000-0000000000e9.jpg'), true, 'today: Storage upload helper allows');
select lives_ok($$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000c9', '[{"child_id":"40000000-0000-0000-0000-0000000000a1","attendance_status":"late"}]'::jsonb) $$, 'past: attendance allowed (historical correction unchanged)');
select lives_ok($$ select public.save_class_observation('80000000-0000-0000-0000-0000000000c9', '40000000-0000-0000-0000-0000000000a6', '지난 수업 관찰', null, 'complete', '[{"metric_code":"creative_attempt","stage":"after_modeling"}]'::jsonb, null) $$, 'past: observation allowed');
select lives_ok($$ select public.save_quick_memo('80000000-0000-0000-0000-0000000000c9', '지난 수업 메모', null) $$, 'past: quick memo allowed');
select lives_ok($$ select public.finish_class_session('80000000-0000-0000-0000-0000000000c9') $$, 'past: finish allowed');
select lives_ok($$ select public.cancel_class_session('80000000-0000-0000-0000-0000000000f3', '일정 변경') $$, 'future: cancel unchanged (allowed)');
select is(pg_temp.try_sql($q$select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000f3', '[{"child_id":"40000000-0000-0000-0000-0000000000a1","attendance_status":"present"}]'::jsonb)$q$), 'AT003', 'cancelled: existing rule (AT003) unchanged');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b003');
select isnt(pg_temp.try_sql($q$insert into public.class_session_attendance (organization_id, class_session_id, class_id, child_id, attendance_status) values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a3', '30000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a5', 'present')$q$), 'rows=1', 'role: unassigned teacher still cannot write attendance');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select isnt(pg_temp.try_sql($q$insert into public.child_portals (organization_id, child_id, token_hash) values ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a6', repeat('d', 64))$q$), 'rows=1', 'role: teacher still cannot issue a portal');
select ok((select count(*) from public.class_sessions where id = '80000000-0000-0000-0000-0000000000f1' and status = 'scheduled') = 1, 'future session state unchanged after denied writes');

select * from finish();
rollback;
