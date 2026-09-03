-- =========================================================
-- SERVICE-11B — AI 성장 리포트 초안 보조
-- =========================================================
--
-- 무엇을 만드는가
--   column  public.child_growth_reports.source_revision   (근거 세대 토큰)
--   trigger private.bump_growth_report_source_revision_ins()
--           private.bump_growth_report_source_revision_del()
--   table   public.child_growth_report_ai_drafts
--   trigger private.enforce_growth_report_ai_draft_insert()
--           private.enforce_growth_report_ai_draft_update()
--   rpc     public.save_child_growth_report_ai_draft()
--           public.apply_child_growth_report_ai_draft()
--
-- ★ AI 는 성장 리포트를 완성하지 않는다.
--   이 기능이 만드는 것은 교사가 읽고 고칠 "초안 세 칸"뿐이고,
--   리포트를 확정하는 것은 여전히 SERVICE-11A 의 교사 "작성완료" 버튼이다.
--   이 Migration 어디에도 status 를 'complete' 로 바꾸는 구문이 없다.
--
-- ★ 이 시스템은 아동을 평가·진단하지 않는다.
--   score / grade / percentile / diagnosis / risk_level / ranking /
--   competency / standardized_interpretation 같은 컬럼이 없다.
--
-- ★ 원장은 이 테이블을 읽지 않는다.
--   검토되지 않은 AI 문장이 원장 화면에 보일 이유가 없다 —
--   그래서 SELECT Policy 에 원장 분기를 아예 만들지 않았다(10A 보다 더 좁다).
--   원장이 보는 것은 지금까지처럼 교사가 확정한 리포트 본문뿐이다.
--
-- ★ 사진은 이 기능과 무관하다. media 테이블을 읽지 않는다.
--
-- ★ service_role 을 쓰지 않는다. 두 RPC 모두 SECURITY INVOKER 다.
--
-- 이 Migration 이 건드리지 않는 것
--   20260901160000 의 테이블·Policy·GRANT·trigger·RPC 정의 — 전부 그대로.
--     ★ 이미 적용된 migration 을 수정하지 않는다. 이 파일은 전진 migration 이다.
--     ★ create_or_refresh_child_growth_report() 를 CREATE OR REPLACE 하지 않는다.
--       근거 세대 토큰을 RPC 가 아니라 sources 테이블의 trigger 로 유지하기 때문이다
--       (아래 2번 절에 이유를 적었다).
--   attendance / observations / observation ai drafts / media / storage — 전부 그대로.


-- =========================================================
-- 사용자 정의 SQLSTATE
-- =========================================================
--   GA001 : 입력 형식 오류 (빈 값 / 길이 초과)
--   GA002 : 리포트 또는 AI 초안을 찾을 수 없거나 접근 권한 없음
--   GA003 : 작성 완료된 리포트에는 AI 초안을 만들거나 적용할 수 없다
--   GA004 : 리포트가 그 사이 변경되었다 (리포트 낙관적 동시성)
--   GA005 : AI 초안이 지금 근거와 맞지 않는다 (source_revision 불일치 = stale)
--   GA006 : 적용할 AI 초안이 없다
--
--   기존 OB001~005(08A) · OM006(09A) · AI001~005(10A) · GR001~005(11A) 와 겹치지 않는다.


-- =========================================================
-- 1. child_growth_reports.source_revision — 근거 세대 토큰
-- =========================================================
-- ★ 왜 updated_at 을 쓰지 않는가
--
--   updated_at 은 교사가 본문(성장 변화·관찰 요약·다음 지원 방향)을 저장할 때도 바뀐다.
--   그런데 본문을 고쳐도 AI 에게 준 근거는 하나도 달라지지 않는다.
--   updated_at 을 AI 토큰으로 쓰면 교사가 한 글자만 고쳐도 방금 만든 AI 초안이
--   stale 이 되어 다시 만들어야 한다 — 쓸 수 없는 기능이 된다.
--
--   그래서 "근거가 몇 번째 세대인가"만 세는 별도 토큰을 둔다.
--     교사가 본문을 저장   → source_revision 그대로  (AI 초안 유효)
--     교사가 근거 다시 모으기 → source_revision 증가  (AI 초안 stale)
--
-- ★ 기존 행 backfill
--   default 1 이라 이미 있는 리포트(완료본 포함)는 전부 1 로 채워진다.
--   PostgreSQL 11+ 에서 상수 default 를 가진 컬럼 추가는 테이블 재작성이 없다.
--   기존 리포트의 어떤 값도 바뀌지 않고, 완료본은 여전히 불변이다.
--
-- ★ Client 는 이 값을 쓸 수 없다. 아래 GRANT 어디에도 없다.

alter table public.child_growth_reports
  add column if not exists source_revision bigint not null default 1;

comment on column public.child_growth_reports.source_revision is
  'SERVICE-11B: 근거 스냅샷 세대. 근거가 다시 모일 때만 증가한다. 본문 수정으로는 변하지 않는다.';


-- =========================================================
-- 2. 근거가 바뀌면 세대가 올라간다 (statement 단위 trigger)
-- =========================================================
-- ★ 왜 RPC 가 아니라 trigger 인가
--
--   ㄱ) 20260901160000 은 이미 Production 에 적용되었다. 거기 있는 RPC 를
--       CREATE OR REPLACE 하면, 지금 잘 돌고 있는 코드를 다시 배포하는 셈이 된다.
--       이 기능에 필요한 것은 "근거가 바뀌었다"는 사실 하나뿐이라
--       그 사실이 실제로 일어나는 자리(sources 테이블)에서 세는 편이 정확하다.
--
--   ㄴ) trigger 는 RPC 경로가 아닌 변경까지 덮는다.
--       훗날 다른 경로로 근거가 바뀌어도 세대가 자동으로 따라 올라간다.
--       RPC 안에서 세면 그 경로만 맞고 나머지는 조용히 어긋난다.
--
-- ★ statement 단위인 이유
--   근거 새로고침은 DELETE 한 번 + INSERT 한 번이다. row 단위로 만들면
--   근거 50건에 대해 부모 UPDATE 가 50번 일어나고, 그때마다 11A 의 UPDATE trigger 가
--   출결을 다시 집계한다. statement 단위면 문장당 한 번이면 된다.
--
-- ★ 세대 값 자체에는 의미가 없다. AI 초안과 "같은가 다른가"만 본다.
--   그래서 몇 씩 증가하든 상관없고, 증가는 언제나 AI 초안을 무효화하는
--   안전한 방향으로만 작동한다(유효하게 만드는 경로가 없다).

create or replace function private.bump_growth_report_source_revision_ins()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.child_growth_reports r
  set source_revision = r.source_revision + 1
  where r.id in (select distinct i.report_id from inserted i);

  return null;
end;
$$;

revoke execute on function private.bump_growth_report_source_revision_ins()
from public, anon, authenticated;


create or replace function private.bump_growth_report_source_revision_del()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.child_growth_reports r
  set source_revision = r.source_revision + 1
  where r.id in (select distinct d.report_id from deleted d);

  return null;
end;
$$;

revoke execute on function private.bump_growth_report_source_revision_del()
from public, anon, authenticated;


drop trigger if exists trg_child_growth_report_sources_bump_ins
on public.child_growth_report_sources;

create trigger trg_child_growth_report_sources_bump_ins
after insert on public.child_growth_report_sources
referencing new table as inserted
for each statement
execute function private.bump_growth_report_source_revision_ins();


drop trigger if exists trg_child_growth_report_sources_bump_del
on public.child_growth_report_sources;

create trigger trg_child_growth_report_sources_bump_del
after delete on public.child_growth_report_sources
referencing old table as deleted
for each statement
execute function private.bump_growth_report_source_revision_del();


-- =========================================================
-- 3. public.child_growth_report_ai_drafts
-- =========================================================
-- ★ 이 표는 "보조 초안"이지 기록이 아니다.
--   교사가 확정한 공식 문장은 여전히 child_growth_reports 의 세 컬럼이다.
--   여기 있는 문장이 리포트로 들어가려면 교사가 "초안 적용"을 누르고,
--   그 뒤에도 "작성완료"를 눌러야 한다. 두 단계 모두 사람이 한다.

create table if not exists public.child_growth_report_ai_drafts (

  id uuid primary key default gen_random_uuid(),

  -- 한 리포트에 지금의 AI 초안은 하나뿐이다. 다시 만들면 이 행을 갱신한다.
  report_id uuid not null
    constraint child_growth_report_ai_drafts_report_key unique
    references public.child_growth_reports (id)
    on delete cascade,

  -- 부모에서 파생한다. 아래 trigger 가 부모 값으로 덮어쓰므로 어긋날 수 없다.
  organization_id uuid not null,
  class_id uuid not null,
  child_id uuid not null,

  -- ★ 생성 당시의 근거 세대. 지금 리포트의 값과 다르면 stale 이다.
  --   Client 가 쓸 수 없다(GRANT 에 없다). trigger 가 부모에서 읽어 채운다.
  source_revision bigint not null,

  -- ── AI 초안 세 칸 ─────────────────────────────────────────────
  -- 길이 상한은 child_growth_reports 의 대응 컬럼과 같다.
  -- 초안이 리포트에 들어가지 못하는 길이면 애초에 저장하지 않는다.
  generated_growth_changes text not null
    constraint child_growth_report_ai_drafts_growth_check
    check (char_length(generated_growth_changes) <= 4000
           and btrim(generated_growth_changes) <> ''),

  generated_observation_summary text not null
    constraint child_growth_report_ai_drafts_summary_check
    check (char_length(generated_observation_summary) <= 4000
           and btrim(generated_observation_summary) <> ''),

  generated_next_support text not null
    constraint child_growth_report_ai_drafts_support_check
    check (char_length(generated_next_support) <= 3000
           and btrim(generated_next_support) <> ''),
  -- ─────────────────────────────────────────────────────────────

  -- 어떤 모델이 어떤 규칙으로 만들었는가. 문제 추적용이다.
  -- ★ provider 응답 원본(raw JSON)은 저장하지 않는다.
  provider text not null
    constraint child_growth_report_ai_drafts_provider_check
    check (char_length(provider) between 1 and 40 and btrim(provider) <> ''),

  model text not null
    constraint child_growth_report_ai_drafts_model_check
    check (char_length(model) between 1 and 120 and btrim(model) <> ''),

  prompt_version text not null
    constraint child_growth_report_ai_drafts_prompt_version_check
    check (char_length(prompt_version) between 1 and 40 and btrim(prompt_version) <> ''),

  -- ★ Client 가 정하는 값이 아니다. trigger 가 auth.uid() 로 채운다.
  --   on delete set null 이유는 08A~11A 와 같다 — 계정이 지워져도 기록은 남는다.
  --   비워지는 시점(FK 정리)과 기록되는 시점이 다르다는 것도 같다.
  generated_by uuid,
  generated_at timestamptz not null default now(),

  -- 교사가 이 초안을 리포트에 적용했는가. 값은 전부 trigger 가 정한다.
  applied_by uuid,
  applied_at timestamptz,

  -- 단조 증가. 08A/10A/11A 와 같은 방식으로 trigger 가 발급한다.
  updated_at timestamptz not null default now(),

  constraint child_growth_report_ai_drafts_class_fk
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id)
    on delete restrict,

  constraint child_growth_report_ai_drafts_child_fk
    foreign key (child_id, organization_id)
    references public.children (id, organization_id)
    on delete restrict,

  constraint child_growth_report_ai_drafts_generated_by_fk
    foreign key (generated_by) references public.profiles (user_id) on delete set null,

  constraint child_growth_report_ai_drafts_applied_by_fk
    foreign key (applied_by) references public.profiles (user_id) on delete set null
);


-- 조회 index — report_id 는 위 UNIQUE 가 이미 커버한다.
create index if not exists child_growth_report_ai_drafts_class_idx
  on public.child_growth_report_ai_drafts (class_id);


-- =========================================================
-- 4. AI 초안 INSERT 의 도메인 조건 (BEFORE INSERT)
-- =========================================================

create or replace function private.enforce_growth_report_ai_draft_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rep record;
begin
  select r.organization_id, r.class_id, r.child_id, r.status, r.source_revision
  into v_rep
  from public.child_growth_reports r
  where r.id = new.report_id;

  if not found then
    raise exception '성장 리포트를 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'GA002';
  end if;

  -- ★ 작성 완료된 리포트에는 AI 초안을 만들지 않는다.
  --   완료본은 11A 에서 불변으로 못박은 문서다. 초안을 붙일 이유가 없다.
  if v_rep.status <> 'draft' then
    raise exception '작성 완료된 리포트에는 AI 초안을 만들 수 없습니다.'
      using errcode = 'GA003';
  end if;

  -- ★ 담당 교사만 만들 수 있다.
  --   반이 보관된 뒤에도 자기 리포트를 마무리할 수 있어야 하므로
  --   is_class_teacher(반 active 요구)가 아니라 is_assigned_class_teacher 를 쓴다.
  --   11A 의 리포트 UPDATE Policy 와 같은 기준이다.
  if not private.is_assigned_class_teacher(v_rep.class_id) then
    raise exception '이 리포트의 AI 초안을 만들 권한이 없습니다.'
      using errcode = 'GA002';
  end if;

  -- ★ 구조값과 근거 세대는 부모에서만 나온다. Client 값은 버린다.
  new.organization_id := v_rep.organization_id;
  new.class_id := v_rep.class_id;
  new.child_id := v_rep.child_id;
  new.source_revision := v_rep.source_revision;

  -- 새 초안은 아직 적용 전이다.
  new.applied_by := null;
  new.applied_at := null;

  new.generated_by := auth.uid();
  new.generated_at := pg_catalog.clock_timestamp();
  new.updated_at := pg_catalog.clock_timestamp();

  return new;
end;
$$;

revoke execute on function private.enforce_growth_report_ai_draft_insert()
from public, anon, authenticated;

drop trigger if exists trg_child_growth_report_ai_drafts_insert_check
on public.child_growth_report_ai_drafts;

create trigger trg_child_growth_report_ai_drafts_insert_check
before insert on public.child_growth_report_ai_drafts
for each row
execute function private.enforce_growth_report_ai_draft_insert();


-- =========================================================
-- 5. AI 초안 UPDATE 의 도메인 조건 (BEFORE UPDATE)
-- =========================================================
-- 이 표의 UPDATE 는 세 가지다.
--   재생성  : generated_* 가 바뀐다  → 세대를 다시 읽고 적용 정보를 비운다
--   적용    : 초안 문장은 그대로다   → 적용 여부를 "리포트를 읽어서" 판정한다
--   FK 정리 : generated_by / applied_by 가 NULL 로 비워지는 것 외에 아무것도 안 바뀐다
-- 앞의 둘은 사람이 하는 쓰기이고, 세 번째는 PostgreSQL 의 참조 무결성 동작이다.
--
-- ★ applied_at / applied_by 는 Client 가 신호로 쓸 수 없다 (감사 무결성)
--   두 컬럼에는 INSERT/UPDATE GRANT 가 없다. 즉 authenticated 는 SET 목록에
--   넣는 것 자체가 42501 이다. 그래서 "적용했다"고 주장할 방법이 없다.
--
--   대신 이 trigger 가 부모 리포트를 직접 읽어서 판정한다.
--     리포트의 성장 변화 · 관찰 요약 · 다음 지원 방향 세 칸이
--     이 초안의 generated_* 와 정확히 같고, 세대까지 일치할 때만
--     applied_at / applied_by 를 채운다.
--
--   결과적으로 applied_at 은 주장이 아니라 관찰된 사실이다.
--   "적용됨으로 보이지만 리포트에는 들어가지 않은 행" 이 만들어질 수 없다.

create or replace function private.enforce_growth_report_ai_draft_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fk_cleanup boolean;
  v_rep record;
  v_regenerated boolean;
  v_applied boolean;
begin
  -- ---------------------------------------------------------------
  -- (0) ★ metadata-only FK cleanup 인가?  (SERVICE-10 에서 얻은 교훈)
  --
  --   generated_by / applied_by 는 profiles 에 on delete set null 로 매달려 있다.
  --   교사 계정이 삭제되면 PostgreSQL 이 이 행에 UPDATE ... SET x = NULL 을 실행하고,
  --   그 UPDATE 도 이 trigger 를 발동시킨다. 일반 경로로 흘려보내면
  --   auth.uid() 로 값이 되살아나거나, 완료/권한 검사에 걸려 계정 삭제가 실패한다.
  --
  --   ★ 우회로가 되지 않는 이유
  --     ① 허용하는 변화가 "non-null → NULL" 뿐이다. NULL → UUID 도, A → B 도 아니다.
  --     ② 나머지 논리 컬럼이 하나라도 다르면 아래 일반 경로로 내려간다.
  --     ③ generated_by / applied_by / applied_at 은 INSERT/UPDATE GRANT 에 없어서
  --        authenticated 가 SET 목록에 넣는 것 자체가 42501 이다.
  --     ④ 이 분기는 updated_at 만 올리고 applied_at 을 채우지 않는다.
  --        계정 삭제가 적용 이력을 만들어내지 않는다.
  -- ---------------------------------------------------------------
  v_fk_cleanup :=
    (new.generated_by is not distinct from old.generated_by
      or (old.generated_by is not null and new.generated_by is null))
    and (new.applied_by is not distinct from old.applied_by
      or (old.applied_by is not null and new.applied_by is null))
    and (new.generated_by is distinct from old.generated_by
      or new.applied_by is distinct from old.applied_by)
    and new.id is not distinct from old.id
    and new.report_id is not distinct from old.report_id
    and new.organization_id is not distinct from old.organization_id
    and new.class_id is not distinct from old.class_id
    and new.child_id is not distinct from old.child_id
    and new.source_revision is not distinct from old.source_revision
    and new.generated_growth_changes is not distinct from old.generated_growth_changes
    and new.generated_observation_summary is not distinct from old.generated_observation_summary
    and new.generated_next_support is not distinct from old.generated_next_support
    and new.provider is not distinct from old.provider
    and new.model is not distinct from old.model
    and new.prompt_version is not distinct from old.prompt_version
    and new.generated_at is not distinct from old.generated_at
    and new.applied_at is not distinct from old.applied_at;

  if v_fk_cleanup then
    new.updated_at := greatest(
      pg_catalog.clock_timestamp(),
      old.updated_at + interval '1 microsecond'
    );
    return new;
  end if;

  -- (1) 구조 컬럼은 불변이다. 이 초안이 가리키는 리포트를 바꿔치기할 수 없다.
  if new.report_id is distinct from old.report_id
    or new.organization_id is distinct from old.organization_id
    or new.class_id is distinct from old.class_id
    or new.child_id is distinct from old.child_id
  then
    raise exception 'AI 초안의 리포트·기관·반·원아 정보는 변경할 수 없습니다.'
      using errcode = 'GA002';
  end if;

  -- (2) 부모 리포트를 다시 읽는다.
  --   ★ 본문 세 칸까지 읽는다. 적용 여부를 여기서 판정하기 때문이다.
  select r.status, r.source_revision, r.class_id,
         r.growth_changes, r.observation_summary, r.next_support
  into v_rep
  from public.child_growth_reports r
  where r.id = new.report_id;

  if not found then
    raise exception '성장 리포트를 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'GA002';
  end if;

  if v_rep.status <> 'draft' then
    raise exception '작성 완료된 리포트의 AI 초안은 변경할 수 없습니다.'
      using errcode = 'GA003';
  end if;

  if not private.is_assigned_class_teacher(v_rep.class_id) then
    raise exception '이 AI 초안을 변경할 권한이 없습니다.'
      using errcode = 'GA002';
  end if;

  v_regenerated :=
    new.generated_growth_changes is distinct from old.generated_growth_changes
    or new.generated_observation_summary is distinct from old.generated_observation_summary
    or new.generated_next_support is distinct from old.generated_next_support;

  if v_regenerated then
    ------------------------------------------------------------------
    -- 재생성
    --
    -- ★ 세대는 지금 리포트에서 다시 읽는다. Client 값은 쓰지 않는다.
    -- ★ 적용 정보를 반드시 비운다. 새 문장이 "이미 적용됨"으로 보이면
    --   교사가 읽지 않은 초안이 리포트에 들어간 것처럼 오해된다.
    ------------------------------------------------------------------
    new.source_revision := v_rep.source_revision;
    new.generated_by := auth.uid();
    new.generated_at := pg_catalog.clock_timestamp();
    new.applied_by := null;
    new.applied_at := null;

  else
    ------------------------------------------------------------------
    -- 적용 판정 (그 밖의 변경도 여기로 온다)
    --
    -- ★ 초안 문장과 생성 정보는 그대로 보존한다.
    -- ★ 세대는 바꿀 수 없다 — 여기서 세대를 올릴 수 있으면
    --   stale 초안을 "지금 근거로 만든 것"처럼 위장할 수 있게 된다.
    ------------------------------------------------------------------
    new.source_revision := old.source_revision;
    new.generated_by := old.generated_by;
    new.generated_at := old.generated_at;

    ------------------------------------------------------------------
    -- ★ 적용 여부는 Client 가 말해주는 것이 아니라 리포트를 읽어서 안다.
    --
    --   ① 세대가 지금 근거와 같아야 한다 (stale 초안은 적용으로 치지 않는다)
    --   ② 리포트 본문 세 칸이 이 초안의 generated_* 와 정확히 같아야 한다
    --
    --   두 조건이 모두 참이면 "이 초안이 지금 리포트에 들어 있다"가 사실이다.
    --   거짓이면 적용 표시를 남기지 않는다. 그래서 실제로 옮겨 담지 않은 행이
    --   "적용됨"으로 보일 수 없다.
    ------------------------------------------------------------------
    v_applied :=
      old.source_revision = v_rep.source_revision
      and v_rep.growth_changes is not distinct from old.generated_growth_changes
      and v_rep.observation_summary is not distinct from old.generated_observation_summary
      and v_rep.next_support is not distinct from old.generated_next_support;

    if v_applied then
      if old.applied_at is null then
        -- 처음 확인된 적용. 값은 서버가 정한다.
        new.applied_by := auth.uid();
        new.applied_at := pg_catalog.clock_timestamp();
      else
        -- 이미 기록된 적용 시각은 덮어쓰지 않는다.
        new.applied_by := old.applied_by;
        new.applied_at := old.applied_at;
      end if;
    else
      -- 리포트에 이 초안이 들어 있지 않다 → 적용 표시를 남기지 않는다.
      new.applied_by := null;
      new.applied_at := null;
    end if;
  end if;

  new.updated_at := greatest(
    pg_catalog.clock_timestamp(),
    old.updated_at + interval '1 microsecond'
  );

  return new;
end;
$$;

revoke execute on function private.enforce_growth_report_ai_draft_update()
from public, anon, authenticated;

drop trigger if exists trg_child_growth_report_ai_drafts_update_check
on public.child_growth_report_ai_drafts;

create trigger trg_child_growth_report_ai_drafts_update_check
before update on public.child_growth_report_ai_drafts
for each row
execute function private.enforce_growth_report_ai_draft_update();


-- =========================================================
-- 6. GRANT
-- =========================================================
-- ★ DELETE 를 주지 않는다.
-- ★ 아래 컬럼은 어느 목록에도 없다 — 전부 trigger 가 정한다.
--   id / organization_id / class_id / child_id / source_revision /
--   generated_by / generated_at / applied_by / applied_at / updated_at
--
-- ★ applied_at / applied_by 에는 GRANT 를 주지 않는다 (감사 무결성)
--   Client 가 이 두 칸을 직접 쓸 수 있으면, 실제로는 리포트에 옮겨 담지 않고도
--   "AI 초안이 적용된 행"을 만들 수 있다. 그것은 거짓 이력이다.
--   적용은 오직 public.apply_child_growth_report_ai_draft 로만 일어나고,
--   그 사실 여부는 UPDATE trigger 가 리포트를 직접 읽어서 판정한다.
--
-- ★ generated_* / provider / model / prompt_version 에 GRANT 가 남아 있는 이유
--   두 RPC 가 SECURITY INVOKER 이기 때문이다. RPC 안의 INSERT ... ON CONFLICT
--   DO UPDATE 는 호출한 교사의 권한으로 실행되므로, SET 목록에 등장하는 컬럼에는
--   컬럼 GRANT 가 반드시 필요하다. 여기 있는 목록이 그 최소집합이다.
--   (provider / model / prompt_version 은 재생성 때 실제로 쓴 모델을 기록해야 하므로
--    UPDATE 목록에서 뺄 수 없다. 빼면 메타데이터가 거짓이 된다.)
--   이 GRANT 로 할 수 있는 최대치는 "자기 반 초안의 문장을 바꾸는 것"이고,
--   그것은 교사가 화면에서 다시 생성하는 것과 같은 권한이다.

revoke all on public.child_growth_report_ai_drafts from anon, authenticated;

grant select on public.child_growth_report_ai_drafts to authenticated;

grant insert (
  report_id,
  generated_growth_changes,
  generated_observation_summary,
  generated_next_support,
  provider,
  model,
  prompt_version
) on public.child_growth_report_ai_drafts to authenticated;

grant update (
  generated_growth_changes,
  generated_observation_summary,
  generated_next_support,
  provider,
  model,
  prompt_version
) on public.child_growth_report_ai_drafts to authenticated;


-- =========================================================
-- 7. RLS
-- =========================================================
-- anon        : 0건
-- 원장        : ★ 분기 없음. 검토되지 않은 AI 문장을 원장이 볼 이유가 없다.
-- SOYES 운영자 : 분기 없음. 이 표에 운영상 필요가 없다.
-- 교사        : 배정된 반의 초안만 조회/작성/수정
--
-- 결과적으로 이 표는 SERVICE-08~11A 중 가장 좁은 가시성을 갖는다. 의도한 것이다.

alter table public.child_growth_report_ai_drafts enable row level security;


drop policy if exists "growth report ai drafts readable by assigned teacher"
on public.child_growth_report_ai_drafts;

create policy "growth report ai drafts readable by assigned teacher"
  on public.child_growth_report_ai_drafts
  for select
  to authenticated
  using (private.is_assigned_class_teacher(class_id));


-- ★ 작성 중인 리포트에서만 초안을 만든다.
drop policy if exists "growth report ai drafts insert by assigned teacher"
on public.child_growth_report_ai_drafts;

create policy "growth report ai drafts insert by assigned teacher"
  on public.child_growth_report_ai_drafts
  for insert
  to authenticated
  with check (
    private.is_assigned_class_teacher(class_id)
    and exists (
      select 1
      from public.child_growth_reports r
      where r.id = child_growth_report_ai_drafts.report_id
        and r.status = 'draft'
    )
  );


-- ★ 재생성·적용도 작성 중인 리포트에서만 가능하다.
drop policy if exists "growth report ai drafts update by assigned teacher"
on public.child_growth_report_ai_drafts;

create policy "growth report ai drafts update by assigned teacher"
  on public.child_growth_report_ai_drafts
  for update
  to authenticated
  using (
    private.is_assigned_class_teacher(class_id)
    and exists (
      select 1
      from public.child_growth_reports r
      where r.id = child_growth_report_ai_drafts.report_id
        and r.status = 'draft'
    )
  )
  with check (
    private.is_assigned_class_teacher(class_id)
  );


-- DELETE Policy 없음 — AI 초안은 삭제하지 않고 다시 만든다.


-- =========================================================
-- 8. RPC — AI 초안 저장 (신규 + 재생성)
-- =========================================================
-- ★ SECURITY INVOKER. Policy · GRANT · trigger 가 그대로 최종 방어선이다.
--
-- ★ organization_id / class_id / child_id / source_revision 을 인자로 받지 않는다.
--   전부 p_report_id 로 조회한 리포트 행에서 trigger 가 파생한다.
--
-- ★ 생성된 문장은 인자로 받는다. DB 가 OpenAI 를 호출할 수 없기 때문이다.
--   대신 이 함수를 호출하는 쪽은 반드시 Server Action 이고,
--   그 Server Action 이 provider 응답을 직접 받아 넘긴다.
--   (10A 의 AI 초안 RPC 와 같은 구조·같은 한계다 — DB 가 provenance 를
--    암호학적으로 보증하지는 않는다)

create or replace function public.save_child_growth_report_ai_draft(
  p_report_id uuid,
  p_growth_changes text,
  p_observation_summary text,
  p_next_support text,
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
  c_max_growth constant integer := 4000;
  c_max_summary constant integer := 4000;
  c_max_support constant integer := 3000;

  v_growth text;
  v_summary text;
  v_support text;
  v_provider text;
  v_model text;
  v_prompt text;

  v_status text;
  v_revision bigint;
  v_id uuid;
  v_updated timestamptz;
begin
  if p_report_id is null then
    raise exception '리포트 정보가 필요합니다.' using errcode = 'GA001';
  end if;

  v_growth := nullif(btrim(coalesce(p_growth_changes, '')), '');
  v_summary := nullif(btrim(coalesce(p_observation_summary, '')), '');
  v_support := nullif(btrim(coalesce(p_next_support, '')), '');
  v_provider := nullif(btrim(coalesce(p_provider, '')), '');
  v_model := nullif(btrim(coalesce(p_model, '')), '');
  v_prompt := nullif(btrim(coalesce(p_prompt_version, '')), '');

  if v_growth is null or v_summary is null or v_support is null
     or v_provider is null or v_model is null or v_prompt is null then
    raise exception 'AI 초안 저장에 필요한 값이 비어 있습니다.' using errcode = 'GA001';
  end if;

  if char_length(v_growth) > c_max_growth
     or char_length(v_summary) > c_max_summary
     or char_length(v_support) > c_max_support then
    raise exception 'AI 초안이 리포트에 담을 수 있는 길이를 넘었습니다.'
      using errcode = 'GA001';
  end if;

  if char_length(v_provider) > 40 or char_length(v_model) > 120
     or char_length(v_prompt) > 40 then
    raise exception 'AI 초안 메타데이터 형식이 올바르지 않습니다.' using errcode = 'GA001';
  end if;

  -- 리포트 조회 — SECURITY INVOKER 라 11A 의 SELECT Policy 가 그대로 적용된다.
  select r.status, r.source_revision
  into v_status, v_revision
  from public.child_growth_reports r
  where r.id = p_report_id;

  if not found then
    raise exception '성장 리포트를 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'GA002';
  end if;

  if v_status <> 'draft' then
    raise exception '작성 완료된 리포트에는 AI 초안을 만들 수 없습니다.'
      using errcode = 'GA003';
  end if;

  -- ★ 한 리포트에 초안은 하나. 다시 만들면 같은 행을 갱신한다.
  --   더블클릭·재시도로 행이 늘지 않는다.
  insert into public.child_growth_report_ai_drafts (
    report_id,
    generated_growth_changes,
    generated_observation_summary,
    generated_next_support,
    provider, model, prompt_version
  )
  values (
    p_report_id, v_growth, v_summary, v_support, v_provider, v_model, v_prompt
  )
  on conflict (report_id) do update
  set generated_growth_changes = excluded.generated_growth_changes,
      generated_observation_summary = excluded.generated_observation_summary,
      generated_next_support = excluded.generated_next_support,
      provider = excluded.provider,
      model = excluded.model,
      prompt_version = excluded.prompt_version
  returning id, updated_at into v_id, v_updated;

  return jsonb_build_object(
    'ai_draft_id', v_id,
    'source_revision', v_revision,
    'updated_at', v_updated
  );
end;
$$;

revoke execute on function public.save_child_growth_report_ai_draft(
  uuid, text, text, text, text, text, text
) from public, anon;

grant execute on function public.save_child_growth_report_ai_draft(
  uuid, text, text, text, text, text, text
) to authenticated;


-- =========================================================
-- 9. RPC — AI 초안을 리포트에 적용
-- =========================================================
-- ★ 이 함수는 리포트를 완성하지 않는다.
--   status 를 건드리지 않으므로 리포트는 draft 그대로 남고,
--   교사가 내용을 확인한 뒤 11A 의 "작성완료"를 눌러야 확정된다.
--
-- ★ 낙관적 동시성 두 겹
--   p_expected_updated_at : 교사가 보고 있던 리포트가 그 사이 바뀌지 않았는가
--   source_revision       : AI 초안이 지금 근거로 만든 것인가
--
-- ★ 적용 이력을 Client 가 남길 수 없다
--   applied_at / applied_by 에는 컬럼 GRANT 가 없다. 이 함수도 두 컬럼을
--   SET 목록에 넣지 않는다. 리포트 본문을 실제로 채운 뒤 초안 행을 한 번
--   건드리면, UPDATE trigger 가 리포트를 읽어보고 스스로 적용 시각을 남긴다.
--   따라서 "적용됨"이라는 표시는 항상 실제 반영을 뒤따른다.

create or replace function public.apply_child_growth_report_ai_draft(
  p_report_id uuid,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_revision bigint;
  v_draft record;
  v_probe timestamptz;
  v_new_updated timestamptz;
begin
  if p_report_id is null or p_expected_updated_at is null then
    raise exception '적용에 필요한 값이 없습니다.' using errcode = 'GA001';
  end if;

  select r.status, r.source_revision
  into v_status, v_revision
  from public.child_growth_reports r
  where r.id = p_report_id;

  if not found then
    raise exception '성장 리포트를 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'GA002';
  end if;

  if v_status <> 'draft' then
    raise exception '작성 완료된 리포트에는 AI 초안을 적용할 수 없습니다.'
      using errcode = 'GA003';
  end if;

  select d.id, d.source_revision,
         d.generated_growth_changes, d.generated_observation_summary,
         d.generated_next_support
  into v_draft
  from public.child_growth_report_ai_drafts d
  where d.report_id = p_report_id;

  if not found then
    raise exception '적용할 AI 초안이 없습니다.' using errcode = 'GA006';
  end if;

  -- ★ stale 초안은 적용하지 않는다.
  if v_draft.source_revision is distinct from v_revision then
    raise exception '리포트 근거가 변경되었습니다. AI 초안을 다시 만든 뒤 사용해주세요.'
      using errcode = 'GA005';
  end if;

  -- ★ 리포트 본문 세 칸에 초안을 넣는다. status 는 건드리지 않는다.
  --   completed_by / completed_at / 출결 맥락 / updated_at 은 SET 목록에 없다 —
  --   11A 의 UPDATE trigger 가 채운다.
  update public.child_growth_reports r
  set growth_changes = v_draft.generated_growth_changes,
      observation_summary = v_draft.generated_observation_summary,
      next_support = v_draft.generated_next_support
  where r.id = p_report_id
    and r.updated_at = p_expected_updated_at
  returning r.updated_at into v_new_updated;

  if not found then
    select r.updated_at into v_probe
    from public.child_growth_reports r
    where r.id = p_report_id;

    if not found then
      raise exception '성장 리포트를 찾을 수 없거나 접근 권한이 없습니다.'
        using errcode = 'GA002';
    elsif v_probe is distinct from p_expected_updated_at then
      raise exception '리포트가 이미 변경되었습니다. 화면을 새로고침한 뒤 다시 확인해주세요.'
        using errcode = 'GA004';
    else
      raise exception '이 리포트를 저장할 권한이 없습니다.' using errcode = 'GA002';
    end if;
  end if;

  -- ★ 적용 표시.
  --   SET 목록에는 applied_at 도 applied_by 도 없다 — 두 컬럼은 GRANT 자체가
  --   없어서 여기 넣으면 42501 이다. 초안 문장을 같은 값으로 다시 써서
  --   BEFORE UPDATE trigger 를 깨우기만 한다. 값이 그대로이므로 재생성으로
  --   판정되지 않고, trigger 가 방금 채운 리포트를 읽어 적용 시각을 남긴다.
  update public.child_growth_report_ai_drafts d
  set generated_growth_changes = v_draft.generated_growth_changes,
      generated_observation_summary = v_draft.generated_observation_summary,
      generated_next_support = v_draft.generated_next_support
  where d.id = v_draft.id;

  return jsonb_build_object(
    'report_id', p_report_id,
    'ai_draft_id', v_draft.id,
    'status', v_status,
    'updated_at', v_new_updated
  );
end;
$$;

revoke execute on function public.apply_child_growth_report_ai_draft(
  uuid, timestamptz
) from public, anon;

grant execute on function public.apply_child_growth_report_ai_draft(
  uuid, timestamptz
) to authenticated;


-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.child_growth_reports        컬럼 추가(source_revision) 외 Policy·GRANT·trigger 그대로.
--     ★ 기존 행은 default 1 로 backfill 되고 어떤 값도 다시 쓰이지 않는다.
--     ★ 완료된 리포트는 여전히 UPDATE Policy(USING status='draft')가 막는다.
--   public.child_growth_report_sources 컬럼·Policy·GRANT 그대로. trigger 만 두 개 추가.
--   public.class_session_observations / _domains / _media / _ai_drafts — 그대로.
--   public.class_session_attendance / class_sessions / classes / children — 그대로.
--   storage.buckets / storage.objects  — 그대로. 이 Migration 은 storage 를 건드리지 않는다.
--   private.* 기존 helper              — 그대로 (재정의하지 않는다).
--   20260901160000 의 RPC 두 개        — CREATE OR REPLACE 하지 않는다.
--   drop table / drop column / alter column type / 기존 policy 삭제 — 0건.
