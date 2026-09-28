-- =====================================================================
-- PRODUCTION-SHAPED SYNTHETIC SEED (LOCAL ONLY · 가상 데이터 · 실명 없음)
-- ---------------------------------------------------------------------
-- 적용 시점: PHASE 07 migration 이전 스키마
--   npx supabase@2.113.0 db reset --local --version 20260904090000
--   node supabase/cutover/tests/run-local.mjs supabase/validation/production_shaped/01_legacy_seed.sql --raw
-- 이후 `npx supabase@2.113.0 migration up --local` 로 PHASE 07 migration 을 이 데이터 위에 적용한다.
-- 검증이 끝나면 `db reset` 으로 지운다. remote 금지.
--
-- 기관
--   o1 해님(가상) : 정규 후보 · 반 c1 18명(>15) · c2 12명 · c3 archived · 과거 완료 배정
--   o2 달빛(가상) : 정규 후보 · 반 c1 14명 · c2 10명
--   o3 별빛(가상) : Pilot 후보 · 반 c1 15명 · c2 16명
--   o4 정지(가상) : organizations.status = suspended (비운영)
--   o5 미등록(가상): 운영 중 · 계약 mapping 하지 않음 (G-1 탐지 대상)
--   o6 정지계약(가상): 운영 중 · 이후 계약 suspended 시뮬레이션
-- =====================================================================

begin;
set local session_replication_role = replica;

-- 서비스 기준일 (Asia/Seoul · 기존 앱 관례)
create or replace function pg_temp.today() returns date language sql stable as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;

create or replace function pg_temp.u(p text) returns uuid language sql immutable as $$
  select md5('ps:' || p)::uuid;
$$;

create temporary table ps_org (code text primary key, name text, status text) on commit drop;
insert into ps_org values
  ('o1', 'PS 해님(가상)', 'active'),
  ('o2', 'PS 달빛(가상)', 'active'),
  ('o3', 'PS 별빛(가상)', 'active'),
  ('o4', 'PS 정지(가상)', 'suspended'),
  ('o5', 'PS 미등록(가상)', 'active'),
  ('o6', 'PS 정지계약(가상)', 'active');

-- 반: (org, class, 활성 원아 수, status, 프로그램)
create temporary table ps_class (org text, code text, children int, status text, program text) on commit drop;
insert into ps_class values
  ('o1', 'c1', 18, 'active',   'p8'),
  ('o1', 'c2', 12, 'active',   'p8'),
  ('o1', 'c3',  8, 'archived', 'p8'),
  ('o2', 'c1', 14, 'active',   'p16'),
  ('o2', 'c2', 10, 'active',   'p16'),
  ('o3', 'c1', 15, 'active',   'p8'),
  ('o3', 'c2', 16, 'active',   'p8'),
  ('o4', 'c1', 10, 'active',   'p8'),
  ('o5', 'c1', 11, 'active',   'p8'),
  ('o6', 'c1',  9, 'active',   'p8');

insert into public.organizations (id, name, status)
select pg_temp.u(code), name, status from ps_org;

-- 사용자: 기관별 원장 · 교사 2 · 초대 교사 · 비활성 교사 + HQ admin · HQ sales
insert into auth.users (id, email)
select pg_temp.u(o.code || ':' || r), 'ps-' || o.code || '-' || r || '@synthetic.local'
from ps_org o cross join unnest(array['dir', 't1', 't2', 'tinv', 'tdis']) as r
union all
select pg_temp.u('hq:admin'), 'ps-hq-admin@synthetic.local'
union all
select pg_temp.u('hq:sales'), 'ps-hq-sales@synthetic.local';

insert into public.profiles (user_id, display_name)
select id, split_part(email, '@', 1) from auth.users where email like 'ps-%@synthetic.local'
on conflict (user_id) do nothing;

insert into private.admin_users (user_id, role) values
  (pg_temp.u('hq:admin'), 'admin'),
  (pg_temp.u('hq:sales'), 'sales');

insert into public.organization_members (id, organization_id, user_id, role, status)
select pg_temp.u('m:' || o.code || ':' || r.r), pg_temp.u(o.code), pg_temp.u(o.code || ':' || r.r),
       case when r.r = 'dir' then 'director' else 'teacher' end,
       case r.r when 'tinv' then 'invited' when 'tdis' then 'disabled' else 'active' end
from ps_org o cross join unnest(array['dir', 't1', 't2', 'tinv', 'tdis']) as r(r);

insert into public.classes (id, organization_id, name, school_year, status)
select pg_temp.u(c.org || c.code), pg_temp.u(c.org), c.org || '-' || c.code || '반', 2026, c.status
from ps_class c;

-- t1 = c1 · t2 = c2 (o1 은 t2 가 c3 도) · 반이 하나인 기관은 t1 · t2 공동 담당
insert into public.class_teachers (organization_id, class_id, organization_member_id)
select pg_temp.u(c.org), pg_temp.u(c.org || c.code),
       pg_temp.u('m:' || c.org || ':' || case when c.code = 'c1' then 't1' else 't2' end)
from ps_class c
union all
select pg_temp.u(c.org), pg_temp.u(c.org || c.code), pg_temp.u('m:' || c.org || ':t2')
from ps_class c
where c.code = 'c1' and not exists (select 1 from ps_class x where x.org = c.org and x.code = 'c2');

-- 원아: 반별 활성 N명 + 비활성 1 + 졸업 1 (가상 이름)
insert into public.children (id, organization_id, class_id, name, status)
select pg_temp.u(c.org || c.code || ':ch' || n), pg_temp.u(c.org), pg_temp.u(c.org || c.code),
       '가상-' || c.org || c.code || '-' || lpad(n::text, 2, '0'),
       case when n <= c.children then 'active' when n = c.children + 1 then 'inactive' else 'graduated' end
from ps_class c cross join generate_series(1, c.children + 2) as n;

-- 프로그램 · 차시 (주차별 1차시 published · p8 1주 2차시 draft) · lesson_sections 는 일부만
insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  (pg_temp.u('p8'),  'PS-P8',  'PS 8주 과정(가상)', 8, 'published'),
  (pg_temp.u('p16'), 'PS-P16', 'PS 16주 과정(가상)', 16, 'published'),
  (pg_temp.u('p24'), 'PS-P24', 'PS 24주 과정(가상)', 24, 'published');

insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status)
select pg_temp.u(p.code || ':w' || w), pg_temp.u(p.code), w, 1, p.code || ' ' || w || '주 수업', 'published'
from (values ('p8', 8), ('p16', 16), ('p24', 24)) as p(code, weeks)
cross join lateral generate_series(1, p.weeks) as w;

insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status) values
  (pg_temp.u('p8:w1:s2'), pg_temp.u('p8'), 1, 2, 'p8 1주 보충(초안)', 'draft');

-- 배정: 반마다 active 1 · o1c1 은 과거 completed 배정(p24) 이력 · o1c3(archived) 는 completed
insert into public.class_program_assignments (id, organization_id, class_id, program_id, start_date, status)
select pg_temp.u('a:' || c.org || c.code), pg_temp.u(c.org), pg_temp.u(c.org || c.code), pg_temp.u(c.program),
       pg_temp.today() - 30, case when c.status = 'archived' then 'completed' else 'active' end
from ps_class c
union all
select pg_temp.u('a:o1c1:hist'), pg_temp.u('o1'), pg_temp.u('o1c1'), pg_temp.u('p24'), pg_temp.today() - 240, 'completed';

-- 세션 (week_no 컬럼 없음 = PHASE 07 이전 스키마)
--   1~3주 completed (지난 3주) · 4주 in_progress (c1 오늘 · 그 외 10일 전 = 방치)
--   5 · 6주 scheduled (다음 주들) · 7주 cancelled
--   과거 배정 1 · 2주 completed (약 8개월 전)
insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
select pg_temp.u('s:' || c.org || c.code || ':w' || w), pg_temp.u(c.org), pg_temp.u(c.org || c.code),
       pg_temp.u('a:' || c.org || c.code), pg_temp.u(c.program), pg_temp.u(c.program || ':w' || w),
       case
         when w <= 3 then pg_temp.today() - 7 * (4 - w)
         when w = 4 then case when c.code = 'c1' then pg_temp.today() else pg_temp.today() - 10 end
         else pg_temp.today() + 7 * (w - 4)
       end,
       case when w <= 3 then 'completed' when w = 4 then 'in_progress' when w <= 6 then 'scheduled' else 'cancelled' end
from ps_class c cross join generate_series(1, 7) as w
where c.status = 'active'
union all
select pg_temp.u('s:o1c3:w' || w), pg_temp.u('o1'), pg_temp.u('o1c3'), pg_temp.u('a:o1c3'), pg_temp.u('p8'),
       pg_temp.u('p8:w' || w), pg_temp.today() - 120 + 7 * w, 'completed'
from generate_series(1, 2) as w
union all
select pg_temp.u('s:o1c1:hist:w' || w), pg_temp.u('o1'), pg_temp.u('o1c1'), pg_temp.u('a:o1c1:hist'), pg_temp.u('p24'),
       pg_temp.u('p24:w' || w), pg_temp.today() - 240 + 7 * w, 'completed'
from generate_series(1, 2) as w;

-- 출결: 완료 세션의 활성 원아 (5번째마다 결석 · 각 반 3주차는 일부 누락)
insert into public.class_session_attendance (organization_id, class_session_id, class_id, child_id, attendance_status)
select pg_temp.u(c.org), pg_temp.u('s:' || c.org || c.code || ':w' || w), pg_temp.u(c.org || c.code),
       pg_temp.u(c.org || c.code || ':ch' || n),
       case when n % 5 = 0 then 'absent' when n % 7 = 0 then 'late' else 'present' end
from ps_class c
cross join generate_series(1, 3) as w
cross join lateral generate_series(1, c.children) as n
where c.status = 'active' and not (w = 3 and n > c.children - 3);

-- 관찰 (legacy): 완료 세션 · 반별 앞 5명 · 1~4번 complete(교사 관찰, 짝수는 아이의 말도) · 5번 draft(아이의 말만)
insert into public.class_session_observations (id, organization_id, class_session_id, class_id, child_id, teacher_note, child_voice, record_status)
select pg_temp.u('o:' || c.org || c.code || ':w' || w || ':ch' || n), pg_temp.u(c.org),
       pg_temp.u('s:' || c.org || c.code || ':w' || w), pg_temp.u(c.org || c.code), pg_temp.u(c.org || c.code || ':ch' || n),
       case when n <= 4 then '가상 관찰 ' || c.org || c.code || ' ' || w || '주 ' || n else null end,
       case when n % 2 = 0 or n = 5 then '가상 아이의 말 ' || n else null end,
       case when n <= 4 then 'complete' else 'draft' end
from ps_class c cross join generate_series(1, 3) as w cross join generate_series(1, 5) as n
where c.status = 'active';

insert into public.class_session_observation_domains (observation_id, domain_code)
select o.id, d.code
from public.class_session_observations o
cross join (values ('color_expression'), ('form_space')) as d(code)
where o.record_status = 'complete' and o.organization_id in (select pg_temp.u(code) from ps_org);

-- 사진 메타데이터 (storage object 없음): 각 반 1 · 2주 · 원아 1 · 2 에 2장씩
insert into public.class_session_observation_media (id, organization_id, class_session_id, class_id, child_id, storage_path, mime_type, byte_size)
select pg_temp.u('md:' || c.org || c.code || w || n || k), pg_temp.u(c.org), pg_temp.u('s:' || c.org || c.code || ':w' || w),
       pg_temp.u(c.org || c.code), pg_temp.u(c.org || c.code || ':ch' || n),
       pg_temp.u(c.org)::text || '/' || pg_temp.u('s:' || c.org || c.code || ':w' || w)::text || '/'
         || pg_temp.u(c.org || c.code || ':ch' || n)::text || '/' || pg_temp.u('md:' || c.org || c.code || w || n || k)::text || '.jpg',
       'image/jpeg', 120000
from ps_class c cross join generate_series(1, 2) as w cross join generate_series(1, 2) as n cross join generate_series(1, 2) as k
where c.status = 'active';

-- 관찰 AI 초안 (legacy): 원아 1 = accepted · 원아 2 = generated
insert into public.class_session_observation_ai_drafts (
  id, organization_id, class_session_id, class_id, child_id, observation_id, source_observation_updated_at,
  generated_text, reviewed_text, review_status, provider, model, prompt_version, reviewed_at)
select pg_temp.u('ai:' || o.id::text), o.organization_id, o.class_session_id, o.class_id, o.child_id, o.id, o.updated_at,
       '가상 AI 정리 문장', case when o.child_id = pg_temp.u(c.org || c.code || ':ch1') then '가상 검토 문장' end,
       case when o.child_id = pg_temp.u(c.org || c.code || ':ch1') then 'accepted' else 'generated' end,
       'synthetic', 'synthetic-model', 'synthetic.v1',
       case when o.child_id = pg_temp.u(c.org || c.code || ':ch1') then now() end
from public.class_session_observations o
join ps_class c on o.class_id = pg_temp.u(c.org || c.code)
where o.class_session_id = pg_temp.u('s:' || c.org || c.code || ':w1')
  and o.child_id in (pg_temp.u(c.org || c.code || ':ch1'), pg_temp.u(c.org || c.code || ':ch2'));

-- legacy 성장 리포트 (o1 · o2 c1): 원아 1 complete · 원아 2 draft
insert into public.child_growth_reports (
  id, organization_id, class_id, child_id, period_start, period_end, title,
  growth_changes, observation_summary, next_support, status, completed_at)
select pg_temp.u('gr:' || c.org || ':ch' || n), pg_temp.u(c.org), pg_temp.u(c.org || 'c1'), pg_temp.u(c.org || 'c1:ch' || n),
       pg_temp.today() - 28, pg_temp.today() - 7, '가상 성장 리포트 ' || c.org || ' ' || n,
       case when n = 1 then '가상 변화' end, case when n = 1 then '가상 요약' end, case when n = 1 then '가상 지원' end,
       case when n = 1 then 'complete' else 'draft' end, case when n = 1 then now() end
from (values ('o1'), ('o2')) as c(org) cross join generate_series(1, 2) as n;

insert into public.child_growth_report_sources (
  report_id, organization_id, class_id, child_id, observation_id, ai_draft_id, session_id,
  source_observation_updated_at, source_ai_updated_at, reviewed_text_snapshot)
select pg_temp.u('gr:' || c.org || ':ch1'), a.organization_id, a.class_id, a.child_id, a.observation_id, a.id, a.class_session_id,
       a.source_observation_updated_at, a.updated_at, a.reviewed_text
from (values ('o1'), ('o2')) as c(org)
join public.class_session_observation_ai_drafts a
  on a.child_id = pg_temp.u(c.org || 'c1:ch1') and a.review_status = 'accepted';

insert into public.child_growth_report_ai_drafts (
  report_id, organization_id, class_id, child_id, source_revision,
  generated_growth_changes, generated_observation_summary, generated_next_support, provider, model, prompt_version)
select r.id, r.organization_id, r.class_id, r.child_id, 1, '가상 AI 변화', '가상 AI 요약', '가상 AI 지원', 'synthetic', 'synthetic-model', 'synthetic.v1'
from public.child_growth_reports r where r.status = 'complete' and r.organization_id in (pg_temp.u('o1'), pg_temp.u('o2'));

-- legacy 학부모 공유 (token 은 가상 · hash 만 저장)
--   o1 리포트: active + revoked / o2 리포트: expired(미중지) + revoked
--   legacy 제약 child_growth_report_shares_active_key (report 당 revoked_at is null 1개)를 따른다
insert into public.child_growth_report_shares (id, organization_id, report_id, token_hash, created_at, expires_at, revoked_at)
select pg_temp.u('sh:' || c.org || ':' || k), pg_temp.u(c.org), pg_temp.u('gr:' || c.org || ':ch1'),
       encode(sha256(convert_to(rpad('psShareToken' || c.org || k, 43, 'x'), 'UTF8')), 'hex'),
       case when k = 'expired' then now() - interval '40 days' else now() - interval '1 day' end,
       case when k = 'expired' then now() - interval '10 days' else now() + interval '29 days' end,
       case when k = 'revoked' then now() - interval '1 hour' end
from (values ('o1', 'active'), ('o1', 'revoked'), ('o2', 'expired'), ('o2', 'revoked')) as c(org, k);

insert into public.lead_submissions (submission_type, institution_name, contact_name, phone, privacy_agreed, status, package_code)
values
  ('consult', 'PS 문의기관 1(가상)', '가상 담당자', '010-0000-0001', true, 'new', 'starter'),
  ('pilot',   'PS 문의기관 2(가상)', '가상 담당자', '010-0000-0002', true, 'contacted', 'undecided'),
  ('demo',    'PS 문의기관 3(가상)', '가상 담당자', '010-0000-0003', true, 'converted', 'standard');

commit;

select 'seeded' as status,
       (select count(*) from public.organizations) as organizations,
       (select count(*) from public.classes) as classes,
       (select count(*) from public.children) as children,
       (select count(*) from public.class_sessions) as sessions,
       (select count(*) from public.class_session_attendance) as attendance,
       (select count(*) from public.class_session_observations) as observations,
       (select count(*) from public.class_session_observation_media) as media,
       (select count(*) from public.class_session_observation_ai_drafts) as obs_ai_drafts,
       (select count(*) from public.child_growth_reports) as legacy_reports,
       (select count(*) from public.child_growth_report_shares) as legacy_shares;
