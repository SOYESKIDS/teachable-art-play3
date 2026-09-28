-- =====================================================================
-- PHASE 07 · M3 — 신규 운영 write 경로
--   세션 전환 (start · finish · recovery · cancel) · BEFORE 확인 ·
--   빠른 메모 · Observation 2.0 + Growth5 · 사진 숨김/삭제 orchestration ·
--   사진 공유 기록 (consent 운영 상태)
-- ---------------------------------------------------------------------
-- 근거: DEC-036 · DEC-046 · DEC-047 · DEC-085 · DEC-086 · DEC-087 ·
--       DEC-088 · DEC-098 · DEC-099 · DEC-100 · Invariant AI-1 · AI-6
--
-- · public RPC 는 SECURITY INVOKER. 역할 · 상태 · entitlement 최종 검증은
--   SECURITY DEFINER trigger 가 한다 (enforce_* 패턴 · Invariant AI-4).
-- · scheduled → completed 는 어떤 경로로도 만들 수 없다.
-- · Director · HQ 에게 일반 finish 없음. Recovery 는 in_progress → completed
--   만 · 사유 필수 · audit.
-- · 기존 status 직접 UPDATE 권한은 아직 회수하지 않는다 (M5 cutover).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 세션 전환 (class_session_transitions BEFORE INSERT)
-- ---------------------------------------------------------------------

create or replace function private.apply_class_session_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_session record;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if v_actor is null then
    raise exception '로그인이 필요합니다.' using errcode = 'SS002';
  end if;

  select s.id, s.organization_id, s.class_id, s.status, s.week_no
  into v_session
  from public.class_sessions s
  where s.id = new.class_session_id
  for update;

  if not found
    or v_session.organization_id is distinct from new.organization_id
    or v_session.class_id is distinct from new.class_id
  then
    raise exception '수업을 찾을 수 없거나 접근 권한이 없습니다.' using errcode = 'SS002';
  end if;

  new.actor_user_id := v_actor;
  new.created_at := v_now;
  new.reason := nullif(btrim(coalesce(new.reason, '')), '');
  new.from_status := v_session.status;

  if new.transition = 'start' then
    if v_session.status <> 'scheduled' then
      raise exception '예정된 수업만 시작할 수 있습니다.' using errcode = 'SS003';
    end if;
    if not private.is_assigned_class_teacher(v_session.class_id) then
      raise exception '담당 교사만 수업을 시작할 수 있습니다.' using errcode = 'SS002';
    end if;
    if not exists (
      select 1 from public.session_before_confirmations b
      where b.class_session_id = v_session.id
    ) then
      raise exception '수업 전 필수 확인을 먼저 완료해 주세요.' using errcode = 'SS004';
    end if;
    if not private.class_write_allowed(v_session.class_id, 'class_mode')
      or v_session.week_no is null
      or not private.class_week_entitled(v_session.class_id, v_session.week_no)
    then
      raise exception '현재 이용 상품 또는 이용 기간에서 이 수업을 진행할 수 없습니다.'
        using errcode = 'SS005';
    end if;

    new.to_status := 'in_progress';

    update public.class_sessions s
    set status = 'in_progress',
        started_at = v_now,
        started_by = v_actor
    where s.id = v_session.id;

  elsif new.transition = 'finish' then
    if v_session.status <> 'in_progress' then
      raise exception '진행 중인 수업만 마칠 수 있습니다.' using errcode = 'SS003';
    end if;
    if not private.is_assigned_class_teacher(v_session.class_id) then
      raise exception '담당 교사만 수업을 마칠 수 있습니다.' using errcode = 'SS002';
    end if;

    new.to_status := 'completed';

    update public.class_sessions s
    set status = 'completed',
        finished_at = v_now,
        finished_by = v_actor,
        completion_kind = 'normal'
    where s.id = v_session.id;

  elsif new.transition = 'recovery_complete' then
    if v_session.status <> 'in_progress' then
      raise exception '복구 처리는 진행 중인 수업에만 할 수 있습니다.' using errcode = 'SS003';
    end if;
    if not (
      private.has_org_role(v_session.organization_id, array['director'])
      or private.is_hq_admin()
    ) then
      raise exception '복구 처리 권한이 없습니다.' using errcode = 'SS002';
    end if;
    if new.reason is null then
      raise exception '복구 처리 사유를 입력해 주세요.' using errcode = 'SS006';
    end if;

    new.to_status := 'completed';

    update public.class_sessions s
    set status = 'completed',
        finished_at = v_now,
        finished_by = v_actor,
        completion_kind = 'recovery',
        recovery_reason = new.reason
    where s.id = v_session.id;

    perform private.record_audit_event(
      v_session.organization_id, 'session.recovery_completed', 'class_session', v_session.id,
      new.reason, jsonb_build_object('from', 'in_progress', 'to', 'completed')
    );

  elsif new.transition = 'cancel' then
    -- 현재 확정 범위 유지: HQ Admin · 원장 · 담당 교사 (DEC-085 · 확대 없음)
    if v_session.status not in ('scheduled', 'in_progress') then
      raise exception '예정 또는 진행 중인 수업만 취소할 수 있습니다.' using errcode = 'SS003';
    end if;
    if not (
      private.is_hq_admin()
      or private.has_org_role(v_session.organization_id, array['director'])
      or private.is_assigned_class_teacher(v_session.class_id)
    ) then
      raise exception '수업을 취소할 권한이 없습니다.' using errcode = 'SS002';
    end if;

    new.to_status := 'cancelled';

    update public.class_sessions s
    set status = 'cancelled'
    where s.id = v_session.id;

    perform private.record_audit_event(
      v_session.organization_id, 'session.cancelled', 'class_session', v_session.id,
      new.reason, jsonb_build_object('from', v_session.status)
    );
  else
    raise exception '알 수 없는 수업 전환입니다.' using errcode = 'SS001';
  end if;

  return new;
end;
$$;

revoke execute on function private.apply_class_session_transition() from public;

drop trigger if exists trg_class_session_transitions_apply on public.class_session_transitions;
create trigger trg_class_session_transitions_apply
  before insert on public.class_session_transitions
  for each row execute function private.apply_class_session_transition();


create or replace function private.enforce_class_session_transition_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception '수업 전환 기록은 수정하거나 삭제할 수 없습니다.' using errcode = 'check_violation';
end;
$$;

revoke execute on function private.enforce_class_session_transition_immutable() from public;

drop trigger if exists trg_class_session_transitions_immutable on public.class_session_transitions;
create trigger trg_class_session_transitions_immutable
  before update or delete on public.class_session_transitions
  for each row execute function private.enforce_class_session_transition_immutable();


grant insert (organization_id, class_id, class_session_id, transition, reason)
  on public.class_session_transitions to authenticated;

drop policy if exists "session transitions insert by org staff or hq admin" on public.class_session_transitions;
create policy "session transitions insert by org staff or hq admin"
  on public.class_session_transitions
  for insert
  to authenticated
  with check (
    private.has_org_role(organization_id, array['director', 'teacher'])
    or (select private.is_hq_admin())
  );


create or replace function private.request_class_session_transition(
  p_session_id uuid,
  p_transition text,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session record;
begin
  if p_session_id is null then
    raise exception '수업 정보가 필요합니다.' using errcode = 'SS001';
  end if;

  select s.id, s.organization_id, s.class_id
  into v_session
  from public.class_sessions s
  where s.id = p_session_id;

  if not found then
    raise exception '수업을 찾을 수 없거나 접근 권한이 없습니다.' using errcode = 'SS002';
  end if;

  insert into public.class_session_transitions (
    organization_id, class_id, class_session_id, transition, reason
  )
  values (
    v_session.organization_id, v_session.class_id, v_session.id, p_transition,
    nullif(btrim(coalesce(p_reason, '')), '')
  );

  return (
    select jsonb_build_object(
      'session_id', s.id,
      'status', s.status,
      'completion_kind', s.completion_kind,
      'updated_at', s.updated_at
    )
    from public.class_sessions s
    where s.id = p_session_id
  );
end;
$$;

revoke execute on function private.request_class_session_transition(uuid, text, text) from public;
grant execute on function private.request_class_session_transition(uuid, text, text) to authenticated;


create or replace function public.start_class_session(p_session_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.request_class_session_transition(p_session_id, 'start', null);
$$;

create or replace function public.finish_class_session(p_session_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.request_class_session_transition(p_session_id, 'finish', null);
$$;

create or replace function public.recover_complete_class_session(p_session_id uuid, p_reason text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.request_class_session_transition(p_session_id, 'recovery_complete', p_reason);
$$;

create or replace function public.cancel_class_session(p_session_id uuid, p_reason text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.request_class_session_transition(p_session_id, 'cancel', p_reason);
$$;

revoke execute on function public.start_class_session(uuid) from public, anon;
revoke execute on function public.finish_class_session(uuid) from public, anon;
revoke execute on function public.recover_complete_class_session(uuid, text) from public, anon;
revoke execute on function public.cancel_class_session(uuid, text) from public, anon;
grant execute on function public.start_class_session(uuid) to authenticated;
grant execute on function public.finish_class_session(uuid) to authenticated;
grant execute on function public.recover_complete_class_session(uuid, text) to authenticated;
grant execute on function public.cancel_class_session(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 2. BEFORE 필수 확인 (DEC-036 · 서버 보존 · 세션 단위)
-- ---------------------------------------------------------------------

create or replace function private.enforce_before_confirmation_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session record;
begin
  select s.organization_id, s.class_id, s.status
  into v_session
  from public.class_sessions s
  where s.id = new.class_session_id;

  if not found
    or v_session.organization_id is distinct from new.organization_id
    or v_session.class_id is distinct from new.class_id
  then
    raise exception '수업을 찾을 수 없거나 접근 권한이 없습니다.' using errcode = 'SS002';
  end if;

  if v_session.status <> 'scheduled' then
    raise exception '시작 전 수업에만 필수 확인을 기록할 수 있습니다.' using errcode = 'SS003';
  end if;

  if not private.is_assigned_class_teacher(new.class_id) then
    raise exception '담당 교사만 필수 확인을 기록할 수 있습니다.' using errcode = 'SS002';
  end if;

  if not private.class_write_allowed(new.class_id, 'class_mode') then
    raise exception '현재 이용 상품 또는 이용 기간에서 이 수업을 진행할 수 없습니다.' using errcode = 'SS005';
  end if;

  new.confirmed_by := (select auth.uid());
  new.confirmed_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

revoke execute on function private.enforce_before_confirmation_insert() from public;

drop trigger if exists trg_before_confirmations_insert_check on public.session_before_confirmations;
create trigger trg_before_confirmations_insert_check
  before insert on public.session_before_confirmations
  for each row execute function private.enforce_before_confirmation_insert();

grant insert (organization_id, class_id, class_session_id, safety_confirmed, privacy_confirmed)
  on public.session_before_confirmations to authenticated;

drop policy if exists "before confirmations insert by assigned teacher" on public.session_before_confirmations;
create policy "before confirmations insert by assigned teacher"
  on public.session_before_confirmations
  for insert
  to authenticated
  with check (private.is_assigned_class_teacher(class_id));


create or replace function public.confirm_session_before(
  p_session_id uuid,
  p_safety_confirmed boolean,
  p_privacy_confirmed boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session record;
  v_confirmed_at timestamptz;
begin
  if p_safety_confirmed is not true or p_privacy_confirmed is not true then
    raise exception '안전 확인과 사진·개인정보 확인을 모두 완료해 주세요.' using errcode = 'SS004';
  end if;

  select s.id, s.organization_id, s.class_id
  into v_session
  from public.class_sessions s
  where s.id = p_session_id;

  if not found then
    raise exception '수업을 찾을 수 없거나 접근 권한이 없습니다.' using errcode = 'SS002';
  end if;

  insert into public.session_before_confirmations (
    organization_id, class_id, class_session_id, safety_confirmed, privacy_confirmed
  )
  values (v_session.organization_id, v_session.class_id, v_session.id, true, true)
  on conflict (class_session_id) do nothing;

  select b.confirmed_at into v_confirmed_at
  from public.session_before_confirmations b
  where b.class_session_id = v_session.id;

  return jsonb_build_object('session_id', v_session.id, 'confirmed_at', v_confirmed_at);
end;
$$;

revoke execute on function public.confirm_session_before(uuid, boolean, boolean) from public, anon;
grant execute on function public.confirm_session_before(uuid, boolean, boolean) to authenticated;


-- ---------------------------------------------------------------------
-- 3. 빠른 메모 (author only · server Source of Truth)
-- ---------------------------------------------------------------------

create or replace function private.enforce_quick_memo_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session record;
begin
  if tg_op = 'INSERT' then
    select s.organization_id, s.class_id, s.status
    into v_session
    from public.class_sessions s
    where s.id = new.class_session_id;

    if not found
      or v_session.organization_id is distinct from new.organization_id
      or v_session.class_id is distinct from new.class_id
    then
      raise exception '수업을 찾을 수 없거나 접근 권한이 없습니다.' using errcode = 'QM002';
    end if;

    if v_session.status = 'cancelled' then
      raise exception '취소된 수업에는 메모를 남길 수 없습니다.' using errcode = 'QM003';
    end if;

    if not private.is_assigned_class_teacher(new.class_id) then
      raise exception '담당 교사만 메모를 남길 수 있습니다.' using errcode = 'QM002';
    end if;

    if not private.class_write_allowed(new.class_id, 'class_mode') then
      raise exception '현재 이용 상품 또는 이용 기간에서 메모를 남길 수 없습니다.' using errcode = 'QM004';
    end if;

    new.author_user_id := (select auth.uid());
  else
    if new.author_user_id is distinct from old.author_user_id
      or new.class_session_id is distinct from old.class_session_id
      or new.organization_id is distinct from old.organization_id
      or new.class_id is distinct from old.class_id
      or new.created_at is distinct from old.created_at
    then
      raise exception '메모의 작성자 · 수업은 바꿀 수 없습니다.' using errcode = 'QM001';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_quick_memo_write() from public;

drop trigger if exists trg_quick_memos_write_check on public.quick_memos;
create trigger trg_quick_memos_write_check
  before insert or update on public.quick_memos
  for each row execute function private.enforce_quick_memo_write();

grant insert (organization_id, class_id, class_session_id, body) on public.quick_memos to authenticated;
grant update (body) on public.quick_memos to authenticated;
grant delete on public.quick_memos to authenticated;

drop policy if exists "quick memos insert by author" on public.quick_memos;
create policy "quick memos insert by author"
  on public.quick_memos
  for insert
  to authenticated
  with check (private.is_assigned_class_teacher(class_id));

drop policy if exists "quick memos update by author" on public.quick_memos;
create policy "quick memos update by author"
  on public.quick_memos
  for update
  to authenticated
  using (author_user_id = (select auth.uid()))
  with check (author_user_id = (select auth.uid()));

drop policy if exists "quick memos delete by author" on public.quick_memos;
create policy "quick memos delete by author"
  on public.quick_memos
  for delete
  to authenticated
  using (author_user_id = (select auth.uid()));


create or replace function public.save_quick_memo(
  p_session_id uuid,
  p_body text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_max_body constant integer := 2000;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_session record;
  v_memo_id uuid;
  v_updated_at timestamptz;
begin
  if p_session_id is null then
    raise exception '수업 정보가 필요합니다.' using errcode = 'QM001';
  end if;

  if v_body is not null and char_length(v_body) > c_max_body then
    raise exception '메모는 %자 이내로 입력해 주세요.', c_max_body using errcode = 'QM001';
  end if;

  select s.id, s.organization_id, s.class_id
  into v_session
  from public.class_sessions s
  where s.id = p_session_id;

  if not found then
    raise exception '수업을 찾을 수 없거나 접근 권한이 없습니다.' using errcode = 'QM002';
  end if;

  select m.id, m.updated_at into v_memo_id, v_updated_at
  from public.quick_memos m
  where m.class_session_id = p_session_id
    and m.author_user_id = (select auth.uid());

  if v_memo_id is null then
    if v_body is null then
      return jsonb_build_object('memo_id', null, 'updated_at', null, 'deleted', true);
    end if;
    insert into public.quick_memos (organization_id, class_id, class_session_id, body)
    values (v_session.organization_id, v_session.class_id, v_session.id, v_body)
    returning id, updated_at into v_memo_id, v_updated_at;
    return jsonb_build_object('memo_id', v_memo_id, 'updated_at', v_updated_at, 'deleted', false);
  end if;

  if p_expected_updated_at is null or v_updated_at <> p_expected_updated_at then
    raise exception '다른 기기에서 메모가 먼저 바뀌었습니다. 최신 내용을 다시 불러와 확인해 주세요.'
      using errcode = 'QM005';
  end if;

  if v_body is null then
    delete from public.quick_memos m where m.id = v_memo_id;
    return jsonb_build_object('memo_id', null, 'updated_at', null, 'deleted', true);
  end if;

  update public.quick_memos m
  set body = v_body
  where m.id = v_memo_id
    and m.updated_at = p_expected_updated_at
  returning m.updated_at into v_updated_at;

  if not found then
    raise exception '다른 기기에서 메모가 먼저 바뀌었습니다. 최신 내용을 다시 불러와 확인해 주세요.'
      using errcode = 'QM005';
  end if;

  return jsonb_build_object('memo_id', v_memo_id, 'updated_at', v_updated_at, 'deleted', false);
end;
$$;

revoke execute on function public.save_quick_memo(uuid, text, timestamptz) from public, anon;
grant execute on function public.save_quick_memo(uuid, text, timestamptz) to authenticated;


-- ---------------------------------------------------------------------
-- 4. Observation 2.0 · Growth5 (DEC-086 · DEC-099 · DEC-100)
-- ---------------------------------------------------------------------

-- taxonomy 는 만든 뒤 바꿀 수 없다 · Growth5 선택은 growth5 관찰에만 ·
-- 구 영역 링크는 legacy 관찰에만 (DI-14)
create or replace function private.enforce_observation_taxonomy_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.taxonomy is distinct from old.taxonomy then
    raise exception '관찰 기록 형식은 바꿀 수 없습니다.' using errcode = 'OB006';
  end if;
  return new;
end;
$$;

revoke execute on function private.enforce_observation_taxonomy_immutable() from public;

drop trigger if exists trg_observations_taxonomy_immutable on public.class_session_observations;
create trigger trg_observations_taxonomy_immutable
  before update on public.class_session_observations
  for each row execute function private.enforce_observation_taxonomy_immutable();


create or replace function private.enforce_growth_selection_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_observation record;
begin
  if tg_op = 'UPDATE' then
    raise exception '관찰 포인트 선택은 수정하지 않고 다시 저장합니다.' using errcode = 'GM001';
  end if;

  select o.id, o.organization_id, o.class_id, o.taxonomy
  into v_observation
  from public.class_session_observations o
  where o.id = case when tg_op = 'DELETE' then old.observation_id else new.observation_id end;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if not found or v_observation.organization_id is distinct from new.organization_id then
    raise exception '관찰기록을 찾을 수 없거나 접근 권한이 없습니다.' using errcode = 'GM002';
  end if;

  if v_observation.taxonomy <> 'growth5' then
    raise exception '이전 형식 관찰기록에는 관찰 포인트를 기록할 수 없습니다.' using errcode = 'GM003';
  end if;

  if not exists (
    select 1 from public.growth_metrics g
    where g.code = new.metric_code and g.is_active = true
  ) then
    raise exception '사용할 수 없는 관찰 포인트입니다.' using errcode = 'GM004';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_growth_selection_write() from public;

drop trigger if exists trg_growth_selections_write_check on public.observation_growth_selections;
create trigger trg_growth_selections_write_check
  before insert or update or delete on public.observation_growth_selections
  for each row execute function private.enforce_growth_selection_write();

grant insert (organization_id, observation_id, metric_code, stage)
  on public.observation_growth_selections to authenticated;
grant delete on public.observation_growth_selections to authenticated;

drop policy if exists "growth selections insert by assigned teacher" on public.observation_growth_selections;
create policy "growth selections insert by assigned teacher"
  on public.observation_growth_selections
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.class_session_observations o
      where o.id = observation_growth_selections.observation_id
        and o.organization_id = observation_growth_selections.organization_id
        and private.is_assigned_class_teacher(o.class_id)
    )
  );

drop policy if exists "growth selections delete by assigned teacher" on public.observation_growth_selections;
create policy "growth selections delete by assigned teacher"
  on public.observation_growth_selections
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.class_session_observations o
      where o.id = observation_growth_selections.observation_id
        and private.is_assigned_class_teacher(o.class_id)
    )
  );


create or replace function private.enforce_legacy_domain_link_taxonomy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.class_session_observations o
    where o.id = new.observation_id and o.taxonomy = 'growth5'
  ) then
    raise exception 'Growth5 관찰기록에는 이전 관찰영역을 기록할 수 없습니다.' using errcode = 'OB006';
  end if;
  return new;
end;
$$;

revoke execute on function private.enforce_legacy_domain_link_taxonomy() from public;

drop trigger if exists trg_observation_domains_taxonomy_check on public.class_session_observation_domains;
create trigger trg_observation_domains_taxonomy_check
  before insert on public.class_session_observation_domains
  for each row execute function private.enforce_legacy_domain_link_taxonomy();


grant insert (taxonomy) on public.class_session_observations to authenticated;


-- Observation 2.0 저장. 관찰 본문 · Growth5 선택을 원자적으로 교체한다.
-- p_growth: [ { "metric_code": "...", "stage": "together|after_modeling|independent" } ]
-- 행이 없으면 = 기록 없음. stage 없는 선택은 거부 (DEC-086 · DEC-100).
create or replace function public.save_class_observation(
  p_session_id uuid,
  p_child_id uuid,
  p_teacher_note text,
  p_child_voice text,
  p_record_status text,
  p_growth jsonb,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_max_child_voice constant integer := 1000;
  c_max_teacher_note constant integer := 2000;
  v_teacher_note text := nullif(btrim(coalesce(p_teacher_note, '')), '');
  v_child_voice text := nullif(btrim(coalesce(p_child_voice, '')), '');
  v_status text := btrim(coalesce(p_record_status, ''));
  v_growth jsonb := coalesce(p_growth, '[]'::jsonb);
  v_session record;
  v_observation record;
  v_observation_id uuid;
  v_updated_at timestamptz;
  v_count integer;
begin
  if p_session_id is null or p_child_id is null then
    raise exception '수업과 원아 정보가 필요합니다.' using errcode = 'OB001';
  end if;

  if v_status not in ('draft', 'complete') then
    raise exception '작성 상태 값이 올바르지 않습니다.' using errcode = 'OB001';
  end if;

  if v_teacher_note is not null and char_length(v_teacher_note) > c_max_teacher_note then
    raise exception '교사 관찰은 %자 이내로 입력해 주세요.', c_max_teacher_note using errcode = 'OB001';
  end if;

  if v_child_voice is not null and char_length(v_child_voice) > c_max_child_voice then
    raise exception '아이의 말은 %자 이내로 입력해 주세요.', c_max_child_voice using errcode = 'OB001';
  end if;

  if v_status = 'complete' and v_teacher_note is null and v_child_voice is null then
    raise exception '관찰 완료에는 교사 관찰 또는 아이의 말이 필요합니다.' using errcode = 'OB001';
  end if;

  if jsonb_typeof(v_growth) <> 'array' or jsonb_array_length(v_growth) > 5 then
    raise exception '관찰 포인트 형식이 올바르지 않습니다.' using errcode = 'GM001';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_growth) e
    where jsonb_typeof(e) <> 'object'
       or nullif(btrim(coalesce(e ->> 'metric_code', '')), '') is null
  ) then
    raise exception '관찰 포인트 형식이 올바르지 않습니다.' using errcode = 'GM001';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_growth) e
    where coalesce(e ->> 'stage', '') not in ('together', 'after_modeling', 'independent')
  ) then
    raise exception '방식을 선택하거나 이 관찰 포인트 선택을 해제해 주세요.' using errcode = 'GM005';
  end if;

  select count(distinct e ->> 'metric_code') into v_count
  from jsonb_array_elements(v_growth) e;

  if v_count <> jsonb_array_length(v_growth) then
    raise exception '같은 관찰 포인트가 두 번 이상 선택되었습니다.' using errcode = 'GM001';
  end if;

  select s.id, s.organization_id, s.class_id, s.status
  into v_session
  from public.class_sessions s
  where s.id = p_session_id;

  if not found then
    raise exception '수업을 찾을 수 없거나 접근 권한이 없습니다.' using errcode = 'OB002';
  end if;

  if v_session.status not in ('in_progress', 'completed') then
    raise exception '진행 중이거나 종료된 수업에만 관찰을 기록할 수 있습니다.' using errcode = 'OB003';
  end if;

  if not private.class_write_allowed(v_session.class_id, 'class_mode') then
    raise exception '현재 이용 상품 또는 이용 기간에서 관찰을 기록할 수 없습니다.' using errcode = 'OB007';
  end if;

  select o.id, o.updated_at, o.taxonomy
  into v_observation
  from public.class_session_observations o
  where o.class_session_id = p_session_id
    and o.child_id = p_child_id;

  if v_observation.id is null then
    if p_expected_updated_at is not null then
      raise exception '관찰기록을 찾을 수 없거나 접근 권한이 없습니다.' using errcode = 'OB002';
    end if;

    insert into public.class_session_observations (
      organization_id, class_session_id, class_id, child_id,
      child_voice, teacher_note, record_status, taxonomy
    )
    values (
      v_session.organization_id, v_session.id, v_session.class_id, p_child_id,
      v_child_voice, v_teacher_note, v_status, 'growth5'
    )
    returning id, updated_at into v_observation_id, v_updated_at;
  else
    if v_observation.taxonomy <> 'growth5' then
      raise exception '이전 형식 관찰기록은 이 화면에서 수정할 수 없습니다.' using errcode = 'OB006';
    end if;

    if p_expected_updated_at is null or v_observation.updated_at <> p_expected_updated_at then
      raise exception '다른 선생님이 먼저 내용을 변경했습니다. 최신 내용을 다시 불러와 확인해 주세요.'
        using errcode = 'OB004';
    end if;

    update public.class_session_observations o
    set child_voice = v_child_voice,
        teacher_note = v_teacher_note,
        record_status = v_status
    where o.id = v_observation.id
      and o.updated_at = p_expected_updated_at
    returning o.id, o.updated_at into v_observation_id, v_updated_at;

    if not found then
      raise exception '다른 선생님이 먼저 내용을 변경했습니다. 최신 내용을 다시 불러와 확인해 주세요.'
        using errcode = 'OB004';
    end if;

    delete from public.observation_growth_selections g
    where g.observation_id = v_observation_id;
  end if;

  insert into public.observation_growth_selections (organization_id, observation_id, metric_code, stage)
  select v_session.organization_id, v_observation_id, e ->> 'metric_code', e ->> 'stage'
  from jsonb_array_elements(v_growth) e;

  return jsonb_build_object(
    'observation_id', v_observation_id,
    'record_status', v_status,
    'updated_at', v_updated_at,
    'growth', (
      select coalesce(jsonb_agg(jsonb_build_object('metric_code', g.metric_code, 'stage', g.stage)
                                order by gm.sort_order), '[]'::jsonb)
      from public.observation_growth_selections g
      join public.growth_metrics gm on gm.code = g.metric_code
      where g.observation_id = v_observation_id
    )
  );
end;
$$;

revoke execute on function public.save_class_observation(uuid, uuid, text, text, text, jsonb, timestamptz)
  from public, anon;
grant execute on function public.save_class_observation(uuid, uuid, text, text, text, jsonb, timestamptz)
  to authenticated;


-- ---------------------------------------------------------------------
-- 5. 사진 숨김 · Storage 정리 orchestration (DEC-088 · DEC-107)
-- ---------------------------------------------------------------------
-- 1) hide_observation_media: metadata 숨김 (즉시 조회 · 서명 제외)
-- 2) 서버가 사용자 세션으로 Storage 객체 삭제 (아래 storage DELETE 정책)
-- 3) mark_observation_media_storage: 삭제 결과 기록 (실패 시 재시도 가능)
-- 보존 · 법적 삭제 시점은 CO-2 (여기서 정하지 않는다).

create or replace function private.enforce_observation_media_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.class_session_id is distinct from old.class_session_id
    or new.class_id is distinct from old.class_id
    or new.child_id is distinct from old.child_id
    or new.storage_path is distinct from old.storage_path
    or new.mime_type is distinct from old.mime_type
    or new.byte_size is distinct from old.byte_size
    or new.created_at is distinct from old.created_at
  then
    raise exception '사진 정보는 바꿀 수 없습니다.' using errcode = 'MD001';
  end if;

  if not (
    private.has_org_role(old.organization_id, array['director'])
    or private.is_assigned_class_teacher(old.class_id)
  ) then
    raise exception '사진을 숨길 권한이 없습니다.' using errcode = 'MD002';
  end if;

  if old.hidden_at is null and new.hidden_at is not null then
    new.hidden_at := pg_catalog.clock_timestamp();
    new.hidden_by := (select auth.uid());
    new.storage_status := 'delete_pending';
    new.storage_status_updated_at := new.hidden_at;
    perform private.record_audit_event(
      old.organization_id, 'media.hidden', 'observation_media', old.id, null, '{}'::jsonb
    );
    return new;
  end if;

  if old.hidden_at is not null and new.hidden_at is null then
    raise exception '숨긴 사진은 다시 표시할 수 없습니다.' using errcode = 'MD003';
  end if;

  new.hidden_at := old.hidden_at;
  new.hidden_by := old.hidden_by;

  if new.storage_status is distinct from old.storage_status then
    if old.hidden_at is null
      or not (
        (old.storage_status in ('delete_pending', 'delete_failed')
          and new.storage_status in ('deleted', 'delete_failed'))
      )
    then
      raise exception '사진 정리 상태를 바꿀 수 없습니다.' using errcode = 'MD003';
    end if;
    new.storage_status_updated_at := pg_catalog.clock_timestamp();
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_observation_media_update() from public;

drop trigger if exists trg_observation_media_update_check on public.class_session_observation_media;
create trigger trg_observation_media_update_check
  before update on public.class_session_observation_media
  for each row execute function private.enforce_observation_media_update();

grant update (hidden_at, storage_status) on public.class_session_observation_media to authenticated;

drop policy if exists "observation media hide by staff" on public.class_session_observation_media;
create policy "observation media hide by staff"
  on public.class_session_observation_media
  for update
  to authenticated
  using (
    private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  )
  with check (
    private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );


create or replace function public.hide_observation_media(p_media_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_path text;
  v_status text;
begin
  update public.class_session_observation_media m
  set hidden_at = pg_catalog.clock_timestamp()
  where m.id = p_media_id
    and m.hidden_at is null
  returning m.storage_path, m.storage_status into v_path, v_status;

  if not found then
    select m.storage_path, m.storage_status into v_path, v_status
    from public.class_session_observation_media m
    where m.id = p_media_id and m.hidden_at is not null;

    if not found then
      raise exception '사진을 찾을 수 없거나 권한이 없습니다.' using errcode = 'MD002';
    end if;
  end if;

  -- storage_path 는 서버 orchestration 에만 쓴다 (화면 · 로그 출력 금지)
  return jsonb_build_object('media_id', p_media_id, 'storage_path', v_path, 'storage_status', v_status);
end;
$$;

revoke execute on function public.hide_observation_media(uuid) from public, anon;
grant execute on function public.hide_observation_media(uuid) to authenticated;


create or replace function public.mark_observation_media_storage(
  p_media_id uuid,
  p_deleted boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
begin
  update public.class_session_observation_media m
  set storage_status = case when p_deleted then 'deleted' else 'delete_failed' end
  where m.id = p_media_id
    and m.hidden_at is not null
    and m.storage_status in ('delete_pending', 'delete_failed')
  returning m.storage_status into v_status;

  if not found then
    raise exception '정리할 사진을 찾을 수 없습니다.' using errcode = 'MD002';
  end if;

  return jsonb_build_object('media_id', p_media_id, 'storage_status', v_status);
end;
$$;

revoke execute on function public.mark_observation_media_storage(uuid, boolean) from public, anon;
grant execute on function public.mark_observation_media_storage(uuid, boolean) to authenticated;


create or replace function private.can_delete_observation_media_object(p_name text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_session_observation_media m
    where m.storage_path = p_name
      and m.hidden_at is not null
      and m.storage_status in ('delete_pending', 'delete_failed')
      and (
        private.has_org_role(m.organization_id, array['director'])
        or private.is_assigned_class_teacher(m.class_id)
      )
  );
$$;

revoke execute on function private.can_delete_observation_media_object(text) from public;
grant execute on function private.can_delete_observation_media_object(text) to authenticated;

drop policy if exists "observation media objects delete when hidden" on storage.objects;
create policy "observation media objects delete when hidden"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'observation-media'
    and private.can_delete_observation_media_object(name)
  );


-- ---------------------------------------------------------------------
-- 6. 사진 공유 기록 (운영 consent 상태 · DEC-059 · DEC-088 · DEC-107)
-- ---------------------------------------------------------------------

create or replace function private.enforce_media_consent_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_org_role(new.organization_id, array['director']) then
    raise exception '원장만 사진 공유 기록을 남길 수 있습니다.' using errcode = 'CS002';
  end if;

  if tg_op = 'UPDATE' and (
    new.child_id is distinct from old.child_id
    or new.organization_id is distinct from old.organization_id
  ) then
    raise exception '대상 원아는 바꿀 수 없습니다.' using errcode = 'CS001';
  end if;

  new.recorded_by := (select auth.uid());
  new.recorded_at := pg_catalog.clock_timestamp();

  perform private.record_audit_event(
    new.organization_id, 'consent.recorded', 'child', new.child_id, null,
    jsonb_build_object('status', new.status)
  );

  return new;
end;
$$;

revoke execute on function private.enforce_media_consent_write() from public;

drop trigger if exists trg_media_consents_write_check on public.child_media_consents;
create trigger trg_media_consents_write_check
  before insert or update on public.child_media_consents
  for each row execute function private.enforce_media_consent_write();

grant insert (organization_id, child_id, status, evidence_ref) on public.child_media_consents to authenticated;
grant update (status, evidence_ref) on public.child_media_consents to authenticated;

drop policy if exists "media consents insert by director" on public.child_media_consents;
create policy "media consents insert by director"
  on public.child_media_consents
  for insert
  to authenticated
  with check (private.has_org_role(organization_id, array['director']));

drop policy if exists "media consents update by director" on public.child_media_consents;
create policy "media consents update by director"
  on public.child_media_consents
  for update
  to authenticated
  using (private.has_org_role(organization_id, array['director']))
  with check (private.has_org_role(organization_id, array['director']));


create or replace function public.record_media_consent(
  p_child_id uuid,
  p_status text,
  p_evidence_ref text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_status text := btrim(coalesce(p_status, ''));
  v_ref text := nullif(btrim(coalesce(p_evidence_ref, '')), '');
  v_updated_at timestamptz;
begin
  if v_status not in ('unknown', 'consented', 'declined') then
    raise exception '사진 공유 기록 값이 올바르지 않습니다.' using errcode = 'CS001';
  end if;

  if v_ref is not null and char_length(v_ref) > 200 then
    raise exception '참고 메모는 200자 이내로 입력해 주세요.' using errcode = 'CS001';
  end if;

  select ch.organization_id into v_org
  from public.children ch
  where ch.id = p_child_id;

  if v_org is null then
    raise exception '원아를 찾을 수 없거나 권한이 없습니다.' using errcode = 'CS002';
  end if;

  insert into public.child_media_consents (organization_id, child_id, status, evidence_ref)
  values (v_org, p_child_id, v_status, v_ref)
  on conflict (child_id) do update
    set status = excluded.status,
        evidence_ref = excluded.evidence_ref
  returning updated_at into v_updated_at;

  return jsonb_build_object('child_id', p_child_id, 'status', v_status, 'updated_at', v_updated_at);
end;
$$;

revoke execute on function public.record_media_consent(uuid, text, text) from public, anon;
grant execute on function public.record_media_consent(uuid, text, text) to authenticated;
