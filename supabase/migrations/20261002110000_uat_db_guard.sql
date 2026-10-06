-- =====================================================================
-- PHASE UAT-DB-GUARD — 미래 수업 쓰기 금지 · 학부모 공유 신규 발급 잠금 (DB 최종 판정)
-- ---------------------------------------------------------------------
-- 근거: PHASE UAT-STABILIZATION (앱 guardSessionWrite · PARENT_SHARING_RELEASED) · CO-12 · DEC-092
-- 문서: docs/11-production-readiness/uat-db-guard.md
--
-- 문제
--   앱 서버 행동은 미래 수업 쓰기와 학부모 공유 링크 신규 발급을 막지만, 로그인 사용자가
--   PostgREST 로 RPC · 표를 직접 부르면 그 가드를 지나간다. DB 에는 예정일을 오늘과 비교하는
--   규칙이 없었고(class_sessions.scheduled_date), child_portals INSERT 는 org_has_feature 만 본다.
--
-- 규칙
--   1. 예정일(scheduled_date)이 서비스 기준 오늘(private.local_today() · Asia/Seoul)보다 뒤인 수업에는
--      수업 시작 · 마치기 · 시작 전 확인 · 빠른 메모 · 출결 · 관찰 · 관찰영역 · Growth5 선택 ·
--      AI 초안 · 사진 metadata · Storage 사진 업로드를 쓰지 않는다 (SS009).
--      예정일이 없는(NULL) 수업 · 오늘 · 지난 수업은 기존 규칙 그대로다. 취소 · 복구 처리는 바꾸지 않는다.
--   2. 학부모 공유 신규 발급(child_portals INSERT — RPC issue_child_portal · 직접 INSERT 공통)은
--      platform_capabilities 의 parent_portal 이 출시되기 전까지 거부한다 (PT004).
--      기존 링크 조회 · 중지(revoke · UPDATE) · 동의 기록 · 기존 데이터는 바꾸지 않는다.
--
-- ★ 권한을 넓히지 않는다. 새 판정은 "거부" 만 더한다 — 기존 RLS · 정책 · grant · 함수 본문은 그대로다
--   (Storage helper 하나만 같은 본문에 조건 한 줄을 더해 다시 정의한다).
-- ★ 기존 오류 코드를 바꾸지 않는다. 새 trigger 이름은 trg_zz_* 로, 같은 시점(BEFORE)의 기존 trigger 가
--   모두 먼저 실행된 뒤 마지막에 판정한다 (Postgres 는 trigger 이름 순서로 실행한다).
-- ★ 출시: 미래 수업 규칙은 운영 정책 그대로 유지. 학부모 공유는 HQ 기능 출시(capability release ·
--   blocked_by 비움)로 열린다 — 별도 migration 이 필요 없다.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 미래 수업 판정 helper
-- ---------------------------------------------------------------------
-- 예정일 > 서비스 기준 오늘. 수업이 없거나 예정일이 NULL 이면 false (기존 규칙에 맡긴다).

create or replace function private.is_future_session(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (
      select s.scheduled_date > private.local_today()
      from public.class_sessions s
      where s.id = p_session_id
    ),
    false
  );
$$;

revoke execute on function private.is_future_session(uuid) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. 미래 수업 쓰기 거부 trigger (공통 함수 · 표마다 BEFORE trigger)
-- ---------------------------------------------------------------------

create or replace function private.reject_future_session_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  if tg_table_name = 'class_sessions' then
    -- 직접 status UPDATE (M5 전 legacy 경로 포함) 와 transition trigger 의 UPDATE 모두.
    -- 시작 · 완료로 바뀌는 것만 막는다 — 취소 · 일정 변경은 기존 규칙 그대로.
    if old.status = 'scheduled'
      and new.status in ('in_progress', 'completed')
      and new.scheduled_date is not null
      and new.scheduled_date > private.local_today()
    then
      raise exception '수업일에 열립니다.' using errcode = 'SS009';
    end if;
    return new;
  end if;

  if tg_table_name = 'class_session_transitions' then
    -- 시작 · 마치기만. cancel · recovery_complete 는 기존 정책 그대로.
    if new.transition not in ('start', 'finish') then
      return new;
    end if;
    v_session_id := new.class_session_id;
  elsif tg_table_name in ('observation_growth_selections', 'class_session_observation_domains') then
    select o.class_session_id into v_session_id
    from public.class_session_observations o
    where o.id = new.observation_id;
  else
    v_session_id := new.class_session_id;
  end if;

  if v_session_id is not null and private.is_future_session(v_session_id) then
    raise exception '수업일에 열립니다.' using errcode = 'SS009';
  end if;

  return new;
end;
$$;

revoke execute on function private.reject_future_session_write() from public, anon, authenticated;

-- 수업 상태 (직접 UPDATE · transition trigger 의 UPDATE)
drop trigger if exists trg_zz_future_session_guard on public.class_sessions;
create trigger trg_zz_future_session_guard
  before update of status on public.class_sessions
  for each row execute function private.reject_future_session_write();

-- 수업 시작 · 마치기 요청 (RPC start/finish_class_session · 직접 INSERT 공통)
drop trigger if exists trg_zz_future_session_guard on public.class_session_transitions;
create trigger trg_zz_future_session_guard
  before insert on public.class_session_transitions
  for each row execute function private.reject_future_session_write();

-- 시작 전 확인
drop trigger if exists trg_zz_future_session_guard on public.session_before_confirmations;
create trigger trg_zz_future_session_guard
  before insert on public.session_before_confirmations
  for each row execute function private.reject_future_session_write();

-- 빠른 메모
drop trigger if exists trg_zz_future_session_guard on public.quick_memos;
create trigger trg_zz_future_session_guard
  before insert or update on public.quick_memos
  for each row execute function private.reject_future_session_write();

-- 출결 (RPC save_class_session_attendance_atomic · 직접 INSERT/UPDATE 공통)
drop trigger if exists trg_zz_future_session_guard on public.class_session_attendance;
create trigger trg_zz_future_session_guard
  before insert or update on public.class_session_attendance
  for each row execute function private.reject_future_session_write();

-- 관찰 (Growth5 · legacy 형식 · RPC · 직접 DML 공통)
drop trigger if exists trg_zz_future_session_guard on public.class_session_observations;
create trigger trg_zz_future_session_guard
  before insert or update on public.class_session_observations
  for each row execute function private.reject_future_session_write();

-- Growth5 선택 · legacy 관찰영역 연결 (관찰 행을 거쳐 수업을 찾는다 · INSERT 만 — 연쇄 삭제는 그대로)
drop trigger if exists trg_zz_future_session_guard on public.observation_growth_selections;
create trigger trg_zz_future_session_guard
  before insert on public.observation_growth_selections
  for each row execute function private.reject_future_session_write();

drop trigger if exists trg_zz_future_session_guard on public.class_session_observation_domains;
create trigger trg_zz_future_session_guard
  before insert on public.class_session_observation_domains
  for each row execute function private.reject_future_session_write();

-- AI 초안
drop trigger if exists trg_zz_future_session_guard on public.class_session_observation_ai_drafts;
create trigger trg_zz_future_session_guard
  before insert on public.class_session_observation_ai_drafts
  for each row execute function private.reject_future_session_write();

-- 사진 metadata (숨김 · 저장 상태 UPDATE 는 기존 규칙 그대로 — INSERT 만)
drop trigger if exists trg_zz_future_session_guard on public.class_session_observation_media;
create trigger trg_zz_future_session_guard
  before insert on public.class_session_observation_media
  for each row execute function private.reject_future_session_write();


-- ---------------------------------------------------------------------
-- 3. Storage 사진 업로드 — 정책 helper 에 미래 수업 조건 한 줄
-- ---------------------------------------------------------------------
-- 나머지 본문은 20261002093000_p08_evidence_write_gates.sql 과 같다.
-- Storage INSERT 정책은 boolean 이라 거부 시 RLS 위반(42501)으로 끝난다.

create or replace function private.can_upload_observation_media_object(p_name text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_sessions s
    join public.children c
      on c.id = private.safe_uuid(split_part(p_name, '/', 3))
     and c.organization_id = s.organization_id
     and c.class_id = s.class_id
    where p_name ~ (
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
            || '\.(jpg|png|webp)$'
          )
      and s.id = private.safe_uuid(split_part(p_name, '/', 2))
      and s.organization_id = private.safe_uuid(split_part(p_name, '/', 1))
      and private.is_class_teacher(s.class_id)
      and private.is_recordable_session(s.id)
      -- PHASE 08 WS9 (G-1 이 판정 범위를 넓힌다)
      and private.observation_media_upload_block_reason(s.organization_id, s.class_id, c.id) is null
      -- PHASE UAT-DB-GUARD: 미래 수업에는 올리지 않는다
      and not private.is_future_session(s.id)
  );
$$;

revoke execute on function private.can_upload_observation_media_object(text) from public, anon;
grant execute on function private.can_upload_observation_media_object(text) to authenticated;


-- ---------------------------------------------------------------------
-- 4. 학부모 공유 신규 발급 잠금 (NEW ISSUE ONLY)
-- ---------------------------------------------------------------------
-- child_portals INSERT 는 issue_child_portal RPC 와 직접 INSERT 가 모두 지나는 유일한 길이다.
-- UPDATE(중지) · SELECT(조회) · read_child_portal(익명 조회) 는 건드리지 않는다.
-- 출시 판정은 기존 private.capability_released('parent_portal') — is_released ∧ blocked_by 비어 있음.

create or replace function private.enforce_parent_sharing_release_lock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.capability_released('parent_portal') then
    raise exception '학부모 공유 기능은 현재 준비 중입니다. 공유 동의 및 보안 정책 확정 후 제공됩니다.'
      using errcode = 'PT004';
  end if;
  return new;
end;
$$;

revoke execute on function private.enforce_parent_sharing_release_lock() from public, anon, authenticated;

drop trigger if exists trg_zz_parent_sharing_release_lock on public.child_portals;
create trigger trg_zz_parent_sharing_release_lock
  before insert on public.child_portals
  for each row execute function private.enforce_parent_sharing_release_lock();
