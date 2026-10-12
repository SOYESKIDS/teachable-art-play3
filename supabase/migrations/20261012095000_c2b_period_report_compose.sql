-- =====================================================================
-- C2b — 월간 · 학기 리포트 구성 · 작성 경로 (사용자 지시 항목 1)
-- ---------------------------------------------------------------------
-- 배경: M1 의 `public.reports` 는 이미 report_type in ('weekly','monthly',
--       'semester') 를 갖고 있지만, M4 의 `private.enforce_report_write()` 는
--       INSERT 를 weekly 로만 제한했다 ("Monthly(P1) · Semester(P2) 작성
--       경로는 아직 없다"). 이 migration 이 그 경로를 연다. 새 리포트 테이블을
--       만들지 않는다.
--
-- 설계 원칙 (기존 M4 와 동일하게 유지한다)
--   · trigger 가 최종 판정자다. RLS 는 service_role 을 막지 못하지만 trigger 는
--     막는다. 그래서 허용 조건을 trigger 에 둔다.
--   · 공개 RPC 는 되도록 SECURITY INVOKER 로 두어 RLS 가 그대로 적용되게 한다.
--     `private.*` helper 만 DEFINER 로 두고 search_path 를 비운다.
--   · 낙관적 동시성은 `updated_at` 토큰으로 한다 (clock_timestamp 기준).
--
-- ★ 월간 · 학기는 **없는 기록을 만들지 않는다**.
--   본문은 교사가 쓰고, 근거는 **이미 완료된 주간 리포트**에서만 모은다.
--   평균 · 성장률 · 서열을 계산하지 않는다.
--
-- ★ 모은 주간 revision 을 행으로 남긴다 (`report_period_sources`).
--   주간 기록이 나중에 정정되면 월간 본문을 조용히 바꾸지 않고, 어떤 revision 을
--   모았는지 비교해 "재검토 필요"로 알린다.
--
-- ★ 기능 출시 게이트를 지난다.
--   `platform_capabilities` 에 monthly_report(P1) · semester_report(P2) 가
--   미출시로 등록되어 있다. 계약에 기능이 있어도 출시 전에는 만들 수 없다.
--   출시는 HQ Admin 이 `public.set_capability_release()` 로 켠다 (audit 기록).
--   → 이 migration 은 출시 상태를 바꾸지 않는다.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 기간 리포트 content 정규화
-- ---------------------------------------------------------------------
-- { overview, family_message, next_period_focus }
--
-- ★ 모은 주차 목록을 content 에 받지 않는다.
--   주차는 `report_period_sources` 행이 사실이고, 본문 JSON 에 적힌 숫자는
--   사실이 아니다. 클라이언트가 보낸 주차 목록을 믿으면 모으지 않은 주차를
--   모았다고 쓸 수 있다.

create or replace function private.normalize_period_content(p_content jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_content jsonb := coalesce(p_content, '{}'::jsonb);
  v_key text;
  v_value jsonb;
  v_text text;
  v_limit integer;
  v_out jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(v_content) <> 'object' then
    raise exception '리포트 내용 형식이 올바르지 않습니다.' using errcode = 'RP001';
  end if;

  for v_key in select jsonb_object_keys(v_content) loop
    if v_key not in ('overview', 'family_message', 'next_period_focus') then
      raise exception '알 수 없는 리포트 항목입니다.' using errcode = 'RP001';
    end if;
  end loop;

  foreach v_key in array array['overview', 'family_message', 'next_period_focus']
  loop
    v_value := v_content -> v_key;
    v_limit := case v_key
      when 'overview' then 3000
      when 'family_message' then 2000
      else 500 end;

    if v_value is null or jsonb_typeof(v_value) = 'null' then
      v_text := null;
    elsif jsonb_typeof(v_value) = 'string' then
      v_text := nullif(btrim(v_value #>> '{}'), '');
    else
      raise exception '리포트 항목 형식이 올바르지 않습니다.' using errcode = 'RP001';
    end if;

    if v_text is not null and char_length(v_text) > v_limit then
      raise exception '리포트 항목은 %자 이내로 입력해 주세요.', v_limit using errcode = 'RP001';
    end if;

    v_out := v_out || jsonb_build_object(v_key, v_text);
  end loop;

  return v_out;
end;
$$;

revoke execute on function private.normalize_period_content(jsonb) from public;
grant execute on function private.normalize_period_content(jsonb) to authenticated;


-- 기간 종류 → 기능 코드
create or replace function private.period_report_feature_code(p_report_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_report_type
    when 'monthly' then 'monthly_report'
    when 'semester' then 'semester_report'
    when 'weekly' then 'weekly_report'
    else null
  end;
$$;

revoke execute on function private.period_report_feature_code(text) from public;
grant execute on function private.period_report_feature_code(text) to authenticated;


-- 월간 block 이 덮는 주차 (4주 단위 · 앱의 weeksInBlock 과 같은 계산)
create or replace function private.monthly_block_weeks(p_block_no integer)
returns integer[]
language sql
immutable
set search_path = ''
as $$
  select array(
    select g
    from pg_catalog.generate_series((p_block_no - 1) * 4 + 1, (p_block_no - 1) * 4 + 4) as g
  );
$$;

revoke execute on function private.monthly_block_weeks(integer) from public;
grant execute on function private.monthly_block_weeks(integer) to authenticated;


-- 계약 version 의 week 범위가 하나라도 있는가 (학기는 특정 주차로 판정할 수 없다)
create or replace function private.class_any_week_entitled(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.classes cl
    join public.contract_classes cc
      on cc.class_id = cl.id
     and cc.organization_id = cl.organization_id
    join public.contracts c
      on c.id = cc.contract_id
    join public.product_versions pv
      on pv.id = c.product_version_id
    where cl.id = p_class_id
      and c.id = private.effective_contract_id(cl.organization_id)
      and pv.week_to >= pv.week_from
  );
$$;

revoke execute on function private.class_any_week_entitled(uuid) from public;
grant execute on function private.class_any_week_entitled(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 2. report_period_sources — 어떤 주간 revision 을 모았는지
-- ---------------------------------------------------------------------
-- ★ 모은 시점의 revision id 를 적는다.
--   나중에 그 주간 리포트가 정정되면 `reports.latest_completed_revision_id` 가
--   바뀌므로, 두 값을 비교하면 "모은 뒤에 원문이 바뀌었다"를 알 수 있다.
--   본문을 자동으로 다시 쓰지 않는다 — 교사가 보고 결정한다.

create table if not exists public.report_period_sources (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,

  -- 월간 · 학기 revision
  revision_id uuid not null,

  -- 모은 주간 리포트와 그 완료 revision
  source_report_id uuid not null,
  source_revision_id uuid not null,

  week_no integer not null
    constraint report_period_sources_week_no_check
    check (week_no between 1 and 52),

  collected_at timestamptz not null default pg_catalog.clock_timestamp(),
  collected_by uuid references auth.users (id) on delete set null,

  constraint report_period_sources_revision_fk
    foreign key (revision_id, organization_id)
    references public.report_revisions (id, organization_id)
    on delete cascade,

  constraint report_period_sources_source_revision_fk
    foreign key (source_revision_id, organization_id)
    references public.report_revisions (id, organization_id)
    on delete restrict,

  constraint report_period_sources_source_report_fk
    foreign key (source_report_id, organization_id)
    references public.reports (id, organization_id)
    on delete restrict,

  -- 같은 주간 리포트를 두 번 모으지 않는다
  constraint report_period_sources_revision_report_key
    unique (revision_id, source_report_id)
);

create index if not exists report_period_sources_revision_idx
  on public.report_period_sources (revision_id, week_no);

alter table public.report_period_sources enable row level security;
revoke all on public.report_period_sources from anon, authenticated;
grant select on public.report_period_sources to authenticated;

drop policy if exists "period sources readable by teacher and director"
  on public.report_period_sources;
create policy "period sources readable by teacher and director"
  on public.report_period_sources
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.report_revisions rv
      join public.reports r on r.id = rv.report_id
      where rv.id = report_period_sources.revision_id
        and (
          private.is_assigned_class_teacher(r.class_id)
          or (
            private.has_org_role(r.organization_id, array['director'])
            and rv.status = 'complete'
          )
        )
    )
  );


-- ★ 쓰기 grant 를 주지 않는다. 아래 DEFINER RPC 만 쓴다.
--   그래도 trigger 를 둔다 — service_role 은 grant 를 우회하지만 trigger 는
--   우회하지 못한다. 완료된 revision 의 근거 목록은 바뀌지 않아야 한다.

create or replace function private.enforce_period_source_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_type text;
begin
  select rv.status, r.report_type
  into v_status, v_type
  from public.report_revisions rv
  join public.reports r on r.id = rv.report_id
  where rv.id = case when tg_op = 'DELETE' then old.revision_id else new.revision_id end;

  if not found then
    raise exception '리포트를 찾을 수 없습니다.' using errcode = 'RP002';
  end if;

  if v_type not in ('monthly', 'semester') then
    raise exception '기간 리포트만 주차 기록을 모을 수 있습니다.' using errcode = 'RP001';
  end if;

  if v_status <> 'draft' then
    raise exception '완료된 리포트의 근거 목록은 바꿀 수 없습니다. 수정본을 만들어 주세요.'
      using errcode = 'RP004';
  end if;

  if tg_op = 'UPDATE' then
    raise exception '근거 행은 수정하지 않습니다. 다시 모아 주세요.' using errcode = 'RP001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  new.collected_by := (select auth.uid());
  return new;
end;
$$;

revoke execute on function private.enforce_period_source_write() from public;

drop trigger if exists trg_report_period_sources_write_check on public.report_period_sources;
create trigger trg_report_period_sources_write_check
  before insert or update or delete on public.report_period_sources
  for each row execute function private.enforce_period_source_write();


-- ---------------------------------------------------------------------
-- 3. reports INSERT 게이트 — 월간 · 학기 허용
-- ---------------------------------------------------------------------
-- M4 의 함수를 교체한다. weekly 경로의 조건은 한 줄도 바꾸지 않는다.

create or replace function private.enforce_report_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment record;
  v_feature text;
  v_weeks integer[];
  v_week integer;
  v_entitled boolean;
begin
  if tg_op = 'INSERT' then
    if new.report_type not in ('weekly', 'monthly', 'semester') then
      raise exception '알 수 없는 리포트 종류입니다.' using errcode = 'RP002';
    end if;

    select a.id, a.organization_id, a.class_id, a.program_id, a.status
    into v_assignment
    from public.class_program_assignments a
    where a.id = new.class_program_assignment_id;

    if not found
      or v_assignment.organization_id is distinct from new.organization_id
      or v_assignment.class_id is distinct from new.class_id
    then
      raise exception '프로그램 배정을 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
    end if;

    if not private.is_assigned_class_teacher(new.class_id) then
      raise exception '담당 교사만 리포트를 만들 수 있습니다.' using errcode = 'RP002';
    end if;

    if not exists (
      select 1 from public.children ch
      where ch.id = new.child_id
        and ch.organization_id = new.organization_id
        and ch.class_id = new.class_id
    ) then
      raise exception '이 반의 원아만 리포트를 만들 수 있습니다.' using errcode = 'RP002';
    end if;

    v_feature := private.period_report_feature_code(new.report_type);

    if not private.class_write_allowed(new.class_id, v_feature) then
      raise exception '현재 이용 상품 또는 이용 기간에서 이 리포트를 만들 수 없습니다.'
        using errcode = 'RP007';
    end if;

    if new.report_type = 'weekly' then
      -- weekly: 기존 조건 그대로 (해당 주차 entitlement)
      if not private.class_week_entitled(new.class_id, new.week_no) then
        raise exception '현재 이용 상품 또는 이용 기간에서 이 주차 리포트를 만들 수 없습니다.'
          using errcode = 'RP007';
      end if;
    else
      -- ★ 월간 · 학기는 출시 게이트를 추가로 지난다 (P1 · P2 · DEC-063).
      --   계약에 기능이 있어도 출시 전에는 만들 수 없다. 출시는 HQ Admin 이 켠다.
      if not private.capability_released(v_feature) then
        raise exception '이 리포트 기능은 아직 출시되지 않았습니다.' using errcode = 'RP007';
      end if;

      if new.report_type = 'monthly' then
        -- block 이 덮는 4주 중 하나라도 이용 범위 안에 있어야 한다.
        v_weeks := private.monthly_block_weeks(new.block_no);
        v_entitled := false;
        foreach v_week in array v_weeks loop
          if v_week <= 52 and private.class_week_entitled(new.class_id, v_week) then
            v_entitled := true;
          end if;
        end loop;
        if not v_entitled then
          raise exception '현재 이용 상품 또는 이용 기간에서 이 기간 리포트를 만들 수 없습니다.'
            using errcode = 'RP007';
        end if;
      else
        -- 학기는 term key 만 있어 특정 주차로 판정할 수 없다.
        -- 계약 version 의 week 범위가 있는지만 확인한다.
        if not private.class_any_week_entitled(new.class_id) then
          raise exception '현재 이용 상품 또는 이용 기간에서 이 기간 리포트를 만들 수 없습니다.'
            using errcode = 'RP007';
        end if;
      end if;
    end if;

    new.created_by := (select auth.uid());
    new.latest_completed_revision_id := null;
    new.hidden_at := null;
    new.hidden_by := null;
    new.hidden_reason := null;
    return new;
  end if;

  -- UPDATE: 식별자 불변. 포인터는 complete revision 만 (DI-6).
  if new.organization_id is distinct from old.organization_id
    or new.class_id is distinct from old.class_id
    or new.child_id is distinct from old.child_id
    or new.class_program_assignment_id is distinct from old.class_program_assignment_id
    or new.report_type is distinct from old.report_type
    or new.week_no is distinct from old.week_no
    or new.block_no is distinct from old.block_no
    or new.reporting_term_key is distinct from old.reporting_term_key
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
  then
    raise exception '리포트 식별 정보는 바꿀 수 없습니다.' using errcode = 'RP001';
  end if;

  if new.latest_completed_revision_id is distinct from old.latest_completed_revision_id then
    if new.latest_completed_revision_id is null or not exists (
      select 1 from public.report_revisions rv
      where rv.id = new.latest_completed_revision_id
        and rv.report_id = new.id
        and rv.status = 'complete'
    ) then
      raise exception '최근 완료본은 같은 리포트의 완료된 revision 이어야 합니다.' using errcode = 'RP001';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_report_write() from public;

-- 월간 · 학기 식별 컬럼 INSERT 권한 (컬럼 단위 grant 는 누적된다)
grant insert (block_no, reporting_term_key) on public.reports to authenticated;


-- ---------------------------------------------------------------------
-- 4. report_revisions 게이트 — 종류별 분기
-- ---------------------------------------------------------------------

create or replace function private.enforce_report_revision_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report record;
  v_next_no integer;
  v_content jsonb;
  v_obs_count integer;
  v_source_count integer;
  v_feature text;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_actor uuid := (select auth.uid());
begin
  select r.id, r.organization_id, r.class_id, r.report_type, r.latest_completed_revision_id
  into v_report
  from public.reports r
  where r.id = case when tg_op = 'DELETE' then old.report_id else new.report_id end;

  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception '완료된 리포트는 삭제할 수 없습니다.' using errcode = 'RP004';
    end if;
    return old;
  end if;

  if not found or v_report.organization_id is distinct from new.organization_id then
    raise exception '리포트를 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
  end if;

  if not private.is_assigned_class_teacher(v_report.class_id) then
    raise exception '담당 교사만 리포트를 작성할 수 있습니다.' using errcode = 'RP002';
  end if;

  v_feature := private.period_report_feature_code(v_report.report_type);

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception '리포트는 작성 중 상태로만 만들 수 있습니다.' using errcode = 'RP001';
    end if;

    if not private.class_write_allowed(v_report.class_id, v_feature) then
      raise exception '현재 이용 상품 또는 이용 기간에서 리포트를 작성할 수 없습니다.' using errcode = 'RP007';
    end if;

    if v_report.report_type <> 'weekly'
      and not private.capability_released(v_feature)
    then
      raise exception '이 리포트 기능은 아직 출시되지 않았습니다.' using errcode = 'RP007';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('report-revision:' || v_report.id::text, 0)
    );

    select coalesce(max(rv.revision_no), 0) + 1 into v_next_no
    from public.report_revisions rv
    where rv.report_id = v_report.id;

    new.revision_no := v_next_no;

    if v_next_no > 1 then
      if v_report.latest_completed_revision_id is null then
        raise exception '완료된 리포트가 있어야 수정본을 만들 수 있습니다.' using errcode = 'RP003';
      end if;
      if new.correction_reason is null then
        raise exception '수정 사유를 입력해 주세요.' using errcode = 'RP005';
      end if;
    end if;

    -- ★ template_version 은 서버가 정한다. 클라이언트 입력을 쓰지 않는다.
    new.template_version := case v_report.report_type
      when 'weekly' then 'weekly.v1'
      when 'monthly' then 'monthly.v1'
      else 'semester.v1'
    end;

    new.content := case
      when v_report.report_type = 'weekly' then private.normalize_weekly_content(new.content)
      else private.normalize_period_content(new.content)
    end;
    new.created_by := v_actor;
    new.updated_by := v_actor;
    new.completed_by := null;
    new.completed_at := null;
    return new;
  end if;

  -- UPDATE
  if old.status = 'complete' then
    raise exception '완료된 리포트는 직접 수정할 수 없습니다. 수정본을 만들어 주세요.' using errcode = 'RP004';
  end if;

  if new.report_id is distinct from old.report_id
    or new.organization_id is distinct from old.organization_id
    or new.revision_no is distinct from old.revision_no
    or new.correction_reason is distinct from old.correction_reason
    or new.template_version is distinct from old.template_version
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
  then
    raise exception '리포트 revision 정보는 바꿀 수 없습니다.' using errcode = 'RP001';
  end if;

  if not private.class_write_allowed(v_report.class_id, v_feature) then
    raise exception '현재 이용 상품 또는 이용 기간에서 리포트를 작성할 수 없습니다.' using errcode = 'RP007';
  end if;

  new.content := case
    when v_report.report_type = 'weekly' then private.normalize_weekly_content(new.content)
    else private.normalize_period_content(new.content)
  end;
  new.updated_by := v_actor;

  if new.status = 'complete' then
    v_content := new.content;

    if v_report.report_type = 'weekly' then
      select count(*) into v_obs_count
      from private.weekly_completed_observation_ids(v_report.id);

      if v_obs_count = 0 then
        raise exception '완료된 관찰 기록이 1건 이상 필요합니다.' using errcode = 'RP006';
      end if;
      if v_content ->> 'topic' is null then
        raise exception '이번 주 활동 주제가 필요합니다.' using errcode = 'RP006';
      end if;
      if v_content ->> 'teacher_observation' is null then
        raise exception '교사 관찰 문장을 확인해 주세요.' using errcode = 'RP006';
      end if;
      if v_content ->> 'family_conversation' is null then
        raise exception '가정연계 내용이 필요합니다.' using errcode = 'RP006';
      end if;

      -- Evidence Snapshot (정규화 · AI 컬럼 없음 · 인용 = child_voice 원문)
      insert into public.report_revision_evidence (
        organization_id, revision_id, observation_id, class_session_id,
        session_date, week_no, lesson_title,
        teacher_note_snapshot, child_voice_snapshot, growth_snapshot
      )
      select
        o.organization_id, new.id, o.id, s.id,
        s.scheduled_date, s.week_no, l.title,
        o.teacher_note, o.child_voice,
        coalesce((
          select jsonb_agg(jsonb_build_object('metric_code', g.metric_code, 'stage', g.stage)
                           order by gm.sort_order)
          from public.observation_growth_selections g
          join public.growth_metrics gm on gm.code = g.metric_code
          where g.observation_id = o.id
        ), '[]'::jsonb)
      from public.class_session_observations o
      join public.class_sessions s on s.id = o.class_session_id
      join public.curriculum_lessons l on l.id = s.lesson_id
      where o.id in (select private.weekly_completed_observation_ids(v_report.id))
      on conflict (revision_id, observation_id) do nothing;
    else
      -- ★ 월간 · 학기 완료 조건: 모은 주차 ≥ 1 · 기간 요약 · 가정에 전하는 말.
      --   "재료가 없는데 템플릿만 완료"를 막는다.
      select count(*) into v_source_count
      from public.report_period_sources ps
      where ps.revision_id = new.id;

      if v_source_count = 0 then
        raise exception '모은 주차 기록이 1건 이상 필요합니다.' using errcode = 'RP006';
      end if;
      if v_content ->> 'overview' is null then
        raise exception '기간 요약이 필요합니다.' using errcode = 'RP006';
      end if;
      if v_content ->> 'family_message' is null then
        raise exception '가정에 전하는 말이 필요합니다.' using errcode = 'RP006';
      end if;

      -- ★ 근거는 모은 주간 revision 의 근거 행을 **그대로 복사**한다.
      --   원문을 다시 읽어 오지 않는다. 모은 시점의 문장이 그대로 남아야
      --   나중에 주간이 정정되어도 기간 리포트가 조용히 바뀌지 않는다.
      insert into public.report_revision_evidence (
        organization_id, revision_id, observation_id, class_session_id,
        session_date, week_no, lesson_title,
        teacher_note_snapshot, child_voice_snapshot, growth_snapshot
      )
      select
        e.organization_id, new.id, e.observation_id, e.class_session_id,
        e.session_date, e.week_no, e.lesson_title,
        e.teacher_note_snapshot, e.child_voice_snapshot, e.growth_snapshot
      from public.report_period_sources ps
      join public.report_revision_evidence e on e.revision_id = ps.source_revision_id
      where ps.revision_id = new.id
      on conflict (revision_id, observation_id) do nothing;
    end if;

    new.completed_by := v_actor;
    new.completed_at := v_now;
  else
    new.completed_by := null;
    new.completed_at := null;
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_report_revision_write() from public;


-- ---------------------------------------------------------------------
-- 5. public.create_period_report_draft — 기간 리포트 초안 만들기
-- ---------------------------------------------------------------------
-- ★ SECURITY INVOKER. RLS 와 trigger 가 그대로 판정한다.
-- ★ 본문을 자동으로 채우지 않는다. 주간처럼 조립할 원천이 없고, 없는 문장을
--   만들지 않는다. 빈 초안을 주고 교사가 모아서 쓴다.

create or replace function public.create_period_report_draft(
  p_child_id uuid,
  p_assignment_id uuid,
  p_kind text,
  p_block_no integer default null,
  p_term_key text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_assignment record;
  v_report record;
  v_revision_id uuid;
  v_updated_at timestamptz;
begin
  if p_child_id is null or p_assignment_id is null or p_kind is null then
    raise exception '원아 · 배정 · 기간 정보가 필요합니다.' using errcode = 'RP001';
  end if;

  if p_kind not in ('monthly', 'semester') then
    raise exception '월간 또는 학기만 만들 수 있습니다.' using errcode = 'RP001';
  end if;

  if p_kind = 'monthly' and (p_block_no is null or p_term_key is not null) then
    raise exception '월간 리포트는 블록 번호가 필요합니다.' using errcode = 'RP001';
  end if;

  if p_kind = 'semester' and (p_term_key is null or p_block_no is not null) then
    raise exception '학기 리포트는 학기 키가 필요합니다.' using errcode = 'RP001';
  end if;

  select a.id, a.organization_id, a.class_id
  into v_assignment
  from public.class_program_assignments a
  where a.id = p_assignment_id;

  if not found then
    raise exception '프로그램 배정을 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
  end if;

  if p_kind = 'monthly' then
    insert into public.reports (
      organization_id, class_id, child_id, class_program_assignment_id,
      report_type, block_no
    )
    values (
      v_assignment.organization_id, v_assignment.class_id, p_child_id, v_assignment.id,
      'monthly', p_block_no
    )
    on conflict (child_id, class_program_assignment_id, block_no) where report_type = 'monthly'
    do nothing;

    select r.id, r.organization_id, r.latest_completed_revision_id
    into v_report
    from public.reports r
    where r.child_id = p_child_id
      and r.class_program_assignment_id = v_assignment.id
      and r.report_type = 'monthly'
      and r.block_no = p_block_no;
  else
    insert into public.reports (
      organization_id, class_id, child_id, class_program_assignment_id,
      report_type, reporting_term_key
    )
    values (
      v_assignment.organization_id, v_assignment.class_id, p_child_id, v_assignment.id,
      'semester', p_term_key
    )
    on conflict (child_id, class_program_assignment_id, reporting_term_key)
      where report_type = 'semester'
    do nothing;

    select r.id, r.organization_id, r.latest_completed_revision_id
    into v_report
    from public.reports r
    where r.child_id = p_child_id
      and r.class_program_assignment_id = v_assignment.id
      and r.report_type = 'semester'
      and r.reporting_term_key = p_term_key;
  end if;

  if not found then
    raise exception '리포트를 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
  end if;

  select rv.id, rv.updated_at into v_revision_id, v_updated_at
  from public.report_revisions rv
  where rv.report_id = v_report.id and rv.status = 'draft';

  if v_revision_id is not null then
    return jsonb_build_object('report_id', v_report.id, 'revision_id', v_revision_id,
                              'updated_at', v_updated_at, 'created', false);
  end if;

  if v_report.latest_completed_revision_id is not null then
    raise exception '이미 완료된 리포트입니다. 수정이 필요하면 수정본을 만들어 주세요.'
      using errcode = 'RP003';
  end if;

  insert into public.report_revisions (organization_id, report_id, content)
  values (v_report.organization_id, v_report.id, '{}'::jsonb)
  returning id, updated_at into v_revision_id, v_updated_at;

  return jsonb_build_object('report_id', v_report.id, 'revision_id', v_revision_id,
                            'updated_at', v_updated_at, 'created', true);
end;
$$;

revoke execute on function public.create_period_report_draft(uuid, uuid, text, integer, text)
  from public, anon;
grant execute on function public.create_period_report_draft(uuid, uuid, text, integer, text)
  to authenticated;


-- ---------------------------------------------------------------------
-- 6. public.set_period_report_sources — 모을 주차 선택
-- ---------------------------------------------------------------------
-- ★ DEFINER 다 — `report_period_sources` 에 쓰기 grant 를 주지 않았기 때문이다.
--   그래서 권한을 이 안에서 전부 다시 확인한다.
--     · 담당 교사인가
--     · 그 revision 이 작성 중인 기간 리포트인가
--     · 각 주차 리포트가 **같은 원아 · 같은 배정**의 **완료 · 비숨김** 주간인가
--     · 월간이면 그 블록이 덮는 주차인가
-- ★ 낙관적 동시성: 호출자가 본 `updated_at` 을 넘긴다. 그 사이 다른 교사가
--   바꿨으면 RP009 로 거절한다.
-- ★ 숨김 주간은 모으지 않는다. 숨김은 학부모 노출 차단이고, 기간 리포트는
--   학부모에게 간다.

create or replace function public.set_period_report_sources(
  p_revision_id uuid,
  p_source_report_ids uuid[],
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report record;
  v_revision record;
  v_ids uuid[] := coalesce(p_source_report_ids, '{}'::uuid[]);
  v_allowed_weeks integer[];
  v_updated_at timestamptz;
  v_count integer;
  v_weeks integer[];
begin
  if cardinality(v_ids) > 26 then
    raise exception '한 번에 26주까지 모을 수 있습니다.' using errcode = 'RP008';
  end if;

  if (select count(distinct u) from unnest(v_ids) as u) <> cardinality(v_ids) then
    raise exception '같은 주차가 두 번 선택되었습니다.' using errcode = 'RP008';
  end if;

  select rv.id, rv.organization_id, rv.status, rv.report_id, rv.updated_at
  into v_revision
  from public.report_revisions rv
  where rv.id = p_revision_id;

  if not found then
    raise exception '리포트를 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
  end if;

  select r.id, r.class_id, r.child_id, r.class_program_assignment_id,
         r.report_type, r.block_no
  into v_report
  from public.reports r
  where r.id = v_revision.report_id;

  if not found then
    raise exception '리포트를 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
  end if;

  if not private.is_assigned_class_teacher(v_report.class_id) then
    raise exception '담당 교사만 리포트를 작성할 수 있습니다.' using errcode = 'RP002';
  end if;

  if v_report.report_type not in ('monthly', 'semester') then
    raise exception '기간 리포트만 주차 기록을 모을 수 있습니다.' using errcode = 'RP001';
  end if;

  if v_revision.status <> 'draft' then
    raise exception '완료된 리포트는 직접 수정할 수 없습니다. 수정본을 만들어 주세요.'
      using errcode = 'RP004';
  end if;

  if not private.class_write_allowed(
       v_report.class_id,
       private.period_report_feature_code(v_report.report_type))
     or not private.capability_released(
       private.period_report_feature_code(v_report.report_type))
  then
    raise exception '현재 이용 상품 또는 출시 상태에서 리포트를 작성할 수 없습니다.'
      using errcode = 'RP007';
  end if;

  -- 월간은 블록이 덮는 4주만 모을 수 있다. 학기는 같은 배정의 주차면 된다.
  v_allowed_weeks := case
    when v_report.report_type = 'monthly' then private.monthly_block_weeks(v_report.block_no)
    else null
  end;

  -- 선택한 주차 리포트가 전부 조건을 만족하는지 확인한다.
  if cardinality(v_ids) > 0 then
    if exists (
      select 1
      from unnest(v_ids) as u(id)
      where not exists (
        select 1
        from public.reports w
        where w.id = u.id
          and w.report_type = 'weekly'
          and w.child_id = v_report.child_id
          and w.class_program_assignment_id = v_report.class_program_assignment_id
          and w.organization_id = v_revision.organization_id
          and w.hidden_at is null
          and w.latest_completed_revision_id is not null
          and (v_allowed_weeks is null or w.week_no = any (v_allowed_weeks))
      )
    ) then
      raise exception '모을 수 없는 주차가 선택되었습니다. 완료되고 공개 중인 같은 기간의 주차만 모을 수 있습니다.'
        using errcode = 'RP002';
    end if;
  end if;

  -- 토큰 확인 겸 revision 터치. 트리거가 updated_at 을 올린다.
  update public.report_revisions rv
  set content = rv.content
  where rv.id = p_revision_id
    and rv.status = 'draft'
    and rv.updated_at = p_expected_updated_at
  returning rv.updated_at into v_updated_at;

  if not found then
    raise exception '다른 선생님이 먼저 내용을 변경했습니다. 최신 내용을 다시 불러와 확인해 주세요.'
      using errcode = 'RP009';
  end if;

  delete from public.report_period_sources ps where ps.revision_id = p_revision_id;

  insert into public.report_period_sources (
    organization_id, revision_id, source_report_id, source_revision_id, week_no
  )
  select v_revision.organization_id, p_revision_id, w.id,
         w.latest_completed_revision_id, w.week_no
  from public.reports w
  where w.id = any (v_ids);

  select count(*), array_agg(ps.week_no order by ps.week_no)
  into v_count, v_weeks
  from public.report_period_sources ps
  where ps.revision_id = p_revision_id;

  return jsonb_build_object(
    'revision_id', p_revision_id,
    'updated_at', v_updated_at,
    'collected', v_count,
    'weeks', coalesce(to_jsonb(v_weeks), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.set_period_report_sources(uuid, uuid[], timestamptz)
  from public, anon;
grant execute on function public.set_period_report_sources(uuid, uuid[], timestamptz)
  to authenticated;


comment on table public.report_period_sources is
  '월간 · 학기 revision 이 모은 주간 완료 revision. 모은 시점을 고정해 두어, 주간이 정정되면 자동 교체 대신 재검토로 알린다.';


-- ---------------------------------------------------------------------
-- 7. class_entitlements — 화면 분기 값 추가
-- ---------------------------------------------------------------------
-- ★ 기존 key 를 모두 그대로 돌려준다. 호출하는 화면이 깨지지 않게 한다.
-- ★ 월간 · 학기 · 일괄 인쇄는 **계약 ∧ 출시**로 판정한다.
--   계약에 기능이 있어도 출시 전이면 false 다. 화면이 "준비 중"을 보여 주고,
--   DB 는 trigger 로 다시 막는다. 화면 값만으로 권한을 판단하지 않는다.

create or replace function public.class_entitlements(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_class record;
begin
  select cl.id, cl.organization_id, cl.status
  into v_class
  from public.classes cl
  where cl.id = p_class_id;

  if not found or not (
    private.is_assigned_class_teacher(p_class_id)
    or private.has_org_role(v_class.organization_id, array['director'])
    or private.is_hq_admin()
  ) then
    raise exception '찾을 수 없거나 접근 권한이 없습니다.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'service_mode', private.org_service_mode(v_class.organization_id),
    'in_contract_scope', private.class_in_effective_contract_scope(p_class_id),
    'class_mode_write', private.class_write_allowed(p_class_id, 'class_mode'),
    'weekly_report_write', private.class_write_allowed(p_class_id, 'weekly_report'),
    'monthly_report_write',
      private.class_write_allowed(p_class_id, 'monthly_report')
      and private.capability_released('monthly_report'),
    'semester_report_write',
      private.class_write_allowed(p_class_id, 'semester_report')
      and private.capability_released('semester_report'),
    'bulk_print',
      private.class_has_feature(p_class_id, 'bulk_print')
      and private.capability_released('bulk_print'),
    'ai_c1', private.class_ai_capability_allowed(p_class_id, 'c1'),
    'ai_c2', private.class_ai_capability_allowed(p_class_id, 'c2'),
    'ai_c3', private.class_ai_capability_allowed(p_class_id, 'c3')
  );
end;
$$;

revoke execute on function public.class_entitlements(uuid) from public, anon;
grant execute on function public.class_entitlements(uuid) to authenticated;
