-- =====================================================================
-- PHASE 08 · Security & Cutover Integrity Hardening — PRE-CUTOVER 음성 · 불변 조건 테스트 (pgTAP)
-- ---------------------------------------------------------------------
-- 실행: npx supabase test db   (local Supabase 전용 · remote 금지)
-- 하나의 transaction · 끝나면 rollback (fixture 잔존 없음). 다른 suite 와 독립.
-- G-2 · G-1 · M5 적용 후 동작은 supabase/cutover/tests/*_post_cutover.test.sql.
--
-- 그룹:
--   WS1 (D2)  기관 구성원 쓰기 권한 · 사유 · self-grant · 마지막 원장 · audit
--   WS2 (A1)  AI provider 호출 전 DB 판정 (ai_assist · AR-8 · 담당 교사) · AI 꺼짐 경로
--   WS8 (A3)  수업 시작 Required Content Set (SS008)
--   WS7 (A2)  legacy 직접 status 변경 · ISSUE1: Step H 계약 활성화 후에도 G-1 전 legacy 공유 쓰기 표면 동작 불변
--   WS5/9     Growth5 · 동의 · Weekly 사진 자격 · 저장소 상태 · 빠른 메모 (SaaS 2.0 전용 · 동의 DB gate)
--   WS6 (D6)  Pilot 반 수 · 반당 원아 · 정규 초과 인원 허용 · 재개 시 재확인
--   WS10 (D8) legacy 공유 읽기: 숨김 · 중지 · 원아 상태 · 계약 적용 기관의 parent_portal
-- Fixture (가상):
--   Org A = STARTER active (반 a1 · a2 범위 · a3 범위 밖 · a4 16명)   Org B = STANDARD active (b1 · 보관 반 b2 범위)
--   Org L = 계약 없음 (legacy · 현재 Production 과 같음)               Org P = PILOT 활성 (f1 범위 · f3 16명)
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(86);

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
-- WS1 (D2) — 기관 구성원 쓰기
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.hq_add_organization_member('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000009001', 'teacher', '신규 교사 등록 테스트') $$,
  'WS1: HQ Admin adds a member through the audited RPC with a reason');
select throws_ok(
  $$ select public.hq_add_organization_member('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000009002', 'teacher', '   ') $$,
  'MB001', null, 'WS1: reason is required');
select throws_ok(
  $$ select public.hq_add_organization_member('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000a001', 'director', '자기 등록') $$,
  'MB003', null, 'WS1: HQ Admin cannot self-grant director through the RPC');
select is(pg_temp.try_sql($f$insert into public.organization_members (organization_id, user_id, role, status)
    values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000a001', 'director', 'active')$f$),
  'MB003', 'WS1: HQ Admin cannot self-grant director by direct INSERT either (pre-G2 legacy path)');
select throws_ok(
  $$ select public.hq_add_organization_member('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b002', 'teacher', '중복 등록') $$,
  'MB004', null, 'WS1: duplicate membership rejected');

select pg_temp.act_as('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$ select public.hq_add_organization_member('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000009002', 'teacher', '영업 등록 시도') $$,
  '42501', null, 'WS1: HQ Sales cannot use the membership RPC');
select is(pg_temp.try_sql($f$insert into public.organization_members (organization_id, user_id, role, status)
    values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000a002', 'director', 'active')$f$),
  'MB003', 'WS1: HQ Sales cannot self-grant director by direct INSERT (pre-G2)');

select pg_temp.act_as('00000000-0000-0000-0000-00000000b001');
select throws_ok(
  $$ select public.hq_add_organization_member('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000009002', 'teacher', '원장 등록 시도') $$,
  '42501', null, 'WS1: director cannot use the membership RPC (PH3-2 OPEN)');
select is(pg_temp.try_sql($f$insert into public.organization_members (organization_id, user_id, role, status)
    values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000009002', 'teacher', 'active')$f$),
  '42501', 'WS1: director has no direct membership INSERT');

select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select throws_ok(
  $$ select public.hq_change_organization_member('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a',
       null, 'disabled', '퇴사', pg_temp.member_ts('20000000-0000-0000-0000-0000000000a1')) $$,
  'MB006', null, 'WS1: last active director cannot be disabled (RPC)');
select is(pg_temp.try_sql($f$update public.organization_members set role = 'teacher' where id = '20000000-0000-0000-0000-0000000000a1'$f$),
  'MB006', 'WS1: last active director protection also blocks direct UPDATE (pre-G2 legacy path)');
select lives_ok(
  $$ select public.hq_add_organization_member('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000b004', 'director', '원장 교체 준비') $$,
  'WS1: second director registered');
select lives_ok(
  $$ select public.hq_change_organization_member('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a',
       null, 'disabled', '원장 교체', pg_temp.member_ts('20000000-0000-0000-0000-0000000000a1')) $$,
  'WS1: previous director disabled once another active director exists');
select throws_ok(
  $$ select public.hq_change_organization_member('20000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000b',
       null, 'disabled', '다른 기관 지정', pg_temp.member_ts('20000000-0000-0000-0000-0000000000a3')) $$,
  'MB002', null, 'WS1: cross-organization member reference rejected');
select throws_ok(
  $$ select public.hq_change_organization_member('20000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a',
       null, 'disabled', '오래된 화면', '2000-01-01'::timestamptz) $$,
  'MB005', null, 'WS1: stale member token rejected');
select throws_ok(
  $$ select public.hq_change_organization_member('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a',
       'director', null, '역할 변경', pg_temp.member_ts('20000000-0000-0000-0000-0000000000a2')) $$,
  'MB007', null, 'WS1: teacher with class assignments cannot become director');
select is(pg_temp.try_sql($f$insert into public.organization_members (organization_id, user_id, role, status)
    values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000009002', 'teacher', 'active')$f$),
  'rows=1', 'WS1: PRE-G2 legacy invite path (HQ direct INSERT) still works for the current Production app');

reset role;
select is((select count(*) from public.audit_events
           where event_type = 'membership.added' and reason = '신규 교사 등록 테스트' and metadata ->> 'via' = 'rpc')::int, 1,
  'WS1: RPC membership add is audited with reason');
select is((select count(*) from public.audit_events
           where event_type = 'membership.changed' and reason = '원장 교체' and metadata -> 'status' = '["active", "disabled"]'::jsonb)::int, 1,
  'WS1: status change is audited with reason and from/to');
select is((select count(*) from public.audit_events
           where event_type = 'membership.added' and metadata ->> 'via' = 'direct'
             and metadata ->> 'user_id' = '00000000-0000-0000-0000-000000009002')::int, 1,
  'WS1: legacy direct INSERT is also audited (via = direct)');
set local role authenticated;


-- =====================================================================
-- WS2 (A1) — AI provider 호출 전 판정
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000c002');
select is(public.ai_assist_authorization('observation_cleanup', '90000000-0000-0000-0000-0000000000b1') ->> 'reason',
  'policy_blocked', 'WS2: STANDARD teacher blocked while AR-8 blocks ai_assist (key presence is irrelevant)');
select is((public.ai_assist_authorization('observation_cleanup', '90000000-0000-0000-0000-0000000000b1') ->> 'allowed')::boolean,
  false, 'WS2: AR-8 blocked => not allowed');

-- AR-8 해소를 가정한 판정 (transaction 안에서만 · 실제 registry 는 바꾸지 않는다)
reset role;
update public.platform_capabilities set blocked_by = '{}', is_released = true where code = 'ai_assist';
set local role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-00000000c002');
select is((public.ai_assist_authorization('observation_cleanup', '90000000-0000-0000-0000-0000000000b1') ->> 'allowed')::boolean,
  true, 'WS2: assigned STANDARD teacher allowed for C1 once released');
select is(public.ai_assist_authorization('period_report_draft', '95000000-0000-0000-0000-0000000000b1') ->> 'reason',
  'not_released', 'WS2: C2 also needs the monthly_report feature released');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select is(public.ai_assist_authorization('observation_cleanup', '90000000-0000-0000-0000-0000000000a3') ->> 'reason',
  'not_entitled', 'WS2: STARTER has no ai_assist');
select pg_temp.act_as('00000000-0000-0000-0000-00000000b003');
select is(public.ai_assist_authorization('observation_cleanup', '90000000-0000-0000-0000-0000000000b1') ->> 'reason',
  'not_authorized', 'WS2: other teacher is not authorized');
select pg_temp.act_as('00000000-0000-0000-0000-00000000c001');
select is(public.ai_assist_authorization('observation_cleanup', '90000000-0000-0000-0000-0000000000b1') ->> 'reason',
  'not_authorized', 'WS2: director is not authorized for AI assist');
select pg_temp.act_as('00000000-0000-0000-0000-00000000e002');
select is(public.ai_assist_authorization('observation_cleanup', '90000000-0000-0000-0000-0000000000e2') ->> 'reason',
  'not_entitled', 'WS2: legacy organization (no contract) is not entitled');
select throws_ok($$ select public.ai_assist_authorization('free_text', '90000000-0000-0000-0000-0000000000e2') $$,
  'AG001', null, 'WS2: unknown AI kind rejected');

reset role;
update public.platform_capabilities set blocked_by = array['AR-8'], is_released = false where code = 'ai_assist';
set local role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-00000000c002');
select lives_ok(
  $$ select public.save_class_observation('80000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b1',
       '모양을 이어 붙이고 설명했다', null, 'complete', '[{"metric_code":"form_space_composition","stage":"together"}]'::jsonb,
       (select updated_at from public.class_session_observations where id = '90000000-0000-0000-0000-0000000000b1')) $$,
  'WS2: AI-off path — Growth5 observation works with AI blocked');


-- =====================================================================
-- WS8 (A3) — 수업 시작 Required Content Set
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select lives_ok($$ select public.confirm_session_before('80000000-0000-0000-0000-0000000000a2', true, true) $$,
  'WS8: BEFORE confirmation recorded');
select throws_ok($$ select public.start_class_session('80000000-0000-0000-0000-0000000000a2') $$,
  'SS008', null, 'WS8: start rejected when required lesson sections are missing (DB authority)');
select lives_ok($$ select public.confirm_session_before('80000000-0000-0000-0000-0000000000a1', true, true) $$,
  'WS8: BEFORE confirmation recorded (complete lesson)');
select lives_ok($$ select public.start_class_session('80000000-0000-0000-0000-0000000000a1') $$,
  'WS8: start succeeds when every required section exists');
select is((select status from public.class_sessions where id = '80000000-0000-0000-0000-0000000000a1'),
  'in_progress', 'WS8: V2 start path moved the session to in_progress');


-- =====================================================================
-- WS5 · WS9 — 기록 · 사진 · 동의 gate (계약 적용 기관 · SaaS 2.0 경로)
-- =====================================================================
select throws_ok(
  $$ insert into public.observation_growth_selections (organization_id, observation_id, metric_code, stage)
     values ('10000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-0000000000a4', 'creative_attempt', 'independent') $$,
  'OB003', null, 'WS5: direct Growth5 selection on a scheduled session rejected');
select throws_ok(
  $$ insert into public.class_session_observations (organization_id, class_session_id, class_id, child_id, teacher_note, record_status, taxonomy)
     values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a4', '30000000-0000-0000-0000-0000000000a1',
             '40000000-0000-0000-0000-0000000000a5', '미리 쓰기', 'complete', 'growth5') $$,
  'OB003', null, 'WS5: direct Growth5 observation on a scheduled session rejected');
select throws_ok(
  $$ insert into public.class_session_observations (organization_id, class_session_id, class_id, child_id, teacher_note, record_status, taxonomy)
     values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a5', '30000000-0000-0000-0000-0000000000a3',
             '40000000-0000-0000-0000-0000000000a3', '범위 밖', 'complete', 'growth5') $$,
  'EN003', null, 'WS5: direct Growth5 observation in an out-of-scope class rejected');
-- Issue 1: Step H 에서 계약이 활성화돼도 G-1 전까지 legacy 공유 쓰기 표면은 기존 동작 그대로 (범위 밖 반 a3)
select lives_ok(
  $$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000a5',
       '[{"child_id":"40000000-0000-0000-0000-0000000000a3","attendance_status":"present"}]'::jsonb) $$,
  'ISSUE1: activated contract before G-1 — legacy attendance in an out-of-scope class unchanged');
select lives_ok(
  $$ select public.save_class_session_observation_atomic('80000000-0000-0000-0000-0000000000a5', '40000000-0000-0000-0000-0000000000a3',
       null, '범위 밖 legacy 관찰', 'complete',
       array[(select code from public.observation_domains order by sort_order limit 1)], null) $$,
  'ISSUE1: activated contract before G-1 — legacy observation (with domain link) in an out-of-scope class unchanged');
select is(private.can_upload_observation_media_object(
  '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000a5/40000000-0000-0000-0000-0000000000a3/85000000-0000-0000-0000-0000000000d4.jpg'),
  true, 'ISSUE1: activated contract before G-1 — photo upload in an out-of-scope class unchanged');
select lives_ok(
  $$ insert into public.observation_growth_selections (organization_id, observation_id, metric_code, stage)
     values ('10000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-0000000000a3', 'creative_attempt', 'independent') $$,
  'WS5: Growth5 selection allowed on an in-progress entitled session');

-- legacy 직접 status 변경 (M5 전): 계약 적용 기관 · 반 쓰기 가능 → legacy 화면 계열 그대로 동작.
-- PHASE UAT-DB-GUARD: a4 는 미래 수업(local_today()+7)이라 이제 SS009 로 거부된다.
--   오늘 · 지난 수업의 legacy 직접 시작은 p0_uat_db_guard.test.sql 이 rows=1 로 검증한다.
select is(pg_temp.try_sql($f$update public.class_sessions set status = 'in_progress' where id = '80000000-0000-0000-0000-0000000000a4'$f$),
  'SS009', 'WS7 + UAT-DB-GUARD: PRE-M5 legacy direct start on a FUTURE session is rejected (SS009)');

select pg_temp.act_as('00000000-0000-0000-0000-00000000e002');
select lives_ok(
  $$ select public.save_class_session_attendance_atomic('80000000-0000-0000-0000-0000000000e2',
       '[{"child_id":"40000000-0000-0000-0000-0000000000e1","attendance_status":"present"}]'::jsonb) $$,
  'WS9: legacy organization (no contract) attendance unchanged (Production compatibility)');
select is(pg_temp.try_sql($f$update public.class_sessions set status = 'completed' where id = '80000000-0000-0000-0000-0000000000e1'$f$),
  'rows=1', 'WS7: legacy organization direct scheduled -> completed unchanged before M5 (Production legacy default)');

select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select is(private.can_upload_observation_media_object(
  '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000a3/40000000-0000-0000-0000-0000000000a6/85000000-0000-0000-0000-0000000000d1.jpg'),
  false, 'WS9: storage upload refused for a consent-declined child');
select is(private.can_upload_observation_media_object(
  '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000a3/40000000-0000-0000-0000-0000000000a1/85000000-0000-0000-0000-0000000000d2.jpg'),
  true, 'WS9: storage upload allowed for a consented child in an entitled class');
select throws_ok(
  $$ insert into public.class_session_observation_media (organization_id, class_session_id, class_id, child_id, storage_path, mime_type, byte_size)
     values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a3', '30000000-0000-0000-0000-0000000000a1',
             '40000000-0000-0000-0000-0000000000a6',
             '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000a3/40000000-0000-0000-0000-0000000000a6/85000000-0000-0000-0000-0000000000d1.jpg',
             'image/jpeg', 1000) $$,
  'MD004', null, 'WS9: photo metadata for a consent-declined child rejected');

select lives_ok($$ select public.create_weekly_report_draft('40000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000a1', 3) $$,
  'WS9: weekly draft (consented child)');
select lives_ok(
  $$ select public.save_report_draft(pg_temp.draft_rev('40000000-0000-0000-0000-0000000000a1'), '{"topic":"3주 수업"}'::jsonb,
       array['85000000-0000-0000-0000-000000000001']::uuid[], pg_temp.draft_ts('40000000-0000-0000-0000-0000000000a1')) $$,
  'WS9: consented, stored photo can be selected (0~3 optional)');
select throws_ok(
  $$ insert into public.report_revision_media (organization_id, revision_id, media_id, sort_order)
     values ('10000000-0000-0000-0000-00000000000a', pg_temp.draft_rev('40000000-0000-0000-0000-0000000000a1'), '85000000-0000-0000-0000-000000000003', 1) $$,
  'RP011', null, 'WS9: hidden / delete-pending photo cannot be selected');
select lives_ok($$ select public.create_weekly_report_draft('40000000-0000-0000-0000-0000000000a5', '70000000-0000-0000-0000-0000000000a1', 3) $$,
  'WS9: weekly draft (child without consent record)');
select throws_ok(
  $$ select public.save_report_draft(pg_temp.draft_rev('40000000-0000-0000-0000-0000000000a5'), '{"topic":"3주 수업"}'::jsonb,
       array['85000000-0000-0000-0000-000000000002']::uuid[], pg_temp.draft_ts('40000000-0000-0000-0000-0000000000a5')) $$,
  'RP011', null, 'WS9: photo of an unknown-consent child cannot be selected (DEC-088 safe default)');
select lives_ok(
  $$ select public.save_report_draft(pg_temp.draft_rev('40000000-0000-0000-0000-0000000000a5'), '{"topic":"3주 수업"}'::jsonb,
       '{}'::uuid[], pg_temp.draft_ts('40000000-0000-0000-0000-0000000000a5')) $$,
  'WS9: weekly photos stay optional (0 photos)');
select throws_ok($$ select public.mark_observation_media_storage('85000000-0000-0000-0000-000000000004', true) $$,
  'MD006', null, 'WS5: storage cannot be marked deleted while the object still exists');
select lives_ok($$ select public.save_quick_memo('80000000-0000-0000-0000-0000000000a3', '가상 메모', null) $$,
  'WS5: quick memo saved while active');


-- 계약 정지 → 읽기 전용
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.change_contract_status('60000000-0000-0000-0000-00000000000a', 'suspended', '운영 점검',
       pg_temp.contract_ts('60000000-0000-0000-0000-00000000000a')) $$,
  'WS5: contract suspended (read_only)');

select pg_temp.act_as('00000000-0000-0000-0000-00000000b002');
select is(pg_temp.try_sql($f$update public.class_sessions set status = 'in_progress' where id = '80000000-0000-0000-0000-0000000000a2'$f$),
  'rows=1', 'ISSUE1: suspended contract before G-1 — legacy direct start unchanged (enforced only by G-1 · closed by M5)');
select throws_ok(
  $$ delete from public.observation_growth_selections where observation_id = '90000000-0000-0000-0000-0000000000a3' $$,
  'EN003', null, 'WS5: Growth5 selection delete rejected while read-only');
select throws_ok(
  $$ select public.save_quick_memo('80000000-0000-0000-0000-0000000000a3', '고친 메모',
       (select updated_at from public.quick_memos where class_session_id = '80000000-0000-0000-0000-0000000000a3')) $$,
  'QM004', null, 'WS5: quick memo edit rejected while read-only');
select is(private.can_upload_observation_media_object(
  '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000a3/40000000-0000-0000-0000-0000000000a1/85000000-0000-0000-0000-0000000000d3.jpg'),
  true, 'ISSUE1: suspended contract before G-1 — legacy photo upload unchanged (consented child)');
select is(private.can_upload_observation_media_object(
  '10000000-0000-0000-0000-00000000000a/80000000-0000-0000-0000-0000000000a3/40000000-0000-0000-0000-0000000000a6/85000000-0000-0000-0000-0000000000d5.jpg'),
  false, 'WS9: consent-declined child upload still refused while read-only (consent rule is not a G-1 rule)');

select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
-- PHASE 10C: 구조 재확인(CT010)은 통과하고, 이어서 전체 Readiness 가 준비 미충족 fixture 계약을 거부한다 (CT005 ≠ CT010).
--            준비된 계약의 재개 성공은 p0_phase10c_release_controls.
select throws_ok(
  $$ select public.change_contract_status('60000000-0000-0000-0000-00000000000a', 'active', '점검 완료',
       pg_temp.contract_ts('60000000-0000-0000-0000-00000000000a')) $$,
  'CT005', null, 'WS6: resume passes the structural re-check (scope within limits) then full Readiness rejects the not-ready fixture (PHASE 10C)');
-- 이후 검사를 위해 fixture 를 active 로 되돌린다 (fixture 조작 · 검사 대상 아님)
reset role;
set local session_replication_role = replica;
update public.contracts set status = 'active' where id = '60000000-0000-0000-0000-00000000000a';
set local session_replication_role = origin;
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');


-- =====================================================================
-- WS6 (D6) — Pilot 한도 · 정규 초과 인원
-- =====================================================================
select throws_ok(
  $$ insert into public.contract_classes (organization_id, contract_id, class_id)
     values ('10000000-0000-0000-0000-00000000000f', '60000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-0000000000f3') $$,
  'CT009', null, 'WS6: active pilot — class with 16 active children cannot join the scope (HARD 15)');
select lives_ok(
  $$ insert into public.contract_classes (organization_id, contract_id, class_id)
     values ('10000000-0000-0000-0000-00000000000d', '60000000-0000-0000-0000-00000000000d', '30000000-0000-0000-0000-0000000000d1') $$,
  'WS6: draft pilot may hold a 16-child class during preparation (DEC-051 · Readiness decides)');
reset role;
select is((select (e ->> 'ok')::boolean from jsonb_array_elements(private.contract_readiness_internal('60000000-0000-0000-0000-00000000000d') -> 'items') e
           where e ->> 'code' = 'pilot_capacity'), false,
  'WS6: draft pilot readiness reports pilot_capacity not ready (activation blocked)');
set local role authenticated;
select lives_ok(
  $$ insert into public.contract_classes (organization_id, contract_id, class_id)
     values ('10000000-0000-0000-0000-00000000000f', '60000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-0000000000f2') $$,
  'WS6: second pilot class allowed');
select throws_ok(
  $$ insert into public.contract_classes (organization_id, contract_id, class_id)
     values ('10000000-0000-0000-0000-00000000000f', '60000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-0000000000f4') $$,
  'CT009', null, 'WS6: third pilot class rejected (max_classes 2)');
select lives_ok(
  $$ insert into public.contract_classes (organization_id, contract_id, class_id)
     values ('10000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a4') $$,
  'WS6: regular product class with 16 children allowed (ALLOW + OVERAGE · DEC-051)');
select lives_ok(
  $$ select public.change_contract_status('60000000-0000-0000-0000-00000000000b', 'suspended', '점검',
       pg_temp.contract_ts('60000000-0000-0000-0000-00000000000b')) $$,
  'WS6: STANDARD contract suspended');
select throws_ok(
  $$ select public.change_contract_status('60000000-0000-0000-0000-00000000000b', 'active', '재개',
       pg_temp.contract_ts('60000000-0000-0000-0000-00000000000b')) $$,
  'CT010', null, 'WS6: resume re-checks class scope (archived class in scope)');


-- =====================================================================
-- WS10 (D8) — legacy 공유 읽기
-- =====================================================================
select is(pg_temp.share_rows('96000000-0000-0000-0000-0000000000e1', repeat('Ab3_', 10) || 'xyz'), 1,
  'WS10: legacy organization share still readable (historical compatibility)');
select is(pg_temp.share_rows('96000000-0000-0000-0000-0000000000e2', repeat('Cd4_', 10) || 'xyz'), 0,
  'WS10: share of an inactive (withdrawn) child is not readable');
select is(pg_temp.share_rows('96000000-0000-0000-0000-0000000000a1', repeat('Ef5_', 10) || 'xyz'), 1,
  'WS10: contract organization share readable while parent_portal is effective');

select pg_temp.act_as('00000000-0000-0000-0000-00000000e002');
select throws_ok($$ select public.set_legacy_growth_report_hidden('95000000-0000-0000-0000-0000000000e1', true, '교사 숨김 시도') $$,
  'SH002', null, 'WS10: teacher cannot hide a legacy report');
select pg_temp.act_as('00000000-0000-0000-0000-00000000a002');
select throws_ok($$ select public.set_legacy_growth_report_hidden('95000000-0000-0000-0000-0000000000e1', true, '영업 숨김 시도') $$,
  'SH002', null, 'WS10: HQ Sales cannot hide a legacy report');
select pg_temp.act_as('00000000-0000-0000-0000-00000000e001');
select throws_ok($$ select public.set_legacy_growth_report_hidden('95000000-0000-0000-0000-0000000000e1', true, '') $$,
  'SH006', null, 'WS10: hiding requires a reason');
select lives_ok($$ select public.set_legacy_growth_report_hidden('95000000-0000-0000-0000-0000000000e1', true, '보호자 요청') $$,
  'WS10: director hides a legacy report with a reason');
select is(pg_temp.share_rows('96000000-0000-0000-0000-0000000000e1', repeat('Ab3_', 10) || 'xyz'), 0,
  'WS10: hidden legacy report is not readable through its share link');
select lives_ok($$ select public.set_legacy_growth_report_hidden('95000000-0000-0000-0000-0000000000e1', false, '확인 완료') $$,
  'WS10: director unhides the legacy report');
select is(pg_temp.share_rows('96000000-0000-0000-0000-0000000000e1', repeat('Ab3_', 10) || 'xyz'), 1,
  'WS10: unhidden report readable again until expiry');
select lives_ok($$ select public.revoke_child_growth_report_share('96000000-0000-0000-0000-0000000000e1') $$,
  'WS10: director revokes the share');
select is(pg_temp.share_rows('96000000-0000-0000-0000-0000000000e1', repeat('Ab3_', 10) || 'xyz'), 0,
  'WS10: revoked share is not readable');

select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$ select public.change_contract_status('60000000-0000-0000-0000-00000000000a', 'ended', '계약 종료',
       pg_temp.contract_ts('60000000-0000-0000-0000-00000000000a')) $$,
  'WS10: contract ended');
select is(pg_temp.share_rows('96000000-0000-0000-0000-0000000000a1', repeat('Ef5_', 10) || 'xyz'), 0,
  'WS10: contract organization share closes when parent_portal is no longer effective');

reset role;
select is((select count(*) from public.audit_events where event_type in ('legacy_report.hidden', 'legacy_report.unhidden'))::int, 2,
  'WS10: legacy report hide / unhide are audited');

select * from finish();
rollback;
