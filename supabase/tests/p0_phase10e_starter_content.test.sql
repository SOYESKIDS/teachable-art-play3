-- =====================================================================
-- PHASE 10E — STARTER 2026.1 canonical W1~W8 콘텐츠 패키지 local 검증 (pgTAP)
-- ---------------------------------------------------------------------
-- 실행: npx supabase test db   또는   node supabase/cutover/tests/run-local.mjs supabase/tests/p0_phase10e_starter_content.test.sql
--       (local Supabase 전용 · remote 금지 · 하나의 transaction · 끝나면 rollback)
--
-- 패키지(supabase/content/starter_2026_1_load.sql · _publish.sql)를 \ir 로 그대로 실행해 판정한다:
--   L  적재: 프로그램 1 (draft) · 차시 W1~W8 (draft · 순서) · 차시당 section 17 · 필수 11 · source_ref · 합성 표시 없음
--   I  반복 실행 안전: 두 번째 load = 변화 없음 · 기존 합성 프로그램 · 차시 불변
--   R  Readiness: 게시 전 content 미충족(W1~W8 missing) → publish → 실제 콘텐츠로 content ok
--   G  게시본 보호: 게시 차시 section 수정 거부 (DEC-096) · load 재실행은 같은 내용이면 통과
--   X  교차 주차: W8 이 4~7주 산출물을 현수막에 모음 · W6 가정연계 → 8주 현수막
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

-- 기존 합성 차시(다른 프로그램)가 있어도 건드리지 않는지 확인할 fixture
set local session_replication_role = replica;

insert into public.curriculum_programs (id, code, title, duration_weeks, status) values
  ('50000000-0000-0000-0000-0000000e0001', 'SYNTH-P8', '합성 8주 과정(가상)', 8, 'published');
insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status)
select ('51000000-0000-0000-0000-0000000e000' || w)::uuid, '50000000-0000-0000-0000-0000000e0001', w, 1, w || '주 합성 차시(가상)', 'published'
from generate_series(1, 8) as w;

insert into public.organizations (id, name, status) values
  ('10000000-0000-0000-0000-0000000e00a0', 'Org E', 'active');
insert into public.classes (id, organization_id, name, school_year, status) values
  ('30000000-0000-0000-0000-0000000e00a1', '10000000-0000-0000-0000-0000000e00a0', '반 E1', 2026, 'active');

update public.product_versions pv
set lifecycle = 'published', published_at = now()
from public.products p
where p.id = pv.product_id and p.code = 'starter';

insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
select '60000000-0000-0000-0000-0000000e00a0', '10000000-0000-0000-0000-0000000e00a0', pv.id, 'active',
       private.local_today() - 30, private.local_today() + 60
from public.product_versions pv join public.products p on p.id = pv.product_id
where p.code = 'starter';
insert into public.contract_classes (organization_id, contract_id, class_id) values
  ('10000000-0000-0000-0000-0000000e00a0', '60000000-0000-0000-0000-0000000e00a0', '30000000-0000-0000-0000-0000000e00a1');

set local session_replication_role = origin;

create or replace function pg_temp.fp() returns text language sql as $$
  select md5(
    coalesce((select string_agg(t::text, '|' order by t.id) from public.curriculum_programs t), '')
    || coalesce((select string_agg(t::text, '|' order by t.id) from public.curriculum_lessons t), '')
    || coalesce((select string_agg(t::text, '|' order by t.lesson_id, t.section_code) from public.lesson_sections t), ''));
$$;
create or replace function pg_temp.pid() returns uuid language sql as $$
  select id from public.curriculum_programs where code = 'SOYE-STARTER-2026.1';
$$;
create or replace function pg_temp.content_item() returns jsonb language sql as $$
  select e from jsonb_array_elements(private.contract_readiness_internal('60000000-0000-0000-0000-0000000e00a0') -> 'items') e
  where e ->> 'code' = 'content';
$$;
create or replace function pg_temp.body(p_week int, p_code text) returns text language sql as $$
  select s.body from public.lesson_sections s join public.curriculum_lessons l on l.id = s.lesson_id
  where l.program_id = pg_temp.pid() and l.week_no = p_week and s.section_code = p_code;
$$;

select set_config('test.synthetic_fp', (select md5(string_agg(t::text, '|' order by t.id)) from public.curriculum_lessons t
  where t.program_id = '50000000-0000-0000-0000-0000000e0001'), true);


-- ---------------------------------------------------------------------
-- L. 적재
-- ---------------------------------------------------------------------
\ir ../content/starter_2026_1_load.sql

select is((select count(*)::int from public.curriculum_programs where code = 'SOYE-STARTER-2026.1'), 1, 'L1: 프로그램 SOYE-STARTER-2026.1 1개');
select is((select array[status, duration_weeks::text] from public.curriculum_programs where id = pg_temp.pid()), array['draft', '8'], 'L2: 프로그램 = draft · 8주 (승인 전)');
select is((select array_agg(week_no order by week_no) from public.curriculum_lessons where program_id = pg_temp.pid()), array[1,2,3,4,5,6,7,8], 'L3: 차시 W1~W8 (주차 순서 · 각 1개)');
select is((select array_agg(title order by week_no) from public.curriculum_lessons where program_id = pg_temp.pid()),
  array['유치원 가는 날','끝까지 해보자','마음을 말해줘','소예의 씨앗','우린 모두 특별해','우리들의 비밀기지','나비야 놀자!','모이면 숲이 되는 우리'],
  'L4: 차시 제목 = 원본 교사용 가이드 표지 제목');
select is((select count(*)::int from public.curriculum_lessons where program_id = pg_temp.pid() and status = 'draft' and session_no = 1 and duration_minutes is null), 8,
  'L5: 8차시 모두 draft · session 1 · duration_minutes NULL (원본은 범위만 · UNKNOWN 유지)');
select is((select count(*)::int from public.lesson_sections s join public.curriculum_lessons l on l.id = s.lesson_id where l.program_id = pg_temp.pid()), 136,
  'L6: section 136 = 8 × 17');
select is((select count(*)::int from public.curriculum_lessons l where l.program_id = pg_temp.pid()
           and (select count(*) from public.lesson_sections s where s.lesson_id = l.id and s.section_code = any (private.required_lesson_sections())) = 11), 8,
  'L7: 8차시 모두 필수 section 11개');
select is((select count(*)::int from public.lesson_sections s join public.curriculum_lessons l on l.id = s.lesson_id
           where l.program_id = pg_temp.pid() and (s.source_ref is null or s.source_ref not like 'SOYE_KIDS_%주차_교사용_수업가이드.pdf §%')), 0,
  'L8: 모든 section 에 원본 파일 · 절 source_ref');
select is((select count(*)::int from public.lesson_sections s join public.curriculum_lessons l on l.id = s.lesson_id
           where l.program_id = pg_temp.pid() and s.body ~ '(가상|샘플|TODO|임시|dummy|lorem|placeholder)'), 0,
  'L9: 합성 · 임시 표시 없음 ((가상) · 샘플 · TODO · 임시 · dummy)');
select ok((select min(char_length(s.body)) from public.lesson_sections s join public.curriculum_lessons l on l.id = s.lesson_id where l.program_id = pg_temp.pid()) >= 60,
  'L10: 모든 section 본문이 원본 내용 (최소 60자 · 빈 채움 없음)');


-- ---------------------------------------------------------------------
-- I. 반복 실행 안전 · 다른 데이터 불변
-- ---------------------------------------------------------------------
select set_config('test.fp1', pg_temp.fp(), true);
\ir ../content/starter_2026_1_load.sql
select is(pg_temp.fp(), current_setting('test.fp1'), 'I1: load 두 번째 실행 = 변화 없음 (결정적 id · 같은 본문)');
select is((select md5(string_agg(t::text, '|' order by t.id)) from public.curriculum_lessons t where t.program_id = '50000000-0000-0000-0000-0000000e0001'),
  current_setting('test.synthetic_fp'), 'I2: 기존 합성 프로그램의 차시는 그대로 (삭제 · 수정 없음)');


-- ---------------------------------------------------------------------
-- R. Readiness (실제 콘텐츠)
-- ---------------------------------------------------------------------
set local session_replication_role = replica;
insert into public.class_program_assignments (id, organization_id, class_id, program_id, status)
values ('70000000-0000-0000-0000-0000000e00a1', '10000000-0000-0000-0000-0000000e00a0', '30000000-0000-0000-0000-0000000e00a1', pg_temp.pid(), 'active');
set local session_replication_role = origin;

select is((select jsonb_agg((m ->> 'week_no')::int order by (m ->> 'week_no')::int) from jsonb_array_elements(pg_temp.content_item() -> 'detail' -> 'missing_weeks') m), '[1, 2, 3, 4, 5, 6, 7, 8]'::jsonb,
  'R1: 게시 전(draft) = content 미충족 · W1~W8 missing (draft 는 Readiness 를 채우지 않는다)');

\ir ../content/starter_2026_1_publish.sql

select is((select status from public.curriculum_programs where id = pg_temp.pid()), 'published', 'R2: publish 후 프로그램 published');
select is((select count(*)::int from public.curriculum_lessons where program_id = pg_temp.pid() and status = 'published'), 8, 'R3: publish 후 8차시 published');
select is((pg_temp.content_item() ->> 'ok')::boolean, true, 'R4: STARTER 계약 Readiness content = ok (실제 W1~W8 콘텐츠 · 합성 아님)');
select is(pg_temp.content_item() -> 'detail' -> 'missing_weeks', '[]'::jsonb, 'R5: missing_weeks = []');


-- ---------------------------------------------------------------------
-- G. 게시본 보호
-- ---------------------------------------------------------------------
select throws_ok(
  $$ update public.lesson_sections set body = body || ' 수정' where section_code = 's1'
     and lesson_id = (select id from public.curriculum_lessons where program_id = pg_temp.pid() and week_no = 1) $$,
  '23514', NULL, 'G1: 게시 차시 section 수정 거부 (DEC-096 · 조용한 수정 금지)');
select set_config('test.fp2', pg_temp.fp(), true);
select is((select count(*)::int from public.lesson_sections s join public.curriculum_lessons l on l.id = s.lesson_id where l.program_id = pg_temp.pid()), 136, 'G2: 게시 후 section 136 그대로');
\ir ../content/starter_2026_1_load.sql
select is(pg_temp.fp(), current_setting('test.fp2'), 'G3: 게시 후 load 재실행 = 같은 내용이면 변화 없이 통과');


-- ---------------------------------------------------------------------
-- X. 교차 주차 · 내용 대응
-- ---------------------------------------------------------------------
select ok(pg_temp.body(8, 's8') like '%4~7주 동안 만든 완성품 또는 제공 도안을 현수막에 붙여%', 'X1: W8 공동작품 = 4~7주 완성품 · 도안을 현수막에 모음');
select ok(pg_temp.body(8, 's4b') like '%씨앗 → 새싹 → 꽃 → 비·바람·햇살 → 나비·벌%', 'X2: W8 붙이는 순서 = 씨앗→새싹(W4)→꽃(W5)→비·바람·햇살(W6)→나비·벌(W7)');
select ok(pg_temp.body(6, 's13') like '%8주차 ‘우리 반 성장 숲’ 대형 현수막%', 'X3: W6 가정연계 작품 → 8주차 현수막');
select ok(pg_temp.body(4, 's4a') like '%새싹 장식%' and pg_temp.body(5, 's8') like '%나만의 꽃%' and pg_temp.body(7, 's4a') like '%데칼코마니용 나비 도안%',
  'X4: W8 현수막 요소의 원천 주차 (W4 새싹 · W5 꽃 · W7 나비)');
select is((select array_agg(substring(pg_temp.body(w, 's2') from '성장키워드 — ([^\n]+)') order by w) from generate_series(1, 8) as w),
  array['시작','끈기','표현','시작','자존감','협력','기다림','공동체'], 'X5: 성장키워드 = 원본 표기 (W4 ‘시작’ 은 원본 그대로 · 충돌 기록됨)');
select ok(pg_temp.body(2, 's8') like '%이 메달은%' and pg_temp.body(1, 's8') like '%이름표%'
  and pg_temp.body(1, 's9') like '%워크북은%', 'X6: s8 = 미술 · s9 = 워크북 (원본 절 번호가 달라도 의미로 대응)');

select * from finish();
rollback;
