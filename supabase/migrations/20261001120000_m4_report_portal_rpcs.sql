-- =====================================================================
-- PHASE 07 · M4 — Report 2.0 write path · Snapshot · Revision · Hide ·
--                 Child Portal (issue · revoke · anon read)
-- ---------------------------------------------------------------------
-- 근거: DEC-039 · DEC-042 · DEC-060 · DEC-066 · DEC-073 · DEC-074 · DEC-075 ·
--       DEC-089 ~ DEC-092 · DEC-101 ~ DEC-103
--
-- · Weekly = Child × Program Assignment × Week · Generative AI 없음.
-- · 완료 조건 (DEC-066 HARD): 완료된 관찰 ≥ 1 · 활동 주제 · 교사 관찰 문장 ·
--   가정연계 내용. 아이의 말 · 관찰 포인트 · 사진(0~3장) · 다음 주 예고는
--   선택 사항. AI 사용 여부는 완료 조건이 아니다.
-- · 완료 시 Evidence Snapshot(정규화 행) + Final Content(JSONB) 저장 ·
--   완료 revision 불변 · 정정은 새 revision (사유 필수).
-- · 숨김 · 다시 공개: Director · HQ Admin · 사유 필수 · audit ·
--   숨김 중 새 revision 완료 → 자동 공개 없음.
-- · Parent 는 read_child_portal RPC 만 (anon). 원인 무구분 실패 (null 반환).
--   사진은 반환하지 않는다 (CO-9 · CO-10 · DB-9 미해결).
--   Portal 만료 기간은 정하지 않는다 (CO-12).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Weekly content 정규화 (Final Content Snapshot 스키마)
-- ---------------------------------------------------------------------
-- { topic, quote_choice, teacher_observation, family_conversation, next_week_preview }

create or replace function private.normalize_weekly_content(p_content jsonb)
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
    if v_key not in ('topic', 'quote_choice', 'teacher_observation',
                     'family_conversation', 'next_week_preview') then
      raise exception '알 수 없는 리포트 항목입니다.' using errcode = 'RP001';
    end if;
  end loop;

  foreach v_key in array array['topic', 'quote_choice', 'teacher_observation',
                               'family_conversation', 'next_week_preview']
  loop
    v_value := v_content -> v_key;
    v_limit := case v_key
      when 'topic' then 200
      when 'quote_choice' then 1000
      when 'teacher_observation' then 2000
      when 'family_conversation' then 2000
      else 300 end;

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

revoke execute on function private.normalize_weekly_content(jsonb) from public;
grant execute on function private.normalize_weekly_content(jsonb) to authenticated;


-- 이 Weekly 의 근거가 될 수 있는 완료 관찰 (같은 배정 · 같은 주차 · 같은 아동)
create or replace function private.weekly_completed_observation_ids(p_report_id uuid)
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select o.id
  from public.reports r
  join public.class_sessions s
    on s.class_program_assignment_id = r.class_program_assignment_id
   and s.organization_id = r.organization_id
   and s.week_no = r.week_no
   and s.status in ('in_progress', 'completed')
  join public.class_session_observations o
    on o.class_session_id = s.id
   and o.child_id = r.child_id
   and o.record_status = 'complete'
  where r.id = p_report_id
    and r.report_type = 'weekly'
    and (
      private.is_assigned_class_teacher(r.class_id)
      or private.has_org_role(r.organization_id, array['director'])
    );
$$;

revoke execute on function private.weekly_completed_observation_ids(uuid) from public;
grant execute on function private.weekly_completed_observation_ids(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 2. reports insert 검증
-- ---------------------------------------------------------------------

create or replace function private.enforce_report_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment record;
begin
  if tg_op = 'INSERT' then
    if new.report_type <> 'weekly' then
      -- Monthly (P1) · Semester (P2) 작성 경로는 아직 없다 (AR-1 · AR-2 미정)
      raise exception '현재는 주간 리포트만 만들 수 있습니다.' using errcode = 'RP002';
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

    if not private.class_write_allowed(new.class_id, 'weekly_report')
      or not private.class_week_entitled(new.class_id, new.week_no)
    then
      raise exception '현재 이용 상품 또는 이용 기간에서 이 주차 리포트를 만들 수 없습니다.'
        using errcode = 'RP007';
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

drop trigger if exists trg_reports_write_check on public.reports;
create trigger trg_reports_write_check
  before insert or update on public.reports
  for each row execute function private.enforce_report_write();

grant insert (organization_id, class_id, child_id, class_program_assignment_id, report_type, week_no)
  on public.reports to authenticated;

drop policy if exists "reports insert by assigned teacher" on public.reports;
create policy "reports insert by assigned teacher"
  on public.reports
  for insert
  to authenticated
  with check (private.is_assigned_class_teacher(class_id));


-- ---------------------------------------------------------------------
-- 3. report_revisions 검증 · 완료 시 스냅샷
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

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception '리포트는 작성 중 상태로만 만들 수 있습니다.' using errcode = 'RP001';
    end if;

    if not private.class_write_allowed(v_report.class_id, 'weekly_report') then
      raise exception '현재 이용 상품 또는 이용 기간에서 리포트를 작성할 수 없습니다.' using errcode = 'RP007';
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

    new.content := private.normalize_weekly_content(new.content);
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

  if not private.class_write_allowed(v_report.class_id, 'weekly_report') then
    raise exception '현재 이용 상품 또는 이용 기간에서 리포트를 작성할 수 없습니다.' using errcode = 'RP007';
  end if;

  new.content := private.normalize_weekly_content(new.content);
  new.updated_by := v_actor;

  if new.status = 'complete' then
    v_content := new.content;

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

drop trigger if exists trg_report_revisions_write_check on public.report_revisions;
create trigger trg_report_revisions_write_check
  before insert or update or delete on public.report_revisions
  for each row execute function private.enforce_report_revision_write();


create or replace function private.apply_report_revision_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reports r
  set latest_completed_revision_id = new.id
  where r.id = new.report_id;
  return null;
end;
$$;

revoke execute on function private.apply_report_revision_completed() from public;

drop trigger if exists trg_report_revisions_completed on public.report_revisions;
create trigger trg_report_revisions_completed
  after update on public.report_revisions
  for each row
  when (old.status = 'draft' and new.status = 'complete')
  execute function private.apply_report_revision_completed();


grant insert (organization_id, report_id, correction_reason, content)
  on public.report_revisions to authenticated;
grant update (content, status) on public.report_revisions to authenticated;
grant delete on public.report_revisions to authenticated;

drop policy if exists "report revisions insert by assigned teacher" on public.report_revisions;
create policy "report revisions insert by assigned teacher"
  on public.report_revisions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.reports r
      where r.id = report_revisions.report_id
        and r.organization_id = report_revisions.organization_id
        and private.is_assigned_class_teacher(r.class_id)
    )
  );

drop policy if exists "report revisions update draft by assigned teacher" on public.report_revisions;
create policy "report revisions update draft by assigned teacher"
  on public.report_revisions
  for update
  to authenticated
  using (
    status = 'draft'
    and exists (
      select 1 from public.reports r
      where r.id = report_revisions.report_id
        and private.is_assigned_class_teacher(r.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.reports r
      where r.id = report_revisions.report_id
        and private.is_assigned_class_teacher(r.class_id)
    )
  );

drop policy if exists "report revisions delete draft by assigned teacher" on public.report_revisions;
create policy "report revisions delete draft by assigned teacher"
  on public.report_revisions
  for delete
  to authenticated
  using (
    status = 'draft'
    and exists (
      select 1 from public.reports r
      where r.id = report_revisions.report_id
        and private.is_assigned_class_teacher(r.class_id)
    )
  );


-- 스냅샷 행 불변: 완료 revision 의 evidence · media 는 바꾸지 않는다 (DI-4)
create or replace function private.enforce_report_snapshot_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision_id uuid := case when tg_op = 'DELETE' then old.revision_id else new.revision_id end;
begin
  if tg_op = 'UPDATE' then
    raise exception '리포트 스냅샷은 수정할 수 없습니다.' using errcode = 'RP004';
  end if;

  if exists (
    select 1 from public.report_revisions rv
    where rv.id = v_revision_id and rv.status = 'complete'
  ) then
    raise exception '완료된 리포트의 스냅샷은 바꿀 수 없습니다.' using errcode = 'RP004';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function private.enforce_report_snapshot_immutable() from public;

drop trigger if exists trg_report_evidence_immutable on public.report_revision_evidence;
create trigger trg_report_evidence_immutable
  before insert or update or delete on public.report_revision_evidence
  for each row execute function private.enforce_report_snapshot_immutable();


-- 사진 reference: 0~3장 · 같은 아동 · 같은 배정 · 같은 주차 · 숨김 아님 (DEC-039)
create or replace function private.enforce_report_media_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision_id uuid := case when tg_op = 'DELETE' then old.revision_id else new.revision_id end;
  v_report record;
begin
  if tg_op = 'UPDATE' then
    raise exception '사진 선택은 수정하지 않고 다시 저장합니다.' using errcode = 'RP008';
  end if;

  select r.id, r.class_id, r.child_id, r.class_program_assignment_id, r.week_no, rv.status
  into v_report
  from public.report_revisions rv
  join public.reports r on r.id = rv.report_id
  where rv.id = v_revision_id;

  if v_report.status is distinct from 'draft' then
    raise exception '완료된 리포트의 사진은 바꿀 수 없습니다.' using errcode = 'RP004';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if not private.is_assigned_class_teacher(v_report.class_id) then
    raise exception '담당 교사만 사진을 선택할 수 있습니다.' using errcode = 'RP002';
  end if;

  if (
    select count(*) from public.report_revision_media m
    where m.revision_id = new.revision_id
  ) >= 3 then
    raise exception '사진은 3장까지 선택할 수 있습니다.' using errcode = 'RP008';
  end if;

  if not exists (
    select 1
    from public.class_session_observation_media md
    join public.class_sessions s on s.id = md.class_session_id
    where md.id = new.media_id
      and md.organization_id = new.organization_id
      and md.child_id = v_report.child_id
      and md.hidden_at is null
      and s.class_program_assignment_id = v_report.class_program_assignment_id
      and s.week_no = v_report.week_no
  ) then
    raise exception '이 주차 이 아이의 사진만 선택할 수 있습니다.' using errcode = 'RP008';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_report_media_write() from public;

drop trigger if exists trg_report_media_write_check on public.report_revision_media;
create trigger trg_report_media_write_check
  before insert or update or delete on public.report_revision_media
  for each row execute function private.enforce_report_media_write();

grant insert (organization_id, revision_id, media_id, sort_order) on public.report_revision_media to authenticated;
grant delete on public.report_revision_media to authenticated;

drop policy if exists "report media refs write by assigned teacher" on public.report_revision_media;
create policy "report media refs write by assigned teacher"
  on public.report_revision_media
  for all
  to authenticated
  using (
    exists (
      select 1 from public.report_revisions rv
      join public.reports r on r.id = rv.report_id
      where rv.id = report_revision_media.revision_id
        and private.is_assigned_class_teacher(r.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.report_revisions rv
      join public.reports r on r.id = rv.report_id
      where rv.id = report_revision_media.revision_id
        and rv.organization_id = report_revision_media.organization_id
        and private.is_assigned_class_teacher(r.class_id)
    )
  );


-- ---------------------------------------------------------------------
-- 4. Weekly RPCs (SECURITY INVOKER)
-- ---------------------------------------------------------------------

create or replace function public.create_weekly_report_draft(
  p_child_id uuid,
  p_assignment_id uuid,
  p_week_no integer
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
  v_lesson record;
  v_family text;
  v_next_title text;
  v_note text;
begin
  if p_child_id is null or p_assignment_id is null or p_week_no is null then
    raise exception '원아 · 배정 · 주차 정보가 필요합니다.' using errcode = 'RP001';
  end if;

  select a.id, a.organization_id, a.class_id, a.program_id
  into v_assignment
  from public.class_program_assignments a
  where a.id = p_assignment_id;

  if not found then
    raise exception '프로그램 배정을 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
  end if;

  insert into public.reports (
    organization_id, class_id, child_id, class_program_assignment_id, report_type, week_no
  )
  values (
    v_assignment.organization_id, v_assignment.class_id, p_child_id, v_assignment.id, 'weekly', p_week_no
  )
  on conflict (child_id, class_program_assignment_id, week_no) where report_type = 'weekly'
  do nothing;

  select r.id, r.organization_id, r.latest_completed_revision_id
  into v_report
  from public.reports r
  where r.child_id = p_child_id
    and r.class_program_assignment_id = v_assignment.id
    and r.report_type = 'weekly'
    and r.week_no = p_week_no;

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
    raise exception '이미 완료된 리포트입니다. 수정이 필요하면 수정본을 만들어 주세요.' using errcode = 'RP003';
  end if;

  -- 결정적 조립 (AI 없음 · DEC-066): 수업 자료 + 교사 관찰에서 채움
  select l.id, l.title into v_lesson
  from public.curriculum_lessons l
  where l.program_id = v_assignment.program_id and l.week_no = p_week_no
  order by l.session_no
  limit 1;

  select ls.body into v_family
  from public.lesson_sections ls
  where ls.lesson_id = v_lesson.id and ls.section_code = 's13';

  select l.title into v_next_title
  from public.curriculum_lessons l
  where l.program_id = v_assignment.program_id and l.week_no = p_week_no + 1
    and l.status = 'published'
  order by l.session_no
  limit 1;

  select string_agg(o.teacher_note, E'\n' order by s.scheduled_date nulls last, o.created_at)
  into v_note
  from private.weekly_completed_observation_ids(v_report.id) as ids(id)
  join public.class_session_observations o on o.id = ids.id
  join public.class_sessions s on s.id = o.class_session_id
  where o.teacher_note is not null;

  insert into public.report_revisions (organization_id, report_id, content)
  values (
    v_report.organization_id,
    v_report.id,
    jsonb_build_object(
      'topic', v_lesson.title,
      'quote_choice', null,
      'teacher_observation', left(v_note, 2000),
      'family_conversation', left(v_family, 2000),
      'next_week_preview', left(v_next_title, 300)
    )
  )
  returning id, updated_at into v_revision_id, v_updated_at;

  return jsonb_build_object('report_id', v_report.id, 'revision_id', v_revision_id,
                            'updated_at', v_updated_at, 'created', true);
end;
$$;

revoke execute on function public.create_weekly_report_draft(uuid, uuid, integer) from public, anon;
grant execute on function public.create_weekly_report_draft(uuid, uuid, integer) to authenticated;


create or replace function public.save_report_draft(
  p_revision_id uuid,
  p_content jsonb,
  p_media_ids uuid[],
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revision record;
  v_updated_at timestamptz;
  v_media uuid[] := coalesce(p_media_ids, '{}'::uuid[]);
begin
  if cardinality(v_media) > 3 then
    raise exception '사진은 3장까지 선택할 수 있습니다.' using errcode = 'RP008';
  end if;

  if (select count(distinct m) from unnest(v_media) as m) <> cardinality(v_media) then
    raise exception '같은 사진이 두 번 선택되었습니다.' using errcode = 'RP008';
  end if;

  select rv.id, rv.organization_id, rv.status, rv.updated_at
  into v_revision
  from public.report_revisions rv
  where rv.id = p_revision_id;

  if not found then
    raise exception '리포트를 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
  end if;

  if v_revision.status <> 'draft' then
    raise exception '완료된 리포트는 직접 수정할 수 없습니다. 수정본을 만들어 주세요.' using errcode = 'RP004';
  end if;

  update public.report_revisions rv
  set content = coalesce(p_content, '{}'::jsonb)
  where rv.id = p_revision_id
    and rv.status = 'draft'
    and rv.updated_at = p_expected_updated_at
  returning rv.updated_at into v_updated_at;

  if not found then
    raise exception '다른 선생님이 먼저 내용을 변경했습니다. 최신 내용을 다시 불러와 확인해 주세요.'
      using errcode = 'RP009';
  end if;

  delete from public.report_revision_media m where m.revision_id = p_revision_id;

  insert into public.report_revision_media (organization_id, revision_id, media_id, sort_order)
  select v_revision.organization_id, p_revision_id, u.media_id, u.ord::integer
  from unnest(v_media) with ordinality as u(media_id, ord);

  return jsonb_build_object('revision_id', p_revision_id, 'updated_at', v_updated_at);
end;
$$;

revoke execute on function public.save_report_draft(uuid, jsonb, uuid[], timestamptz) from public, anon;
grant execute on function public.save_report_draft(uuid, jsonb, uuid[], timestamptz) to authenticated;


create or replace function public.complete_report_revision(
  p_revision_id uuid,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated_at timestamptz;
  v_completed_at timestamptz;
  v_report_id uuid;
begin
  update public.report_revisions rv
  set status = 'complete'
  where rv.id = p_revision_id
    and rv.status = 'draft'
    and rv.updated_at = p_expected_updated_at
  returning rv.updated_at, rv.completed_at, rv.report_id
  into v_updated_at, v_completed_at, v_report_id;

  if not found then
    if not exists (select 1 from public.report_revisions rv where rv.id = p_revision_id) then
      raise exception '리포트를 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
    end if;
    raise exception '다른 선생님이 먼저 내용을 변경했거나 이미 완료되었습니다. 최신 내용을 다시 불러와 확인해 주세요.'
      using errcode = 'RP009';
  end if;

  return jsonb_build_object('report_id', v_report_id, 'revision_id', p_revision_id,
                            'completed_at', v_completed_at, 'updated_at', v_updated_at);
end;
$$;

revoke execute on function public.complete_report_revision(uuid, timestamptz) from public, anon;
grant execute on function public.complete_report_revision(uuid, timestamptz) to authenticated;


create or replace function public.start_report_correction(
  p_report_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_report record;
  v_latest record;
  v_revision_id uuid;
  v_updated_at timestamptz;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_reason is null or char_length(v_reason) > 500 then
    raise exception '수정 사유를 500자 이내로 입력해 주세요.' using errcode = 'RP005';
  end if;

  select r.id, r.organization_id, r.latest_completed_revision_id
  into v_report
  from public.reports r
  where r.id = p_report_id;

  if not found then
    raise exception '리포트를 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
  end if;

  if v_report.latest_completed_revision_id is null then
    raise exception '완료된 리포트가 있어야 수정본을 만들 수 있습니다.' using errcode = 'RP003';
  end if;

  if exists (select 1 from public.report_revisions rv where rv.report_id = v_report.id and rv.status = 'draft') then
    raise exception '이미 작성 중인 수정본이 있습니다.' using errcode = 'RP003';
  end if;

  select rv.id, rv.content into v_latest
  from public.report_revisions rv
  where rv.id = v_report.latest_completed_revision_id;

  insert into public.report_revisions (organization_id, report_id, correction_reason, content)
  values (v_report.organization_id, v_report.id, v_reason, v_latest.content)
  returning id, updated_at into v_revision_id, v_updated_at;

  insert into public.report_revision_media (organization_id, revision_id, media_id, sort_order)
  select m.organization_id, v_revision_id, m.media_id, m.sort_order
  from public.report_revision_media m
  join public.class_session_observation_media md on md.id = m.media_id
  where m.revision_id = v_latest.id
    and md.hidden_at is null
  order by m.sort_order;

  return jsonb_build_object('report_id', v_report.id, 'revision_id', v_revision_id, 'updated_at', v_updated_at);
end;
$$;

revoke execute on function public.start_report_correction(uuid, text) from public, anon;
grant execute on function public.start_report_correction(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 5. 숨김 · 다시 공개 (report_visibility_actions · DEC-043 · DEC-074 · DEC-102)
-- ---------------------------------------------------------------------

create table if not exists public.report_visibility_actions (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  report_id uuid not null,

  action text not null
    constraint report_visibility_actions_action_check
    check (action in ('hide', 'unhide')),

  reason text not null
    constraint report_visibility_actions_reason_check
    check (char_length(reason) <= 500 and btrim(reason) <> ''),

  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint report_visibility_actions_report_fk
    foreign key (report_id, organization_id)
    references public.reports (id, organization_id)
    on delete restrict
);

create or replace function private.apply_report_visibility_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report record;
begin
  select r.id, r.organization_id, r.hidden_at, r.latest_completed_revision_id
  into v_report
  from public.reports r
  where r.id = new.report_id
  for update;

  if not found or v_report.organization_id is distinct from new.organization_id then
    raise exception '리포트를 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
  end if;

  if not (
    private.has_org_role(v_report.organization_id, array['director'])
    or private.is_hq_admin()
  ) then
    raise exception '학부모 화면 숨김은 원장 또는 본사 운영 관리자만 할 수 있습니다.' using errcode = 'RP002';
  end if;

  new.reason := btrim(new.reason);
  new.actor_user_id := (select auth.uid());
  new.created_at := pg_catalog.clock_timestamp();

  if new.action = 'hide' then
    if v_report.hidden_at is not null then
      raise exception '이미 학부모 화면에서 숨긴 기록입니다.' using errcode = 'RP010';
    end if;
    update public.reports r
    set hidden_at = new.created_at, hidden_by = new.actor_user_id, hidden_reason = new.reason
    where r.id = v_report.id;
    perform private.record_audit_event(
      v_report.organization_id, 'report.hidden', 'report', v_report.id, new.reason, '{}'::jsonb
    );
  else
    if v_report.hidden_at is null then
      raise exception '숨긴 기록이 아닙니다.' using errcode = 'RP010';
    end if;
    update public.reports r
    set hidden_at = null, hidden_by = null, hidden_reason = null
    where r.id = v_report.id;
    perform private.record_audit_event(
      v_report.organization_id, 'report.unhidden', 'report', v_report.id, new.reason, '{}'::jsonb
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.apply_report_visibility_action() from public;

drop trigger if exists trg_report_visibility_actions_apply on public.report_visibility_actions;
create trigger trg_report_visibility_actions_apply
  before insert on public.report_visibility_actions
  for each row execute function private.apply_report_visibility_action();

create or replace function private.enforce_action_log_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception '처리 기록은 수정하거나 삭제할 수 없습니다.' using errcode = 'check_violation';
end;
$$;

revoke execute on function private.enforce_action_log_immutable() from public;

drop trigger if exists trg_report_visibility_actions_immutable on public.report_visibility_actions;
create trigger trg_report_visibility_actions_immutable
  before update or delete on public.report_visibility_actions
  for each row execute function private.enforce_action_log_immutable();

alter table public.report_visibility_actions enable row level security;
revoke all on public.report_visibility_actions from anon, authenticated;
grant select on public.report_visibility_actions to authenticated;
grant insert (organization_id, report_id, action, reason) on public.report_visibility_actions to authenticated;

drop policy if exists "report visibility actions readable" on public.report_visibility_actions;
create policy "report visibility actions readable"
  on public.report_visibility_actions
  for select
  to authenticated
  using (
    private.has_org_role(organization_id, array['director'])
    or (select private.is_hq_admin())
    or exists (
      select 1 from public.reports r
      where r.id = report_visibility_actions.report_id
        and private.is_assigned_class_teacher(r.class_id)
    )
  );

drop policy if exists "report visibility actions insert by director or hq admin" on public.report_visibility_actions;
create policy "report visibility actions insert by director or hq admin"
  on public.report_visibility_actions
  for insert
  to authenticated
  with check (
    private.has_org_role(organization_id, array['director'])
    or (select private.is_hq_admin())
  );


-- HQ Admin 이 숨김을 처리하려면 대상 리포트 행(메타)을 볼 수 있어야 한다.
drop policy if exists "reports metadata readable by hq admin" on public.reports;
create policy "reports metadata readable by hq admin"
  on public.reports
  for select
  to authenticated
  using ((select private.is_hq_admin()));


create or replace function private.request_report_visibility(
  p_report_id uuid,
  p_action text,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_reason is null or char_length(v_reason) > 500 then
    raise exception '사유를 500자 이내로 입력해 주세요.' using errcode = 'RP005';
  end if;

  select r.organization_id into v_org from public.reports r where r.id = p_report_id;
  if v_org is null then
    raise exception '리포트를 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
  end if;

  insert into public.report_visibility_actions (organization_id, report_id, action, reason)
  values (v_org, p_report_id, p_action, v_reason);

  return (
    select jsonb_build_object('report_id', r.id, 'hidden', r.hidden_at is not null, 'updated_at', r.updated_at)
    from public.reports r where r.id = p_report_id
  );
end;
$$;

revoke execute on function private.request_report_visibility(uuid, text, text) from public;
grant execute on function private.request_report_visibility(uuid, text, text) to authenticated;

create or replace function public.hide_report(p_report_id uuid, p_reason text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.request_report_visibility(p_report_id, 'hide', p_reason);
$$;

create or replace function public.unhide_report(p_report_id uuid, p_reason text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.request_report_visibility(p_report_id, 'unhide', p_reason);
$$;

revoke execute on function public.hide_report(uuid, text) from public, anon;
revoke execute on function public.unhide_report(uuid, text) from public, anon;
grant execute on function public.hide_report(uuid, text) to authenticated;
grant execute on function public.unhide_report(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 6. 학부모 표시 가능 여부 (저장하지 않고 계산 · DEC-074)
-- ---------------------------------------------------------------------

create or replace function private.report_parent_visible(p_report_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.reports r
    join public.organizations o on o.id = r.organization_id
    where r.id = p_report_id
      and r.latest_completed_revision_id is not null
      and r.hidden_at is null
      and r.report_type = 'weekly'
      and o.status = 'active'
      and private.org_has_feature(r.organization_id, 'parent_portal')
  );
$$;

revoke execute on function private.report_parent_visible(uuid) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 7. Child Portal 발급 · 중지 (Director · token hash 만 저장)
-- ---------------------------------------------------------------------

create or replace function private.enforce_child_portal_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_org_role(case when tg_op = 'INSERT' then new.organization_id else old.organization_id end,
                              array['director']) then
    raise exception '원장만 학부모 공유 링크를 관리할 수 있습니다.' using errcode = 'PT002';
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.children ch
      where ch.id = new.child_id
        and ch.organization_id = new.organization_id
        and ch.status = 'active'
    ) then
      raise exception '재원 중인 원아에게만 공유 링크를 만들 수 있습니다.' using errcode = 'PT001';
    end if;

    if not private.org_has_feature(new.organization_id, 'parent_portal')
      or private.org_service_mode(new.organization_id) <> 'active'
    then
      raise exception '현재 이용 상품 또는 이용 기간에서 공유 링크를 만들 수 없습니다.' using errcode = 'PT003';
    end if;

    new.status := 'active';
    new.issued_by := (select auth.uid());
    new.issued_at := pg_catalog.clock_timestamp();
    new.revoked_by := null;
    new.revoked_at := null;
    new.expires_at := null;
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id
    or new.child_id is distinct from old.child_id
    or new.public_id is distinct from old.public_id
    or new.token_hash is distinct from old.token_hash
    or new.issued_at is distinct from old.issued_at
    or new.issued_by is distinct from old.issued_by
    or new.expires_at is distinct from old.expires_at
  then
    raise exception '공유 링크 정보는 바꿀 수 없습니다.' using errcode = 'PT001';
  end if;

  if old.status = 'revoked' then
    raise exception '중지된 링크는 다시 켤 수 없습니다. 새 링크를 발급해 주세요.' using errcode = 'PT001';
  end if;

  if new.status = 'revoked' then
    new.revoked_at := pg_catalog.clock_timestamp();
    new.revoked_by := (select auth.uid());
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_child_portal_write() from public;

drop trigger if exists trg_child_portals_write_check on public.child_portals;
create trigger trg_child_portals_write_check
  before insert or update on public.child_portals
  for each row execute function private.enforce_child_portal_write();


create or replace function private.audit_child_portal_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.record_audit_event(new.organization_id, 'portal.issued', 'child', new.child_id, null,
                                       jsonb_build_object('portal_id', new.id));
  elsif new.status = 'revoked' and old.status = 'active' then
    perform private.record_audit_event(new.organization_id, 'portal.revoked', 'child', new.child_id, null,
                                       jsonb_build_object('portal_id', new.id));
  end if;
  return null;
end;
$$;

revoke execute on function private.audit_child_portal_change() from public;

drop trigger if exists trg_child_portals_audit on public.child_portals;
create trigger trg_child_portals_audit
  after insert or update on public.child_portals
  for each row execute function private.audit_child_portal_change();

grant insert (organization_id, child_id, token_hash) on public.child_portals to authenticated;
grant update (status) on public.child_portals to authenticated;

drop policy if exists "child portals insert by director" on public.child_portals;
create policy "child portals insert by director"
  on public.child_portals
  for insert
  to authenticated
  with check (private.has_org_role(organization_id, array['director']));

drop policy if exists "child portals revoke by director" on public.child_portals;
create policy "child portals revoke by director"
  on public.child_portals
  for update
  to authenticated
  using (private.has_org_role(organization_id, array['director']) and status = 'active')
  with check (private.has_org_role(organization_id, array['director']));


-- 발급 · 재발급: 기존 활성 링크를 중지하고 새 링크를 한 transaction 에서 만든다.
-- raw token 은 서버가 만들고 hash 만 넘긴다 (원문은 응답으로 1회만 · DB 저장 없음).
create or replace function public.issue_child_portal(
  p_child_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_portal record;
begin
  if p_child_id is null or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception '공유 링크 정보가 올바르지 않습니다.' using errcode = 'PT001';
  end if;

  select ch.organization_id into v_org from public.children ch where ch.id = p_child_id;
  if v_org is null then
    raise exception '원아를 찾을 수 없거나 권한이 없습니다.' using errcode = 'PT002';
  end if;

  update public.child_portals p
  set status = 'revoked'
  where p.child_id = p_child_id and p.status = 'active';

  insert into public.child_portals (organization_id, child_id, token_hash)
  values (v_org, p_child_id, p_token_hash)
  returning id, public_id, issued_at into v_portal;

  return jsonb_build_object('portal_id', v_portal.id, 'public_id', v_portal.public_id,
                            'issued_at', v_portal.issued_at);
end;
$$;

revoke execute on function public.issue_child_portal(uuid, text) from public, anon;
grant execute on function public.issue_child_portal(uuid, text) to authenticated;


create or replace function public.revoke_child_portal(p_portal_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revoked_at timestamptz;
begin
  update public.child_portals p
  set status = 'revoked'
  where p.id = p_portal_id and p.status = 'active'
  returning p.revoked_at into v_revoked_at;

  if not found then
    raise exception '공유 중인 링크를 찾을 수 없습니다.' using errcode = 'PT002';
  end if;

  return jsonb_build_object('portal_id', p_portal_id, 'revoked_at', v_revoked_at);
end;
$$;

revoke execute on function public.revoke_child_portal(uuid) from public, anon;
grant execute on function public.revoke_child_portal(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 8. read_child_portal (anon 전용 · 원인 무구분 실패 · 최소 DTO)
-- ---------------------------------------------------------------------
-- 반환: 실패 시 null. 성공 시
-- { organization_name, class_name, child_name,
--   this_week: [weekly…], past: [weekly…] }
-- weekly = { week_no, date_from, date_to, updated_on, content{…},
--            observed_moments: [지표명…] }
-- 내부 id · draft · raw Stage · consent · audit · AI 정보 · 사진은 없다.

create or replace function private.portal_weekly_dto(p_report_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'week_no', r.week_no,
    'date_from', (
      select min(s.scheduled_date) from public.class_sessions s
      where s.class_program_assignment_id = r.class_program_assignment_id
        and s.week_no = r.week_no and s.status <> 'cancelled'
    ),
    'date_to', (
      select max(s.scheduled_date) from public.class_sessions s
      where s.class_program_assignment_id = r.class_program_assignment_id
        and s.week_no = r.week_no and s.status <> 'cancelled'
    ),
    'updated_on', case when rv.revision_no > 1
      then to_char(rv.completed_at at time zone 'Asia/Seoul', 'YYYY.MM.DD') else null end,
    'content', rv.content,
    'observed_moments', coalesce((
      select jsonb_agg(gm.label order by gm.sort_order)
      from public.growth_metrics gm
      where gm.code in (
        select g ->> 'metric_code'
        from public.report_revision_evidence ev
        cross join lateral jsonb_array_elements(ev.growth_snapshot) g
        where ev.revision_id = rv.id
      )
    ), '[]'::jsonb)
  )
  from public.reports r
  join public.report_revisions rv on rv.id = r.latest_completed_revision_id
  where r.id = p_report_id;
$$;

revoke execute on function private.portal_weekly_dto(uuid) from public;


create or replace function public.read_child_portal(
  p_public_id uuid,
  p_token text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_portal record;
  v_week_start date := private.local_today() - ((extract(isodow from private.local_today())::integer) - 1);
  v_week_end date := v_week_start + 6;
  v_this_week jsonb;
  v_past jsonb;
begin
  if p_public_id is null or p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then
    return null;
  end if;

  select p.id, p.organization_id, p.child_id, o.name as organization_name,
         c.name as class_name, ch.name as child_name
  into v_portal
  from public.child_portals p
  join public.organizations o on o.id = p.organization_id
  join public.children ch on ch.id = p.child_id and ch.organization_id = p.organization_id
  left join public.classes c on c.id = ch.class_id
  where p.public_id = p_public_id
    and p.status = 'active'
    and (p.expires_at is null or p.expires_at > pg_catalog.clock_timestamp())
    and p.token_hash = pg_catalog.encode(
      pg_catalog.sha256(pg_catalog.convert_to(p_token, 'UTF8')), 'hex')
    and o.status = 'active'
    and private.org_has_feature(p.organization_id, 'parent_portal');

  if not found then
    return null;
  end if;

  -- 이번 주 (DEC-103): 현재 로컬 주간에 수업 일정이 있는 program week 의 visible Weekly
  select coalesce(jsonb_agg(private.portal_weekly_dto(r.id) order by r.week_no), '[]'::jsonb)
  into v_this_week
  from public.reports r
  where r.child_id = v_portal.child_id
    and r.organization_id = v_portal.organization_id
    and private.report_parent_visible(r.id)
    and exists (
      select 1 from public.class_sessions s
      where s.class_program_assignment_id = r.class_program_assignment_id
        and s.week_no = r.week_no
        and s.status <> 'cancelled'
        and s.scheduled_date between v_week_start and v_week_end
    );

  select coalesce(jsonb_agg(x.dto order by x.sort_date desc nulls last, (x.dto ->> 'week_no')::integer desc),
                  '[]'::jsonb)
  into v_past
  from (
    select private.portal_weekly_dto(r.id) as dto,
           (select max(s.scheduled_date) from public.class_sessions s
             where s.class_program_assignment_id = r.class_program_assignment_id
               and s.week_no = r.week_no) as sort_date
    from public.reports r
    where r.child_id = v_portal.child_id
      and r.organization_id = v_portal.organization_id
      and private.report_parent_visible(r.id)
      and not exists (
        select 1 from public.class_sessions s
        where s.class_program_assignment_id = r.class_program_assignment_id
          and s.week_no = r.week_no
          and s.status <> 'cancelled'
          and s.scheduled_date between v_week_start and v_week_end
      )
    -- 최근 기록부터 자른다 (정렬 없이 limit 하면 임의 200건이 남는다)
    order by sort_date desc nulls last, r.week_no desc
    limit 200
  ) x;

  return jsonb_build_object(
    'organization_name', v_portal.organization_name,
    'class_name', v_portal.class_name,
    'child_name', v_portal.child_name,
    'this_week', v_this_week,
    'past', v_past
  );
end;
$$;

revoke execute on function public.read_child_portal(uuid, text) from public, authenticated;
grant execute on function public.read_child_portal(uuid, text) to anon;
