-- =========================================================
-- SERVICE-07B H-1 — 출결 저장 원자성 (atomic transaction)
-- =========================================================
--
-- 해결하는 문제
--
--   지금까지 출결 저장은 PostgREST 요청 여러 개로 나뉘어 있었다.
--     bulk INSERT 1회 + 출결 상태별 UPDATE 최대 4회
--   각 요청이 별도 트랜잭션이라, 두 번째 UPDATE가 실패해도
--   앞선 INSERT와 첫 UPDATE는 이미 커밋되어 되돌아가지 않았다.
--   화면은 "일부가 저장되었을 수 있습니다"라고 안내할 수밖에 없었다.
--
--   이 함수 하나로 UPDATE와 INSERT를 같은 트랜잭션에 묶는다.
--   하나라도 실패하면 전부 rollback된다.
--
-- ★ SECURITY INVOKER다. SECURITY DEFINER를 쓰지 않는다.
--   함수는 호출한 사람(authenticated) 권한으로 실행되므로
--   class_sessions / class_session_attendance / children의
--   기존 RLS Policy와 컬럼 단위 GRANT가 **그대로** 최종 방어선이 된다.
--   즉 이 Migration은 권한을 한 톨도 넓히지 않는다. 원자성만 추가한다.
--
-- ★ organization_id / class_id를 인자로 받지 않는다.
--   반드시 p_session_id로 조회한 class_sessions 행에서 파생한다.
--   호출자가 다른 기관/다른 반을 지정할 표면 자체를 만들지 않는다.
--
-- ★ UPSERT(INSERT ... ON CONFLICT DO UPDATE)를 쓰지 않는다.
--   보관된 반의 교사는 "기존 출결 정정은 가능 / 신규 기록은 불가"인데,
--   UPSERT는 INSERT Policy와 UPDATE Policy가 어느 쪽으로 평가될지
--   의도대로 통제하기 어렵다. UPDATE와 INSERT를 명시적으로 나눠
--   각 Policy가 제 몫대로 평가되게 한다.
--
-- 이 Migration이 만들지 않는 것
--   테이블 · 컬럼 · trigger · Policy · 새 GRANT 대상 · DELETE 경로.
--   기존 RLS를 disable / force / bypass 하는 구문도 없다.


-- =========================================================
-- 사용자 정의 SQLSTATE
-- =========================================================
--   AT001 : 입력 형식 오류 (배열 아님 / 빈 배열 / 상한 초과 / 중복 / 잘못된 상태값)
--   AT002 : 수업을 찾을 수 없거나 접근 권한 없음 (RLS로 0건인 경우 포함)
--   AT003 : 취소된 수업
--
-- Server Action이 이 코드를 보고 사용자 문구를 고른다.
-- DB 내부 메시지를 그대로 화면에 노출하지 않는다.

create or replace function public.save_class_session_attendance_atomic(
  p_session_id uuid,
  p_entries jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- 07B와 같은 상한. types/staff-attendance.ts의 MAX_ATTENDANCE_ROSTER와 맞춘다.
  c_max_entries constant integer := 200;

  v_organization_id uuid;
  v_class_id uuid;
  v_session_status text;

  v_total integer;
  v_distinct integer;
  v_invalid_status integer;
  v_null_child integer;

  v_updated integer := 0;
  v_inserted integer := 0;
begin
  -- ---------------------------------------------------------
  -- 1. 입력 검증
  --
  -- Server Action이 이미 같은 검증을 하지만, authenticated 사용자가
  -- RPC endpoint를 직접 호출할 수 있으므로 DB도 독립적으로 확인한다.
  -- ---------------------------------------------------------
  if p_session_id is null then
    raise exception '수업 정보가 필요합니다.' using errcode = 'AT001';
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception '출결 목록 형식이 올바르지 않습니다.' using errcode = 'AT001';
  end if;

  v_total := jsonb_array_length(p_entries);

  if v_total = 0 then
    raise exception '저장할 출결이 없습니다.' using errcode = 'AT001';
  end if;

  if v_total > c_max_entries then
    raise exception '한 번에 최대 % 명까지 저장할 수 있습니다.', c_max_entries
      using errcode = 'AT001';
  end if;

  -- child_id는 uuid로 캐스팅되며, 형식이 틀리면 여기서 예외가 나고 전체가 rollback된다.
  select
    count(*),
    count(distinct e.child_id),
    count(*) filter (
      where e.attendance_status is null
        or e.attendance_status not in ('present', 'absent', 'late', 'left_early')
    ),
    count(*) filter (where e.child_id is null)
  into v_total, v_distinct, v_invalid_status, v_null_child
  from jsonb_to_recordset(p_entries)
    as e(child_id uuid, attendance_status text);

  if v_null_child > 0 then
    raise exception '원아 정보가 비어 있습니다.' using errcode = 'AT001';
  end if;

  if v_invalid_status > 0 then
    raise exception '허용되지 않는 출결 상태가 있습니다.' using errcode = 'AT001';
  end if;

  if v_total <> v_distinct then
    raise exception '같은 원아가 두 번 이상 포함되어 있습니다.' using errcode = 'AT001';
  end if;

  -- ---------------------------------------------------------
  -- 2. 수업 조회 — 구조 값의 유일한 출처
  --
  -- SECURITY INVOKER이므로 class_sessions SELECT Policy가 그대로 적용된다.
  -- 다른 기관/담당하지 않는 반의 수업이면 여기서 0건이 되어 AT002로 끝난다.
  -- organization_id / class_id는 인자가 아니라 이 행에서만 나온다.
  -- ---------------------------------------------------------
  select s.organization_id, s.class_id, s.status
  into v_organization_id, v_class_id, v_session_status
  from public.class_sessions s
  where s.id = p_session_id;

  if not found then
    raise exception '수업을 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'AT002';
  end if;

  -- 취소된 수업은 20260828 정책대로 조회만 가능하다.
  -- (아래 trigger도 같은 규칙을 막지만, 여기서 먼저 분명한 코드로 끝낸다.)
  if v_session_status = 'cancelled' then
    raise exception '취소된 수업은 출결을 수정할 수 없습니다.'
      using errcode = 'AT003';
  end if;

  -- ---------------------------------------------------------
  -- 3. 기존 출결 UPDATE (집합 연산 1회 — 원아마다 반복하지 않는다)
  --
  -- 값이 실제로 달라진 행만 건드린다.
  -- UPDATE Policy(is_assigned_class_teacher)가 적용되므로
  -- 반이 보관되었거나 원아가 다른 반으로 옮겨간 뒤에도
  -- 담당 관계가 남아 있는 교사는 과거 출결을 정정할 수 있다.
  --
  -- 컬럼 GRANT가 attendance_status 하나뿐이라 다른 컬럼은 손댈 수 없다.
  -- ---------------------------------------------------------
  with entries as (
    select e.child_id, e.attendance_status
    from jsonb_to_recordset(p_entries)
      as e(child_id uuid, attendance_status text)
  )
  update public.class_session_attendance a
  set attendance_status = en.attendance_status
  from entries en
  where a.class_session_id = p_session_id
    and a.organization_id = v_organization_id
    and a.class_id = v_class_id
    and a.child_id = en.child_id
    and a.attendance_status is distinct from en.attendance_status;

  get diagnostics v_updated = row_count;

  -- ---------------------------------------------------------
  -- 4. 없는 출결만 INSERT
  --
  -- organization_id / class_session_id / class_id는 전부 2단계에서 조회한
  -- 수업 행에서 만든다. 입력 JSON에서는 child_id와 상태만 쓴다.
  --
  -- INSERT Policy(is_class_teacher + is_recordable_session)와
  -- enforce_attendance_insert trigger(원아가 이 반 소속인지)가 최종 판정한다.
  --   보관된 반 교사        → INSERT Policy에서 실패
  --   다른 반 원아          → trigger에서 실패
  -- 어느 쪽이든 예외가 나면 3단계 UPDATE까지 함께 rollback된다.
  -- ---------------------------------------------------------
  with entries as (
    select e.child_id, e.attendance_status
    from jsonb_to_recordset(p_entries)
      as e(child_id uuid, attendance_status text)
  )
  insert into public.class_session_attendance (
    organization_id,
    class_session_id,
    class_id,
    child_id,
    attendance_status
  )
  select
    v_organization_id,
    p_session_id,
    v_class_id,
    en.child_id,
    en.attendance_status
  from entries en
  where not exists (
    select 1
    from public.class_session_attendance a
    where a.class_session_id = p_session_id
      and a.child_id = en.child_id
  );

  get diagnostics v_inserted = row_count;

  -- ---------------------------------------------------------
  -- 5. 결과
  --
  -- jsonb 단일 객체로 돌려준다. supabase-js의 rpc()가 배열을 벗겨내는
  -- 규칙에 의존하지 않아 읽는 쪽이 단순해진다.
  -- ---------------------------------------------------------
  return jsonb_build_object(
    'inserted_count', v_inserted,
    'updated_count', v_updated,
    'changed_count', v_inserted + v_updated
  );
end;
$$;


-- =========================================================
-- EXECUTE 권한
-- =========================================================
-- 함수 생성 시 PUBLIC에 자동 부여되는 EXECUTE를 반드시 회수한다.
-- 호출 가능하다고 해서 데이터 접근 권한이 생기지는 않지만
-- (SECURITY INVOKER + RLS가 그대로 적용된다)
-- 익명 사용자가 굳이 호출을 시도할 수 있게 둘 이유가 없다.

revoke execute on function
  public.save_class_session_attendance_atomic(uuid, jsonb)
from public;

revoke execute on function
  public.save_class_session_attendance_atomic(uuid, jsonb)
from anon;

grant execute on function
  public.save_class_session_attendance_atomic(uuid, jsonb)
to authenticated;


-- =========================================================
-- 원자성이 보장되는 이유 (설계 근거)
-- =========================================================
--   PostgREST는 요청 하나를 트랜잭션 하나로 감싼다.
--   RPC 호출은 요청 하나이므로, 이 함수 안의 UPDATE와 INSERT는
--   같은 트랜잭션에서 실행된다.
--
--   함수 안에 EXCEPTION 블록을 두지 않은 것은 의도적이다.
--   BEGIN ... EXCEPTION은 하위 트랜잭션을 만들어 실패를 삼킬 수 있다.
--   여기서는 모든 예외가 그대로 위로 전파되어 트랜잭션 전체가 rollback된다.
--
--   따라서 preflight 이후에 상황이 바뀌어도(반이 보관되거나, 수업이 취소되거나,
--   원아가 다른 반으로 옮겨가거나) RLS/trigger가 다시 막고 부분 저장이 남지 않는다.
--
-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.class_session_attendance  테이블·컬럼·Policy·GRANT·trigger — 그대로
--   public.class_sessions            그대로 (이 함수는 SELECT만 한다. 상태를 바꾸지 않는다)
--   public.children                  그대로
--   private.* helper                 그대로 (재정의하지 않는다)
--   DELETE 경로                      없음 (이 함수도 만들지 않는다)
