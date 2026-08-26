-- =========================================================
-- SERVICE-06C-A — 원장/교사 수업 이력 조회 기반 (SELECT 전용)
-- =========================================================
--
-- 해결하는 문제
--
--   class_sessions 행은 20260826에서 이미 이력으로 잘 남는다.
--   그런데 그 수업을 화면에 그리려면 옆 테이블의 metadata가 필요하다.
--
--     반 이름 · 연령 · 학년도   → public.classes
--     배정 상태 · 시작일        → public.class_program_assignments
--     프로그램명 · 코드         → public.curriculum_programs
--     주차 · 차시 · 차시명      → public.curriculum_lessons
--
--   지금 이 네 테이블의 SELECT는 "현재 유효한 것"만 열어 준다.
--   수업이 끝난 뒤 반이 보관되거나 프로그램·차시가 archived 되면
--   행은 남아 있는데 이름을 읽지 못해 수업 이력 화면이 "—"로 무너진다.
--
--   SOYES 운영자는 is_soyes_admin() 분기로 전부 보이므로 Admin 화면(06B)은 멀쩡하다.
--   이 Migration은 원장/교사에게만 해당하는 구멍을 메운다.
--
-- ★ 이 Migration이 하는 일은 SELECT 확장뿐이다.
--   INSERT / UPDATE / DELETE Policy, GRANT, 컬럼, FK, status, trigger를 일절 건드리지 않는다.
--   "새 수업을 만들 수 있는 조건"과 "지난 수업을 읽을 수 있는 조건"은 완전히 별개다.
--   전자는 20260826의 strict 규칙(active assignment · active class ·
--   published program · published lesson · strict class teacher)이 그대로 유지된다.
--
-- ★ 열어 주는 범위는 "실제로 연결된 것"뿐이다.
--   draft/archived라는 이유만으로 콘텐츠가 보이지는 않는다.
--   그 프로그램을 우리 기관이 배정한 적이 있거나,
--   그 차시로 우리 반이 실제 수업을 연 적이 있어야 한다.
--
-- 재사용하는 기존 helper (새로 만들지 않는다)
--   private.is_soyes_admin() · private.has_org_role()
--   private.is_assigned_class_teacher()   ← 20260826. 반이 보관되어도 유지되는 교사 판정
--
-- 새로 추가하는 것
--   private.can_read_program_history()  — 우리와 배정 관계가 있는 프로그램인가
--   private.can_read_lesson_history()   — 우리 수업에 실제로 쓰인 차시인가


-- =========================================================
-- 0. RLS 재귀에 대한 메모 (설계 근거)
-- =========================================================
-- 아래 helper는 SECURITY DEFINER이므로 함수 소유자(postgres) 권한으로 실행된다.
-- Postgres에서 테이블 소유자는 RLS를 우회한다 — 단, force row level security가 꺼져 있을 때만.
-- 이 프로젝트는 20260815 / 20260824 / 20260825 주석에서 force RLS를 명시적으로 금지하고 있고
-- 실제로 어디에도 켜져 있지 않다.
--
-- 따라서 can_read_lesson_history()가 public.class_sessions를 읽어도
-- class_sessions의 SELECT Policy가 다시 평가되지 않는다.
--   curriculum_lessons Policy → helper → class_sessions Policy → curriculum_lessons Policy
-- 같은 순환이 생기지 않는다.
--
-- 권한 판정도 Policy를 재사용하지 않고 helper 안에서 직접 join으로 끝낸다.
-- (is_soyes_admin / has_org_role / is_assigned_class_teacher 세 갈래는
--  20260826의 class_sessions SELECT Policy와 글자 그대로 같은 조건이다.)
--
-- ※ 앞으로도 이 네 테이블에 force row level security를 켜지 마라.
--   켜는 순간 위 우회가 사라져 helper가 재귀하거나 조용히 0건을 돌려준다.


-- =========================================================
-- 1. Helper — 우리와 배정 관계가 있는 프로그램인가?
-- =========================================================
-- "이 프로그램을 참조하는 class_program_assignments가 있고,
--  그 배정에 내가 접근할 수 있는가"만 본다.
--
-- 배정의 status는 보지 않는다. completed/cancelled 배정의 프로그램명도
-- 이력 화면에 그대로 떠야 하기 때문이다.
-- 프로그램의 status도 보지 않는다. 이 helper의 존재 이유가 archived 프로그램이다.
--
-- 조회는 class_program_assignments_program_id_idx(20260825)가 받는다.
create or replace function private.can_read_program_history(p_program_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_program_assignments a
    where a.program_id = p_program_id
      and (
        (select private.is_soyes_admin())
        or private.has_org_role(a.organization_id, array['director'])
        or private.is_assigned_class_teacher(a.class_id)
      )
  );
$$;

revoke execute on function private.can_read_program_history(uuid) from public;
grant execute on function private.can_read_program_history(uuid) to authenticated;


-- =========================================================
-- 2. Helper — 우리 수업에 실제로 쓰인 차시인가?
-- =========================================================
-- 기준을 "프로그램 단위"가 아니라 "수업 단위"로 잡은 것이 핵심이다.
--
--   프로그램 단위로 열면: 우리가 1주차만 운영했어도
--   그 프로그램의 draft 차시 전부가 교사에게 보인다. → 과다 노출
--
--   수업 단위로 열면: 실제로 열었던 차시만 보인다. → 이력에 필요한 만큼만
--
-- 조회는 class_sessions_lesson_idx(20260826)가 받는다.
create or replace function private.can_read_lesson_history(p_lesson_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_sessions cs
    where cs.lesson_id = p_lesson_id
      and (
        (select private.is_soyes_admin())
        or private.has_org_role(cs.organization_id, array['director'])
        or private.is_assigned_class_teacher(cs.class_id)
      )
  );
$$;

revoke execute on function private.can_read_lesson_history(uuid) from public;
grant execute on function private.can_read_lesson_history(uuid) to authenticated;


-- =========================================================
-- 3. public.classes — 교사의 보관된 반 이력 조회
-- =========================================================
-- 기존 Policy는 교사 분기에 private.is_class_teacher(id)를 썼고,
-- 이 helper는 classes.status = 'active'를 요구한다.
-- 그래서 반이 보관되는 순간 담당 교사가 그 반의 이름조차 읽지 못했다.
--
-- 교사 분기만 is_assigned_class_teacher(id)로 바꾼다.
-- (20260826의 class_sessions SELECT가 이미 쓰고 있는 판정과 같은 기준으로 맞춘다.)
--
-- ★ 운영자·원장 분기는 손대지 않는다.
-- ★ classes의 INSERT / UPDATE Policy는 그대로다 —
--   보관된 반을 교사가 수정할 수 있게 되는 일은 없다.
drop policy if exists "classes readable by org staff and soyes admin"
on public.classes;

create policy "classes readable by org staff and soyes admin"
  on public.classes
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(id)
  );


-- =========================================================
-- 4. public.class_program_assignments — 교사의 배정 이력 조회
-- =========================================================
-- 같은 문제다. 반이 보관되면 담당 교사가 그 반의 배정 이력(어떤 프로그램을
-- 언제부터 운영했는지)을 통째로 잃었다.
--
-- ★ 원장 분기는 status 조건이 없어 terminal 배정도 이미 잘 보인다. 그대로 둔다.
-- ★ INSERT / UPDATE Policy는 건드리지 않는다.
--   05C의 배정 생성·종료 규칙(active class · published program · terminal 잠금)은 그대로다.
drop policy if exists "class program assignments readable by org staff and soyes admin"
on public.class_program_assignments;

create policy "class program assignments readable by org staff and soyes admin"
  on public.class_program_assignments
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );


-- =========================================================
-- 5. public.curriculum_programs — 배정된 프로그램의 이력 조회
-- =========================================================
-- 기존 두 분기(운영자 / published + 활성 기관 구성원)를 글자 그대로 보존하고
-- 이력 분기만 OR로 덧붙인다. 지금 잘 되는 published 접근은 전혀 바뀌지 않는다.
--
-- 이 한 줄로 "우리 기관이 배정했던 프로그램"은 나중에 archived 되어도
-- 이름·코드를 계속 읽을 수 있다. 배정한 적 없는 draft/archived 프로그램은 여전히 안 보인다.
drop policy if exists "curriculum programs readable by soyes admin and org members"
on public.curriculum_programs;

create policy "curriculum programs readable by soyes admin and org members"
  on public.curriculum_programs
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or (
      status = 'published'
      and (select private.is_active_org_member())
    )
    or private.can_read_program_history(id)
  );


-- =========================================================
-- 6. public.curriculum_lessons — 실제 수업에 쓰인 차시의 이력 조회
-- =========================================================
-- 기존 분기를 그대로 두고 이력 분기만 덧붙인다.
--
-- 기존 조건에는 is_published_program(program_id)가 들어 있어서,
-- 차시 자체가 published여도 프로그램이 나중에 archived되면 함께 사라졌다.
-- 새 분기는 프로그램 status를 보지 않으므로 그 경우까지 함께 복구된다.
--
-- 열리는 범위는 "우리 반이 실제로 수업을 연 차시"뿐이다.
-- 같은 프로그램의 다른 draft 차시는 열리지 않는다.
drop policy if exists "curriculum lessons readable by soyes admin and org members"
on public.curriculum_lessons;

create policy "curriculum lessons readable by soyes admin and org members"
  on public.curriculum_lessons
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or (
      status = 'published'
      and private.is_published_program(program_id)
      and (select private.is_active_org_member())
    )
    or private.can_read_lesson_history(id)
  );


-- =========================================================
-- 7. public.lesson_activities — 의도적으로 넓히지 않는다
-- =========================================================
-- 06C-B의 수업 이력 화면에 필요한 것은 "언제 어느 차시를 했는가"까지다.
-- 활동(도입·본활동·마무리 각 단계의 설명과 준비물)은 수업을 실제로 진행할 때 쓰고,
-- 그 시점에는 차시가 published여야 하므로 기존 Policy로 이미 충분하다.
--
-- 지난 수업의 활동 상세까지 필요하다는 요구가 실제로 나오면
-- can_read_lesson_history(lesson_id)를 그대로 재사용해 그때 열면 된다.
-- 지금 미리 열어 둘 이유가 없다. (최소 권한)


-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.children              SELECT — 원아 정보는 이력 화면에 필요 없다. 그대로 둔다.
--   public.class_sessions        SELECT/INSERT/UPDATE — 20260826 그대로.
--   모든 테이블의 INSERT / UPDATE / DELETE Policy
--   모든 GRANT (컬럼 단위 권한 포함)
--   테이블 컬럼 · FK · CHECK · index · trigger
--   private.is_class_teacher()   — "지금 운영 중인 반의 담당 교사"라는 뜻 그대로.
--                                   신규 수업 INSERT 판정에서 계속 이 helper를 쓴다.
