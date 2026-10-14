-- =====================================================================
-- E4 — 수업 본문(lesson_sections) 읽기 범위를 계약까지 좁힌다
--
-- ── 무엇이 뚫려 있었나 ──────────────────────────────────────────
--
-- M1 의 정책은 이랬다.
--
--   (is_hq_admin) or (is_active_org_member and is_published_lesson(lesson_id))
--
-- 「활성 기관 구성원이고 게시된 차시면」 — **어느 차시든** 읽힌다.
-- 8주 계약 기관의 교사가 `lesson_sections` 를 직접 조회해 24주차 본문을
-- 가져갈 수 있었다. 계약 주차 범위를 보지 않기 때문이다.
--
-- E3 에서 `lesson_scenes` 는 막았지만 **본문은 그대로였다.** 본문이 더 많은
-- 내용을 담고 있으므로 더 큰 구멍이다.
--
-- ── 어떻게 막나 ─────────────────────────────────────────────────
--
-- 표 정책은 반 id 를 인자로 받을 수 없다. 그래서 「이 사용자의 기관에
-- **그 프로그램을 배정받은 활성 반**이 있고, 그 반의 계약이 이 주차를
-- 포함하는가」로 판정한다. 반 단위 세부 판정은 기존대로 RPC·세션 범위가 한다.
--
-- ★ 기존 STARTER 적재본도 같은 규칙을 탄다. 배정된 반이 있으면 읽히고,
--   없으면 본사만 본다 — 「계약 없이 읽히던 것」이 막히는 것이 의도다.
-- ★ 쓰기 정책(본사 전용)과 게시본 보호 트리거는 건드리지 않는다.
--
-- 적용 순서: E1 → E2 → E3 → 이 파일
-- 되돌리기: supabase/cutover/E4_lesson_section_scope_rollback.sql
-- =====================================================================


-- 이 사용자가 소속된 기관이 이 차시를 계약 범위 안에서 쓰고 있는가.
--
-- ★ 반 단위로 본다. 다른 반의 계약으로 이 반의 콘텐츠가 열리지 않는다는
--   기존 원칙(DEC-083)과 같은 결이다.
create or replace function private.member_lesson_entitled(p_lesson_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.curriculum_lessons l
    join public.class_program_assignments cpa
      on cpa.program_id = l.program_id
     and cpa.status = 'active'
    join public.classes cl
      on cl.id = cpa.class_id
     and cl.organization_id = cpa.organization_id
    join public.organization_members m
      on m.organization_id = cl.organization_id
     and m.user_id = (select auth.uid())
     and m.status = 'active'
    where l.id = p_lesson_id
      and private.class_week_entitled(cpa.class_id, l.week_no)
  );
$$;

comment on function private.member_lesson_entitled(uuid) is
  '이 사용자의 기관이 이 차시를 계약 범위 안에서 쓰는가. 배정된 활성 반 + 계약 주차 범위를 본다.';

revoke execute on function private.member_lesson_entitled(uuid) from public, anon;
grant execute on function private.member_lesson_entitled(uuid) to authenticated;


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
      -- ★ 더해진 조건. 게시됐다는 것만으로는 부족하다 — 계약이 약속한
      --   주차인지까지 본다.
      and private.member_lesson_entitled(lesson_id)
    )
  );


-- 수업 활동(lesson_activities)도 같은 구멍이 있다. 본문만 막고 활동을 열어
-- 두면 같은 내용이 다른 문으로 나간다.
--
-- ★ 정책 이름은 M1 이전(20260825)의 것을 그대로 쓴다 — is_soyes_admin 조건도
--   유지한다. 범위 조건만 더한다.
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
      and private.member_lesson_entitled(lesson_id)
    )
  );
