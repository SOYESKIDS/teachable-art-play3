-- =====================================================================
-- E단계 — 24주 콘텐츠 구조·적재·발행 게이트 local 검증 (pgTAP)
-- ---------------------------------------------------------------------
-- 실행: npx supabase test db
--       (local Supabase 전용 · remote 금지 · 하나의 transaction · 끝나면 rollback)
--
-- ★ 이 파일은 **작성만 되었고 아직 실행되지 않았다.** 이 작업 환경에는
--   Postgres·Supabase CLI·Docker 가 없다. 로컬 DB 가 생기면 돌린다.
--
-- 판정하는 것:
--   S  구조: body_json 제약 · 새 표 · RLS 가 켜져 있는가
--   I  멱등: 적재를 두 번 돌려도 행 수가 같고 내용이 같은가
--   K  검수 기록 보호: 재적재가 resolved 를 unresolved 로 되돌리지 않는가
--   P  발행 게이트: 미해결·본사 결정·프로그램 미게시가 막는가
--   C  체크섬: 본문이 바뀌면 검수 시점 체크섬으로 발행이 거부되는가
--   A  권한: 본사 아닌 사용자가 검수 정보를 읽지 못하는가
-- =====================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

-- ---------------------------------------------------------------------
-- S. 구조
-- ---------------------------------------------------------------------

select has_column('public', 'lesson_sections', 'body_json', 'lesson_sections 에 body_json 이 있다');

select col_is_null('public', 'lesson_sections', 'body_json', 'body_json 은 nullable 이다 (옛 적재본 보존)');

select has_table('public', 'lesson_scenes', '교실 화면 장면 표가 있다');
select has_table('public', 'lesson_review_notes', '검수 주의 기록 표가 있다');
select has_table('public', 'lesson_hq_decisions', '본사 결정 표가 있다');
select has_table('public', 'lesson_hq_decision_events', '본사 결정 이력 표가 있다');
select has_table('public', 'lesson_source_documents', '원문 출처 표가 있다');
select has_table('public', 'product_version_programs', '상품 버전 ↔ 프로그램 표가 있다');

-- 검수 정보 네 표는 RLS 가 켜져 있어야 한다. 꺼져 있으면 기관이 읽는다.
select results_eq(
  $$ select count(*)::int from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname in ('lesson_review_notes', 'lesson_hq_decisions',
                         'lesson_hq_decision_events', 'lesson_source_documents')
       and c.relrowsecurity $$,
  $$ values (4) $$,
  '검수 정보 네 표 모두 RLS 가 켜져 있다'
);

-- body_json 은 객체여야 한다 (배열·숫자를 넣으면 읽는 쪽이 모양을 가정할 수 없다)
select throws_ok(
  $$ insert into public.lesson_sections (lesson_id, section_code, body, body_json)
     select id, 's1', 'x', '[]'::jsonb from public.curriculum_lessons limit 1 $$,
  '23514',
  null,
  'body_json 에 배열을 넣으면 거부된다'
);

-- 해결로 표시했는데 근거가 없으면 거부된다
select throws_ok(
  $$ insert into public.lesson_review_notes (lesson_id, section_label, page_no, issue, category, status, evidence)
     select id, '테스트', 1, '테스트', 'extraction', 'resolved', null
     from public.curriculum_lessons limit 1 $$,
  '23514',
  null,
  '근거 없는 해결 표시는 거부된다'
);

-- 장면 시간은 null 을 허용한다 (3권은 단계별 시간이 없다)
select col_is_null('public', 'lesson_scenes', 'base_seconds', '장면 권장 시간은 null 을 허용한다');


-- ---------------------------------------------------------------------
-- I. 적재 멱등
-- ---------------------------------------------------------------------

\ir ../content/tap24_2026_1_load.sql

select results_eq(
  $$ select count(*)::int from public.curriculum_lessons l
     join public.curriculum_programs p on p.id = l.program_id
     where p.code = 'SOYE-TAP24-2026.1' $$,
  $$ values (24) $$,
  '차시 24개가 적재된다'
);

select results_eq(
  $$ select count(*)::int from public.lesson_sections s
     join public.curriculum_lessons l on l.id = s.lesson_id
     join public.curriculum_programs p on p.id = l.program_id
     where p.code = 'SOYE-TAP24-2026.1' $$,
  $$ values (408) $$,
  'section 408개가 적재된다 (24 × 17)'
);

select results_eq(
  $$ select count(*)::int from public.lesson_scenes sc
     join public.curriculum_lessons l on l.id = sc.lesson_id
     join public.curriculum_programs p on p.id = l.program_id
     where p.code = 'SOYE-TAP24-2026.1' $$,
  $$ values (240) $$,
  '장면 240개가 적재된다'
);

select results_eq(
  $$ select count(*)::int from public.lesson_review_notes n
     join public.curriculum_lessons l on l.id = n.lesson_id
     join public.curriculum_programs p on p.id = l.program_id
     where p.code = 'SOYE-TAP24-2026.1' $$,
  $$ values (168) $$,
  '검수 기록 168건이 적재된다'
);

-- 모든 section 에 body_json 이 있다 (구조가 빠진 행이 없다)
select results_eq(
  $$ select count(*)::int from public.lesson_sections s
     join public.curriculum_lessons l on l.id = s.lesson_id
     join public.curriculum_programs p on p.id = l.program_id
     where p.code = 'SOYE-TAP24-2026.1' and s.body_json is null $$,
  $$ values (0) $$,
  'body_json 이 빠진 section 이 없다'
);

-- 두 번째 실행 — 행 수가 늘지 않는다
\ir ../content/tap24_2026_1_load.sql

select results_eq(
  $$ select count(*)::int from public.lesson_sections s
     join public.curriculum_lessons l on l.id = s.lesson_id
     join public.curriculum_programs p on p.id = l.program_id
     where p.code = 'SOYE-TAP24-2026.1' $$,
  $$ values (408) $$,
  '재실행해도 section 이 중복되지 않는다'
);

select results_eq(
  $$ select count(*)::int from public.lesson_scenes sc
     join public.curriculum_lessons l on l.id = sc.lesson_id
     join public.curriculum_programs p on p.id = l.program_id
     where p.code = 'SOYE-TAP24-2026.1' $$,
  $$ values (240) $$,
  '재실행해도 장면이 중복되지 않는다'
);

-- 최초 적재는 draft 다. 자동 발행하지 않는다.
select results_eq(
  $$ select count(*)::int from public.curriculum_lessons l
     join public.curriculum_programs p on p.id = l.program_id
     where p.code = 'SOYE-TAP24-2026.1' and l.status <> 'draft' $$,
  $$ values (0) $$,
  '최초 적재는 전부 draft 다 (자동 발행 없음)'
);


-- ---------------------------------------------------------------------
-- K. 검수 기록 보호 — 재적재가 사람 판단을 지우지 않는다
-- ---------------------------------------------------------------------

update public.lesson_review_notes n
set status = 'resolved', evidence = '사람이 확인함 (테스트)'
where n.id = (
  select n2.id from public.lesson_review_notes n2
  join public.curriculum_lessons l on l.id = n2.lesson_id
  join public.curriculum_programs p on p.id = l.program_id
  where p.code = 'SOYE-TAP24-2026.1' and n2.status = 'unresolved'
  limit 1
);

\ir ../content/tap24_2026_1_load.sql

select results_eq(
  $$ select count(*)::int from public.lesson_review_notes
     where evidence = '사람이 확인함 (테스트)' and status = 'resolved' $$,
  $$ values (1) $$,
  '재적재가 resolved 를 unresolved 로 되돌리지 않는다'
);


-- ---------------------------------------------------------------------
-- P. 발행 게이트
-- ---------------------------------------------------------------------

-- 미해결이 남은 주차는 막힌다 (2·5·6주는 본사 결정 대기)
select isnt_empty(
  $$ select blocker from public.lesson_publish_blockers((
       select l.id from public.curriculum_lessons l
       join public.curriculum_programs p on p.id = l.program_id
       where p.code = 'SOYE-TAP24-2026.1' and l.week_no = 6
     )) $$,
  '6주차는 발행이 막힌다 (본사 결정 대기)'
);

select results_eq(
  $$ select blocker from public.lesson_publish_blockers((
       select l.id from public.curriculum_lessons l
       join public.curriculum_programs p on p.id = l.program_id
       where p.code = 'SOYE-TAP24-2026.1' and l.week_no = 6
     )) where blocker = 'open_hq_decisions' $$,
  $$ values ('open_hq_decisions') $$,
  '막는 이유에 본사 결정 대기가 들어 있다'
);

-- 프로그램이 draft 면 차시만 바꿔도 교사에게 보이지 않는다 → 막는다
select results_eq(
  $$ select blocker from public.lesson_publish_blockers((
       select l.id from public.curriculum_lessons l
       join public.curriculum_programs p on p.id = l.program_id
       where p.code = 'SOYE-TAP24-2026.1' and l.week_no = 1
     )) where blocker = 'program_not_published' $$,
  $$ values ('program_not_published') $$,
  '프로그램이 draft 면 발행이 막힌다'
);

-- 체크섬이 형식에 맞지 않으면 거부
select throws_ok(
  $$ select public.publish_lesson((
       select l.id from public.curriculum_lessons l
       join public.curriculum_programs p on p.id = l.program_id
       where p.code = 'SOYE-TAP24-2026.1' and l.week_no = 1
     ), 'not-a-checksum') $$,
  '23514',
  null,
  '체크섬 형식이 아니면 발행이 거부된다'
);


-- ---------------------------------------------------------------------
-- C. 체크섬 — 본문이 바뀌면 검수본과 다르다
-- ---------------------------------------------------------------------

select isnt(
  (select private.lesson_content_checksum((
     select l.id from public.curriculum_lessons l
     join public.curriculum_programs p on p.id = l.program_id
     where p.code = 'SOYE-TAP24-2026.1' and l.week_no = 1
   ))),
  null,
  '체크섬이 계산된다'
);

do $$
declare
  v_lesson uuid;
  v_before text;
  v_after text;
begin
  select l.id into v_lesson from public.curriculum_lessons l
  join public.curriculum_programs p on p.id = l.program_id
  where p.code = 'SOYE-TAP24-2026.1' and l.week_no = 1;

  v_before := private.lesson_content_checksum(v_lesson);

  update public.lesson_sections
  set body = body || ' (검수 이후 끼어든 수정)'
  where lesson_id = v_lesson and section_code = 's1';

  v_after := private.lesson_content_checksum(v_lesson);

  if v_before = v_after then
    raise exception '본문을 바꿨는데 체크섬이 같다 — TOCTOU 방어가 동작하지 않는다';
  end if;
end;
$$;

select pass('본문이 바뀌면 체크섬이 달라진다 (검수 이후 수정 탐지)');

-- 장면만 바꿔도 체크섬이 달라진다 (장면도 교사가 보는 내용이다)
do $$
declare
  v_lesson uuid;
  v_before text;
begin
  select l.id into v_lesson from public.curriculum_lessons l
  join public.curriculum_programs p on p.id = l.program_id
  where p.code = 'SOYE-TAP24-2026.1' and l.week_no = 2;

  v_before := private.lesson_content_checksum(v_lesson);
  update public.lesson_scenes set kid_text = kid_text || '!' where lesson_id = v_lesson and scene_no = 1;

  if v_before = private.lesson_content_checksum(v_lesson) then
    raise exception '장면을 바꿨는데 체크섬이 같다';
  end if;
end;
$$;

select pass('장면이 바뀌어도 체크섬이 달라진다');


-- ---------------------------------------------------------------------
-- A. 권한 — 검수 정보는 본사 밖으로 나가지 않는다
-- ---------------------------------------------------------------------

-- anon 에는 아무 권한도 없다
select results_eq(
  $$ select count(*)::int from information_schema.role_table_grants
     where grantee = 'anon'
       and table_schema = 'public'
       and table_name in ('lesson_review_notes', 'lesson_hq_decisions',
                          'lesson_hq_decision_events', 'lesson_source_documents',
                          'lesson_scenes', 'product_version_programs') $$,
  $$ values (0) $$,
  'anon 은 새 표에 아무 권한이 없다'
);

-- 검수 정보 표의 정책은 본사 전용 하나뿐이다 (기관 읽기 정책이 없다)
select results_eq(
  $$ select count(*)::int from pg_policies
     where schemaname = 'public'
       and tablename in ('lesson_review_notes', 'lesson_hq_decisions',
                         'lesson_hq_decision_events', 'lesson_source_documents')
       and qual not like '%is_hq_admin%' $$,
  $$ values (0) $$,
  '검수 정보 표에는 본사 외 읽기 정책이 없다'
);

select * from finish();

rollback;
