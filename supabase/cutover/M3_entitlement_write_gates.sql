-- =====================================================================
-- ███  DO NOT APPLY UNTIL G-1 PREFLIGHT PASSES  ███
-- =====================================================================
-- PHASE 07 · M3 CUTOVER — Entitlement write gates (기존 운영 쓰기 경로 차단)
--
-- 이 파일은 migration 이 아니다. `supabase db reset` · `db push` 는 이 파일을
-- 적용하지 않는다 (supabase/cutover/ 는 migration 경로 밖). 사람이 G-1 preflight
-- (supabase/cutover/G1_preflight.sql) 결과를 확인한 뒤 운영 절차로만 실행한다.
-- 원래 위치: supabase/migrations/20261001115000_m3_entitlement_write_gates.sql
-- (PHASE 07 세션 6 에서 이동 · 본문 enforcement 로직은 변경 없음)
--
-- 근거: DEC-051 · DEC-052 · DEC-082 · DEC-083 · DEC-094 (Contract mapping gate)
--
-- ★ 적용 조건 (G-1 · migration-cutover.md §3 · DB-7 RESOLVED 규칙)
--   모든 운영 중(active) 기관 중 운영 중 반이 있는 기관은
--   (1) 사람이 검증한 유효 Contract(active · 기간 중) + class scope 가 있거나
--   (2) 기관 status = 'suspended' (기존 모델의 비운영 상태) 이어야 한다.
--   가짜 Contract 자동 생성 없음 · 영구 legacy bypass 모드 없음.
--   이 조건은 아래 guard 가 같은 transaction 안에서 다시 확인하고, 어긋나면
--   G1001 로 전체를 중단한다 (부분 적용 없음).
--
-- ★ 실행 방법 (운영 · 사용자 승인 후 별도 단계)
--   psql 로 단일 transaction 실행:  psql --single-transaction -v ON_ERROR_STOP=1 -f <this file>
--   · 반복 실행 안전 (create or replace · drop trigger if exists)
--   · 되돌리기 (forward-fix): 아래 4개 trigger 를 drop 하면 이전 상태로 돌아간다
--     (데이터 변경 없음 · cutover-runbook.md §6)
--
-- 적용 후:
--   · 수업 일정 생성 = 계약 반 범위 ∧ 계약 주차 범위 (EN002)
--   · 프로그램 배정 = 현재 유효 계약의 반 범위 (EN001 · 서비스 반 수 HARD · DEC-051)
--     origin_contract_id 에 시작 계약을 기록 (provenance · DEC-084)
--   · 출결 · 관찰 새 기록 · 수정 = 반 기능 ∧ 기관 서비스 모드 active (EN003 · DEC-052)
--
-- M5 (supabase/cutover/M5_legacy_write_revoke.sql) 와는 별개 단계다.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. G-1 guard (적용 직전 재확인 · 차단 조건만)
-- ---------------------------------------------------------------------
-- 차단: 운영 중 기관(status = 'active')에 운영 중 반이 있는데 기관 서비스 모드가 active 가 아님
--       (계약 없음 · 시작 전 · 정지 · 종료 · 기간 만료) → 적용 즉시 그 기관의 기록 쓰기가 막힌다.
-- 경고(차단 아님)는 G1_preflight.sql 에서 보고한다 (계약 범위 밖 반 등).

create or replace function private.g1_blocking_organizations()
returns table (organization_id uuid, organization_name text, service_mode text, active_class_count bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select o.id, o.name, private.org_service_mode(o.id), count(cl.id)
  from public.organizations o
  join public.classes cl on cl.organization_id = o.id and cl.status = 'active'
  where o.status = 'active'
    and private.org_service_mode(o.id) <> 'active'
  group by o.id, o.name;
$$;

revoke execute on function private.g1_blocking_organizations() from public, anon, authenticated;

create or replace function private.assert_g1_preflight_clean()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from private.g1_blocking_organizations();
  if v_count > 0 then
    raise exception 'G-1 preflight 미충족: 유효 계약 없이 운영 중인 기관 %곳. entitlement write gate 를 적용하지 않습니다.', v_count
      using errcode = 'G1001',
            hint = 'supabase/cutover/G1_preflight.sql 결과를 확인하고 계약 mapping 또는 기관 정지 처리를 먼저 하세요.';
  end if;
end;
$$;

revoke execute on function private.assert_g1_preflight_clean() from public, anon, authenticated;

select private.assert_g1_preflight_clean();



-- ---------------------------------------------------------------------
-- 1. 프로그램 배정: 계약 반 범위 · origin contract
-- ---------------------------------------------------------------------

create or replace function private.gate_class_program_assignment_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract_id uuid;
begin
  v_contract_id := private.effective_contract_id(new.organization_id);

  if v_contract_id is null
    or private.org_service_mode(new.organization_id) <> 'active'
    or not private.class_in_effective_contract_scope(new.class_id)
  then
    raise exception '현재 유효 계약의 반 범위에 있는 반에만 프로그램을 배정할 수 있습니다.'
      using errcode = 'EN001';
  end if;

  new.origin_contract_id := v_contract_id;
  return new;
end;
$$;

revoke execute on function private.gate_class_program_assignment_insert() from public;

drop trigger if exists trg_class_program_assignments_entitlement_gate on public.class_program_assignments;
create trigger trg_class_program_assignments_entitlement_gate
  before insert on public.class_program_assignments
  for each row execute function private.gate_class_program_assignment_insert();


-- ---------------------------------------------------------------------
-- 2. 수업 일정 생성: 계약 반 범위 · 계약 주차 범위
-- ---------------------------------------------------------------------

create or replace function private.gate_class_session_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week integer;
begin
  select l.week_no into v_week
  from public.curriculum_lessons l
  where l.id = new.lesson_id;

  if not private.class_in_effective_contract_scope(new.class_id)
    or v_week is null
    or not private.class_week_entitled(new.class_id, v_week)
    or private.org_service_mode(new.organization_id) not in ('active', 'before_start')
  then
    raise exception '계약 범위 밖의 반 또는 주차에는 수업을 등록할 수 없습니다.'
      using errcode = 'EN002';
  end if;

  return new;
end;
$$;

revoke execute on function private.gate_class_session_insert() from public;

drop trigger if exists trg_class_sessions_entitlement_gate on public.class_sessions;
create trigger trg_class_sessions_entitlement_gate
  before insert on public.class_sessions
  for each row execute function private.gate_class_session_insert();


-- ---------------------------------------------------------------------
-- 3. 출결 · 관찰 쓰기: 반 기능 ∧ 서비스 모드 active
-- ---------------------------------------------------------------------

create or replace function private.gate_class_record_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.class_write_allowed(new.class_id, 'class_mode') then
    raise exception '현재 읽기 전용 상태이거나 이용 상품에 포함되지 않아 새 기록을 작성할 수 없습니다.'
      using errcode = 'EN003';
  end if;
  return new;
end;
$$;

revoke execute on function private.gate_class_record_write() from public;

drop trigger if exists trg_attendance_entitlement_gate on public.class_session_attendance;
create trigger trg_attendance_entitlement_gate
  before insert or update on public.class_session_attendance
  for each row execute function private.gate_class_record_write();

drop trigger if exists trg_observations_entitlement_gate on public.class_session_observations;
create trigger trg_observations_entitlement_gate
  before insert or update on public.class_session_observations
  for each row execute function private.gate_class_record_write();


-- ---------------------------------------------------------------------
-- 4. 적용 기록 (audit · 운영 절차 추적)
-- ---------------------------------------------------------------------
select private.record_audit_event(
  null, 'cutover.m3_entitlement_gates_applied', 'cutover', null,
  'G-1 preflight passed',
  jsonb_build_object('file', 'supabase/cutover/M3_entitlement_write_gates.sql')
);
