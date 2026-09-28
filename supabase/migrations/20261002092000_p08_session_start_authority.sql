-- =====================================================================
-- PHASE 08 · WS8 (A3) — 수업 시작의 DB 최종 판정: Required Content Set
-- ---------------------------------------------------------------------
-- 근거: DEC-046 · DEC-085 · DEC-096 · PHASE 08 WS8
--
-- Required Content Set(DEC-096) 섹션이 없는 차시는 수업을 시작할 수 없다 (SS008). 기존 UI 가드
-- (/teacher/sessions/[id]/before)는 유지하고 DB 를 최종 판정으로 둔다.
-- 나머지 시작 조건은 이미 DB 가 판정한다:
--   예정 상태(SS003) · 담당 교사(SS002) · BEFORE 확인(SS004) · 반 기능 ∧ 서비스 모드 active ∧ 주차 entitlement(SS005)
--   · 배정 active · 반 active · 프로그램 · 차시 published (20260826 enforce_class_session_update)
-- scheduled_date 정책(예정일 전 · 후 시작 허용 여부)은 문서에 결정이 없어 만들지 않는다
-- (docs/08-security-hardening/open-items.md P08-OPEN-3).
--
-- WS7 (A2 · legacy 직접 status 변경)은 이 파일이 아니라:
--   · 서버: src/lib/staff/legacy-session-actions.ts (saas_v2 모드면 거부)
--   · DB: 20261002093000 §1 (계약 적용 기관의 직접 시작 · 완료는 반 쓰기 entitlement 필요)
--   · 완전 회수: M5 cutover (update(status) 회수)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. A3 — 시작 전환: Required Content Set 확인 추가 (나머지 본문은 20261001112000 과 같다)
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

  select s.id, s.organization_id, s.class_id, s.status, s.week_no, s.lesson_id
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
    -- PHASE 08 A3: 필수 수업 섹션(DEC-096 Required Content Set)이 모두 있어야 시작한다
    if exists (
      select 1
      from unnest(private.required_lesson_sections()) as req(code)
      where not exists (
        select 1 from public.lesson_sections ls
        where ls.lesson_id = v_session.lesson_id
          and ls.section_code = req.code
      )
    ) then
      raise exception '이 차시의 필수 수업 자료가 아직 준비되지 않아 수업을 시작할 수 없습니다. 본사에 문의해 주세요.'
        using errcode = 'SS008';
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
