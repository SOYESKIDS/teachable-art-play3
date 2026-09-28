-- =====================================================================
-- BROWSER SMOKE SEED (LOCAL ONLY · 가상 데이터 · 실명 · 실제 아동 · 보호자 정보 없음)
-- ---------------------------------------------------------------------
-- 전제: npx supabase@2.113.0 db reset → node supabase/validation/browser_smoke/01_accounts.mjs
-- 실행: node supabase/cutover/tests/run-local.mjs supabase/validation/browser_smoke/02_seed.sql --raw
-- 지우기: npx supabase@2.113.0 db reset
--
--   Org L (legacy 확인용) : 계약 없음 — 현재 Production 과 같은 상태
--   Org V (SaaS V2 확인용): [LOCAL SIMULATION] STARTER 계약 active (replica fixture)
--       ※ 이는 정책 blocker(CO-12 · AR-8 · CO-8) 해소 이후를 가정한 local 화면 점검용이다.
--         실제 Readiness 는 여전히 활성화를 거부한다(CT005). Production 계약이 활성화 가능하다는 뜻이 아니다.
-- =====================================================================

begin;
set local session_replication_role = replica;

create or replace function pg_temp.u(p text) returns uuid language sql immutable as $$
  select md5('smoke:' || p)::uuid;
$$;
create or replace function pg_temp.uid(p_email text) returns uuid language sql stable as $$
  select id from auth.users where email = p_email;
$$;
create or replace function pg_temp.today() returns date language sql stable as $$
  select private.local_today();
$$;

insert into public.profiles (user_id, display_name)
select id, split_part(email, '@', 1) from auth.users where email like 'smoke-%@example.test'
on conflict (user_id) do nothing;

insert into private.admin_users (user_id, role) values
  (pg_temp.uid('smoke-hq-admin@example.test'), 'admin'),
  (pg_temp.uid('smoke-hq-sales@example.test'), 'sales');

insert into public.organizations (id, name, status) values
  (pg_temp.u('orgL'), '스모크 레거시 유치원(가상)', 'active'),
  (pg_temp.u('orgV'), '스모크 SaaS 유치원(가상)', 'active');

insert into public.organization_members (id, organization_id, user_id, role, status) values
  (pg_temp.u('m:L:dir'), pg_temp.u('orgL'), pg_temp.uid('smoke-legacy-director@example.test'), 'director', 'active'),
  (pg_temp.u('m:L:t'),   pg_temp.u('orgL'), pg_temp.uid('smoke-legacy-teacher@example.test'), 'teacher', 'active'),
  (pg_temp.u('m:V:dir'), pg_temp.u('orgV'), pg_temp.uid('smoke-v2-director@example.test'), 'director', 'active'),
  (pg_temp.u('m:V:t'),   pg_temp.u('orgV'), pg_temp.uid('smoke-v2-teacher@example.test'), 'teacher', 'active');

insert into public.classes (id, organization_id, name, school_year, status) values
  (pg_temp.u('cL'), pg_temp.u('orgL'), '햇살반(가상)', 2026, 'active'),
  (pg_temp.u('cV'), pg_temp.u('orgV'), '무지개반(가상)', 2026, 'active');

insert into public.class_teachers (organization_id, class_id, organization_member_id) values
  (pg_temp.u('orgL'), pg_temp.u('cL'), pg_temp.u('m:L:t')),
  (pg_temp.u('orgV'), pg_temp.u('cV'), pg_temp.u('m:V:t'));

insert into public.children (id, organization_id, class_id, name, status)
select pg_temp.u(c || ':ch' || n), pg_temp.u('org' || c), pg_temp.u('c' || c), '가상아동-' || c || n, 'active'
from (values ('L'), ('V')) as x(c) cross join generate_series(1, 3) as n;

-- 프로그램 · 차시 (8주 · 필수 섹션 모두 · 활동 단계)
insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  (pg_temp.u('p8'), 'SMOKE-P8', '스모크 8주 과정(가상)', 8, 'published');

insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, objective, duration_minutes, status)
select pg_temp.u('p8:w' || w), pg_temp.u('p8'), w, 1, w || '주 색과 모양 놀이(가상)', '가상 수업 목표 ' || w, 50, 'published'
from generate_series(1, 8) as w;

insert into public.lesson_sections (lesson_id, section_code, body)
select pg_temp.u('p8:w' || w), s.code, '가상 ' || s.code || ' 내용 · ' || w || '주'
from generate_series(1, 8) as w
cross join (values ('s1'), ('s2'), ('s3'), ('s4a'), ('s4c'), ('s5'), ('s6'), ('s11'), ('s12'), ('s13'), ('s15')) as s(code);

insert into public.lesson_activities (lesson_id, sequence_no, title, activity_type, description, duration_minutes)
select pg_temp.u('p8:w' || w), a.seq, a.title, a.kind, '가상 단계 설명', a.minutes
from generate_series(1, 8) as w
cross join (values (1, '열기', 'intro', 5), (2, '핵심활동', 'activity', 20), (3, '미술 · 창작', 'creative', 15), (4, '마무리 대화', 'closing', 10)) as a(seq, title, kind, minutes);

insert into public.class_program_assignments (id, organization_id, class_id, program_id, start_date, status) values
  (pg_temp.u('aL'), pg_temp.u('orgL'), pg_temp.u('cL'), pg_temp.u('p8'), pg_temp.today() - 14, 'active'),
  (pg_temp.u('aV'), pg_temp.u('orgV'), pg_temp.u('cV'), pg_temp.u('p8'), pg_temp.today() - 14, 'active');

-- 세션: 1주 completed(지난주) · 2주 in_progress(오늘) · 3주 scheduled(오늘) · 4주 scheduled(다음 주)
insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status, week_no)
select pg_temp.u('s:' || c || ':w' || w), pg_temp.u('org' || c), pg_temp.u('c' || c), pg_temp.u('a' || c), pg_temp.u('p8'), pg_temp.u('p8:w' || w),
       case w when 1 then pg_temp.today() - 7 when 4 then pg_temp.today() + 7 else pg_temp.today() end,
       case w when 1 then 'completed' when 2 then 'in_progress' else 'scheduled' end,
       w
from (values ('L'), ('V')) as x(c) cross join generate_series(1, 4) as w;

insert into public.class_session_attendance (organization_id, class_session_id, class_id, child_id, attendance_status)
select pg_temp.u('org' || c), pg_temp.u('s:' || c || ':w1'), pg_temp.u('c' || c), pg_temp.u(c || ':ch' || n),
       case when n = 3 then 'absent' else 'present' end
from (values ('L'), ('V')) as x(c) cross join generate_series(1, 3) as n;

-- Org L: legacy 관찰 · legacy AI 초안(원장 비표시 확인) · legacy 성장 리포트
insert into public.class_session_observations (id, organization_id, class_session_id, class_id, child_id, teacher_note, child_voice, record_status)
values (pg_temp.u('oL1'), pg_temp.u('orgL'), pg_temp.u('s:L:w1'), pg_temp.u('cL'), pg_temp.u('L:ch1'),
        '가상 관찰: 노랑과 파랑을 섞어 초록을 만들었다', '가상 아이의 말: 풀색이 됐어', 'complete');
insert into public.class_session_observation_domains (observation_id, domain_code) values (pg_temp.u('oL1'), 'color_expression');
insert into public.class_session_observation_ai_drafts (
  id, organization_id, class_session_id, class_id, child_id, observation_id, source_observation_updated_at,
  generated_text, reviewed_text, review_status, provider, model, prompt_version, reviewed_at)
select pg_temp.u('aiL1'), o.organization_id, o.class_session_id, o.class_id, o.child_id, o.id, o.updated_at,
       '가상 AI 정리 문장', '가상 검토 문장', 'accepted', 'synthetic', 'synthetic-model', 'synthetic.v1', now()
from public.class_session_observations o where o.id = pg_temp.u('oL1');
insert into public.child_growth_reports (id, organization_id, class_id, child_id, period_start, period_end, title,
  growth_changes, observation_summary, next_support, status, completed_at)
values (pg_temp.u('grL1'), pg_temp.u('orgL'), pg_temp.u('cL'), pg_temp.u('L:ch1'), pg_temp.today() - 14, pg_temp.today() - 1,
        '가상 성장 리포트', '가상 변화', '가상 요약', '가상 지원', 'complete', now());

-- Org V: [LOCAL SIMULATION] STARTER 발행 · 계약 active · 반 범위
update public.product_versions pv set lifecycle = 'published', published_at = now()
from public.products p where p.id = pv.product_id and p.code = 'starter';
insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date, activated_at)
select pg_temp.u('ctV'), pg_temp.u('orgV'), pv.id, 'active', pg_temp.today() - 30, pg_temp.today() + 60, now()
from public.product_versions pv join public.products p on p.id = pv.product_id where p.code = 'starter';
insert into public.contract_classes (organization_id, contract_id, class_id) values (pg_temp.u('orgV'), pg_temp.u('ctV'), pg_temp.u('cV'));

-- Org V: 사진 메타 4장 (1주 · 아이 1) — storage 객체는 03_media.mjs 가 올린다
insert into public.class_session_observation_media (id, organization_id, class_session_id, class_id, child_id, storage_path, mime_type, byte_size)
select pg_temp.u('mdV' || n), pg_temp.u('orgV'), pg_temp.u('s:V:w1'), pg_temp.u('cV'), pg_temp.u('V:ch1'),
       pg_temp.u('orgV')::text || '/' || pg_temp.u('s:V:w1')::text || '/' || pg_temp.u('V:ch1')::text || '/' || pg_temp.u('mdV' || n)::text || '.png',
       'image/png', 68
from generate_series(1, 4) as n;

-- PHASE 08 (A4): Weekly 사진 선택은 동의 운영 상태 consented 원아만 (DEC-088) → [LOCAL SIMULATION] 아이 1 동의 기록
-- evidence_ref 는 비워 둔다 (가상 데이터 · 증빙을 꾸며 넣지 않는다)
insert into public.child_media_consents (organization_id, child_id, status)
values (pg_temp.u('orgV'), pg_temp.u('V:ch1'), 'consented');

insert into public.lead_submissions (submission_type, institution_name, contact_name, phone, privacy_agreed, status, package_code) values
  ('consult', '스모크 문의 기관 1(가상)', '가상 담당자', '010-0000-0101', true, 'new', 'starter'),
  ('pilot',   '스모크 문의 기관 2(가상)', '가상 담당자', '010-0000-0102', true, 'contacted', 'undecided');

set local session_replication_role = origin;

-- Org V: 교사 신원으로 실제 RPC 사용 (관찰 + Growth5 → Weekly 초안 → 완료)
select set_config('request.jwt.claims',
  json_build_object('sub', pg_temp.uid('smoke-v2-teacher@example.test'), 'role', 'authenticated')::text, true);
select public.save_class_observation(pg_temp.u('s:V:w1'), pg_temp.u('V:ch1'),
  '가상 관찰: 동그라미를 여러 크기로 그렸다', '가상 아이의 말: 큰 해님이야', 'complete',
  '[{"metric_code":"form_space_composition","stage":"after_modeling"}]'::jsonb, null);
select public.save_class_observation(pg_temp.u('s:V:w1'), pg_temp.u('V:ch2'),
  '가상 관찰: 붓 대신 손가락으로 칠했다', null, 'complete', '[]'::jsonb, null);
select public.create_weekly_report_draft(pg_temp.u('V:ch1'), pg_temp.u('aV'), 1);
select public.save_report_draft(rv.id,
  '{"topic":"1주 색과 모양 놀이(가상)","quote_choice":"큰 해님이야","teacher_observation":"동그라미를 여러 크기로 그렸다","family_conversation":"집에서 동그라미 찾기"}'::jsonb,
  '{}'::uuid[], rv.updated_at)
from public.report_revisions rv join public.reports r on r.id = rv.report_id
where r.child_id = pg_temp.u('V:ch1') and rv.status = 'draft';
select public.complete_report_revision(rv.id, rv.updated_at)
from public.report_revisions rv join public.reports r on r.id = rv.report_id
where r.child_id = pg_temp.u('V:ch1') and rv.status = 'draft';
select set_config('request.jwt.claims', '', true);

commit;

select 'smoke seeded' as status,
  (select count(*) from public.organizations) as orgs,
  (select count(*) from public.class_sessions) as sessions,
  (select count(*) from public.class_session_observations) as observations,
  (select count(*) from public.reports where latest_completed_revision_id is not null) as completed_weekly,
  (select count(*) from public.contracts where status = 'active') as simulated_active_contracts;
