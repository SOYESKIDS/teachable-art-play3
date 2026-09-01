-- =========================================================
-- SERVICE-11A — 원아 성장 리포트 (기간별 · 교사 검토본만 근거로)
-- =========================================================
--
-- 무엇을 만드는가
--   table   public.child_growth_reports
--   table   public.child_growth_report_sources        (근거 스냅샷)
--   trigger private.enforce_growth_report_insert()
--           private.enforce_growth_report_update()
--           private.enforce_growth_report_source_insert()
--   rpc     public.create_or_refresh_child_growth_report()
--           public.save_child_growth_report_atomic()
--
-- ★ 이 시스템은 아동을 평가·진단하지 않는다.
--   score / grade / percentile / diagnosis / risk_level / ranking /
--   competency / standardized_interpretation 같은 컬럼이 없다.
--   성장은 숫자가 아니라 "기간 동안 관찰된 변화의 서술"로만 표현된다.
--   출결 숫자는 맥락(context)이지 평가 지표가 아니다.
--
-- ★ 근거(source of truth)는 교사가 검토·확정한 기록뿐이다.
--     ai.review_status = 'accepted'
--     AND ai.source_observation_updated_at = o.updated_at   (stale 아님)
--   generated 상태의 AI 초안은 근거가 될 수 없다 —
--   교사가 읽지 않은 문장이 성장 리포트의 근거가 되면 이 제품의 전제가 무너진다.
--   원본 관찰기록이 그 뒤 수정된(stale) AI 검토본도 제외한다.
--   다시 생성하고 다시 검토해야 근거 자격이 돌아온다.
--
-- ★ 리포트 근거는 SNAPSHOT 이다.
--   한 번 붙은 근거는 원본 관찰기록 · AI 검토본 · 차시 제목 · 관찰영역 label 이
--   나중에 바뀌어도 조용히 변하지 않는다. 그래서 domain 은 FK 가 아니라
--   label 배열로, 차시 제목도 텍스트로 복사해 둔다.
--
-- ★ 사진은 이 기능에 들어오지 않는다.
--   signed URL 도 storage path 도 저장하지 않는다. 09A 의 활동사진은
--   계속 별도 private 자산으로만 보호된다. 이 Migration 은 media 테이블을 읽지 않는다.
--
-- ★ SERVICE-11A 는 OpenAI 를 호출하지 않는다. 이미 확정된 텍스트만 모은다.
--
-- ★ service_role 을 쓰지 않는다. 두 RPC 모두 SECURITY INVOKER 다.
--   SECURITY DEFINER 는 trigger 세 개뿐이고, 그 이유는 각 함수 위에 적어 두었다.
--
-- 재사용하는 기존 자산 (새로 만들지 않는다)
--   20260813 : private.is_soyes_admin()
--   20260815 : private.has_org_role()
--   20260824 : private.is_class_teacher()          — 반 active 요구 (신규 작성용)
--   20260826 : private.is_assigned_class_teacher() — 보관된 반의 과거 리포트 조회·수정용
--   20260828 : class_sessions_id_org_class_key     — 복합 FK 대상
--   20260828 : public.class_session_attendance     — 출결 맥락 집계 대상
--   20260831094000 : public.class_session_observations
--   20260901090000 : public.class_session_observation_ai_drafts
--
-- 이 Migration 이 건드리지 않는 것
--   attendance / observations / observation_domains / observation ai drafts /
--   observation media / storage bucket / children / class_sessions / classes 의
--   컬럼 · GRANT · Policy · trigger — 전부 그대로. SELECT 만 한다.


-- =========================================================
-- 사용자 정의 SQLSTATE
-- =========================================================
--   GR001 : 입력 형식 오류 (기간 · 길이 · 상태값)
--   GR002 : 리포트/반/원아를 찾을 수 없거나 접근 권한 없음 (RLS 로 0건 포함)
--   GR003 : 이 기간에 근거로 쓸 수 있는 검토 완료 관찰기록이 없다
--   GR004 : 다른 사람이 먼저 저장했다 (stale 낙관적 동시성)
--   GR005 : 작성 완료된 리포트는 변경할 수 없다
--
--   기존 OB001~OB005(08A) · OM006(09A) · AI001~AI005(10A) 와 겹치지 않는다.
--   Server Action 이 이 코드를 보고 사용자 문구를 고른다.
--   DB 내부 메시지를 그대로 화면에 노출하지 않는다.


-- =========================================================
-- 1. public.child_growth_reports
-- =========================================================
-- ★ (child_id, period_start, period_end) 가 UNIQUE 다.
--   같은 원아의 같은 기간 리포트를 두 벌 만들지 않는다.
--   "만들거나 새로고침" RPC 가 이 제약 덕분에 결정적으로 동작한다.

create table if not exists public.child_growth_reports (

  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  class_id uuid not null,
  child_id uuid not null,

  -- 기간. date 그대로 다룬다(시간대 변환 없음 — 20260826 scheduled_date 와 같은 기준).
  period_start date not null,
  period_end date not null,

  title text not null
    constraint child_growth_reports_title_check
    check (char_length(title) <= 200 and btrim(title) <> ''),

  -- ── 교사가 쓰는 세 칸 ────────────────────────────────────────
  -- draft 에서는 비어 있을 수 있고, complete 에서는 셋 다 내용이 있어야 한다.
  growth_changes text
    constraint child_growth_reports_growth_changes_check
    check (
      growth_changes is null
      or (char_length(growth_changes) <= 4000 and btrim(growth_changes) <> '')
    ),

  observation_summary text
    constraint child_growth_reports_observation_summary_check
    check (
      observation_summary is null
      or (char_length(observation_summary) <= 4000 and btrim(observation_summary) <> '')
    ),

  next_support text
    constraint child_growth_reports_next_support_check
    check (
      next_support is null
      or (char_length(next_support) <= 3000 and btrim(next_support) <> '')
    ),
  -- ─────────────────────────────────────────────────────────────

  -- draft    : 작성 중. 근거 새로고침 · 본문 수정 가능.
  -- complete : 교사가 작성을 마쳤다.
  --
  -- ★ complete 는 이 기능에서 "잠금"이다 (08A 관찰기록과 다른 판단).
  --   성장 리포트는 원장이 읽고 향후 학부모에게 공유될 문서라,
  --   완료 표시 이후 조용히 내용이 바뀌면 그 문서를 신뢰할 수 없다.
  --   그래서 아래 UPDATE Policy 의 USING 이 status = 'draft' 를 요구한다 —
  --   완료된 행은 교사에게도 더 이상 보이지 않는(수정 대상이 아닌) 행이 된다.
  --   되돌리기가 필요해지면 별도 단계에서 "재작성 사유"와 함께 설계한다.
  status text not null default 'draft'
    constraint child_growth_reports_status_check
    check (status in ('draft', 'complete')),

  -- ── 출결 맥락 (서버가 계산한다) ───────────────────────────────
  -- ★ Client 가 보내는 값이 아니다. 어느 GRANT 목록에도 없고,
  --   아래 trigger 가 class_session_attendance 에서 직접 집계해 덮어쓴다.
  --   평가 점수가 아니라 "그 기간에 몇 번 참여했는가"라는 사실 맥락이다.
  attendance_present_count integer not null default 0
    constraint child_growth_reports_present_count_check check (attendance_present_count >= 0),
  attendance_absent_count integer not null default 0
    constraint child_growth_reports_absent_count_check check (attendance_absent_count >= 0),
  attendance_late_count integer not null default 0
    constraint child_growth_reports_late_count_check check (attendance_late_count >= 0),
  attendance_left_early_count integer not null default 0
    constraint child_growth_reports_left_early_count_check check (attendance_left_early_count >= 0),
  -- 기간 안에 이 반에서 열린(취소되지 않은) 수업 수. 분모 맥락이다.
  session_count integer not null default 0
    constraint child_growth_reports_session_count_check check (session_count >= 0),
  -- ─────────────────────────────────────────────────────────────

  -- ★ Client 가 보내는 값이 아니다. trigger 가 auth.uid() 로 채운다.
  --   on delete set null 이유는 08A/09A/10A 와 같다 — 계정이 지워져도 기록은 남는다.
  --   비워지는 시점(FK 정리)과 기록되는 시점이 다르다는 것도 같다.
  created_by uuid,
  completed_by uuid,
  completed_at timestamptz,

  created_at timestamptz not null default now(),

  -- ★ 낙관적 동시성 토큰.
  --   공용 private.set_updated_at() 을 쓰지 않는다 — now() 는 transaction timestamp 라
  --   한 transaction 안에서 값이 고정되어 토큰으로 쓸 수 없다(08A/10A 와 같은 이유).
  updated_at timestamptz not null default now(),

  -- ★ (1) 기간이 뒤집히지 않는다.
  constraint child_growth_reports_period_check
    check (period_start <= period_end),

  -- ★ (2) 완료의 조건.
  --   완료 리포트는 세 칸이 모두 채워져 있고, 언제 끝냈는지가 남아 있어야 한다.
  --   completed_by 는 NOT NULL 을 요구하지 않는다 — 10A 에서와 같은 이유로,
  --   훗날 그 교사 계정이 삭제되면 FK 가 이 값을 비우기 때문이다.
  --   요구하면 "과거 리포트가 있다는 이유로 계정을 못 지우는" 상태가 된다.
  constraint child_growth_reports_complete_check
    check (
      status <> 'complete'
      or (
        growth_changes is not null
        and observation_summary is not null
        and next_support is not null
        and completed_at is not null
      )
    ),

  -- ★ (3) 같은 원아 · 같은 기간의 리포트는 하나뿐이다.
  constraint child_growth_reports_child_period_key
    unique (child_id, period_start, period_end),

  -- ★ (4) 반은 반드시 같은 기관의 반이어야 한다.
  constraint child_growth_reports_class_fk
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id)
    on delete restrict,

  -- ★ (5) 원아는 반드시 같은 기관의 원아여야 한다.
  --   (child_id, class_id) 로 걸지 않는 이유는 08A/09A 와 같다 —
  --   그렇게 걸면 원아의 반 이동이 과거 리포트 때문에 막힌다.
  constraint child_growth_reports_child_fk
    foreign key (child_id, organization_id)
    references public.children (id, organization_id)
    on delete restrict,

  constraint child_growth_reports_created_by_fk
    foreign key (created_by) references public.profiles (user_id) on delete set null,

  constraint child_growth_reports_completed_by_fk
    foreign key (completed_by) references public.profiles (user_id) on delete set null
);


-- 조회 index — 실제 화면 질의만 덮는다.
--   (organization_id, status, period_end desc) : 원장 완료 리포트 목록
--   (class_id, period_end desc)                : 교사 반별 목록
--   (child_id, period_end desc)                : 원아별 이력
-- (child_id, period_start, period_end) 조회는 위 UNIQUE index 가 커버한다.
create index if not exists child_growth_reports_org_status_idx
  on public.child_growth_reports (organization_id, status, period_end desc);

create index if not exists child_growth_reports_class_idx
  on public.child_growth_reports (class_id, period_end desc);

create index if not exists child_growth_reports_child_idx
  on public.child_growth_reports (child_id, period_end desc);


-- =========================================================
-- 2. public.child_growth_report_sources — 근거 스냅샷
-- =========================================================
-- ★ 왜 스냅샷인가
--   리포트는 "그때 무엇을 근거로 이렇게 썼는가"를 남기는 문서다.
--   원본 관찰기록의 오타가 나중에 고쳐지거나 차시 제목이 바뀌었다고 해서
--   이미 완료된 리포트의 근거 문장이 함께 바뀌면, 그 리포트가 무엇을 말했는지
--   아무도 되짚을 수 없다. 그래서 텍스트와 label 을 복사해 둔다.
--
-- ★ 관찰영역을 FK 가 아니라 text[] 로 두는 이유가 바로 그것이다.
--   observation_domains.label 은 상품안이 바뀌면 바뀌는 값이다(08A 설계).
--   FK 로 연결하면 스냅샷이 아니게 된다.
--
-- ★ Client 가 채울 수 있는 값은 report_id 와 observation_id 두 개뿐이다.
--   나머지 스냅샷 컬럼은 전부 아래 BEFORE INSERT trigger 가 DB 에서 다시 읽어 채운다.
--   그래서 근거 위조가 구조적으로 불가능하다.

create table if not exists public.child_growth_report_sources (

  id uuid primary key default gen_random_uuid(),

  report_id uuid not null
    references public.child_growth_reports (id)
    on delete cascade,

  -- 부모에서 파생하지만 RLS 와 조회 편의를 위해 복사해 둔다.
  -- trigger 가 부모 값으로 덮어쓰므로 어긋날 수 없다.
  organization_id uuid not null,
  class_id uuid not null,
  child_id uuid not null,

  observation_id uuid not null
    references public.class_session_observations (id)
    on delete restrict,

  ai_draft_id uuid not null
    references public.class_session_observation_ai_drafts (id)
    on delete restrict,

  session_id uuid not null
    references public.class_sessions (id)
    on delete restrict,

  -- ★ 근거 채택 시점의 토큰 두 개.
  --   이 값들이 지금의 원본과 다르면 "그 뒤에 원본이 바뀌었다"는 뜻이고,
  --   화면은 그 사실을 교사에게 보여 준다(리포트를 몰래 바꾸지는 않는다).
  source_observation_updated_at timestamptz not null,
  source_ai_updated_at timestamptz not null,

  -- 수업일. class_sessions.scheduled_date 의 사본이다.
  observed_on date,

  -- 차시 정보 스냅샷
  lesson_title_snapshot text
    constraint child_growth_report_sources_lesson_title_check
    check (lesson_title_snapshot is null or char_length(lesson_title_snapshot) <= 200),

  -- "3주차 2차시" 같은 표기를 그대로 굳혀 둔다
  lesson_order_snapshot text
    constraint child_growth_report_sources_lesson_order_check
    check (lesson_order_snapshot is null or char_length(lesson_order_snapshot) <= 60),

  -- ★ 교사가 검토·확정한 문장. AI 원문(generated_text)은 여기 오지 않는다.
  reviewed_text_snapshot text not null
    constraint child_growth_report_sources_reviewed_text_check
    check (char_length(reviewed_text_snapshot) <= 3000 and btrim(reviewed_text_snapshot) <> ''),

  child_voice_snapshot text
    constraint child_growth_report_sources_child_voice_check
    check (child_voice_snapshot is null or char_length(child_voice_snapshot) <= 1000),

  teacher_note_snapshot text
    constraint child_growth_report_sources_teacher_note_check
    check (teacher_note_snapshot is null or char_length(teacher_note_snapshot) <= 2000),

  -- 관찰영역 label 스냅샷. code 가 아니라 그때 화면에 보이던 이름이다.
  domain_labels_snapshot text[] not null default '{}'::text[]
    constraint child_growth_report_sources_domains_check
    check (
      array_ndims(domain_labels_snapshot) is null
      or (array_ndims(domain_labels_snapshot) = 1 and cardinality(domain_labels_snapshot) <= 20)
    ),

  created_at timestamptz not null default now(),

  -- 한 리포트에 같은 관찰기록이 두 번 붙지 않는다.
  constraint child_growth_report_sources_key
    unique (report_id, observation_id)
);

create index if not exists child_growth_report_sources_report_idx
  on public.child_growth_report_sources (report_id, observed_on);

create index if not exists child_growth_report_sources_child_idx
  on public.child_growth_report_sources (child_id);


-- =========================================================
-- 3. 출결 맥락 집계 helper
-- =========================================================
-- ★ SECURITY DEFINER 인 이유
--   아래 trigger 안에서 class_session_attendance / class_sessions 를 읽어야 하는데
--   두 테이블에 RLS 가 걸려 있다. INVOKER 로 두면 판정에 필요한 행이 가려져
--   출결 맥락이 조용히 0 으로 기록된다(=사실과 다른 문서가 남는다).
--
-- ★ 그럼에도 권한을 넓히지 않는다.
--   돌려주는 것은 숫자 다섯 개뿐이고, 조회 범위가 인자로 받은
--   (반 · 원아 · 기간) 하나로 고정되어 있다. 임의 탐색 통로가 아니다.
--   EXECUTE 는 public / anon / authenticated 모두에서 회수한다 — trigger 전용이다.

create or replace function private.growth_report_attendance_counts(
  p_class_id uuid,
  p_child_id uuid,
  p_period_start date,
  p_period_end date
)
returns table (
  present_count integer,
  absent_count integer,
  late_count integer,
  left_early_count integer,
  session_count integer
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    coalesce(count(*) filter (where a.attendance_status = 'present'), 0)::integer,
    coalesce(count(*) filter (where a.attendance_status = 'absent'), 0)::integer,
    coalesce(count(*) filter (where a.attendance_status = 'late'), 0)::integer,
    coalesce(count(*) filter (where a.attendance_status = 'left_early'), 0)::integer,
    (
      -- 기간 안에 이 반에서 실제로 열린 수업 수 (취소 제외)
      select coalesce(count(*), 0)::integer
      from public.class_sessions s2
      where s2.class_id = p_class_id
        and s2.status <> 'cancelled'
        and s2.scheduled_date between p_period_start and p_period_end
    )
  from public.class_sessions s
  left join public.class_session_attendance a
    on a.class_session_id = s.id
   and a.child_id = p_child_id
  where s.class_id = p_class_id
    and s.status <> 'cancelled'
    and s.scheduled_date between p_period_start and p_period_end;
$$;

revoke execute on function private.growth_report_attendance_counts(uuid, uuid, date, date)
from public, anon, authenticated;


-- =========================================================
-- 4. 리포트 INSERT 의 도메인 조건 (BEFORE INSERT)
-- =========================================================
-- 아래 INSERT Policy 에도 겹치는 조건이 있지만, 이 trigger 가 최종 판정자다.
-- RLS 는 service_role 과 superuser 를 통과시키는 반면 trigger 는 통과시키지 않는다.

create or replace function private.enforce_growth_report_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_org uuid;
  v_class_status text;
  v_counts record;
begin
  -- (1) 반이 실제로 있고 이 기관의 것이어야 한다.
  select c.organization_id, c.status
  into v_class_org, v_class_status
  from public.classes c
  where c.id = new.class_id;

  if not found or v_class_org is distinct from new.organization_id then
    raise exception '반을 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'GR002';
  end if;

  -- (2) 원아가 이 기관 소속이어야 한다.
  --     "지금 이 반 소속"까지는 요구하지 않는다 — 기간 중에 반을 옮긴 원아의
  --     과거 기간 리포트를 담당 교사가 만들 수 있어야 하기 때문이다.
  --     실제 근거는 아래 source trigger 가 반/원아/기간으로 다시 검증한다.
  if not exists (
    select 1 from public.children ch
    where ch.id = new.child_id and ch.organization_id = new.organization_id
  ) then
    raise exception '원아를 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'GR002';
  end if;

  -- (3) 신규 작성은 운영 중인 반에서만 가능하다 (is_class_teacher 와 같은 조건).
  if not private.is_class_teacher(new.class_id) then
    raise exception '이 반의 성장 리포트를 만들 권한이 없습니다.'
      using errcode = 'GR002';
  end if;

  if new.period_start > new.period_end then
    raise exception '리포트 기간이 올바르지 않습니다.' using errcode = 'GR001';
  end if;

  -- (4) 새 리포트는 언제나 작성 중 상태다. 완료 정보는 비운다.
  new.status := 'draft';
  new.completed_by := null;
  new.completed_at := null;

  -- (5) 작성자는 Client 가 정하지 않는다.
  new.created_by := auth.uid();
  new.created_at := pg_catalog.clock_timestamp();
  new.updated_at := pg_catalog.clock_timestamp();

  -- (6) ★ 출결 맥락은 서버가 계산한다. Client 값은 무조건 버린다.
  select * into v_counts
  from private.growth_report_attendance_counts(
    new.class_id, new.child_id, new.period_start, new.period_end
  );

  new.attendance_present_count := coalesce(v_counts.present_count, 0);
  new.attendance_absent_count := coalesce(v_counts.absent_count, 0);
  new.attendance_late_count := coalesce(v_counts.late_count, 0);
  new.attendance_left_early_count := coalesce(v_counts.left_early_count, 0);
  new.session_count := coalesce(v_counts.session_count, 0);

  return new;
end;
$$;

revoke execute on function private.enforce_growth_report_insert()
from public, anon, authenticated;

drop trigger if exists trg_child_growth_reports_insert_check
on public.child_growth_reports;

create trigger trg_child_growth_reports_insert_check
before insert on public.child_growth_reports
for each row
execute function private.enforce_growth_report_insert();


-- =========================================================
-- 5. 리포트 UPDATE 의 도메인 조건 (BEFORE UPDATE)
-- =========================================================
-- 이 테이블의 UPDATE 는 세 가지다.
--   본문 저장 / 완료  : 교사가 쓴다
--   근거 새로고침     : RPC 가 updated_at 만 올린다
--   FK 정리           : created_by / completed_by 를 NULL 로 비우는 것 외에 아무것도 안 바뀐다
-- 앞의 둘은 사람이 하는 쓰기이고, 세 번째는 PostgreSQL 의 참조 무결성 동작이다.

create or replace function private.enforce_growth_report_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fk_cleanup boolean;
  v_counts record;
begin
  -- ---------------------------------------------------------------
  -- (0) ★ metadata-only FK cleanup 인가?
  --
  --   created_by / completed_by 는 profiles 에 on delete set null 로 매달려 있다.
  --   교사 계정이 삭제되면 PostgreSQL 이 이 행에 대해 UPDATE ... SET x = NULL 을
  --   직접 실행하고, 그 UPDATE 도 이 trigger 를 발동시킨다.
  --   일반 경로로 흘려보내면 auth.uid() 로 되살아나거나, 완료 리포트라는 이유로
  --   거부되어 계정 삭제 자체가 실패한다(10A 에서 실제로 겪은 문제).
  --
  --   ★ 우회로가 되지 않는 이유
  --     ① 허용하는 변화가 "non-null → NULL" 뿐이다.
  --     ② 나머지 논리 컬럼이 하나라도 다르면 아래 일반 경로로 내려간다.
  --     ③ created_by / completed_by 는 INSERT/UPDATE GRANT 에 없어서
  --        authenticated 가 SET 목록에 넣는 것 자체가 42501 이다.
  -- ---------------------------------------------------------------
  v_fk_cleanup :=
    (new.created_by is not distinct from old.created_by
      or (old.created_by is not null and new.created_by is null))
    and (new.completed_by is not distinct from old.completed_by
      or (old.completed_by is not null and new.completed_by is null))
    and (new.created_by is distinct from old.created_by
      or new.completed_by is distinct from old.completed_by)
    and new.id is not distinct from old.id
    and new.organization_id is not distinct from old.organization_id
    and new.class_id is not distinct from old.class_id
    and new.child_id is not distinct from old.child_id
    and new.period_start is not distinct from old.period_start
    and new.period_end is not distinct from old.period_end
    and new.title is not distinct from old.title
    and new.growth_changes is not distinct from old.growth_changes
    and new.observation_summary is not distinct from old.observation_summary
    and new.next_support is not distinct from old.next_support
    and new.status is not distinct from old.status
    and new.completed_at is not distinct from old.completed_at
    and new.created_at is not distinct from old.created_at
    and new.attendance_present_count is not distinct from old.attendance_present_count
    and new.attendance_absent_count is not distinct from old.attendance_absent_count
    and new.attendance_late_count is not distinct from old.attendance_late_count
    and new.attendance_left_early_count is not distinct from old.attendance_left_early_count
    and new.session_count is not distinct from old.session_count;

  if v_fk_cleanup then
    new.updated_at := greatest(
      pg_catalog.clock_timestamp(),
      old.updated_at + interval '1 microsecond'
    );
    return new;
  end if;

  -- (1) ★ 완료된 리포트는 바뀌지 않는다.
  --     UPDATE Policy 의 USING 이 이미 status = 'draft' 를 요구하지만,
  --     trigger 는 service_role · 직접 SQL 까지 덮는 최종 방어선이다.
  if old.status = 'complete' then
    raise exception '작성 완료된 성장 리포트는 수정할 수 없습니다.'
      using errcode = 'GR005';
  end if;

  -- (2) 구조 컬럼은 불변이다. 리포트를 다른 기관·반·원아·기간으로 옮길 수 없다.
  if new.organization_id is distinct from old.organization_id
    or new.class_id is distinct from old.class_id
    or new.child_id is distinct from old.child_id
    or new.period_start is distinct from old.period_start
    or new.period_end is distinct from old.period_end
  then
    raise exception '성장 리포트의 기관·반·원아·기간은 변경할 수 없습니다.'
      using errcode = 'GR002';
  end if;

  -- (3) 완료 정보는 Client 가 정하지 않는다.
  if new.status = 'complete' then
    new.completed_by := auth.uid();
    new.completed_at := pg_catalog.clock_timestamp();
  else
    new.completed_by := null;
    new.completed_at := null;
  end if;

  new.created_by := old.created_by;
  new.created_at := old.created_at;

  -- (4) ★ 출결 맥락은 매번 서버가 다시 계산한다.
  --     draft 인 동안에는 현실을 따라가고, 완료되는 순간 그대로 굳는다
  --     (완료 뒤에는 이 trigger 에 도달하는 UPDATE 자체가 없다).
  --     Client 가 보낸 숫자는 어느 경로로도 남지 않는다.
  select * into v_counts
  from private.growth_report_attendance_counts(
    new.class_id, new.child_id, new.period_start, new.period_end
  );

  new.attendance_present_count := coalesce(v_counts.present_count, 0);
  new.attendance_absent_count := coalesce(v_counts.absent_count, 0);
  new.attendance_late_count := coalesce(v_counts.late_count, 0);
  new.attendance_left_early_count := coalesce(v_counts.left_early_count, 0);
  new.session_count := coalesce(v_counts.session_count, 0);

  -- (5) ★ 단조 증가 토큰. 08A/10A 와 같은 방식이다.
  new.updated_at := greatest(
    pg_catalog.clock_timestamp(),
    old.updated_at + interval '1 microsecond'
  );

  return new;
end;
$$;

revoke execute on function private.enforce_growth_report_update()
from public, anon, authenticated;

drop trigger if exists trg_child_growth_reports_update_check
on public.child_growth_reports;

create trigger trg_child_growth_reports_update_check
before update on public.child_growth_reports
for each row
execute function private.enforce_growth_report_update();


-- =========================================================
-- 6. 근거 스냅샷 INSERT 의 도메인 조건 (BEFORE INSERT)
-- =========================================================
-- ★ 이 trigger 가 SERVICE-11A 의 핵심 방어선이다.
--
--   Client 가 채울 수 있는 값은 report_id 와 observation_id 두 개뿐이고,
--   나머지 스냅샷 컬럼은 전부 여기서 DB 를 다시 읽어 덮어쓴다.
--   그래서 "AI 가 이렇게 썼다"는 문장을 위조해 리포트에 넣을 수 없다.
--
--   동시에 근거 자격을 여기서 최종 판정한다.
--     ① 리포트가 작성 중이어야 한다
--     ② 관찰기록이 그 리포트의 기관·반·원아의 것이어야 한다
--     ③ 수업일이 리포트 기간 안이어야 한다
--     ④ AI 검토본이 accepted 여야 한다        (generated 만으로는 근거가 아니다)
--     ⑤ AI 검토본이 stale 이 아니어야 한다     (원본이 그 뒤 바뀌지 않았다)
--     ⑥ 검토 문장이 실제로 있어야 한다

create or replace function private.enforce_growth_report_source_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rep record;
  v_obs record;
  v_ai record;
  v_session record;
  v_lesson record;
  v_order text;
  v_labels text[];
begin
  -- (1) 부모 리포트
  select r.id, r.organization_id, r.class_id, r.child_id,
         r.period_start, r.period_end, r.status
  into v_rep
  from public.child_growth_reports r
  where r.id = new.report_id;

  if not found then
    raise exception '성장 리포트를 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'GR002';
  end if;

  if v_rep.status <> 'draft' then
    raise exception '작성 완료된 성장 리포트의 근거는 변경할 수 없습니다.'
      using errcode = 'GR005';
  end if;

  -- (2) 관찰기록 — 구조 값의 유일한 출처
  select o.id, o.organization_id, o.class_session_id, o.class_id, o.child_id,
         o.child_voice, o.teacher_note, o.record_status, o.updated_at
  into v_obs
  from public.class_session_observations o
  where o.id = new.observation_id;

  if not found then
    raise exception '관찰기록을 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'GR002';
  end if;

  if v_obs.organization_id is distinct from v_rep.organization_id
    or v_obs.class_id is distinct from v_rep.class_id
    or v_obs.child_id is distinct from v_rep.child_id
  then
    raise exception '이 리포트의 기관·반·원아에 속한 관찰기록만 근거가 될 수 있습니다.'
      using errcode = 'GR002';
  end if;

  -- (3) 수업 — 기간 검사
  select s.id, s.scheduled_date, s.lesson_id, s.status
  into v_session
  from public.class_sessions s
  where s.id = v_obs.class_session_id;

  if not found then
    raise exception '수업을 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'GR002';
  end if;

  if v_session.scheduled_date is null
     or v_session.scheduled_date < v_rep.period_start
     or v_session.scheduled_date > v_rep.period_end
  then
    raise exception '리포트 기간 안의 수업 기록만 근거가 될 수 있습니다.'
      using errcode = 'GR002';
  end if;

  -- (4) ★ AI 검토본 — accepted + non-stale 만 근거가 된다
  select d.id, d.review_status, d.reviewed_text,
         d.source_observation_updated_at, d.updated_at
  into v_ai
  from public.class_session_observation_ai_drafts d
  where d.observation_id = v_obs.id;

  if not found then
    raise exception '교사가 검토 완료한 기록만 성장 리포트의 근거가 될 수 있습니다.'
      using errcode = 'GR003';
  end if;

  if v_ai.review_status <> 'accepted' then
    raise exception '교사가 검토 완료한 기록만 성장 리포트의 근거가 될 수 있습니다.'
      using errcode = 'GR003';
  end if;

  if v_ai.source_observation_updated_at is distinct from v_obs.updated_at then
    raise exception '원본 관찰기록이 변경된 기록은 근거가 될 수 없습니다. 다시 검토한 뒤 사용해주세요.'
      using errcode = 'GR003';
  end if;

  if v_ai.reviewed_text is null or btrim(v_ai.reviewed_text) = '' then
    raise exception '검토 완료된 문장이 비어 있어 근거로 쓸 수 없습니다.'
      using errcode = 'GR003';
  end if;

  -- (5) 차시 표기 스냅샷
  select l.week_no, l.session_no, l.title
  into v_lesson
  from public.curriculum_lessons l
  where l.id = v_session.lesson_id;

  if found and v_lesson.week_no is not null and v_lesson.session_no is not null then
    v_order := v_lesson.week_no::text || '주차 ' || v_lesson.session_no::text || '차시';
  else
    v_order := null;
  end if;

  -- (6) 관찰영역 label 스냅샷 (code 가 아니라 그때 보이던 이름)
  select coalesce(array_agg(d2.label order by d2.sort_order, d2.code), '{}'::text[])
  into v_labels
  from public.class_session_observation_domains l2
  join public.observation_domains d2 on d2.code = l2.domain_code
  where l2.observation_id = v_obs.id;

  -- (7) ★ 모든 스냅샷 컬럼을 서버 값으로 덮어쓴다. Client 값은 남지 않는다.
  new.organization_id := v_rep.organization_id;
  new.class_id := v_rep.class_id;
  new.child_id := v_rep.child_id;
  new.session_id := v_session.id;
  new.ai_draft_id := v_ai.id;

  new.source_observation_updated_at := v_obs.updated_at;
  new.source_ai_updated_at := v_ai.updated_at;

  new.observed_on := v_session.scheduled_date;
  new.lesson_title_snapshot := left(v_lesson.title, 200);
  new.lesson_order_snapshot := v_order;

  new.reviewed_text_snapshot := v_ai.reviewed_text;
  new.child_voice_snapshot := v_obs.child_voice;
  new.teacher_note_snapshot := v_obs.teacher_note;
  new.domain_labels_snapshot := coalesce(v_labels, '{}'::text[]);

  new.created_at := pg_catalog.clock_timestamp();

  return new;
end;
$$;

revoke execute on function private.enforce_growth_report_source_insert()
from public, anon, authenticated;

drop trigger if exists trg_child_growth_report_sources_insert_check
on public.child_growth_report_sources;

create trigger trg_child_growth_report_sources_insert_check
before insert on public.child_growth_report_sources
for each row
execute function private.enforce_growth_report_source_insert();


-- =========================================================
-- 7. GRANT
-- =========================================================
-- ★ DELETE 를 주지 않는다 (리포트). 성장 리포트는 지우지 않는다.
-- ★ 아래 컬럼은 어느 목록에도 없다 — 전부 trigger 가 채운다.
--   created_by / completed_by / completed_at / created_at / updated_at /
--   attendance_*_count / session_count / status(INSERT 시)

revoke all on public.child_growth_reports from anon, authenticated;

grant select on public.child_growth_reports to authenticated;

grant insert (
  organization_id,
  class_id,
  child_id,
  period_start,
  period_end,
  title
) on public.child_growth_reports to authenticated;

grant update (
  title,
  growth_changes,
  observation_summary,
  next_support,
  status
) on public.child_growth_reports to authenticated;


-- 근거 스냅샷 — Client 가 쓸 수 있는 컬럼은 두 개뿐이다.
revoke all on public.child_growth_report_sources from anon, authenticated;

grant select on public.child_growth_report_sources to authenticated;

grant insert (report_id, observation_id)
on public.child_growth_report_sources to authenticated;

-- ★ 이 테이블에만 DELETE 를 준다.
--   근거 새로고침이 replace-all 이기 때문이다(08A 의 관찰영역 연결 테이블과 같은 판단).
--   "일어난 일의 기록"이 아니라 "지금 이 리포트가 무엇을 근거로 삼는가"라는
--   선택이므로, 다시 고를 수 없으면 리포트를 영영 고칠 수 없게 된다.
--   범위는 아래 Policy 가 "작성 중인 자기 반 리포트"로 좁힌다.
grant delete on public.child_growth_report_sources to authenticated;


-- =========================================================
-- 8. RLS — public.child_growth_reports
-- =========================================================
-- anon        : 0건
-- SOYES 운영자 : 조회만
-- 원장        : 자기 활성 기관의 **완료된** 리포트만 조회. write 분기 없음
-- 교사        : 배정된 반의 리포트 조회, 운영 중인 반에서 작성, 작성 중인 리포트만 수정

alter table public.child_growth_reports enable row level security;


-- ★ 원장에게 draft 를 보여주지 않는다.
--   작성 중인 리포트는 교사가 아직 다듬는 문서다. 그것이 원장 화면에 뜨면
--   미완성 문장이 기관의 공식 기록처럼 읽힌다(10A 에서 generated 초안을
--   원장에게 보여주지 않기로 한 것과 같은 판단).
--
-- ★ 교사 분기는 is_assigned_class_teacher 다.
--   반이 보관되거나 원아가 다른 반으로 옮겨간 뒤에도 과거 리포트는 계속 보인다.
--   대신 class_teachers 배정이 제거되면 접근도 함께 끊긴다.
drop policy if exists "growth reports readable by org staff and soyes admin"
on public.child_growth_reports;

create policy "growth reports readable by org staff and soyes admin"
  on public.child_growth_reports
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or (
      private.has_org_role(organization_id, array['director'])
      and status = 'complete'
    )
    or private.is_assigned_class_teacher(class_id)
  );


-- ★ 신규 작성 = 담당 교사 + 운영 중인 반
drop policy if exists "growth reports insert by assigned teacher"
on public.child_growth_reports;

create policy "growth reports insert by assigned teacher"
  on public.child_growth_reports
  for insert
  to authenticated
  with check (private.is_class_teacher(class_id));


-- ★ 수정 = 배정된 교사 + **작성 중인 리포트만**
--
--   USING 에 status = 'draft' 를 넣는 것이 완료 후 불변성의 핵심이다.
--   완료된 행은 UPDATE 대상에서 사라지므로, 교사에게도 원장에게도 수정되지 않는다.
--   WITH CHECK 에 status 조건을 넣지 않는 이유: 그러면 draft → complete 전이 자체가
--   막힌다. "고를 수 있는 행"은 draft 뿐이고, "고친 결과"는 complete 여도 된다.
drop policy if exists "growth reports update by assigned teacher"
on public.child_growth_reports;

create policy "growth reports update by assigned teacher"
  on public.child_growth_reports
  for update
  to authenticated
  using (
    private.is_assigned_class_teacher(class_id)
    and status = 'draft'
  )
  with check (
    private.is_assigned_class_teacher(class_id)
  );


-- DELETE Policy 없음 — 성장 리포트는 삭제하지 않는다.


-- =========================================================
-- 9. RLS — public.child_growth_report_sources
-- =========================================================
alter table public.child_growth_report_sources enable row level security;


-- 부모 리포트를 볼 수 있는 사람이 근거도 본다. 규칙을 한 곳에만 두기 위해
-- 부모 Policy 를 EXISTS 로 다시 태운다(08A 연결 테이블과 같은 방식).
drop policy if exists "growth report sources readable by org staff and soyes admin"
on public.child_growth_report_sources;

create policy "growth report sources readable by org staff and soyes admin"
  on public.child_growth_report_sources
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.child_growth_reports r
      where r.id = child_growth_report_sources.report_id
        and (
          (select private.is_soyes_admin())
          or (
            private.has_org_role(r.organization_id, array['director'])
            and r.status = 'complete'
          )
          or private.is_assigned_class_teacher(r.class_id)
        )
    )
  );


-- ★ 근거를 붙이고 떼는 것은 "작성 중인 자기 반 리포트"에서만 가능하다.
drop policy if exists "growth report sources insert by assigned teacher"
on public.child_growth_report_sources;

create policy "growth report sources insert by assigned teacher"
  on public.child_growth_report_sources
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.child_growth_reports r
      where r.id = child_growth_report_sources.report_id
        and r.status = 'draft'
        and private.is_assigned_class_teacher(r.class_id)
    )
  );


drop policy if exists "growth report sources delete by assigned teacher"
on public.child_growth_report_sources;

create policy "growth report sources delete by assigned teacher"
  on public.child_growth_report_sources
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.child_growth_reports r
      where r.id = child_growth_report_sources.report_id
        and r.status = 'draft'
        and private.is_assigned_class_teacher(r.class_id)
    )
  );


-- UPDATE Policy 없음 — 스냅샷은 만들어지거나 지워질 뿐 수정되지 않는다.
-- (UPDATE GRANT 도 주지 않았다)


-- =========================================================
-- 10. RPC — 리포트 생성 / 근거 새로고침
-- =========================================================
-- ★ SECURITY INVOKER 다. 위 Policy · GRANT · trigger 가 그대로 최종 방어선이다.
--
-- ★ Client 가 근거 id 목록을 보내지 않는다.
--   어떤 관찰기록이 자격을 갖췄는지는 이 함수가 DB 에서 직접 고른다.
--   Client 가 고른 id 를 권한 근거로 삼는 경로 자체를 만들지 않는다.
--
-- ★ 근거가 하나도 없으면 리포트를 만들지 않는다 (GR003).
--   근거 없는 성장 리포트는 관찰 기반 문서가 아니라 그냥 작문이다.

create or replace function public.create_or_refresh_child_growth_report(
  p_class_id uuid,
  p_child_id uuid,
  p_period_start date,
  p_period_end date,
  p_title text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- 한 번의 새로고침이 붙일 수 있는 근거 수 상한.
  -- 한 학기 주 1회 수업이면 20건 안쪽이라 50 은 정상 운영을 막지 않으면서
  -- 잘못된 대량 요청은 걸러낸다.
  c_max_sources constant integer := 50;

  v_org uuid;
  v_class_status text;
  v_title text;
  v_report_id uuid;
  v_status text;
  v_created boolean := false;
  v_eligible integer := 0;
  v_attached integer := 0;
  v_updated_at timestamptz;
begin
  -- ---------------------------------------------------------
  -- 1. 입력 검증
  -- ---------------------------------------------------------
  if p_class_id is null or p_child_id is null
     or p_period_start is null or p_period_end is null then
    raise exception '리포트 생성에 필요한 값이 없습니다.' using errcode = 'GR001';
  end if;

  if p_period_start > p_period_end then
    raise exception '리포트 기간이 올바르지 않습니다.' using errcode = 'GR001';
  end if;

  -- 기간 상한. 한 리포트가 다루는 범위를 상식선으로 묶는다.
  if p_period_end - p_period_start > 366 then
    raise exception '리포트 기간은 1년 이내로 지정해주세요.' using errcode = 'GR001';
  end if;

  -- ---------------------------------------------------------
  -- 2. 반 조회 — organization_id 의 유일한 출처
  --
  -- SECURITY INVOKER 이므로 classes SELECT Policy 가 그대로 적용된다.
  -- 다른 기관·담당하지 않는 반이면 0건이 되어 GR002 로 끝난다.
  -- ---------------------------------------------------------
  select c.organization_id, c.status
  into v_org, v_class_status
  from public.classes c
  where c.id = p_class_id;

  if not found then
    raise exception '반을 찾을 수 없거나 접근 권한이 없습니다.' using errcode = 'GR002';
  end if;

  -- ---------------------------------------------------------
  -- 3. 리포트 확보 (없으면 만들고, 있으면 그대로 쓴다)
  -- ---------------------------------------------------------
  select r.id, r.status
  into v_report_id, v_status
  from public.child_growth_reports r
  where r.child_id = p_child_id
    and r.period_start = p_period_start
    and r.period_end = p_period_end;

  if found and v_status = 'complete' then
    raise exception '작성 완료된 성장 리포트의 근거는 변경할 수 없습니다.'
      using errcode = 'GR005';
  end if;

  if not found then
    v_title := nullif(btrim(coalesce(p_title, '')), '');

    if v_title is null then
      v_title := to_char(p_period_start, 'YYYY.MM.DD')
                 || ' ~ ' || to_char(p_period_end, 'YYYY.MM.DD') || ' 성장 리포트';
    end if;

    if char_length(v_title) > 200 then
      raise exception '리포트 제목은 200자 이내로 입력해주세요.' using errcode = 'GR001';
    end if;

    -- organization_id 는 2단계에서 읽은 반 행에서 만든다. 인자가 아니다.
    -- created_by / status / 출결 맥락은 INSERT trigger 가 채운다.
    insert into public.child_growth_reports (
      organization_id, class_id, child_id, period_start, period_end, title
    )
    values (v_org, p_class_id, p_child_id, p_period_start, p_period_end, v_title)
    returning id into v_report_id;

    v_created := true;
  end if;

  -- ---------------------------------------------------------
  -- 4. ★ 자격 있는 근거를 이 함수가 직접 고른다
  --
  --   조건
  --     같은 기관 · 반 · 원아의 관찰기록
  --     수업일이 기간 안 · 수업이 취소되지 않음
  --     AI 검토본이 accepted
  --     AI 검토본이 stale 아님 (source token = 관찰기록의 현재 updated_at)
  --     검토 문장이 비어 있지 않음
  --
  --   RLS 가 그대로 적용되므로, 담당하지 않는 반의 기록은 애초에 보이지 않는다.
  -- ---------------------------------------------------------
  --   temp table 을 쓰지 않는다 — 같은 조건을 두 번 평가하는 편이
  --   함수 안에서 임시 객체의 수명을 관리하는 것보다 단순하고 안전하다.
  select count(*)
  into v_eligible
  from (
    select o.id
    from public.class_session_observations o
    join public.class_sessions s
      on s.id = o.class_session_id
    join public.class_session_observation_ai_drafts d
      on d.observation_id = o.id
    where o.organization_id = v_org
      and o.class_id = p_class_id
      and o.child_id = p_child_id
      and s.status <> 'cancelled'
      and s.scheduled_date is not null
      and s.scheduled_date between p_period_start and p_period_end
      and d.review_status = 'accepted'
      and d.source_observation_updated_at = o.updated_at
      and d.reviewed_text is not null
      and btrim(d.reviewed_text) <> ''
    order by s.scheduled_date, o.id
    limit c_max_sources
  ) eligible;

  if v_eligible = 0 then
    -- 방금 만든 리포트라면 만들지 않은 것으로 되돌린다.
    -- (EXCEPTION 을 던지면 이 함수 호출 전체가 rollback 되므로 자동으로 사라진다)
    raise exception '이 기간에 검토 완료된 관찰기록이 없어 성장 리포트를 만들 수 없습니다.'
      using errcode = 'GR003';
  end if;

  -- ---------------------------------------------------------
  -- 5. 근거 replace-all
  --
  --   스냅샷 컬럼은 전부 source INSERT trigger 가 채운다.
  --   여기서 보내는 것은 report_id 와 observation_id 두 개뿐이다.
  -- ---------------------------------------------------------
  delete from public.child_growth_report_sources
  where report_id = v_report_id;

  insert into public.child_growth_report_sources (report_id, observation_id)
  select v_report_id, eligible.id
  from (
    select o.id, s.scheduled_date
    from public.class_session_observations o
    join public.class_sessions s
      on s.id = o.class_session_id
    join public.class_session_observation_ai_drafts d
      on d.observation_id = o.id
    where o.organization_id = v_org
      and o.class_id = p_class_id
      and o.child_id = p_child_id
      and s.status <> 'cancelled'
      and s.scheduled_date is not null
      and s.scheduled_date between p_period_start and p_period_end
      and d.review_status = 'accepted'
      and d.source_observation_updated_at = o.updated_at
      and d.reviewed_text is not null
      and btrim(d.reviewed_text) <> ''
    order by s.scheduled_date, o.id
    limit c_max_sources
  ) eligible;

  get diagnostics v_attached = row_count;

  -- ---------------------------------------------------------
  -- 6. 리포트 자체를 한 번 건드려 토큰과 출결 맥락을 갱신한다
  --
  --   ★ 교사가 쓴 본문은 건드리지 않는다.
  --     title 을 자기 값으로 다시 쓰는 UPDATE 라 내용은 그대로이고,
  --     UPDATE trigger 가 출결 맥락을 다시 계산하고 updated_at 을 올린다.
  -- ---------------------------------------------------------
  update public.child_growth_reports r
  set title = r.title
  where r.id = v_report_id
  returning r.updated_at into v_updated_at;

  if not found then
    raise exception '성장 리포트를 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'GR002';
  end if;

  return jsonb_build_object(
    'report_id', v_report_id,
    'created', v_created,
    'eligible_count', v_eligible,
    'source_count', v_attached,
    'updated_at', v_updated_at
  );
end;
$$;

revoke execute on function public.create_or_refresh_child_growth_report(
  uuid, uuid, date, date, text
) from public, anon;

grant execute on function public.create_or_refresh_child_growth_report(
  uuid, uuid, date, date, text
) to authenticated;


-- =========================================================
-- 11. RPC — 리포트 본문 저장 / 완료
-- =========================================================
-- ★ 낙관적 동시성.
--   p_expected_updated_at 은 화면이 받은 updated_at 문자열 그대로다.
--   UPDATE 문의 WHERE 에 그 조건을 넣어, 두 사람이 같은 리포트를 저장할 때
--   뒤에 온 쪽이 GR004 로 끝나게 한다. 08A/10A 와 같은 구조다.

create or replace function public.save_child_growth_report_atomic(
  p_report_id uuid,
  p_title text,
  p_growth_changes text,
  p_observation_summary text,
  p_next_support text,
  p_status text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_max_title constant integer := 200;
  c_max_growth constant integer := 4000;
  c_max_summary constant integer := 4000;
  c_max_support constant integer := 3000;

  v_title text;
  v_growth text;
  v_summary text;
  v_support text;
  v_status text;

  v_old_status text;
  v_probe timestamptz;
  v_new_updated timestamptz;
begin
  -- ---------------------------------------------------------
  -- 1. 입력 검증
  -- ---------------------------------------------------------
  if p_report_id is null or p_expected_updated_at is null then
    raise exception '저장에 필요한 값이 없습니다.' using errcode = 'GR001';
  end if;

  v_status := btrim(coalesce(p_status, ''));

  if v_status not in ('draft', 'complete') then
    raise exception '작성 상태 값이 올바르지 않습니다.' using errcode = 'GR001';
  end if;

  -- 공백만 있는 값은 "내용 없음"으로 정규화한다. 컬럼 CHECK 와 같은 규칙이다.
  v_title := nullif(btrim(coalesce(p_title, '')), '');
  v_growth := nullif(btrim(coalesce(p_growth_changes, '')), '');
  v_summary := nullif(btrim(coalesce(p_observation_summary, '')), '');
  v_support := nullif(btrim(coalesce(p_next_support, '')), '');

  if v_title is null then
    raise exception '리포트 제목을 입력해주세요.' using errcode = 'GR001';
  end if;

  if char_length(v_title) > c_max_title then
    raise exception '리포트 제목은 %자 이내로 입력해주세요.', c_max_title using errcode = 'GR001';
  end if;

  if v_growth is not null and char_length(v_growth) > c_max_growth then
    raise exception '성장 변화는 %자 이내로 입력해주세요.', c_max_growth using errcode = 'GR001';
  end if;

  if v_summary is not null and char_length(v_summary) > c_max_summary then
    raise exception '관찰 요약은 %자 이내로 입력해주세요.', c_max_summary using errcode = 'GR001';
  end if;

  if v_support is not null and char_length(v_support) > c_max_support then
    raise exception '다음 지원 방향은 %자 이내로 입력해주세요.', c_max_support using errcode = 'GR001';
  end if;

  -- ★ 완료는 세 칸이 모두 채워져 있어야 한다. 컬럼 CHECK 가 최종 방어선이지만
  --   여기서 먼저 끝내야 Client 가 매핑 가능한 코드(GR001)를 받는다.
  if v_status = 'complete'
     and (v_growth is null or v_summary is null or v_support is null) then
    raise exception '작성 완료로 저장하려면 성장 변화 · 관찰 요약 · 다음 지원 방향을 모두 입력해야 합니다.'
      using errcode = 'GR001';
  end if;

  -- ---------------------------------------------------------
  -- 2. 대상 확인 (참고 조회 — 안전성은 3단계 UPDATE 의 WHERE 가 보장한다)
  -- ---------------------------------------------------------
  select r.status into v_old_status
  from public.child_growth_reports r
  where r.id = p_report_id;

  if not found then
    raise exception '성장 리포트를 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'GR002';
  end if;

  if v_old_status = 'complete' then
    raise exception '작성 완료된 성장 리포트는 수정할 수 없습니다.'
      using errcode = 'GR005';
  end if;

  -- ---------------------------------------------------------
  -- 3. 저장
  --
  --   completed_by / completed_at / 출결 맥락 / updated_at 은 SET 목록에 없다.
  --   전부 UPDATE trigger 가 채운다.
  -- ---------------------------------------------------------
  update public.child_growth_reports r
  set title = v_title,
      growth_changes = v_growth,
      observation_summary = v_summary,
      next_support = v_support,
      status = v_status
  where r.id = p_report_id
    and r.updated_at = p_expected_updated_at
  returning r.updated_at into v_new_updated;

  if not found then
    -- 0행인 이유를 가려낸다.
    select r.updated_at into v_probe
    from public.child_growth_reports r
    where r.id = p_report_id;

    if not found then
      raise exception '성장 리포트를 찾을 수 없거나 접근 권한이 없습니다.'
        using errcode = 'GR002';
    elsif v_probe is distinct from p_expected_updated_at then
      raise exception '리포트가 이미 변경되었습니다. 화면을 새로고침한 뒤 다시 확인해주세요.'
        using errcode = 'GR004';
    else
      -- 시각도 같고 완료 상태도 아닌데 UPDATE 가 걸리지 않았다 = UPDATE Policy 거부
      raise exception '이 성장 리포트를 저장할 권한이 없습니다.'
        using errcode = 'GR002';
    end if;
  end if;

  return jsonb_build_object(
    'report_id', p_report_id,
    'status', v_status,
    'updated_at', v_new_updated
  );
end;
$$;

revoke execute on function public.save_child_growth_report_atomic(
  uuid, text, text, text, text, text, timestamptz
) from public, anon;

grant execute on function public.save_child_growth_report_atomic(
  uuid, text, text, text, text, text, timestamptz
) to authenticated;


-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.class_session_attendance             컬럼·GRANT·Policy·trigger — 그대로 (SELECT 만).
--   public.class_session_observations           그대로 (SELECT 만).
--   public.class_session_observation_domains    그대로 (SELECT 만).
--   public.class_session_observation_ai_drafts  그대로 (SELECT 만).
--   public.class_session_observation_media      그대로 — 읽지도 않는다.
--   public.observation_domains                  그대로 (SELECT 만).
--   public.class_sessions / classes / children / curriculum_lessons / profiles — 그대로.
--   storage.buckets / storage.objects           그대로 — 이 Migration 은 storage 를 건드리지 않는다.
--   private.* 기존 helper                       그대로 (재정의하지 않는다).
--   drop table / drop column / alter column / 기존 policy 삭제 — 0건.
