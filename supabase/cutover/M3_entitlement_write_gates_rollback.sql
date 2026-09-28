-- =====================================================================
-- ROLLBACK — G-1 entitlement write gates (M3_entitlement_write_gates.sql) · PHASE 08
-- ---------------------------------------------------------------------
-- G-1 적용 전(PRE-CUTOVER) 상태로 되돌린다. 데이터 변경 없음 (trigger · 함수 정의만).
--   · G-1 trigger 6 제거: 배정(EN001) · 수업 일정(EN002) · 출결 · 관찰(EN003) ·
--     legacy 수업 직접 시작(EN003) · legacy 관찰영역 연결(EN003)
--   · G-1 함수 제거 (guard · onboarding 판정 · gate 함수)
--   · 사진 업로드 판정을 일반 migration 20261002093000 의 정의(동의 declined 만)로 되돌림
-- 되돌린 뒤에도 남는 것 (일반 migration · 의도적):
--   · Growth5 관찰 · 선택 · Weekly 사진 · 빠른 메모 · 동의 declined 판정 (SaaS 2.0 전용 경로 · 동의)
--   · 배정의 origin_contract_id 값 (provenance 는 지우지 않는다)
-- 되돌리면 legacy 공유 쓰기 표면의 entitlement enforcement 가 꺼진다 — 장애 대응용. 재적용은 G-1 preflight 부터.
-- 실행: psql --single-transaction -v ON_ERROR_STOP=1 -f supabase/cutover/M3_entitlement_write_gates_rollback.sql
-- =====================================================================

drop trigger if exists trg_class_program_assignments_entitlement_gate on public.class_program_assignments;
drop trigger if exists trg_class_sessions_entitlement_gate on public.class_sessions;
drop trigger if exists trg_attendance_entitlement_gate on public.class_session_attendance;
drop trigger if exists trg_observations_entitlement_gate on public.class_session_observations;
drop trigger if exists trg_class_sessions_status_g1_gate on public.class_sessions;
drop trigger if exists trg_observation_domains_g1_gate on public.class_session_observation_domains;

drop function if exists private.gate_class_program_assignment_insert();
drop function if exists private.gate_class_session_insert();
drop function if exists private.gate_class_record_write();
drop function if exists private.gate_class_session_direct_start();
drop function if exists private.gate_observation_domain_write();
drop function if exists private.class_assignment_contract_id(uuid);
drop function if exists private.assert_g1_preflight_clean();
drop function if exists private.g1_blocking_organizations();

-- 일반 migration 20261002093000 §3 과 같은 정의 (동의 declined 만)
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
    else null
  end;
$$;

revoke execute on function private.observation_media_upload_block_reason(uuid, uuid, uuid) from public, anon, authenticated;

select private.record_audit_event(
  null, 'cutover.m3_entitlement_gates_rolled_back', 'cutover', null, 'G-1 rollback',
  jsonb_build_object('file', 'supabase/cutover/M3_entitlement_write_gates_rollback.sql')
);
