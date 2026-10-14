-- =====================================================================
-- E1 되돌리기 — 24주 교안 콘텐츠 저장 구조
--
-- 대상 migration: supabase/migrations/20261014090000_e1_lesson_content_structure.sql
-- 실행 순서: E2 되돌리기 → **이 파일** (E2 함수가 이 표들을 읽는다)
--
-- ── 무엇이 사라지는가 ───────────────────────────────────────────
--
-- ★ `lesson_sections.body_json` 을 지우면 **구조가 사라진다.** 표의 열 제목,
--   묶음 소제목, null 과 빈 배열의 구분이 함께 사라진다. `body` 평문은 남으므로
--   화면은 계속 뜨지만 **읽는 뜻이 달라진다** (14번 가운데 칸이 대표적이다).
--   되돌리기 전에 적재 스크립트로 다시 넣을 수 있는지 확인한다.
-- ★ 장면·검수 기록·본사 결정 이력이 사라진다. 이력은 다시 만들 수 없다.
--
-- ── 되돌리지 않는 것 ────────────────────────────────────────────
--
-- `lesson_sections.body` · `curriculum_lessons` · `curriculum_programs` ·
-- 계약 · 수업 · 관찰 · 리포트는 건드리지 않는다. E1 이 만들지 않았다.
--
-- ── 안전한 순서 ─────────────────────────────────────────────────
--
-- 1) 먼저 데이터를 내보낸다 (아래 주석의 select 를 돌려 결과를 보관)
-- 2) E2 되돌리기 실행
-- 3) 이 파일 실행
-- =====================================================================

-- 되돌리기 전에 내보낼 것 (실행하지 않고 참고만):
--   select lesson_id, section_code, body_json from public.lesson_sections where body_json is not null;
--   select * from public.lesson_scenes order by lesson_id, scene_no;
--   select * from public.lesson_review_notes order by lesson_id;
--   select * from public.lesson_hq_decisions order by decision_key;
--   select * from public.lesson_hq_decision_events order by decision_id, created_at;
--   select * from public.lesson_source_documents order by lesson_id;
--   select * from public.product_version_programs;

begin;

-- 1. 이력 → 결정 순서 (외래키 때문에 이력이 먼저)
drop table if exists public.lesson_hq_decision_events;
drop table if exists public.lesson_hq_decisions;

-- 2. 나머지 새 표
drop table if exists public.lesson_review_notes;
drop table if exists public.lesson_scenes;
drop table if exists public.lesson_source_documents;
drop table if exists public.product_version_programs;

-- 3. lesson_sections 확장 되돌리기
--    ★ 컬럼을 지우면 구조가 사라진다. 위 주석의 내보내기를 먼저 했는지 확인한다.
revoke insert (body_json) on public.lesson_sections from authenticated;
revoke update (body_json) on public.lesson_sections from authenticated;

alter table public.lesson_sections
  drop constraint if exists lesson_sections_body_json_shape_check;
alter table public.lesson_sections
  drop constraint if exists lesson_sections_body_json_size_check;

alter table public.lesson_sections
  drop column if exists body_json;

commit;
