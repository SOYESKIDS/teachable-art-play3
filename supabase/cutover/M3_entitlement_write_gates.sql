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
--   · 되돌리기: supabase/cutover/M3_entitlement_write_gates_rollback.sql (PHASE 08 · 데이터 변경 없음 ·
--     G-1 trigger 6 · 함수 제거 + 사진 업로드 판정을 동의 판정만으로 복원 · audit)
--
-- 적용 후:
--   · 수업 일정 생성 = 계약 반 범위 ∧ 계약 주차 범위 (EN002)
--   · 프로그램 배정 = 유효 계약 · 시작 전 계약 · 초안 계약의 반 범위 (EN001 · 서비스 반 수 HARD · DEC-051)
--     origin_contract_id 에 근거 계약을 기록 (provenance · DEC-084) · PHASE 08 D4 onboarding 순환 해소
--     배정을 다시 active 로 바꿀 때도 같은 판정
--   · 수업 일정 생성: before_start 에서는 시작 전 계약의 반 · 주차 범위 (PHASE 08 · 죽은 분기 해소)
--   · 출결 · 관찰 새 기록 · 수정 = 반 기능 ∧ 기관 서비스 모드 active (EN003 · DEC-052)
--     · legacy 수업 직접 시작 · 예정→완료 · legacy 관찰영역 연결 · 사진 업로드(재원 · 반 쓰기)도 같은 판정
--     (PHASE 08 PRE-COMMIT: legacy 공유 쓰기 표면의 entitlement 는 이 cutover 에서만 켜진다 ·
--      Step H 계약 활성화만으로는 legacy 동작이 바뀌지 않는다)
--
-- M5 (supabase/cutover/M5_legacy_write_revoke.sql) 와는 별개 단계다.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. G-1 guard (적용 직전 재확인 · 차단 조건만)
-- ---------------------------------------------------------------------
-- 차단: 운영 중 기관(status = 'active')에 운영 중 반이 있는데 기관 서비스 모드가 active 가 아님
--       (계약 없음 · 시작 전 · 정지 · 종료 · 기간 만료) → 적용 즉시 그 기관의 기록 쓰기가 막힌다.
-- 경고(차단 아님)는 G1_preflight.sql 에서 보고한다 (계약 범위 밖 반 등).
--
-- ★ G1001 은 최초 적용(과 재적용) 시점의 cutover-time cleanliness guard 다. G-1 적용 후의 정상 신규 onboarding
--   규칙이 아니다: 적용 후 신규 기관은 초안 계약 → 반 범위 → 배정(provenance) → Readiness → 활성화 → 정상 쓰기로
--   진행하고, 이 guard 는 그 과정의 어떤 쓰기에서도 실행되지 않는다 (POST-G1 test 로 확인).
--   적용 시점에는 onboarding 중(초안뿐 · 시작 전)이면서 운영 중 반이 있는 기관도 차단 대상이다 → 적용 창에서 정리.

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

-- PHASE 08 선행 migration 확인 (Growth5 gate · 동의 판정 · onboarding 판정이 기대하는 기반 · 없으면 중단)
do $$
begin
  if to_regprocedure('private.org_contract_governed(uuid)') is null
    or to_regprocedure('private.gate_growth5_observation_write()') is null
  then
    raise exception 'G-1 선행 migration(PHASE 08 20261002093000)이 적용되지 않았습니다.' using errcode = 'G1002';
  end if;
end;
$$;

select private.assert_g1_preflight_clean();



-- ---------------------------------------------------------------------
-- 1. 프로그램 배정: 계약 반 범위 · origin contract · 신규 기관 onboarding (PHASE 08 D4)
-- ---------------------------------------------------------------------
-- PHASE 07 의 gate 는 "현재 유효 계약"만 인정했다. Readiness(DEC-063)는 활성화 전에 범위 반마다 active
-- 배정을 요구하므로, 신규 기관은 배정을 만들 수 없어 활성화할 수 없는 순환에 빠졌다 (D4).
-- PHASE 08: 배정의 근거 계약을 아래 순서로 찾는다. 어느 것도 없으면 EN001.
--   ① 현재 유효 계약(서비스 모드 active)의 반 범위 → 서비스 중 배정
--   ② 이용 시작 전 계약(status active ∧ 시작일 > 오늘 · before_start)의 반 범위 → 준비
--      (contract-policy.md: before_start = "준비(반 · 원아 · 배정) 가능")
--   ③ 초안 계약(status draft)의 반 범위 → 활성화 전 onboarding 준비 (Readiness 평가용)
-- 불변 조건:
--   · 가짜 계약 자동 생성 없음 · 영구 bypass 없음 (②③은 그 계약이 시작 전 · 초안인 동안 · 그 반 범위만)
--   · origin_contract_id = 근거 계약 (provenance · DEC-084)
--   · 서비스 쓰기(수업 진행 · 출결 · 관찰 · 리포트)는 계속 유효 계약 ∧ 서비스 모드 active 에서만 (아래 3 · RPC)
--   · 활성화 · 시작일 이후에는 ①만 남는다 (hard entitlement)
--   · 기관 status = active ∧ 반 status = active
-- 배정 UPDATE: 비활성 → active 로 되살릴 때도 같은 판정 (재개 우회 차단 · origin 은 처음 값 유지).

create or replace function private.class_assignment_contract_id(p_class_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_org uuid;
  v_contract_id uuid;
begin
  select cl.organization_id into v_org
  from public.classes cl
  join public.organizations o on o.id = cl.organization_id and o.status = 'active'
  where cl.id = p_class_id and cl.status = 'active';

  if v_org is null then
    return null;
  end if;

  -- ① 서비스 중
  if private.org_service_mode(v_org) = 'active' and private.class_in_effective_contract_scope(p_class_id) then
    return private.effective_contract_id(v_org);
  end if;

  -- ② 이용 시작 전 (활성화된 계약 · 시작일 전)
  select c.id into v_contract_id
  from public.contracts c
  join public.contract_classes cc on cc.contract_id = c.id and cc.class_id = p_class_id
  where c.organization_id = v_org
    and c.status = 'active'
    and c.start_date > private.local_today()
  order by c.start_date
  limit 1;

  if v_contract_id is not null then
    return v_contract_id;
  end if;

  -- ③ 활성화 전 onboarding (초안 계약)
  select c.id into v_contract_id
  from public.contracts c
  join public.contract_classes cc on cc.contract_id = c.id and cc.class_id = p_class_id
  where c.organization_id = v_org
    and c.status = 'draft'
  order by c.created_at desc
  limit 1;

  return v_contract_id;
end;
$$;

revoke execute on function private.class_assignment_contract_id(uuid) from public, anon, authenticated;


create or replace function private.gate_class_program_assignment_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract_id uuid;
begin
  if tg_op = 'UPDATE' and not (new.status = 'active' and old.status is distinct from 'active') then
    return new;
  end if;

  v_contract_id := private.class_assignment_contract_id(new.class_id);

  if v_contract_id is null then
    raise exception '유효 · 시작 전 · 초안 계약의 반 범위에 있는 반에만 프로그램을 배정할 수 있습니다.'
      using errcode = 'EN001';
  end if;

  if tg_op = 'INSERT' then
    new.origin_contract_id := v_contract_id;
  end if;
  return new;
end;
$$;

revoke execute on function private.gate_class_program_assignment_insert() from public, anon, authenticated;

drop trigger if exists trg_class_program_assignments_entitlement_gate on public.class_program_assignments;
create trigger trg_class_program_assignments_entitlement_gate
  before insert or update on public.class_program_assignments
  for each row execute function private.gate_class_program_assignment_insert();


-- ---------------------------------------------------------------------
-- 2. 수업 일정 생성: 계약 반 범위 · 계약 주차 범위 (before_start 준비 포함 · PHASE 08)
-- ---------------------------------------------------------------------
-- PHASE 07 본문은 before_start 를 허용한다고 적었지만 "현재 유효 계약" 범위만 봤기 때문에 before_start
-- (유효 계약 없음)에서는 항상 EN002 였다 (죽은 분기). PHASE 08 은 문서 정의(contract-policy: before_start =
-- 준비 가능 · 수업 진행 불가)에 맞춰 시작 전 계약의 반 범위 · 주차 범위 안에서 일정 등록을 허용한다.
-- 수업 진행(start)은 여전히 유효 계약 ∧ 서비스 모드 active 만 (SS005). 초안 계약에서는 일정 등록 불가.

create or replace function private.gate_class_session_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week integer;
  v_mode text;
begin
  select l.week_no into v_week
  from public.curriculum_lessons l
  where l.id = new.lesson_id;

  v_mode := private.org_service_mode(new.organization_id);

  if v_week is not null and (
    (
      v_mode = 'active'
      and private.class_in_effective_contract_scope(new.class_id)
      and private.class_week_entitled(new.class_id, v_week)
    )
    or (
      v_mode = 'before_start'
      and exists (
        select 1
        from public.contracts c
        join public.contract_classes cc on cc.contract_id = c.id and cc.class_id = new.class_id
        join public.product_versions pv on pv.id = c.product_version_id
        where c.organization_id = new.organization_id
          and c.status = 'active'
          and c.start_date > private.local_today()
          and v_week between pv.week_from and pv.week_to
      )
    )
  ) then
    return new;
  end if;

  raise exception '계약 범위 밖의 반 또는 주차에는 수업을 등록할 수 없습니다.'
    using errcode = 'EN002';
end;
$$;

revoke execute on function private.gate_class_session_insert() from public, anon, authenticated;

drop trigger if exists trg_class_sessions_entitlement_gate on public.class_sessions;
create trigger trg_class_sessions_entitlement_gate
  before insert on public.class_sessions
  for each row execute function private.gate_class_session_insert();


-- ---------------------------------------------------------------------
-- 3. legacy 공유 쓰기 표면: 반 기능 ∧ 서비스 모드 active (모든 기관 · 이 cutover 에서만 켜진다)
-- ---------------------------------------------------------------------
-- PHASE 08 (PRE-COMMIT Issue 1): legacy 앱과 SaaS 2.0 이 함께 쓰는 운영 쓰기 경로의 entitlement enforcement 는
-- 일반 migration 이 아니라 이 cutover 에서만 켠다. Step H 에서 계약을 활성화해도 G-1 전까지는 legacy 동작 그대로다.
--   3-1. 출결 · legacy 형식 관찰 (INSERT · UPDATE)                  — EN003
--   3-2. legacy 수업 직접 시작 · 예정→완료 (M5 전 direct UPDATE)       — EN003
--   3-3. legacy 관찰영역 연결 INSERT · DELETE (M5 에서 회수)           — EN003
--   3-4. 사진 업로드 (Storage 정책 · metadata): 재원 원아 ∧ 반 쓰기     — MD005 · EN003
-- 공통: 내용 변경 없는 UPDATE(FK SET NULL 정리)는 막지 않는다. Growth5 관찰 · 선택 · Weekly · 메모는 일반 migration
-- (20261002093000) 이 이미 판정하므로 여기서 다시 판정하지 않는다 (중복 gate 없음).

-- 3-1
create or replace function private.gate_class_record_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and (to_jsonb(new) - array['created_by', 'updated_by', 'updated_at'])
      = (to_jsonb(old) - array['created_by', 'updated_by', 'updated_at'])
  then
    return new;
  end if;

  -- Growth5 관찰은 trg_observations_growth5_gate (일반 migration) 가 판정한다
  if (to_jsonb(new) ->> 'taxonomy') = 'growth5' then
    return new;
  end if;

  if not private.class_write_allowed(new.class_id, 'class_mode') then
    raise exception '현재 읽기 전용 상태이거나 이용 상품에 포함되지 않아 새 기록을 작성할 수 없습니다.'
      using errcode = 'EN003';
  end if;
  return new;
end;
$$;

revoke execute on function private.gate_class_record_write() from public, anon, authenticated;

drop trigger if exists trg_attendance_entitlement_gate on public.class_session_attendance;
create trigger trg_attendance_entitlement_gate
  before insert or update on public.class_session_attendance
  for each row execute function private.gate_class_record_write();

drop trigger if exists trg_observations_entitlement_gate on public.class_session_observations;
create trigger trg_observations_entitlement_gate
  before insert or update on public.class_session_observations
  for each row execute function private.gate_class_record_write();


-- 3-2 (M5 가 update(status) 를 회수하기 전까지의 legacy 직접 시작 · 예정→완료)
--   진행 중 수업의 완료 · 취소(정리)는 막지 않는다 (20260826 원칙 · V2 finish · cancel 과 같다).
--   전환 RPC 안의 UPDATE(pg_trigger_depth() > 1)는 전환 trigger 가 이미 판정했으므로 건너뛴다.
create or replace function private.gate_class_session_direct_start()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    and old.status = 'scheduled'
    and new.status in ('in_progress', 'completed')
    and pg_catalog.pg_trigger_depth() = 1
    and not private.class_write_allowed(old.class_id, 'class_mode')
  then
    raise exception '현재 읽기 전용 상태이거나 이용 상품에 포함되지 않아 수업을 진행할 수 없습니다.'
      using errcode = 'EN003';
  end if;
  return new;
end;
$$;

revoke execute on function private.gate_class_session_direct_start() from public, anon, authenticated;

drop trigger if exists trg_class_sessions_status_g1_gate on public.class_sessions;
create trigger trg_class_sessions_status_g1_gate
  before update on public.class_sessions
  for each row execute function private.gate_class_session_direct_start();


-- 3-3
create or replace function private.gate_observation_domain_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_id uuid;
begin
  if tg_op = 'DELETE' and pg_catalog.pg_trigger_depth() > 1 then
    return old;
  end if;

  select o.class_id into v_class_id
  from public.class_session_observations o
  where o.id = case when tg_op = 'DELETE' then old.observation_id else new.observation_id end;

  if v_class_id is not null and not private.class_write_allowed(v_class_id, 'class_mode') then
    raise exception '현재 읽기 전용 상태이거나 이용 상품에 포함되지 않아 새 기록을 작성할 수 없습니다.'
      using errcode = 'EN003';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function private.gate_observation_domain_write() from public, anon, authenticated;

drop trigger if exists trg_observation_domains_g1_gate on public.class_session_observation_domains;
create trigger trg_observation_domains_g1_gate
  before insert or delete on public.class_session_observation_domains
  for each row execute function private.gate_observation_domain_write();


-- 3-4 (일반 migration 의 동의 판정에 재원 · 반 쓰기를 더한다 · rollback 은 동의 판정만으로 되돌린다)
create or replace function private.observation_media_upload_block_reason(
  p_organization_id uuid,
  p_class_id uuid,
  p_child_id uuid
)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select case
    when exists (
      select 1 from public.child_media_consents mc
      where mc.child_id = p_child_id and mc.status = 'declined'
    ) then 'consent_declined'
    when not exists (
      select 1 from public.children c where c.id = p_child_id and c.status = 'active'
    ) then 'child_inactive'
    when not private.class_write_allowed(p_class_id, 'class_mode') then 'not_entitled'
    else null
  end;
$$;

revoke execute on function private.observation_media_upload_block_reason(uuid, uuid, uuid) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. 적용 기록 (audit · 운영 절차 추적)
-- ---------------------------------------------------------------------
select private.record_audit_event(
  null, 'cutover.m3_entitlement_gates_applied', 'cutover', null,
  'G-1 preflight passed',
  jsonb_build_object('file', 'supabase/cutover/M3_entitlement_write_gates.sql')
);
