-- =========================================================
-- SERVICE-08A (2/4) — 교사 관찰기록 (Class Session Observations) Foundation
-- =========================================================
--
-- 이 Migration이 저장하는 것은 두 문장이다.
--
--   "이 수업에서 이 원아에 대해 교사가 무엇을 보고 무엇을 들었는가"
--   "그 관찰이 어떤 관찰영역에 해당하는가"
--
-- ★ 이 시스템은 아동을 평가·진단하지 않는다 (스키마로 보장한다)
--
--   score · grade · rating · level · risk · normal · abnormal ·
--   development_stage · diagnosis · ai_judgement — 어떤 이름으로도 컬럼을 만들지 않는다.
--
--   문구를 주석으로만 적어 두는 것과 컬럼을 만들지 않는 것은 다르다.
--   저장할 자리가 없으면 나중에 누군가 "일단 넣어 두자"고 할 수 없다.
--   교사가 남기는 값은 서술 텍스트 둘과 관찰영역 태그뿐이다.
--
-- ★ 이 Migration에 넣지 않는 것 (의도적)
--   사진 URL · storage path · 미디어 개수 · AI 초안 · AI 승인본 ·
--   원장 코멘트 · 학부모 공개 여부 · 리포트 캐시.
--   전부 후속 SERVICE에서 별도 테이블로 붙인다.
--   09/10이 필요로 하는 것은 class_session_observations.id 하나뿐이므로
--   이 테이블에 미리 자리를 비워 둘 이유가 없다.
--
-- ★ child_name / class_name / lesson_title 같은 텍스트 snapshot도 넣지 않는다.
--   20260828과 같은 판단이다. 이름은 관계로 읽는다.
--   (아래 3/4 Migration이 교사의 historical 이름 조회를 열어 준다.)
--
-- =========================================================
-- 원아의 반 이동 — 20260828의 판단을 그대로 잇는다
-- =========================================================
--   children.class_id는 변경 가능하다.
--   그래서 (child_id, class_id) → children(id, class_id) FK를 걸면 안 된다.
--   관찰기록을 남긴 원아가 영원히 반을 옮길 수 없게 된다.
--
--   신규 기록 시점 : "지금 이 원아가 이 반 소속인가"를 trigger가 확인한다 (시점 검사)
--   그 이후        : observations.class_id가 당시 소속을 그대로 보존한다 (스냅샷)
--
-- =========================================================
-- 재사용하는 기존 자산 (새로 만들지 않는다)
-- =========================================================
--   20260813 : private.is_soyes_admin()
--   20260815 : private.has_org_role()
--   20260824 : private.is_class_teacher()          — "지금 운영 중인 반의 담당 교사"
--   20260826 : private.is_assigned_class_teacher() — "그 반에 배정된 교사"(보관돼도 유지)
--   20260828 : private.is_recordable_session()     — 출결과 완전히 같은 수업 상태 정책
--
--   ★ private.set_updated_at()은 이 테이블에서 쓰지 않는다 (다른 테이블에서는 그대로 쓴다).
--     그 함수는 new.updated_at = now()이고, now()는 transaction timestamp라
--     한 transaction 안에서는 값이 고정된다.
--     이 테이블의 updated_at은 단순한 감사 시각이 아니라 낙관적 동시성 토큰이므로
--     "성공한 UPDATE마다 반드시 값이 커진다"가 보장돼야 한다.
--     그래서 아래 enforce_observation_update()가 updated_at까지 직접 발급한다.
--     자세한 근거는 4번 절의 (7)에 적어 두었다.
--
--   ★ is_recordable_session()이 08A 요구사항과 정확히 일치한다.
--     scheduled / in_progress / completed 허용, cancelled 차단.
--     새 수업 상태 helper를 만들지 않는다.
--
-- ★ 부모 테이블 UNIQUE를 새로 만들지 않는다.
--   20260828이 복합 FK를 걸며 이미 보강해 두었다.
--     class_sessions_id_org_class_key  unique (id, organization_id, class_id)
--     children_id_org_key              unique (id, organization_id)
--
-- 새로 추가하는 것
--   private.enforce_observation_insert()  — 신규 기록의 도메인 조건 (trigger 전용)
--   private.enforce_observation_update()  — 구조 컬럼 불변 · 취소 수업 동결 ·
--                                           낙관적 동시성 토큰(updated_at) 발급 (trigger 전용)


-- =========================================================
-- 0. 이 Migration의 trigger가 SECURITY INVOKER인 이유
-- =========================================================
-- 20260828의 attendance trigger는 SECURITY DEFINER였다. 여기서는 INVOKER를 쓴다.
-- 의도적인 차이이고, 근거는 아래 두 가지다.
--
-- (1) INVOKER로도 검사가 정확하다.
--     이 trigger가 읽는 것은 public.class_sessions와 public.children 둘뿐이다.
--       - 호출자가 authenticated 교사인 경우:
--         아래 INSERT Policy가 is_class_teacher(class_id)를 이미 요구하므로
--         그 반의 수업과 원아는 호출자에게 반드시 보인다
--         (class_sessions SELECT는 is_assigned_class_teacher,
--          children SELECT는 is_class_teacher 분기로 통과한다).
--       - 호출자가 service_role / superuser인 경우:
--         RLS 자체를 우회하므로 모든 행이 보이고 검사는 그대로 정확하다.
--     즉 정상 경로에서 위음성(보이지 않아 잘못 거부)이 생기지 않는다.
--
-- (2) 보이지 않으면 거부된다 — fail-closed다.
--     RLS로 행이 가려진 상태에서 이 trigger는 "없다"고 판단하고 예외를 던진다.
--     권한을 올려서 통과시키는 방향이 아니라 막는 방향으로 실패한다.
--
-- 권한을 올릴 이유가 없으면 올리지 않는다.
-- 이 Migration에는 SECURITY DEFINER 함수가 하나도 없다.


-- =========================================================
-- 1. public.class_session_observations
-- =========================================================

create table if not exists public.class_session_observations (

  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  class_session_id uuid not null,

  -- ★ 기록 당시의 반. children.class_id의 사본이 아니라 "이 수업의 반"이다.
  --   아래 복합 FK가 수업의 class_id와 일치하도록 강제하므로 임의 값이 들어갈 수 없다.
  --   원아가 나중에 반을 옮겨도 이 값은 그대로 남아 과거 소속을 보존한다.
  class_id uuid not null,

  child_id uuid not null,

  -- ── 교사 입력 ────────────────────────────────────────────────
  -- 아이가 자기 작품·활동에 대해 한 말. 교사의 해석이 아니라 아이의 발화다.
  --
  -- CHECK 두 조건의 역할이 다르다.
  --   char_length(...) <= 1000 : 저장 크기 상한 (원문 기준이라 공백으로 우회할 수 없다)
  --   btrim(...) <> ''         : 공백만 있는 값을 "내용 있음"으로 위장하지 못하게 한다
  -- 아래 RPC가 저장 전에 btrim + 빈 문자열 → NULL 정규화를 하므로
  -- 정상 경로에서는 이 CHECK에 걸릴 일이 없다. 직접 SQL 경로를 위한 방어선이다.
  child_voice text
    constraint class_session_observations_child_voice_check
    check (
      child_voice is null
      or (
        char_length(child_voice) <= 1000
        and btrim(child_voice) <> ''
      )
    ),

  -- 교사가 관찰한 활동과 표현. 진단·평가·점수를 쓰는 칸이 아니다.
  teacher_note text
    constraint class_session_observations_teacher_note_check
    check (
      teacher_note is null
      or (
        char_length(teacher_note) <= 2000
        and btrim(teacher_note) <> ''
      )
    ),
  -- ─────────────────────────────────────────────────────────────

  -- draft    : 작성 중. 수업 중에 잠깐 저장하고 나중에 마무리한다.
  -- complete : 교사가 작성을 마쳤다고 표시했다.
  --
  -- ★ complete는 "잠금"이 아니다.
  --   completed 수업의 관찰기록을 나중에 정정할 수 있어야 하므로
  --   complete → draft, complete → complete 어느 방향도 막지 않는다.
  --   전이 규칙 trigger를 만들지 않는 이유다.
  record_status text not null default 'draft'
    constraint class_session_observations_record_status_check
    check (record_status in ('draft', 'complete')),

  -- ★ Client가 보내는 값이 아니다. 아래 trigger가 auth.uid()로 채운다.
  --   GRANT의 INSERT/UPDATE 컬럼 목록에도 들어 있지 않다.
  --
  --   nullable + on delete set null인 이유:
  --   profiles는 auth.users에 on delete cascade로 매달려 있다(20260815).
  --   퇴사한 교사의 계정이 삭제될 때
  --     restrict → 계정 삭제 자체가 막힌다
  --     cascade  → 관찰기록이 함께 사라진다
  --   둘 다 받아들일 수 없다. 기록은 남고 작성자만 비는 set null이 유일한 답이다.
  --
  --   ★ 그 set null은 "UPDATE 문"으로 실행된다 — 아래 BEFORE UPDATE trigger가
  --     그대로 발동한다. 그래서 trigger는 이 두 컬럼에 대해
  --     "값이 NULL로 비워지는 것"과 "다른 사람으로 바뀌는 것"을 반드시 구분해야 한다.
  --     구분하지 않으면 계정 삭제가 trigger에 막히거나(created_by),
  --     FK가 비운 값을 trigger가 되살려 잘못된 작성자를 남긴다(updated_by).
  --     자세한 규칙은 아래 4번 절에 있다.
  created_by uuid,
  updated_by uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ★ complete는 내용이 비어 있을 수 없다.
  --   btrim / nullif / coalesce 전부 immutable이라 CHECK에 쓸 수 있다.
  --   위 컬럼 CHECK가 이미 공백만 있는 값을 막지만,
  --   "완료의 조건"을 한 줄로 읽히게 남겨 둔다.
  constraint class_session_observations_complete_content_check
    check (
      record_status <> 'complete'
      or nullif(btrim(coalesce(child_voice, '')), '') is not null
      or nullif(btrim(coalesce(teacher_note, '')), '') is not null
    ),

  -- ★ (1) 기관·반이 그 수업의 것과 반드시 같아야 한다.
  --   20260828이 만든 class_sessions_id_org_class_key를 참조한다.
  --   "A반 수업 + B반 관찰" 같은 조합은 어떤 경로로도 INSERT되지 않는다
  --   (RLS를 우회하는 service_role·직접 SQL·superuser도 위반할 수 없다).
  constraint class_session_observations_session_fk
    foreign key (class_session_id, organization_id, class_id)
    references public.class_sessions (id, organization_id, class_id)
    on delete restrict,

  -- ★ (2) 원아는 반드시 같은 기관의 원아여야 한다.
  --   여기서 (child_id, class_id)로 걸지 않는 것이 핵심이다 — 파일 상단 참조.
  constraint class_session_observations_child_fk
    foreign key (child_id, organization_id)
    references public.children (id, organization_id)
    on delete restrict,

  -- ★ (3) 작성자. 계정이 지워져도 기록은 남는다.
  constraint class_session_observations_created_by_fk
    foreign key (created_by)
    references public.profiles (user_id)
    on delete set null,

  constraint class_session_observations_updated_by_fk
    foreign key (updated_by)
    references public.profiles (user_id)
    on delete set null,

  -- ★ (4) 한 수업에서 한 원아의 관찰기록은 하나뿐이다.
  --   동시에 두 번 저장해도 중복 행이 생기지 않는다.
  --   이 UNIQUE가 만드는 index가 class_session_id 선행 조회
  --   ("이 수업의 관찰 명단")도 함께 커버하므로 세션 단독 index는 만들지 않는다.
  constraint class_session_observations_session_child_key
    unique (class_session_id, child_id)
);


-- 조회 index — 실제 화면 질의만 덮는다 (20260828:155와 같은 기준).
--   child_id : ① 원아별 성장 이력  ② 3/4 Migration의 historical 이름 helper
--   class_id : 반 단위 조회 + is_assigned_class_teacher 경로
--
-- 만들지 않는 index (화면이 아직 없다 — 화면이 생기는 Migration에서 함께 추가한다)
--   (domain_code)                     : 관찰영역별 통계
--   (organization_id, record_status)  : 원장 미완료 관찰 보드
create index if not exists class_session_observations_child_idx
  on public.class_session_observations (child_id);

create index if not exists class_session_observations_class_idx
  on public.class_session_observations (class_id);


-- ★ updated_at — 이 테이블만 공용 set_updated_at() trigger를 쓰지 않는다.
--
--   다른 테이블에서 updated_at은 "마지막으로 손댄 시각"이라 now()로 충분하다.
--   여기서는 다르다. 이 값이 곧 낙관적 동시성 토큰이고,
--   4/4의 RPC가 `where o.updated_at = p_expected_updated_at`으로 직접 비교한다.
--
--   private.set_updated_at()은 new.updated_at = now()인데, now()는
--   transaction timestamp라 한 transaction 안에서는 몇 번을 UPDATE해도 같은 값이다.
--   그러면 같은 transaction 안의 두 번째 저장이 첫 번째 토큰을 그대로 통과시켜
--   lost update를 막지 못한다. 토큰으로 쓸 수 없는 값이다.
--
--   그래서 아래 enforce_observation_update()가 (7)에서 updated_at을 직접 발급한다.
--   BEFORE UPDATE trigger가 하나만 남으므로 발동 순서를 따질 일도 없어진다.
--
--   ※ drop은 남겨 둔다. 이전 버전에서 이 trigger가 만들어진 DB에서
--     이 Migration을 다시 돌리면 확실히 제거되어야 한다.
drop trigger if exists trg_class_session_observations_updated_at
on public.class_session_observations;


-- =========================================================
-- 2. public.class_session_observation_domains
-- =========================================================
-- 한 원아가 한 수업에서 여러 관찰영역에 해당할 수 있다.
--   예) 색채 표현 + 창의적 확장
--
-- ★ text[]나 jsonb가 아니라 연결 테이블인 이유
--   text[]는 FK를 걸 수 없다. 오타나 은퇴한 코드가 조용히 섞여도 DB가 모른다.
--   향후 리포트/통계가 이 값을 집계하는데, 그때 무결성이 없으면
--   "창의적 확장 12건" 같은 숫자를 신뢰할 수 없게 된다.
--   jsonb는 여기에 담을 구조가 없어(점수 컬럼이 없다) text[]보다 나을 것이 없다.
--
-- ★ FK 대상이 uuid가 아니라 code인 이유
--   읽을 때 join 없이 바로 'color_expression'을 얻는다.
--   AI 프롬프트·리포트·통계가 전부 code를 쓰기 때문에 이 경로가 가장 짧다.
--   code는 1/4 Migration의 trigger가 불변으로 잠갔으므로 안전하다.
--   그래서 on update cascade를 쓰지 않는다 — 바뀌지 않는 값에 cascade를 걸면
--   "바뀔 수도 있다"는 잘못된 신호가 남는다.

create table if not exists public.class_session_observation_domains (

  id uuid primary key default gen_random_uuid(),

  -- ★ on delete cascade는 이 프로젝트에서 처음 쓰인다. 근거를 남긴다.
  --   부모(class_session_observations)에는 DELETE Policy도 DELETE GRANT도 없다.
  --   즉 이 cascade는 일반 사용자 경로에서 절대 발동하지 않는다.
  --   그럼에도 걸어 두는 것은, 훗날 운영자가 DB 차원의 정리를 하게 될 때
  --   고아 연결 행이 남지 않게 하기 위해서다.
  --   restrict로 두면 그 정리를 더 어렵게 만들기만 한다.
  observation_id uuid not null
    references public.class_session_observations (id)
    on delete cascade,

  -- on update는 지정하지 않는다(기본 NO ACTION).
  -- code는 불변이므로 cascade가 필요 없다.
  domain_code text not null
    references public.observation_domains (code)
    on delete restrict,

  created_at timestamptz not null default now(),

  -- updated_at이 없다. 이 행은 만들어지거나 지워질 뿐 수정되지 않는다
  -- (아래에서 UPDATE Policy도 UPDATE GRANT도 만들지 않는다).

  -- 같은 관찰기록에 같은 영역이 두 번 붙지 않는다.
  -- 이 UNIQUE가 observation_id 선행 조회("이 관찰의 영역 목록")도 커버한다.
  constraint class_session_observation_domains_key
    unique (observation_id, domain_code)
);


-- =========================================================
-- 3. 신규 관찰기록의 도메인 조건 (BEFORE INSERT)
-- =========================================================
-- 아래 INSERT Policy에도 겹치는 조건이 있지만, 이 trigger가 도메인 규칙의 최종 판정자다.
-- RLS는 service_role과 superuser를 통과시키는 반면 trigger는 통과시키지 않는다.

create or replace function private.enforce_observation_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_org_id uuid;
  v_session_class_id uuid;
  v_session_status text;
begin
  -- (1) 수업이 실제로 있어야 한다.
  select s.organization_id, s.class_id, s.status
  into v_session_org_id, v_session_class_id, v_session_status
  from public.class_sessions s
  where s.id = new.class_session_id;

  if not found then
    raise exception
      '수업을 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'check_violation';
  end if;

  -- (2) 취소된 수업에는 새 관찰기록을 만들지 않는다.
  --     하지 않은 수업에 대한 "관찰"은 사후 창작이다.
  if v_session_status = 'cancelled' then
    raise exception
      '취소된 수업에는 관찰기록을 새로 작성할 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  -- (3) 구조값이 그 수업의 것과 같아야 한다.
  --     위 복합 FK가 이미 강제하지만, FK 위반 메시지는 제약 이름만 알려 준다.
  --     BEFORE ROW trigger는 FK 검사보다 먼저 실행되므로
  --     여기서 사람이 읽을 수 있는 문구로 먼저 끝낸다.
  if new.organization_id is distinct from v_session_org_id
    or new.class_id is distinct from v_session_class_id
  then
    raise exception
      '관찰기록의 기관·반은 그 수업의 값과 같아야 합니다.'
      using errcode = 'check_violation';
  end if;

  -- (4) ★ 이 원아가 "지금" 이 반 소속인가 — 시점 검사다.
  --     FK로 걸지 않는 이유는 파일 상단에 적어 두었다(반 이동이 막힌다).
  --     기관 일치는 복합 FK가 이미 강제하므로 여기서는 반만 본다.
  --
  --     children.status는 보지 않는다. 장기 결석(inactive) 상태의 원아도
  --     그날 활동에 참여했다면 관찰기록의 대상이다.
  --     (20260828이 출결에서 같은 판단을 했고, 20260829가 그에 맞춰
  --      children SELECT에서 status='active' 조건을 제거했다.)
  if not exists (
    select 1
    from public.children c
    where c.id = new.child_id
      and c.class_id = v_session_class_id
  ) then
    raise exception
      '이 수업의 반에 속한 원아만 관찰기록을 작성할 수 있습니다.'
      using errcode = 'check_violation';
  end if;

  -- (5) 작성자는 Client가 정하지 않는다. 언제나 지금 로그인한 사용자다.
  --     auth.uid()는 스키마가 붙은 이름이라 search_path = ''에서도 해석된다.
  new.created_by := auth.uid();
  new.updated_by := auth.uid();

  return new;
end;
$$;

-- trigger 전용이라 client가 직접 호출할 일이 없다.
revoke execute on function private.enforce_observation_insert()
from public, anon, authenticated;

drop trigger if exists trg_class_session_observations_insert_check
on public.class_session_observations;

create trigger trg_class_session_observations_insert_check
before insert on public.class_session_observations
for each row
execute function private.enforce_observation_insert();


-- =========================================================
-- 4. 기존 관찰기록의 변경 규칙 (BEFORE UPDATE)
-- =========================================================
-- ★ 여기서는 "이 원아가 지금도 이 반인가"를 절대 다시 묻지 않는다.
--
--   원아는 학기 중에 반을 옮길 수 있다. 그 뒤에 과거 관찰기록의 오타를 고치려 할 때
--   현재 소속을 요구하면 영영 고칠 수 없게 된다.
--   기록 시점의 검사는 INSERT에서 이미 끝났고, 여기서는 그 결과를 존중한다.
--   (20260828:271의 판단 그대로다.)
--
-- =========================================================
-- ★ 이 trigger는 두 종류의 UPDATE를 구분해야 한다
-- =========================================================
--
--   (가) 내용 수정  — 교사가 child_voice / teacher_note / record_status를 고친다.
--   (나) 메타데이터 정리 — profiles 행이 삭제되어 FK의 ON DELETE SET NULL이
--        created_by 또는 updated_by를 NULL로 비운다. 내용은 그대로다.
--
--   (나)는 사용자가 일으키는 UPDATE가 아니다. PostgreSQL의 참조 무결성 처리기가
--   테이블 소유자 권한으로 실행하므로 RLS와 컬럼 GRANT를 통과하지만,
--   BEFORE ROW trigger는 그대로 발동한다.
--
--   두 경우를 구분하지 않으면 실제로 이런 일이 벌어진다.
--     · created_by를 무조건 불변으로 막으면 → 교사 계정 삭제가 이 trigger에 막힌다.
--       FK는 "NULL로 비우겠다"는데 trigger가 "바꿀 수 없다"고 거부하는 교착이다.
--     · updated_by를 무조건 auth.uid()로 덮으면 → FK가 비운 값을
--       "정리를 실행한 사람"으로 되살린다. 그 사람은 이 관찰기록을 본 적도 없다.
--     · 취소된 수업의 UPDATE를 무조건 막으면 → 취소 수업에 관찰기록을 남긴
--       교사의 계정은 영원히 삭제할 수 없다.
--
--   그래서 아래는 "내용이 실제로 바뀌었는가"를 먼저 판정하고,
--   내용 규칙(취소 수업 동결 · 수정자 기록)은 (가)에만 적용한다.
--   (나)에서는 값이 NULL로 비워지는 것만 허용하고 그 외 변경은 전부 거부한다.
--
--   ※ updated_at은 (가)·(나)를 가리지 않고 성공한 모든 UPDATE에서 새 토큰으로 커진다.
--     아래 (7)이 return new 직전에서 한 번만 발급하므로 두 경로가 예외 없이 지난다.
--     즉 (나)만 일어나도 토큰이 바뀌어 교사가 stale(OB004)을 받는다.
--     의도한 동작이다 — 조용한 덮어쓰기보다 한 번 더 새로고침하는 편이 안전하다.

create or replace function private.enforce_observation_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_content_changed boolean;
begin
  -- (1) 구조 컬럼과 생성 시각은 생성 후 완전 불변이다.
  --     바꿀 수 있는 값은 child_voice / teacher_note / record_status 셋뿐이다.
  --     GRANT에서도 UPDATE 대상에서 빼 두었지만, GRANT는 authenticated에만 적용된다.
  --     service_role이나 직접 SQL로 관찰기록의 소속을 바꿔치기하는
  --     경로까지 여기서 막는다.
  if new.organization_id is distinct from old.organization_id
    or new.class_session_id is distinct from old.class_session_id
    or new.class_id is distinct from old.class_id
    or new.child_id is distinct from old.child_id
    or new.created_at is distinct from old.created_at
  then
    raise exception
      '관찰기록의 수업·반·원아는 변경할 수 없습니다. 내용만 정정해주세요.'
      using errcode = 'check_violation';
  end if;

  -- (2) created_by가 바뀌는 것은 딱 한 경우만 허용한다 — FK의 ON DELETE SET NULL.
  --       허용  <uid> → NULL       (profiles 삭제 정리)
  --       거부  <uid> → <다른 uid> (작성자 위조)
  --       거부  NULL  → <uid>      (사라진 작성자를 임의로 되살리기)
  --     "바뀌었는데 NULL이 아니다"가 곧 거부 조건이다.
  if new.created_by is distinct from old.created_by
    and new.created_by is not null
  then
    raise exception
      '관찰기록의 작성자는 변경할 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  -- (3) 이 UPDATE가 실제로 관찰 내용을 바꾸는가?
  v_content_changed :=
    new.child_voice is distinct from old.child_voice
    or new.teacher_note is distinct from old.teacher_note
    or new.record_status is distinct from old.record_status;

  if v_content_changed then

    -- (4) 취소된 수업의 관찰 "내용"은 동결한다.
    --     조회는 계속 가능하다 — SELECT Policy에는 수업 상태 조건이 없다.
    --
    --     ★ 이 검사를 내용 변경에만 거는 것이 핵심이다.
    --       메타데이터 정리(FK SET NULL)까지 막으면, 취소된 수업에
    --       관찰기록을 남긴 교사의 계정을 영원히 삭제할 수 없게 된다.
    --       내용을 못 바꾼다는 보장은 그대로 유지된다 —
    --       내용을 바꾸려는 순간 이 분기로 들어와 거부되기 때문이다.
    if not exists (
      select 1
      from public.class_sessions s
      where s.id = old.class_session_id
        and s.status in ('scheduled', 'in_progress', 'completed')
    ) then
      raise exception
        '취소된 수업의 관찰기록은 변경할 수 없습니다.'
        using errcode = 'check_violation';
    end if;

    -- (5) 내용을 바꾼 사람을 기록한다. Client가 정하지 않는다.
    --     여기서 무조건 덮어쓰므로 이 경로에서는 updated_by 위조가 불가능하다.
    new.updated_by := auth.uid();

  else

    -- (6) 내용이 그대로인 UPDATE에서 updated_by가 바뀌어도 되는 경우는
    --     FK의 ON DELETE SET NULL(→ NULL) 하나뿐이다.
    --     (2)의 created_by와 같은 규칙을 적용해 위조 경로를 남기지 않는다.
    --
    --     ★ auth.uid()로 다시 채우지 않는다.
    --       FK 정리를 실행한 사람은 이 관찰기록을 수정한 사람이 아니다.
    if new.updated_by is distinct from old.updated_by
      and new.updated_by is not null
    then
      raise exception
        '관찰기록의 수정자는 직접 지정할 수 없습니다.'
        using errcode = 'check_violation';
    end if;

  end if;

  -- (7) ★ 낙관적 동시성 토큰 발급 — 이 테이블의 updated_at은 여기서만 정해진다.
  --
  --   위 (가)/(나) 두 분기가 전부 여기로 모이므로, 성공하는 UPDATE는
  --   교사의 내용 수정이든 FK의 ON DELETE SET NULL 정리든 예외 없이 이 줄을 지난다.
  --   거부되는 UPDATE는 위에서 이미 raise로 끝났으므로 토큰을 받지 않는다.
  --
  --   greatest(...)를 쓰는 이유
  --     clock_timestamp()는 문(statement) 실행 시각이라 같은 transaction 안에서도 흐른다.
  --     (now()는 transaction 시작 시각이라 고정된다 — 그래서 공용 set_updated_at()을 쓰지 않는다.)
  --     다만 시계만 믿으면 두 경우에 같은 값이 나올 수 있다.
  --       · 같은 마이크로초 안에 두 번 UPDATE가 실행된다
  --       · 서버 시계가 뒤로 조정된다 (NTP)
  --     그래서 "old + 1마이크로초"를 하한으로 깔아 둔다.
  --     결과적으로 NEW.updated_at > OLD.updated_at 이 예외 없이 성립한다.
  --     timestamptz의 내부 해상도가 1마이크로초이므로 이 하한은 실제로 다음 표현 가능한 값이다.
  --
  --   ★ Client가 보낸 값은 쓰이지 않는다.
  --     GRANT의 UPDATE 컬럼 목록에 updated_at이 없어 authenticated는 애초에 지정할 수 없고,
  --     service_role이나 직접 SQL로 값을 넣더라도 여기서 무조건 덮어쓴다.
  --     created_by / updated_by를 trigger가 정하는 것과 같은 원칙이다.
  --
  --   ★ 이 값은 감사 시각이 아니라 토큰이다.
  --     그래서 "몇 시에 고쳤는가"를 정확히 보여 줘야 하는 화면이 생기면
  --     updated_at을 쓰지 말고 별도 컬럼을 두어야 한다.
  new.updated_at := greatest(
    pg_catalog.clock_timestamp(),
    old.updated_at + interval '1 microsecond'
  );

  return new;
end;
$$;

revoke execute on function private.enforce_observation_update()
from public, anon, authenticated;

drop trigger if exists trg_class_session_observations_update_check
on public.class_session_observations;

create trigger trg_class_session_observations_update_check
before update on public.class_session_observations
for each row
execute function private.enforce_observation_update();


-- =========================================================
-- 5. GRANT — 컬럼 단위 최소 권한
-- =========================================================
-- "어떤 컬럼을 만질 수 있는가"는 GRANT가, "어떤 행을 만질 수 있는가"는 RLS가 정한다.
--
-- ★ DELETE 권한을 주지 않는다. 아래에서 DELETE Policy도 만들지 않는다.
--   교사가 쓴 관찰 서술은 지우지 않고 내용을 정정한다.
--   잘못 만든 기록이라면 내용을 비우고 draft로 되돌리면 된다.
--
-- ★ created_by / updated_by / created_at / updated_at은 어느 목록에도 없다.
--   전부 trigger 또는 default가 채운다. Client가 보낸 값은 쓰이지 않는다.

revoke all on public.class_session_observations from anon, authenticated;

grant select on public.class_session_observations to authenticated;

grant insert (
  organization_id,
  class_session_id,
  class_id,
  child_id,
  child_voice,
  teacher_note,
  record_status
) on public.class_session_observations to authenticated;

grant update (
  child_voice,
  teacher_note,
  record_status
) on public.class_session_observations to authenticated;


-- 연결 테이블 — SELECT / INSERT / DELETE만. UPDATE는 없다.
--
-- ★ 이 프로젝트에서 DELETE 권한을 주는 유일한 테이블이다.
--
--   "DELETE 최소화" 원칙의 목적은 **일어난 일의 기록**을 지키는 것이다
--   (출결·수업·관찰 원문). 관찰영역 태그는 일어난 일이 아니라
--   교사가 아직 고르는 중인 분류다. 잘못 누른 영역을 해제하지 못하면
--   그 관찰기록은 영원히 틀린 분류를 달고 있게 된다.
--
--   소프트 삭제(is_selected 컬럼)로 대신할 수도 있지만,
--   해제된 태그를 남겨서 얻는 정보가 없고 모든 집계 쿼리가
--   필터를 하나씩 더 달아야 한다. 그쪽이 실수를 더 부른다.
--
--   DELETE 범위는 아래 Policy가 "그 관찰기록을 수정할 수 있는 교사"로 좁힌다.
revoke all on public.class_session_observation_domains from anon, authenticated;

grant select on public.class_session_observation_domains to authenticated;

grant insert (observation_id, domain_code)
on public.class_session_observation_domains to authenticated;

grant delete on public.class_session_observation_domains to authenticated;


-- =========================================================
-- 6. RLS — public.class_session_observations
-- =========================================================
-- anon        : 0건 (위 revoke로 권한 자체가 없고, Policy도 authenticated 전용이다)
-- SOYES 운영자 : 조회만
-- 원장        : 자기 활성 기관 범위에서 조회만
-- 교사        : 조회는 배정된 반, 작성은 운영 중인 반, 정정은 배정된 반
--
-- ★ 20260828 attendance와 의도적으로 다른 지점 — 원장·운영자에게 write를 주지 않는다.
--
--   출결은 "왔는가"라는 4값 사실이라 원장이 누락분을 대신 채워도 의미가 훼손되지 않는다.
--   관찰기록은 특정 교사가 그 자리에서 본 것에 대한 서술이다.
--   원장이 고치면 그 문장은 더 이상 누구의 관찰도 아니게 되고,
--   created_by를 두는 의미도 함께 사라진다.
--
--   원장의 피드백이 필요해지면 관찰 원문을 건드리지 않는
--   별도의 review/comment 테이블로 붙인다(08B 이후).
--
-- ★ 교사 helper를 동작별로 나눠 쓴다 (20260826/20260827/20260828과 같은 기준)
--   SELECT          : is_assigned_class_teacher() — 반이 보관되어도 과거 기록을 본다
--   INSERT          : is_class_teacher()          — 운영 중인 반에서만 새로 작성
--   UPDATE          : is_assigned_class_teacher() — 보관된 반의 기존 기록도 정정
--   둘 다 기관 active · membership active · role=teacher를 확인하므로
--   타 기관 접근과 배정 해제 뒤 접근은 어느 쪽으로도 열리지 않는다.

alter table public.class_session_observations enable row level security;


-- ★ SELECT에는 수업 상태 조건이 없다.
--   취소된 수업의 관찰기록도 "그때 이렇게 기록했다"는 사실이므로 계속 보인다.
--   조회만 가능하고 수정은 아래 trigger/Policy가 막는다.
drop policy if exists "observations readable by org staff and soyes admin"
on public.class_session_observations;

create policy "observations readable by org staff and soyes admin"
  on public.class_session_observations
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );


-- ★ 신규 작성 = 담당 교사 + 운영 중인 반 + 기록 가능한 수업 상태
--
--   is_class_teacher()가 반 active를 요구하므로 보관된 반에는 새 기록을 만들 수 없다.
--   원장·운영자 분기가 아예 없으므로, 담당 교사가 없는 반에는 아무도 새 기록을
--   만들 수 없다. 이는 의도된 것이다 — 보관된 반이나 담임 없는 반의 "관찰"은
--   실제로 그 자리에 있었던 사람이 없다는 뜻이다.
--
--   기관·반 일치는 복합 FK와 BEFORE INSERT trigger가,
--   원아-반 소속은 trigger가 강제하므로 Policy에서 다시 검사하지 않는다.
drop policy if exists "observations insert by assigned teacher"
on public.class_session_observations;

create policy "observations insert by assigned teacher"
  on public.class_session_observations
  for insert
  to authenticated
  with check (
    private.is_class_teacher(class_id)
    and private.is_recordable_session(class_session_id)
  );


-- ★ 정정 = 배정된 교사 + 기록 가능한 수업 상태
--
--   반이 보관되거나 원아가 다른 반으로 옮겨간 뒤에도 과거 기록의 오타는 고칠 수 있어야 한다.
--   다만 class_teachers 배정이 제거되면 정정 권한도 함께 끊긴다.
--
--   USING과 WITH CHECK를 같은 식으로 둔다.
--     USING      : 어떤 행을 고를 수 있는가 (정정 전 상태)
--     WITH CHECK : 고친 결과가 여전히 내 권한 안인가 (정정 후 상태)
--   구조 컬럼은 trigger가 불변으로 막으므로 두 식의 결과가 달라질 수 없지만,
--   한쪽만 적어 두면 훗날 trigger가 느슨해질 때 조용히 구멍이 된다.
drop policy if exists "observations update by assigned teacher"
on public.class_session_observations;

create policy "observations update by assigned teacher"
  on public.class_session_observations
  for update
  to authenticated
  using (
    private.is_assigned_class_teacher(class_id)
    and private.is_recordable_session(class_session_id)
  )
  with check (
    private.is_assigned_class_teacher(class_id)
    and private.is_recordable_session(class_session_id)
  );


-- DELETE Policy 없음 — 관찰 원문은 삭제하지 않고 내용을 정정한다.


-- =========================================================
-- 7. RLS — public.class_session_observation_domains
-- =========================================================
-- 이 테이블에는 organization_id도 class_id도 없다. 전부 부모에서 파생한다.
-- 그래서 Policy가 부모를 EXISTS로 직접 확인한다.
--
-- ★ 새 helper를 만들지 않는다.
--   owns_observation_draft() 같은 helper를 두면 "관찰기록 권한"이라는
--   새 권한 개념이 하나 더 생긴다. 기존 3개 helper의 조합으로 충분하다.
--
-- ★ EXISTS 안의 public.class_session_observations 조회도 그 테이블의
--   SELECT Policy를 그대로 통과해야 한다(Policy는 호출자 권한으로 평가된다).
--   즉 부모를 볼 수 없는 사람은 여기서도 아무것도 볼 수 없다.
--   그럼에도 조건을 명시적으로 반복하는 이유는, 훗날 부모 SELECT가 넓어지더라도
--   이 테이블의 범위가 조용히 함께 넓어지지 않게 하기 위해서다.
--
-- ★ 순환 없음: class_session_observations의 어떤 Policy도 이 테이블을 읽지 않는다.
-- ★ 서브쿼리 안에서 바깥 컬럼을 class_session_observation_domains.observation_id로
--   완전히 한정한다. 그냥 observation_id라고 쓰면 지금은 옳게 해석되지만,
--   훗날 class_session_observations에 같은 이름의 컬럼이 생기는 순간
--   조용히 안쪽 테이블을 가리키게 되어 Policy가 무력화된다.

alter table public.class_session_observation_domains enable row level security;


drop policy if exists "observation domains link readable by org staff and soyes admin"
on public.class_session_observation_domains;

create policy "observation domains link readable by org staff and soyes admin"
  on public.class_session_observation_domains
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_session_observations o
      where o.id = class_session_observation_domains.observation_id
        and (
          (select private.is_soyes_admin())
          or private.has_org_role(o.organization_id, array['director'])
          or private.is_assigned_class_teacher(o.class_id)
        )
    )
  );


-- ★ INSERT / DELETE 모두 is_assigned_class_teacher()를 쓴다. is_class_teacher()가 아니다.
--
--   보관된 반의 기존 관찰기록을 정정할 때 관찰영역도 함께 고칠 수 있어야 하기 때문이다.
--   여기에 is_class_teacher()를 쓰면 "본문은 고칠 수 있는데 영역은 못 고치는"
--   반쪽짜리 정정이 된다.
--
--   보관된 반에 새 관찰기록 자체를 만들 수 없다는 규칙은 부모의 INSERT Policy가
--   이미 지키고 있다(is_class_teacher + 반 active). 여기서 다시 막을 필요가 없고,
--   막으면 정정 경로만 망가진다.
drop policy if exists "observation domains link insert by assigned teacher"
on public.class_session_observation_domains;

create policy "observation domains link insert by assigned teacher"
  on public.class_session_observation_domains
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.class_session_observations o
      where o.id = class_session_observation_domains.observation_id
        and private.is_assigned_class_teacher(o.class_id)
        and private.is_recordable_session(o.class_session_id)
    )
  );


-- ★ 이 프로젝트의 유일한 DELETE Policy다. 근거는 위 GRANT 주석에 적어 두었다.
--   범위는 INSERT와 정확히 같다 — 붙일 수 있는 사람만 뗄 수 있다.
drop policy if exists "observation domains link delete by assigned teacher"
on public.class_session_observation_domains;

create policy "observation domains link delete by assigned teacher"
  on public.class_session_observation_domains
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.class_session_observations o
      where o.id = class_session_observation_domains.observation_id
        and private.is_assigned_class_teacher(o.class_id)
        and private.is_recordable_session(o.class_session_id)
    )
  );


-- UPDATE Policy 없음 — 연결 행은 만들거나 지울 뿐 수정하지 않는다.
-- (UPDATE GRANT도 주지 않았다.)


-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.class_sessions        — 컬럼·GRANT·Policy·trigger 그대로.
--                                  이 Migration은 class_sessions를 SELECT만 한다.
--                                  ★ 관찰 저장이 수업 상태를 바꾸지 않는다.
--   public.children              — 컬럼·GRANT·Policy 그대로. (SELECT Policy 확장은 3/4에서)
--   public.classes / class_teachers / organization_members / profiles — 그대로.
--   public.class_session_attendance — Policy·GRANT·trigger 그대로. 출결과 결합하지 않는다.
--   public.observation_domains   — 1/4에서 만든 그대로. 여기서 고치지 않는다.
--   private.is_class_teacher() / is_assigned_class_teacher() / is_recordable_session()
--     — 의미 그대로 재사용만 한다.
--
-- ※ 출결(attendance)과 DB로 결합하지 않는 이유
--   "present인 원아만 관찰 가능" trigger를 걸면, 나중에 출결을 absent로 정정할 때
--   ① 출결 정정이 막히거나 ② 관찰기록을 지워야 한다. 둘 다 받아들일 수 없다.
--   출결 기준 명단 정렬은 애플리케이션 UX의 몫이고, DB는 이 관계를 강제하지 않는다.
--
-- ※ 이 테이블들에 force row level security를 켜지 마라.
--   3/4 Migration의 SECURITY DEFINER helper가 소유자 RLS 우회에 의존한다.
