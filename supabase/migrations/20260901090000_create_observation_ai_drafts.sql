-- =========================================================
-- SERVICE-10A — AI 관찰기록 정리 초안 (교사 검토·확정)
-- =========================================================
--
-- 무엇을 만드는가
--   table  public.class_session_observation_ai_drafts
--   rpc    public.save_observation_ai_generated_atomic()
--          public.save_observation_ai_review_atomic()
--   trigger private.enforce_observation_ai_draft_insert()
--           private.enforce_observation_ai_draft_update()
--
-- ★ 이 시스템은 아동을 평가·진단하지 않는다.
--   score / grade / level / risk / development_stage / diagnosis 같은 컬럼이 없다.
--   AI가 만드는 것은 "교사가 이미 쓴 문장의 정리 초안" 하나뿐이고,
--   그 초안은 교사가 검토·확정하기 전까지 공식 기록이 아니다.
--
-- ★ generated_text 와 reviewed_text 를 분리하는 이유
--   generated_text : AI 생성 단계에서 저장된 초안 원문. 교사 검토로 덮이지 않는다.
--   reviewed_text  : 교사가 확인·수정한 최종문.
--   둘을 한 컬럼에 합치면 "교사가 고친 것인지 생성 당시 문장 그대로인지"를
--   나중에 아무도 구분할 수 없다. 감사 가능성이 사라진다.
--
--   ※ 표현에 주의한다. 이 컬럼은 "AI provider 가 만들었음이 증명된 문장"이 아니다.
--     제품 흐름에서는 Server Action 만 provider 를 호출하고 그 결과를 넘기지만,
--     이 RPC 는 SECURITY INVOKER 라 authenticated 사용자가 PostgREST 로 직접
--     호출할 수도 있다. DB 가 provenance 를 암호학적으로 보증하지는 않는다.
--     보증되는 것은 "생성 단계에서 저장된 문장이고, 교사 검토로 바뀌지 않는다"까지다.
--     (이걸 해결하려고 service_role 이나 별도 secret 우회 구조를 만들지 않는다 —
--      권한 표면을 넓히는 대가가 얻는 것보다 훨씬 크다)
--
-- ★ SERVICE-11 성장리포트가 쓸 수 있는 공식 텍스트는
--     review_status = 'accepted' AND reviewed_text IS NOT NULL
--   뿐이다. generated_text 단독은 리포트의 근거가 될 수 없다.
--
-- ★ 사진은 이 기능과 무관하다.
--   09A의 활동사진은 화면에만 표시되고, storage path·signed URL·binary 어느 것도
--   이 테이블에 들어오지 않는다. 이 Migration은 media 테이블을 읽지도 않는다.
--
-- ★ service_role을 쓰지 않는다. 두 RPC 모두 SECURITY INVOKER다.
--
-- 재사용하는 기존 자산 (새로 만들지 않는다)
--   20260813 : private.is_soyes_admin()
--   20260815 : private.has_org_role()
--   20260824 : private.is_class_teacher()          — 반 active 요구 (신규 생성용)
--   20260826 : private.is_assigned_class_teacher() — 보관된 반의 검토·조회용
--   20260828 : private.is_recordable_session()     — cancelled 제외
--   20260828 : class_sessions_id_org_class_key     — 복합 FK 대상
--   20260831094000 : public.class_session_observations
--
-- 이 Migration이 건드리지 않는 것
--   class_session_attendance / class_session_observations /
--   class_session_observation_domains / class_session_observation_media /
--   observation_domains / children / class_sessions / classes 의
--   컬럼 · GRANT · Policy · trigger — 전부 그대로.
--   storage bucket / storage.objects Policy — 그대로.


-- =========================================================
-- 사용자 정의 SQLSTATE
-- =========================================================
--   AI001 : 입력 형식 오류 (필수값 누락 / 길이 초과 / 빈 문자열)
--   AI002 : 관찰기록 또는 AI 정리를 찾을 수 없거나 접근 권한 없음 (RLS로 0건 포함)
--   AI003 : 관찰기록이 작성 완료 상태가 아니거나 수업이 기록 가능한 상태가 아님
--   AI004 : 다른 사람이 먼저 저장했다 (AI 정리의 stale)
--   AI005 : 원본 관찰기록이 그 사이 변경되었다 (source token 불일치)
--
--   기존 OB001~OB005(08A) · OM006(09A)와 겹치지 않는다.
--   Server Action이 이 코드를 보고 사용자 문구를 고른다.
--   DB 내부 메시지를 그대로 화면에 노출하지 않는다.
--
--   ※ 아래 표준 코드도 그대로 올라올 수 있다.
--     23505 unique_violation       — 같은 observation에 동시에 두 번 생성
--     42501 insufficient_privilege — RLS INSERT/UPDATE Policy 거부
--     23514 check_violation        — CHECK 제약 또는 trigger


-- =========================================================
-- 1. public.class_session_observation_ai_drafts
-- =========================================================
-- ★ 한 observation당 한 행만 둔다 (MVP).
--   "지금의 AI 정리 상태"만 필요하고, 재생성 이력은 화면 어디에도 쓰이지 않는다.
--   생성 이력이 필요해지면 별도 append-only 테이블로 분리한다(10B/운영 audit).
--   지금 이력 테이블을 만들면 매 재생성마다 아이 기록 사본이 쌓이는데,
--   쓰는 곳이 없는 개인정보 사본은 만들지 않는 편이 안전하다.

create table if not exists public.class_session_observation_ai_drafts (

  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  class_session_id uuid not null,
  class_id uuid not null,
  child_id uuid not null,

  -- ★ 이 AI 정리가 어느 관찰기록을 읽고 만들어졌는가.
  --   on delete cascade 인 이유는 20260831094000의 연결 테이블과 같다 —
  --   부모에 DELETE Policy도 GRANT도 없어 일반 경로에서는 발동하지 않지만,
  --   운영자가 DB 차원 정리를 할 때 고아 행이 남지 않게 한다.
  observation_id uuid not null
    references public.class_session_observations (id)
    on delete cascade,

  -- ★ 생성 시점의 원본 관찰기록 토큰.
  --   observation.updated_at 원문을 그대로 저장한다.
  --   이후 교사가 원본을 고치면 이 값과 달라지고, 그 순간 이 AI 정리는 stale이다.
  --   stale 여부를 컬럼으로 저장하지 않는 이유: 원본이 바뀌는 순간을 이 테이블이
  --   알 수 없어서, 저장하면 반드시 언젠가 거짓이 된다. 읽을 때 비교하는 편이 항상 옳다.
  source_observation_updated_at timestamptz not null,

  -- ── AI 생성 단계에서 저장된 초안 원문 ────────────────────────────
  -- 재생성하면 새 값으로 바뀌지만, 교사 검토로는 바뀌지 않는다.
  generated_text text not null
    constraint class_session_observation_ai_drafts_generated_text_check
    check (
      char_length(generated_text) <= 3000
      and btrim(generated_text) <> ''
    ),

  -- ── 교사가 확인·수정한 최종문 ──────────────────────────────────
  reviewed_text text
    constraint class_session_observation_ai_drafts_reviewed_text_check
    check (
      reviewed_text is null
      or (
        char_length(reviewed_text) <= 3000
        and btrim(reviewed_text) <> ''
      )
    ),
  -- ─────────────────────────────────────────────────────────────

  -- generated : AI가 만든 초안이 있고 교사가 아직 확정하지 않았다
  -- accepted  : 교사가 내용을 확인(필요하면 수정)하고 확정했다
  --
  -- ★ accepted는 잠금이 아니다. 교사는 언제든 다시 수정해 확정할 수 있고,
  --   재생성하면 generated로 되돌아간다(아래 UPDATE trigger).
  review_status text not null default 'generated'
    constraint class_session_observation_ai_drafts_review_status_check
    check (review_status in ('generated', 'accepted')),

  -- 어떤 모델이 언제 어떤 규칙으로 만들었는가. 문제가 생겼을 때 추적하려면 필요하다.
  -- ★ provider 응답 원본(raw JSON)은 저장하지 않는다. 필요 없고, 개인정보만 늘어난다.
  provider text not null
    constraint class_session_observation_ai_drafts_provider_check
    check (char_length(provider) between 1 and 40 and btrim(provider) <> ''),

  model text not null
    constraint class_session_observation_ai_drafts_model_check
    check (char_length(model) between 1 and 120 and btrim(model) <> ''),

  prompt_version text not null
    constraint class_session_observation_ai_drafts_prompt_version_check
    check (char_length(prompt_version) between 1 and 40 and btrim(prompt_version) <> ''),

  -- ★ Client가 보내는 값이 아니다. 아래 trigger가 auth.uid()로 채운다.
  --   GRANT의 INSERT/UPDATE 컬럼 목록에도 들어 있지 않다.
  --   on delete set null 이유는 08A/09A와 같다 — 계정이 지워져도 기록은 남는다.
  --
  --   ★ 두 컬럼 모두 "기록되는 시점"과 "NULL 이 될 수 있는 시점"이 다르다.
  --     기록: trigger 가 auth.uid() 로 반드시 찍는다 (건너뛸 경로가 없다)
  --     NULL: 훗날 그 계정이 삭제되면 FK 가 비운다
  --           그 UPDATE 는 UPDATE trigger 의 (0) metadata-only FK cleanup 분기가 처리한다.
  --           일반 쓰기 경로로 흘려보내면 값이 되살아나거나 계정 삭제가 막힌다.
  generated_by uuid,
  reviewed_by uuid,

  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,

  -- ★ 낙관적 동시성 토큰.
  --   공용 private.set_updated_at()을 쓰지 않는다 — now()는 transaction timestamp라
  --   한 transaction 안에서 값이 고정되어 토큰으로 쓸 수 없다(08A에서 겪은 문제).
  --   아래 UPDATE trigger가 clock_timestamp() 기반으로 직접 발급한다.
  updated_at timestamptz not null default now(),

  -- ★ (1) 확정 상태의 무결성.
  --   accepted 인데 최종문이나 확정 시각이 없는 행은 존재할 수 없다.
  --
  -- ★ reviewed_by 는 여기서 NOT NULL 을 요구하지 않는다 — 의도적이다.
  --
  --   reviewed_by 는 profiles 에 on delete set null 로 매달려 있다.
  --   퇴사한 교사의 계정이 삭제되면 FK 가 이 값을 NULL 로 만들려 하는데,
  --   CHECK 가 reviewed_by NOT NULL 을 요구하면 그 UPDATE 가 check_violation 으로
  --   막혀 **계정 삭제 자체가 실패한다**. 그러면 남는 선택지는
  --     ㄱ) 계정을 못 지운다        ㄴ) 확정된 기록을 지운다
  --   둘 뿐인데 어느 쪽도 받아들일 수 없다.
  --
  --   그래서 규칙을 시점으로 나눈다.
  --     확정하는 순간 : trigger 가 reviewed_by := auth.uid() 를 반드시 찍는다
  --                     (아래 UPDATE trigger, GRANT 에도 이 컬럼이 없다)
  --     그 이후       : 계정 삭제로 NULL 이 되는 것을 허용한다
  --   "누가 확정했는지 모르는 상태"는 계정이 사라졌을 때만 생기고,
  --   그때도 reviewed_text 와 reviewed_at 은 남아 기록의 유효성은 유지된다.
  --   (08A/09A 의 created_by 와 같은 판단이다)
  constraint class_session_observation_ai_drafts_accepted_check
    check (
      review_status <> 'accepted'
      or (
        reviewed_text is not null
        and reviewed_at is not null
      )
    ),

  -- ★ (2) 한 관찰기록에 AI 정리는 하나뿐이다.
  --   동시에 두 번 생성해도 중복 행이 생기지 않는다.
  --   이 UNIQUE가 만드는 index가 observation_id 조회도 함께 커버한다.
  constraint class_session_observation_ai_drafts_observation_key
    unique (observation_id),

  -- ★ (3) 기관·반이 그 수업의 것과 반드시 같아야 한다.
  --   20260828이 만든 class_sessions_id_org_class_key를 참조한다.
  constraint class_session_observation_ai_drafts_session_fk
    foreign key (class_session_id, organization_id, class_id)
    references public.class_sessions (id, organization_id, class_id)
    on delete restrict,

  -- ★ (4) 원아는 반드시 같은 기관의 원아여야 한다.
  constraint class_session_observation_ai_drafts_child_fk
    foreign key (child_id, organization_id)
    references public.children (id, organization_id)
    on delete restrict,

  -- ★ (5) 작성자·검토자. 계정이 지워져도 기록은 남는다.
  constraint class_session_observation_ai_drafts_generated_by_fk
    foreign key (generated_by)
    references public.profiles (user_id)
    on delete set null,

  constraint class_session_observation_ai_drafts_reviewed_by_fk
    foreign key (reviewed_by)
    references public.profiles (user_id)
    on delete set null
);


-- 조회 index — 실제 화면 질의만 덮는다.
--   (class_session_id) : 관찰 상세 화면이 "이 수업의 AI 정리 전부"를 1회 조회한다.
--   (child_id)         : 원아별 성장 이력(SERVICE-11).
-- observation_id 선행 조회는 위 UNIQUE index가 이미 커버한다.
create index if not exists class_session_observation_ai_drafts_session_idx
  on public.class_session_observation_ai_drafts (class_session_id);

create index if not exists class_session_observation_ai_drafts_child_idx
  on public.class_session_observation_ai_drafts (child_id);


-- ★ 공용 set_updated_at() trigger를 붙이지 않는다(위 컬럼 주석 참조).
--   이전 버전에서 만들어졌을 수 있으므로 drop만 남겨 둔다.
drop trigger if exists trg_class_session_observation_ai_drafts_updated_at
on public.class_session_observation_ai_drafts;


-- =========================================================
-- 2. 신규 AI 정리의 도메인 조건 (BEFORE INSERT)
-- =========================================================
-- 아래 INSERT Policy에도 겹치는 조건이 있지만, 이 trigger가 최종 판정자다.
-- RLS는 service_role과 superuser를 통과시키는 반면 trigger는 통과시키지 않는다.

create or replace function private.enforce_observation_ai_draft_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_obs_org uuid;
  v_obs_session uuid;
  v_obs_class uuid;
  v_obs_child uuid;
  v_obs_status text;
  v_obs_updated timestamptz;
  v_session_status text;
begin
  -- (1) 원본 관찰기록이 실제로 있어야 한다.
  select o.organization_id, o.class_session_id, o.class_id, o.child_id,
         o.record_status, o.updated_at
  into v_obs_org, v_obs_session, v_obs_class, v_obs_child,
       v_obs_status, v_obs_updated
  from public.class_session_observations o
  where o.id = new.observation_id;

  if not found then
    raise exception '관찰기록을 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'AI002';
  end if;

  -- (2) 구조값이 그 관찰기록의 것과 같아야 한다.
  --     복합 FK가 수업·원아 쪽은 이미 강제하지만, "그 observation의 것인가"는
  --     여기서만 확인할 수 있다(observations에 (id, session, child) 복합 UNIQUE가 없다).
  if new.organization_id is distinct from v_obs_org
    or new.class_session_id is distinct from v_obs_session
    or new.class_id is distinct from v_obs_class
    or new.child_id is distinct from v_obs_child
  then
    raise exception 'AI 정리의 수업·반·원아 정보가 관찰기록과 일치하지 않습니다.'
      using errcode = 'AI002';
  end if;

  -- (3) ★ 작성 완료된 관찰기록만 AI 정리 대상이다.
  --     draft는 교사가 아직 쓰는 중이라, 그 문장을 정리해 두면
  --     완성되지 않은 기록이 확정된 것처럼 보인다.
  if v_obs_status <> 'complete' then
    raise exception '작성 완료된 관찰기록만 AI 정리를 만들 수 있습니다.'
      using errcode = 'AI003';
  end if;

  -- (4) 취소된 수업에는 새 AI 정리를 만들지 않는다.
  select s.status into v_session_status
  from public.class_sessions s
  where s.id = new.class_session_id;

  if not found or v_session_status = 'cancelled' then
    raise exception '이 수업에는 AI 정리를 만들 수 없습니다.'
      using errcode = 'AI003';
  end if;

  -- (5) ★ 신규 생성은 운영 중인 반에서만 가능하다.
  --     is_class_teacher()가 반 active를 요구한다. 아래 INSERT Policy와 같은 조건이지만
  --     trigger는 service_role·직접 SQL까지 덮는 최종 방어선이다.
  if not private.is_class_teacher(new.class_id) then
    raise exception 'AI 정리를 만들 권한이 없습니다.'
      using errcode = 'AI002';
  end if;

  -- (6) ★ source token 은 반드시 "지금의" 관찰기록 값이어야 한다.
  --     Client가 옛 토큰을 보내 stale 상태를 새 것처럼 위장하는 경로를 막는다.
  if new.source_observation_updated_at is distinct from v_obs_updated then
    raise exception '원본 관찰기록이 변경되었습니다. AI 정리를 다시 생성해주세요.'
      using errcode = 'AI005';
  end if;

  -- (7) 신규 행은 언제나 검토 전 상태다. 확정 정보는 비운다.
  new.review_status := 'generated';
  new.reviewed_text := null;
  new.reviewed_by := null;
  new.reviewed_at := null;

  -- (8) 생성자는 Client가 정하지 않는다. 언제나 지금 로그인한 사용자다.
  new.generated_by := auth.uid();
  new.generated_at := pg_catalog.clock_timestamp();
  new.updated_at := pg_catalog.clock_timestamp();

  return new;
end;
$$;

revoke execute on function private.enforce_observation_ai_draft_insert()
from public, anon, authenticated;

drop trigger if exists trg_class_session_observation_ai_drafts_insert_check
on public.class_session_observation_ai_drafts;

create trigger trg_class_session_observation_ai_drafts_insert_check
before insert on public.class_session_observation_ai_drafts
for each row
execute function private.enforce_observation_ai_draft_insert();


-- =========================================================
-- 3. AI 정리 변경의 도메인 조건 (BEFORE UPDATE)
-- =========================================================
-- 이 테이블의 UPDATE는 세 가지다.
--   재생성   : review_status 가 'generated' 로 끝난다 → 생성 정보를 새로 찍고 확정 정보를 비운다
--   검토확정 : review_status 가 'accepted' 로 끝난다  → 확정 정보를 찍고 생성 정보를 보존한다
--   FK 정리  : generated_by / reviewed_by 를 NULL 로 비우는 것 외에는 아무것도 바뀌지 않는다
-- 앞의 둘은 사람이 하는 쓰기이고, 세 번째는 PostgreSQL 의 참조 무결성 동작이다.
-- 어느 쪽이든 구조 컬럼은 바뀌지 않는다.

create or replace function private.enforce_observation_ai_draft_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_obs_status text;
  v_obs_updated timestamptz;
  v_session_status text;
  v_fk_cleanup boolean;
begin
  -- ---------------------------------------------------------------
  -- (0) ★ metadata-only FK cleanup 인가?
  --
  --   generated_by / reviewed_by 는 profiles 에 on delete set null 로 매달려 있다.
  --   교사 계정이 삭제되면 PostgreSQL 이 이 행에 대해
  --     UPDATE ... SET reviewed_by = NULL
  --   을 직접 실행하고, 그 UPDATE 도 이 trigger 를 발동시킨다.
  --
  --   그 UPDATE 를 아래 일반 경로로 흘려보내면 전부 잘못된다.
  --     - reviewed_by := auth.uid() 로 다시 채워져 FK 가 비우려던 값이 되살아난다
  --       (실제로 SERVICE-10A transaction test 가 이 증상을 잡아냈다)
  --     - is_class_teacher() 를 요구해 AI002 로 계정 삭제가 실패한다
  --     - 그 사이 관찰기록이 draft 로 바뀌었거나 수업이 취소되었으면 AI003 으로 실패한다
  --     - 원본이 수정되어 stale 이면 AI005 로 실패한다
  --   즉 "과거 기록이 있다는 이유로 계정을 영영 못 지우는" 상태가 된다.
  --
  --   그래서 참조 무결성 정리는 별도 경로로 먼저 빠져나간다.
  --   (20260831094000 이 관찰기록의 created_by / updated_by 에서 같은 문제를 다룬 방식이다)
  --
  --   ★ 이 경로가 Client 의 우회로가 되지 않는 이유
  --     ① 허용하는 변화가 "non-null → NULL" 뿐이다.
  --        NULL → UUID 도, UUID A → UUID B 도 이 조건을 통과하지 못한다.
  --     ② 나머지 논리 컬럼이 하나라도 다르면 아래 일반 경로로 내려간다.
  --        즉 이 경로로는 본문·상태·구조를 단 한 글자도 바꿀 수 없다.
  --     ③ 애초에 generated_by / reviewed_by 는 INSERT/UPDATE GRANT 에 없어서
  --        authenticated 가 이 컬럼을 SET 목록에 넣는 것 자체가 42501 이다.
  --     ④ RLS UPDATE Policy(담당 교사 + 기록 가능한 수업)는 그대로 적용된다.
  --        FK 가 실행하는 참조 무결성 UPDATE 만 RLS 를 거치지 않는다(엔진 동작).
  -- ---------------------------------------------------------------
  v_fk_cleanup :=
    -- generated_by : 그대로이거나, 값이 있던 것이 NULL 로 비워졌다
    (new.generated_by is not distinct from old.generated_by
      or (old.generated_by is not null and new.generated_by is null))
    and (new.reviewed_by is not distinct from old.reviewed_by
      or (old.reviewed_by is not null and new.reviewed_by is null))
    -- 둘 중 적어도 하나는 실제로 비워졌다 (아무것도 안 바뀐 UPDATE 는 여기 오지 않는다)
    and (new.generated_by is distinct from old.generated_by
      or new.reviewed_by is distinct from old.reviewed_by)
    -- 그 외 모든 논리 데이터가 OLD 와 완전히 같다
    and new.id is not distinct from old.id
    and new.organization_id is not distinct from old.organization_id
    and new.class_session_id is not distinct from old.class_session_id
    and new.class_id is not distinct from old.class_id
    and new.child_id is not distinct from old.child_id
    and new.observation_id is not distinct from old.observation_id
    and new.source_observation_updated_at
        is not distinct from old.source_observation_updated_at
    and new.generated_text is not distinct from old.generated_text
    and new.reviewed_text is not distinct from old.reviewed_text
    and new.review_status is not distinct from old.review_status
    and new.provider is not distinct from old.provider
    and new.model is not distinct from old.model
    and new.prompt_version is not distinct from old.prompt_version
    and new.generated_at is not distinct from old.generated_at
    and new.reviewed_at is not distinct from old.reviewed_at;

  if v_fk_cleanup then
    -- ★ auth.uid() 로 다시 채우지 않는다. 그것이 이 분기의 존재 이유다.
    --   교사 배정 · 반 active · 수업 상태 · source token 도 요구하지 않는다.
    --   이것은 사람의 쓰기가 아니라 참조 무결성 정리이기 때문이다.
    --
    -- ★ updated_at 은 새로 발급한다.
    --   행이 실제로 바뀌었으므로 낙관적 동시성 토큰도 함께 넘어가야 한다.
    --   그렇지 않으면 정리 전에 화면을 연 교사가 옛 토큰으로 저장에 성공해
    --   "내가 본 행"과 다른 행을 덮어쓰게 된다. AI004 로 알려 주는 편이 옳다.
    new.updated_at := greatest(
      pg_catalog.clock_timestamp(),
      old.updated_at + interval '1 microsecond'
    );

    return new;
  end if;

  -- (1) 구조 컬럼은 불변이다. 이 행이 가리키는 관찰기록을 바꿔치기할 수 없다.
  if new.organization_id is distinct from old.organization_id
    or new.class_session_id is distinct from old.class_session_id
    or new.class_id is distinct from old.class_id
    or new.child_id is distinct from old.child_id
    or new.observation_id is distinct from old.observation_id
  then
    raise exception 'AI 정리의 수업·반·원아 정보는 변경할 수 없습니다.'
      using errcode = 'AI002';
  end if;

  -- (2) 원본 관찰기록의 현재 상태를 다시 읽는다.
  select o.record_status, o.updated_at
  into v_obs_status, v_obs_updated
  from public.class_session_observations o
  where o.id = new.observation_id;

  if not found then
    raise exception '관찰기록을 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'AI002';
  end if;

  if v_obs_status <> 'complete' then
    raise exception '작성 완료된 관찰기록만 AI 정리를 사용할 수 있습니다.'
      using errcode = 'AI003';
  end if;

  select s.status into v_session_status
  from public.class_sessions s
  where s.id = new.class_session_id;

  if not found or v_session_status = 'cancelled' then
    raise exception '이 수업의 AI 정리는 수정할 수 없습니다.'
      using errcode = 'AI003';
  end if;

  if new.review_status = 'generated' then
    ------------------------------------------------------------------
    -- 재생성
    --
    -- ★ 확정 정보를 반드시 비운다.
    --   재생성했는데 이전 accepted 상태가 남아 있으면, 교사가 읽지도 않은
    --   새 문장이 "검토 완료"로 보이게 된다. 그것이 이 기능에서 가장 위험한 상태다.
    --
    -- ★ 신규 생성과 같은 조건(반 active)을 요구한다.
    ------------------------------------------------------------------
    if not private.is_class_teacher(new.class_id) then
      raise exception 'AI 정리를 다시 만들 권한이 없습니다.'
        using errcode = 'AI002';
    end if;

    if new.source_observation_updated_at is distinct from v_obs_updated then
      raise exception '원본 관찰기록이 변경되었습니다. AI 정리를 다시 생성해주세요.'
        using errcode = 'AI005';
    end if;

    new.reviewed_text := null;
    new.reviewed_by := null;
    new.reviewed_at := null;

    new.generated_by := auth.uid();
    new.generated_at := pg_catalog.clock_timestamp();

  else
    ------------------------------------------------------------------
    -- 검토 확정 (review_status = 'accepted')
    --
    -- ★ 초안 원문과 생성 정보는 그대로 보존한다.
    --   "생성 당시 문장이 무엇이었고 교사가 무엇으로 고쳤는가"를 비교할 수 있어야 한다.
    ------------------------------------------------------------------
    if new.generated_text is distinct from old.generated_text then
      raise exception '생성된 초안 원문은 수정할 수 없습니다.'
        using errcode = 'AI002';
    end if;

    -- ★ stale 상태에서는 확정할 수 없다.
    --   원본이 바뀐 뒤의 옛 AI 문장을 "검토 완료"로 굳히면,
    --   공식 기록이 현재 관찰기록과 다른 내용을 말하게 된다.
    if new.source_observation_updated_at is distinct from v_obs_updated then
      raise exception '원본 관찰기록이 변경되었습니다. AI 정리를 다시 생성한 뒤 검토해주세요.'
        using errcode = 'AI005';
    end if;

    new.generated_by := old.generated_by;
    new.generated_at := old.generated_at;

    new.reviewed_by := auth.uid();
    new.reviewed_at := pg_catalog.clock_timestamp();
  end if;

  -- (3) ★ 단조 증가 토큰.
  --   clock_timestamp()는 문장 시각이라 같은 transaction 안에서도 값이 달라진다.
  --   그래도 시계가 뒤로 갈 가능성과 같은 마이크로초 충돌을 막기 위해
  --   old.updated_at 보다 반드시 크게 만든다. 08A의 관찰기록 토큰과 같은 방식이다.
  new.updated_at := greatest(
    pg_catalog.clock_timestamp(),
    old.updated_at + interval '1 microsecond'
  );

  return new;
end;
$$;

revoke execute on function private.enforce_observation_ai_draft_update()
from public, anon, authenticated;

drop trigger if exists trg_class_session_observation_ai_drafts_update_check
on public.class_session_observation_ai_drafts;

create trigger trg_class_session_observation_ai_drafts_update_check
before update on public.class_session_observation_ai_drafts
for each row
execute function private.enforce_observation_ai_draft_update();


-- =========================================================
-- 4. GRANT
-- =========================================================
-- ★ DELETE를 주지 않는다. AI 정리는 지우지 않고 다시 생성한다.
-- ★ id / generated_by / reviewed_by / generated_at / reviewed_at / updated_at 은
--   어느 목록에도 없다. 전부 trigger 또는 default가 채운다.

revoke all on public.class_session_observation_ai_drafts from anon, authenticated;

grant select on public.class_session_observation_ai_drafts to authenticated;

grant insert (
  organization_id,
  class_session_id,
  class_id,
  child_id,
  observation_id,
  source_observation_updated_at,
  generated_text,
  provider,
  model,
  prompt_version
) on public.class_session_observation_ai_drafts to authenticated;

-- UPDATE 가능한 컬럼은 두 RPC가 실제로 쓰는 것만이다.
grant update (
  source_observation_updated_at,
  generated_text,
  provider,
  model,
  prompt_version,
  review_status,
  reviewed_text
) on public.class_session_observation_ai_drafts to authenticated;


-- =========================================================
-- 5. RLS
-- =========================================================
-- anon        : 0건 (위 revoke로 권한이 없고, Policy도 authenticated 전용이다)
-- SOYES 운영자 : 조회만
-- 원장        : 자기 활성 기관 범위에서 조회만  ★ write 분기 없음
-- 교사        : 조회는 배정된 반, 생성은 운영 중인 반, 검토는 배정된 반
--
-- 08A 관찰기록 Policy와 같은 기준이다. AI 정리도 결국 교사의 기록이므로
-- 원장이 대신 확정하지 않는다.

alter table public.class_session_observation_ai_drafts enable row level security;


-- ★ SELECT에는 수업 상태 조건도 반 상태 조건도 없다.
--   취소된 수업·보관된 반의 과거 AI 정리도 계속 보인다.
drop policy if exists "observation ai drafts readable by org staff and soyes admin"
on public.class_session_observation_ai_drafts;

create policy "observation ai drafts readable by org staff and soyes admin"
  on public.class_session_observation_ai_drafts
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );


-- ★ 신규 생성 = 담당 교사 + 운영 중인 반 + 기록 가능한 수업
drop policy if exists "observation ai drafts insert by assigned teacher"
on public.class_session_observation_ai_drafts;

create policy "observation ai drafts insert by assigned teacher"
  on public.class_session_observation_ai_drafts
  for insert
  to authenticated
  with check (
    private.is_class_teacher(class_id)
    and private.is_recordable_session(class_session_id)
  );


-- ★ 검토·재생성 = 배정된 교사 + 기록 가능한 수업
--
--   반이 보관된 뒤에도 이미 만들어진 AI 정리는 검토·확정할 수 있어야 한다.
--   "반이 닫혔다고 교사가 자기 기록을 마무리하지 못하는" 상태를 만들지 않는다.
--   재생성이 반 active 를 요구한다는 규칙은 위 UPDATE trigger가 지킨다
--   (Policy 하나로는 두 경우를 구분할 수 없다).
--
--   USING과 WITH CHECK를 같은 식으로 둔다 — 08A와 같은 이유다.
drop policy if exists "observation ai drafts update by assigned teacher"
on public.class_session_observation_ai_drafts;

create policy "observation ai drafts update by assigned teacher"
  on public.class_session_observation_ai_drafts
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


-- DELETE Policy 없음 — AI 정리는 삭제하지 않는다.


-- =========================================================
-- 6. RPC — AI 생성 결과 저장 (신규 + 재생성)
-- =========================================================
-- ★ SECURITY INVOKER다.
--   호출한 사람(authenticated) 권한으로 실행되므로 위 Policy·GRANT·trigger가
--   그대로 최종 방어선이 된다. 이 함수는 권한을 한 톨도 넓히지 않는다.
--
-- ★ organization_id / class_id / child_id / class_session_id 를 인자로 받지 않는다.
--   전부 p_observation_id 로 조회한 관찰기록 행에서 파생한다.
--   호출자가 다른 수업·다른 원아를 지정할 표면 자체를 만들지 않는다.
--
-- ★ generated_text 는 인자로 받는다.
--   DB가 AI provider를 호출할 수는 없기 때문이다. 대신 이 함수를 호출하는 쪽은
--   반드시 Server Action이고, 그 Server Action이 provider 응답을 직접 받아 넘긴다
--   (브라우저가 만든 문장이 여기로 들어오는 경로는 화면에 존재하지 않는다).
--
-- ★ EXCEPTION 블록을 두지 않는다. 모든 예외가 그대로 전파되어 전체가 rollback된다.

create or replace function public.save_observation_ai_generated_atomic(
  p_observation_id uuid,
  p_generated_text text,
  p_provider text,
  p_model text,
  p_prompt_version text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_max_text constant integer := 3000;

  v_text text;
  v_provider text;
  v_model text;
  v_prompt_version text;

  v_org uuid;
  v_session uuid;
  v_class uuid;
  v_child uuid;
  v_status text;
  v_obs_updated timestamptz;

  v_id uuid;
  v_updated_at timestamptz;
begin
  -- ---------------------------------------------------------
  -- 1. 입력 검증
  -- ---------------------------------------------------------
  if p_observation_id is null then
    raise exception '관찰기록 정보가 필요합니다.' using errcode = 'AI001';
  end if;

  v_text := nullif(btrim(coalesce(p_generated_text, '')), '');
  v_provider := nullif(btrim(coalesce(p_provider, '')), '');
  v_model := nullif(btrim(coalesce(p_model, '')), '');
  v_prompt_version := nullif(btrim(coalesce(p_prompt_version, '')), '');

  if v_text is null or v_provider is null or v_model is null or v_prompt_version is null then
    raise exception 'AI 정리 저장에 필요한 값이 비어 있습니다.' using errcode = 'AI001';
  end if;

  if char_length(v_text) > c_max_text then
    raise exception 'AI 정리는 %자 이내여야 합니다.', c_max_text using errcode = 'AI001';
  end if;

  if char_length(v_provider) > 40
     or char_length(v_model) > 120
     or char_length(v_prompt_version) > 40 then
    raise exception 'AI 정리 메타데이터 형식이 올바르지 않습니다.' using errcode = 'AI001';
  end if;

  -- ---------------------------------------------------------
  -- 2. 관찰기록 조회 — 구조 값의 유일한 출처
  --
  -- SECURITY INVOKER이므로 class_session_observations SELECT Policy가 적용된다.
  -- 담당하지 않는 반이면 0건이 되어 AI002로 끝난다.
  -- ---------------------------------------------------------
  select o.organization_id, o.class_session_id, o.class_id, o.child_id,
         o.record_status, o.updated_at
  into v_org, v_session, v_class, v_child, v_status, v_obs_updated
  from public.class_session_observations o
  where o.id = p_observation_id;

  if not found then
    raise exception '관찰기록을 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'AI002';
  end if;

  if v_status <> 'complete' then
    raise exception '작성 완료된 관찰기록만 AI 정리를 만들 수 있습니다.'
      using errcode = 'AI003';
  end if;

  -- ---------------------------------------------------------
  -- 3. 저장 — 한 관찰기록당 한 행
  --
  -- ★ on conflict 로 중복 요청(더블클릭·재시도)을 흡수한다.
  --   UNIQUE(observation_id) 덕분에 두 번째 요청은 새 행을 만들지 않고
  --   같은 행을 갱신한다. 중복 행이 생길 수 없다.
  --
  -- ★ 재생성이면 확정 정보를 비우는 것은 UPDATE trigger가 강제한다.
  --   여기서 review_status 를 'generated' 로 지정하는 것만으로
  --   trigger 가 reviewed_* 를 비우고 생성 정보를 새로 찍는다.
  -- ---------------------------------------------------------
  insert into public.class_session_observation_ai_drafts (
    organization_id,
    class_session_id,
    class_id,
    child_id,
    observation_id,
    source_observation_updated_at,
    generated_text,
    provider,
    model,
    prompt_version
  )
  values (
    v_org, v_session, v_class, v_child, p_observation_id,
    v_obs_updated, v_text, v_provider, v_model, v_prompt_version
  )
  on conflict (observation_id) do update
  set source_observation_updated_at = excluded.source_observation_updated_at,
      generated_text = excluded.generated_text,
      provider = excluded.provider,
      model = excluded.model,
      prompt_version = excluded.prompt_version,
      review_status = 'generated',
      reviewed_text = null
  returning id, updated_at
  into v_id, v_updated_at;

  -- ---------------------------------------------------------
  -- 4. 결과
  --
  -- updated_at 을 반드시 돌려준다 — Client 가 다음 검토 저장에 쓸 토큰이다.
  -- ---------------------------------------------------------
  return jsonb_build_object(
    'ai_draft_id', v_id,
    'review_status', 'generated',
    'updated_at', v_updated_at,
    'source_observation_updated_at', v_obs_updated
  );
end;
$$;

revoke execute on function public.save_observation_ai_generated_atomic(
  uuid, text, text, text, text
) from public, anon;

grant execute on function public.save_observation_ai_generated_atomic(
  uuid, text, text, text, text
) to authenticated;


-- =========================================================
-- 7. RPC — 교사 검토 확정
-- =========================================================
-- ★ 낙관적 동시성.
--   p_expected_updated_at 은 화면이 받은 AI 정리의 updated_at 문자열 그대로다.
--   UPDATE 문의 WHERE 에 그 조건을 넣어, 두 사람이 같은 AI 정리를 확정할 때
--   뒤에 온 쪽이 AI004 로 끝나게 한다. 08A 관찰기록과 같은 구조다.
--
-- ★ generated_text 는 건드리지 않는다. 초안 원문은 여기서 바뀔 수 없다.

create or replace function public.save_observation_ai_review_atomic(
  p_observation_id uuid,
  p_reviewed_text text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_max_text constant integer := 3000;

  v_text text;
  v_draft_id uuid;
  v_probe_updated timestamptz;
  v_source timestamptz;
  v_obs_updated timestamptz;
  v_obs_status text;
  v_new_updated timestamptz;
begin
  -- ---------------------------------------------------------
  -- 1. 입력 검증
  -- ---------------------------------------------------------
  if p_observation_id is null or p_expected_updated_at is null then
    raise exception '검토 저장에 필요한 값이 없습니다.' using errcode = 'AI001';
  end if;

  v_text := nullif(btrim(coalesce(p_reviewed_text, '')), '');

  if v_text is null then
    raise exception '검토 완료로 저장하려면 내용이 있어야 합니다.' using errcode = 'AI001';
  end if;

  if char_length(v_text) > c_max_text then
    raise exception '검토 내용은 %자 이내여야 합니다.', c_max_text using errcode = 'AI001';
  end if;

  -- ---------------------------------------------------------
  -- 2. 대상 확인 (참고 조회 — 안전성은 3단계 UPDATE 의 WHERE 가 보장한다)
  -- ---------------------------------------------------------
  select d.id, d.source_observation_updated_at
  into v_draft_id, v_source
  from public.class_session_observation_ai_drafts d
  where d.observation_id = p_observation_id;

  if not found then
    raise exception 'AI 정리를 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'AI002';
  end if;

  select o.record_status, o.updated_at
  into v_obs_status, v_obs_updated
  from public.class_session_observations o
  where o.id = p_observation_id;

  if not found then
    raise exception '관찰기록을 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'AI002';
  end if;

  if v_obs_status <> 'complete' then
    raise exception '작성 완료된 관찰기록만 검토할 수 있습니다.'
      using errcode = 'AI003';
  end if;

  -- ★ 원본이 그 사이 바뀌었으면 확정을 막는다.
  --   trigger 도 같은 검사를 하지만, 여기서 먼저 끝내야 Client 가
  --   "다시 생성하세요"라는 정확한 안내를 받는다.
  if v_source is distinct from v_obs_updated then
    raise exception '원본 관찰기록이 변경되었습니다. AI 정리를 다시 생성한 뒤 검토해주세요.'
      using errcode = 'AI005';
  end if;

  -- ---------------------------------------------------------
  -- 3. 확정
  --
  -- reviewed_by / reviewed_at 은 SET 목록에 없다 — UPDATE trigger 가 채운다.
  -- ---------------------------------------------------------
  update public.class_session_observation_ai_drafts d
  set reviewed_text = v_text,
      review_status = 'accepted'
  where d.id = v_draft_id
    and d.updated_at = p_expected_updated_at
  returning d.updated_at
  into v_new_updated;

  if not found then
    -- 0행인 이유를 가려낸다.
    select d.updated_at
    into v_probe_updated
    from public.class_session_observation_ai_drafts d
    where d.id = v_draft_id;

    if not found then
      raise exception 'AI 정리를 찾을 수 없거나 접근 권한이 없습니다.'
        using errcode = 'AI002';
    elsif v_probe_updated is distinct from p_expected_updated_at then
      raise exception 'AI 정리가 이미 변경되었습니다. 화면을 새로고침한 뒤 다시 확인해주세요.'
        using errcode = 'AI004';
    else
      -- 시각이 같은데 UPDATE 가 걸리지 않았다 = UPDATE Policy 거부
      raise exception '이 AI 정리를 검토할 권한이 없습니다.'
        using errcode = 'AI002';
    end if;
  end if;

  return jsonb_build_object(
    'ai_draft_id', v_draft_id,
    'review_status', 'accepted',
    'updated_at', v_new_updated
  );
end;
$$;

revoke execute on function public.save_observation_ai_review_atomic(
  uuid, text, timestamptz
) from public, anon;

grant execute on function public.save_observation_ai_review_atomic(
  uuid, text, timestamptz
) to authenticated;


-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.class_session_observations          컬럼·GRANT·Policy·trigger — 그대로.
--     ★ 이 Migration 은 관찰기록을 SELECT 만 한다. 상태도 내용도 바꾸지 않는다.
--   public.class_session_observation_domains   그대로.
--   public.class_session_observation_media     그대로. (AI 는 사진을 읽지 않는다)
--   public.observation_domains                 그대로.
--   public.class_session_attendance            그대로.
--   public.class_sessions / classes / children / profiles — 그대로 (SELECT 만).
--   storage.buckets / storage.objects          그대로 — 이 Migration 은 storage 를 건드리지 않는다.
--   private.* 기존 helper                      그대로 (재정의하지 않는다).
--   DELETE 경로                                없음. drop table/column/policy(기존 것) 0건.
