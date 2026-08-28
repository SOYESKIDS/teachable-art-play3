-- =========================================================
-- SERVICE-07A-1 — 출결 화면을 위한 원아 이름 조회 (children SELECT 전용)
-- =========================================================
--
-- 해결하는 문제
--
--   20260828이 class_session_attendance를 만들면서 교사 SELECT를
--   private.is_assigned_class_teacher(class_id)로 열었다.
--   반이 보관돼도, 원아가 다른 반으로 옮겨가도 출결 행은 계속 보인다.
--
--   그런데 정작 원아 이름을 읽는 public.children의 교사 분기는
--     status = 'active' AND private.is_class_teacher(class_id)
--   라서 기준이 서로 어긋나 있었다. 그 결과 교사 화면에서
--   "출결 행은 있는데 이름이 —로 비는" 구간이 생긴다.
--
--   ① 활성 반의 inactive/graduated 원아  → 이름이 안 보임
--      20260828의 INSERT trigger는 "장기 결석 원아야말로 absent로 기록해야 한다"며
--      children.status를 일부러 보지 않는데, 정작 명단에서 그 원아가 사라진다.
--      보관된 반과 무관하게 "오늘 수업"에서도 재현되는 문제다.
--   ② 보관된 반의 과거 출결 원아        → 이름이 안 보임
--   ③ 다른 반으로 옮겨간 뒤의 과거 출결 → 이름이 안 보임
--      (is_class_teacher가 원아의 "현재" class_id로 판정하기 때문)
--
--   원장·SOYES 운영자는 영향이 없다 — has_org_role 분기에는 반/원아 상태 조건이 없다.
--   즉 이 Migration은 교사 화면만 고친다.
--
-- ★ 이 Migration이 하는 일은 children SELECT 확장뿐이다.
--   children의 INSERT/UPDATE Policy, 모든 GRANT, class_session_attendance의
--   어떤 Policy도 건드리지 않는다. 특히 보관된 반에 새 출결을 넣을 수 있게 되는 일은 없다
--   (그쪽은 20260828의 is_class_teacher + is_recordable_session이 계속 막는다).
--
-- ★ 채택안: B-1 (최소 확장)
--   교사 분기의 status='active' 조건만 제거하고, is_class_teacher(class_id)는 그대로 둔다.
--   그 위에 "출결로 연결된 원아" 분기를 OR로 덧붙인다.
--
--   B-2(교사 분기를 통째로 is_assigned_class_teacher로 교체)는 채택하지 않았다.
--   그렇게 하면 보관된 반의 **전체 원아 명단**이 열린다 —
--   출결 기록이 한 건도 없는 원아까지 포함해서다. 필요한 것보다 넓다.
--
-- 재사용하는 기존 자산 (새로 만들지 않는다)
--   20260813 : private.is_soyes_admin()
--   20260815 : private.has_org_role()
--   20260824 : private.is_class_teacher()          — 교사 분기에 그대로 유지
--   20260826 : private.is_assigned_class_teacher() — 출결 당시 반 기준 판정에 재사용
--
-- 새로 추가하는 것
--   private.can_read_child_attendance_history() — 출결로 연결된 원아인가


-- =========================================================
-- 0. RLS 재귀 검토 (정적 확인 결과)
-- =========================================================
-- 우려한 경로:
--   children SELECT Policy
--     → can_read_child_attendance_history()
--       → public.class_session_attendance
--         → attendance SELECT Policy
--           → children Policy ...?
--
-- 순환하지 않는다. 근거 두 겹.
--
--   (1) helper가 SECURITY DEFINER라 소유자(postgres) 권한으로 실행되고,
--       소유자는 RLS를 우회한다. 이 프로젝트에는 force row level security를
--       실제로 켠 구문이 0건이다(주석의 금지 문구만 있다).
--       따라서 attendance Policy 자체가 평가되지 않는다.
--
--   (2) 설령 평가되더라도 20260828의 attendance Policy는
--       is_soyes_admin / has_org_role / is_assigned_class_teacher / is_recordable_session
--       네 helper만 호출하고, 그중 어느 것도 public.children을 읽지 않는다.
--       되돌아오는 변이 없다.
--
-- ※ 앞으로도 children / class_session_attendance에 force RLS를 켜지 마라.
--   켜는 순간 (1)이 사라지고, (2)만 남아 안전 여유가 한 겹 줄어든다.


-- =========================================================
-- 1. Helper — 출결로 연결된 원아인가?
-- =========================================================
-- 판정 기준은 "출결 행이 실제로 존재하는가"다.
-- 같은 기관·같은 프로그램이라는 이유만으로는 절대 열리지 않는다.
--
-- 교사 분기에 is_assigned_class_teacher(a.class_id)를 쓰는 것이 핵심이다.
--   - a.class_id는 출결을 기록한 "당시의 반"이다(20260828에서 불변).
--   - 원아가 나중에 다른 반으로 옮겨가도 이 값은 그대로라 판정이 흔들리지 않는다.
--   - 반이 보관돼도 유지되므로 과거 이력을 계속 읽을 수 있다.
--   - 반대로 class_teachers 배정이 제거되면 helper가 false가 되어 접근이 끊긴다.
--
-- 조회는 20260828의 class_session_attendance_child_idx가 받는다.
create or replace function private.can_read_child_attendance_history(
  p_child_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_session_attendance a
    where a.child_id = p_child_id
      and (
        (select private.is_soyes_admin())
        or private.has_org_role(a.organization_id, array['director'])
        or private.is_assigned_class_teacher(a.class_id)
      )
  );
$$;

revoke execute on function private.can_read_child_attendance_history(uuid)
from public, anon;

grant execute on function private.can_read_child_attendance_history(uuid)
to authenticated;


-- =========================================================
-- 2. public.children SELECT Policy 교체
-- =========================================================
-- 기존 두 분기(운영자 / 원장)는 글자 그대로 보존한다.
--
-- 교사 분기에서 바뀌는 것은 딱 하나 — status = 'active' 조건 제거.
--   담당 반에 배정된 원아라면 장기 결석(inactive)이든 졸업 예정(graduated)이든
--   그 반의 담임이 이름을 알아야 출결을 남길 수 있다.
--   노출 범위는 여전히 "내가 지금 담당하는 운영 중인 반의 원아"로 묶여 있다
--   (is_class_teacher가 반 active · 기관 active · membership active · role=teacher를 확인한다).
--
-- 그리고 마지막 줄에 출결 이력 분기를 OR로 덧붙인다.
--
-- ★ 보관된 반이면서 출결이 한 건도 없는 원아는 여전히 보이지 않는다.
--   교사 분기는 반이 active가 아니라서 false,
--   helper는 출결 행이 없어서 false. 이것이 B-1과 B-2를 가르는 지점이다.
drop policy if exists "children readable by org staff and soyes admin"
on public.children;

create policy "children readable by org staff and soyes admin"
  on public.children
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_class_teacher(class_id)
    or private.can_read_child_attendance_history(id)
  );


-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.children              INSERT / UPDATE Policy — 그대로.
--                                 DELETE Policy는 원래 없다(그대로 없음).
--                                 GRANT(select 전체 / insert·update 컬럼 목록) — 그대로.
--   public.class_session_attendance  SELECT / INSERT / UPDATE Policy — 그대로.
--                                 DELETE 없음, GRANT 그대로.
--   private.is_class_teacher()   — 의미 그대로. 교사의 신규 출결 INSERT 판정에서 계속 쓴다.
--   테이블·컬럼·FK·CHECK·index·trigger — 추가/변경 0건.
--
-- ※ 남는 한계 (이번에 해결하지 않는다)
--   children에는 반 이동 이력 테이블이 없다. 그래서
--   "수업 당시 햇살반 소속이었지만 출결을 한 번도 기록하지 않은 채
--    다른 반으로 옮겨간 원아"는 과거 세션 명단에서 복원할 방법이 없다.
--   출결 행이 없으니 helper도 근거가 없고, 현재 class_id는 이미 다른 반을 가리킨다.
--   snapshot 컬럼을 급히 만들어 메우지 않는다 — 필요해지면 별도 설계로 다룬다.
