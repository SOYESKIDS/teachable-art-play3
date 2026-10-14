-- =====================================================================
-- E2 되돌리기 — 차시 발행 판정
--
-- 대상 migration: supabase/migrations/20261014091000_e2_lesson_publish_gate.sql
-- 실행 순서: **이 파일** → E1 되돌리기
--
-- ── 되돌리면 무엇이 달라지는가 ─────────────────────────────────
--
-- ★ 서버 쪽 발행 판정이 사라진다. 되돌린 뒤에는 **앱에서 발행을 호출할 수
--   없게 막아야 한다** — RPC 가 없는 상태로 UI 만 남으면 호출이 실패하고,
--   더 나쁘게는 누군가 `curriculum_lessons.status` 를 직접 바꾸게 된다.
--   되돌리기 전에 발행 버튼이 있는 화면을 먼저 내린다.
-- ★ 이미 발행된 차시의 상태는 바뀌지 않는다. 이 파일은 함수만 지운다.
--
-- ── 되돌리지 않는 것 ────────────────────────────────────────────
--
-- 차시 상태(`curriculum_lessons.status`) · 섹션 · 장면 · 검수 기록을
-- 건드리지 않는다. 발행을 되돌리는 것이 아니라 **판정 함수를 지우는 것**이다.
-- 발행 자체를 되돌리려면 별도로 상태를 바꿔야 하고, 그것은 본사 결정이다.
-- =====================================================================

begin;

drop function if exists public.publish_lesson(uuid, text);
drop function if exists public.lesson_review_state(uuid);
drop function if exists public.lesson_publish_blockers(uuid);
drop function if exists private.lesson_content_checksum(uuid);

commit;
