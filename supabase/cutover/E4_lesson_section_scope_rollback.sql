-- =====================================================================
-- E4 되돌리기 — 수업 본문·활동 읽기 범위를 M1 상태로 돌린다
--
-- ⚠️ 되돌리면 **다시 열리는 것**
--
--   계약 주차 범위 밖 본문이 활성 기관 구성원 누구에게나 읽힌다.
--   8주 계약 기관의 교사가 `lesson_sections` 를 직접 조회해 24주차 본문을
--   가져갈 수 있다. 같은 일이 `lesson_activities` 에서도 열린다.
--
--   즉 **상품 범위가 콘텐츠에서 사라진다.** 8주를 판 기관이 24주를 본다.
--   화면(CONTENT_SOURCE=database 경로)은 계약으로 주차를 거르지만, 그것은
--   화면의 거름일 뿐이고 DB 직접 조회는 막히지 않는다.
--
--   → 되돌리기 전에 `CONTENT_SOURCE` 를 `fixture` 로 내려 DB 경로를 닫는다.
--
-- 되돌리는 순서: 이 파일 → E3 → E2 → E1
-- =====================================================================

begin;

-- 1) 본문 정책을 M1(20261001091000) 의 조건으로 되돌린다.
drop policy if exists "lesson sections readable" on public.lesson_sections;

create policy "lesson sections readable"
  on public.lesson_sections
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (
      (select private.is_active_org_member())
      and private.is_published_lesson(lesson_id)
    )
  );

-- 2) 수업 활동 정책을 20260825 의 조건으로 되돌린다.
drop policy if exists "lesson activities readable by soyes admin and org members"
on public.lesson_activities;

create policy "lesson activities readable by soyes admin and org members"
  on public.lesson_activities
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or (
      private.is_published_lesson(lesson_id)
      and (select private.is_active_org_member())
    )
  );

-- 3) 판정 함수를 지운다. 위 두 정책이 더는 쓰지 않는다.
drop function if exists private.member_lesson_entitled(uuid);

commit;
