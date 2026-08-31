-- =========================================================
-- SERVICE-08A (4/4) — 관찰기록 저장 (atomic transaction + optimistic concurrency)
-- =========================================================
--
-- 해결하는 문제 둘
--
-- (1) 원자성
--     관찰기록 저장은 두 테이블을 건드린다.
--       class_session_observations         (본문 INSERT 또는 UPDATE)
--       class_session_observation_domains  (관찰영역 replace-all)
--     PostgREST 요청을 나눠 보내면 각각 다른 트랜잭션이라,
--     본문은 저장되고 영역은 실패하는 중간 상태가 남는다.
--     이 함수 하나로 묶으면 하나라도 실패할 때 전부 rollback된다.
--
-- (2) 서술 텍스트의 lost update  ★ 출결에는 없던 위험
--
--       T0  교사 A가 원아 X의 관찰을 연다      (teacher_note = "…블록으로 탑을 쌓음")
--       T1  교사 B(부담임)가 같은 관찰을 연다  (같은 내용)
--       T2  A가 문단을 추가하고 저장
--       T3  B가 자기 화면의 옛 내용으로 저장  → A의 문단이 흔적 없이 사라진다
--
--     출결은 4값이라 덮어써도 손실이 작지만, 여기서는 교사가 쓴 문단이
--     통째로 사라지고 아무도 알아채지 못한다. UNIQUE 제약으로는 막을 수 없다.
--     그래서 p_expected_updated_at을 받아 낙관적 동시성으로 막는다.
--
-- ★ SECURITY INVOKER다. SECURITY DEFINER를 쓰지 않는다.
--   함수는 호출한 사람(authenticated) 권한으로 실행되므로
--   class_session_observations / class_session_observation_domains /
--   class_sessions / observation_domains의 기존 RLS Policy와
--   컬럼 단위 GRANT가 **그대로** 최종 방어선이 된다.
--   즉 이 Migration은 권한을 한 톨도 넓히지 않는다. 원자성과 동시성 제어만 추가한다.
--
-- ★ organization_id / class_id / created_by / updated_by를 인자로 받지 않는다.
--   organization_id·class_id는 p_session_id로 조회한 class_sessions 행에서 파생하고,
--   created_by·updated_by는 2/4의 trigger가 auth.uid()로 채운다.
--   호출자가 다른 기관·다른 반·다른 작성자를 지정할 표면 자체를 만들지 않는다.
--
-- ★ EXCEPTION 블록을 두지 않는다 (20260830:255와 같은 판단).
--   BEGIN ... EXCEPTION은 하위 트랜잭션을 만들어 실패를 삼킬 수 있다.
--   여기서는 모든 예외가 그대로 위로 전파되어 트랜잭션 전체가 rollback된다.
--
-- 이 Migration이 만들지 않는 것
--   테이블 · 컬럼 · trigger · Policy · 새 GRANT 대상 · 새 helper · DELETE 경로 추가.
--   기존 RLS를 disable / force / bypass 하는 구문도 없다.


-- =========================================================
-- 사용자 정의 SQLSTATE
-- =========================================================
--   OB001 : 입력 형식 오류 (필수값 누락 / 길이 초과 / 상태값 오류 / 영역 차원·중복·상한)
--   OB002 : 수업 또는 관찰기록을 찾을 수 없거나 접근 권한 없음 (RLS로 0건인 경우 포함)
--   OB003 : 취소된 수업 (시작 시점 검사 + UPDATE 0행 이후 재확인 두 곳에서 난다)
--   OB004 : 다른 사람이 먼저 저장했다 (stale)
--   OB005 : 알 수 없거나 사용 중지된 관찰영역
--
-- SQLSTATE는 [0-9A-Z] 5자여야 한다. 'OB001'~'OB005'는 유효하고,
-- 표준 클래스(00~04, 05~99 등 숫자 시작)와 겹치지 않는다.
-- 20260830이 쓰는 'AT001'~'AT003'과도 겹치지 않는다.
--
-- Server Action이 이 코드를 보고 사용자 문구를 고른다.
-- DB 내부 메시지를 그대로 화면에 노출하지 않는다.
--
-- ※ 위 다섯 코드 외에 아래 표준 코드가 그대로 올라올 수 있다. Action이 함께 매핑해야 한다.
--   23505 unique_violation      — 신규 저장을 동시에 두 번 시도 (아래 "동시 생성" 참조)
--   42501 insufficient_privilege— RLS INSERT/UPDATE Policy 거부
--   23514 check_violation       — 2/4의 trigger 또는 CHECK 제약


-- =========================================================
-- 낙관적 동시성이 실제로 안전한 이유 (설계 근거)
-- =========================================================
-- 이 함수는 행을 미리 잠그지 않는다(FOR UPDATE를 쓰지 않는다).
-- 대신 UPDATE 문 자체의 WHERE에 updated_at 조건을 넣는다.
--
--   update ... where id = ? and updated_at = p_expected_updated_at
--
-- PostgreSQL의 UPDATE는 대상 행에 배타 잠금을 잡고 WHERE를 평가한다.
-- 두 트랜잭션이 같은 행을 노리면 뒤에 온 쪽이 잠금에서 대기하고,
-- 앞선 쪽이 커밋되면 갱신된 행으로 WHERE를 다시 평가한다(EvalPlanQual).
-- 이때 updated_at이 이미 바뀌었으므로 조건에 걸리지 않아 0행이 되고, OB004로 끝난다.
--
-- 즉 "SELECT로 확인 → UPDATE" 사이의 틈이 아예 존재하지 않는다.
-- 아래 3단계의 SELECT는 오류 코드를 정확히 고르기 위한 참고 조회일 뿐,
-- 안전성은 전적으로 UPDATE 문의 WHERE가 보장한다.
--
-- 그리고 이 UPDATE가 잡은 행 잠금은 트랜잭션이 끝날 때까지 유지되므로,
-- 뒤이어 실행되는 관찰영역 replace-all도 같은 순서로 직렬화된다.
--
-- ★ 동시 생성(둘 다 신규)의 경우
--   두 트랜잭션이 같은 (class_session_id, child_id)로 INSERT하면
--   2/4의 UNIQUE 제약이 한쪽을 23505로 거부한다. 중복 행은 생기지 않는다.
--   이 함수는 그 예외를 삼키지 않고 그대로 올려보낸다.
--
-- ★ Client 주의사항 (Server Action이 반드시 지켜야 한다)
--   p_expected_updated_at은 화면을 열 때 받은 updated_at **문자열 그대로** 보내야 한다.
--   JavaScript Date로 파싱했다가 다시 문자열로 만들면 마이크로초가 잘려
--   ("2026-08-31T09:00:00.123456Z" → "...123Z") 영원히 OB004가 난다.
--   이 함수는 timestamptz를 정확히 비교한다. 오차를 허용하지 않는다.


create or replace function public.save_class_session_observation_atomic(
  p_session_id uuid,
  p_child_id uuid,
  p_child_voice text,
  p_teacher_note text,
  p_record_status text,
  p_domain_codes text[],
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- 2/4의 CHECK 제약과 같은 값을 쓴다. 한쪽만 바뀌면 안 된다.
  c_max_child_voice  constant integer := 1000;
  c_max_teacher_note constant integer := 2000;

  -- 현재 관찰영역은 5개다. 상한 20은 영역이 몇 개 늘어나도 정상 운영을 막지 않으면서
  -- 잘못된 대량 요청은 걸러내는 값이다.
  c_max_domains constant integer := 20;

  v_child_voice  text;
  v_teacher_note text;
  v_record_status text;

  v_code_count     integer;
  v_distinct_count integer;
  v_known_count    integer;
  v_inactive_new   integer;

  v_org_id         uuid;
  v_class_id       uuid;
  v_session_status text;

  v_observation_id uuid;
  v_probe_updated_at timestamptz;
  v_new_updated_at timestamptz;
  v_created boolean := false;

  v_removed integer := 0;
  v_added   integer := 0;

  v_final_codes jsonb;
begin
  -- ---------------------------------------------------------
  -- 1. 입력 검증
  --
  -- Server Action이 같은 검증을 하더라도, authenticated 사용자가
  -- RPC endpoint를 직접 호출할 수 있으므로 DB도 독립적으로 확인한다.
  -- ---------------------------------------------------------
  if p_session_id is null or p_child_id is null then
    raise exception '수업과 원아 정보가 필요합니다.'
      using errcode = 'OB001';
  end if;

  v_record_status := btrim(coalesce(p_record_status, ''));

  if v_record_status not in ('draft', 'complete') then
    raise exception '작성 상태 값이 올바르지 않습니다.'
      using errcode = 'OB001';
  end if;

  -- 공백만 있는 값은 "내용 없음"으로 정규화한다.
  -- 이 정규화 덕분에 2/4의 컬럼 CHECK(btrim(...) <> '')에 걸릴 일이 없다.
  v_child_voice  := nullif(btrim(coalesce(p_child_voice, '')), '');
  v_teacher_note := nullif(btrim(coalesce(p_teacher_note, '')), '');

  if v_child_voice is not null
     and char_length(v_child_voice) > c_max_child_voice then
    raise exception '아이의 말은 %자 이내로 입력해주세요.', c_max_child_voice
      using errcode = 'OB001';
  end if;

  if v_teacher_note is not null
     and char_length(v_teacher_note) > c_max_teacher_note then
    raise exception '교사 관찰 메모는 %자 이내로 입력해주세요.', c_max_teacher_note
      using errcode = 'OB001';
  end if;

  -- 완료로 저장하려면 실제 내용이 하나는 있어야 한다.
  -- 2/4의 CHECK가 최종 방어선이지만, 여기서 먼저 끝내야
  -- Client가 매핑 가능한 코드(OB001)를 받는다.
  if v_record_status = 'complete'
     and v_child_voice is null
     and v_teacher_note is null then
    raise exception '작성 완료로 저장하려면 아이의 말 또는 교사 관찰 메모 중 하나는 입력해야 합니다.'
      using errcode = 'OB001';
  end if;

  -- ---------------------------------------------------------
  -- 2. 관찰영역 배열 검증
  --
  -- ★ NULL을 "빈 배열"로 해석하지 않는다.
  --   이 함수는 replace-all이라 빈 배열은 "전부 해제"를 뜻한다.
  --   Client 버그로 넘어온 NULL을 "전부 해제"로 처리하면
  --   교사가 고른 영역이 조용히 사라진다. 명시적으로 거부한다.
  --
  -- ★ 중복은 제거하지 않고 거부한다.
  --   조용히 고쳐 주면 Client의 상태 관리 버그가 드러나지 않는다.
  -- ---------------------------------------------------------
  if p_domain_codes is null then
    raise exception '관찰영역 목록이 필요합니다. 선택이 없으면 빈 배열을 보내주세요.'
      using errcode = 'OB001';
  end if;

  -- ★ 개수는 array_length(p_domain_codes, 1)이 아니라 cardinality로 센다.
  --
  --   array_length(arr, 1)은 "1번째 차원의 길이"다. PostgreSQL의 text[]는
  --   다차원 배열도 담을 수 있어서, 20×20 = 400개짜리 2차원 배열이 들어오면
  --   array_length(...,1)은 20을 돌려준다. 상한 20을 통과하는데 실제로는
  --   400개가 처리된다 — 아래 unnest와 = any()는 차원을 평탄화하기 때문이다.
  --   이 RPC는 authenticated 사용자가 PostgREST로 직접 호출할 수 있으므로
  --   Server Action의 검증을 신뢰하지 않고 여기서 경계를 정확히 잡는다.
  --
  --   cardinality(arr)는 차원과 무관하게 전체 원소 수를 돌려준다.
  --   빈 배열이면 0이다(array_length는 NULL을 돌려주어 coalesce가 필요했다).
  --   NULL 배열은 위에서 이미 거부했으므로 여기서 NULL이 나올 수 없다.
  v_code_count := cardinality(p_domain_codes);

  -- ★ 원소가 하나라도 있으면 반드시 1차원이어야 한다.
  --
  --   빈 배열 '{}'은 차원이 아예 없어서 array_ndims가 NULL이다.
  --   그래서 차원 검사를 무조건 걸면 정상 입력인 빈 배열이 거부된다
  --   (빈 배열은 "관찰영역을 전부 해제한다"는 뜻의 정상 요청이다).
  --   cardinality = 0을 먼저 통과시키는 이유가 이것이다.
  --
  --   원소가 1개 이상이면 ndims는 1 이상이라 NULL이 될 수 없지만,
  --   = 1 대신 is distinct from 1로 비교해 NULL이 조용히 통과하는 경로를
  --   아예 남기지 않는다.
  if v_code_count > 0
    and array_ndims(p_domain_codes) is distinct from 1
  then
    raise exception '관찰영역 목록의 형식이 올바르지 않습니다.'
      using errcode = 'OB001';
  end if;

  if v_code_count > c_max_domains then
    raise exception '관찰영역은 한 번에 최대 %개까지 선택할 수 있습니다.', c_max_domains
      using errcode = 'OB001';
  end if;

  if v_code_count > 0 then
    if exists (
      select 1
      from unnest(p_domain_codes) as t(code)
      where t.code is null or btrim(t.code) = ''
    ) then
      raise exception '관찰영역 값이 비어 있습니다.'
        using errcode = 'OB001';
    end if;

    select count(distinct t.code)
    into v_distinct_count
    from unnest(p_domain_codes) as t(code);

    if v_distinct_count <> v_code_count then
      raise exception '같은 관찰영역이 두 번 이상 선택되었습니다.'
        using errcode = 'OB001';
    end if;

    -- 존재하지 않는 code를 먼저 거른다.
    -- observation_domains SELECT Policy는 is_active를 요구하지 않으므로
    -- 사용 중지된 영역도 여기서는 "존재한다"로 확인된다(의도된 것이다).
    select count(*)
    into v_known_count
    from public.observation_domains d
    where d.code = any (p_domain_codes);

    if v_known_count <> v_code_count then
      raise exception '알 수 없는 관찰영역이 포함되어 있습니다.'
        using errcode = 'OB005';
    end if;
  end if;

  -- ---------------------------------------------------------
  -- 3. 수업 조회 — 구조 값의 유일한 출처
  --
  -- SECURITY INVOKER이므로 class_sessions SELECT Policy가 그대로 적용된다.
  -- 다른 기관/담당하지 않는 반의 수업이면 여기서 0건이 되어 OB002로 끝난다.
  -- organization_id / class_id는 인자가 아니라 이 행에서만 나온다.
  -- ---------------------------------------------------------
  select s.organization_id, s.class_id, s.status
  into v_org_id, v_class_id, v_session_status
  from public.class_sessions s
  where s.id = p_session_id;

  if not found then
    raise exception '수업을 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'OB002';
  end if;

  -- 취소된 수업은 조회만 가능하다(20260828·2/4와 같은 정책).
  -- 아래 Policy와 trigger도 같은 규칙을 막지만, 여기서 먼저 분명한 코드로 끝낸다.
  if v_session_status = 'cancelled' then
    raise exception '취소된 수업의 관찰기록은 수정할 수 없습니다.'
      using errcode = 'OB003';
  end if;

  -- ---------------------------------------------------------
  -- 4. 기존 관찰기록 확인 (참고 조회 — 안전성은 5단계 UPDATE가 보장한다)
  -- ---------------------------------------------------------
  select o.id, o.updated_at
  into v_observation_id, v_probe_updated_at
  from public.class_session_observations o
  where o.class_session_id = p_session_id
    and o.child_id = p_child_id;

  -- ---------------------------------------------------------
  -- 5. 본문 INSERT 또는 UPDATE
  -- ---------------------------------------------------------
  if v_observation_id is null then

    -- 기존 기록이 없다고 판단했는데 Client가 기대 시각을 보냈다면
    -- 화면이 가리키던 기록이 사라졌거나 권한이 끊긴 것이다.
    if p_expected_updated_at is not null then
      raise exception '관찰기록을 찾을 수 없거나 접근 권한이 없습니다.'
        using errcode = 'OB002';
    end if;

    -- organization_id / class_id는 3단계에서 조회한 수업 행에서 만든다.
    -- created_by / updated_by는 2/4의 BEFORE INSERT trigger가 auth.uid()로 채운다.
    -- INSERT Policy(is_class_teacher + is_recordable_session)와
    -- trigger(원아가 이 반 소속인지)가 최종 판정한다.
    insert into public.class_session_observations (
      organization_id,
      class_session_id,
      class_id,
      child_id,
      child_voice,
      teacher_note,
      record_status
    )
    values (
      v_org_id,
      p_session_id,
      v_class_id,
      p_child_id,
      v_child_voice,
      v_teacher_note,
      v_record_status
    )
    returning id, updated_at
    into v_observation_id, v_new_updated_at;

    v_created := true;

  else

    -- 기존 기록이 있는데 Client가 "신규"라고 주장하면 거부한다.
    -- 그대로 INSERT하면 UNIQUE 위반이 나지만, 그 전에 뜻이 분명한 코드로 끝낸다.
    if p_expected_updated_at is null then
      raise exception '이미 저장된 관찰기록이 있습니다. 화면을 새로고침한 뒤 다시 저장해주세요.'
        using errcode = 'OB004';
    end if;

    -- ★ 안전성의 핵심 — WHERE에 updated_at 조건이 들어 있다.
    --   파일 상단 "낙관적 동시성이 실제로 안전한 이유" 참조.
    --
    --   updated_at은 2/4의 private.enforce_observation_update() trigger가 발급한다.
    --   이 테이블만 공용 private.set_updated_at()을 쓰지 않는다 —
    --   그쪽은 now()(transaction timestamp)라 한 transaction 안에서 값이 고정되어
    --   토큰으로 쓸 수 없기 때문이다.
    --   그래서 성공한 UPDATE마다 NEW.updated_at > OLD.updated_at 이 보장된다.
    --   이 SET 목록에 updated_at을 넣지 않는 것도 같은 이유다 — 발급자는 trigger 하나뿐이다.
    update public.class_session_observations o
    set child_voice   = v_child_voice,
        teacher_note  = v_teacher_note,
        record_status = v_record_status
    where o.id = v_observation_id
      and o.updated_at = p_expected_updated_at
    returning o.updated_at
    into v_new_updated_at;

    if not found then
      -- ---------------------------------------------------------
      -- 0행인 이유를 가려낸다. 뜻이 다르면 코드도 달라야 한다.
      --
      -- ★ 수업 상태를 먼저 다시 읽는다 (M-1).
      --   3단계에서 확인했을 때는 취소가 아니었지만, 그 사이 다른 요청이
      --   수업을 cancelled로 바꿨을 수 있다. 그러면 UPDATE Policy의
      --   is_recordable_session()이 false가 되어 0행이 된다.
      --   이때 "권한이 없습니다"(OB002)라고 안내하면 교사는 자기 배정이
      --   해제된 줄 알고 엉뚱한 곳을 확인하게 된다. 실제 원인은 수업 취소다.
      --
      --   READ COMMITTED에서 각 SQL 문은 새 스냅샷을 보므로,
      --   이 SELECT는 앞서 커밋된 취소를 실제로 관찰한다.
      --
      --   행을 잠그지 않는다(FOR UPDATE 없음). 잠금을 쓰면 UPDATE 권한이
      --   필요해져 권한 표면이 넓어진다. 여기서 필요한 것은 원인 판별뿐이다.
      --   SECURITY INVOKER 그대로이므로 class_sessions SELECT Policy가
      --   그대로 적용된다 — 안 보이면 그 자체가 OB002의 근거다.
      -- ---------------------------------------------------------
      select s.status
      into v_session_status
      from public.class_sessions s
      where s.id = p_session_id;

      if not found then
        -- 수업 자체가 더 이상 보이지 않는다 (배정 해제 · 기관 정지 등)
        raise exception '수업을 찾을 수 없거나 접근 권한이 없습니다.'
          using errcode = 'OB002';
      end if;

      if v_session_status = 'cancelled' then
        raise exception '취소된 수업의 관찰기록은 수정할 수 없습니다.'
          using errcode = 'OB003';
      end if;

      -- 수업은 여전히 기록 가능한 상태다. 남은 원인은 셋 중 하나다.
      select o.updated_at
      into v_probe_updated_at
      from public.class_session_observations o
      where o.id = v_observation_id;

      if not found then
        -- SELECT Policy로도 보이지 않는다
        raise exception '관찰기록을 찾을 수 없거나 접근 권한이 없습니다.'
          using errcode = 'OB002';
      elsif v_probe_updated_at is distinct from p_expected_updated_at then
        -- 다른 사람이 먼저 저장했다
        raise exception '관찰기록이 이미 변경되었습니다. 화면을 새로고침한 뒤 다시 확인해주세요.'
          using errcode = 'OB004';
      else
        -- 시각도 같고 수업도 정상인데 UPDATE가 걸리지 않았다
        -- = UPDATE Policy 거부 (class_teachers 배정이 해제되었다)
        raise exception '이 관찰기록을 수정할 권한이 없습니다.'
          using errcode = 'OB002';
      end if;
    end if;

  end if;

  -- ---------------------------------------------------------
  -- 6. 관찰영역 replace-all
  --
  -- ★ 사용 중지된(is_active=false) 영역 처리 — 이 부분이 가장 조심스럽다.
  --
  --   과거 관찰기록이 [color_expression, old_domain]이고
  --   old_domain이 지금 is_active=false라고 하자.
  --   교사가 본문 오타만 고쳐 저장할 때, 이미 붙어 있던 old_domain 때문에
  --   저장 전체가 실패하면 그 기록은 영원히 고칠 수 없게 된다.
  --
  --   그래서 "새로 추가되는 것"만 is_active를 요구한다.
  --     이미 연결된 inactive 영역 유지  ✅
  --     이미 연결된 inactive 영역 제거  ✅
  --     inactive 영역을 새로 추가       ❌ OB005
  --
  --   신규 관찰기록은 기존 연결이 하나도 없으므로 요청한 모든 영역이
  --   "새로 추가"에 해당한다 → 전부 active여야 한다. 의도한 대로다.
  -- ---------------------------------------------------------
  select count(*)
  into v_inactive_new
  from unnest(p_domain_codes) as t(code)
  join public.observation_domains d
    on d.code = t.code
  where d.is_active = false
    and not exists (
      select 1
      from public.class_session_observation_domains l
      where l.observation_id = v_observation_id
        and l.domain_code = t.code
    );

  if v_inactive_new > 0 then
    raise exception '더 이상 사용하지 않는 관찰영역은 새로 추가할 수 없습니다.'
      using errcode = 'OB005';
  end if;

  -- 빠진 것을 지운다.
  -- p_domain_codes가 빈 배열이면 `= any('{}')`가 false라 전부 지워진다 — replace-all의 뜻 그대로다.
  -- (NULL은 2단계에서 이미 거부했으므로 여기서 NULL 비교가 일어나지 않는다.)
  delete from public.class_session_observation_domains l
  where l.observation_id = v_observation_id
    and not (l.domain_code = any (p_domain_codes));

  get diagnostics v_removed = row_count;

  -- 없는 것만 넣는다. 이미 있는 연결은 건드리지 않아 created_at이 보존된다.
  insert into public.class_session_observation_domains (
    observation_id,
    domain_code
  )
  select v_observation_id, t.code
  from unnest(p_domain_codes) as t(code)
  where not exists (
    select 1
    from public.class_session_observation_domains l
    where l.observation_id = v_observation_id
      and l.domain_code = t.code
  );

  get diagnostics v_added = row_count;

  -- ---------------------------------------------------------
  -- 7. 결과
  --
  -- jsonb 단일 객체로 돌려준다. supabase-js의 rpc()가 배열을 벗겨내는
  -- 규칙에 의존하지 않아 읽는 쪽이 단순해진다(20260830과 같은 형식).
  --
  -- updated_at을 반드시 함께 돌려준다 — Client가 다음 저장에 쓸 토큰이다.
  -- ---------------------------------------------------------
  select coalesce(
           jsonb_agg(l.domain_code order by d.sort_order, l.domain_code),
           '[]'::jsonb
         )
  into v_final_codes
  from public.class_session_observation_domains l
  join public.observation_domains d
    on d.code = l.domain_code
  where l.observation_id = v_observation_id;

  return jsonb_build_object(
    'observation_id', v_observation_id,
    'created', v_created,
    'record_status', v_record_status,
    'updated_at', v_new_updated_at,
    'domain_codes', v_final_codes,
    'domains_added', v_added,
    'domains_removed', v_removed
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

revoke execute on function public.save_class_session_observation_atomic(
  uuid, uuid, text, text, text, text[], timestamptz
) from public;

revoke execute on function public.save_class_session_observation_atomic(
  uuid, uuid, text, text, text, text[], timestamptz
) from anon;

grant execute on function public.save_class_session_observation_atomic(
  uuid, uuid, text, text, text, text[], timestamptz
) to authenticated;


-- =========================================================
-- 원자성이 보장되는 이유 (설계 근거)
-- =========================================================
--   PostgREST는 요청 하나를 트랜잭션 하나로 감싼다.
--   RPC 호출은 요청 하나이므로, 이 함수 안의 INSERT/UPDATE/DELETE는
--   전부 같은 트랜잭션에서 실행된다.
--
--   함수 안에 EXCEPTION 블록을 두지 않은 것은 의도적이다.
--   BEGIN ... EXCEPTION은 하위 트랜잭션을 만들어 실패를 삼킬 수 있다.
--   여기서는 모든 예외가 그대로 위로 전파되어 트랜잭션 전체가 rollback된다.
--
--   따라서 요청하신 시나리오 — "본문 UPDATE는 성공했는데 domain_code에서
--   오류가 났다" — 에서 본문 UPDATE도 함께 되돌아간다.
--   부분 저장이 남지 않는다.
--
-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.class_session_observations         테이블·컬럼·Policy·GRANT·trigger — 그대로
--   public.class_session_observation_domains  그대로
--   public.observation_domains                그대로 (이 함수는 SELECT만 한다)
--   public.class_sessions                     그대로
--     ★ 이 함수는 class_sessions를 SELECT만 한다. 수업 상태를 바꾸지 않는다.
--   public.children / class_session_attendance 그대로 (이 함수는 읽지도 않는다)
--   private.* helper                          그대로 (재정의하지 않는다)
--   DELETE 경로                               연결 테이블 replace-all 한 곳뿐.
--                                             관찰 원문을 삭제하는 구문은 없다.
