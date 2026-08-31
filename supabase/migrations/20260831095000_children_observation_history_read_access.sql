-- =========================================================
-- SERVICE-08A (3/4) — 관찰 화면을 위한 원아 이름 조회 (children SELECT 전용)
-- =========================================================
--
-- 해결하는 문제
--
--   2/4 Migration이 class_session_observations를 만들면서 교사 SELECT를
--   private.is_assigned_class_teacher(class_id)로 열었다.
--   반이 보관돼도, 원아가 다른 반으로 옮겨가도 관찰 행은 계속 보인다.
--
--   그런데 정작 원아 이름을 읽는 public.children의 교사 분기는
--     private.is_class_teacher(class_id)          — 원아의 "현재" 반 기준
--     or private.can_read_child_attendance_history(id)  — 출결 행이 있는 원아
--   둘뿐이라, 관찰기록만 있고 출결 행이 없는 원아에서 기준이 어긋난다.
--   그 결과 교사 화면에서 "관찰 행은 있는데 이름이 비는" 구간이 생긴다.
--
--   재현 경로
--     ① 교사가 수업 중 관찰기록을 먼저 저장한다 (출결은 아직 저장 전)
--     ② 그 원아가 다음 주에 다른 반으로 옮겨간다
--     ③ 교사가 과거 수업의 관찰 화면을 연다
--     ④ 관찰 행은 보인다      — is_assigned_class_teacher(class_id) 통과
--     ⑤ 원아 이름은 안 보인다 — is_class_teacher는 현재 class_id 기준이라 false,
--                              can_read_child_attendance_history는 출결 행이 없어 false
--
--   보관된 반의 과거 관찰기록, 출결 없이 관찰만 남은 수업에서도 같은 일이 생긴다.
--   20260829가 출결에서 고쳤던 문제가 관찰에서 그대로 재발한다.
--
--   원장·SOYES 운영자는 영향이 없다 — has_org_role / is_soyes_admin 분기에는
--   반/원아 상태 조건이 없다. 즉 이 Migration은 교사 화면만 고친다.
--
-- ★ 이 Migration이 하는 일은 children SELECT 확장뿐이다.
--   children의 INSERT/UPDATE Policy, 모든 GRANT,
--   class_session_observations / class_session_attendance의 어떤 Policy도 건드리지 않는다.
--   특히 보관된 반에 새 관찰기록을 넣을 수 있게 되는 일은 없다
--   (그쪽은 2/4의 is_class_teacher + is_recordable_session이 계속 막는다).
--
-- ★ 기존 출결 helper를 건드리지 않는다.
--   private.can_read_child_attendance_history()는 정의도 호출부도 그대로 둔다.
--   출결 경로와 관찰 경로를 한 함수로 합치지 않는 이유는,
--   합치면 한쪽 요구가 바뀔 때 다른 쪽 판정까지 조용히 함께 바뀌기 때문이다
--   (20260826이 is_class_teacher를 고치지 않고 새 helper를 만든 것과 같은 판단).
--
-- ★ 독립 Migration으로 유지하는 이유
--   children SELECT Policy 교체는 이미 동작 중인 출결 화면에 영향을 준다.
--   문제가 생겼을 때 이 변경만 되돌릴 수 있어야 한다.
--   (20260828 → 20260829가 같은 이유로 나뉘어 있다.)
--
-- 재사용하는 기존 자산 (새로 만들지 않는다)
--   20260813 : private.is_soyes_admin()
--   20260815 : private.has_org_role()
--   20260824 : private.is_class_teacher()          — 교사 분기에 그대로 유지
--   20260826 : private.is_assigned_class_teacher() — 기록 당시 반 기준 판정에 재사용
--   20260829 : private.can_read_child_attendance_history() — 그대로 유지
--
-- 새로 추가하는 것
--   private.can_read_child_observation_history() — 관찰기록으로 연결된 원아인가


-- =========================================================
-- 0. RLS 재귀 검토 (정적 확인 결과)
-- =========================================================
-- 우려한 경로:
--   children SELECT Policy
--     → can_read_child_observation_history()
--       → public.class_session_observations
--         → observations SELECT Policy
--           → children Policy ...?
--
-- 순환하지 않는다. 근거 두 겹. (20260829:50과 같은 형식으로 확인했다.)
--
--   (1) helper가 SECURITY DEFINER라 소유자(postgres) 권한으로 실행되고,
--       소유자는 RLS를 우회한다. 이 프로젝트에는 force row level security를
--       실제로 켠 구문이 0건이다(주석의 금지 문구만 있다).
--       따라서 observations Policy 자체가 평가되지 않는다.
--
--   (2) 설령 평가되더라도 2/4의 observations Policy는
--       is_soyes_admin / has_org_role / is_assigned_class_teacher / is_recordable_session
--       네 helper만 호출하고, 그중 어느 것도 public.children을 읽지 않는다.
--       is_recordable_session은 class_sessions만, 나머지 셋은
--       organization_members / organizations / class_teachers / classes만 읽는다.
--       되돌아오는 변이 없다.
--
-- ※ 앞으로도 children / class_session_observations / class_session_attendance에
--   force RLS를 켜지 마라. 켜는 순간 (1)이 사라지고 (2)만 남아 안전 여유가 한 겹 줄어든다.
--
-- ※ 이 helper는 SECURITY DEFINER다. SERVICE-08A 전체에서 DEFINER는 이것 하나뿐이다.
--   나머지(2/4의 trigger 2개, 4/4의 RPC)는 전부 SECURITY INVOKER다.
--   여기서만 DEFINER인 이유는 위 (1) — children Policy 안에서 호출되므로
--   호출자 권한으로 실행하면 그 자신이 판정하려는 RLS에 다시 걸리기 때문이다.


-- =========================================================
-- 1. Helper — 관찰기록으로 연결된 원아인가?
-- =========================================================
-- 판정 기준은 "관찰기록 행이 실제로 존재하는가"다.
-- 같은 기관·같은 프로그램이라는 이유만으로는 절대 열리지 않는다.
--
-- 교사 분기에 is_assigned_class_teacher(o.class_id)를 쓰는 것이 핵심이다.
--   - o.class_id는 관찰기록을 남긴 "당시의 반"이다(2/4에서 불변).
--   - 원아가 나중에 다른 반으로 옮겨가도 이 값은 그대로라 판정이 흔들리지 않는다.
--   - 반이 보관돼도 유지되므로 과거 이력을 계속 읽을 수 있다.
--   - 반대로 class_teachers 배정이 제거되면 helper가 false가 되어 접근이 끊긴다.
--
-- 조회는 2/4의 class_session_observations_child_idx가 받는다.

create or replace function private.can_read_child_observation_history(
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
    from public.class_session_observations o
    where o.child_id = p_child_id
      and (
        (select private.is_soyes_admin())
        or private.has_org_role(o.organization_id, array['director'])
        or private.is_assigned_class_teacher(o.class_id)
      )
  );
$$;

revoke execute on function private.can_read_child_observation_history(uuid)
from public, anon;

grant execute on function private.can_read_child_observation_history(uuid)
to authenticated;


-- =========================================================
-- 2. public.children SELECT Policy 교체
-- =========================================================
-- 20260829가 만든 네 분기를 글자 그대로 보존하고, 마지막에 한 줄만 덧붙인다.
--
--   (변경 없음) is_soyes_admin()
--   (변경 없음) has_org_role(organization_id, ['director'])
--   (변경 없음) is_class_teacher(class_id)
--   (변경 없음) can_read_child_attendance_history(id)
--   (신규)      can_read_child_observation_history(id)
--
-- ★ 보관된 반이면서 출결도 관찰도 한 건 없는 원아는 여전히 보이지 않는다.
--   교사 분기는 반이 active가 아니라서 false,
--   helper 둘은 참조할 행이 없어서 false.
--   노출 범위는 "실제 기록으로 연결된 원아"로만 넓어진다.
--
-- ★ INSERT / UPDATE Policy는 건드리지 않는다. DELETE Policy는 원래 없다(그대로 없음).

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
    or private.can_read_child_observation_history(id)
  );


-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.children                  INSERT / UPDATE Policy — 그대로.
--                                    DELETE Policy는 원래 없다(그대로 없음).
--                                    GRANT(select 전체 / insert·update 컬럼 목록) — 그대로.
--                                    테이블·컬럼·FK·CHECK·index·trigger — 추가/변경 0건.
--   public.class_session_attendance  SELECT / INSERT / UPDATE Policy — 그대로.
--   public.class_session_observations
--     class_session_observation_domains
--     observation_domains            — 1/4·2/4에서 만든 그대로.
--   private.can_read_child_attendance_history() — 정의·호출부 모두 그대로.
--   private.is_class_teacher()       — 의미 그대로. 신규 기록 판정에서 계속 쓴다.
--
-- ※ 남는 한계 (이번에 해결하지 않는다 — 20260829:159와 동일)
--   children에는 반 이동 이력 테이블이 없다. 그래서
--   "수업 당시 그 반 소속이었지만 출결도 관찰도 한 번도 남기지 않은 채
--    다른 반으로 옮겨간 원아"는 과거 세션 명단에서 복원할 방법이 없다.
--   참조할 행이 없으니 helper도 근거가 없고, 현재 class_id는 이미 다른 반을 가리킨다.
--   snapshot 컬럼을 급히 만들어 메우지 않는다 — 필요해지면 별도 설계로 다룬다.
