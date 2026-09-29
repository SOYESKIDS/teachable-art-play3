-- PHASE 09E — G-1 적용 후 확인 (READ ONLY · catalog · 집계 조회만)
-- ---------------------------------------------------------------------
-- 목적: G-1(M3_entitlement_write_gates.sql) 적용 뒤 entitlement write gate 가 **있고 켜져 있는지**, G-2 가 그대로인지
--       운영자가 확인한다.
-- 실행 (Staging · 읽기 전용 transaction · DB 지문 확인 포함):
--   node supabase/validation/staging_e2e/remote_readonly_query.mjs supabase/validation/staging_e2e/sql/g1_post_verify.sql
-- local 증거: supabase/cutover/tests/G1_rehearsal_verify.test.sql 이 이 파일로
--             PRE-G1 · 적용 · rollback · 재적용 · trigger disable · G-2 회귀 여섯 상태를 판정한다.
--
-- ★ SELECT 하나 · catalog 함수(pg_get_functiondef · has_*_privilege · to_regprocedure) · 일반 migration 의 읽기 함수
--   (private.org_service_mode) 만 쓴다. G-1 함수는 호출하지 않는다 (적용 전에는 없으므로).
--   INSERT · UPDATE · DELETE · DDL · 쓰는 함수 호출 · cutover · rollback 실행 없음.
-- ★ 기대: 적용 후 verdict = 'G-1 ACTIVE — VERIFIED' · missing = '{}'.
--          적용 전 · G-1 rollback 후 = 'G-1 NOT VERIFIED — …' (빠진 항목 목록).
-- ★ G-2 확인 열(g2_*)도 verdict 에 들어간다 — G-1 은 G-2 위에 적용한다 (runbook 순서 G-2 → G-1). G-2 가 풀려 있으면 NOT VERIFIED.
-- ★ 정보 열(verdict 에 넣지 않음): m5_applied · g1_blocking_organizations(적용 시점 guard 와 같은 조건 · 적용 후에는 운영 경고).
-- ★ 문장은 하나 · 끝의 ; 하나 (G1_rehearsal_verify.test.sql 이 `create temp view … as` 뒤에 이 파일을 펼친다).

with g1_triggers(tgname, relname) as (
  values ('trg_class_program_assignments_entitlement_gate', 'class_program_assignments'),
         ('trg_class_sessions_entitlement_gate', 'class_sessions'),
         ('trg_attendance_entitlement_gate', 'class_session_attendance'),
         ('trg_observations_entitlement_gate', 'class_session_observations'),
         ('trg_class_sessions_status_g1_gate', 'class_sessions'),
         ('trg_observation_domains_g1_gate', 'class_session_observation_domains')
),
g1_functions(sig) as (
  values ('private.gate_class_program_assignment_insert()'),
         ('private.gate_class_session_insert()'),
         ('private.gate_class_record_write()'),
         ('private.gate_class_session_direct_start()'),
         ('private.gate_observation_domain_write()'),
         ('private.class_assignment_contract_id(uuid)'),
         ('private.assert_g1_preflight_clean()'),
         ('private.g1_blocking_organizations()')
),
evidence_triggers(tgname) as (
  values ('trg_observations_growth5_gate'), ('trg_growth_selections_write_gate'), ('trg_observation_media_upload_gate'),
         ('trg_observation_media_storage_guard'), ('trg_report_media_eligibility_gate'), ('trg_quick_memos_write_gate')
),
checks as (
  select
    -- 1. G-1 trigger 6개가 정확한 표에 있고 켜져 있음 (tgenabled = 'O')
    (select count(*) from g1_triggers g
      join pg_catalog.pg_trigger t on t.tgname = g.tgname and not t.tgisinternal and t.tgenabled = 'O'
      join pg_catalog.pg_class c on c.oid = t.tgrelid and c.relname = g.relname
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public') = 6
      as g1_gate_triggers_enabled,
    -- 2. G-1 함수 8개 존재
    (select count(*) from g1_functions f where to_regprocedure(f.sig) is not null) = 8
      as g1_gate_functions_present,
    -- 3. G-1 함수는 anon · authenticated 가 직접 실행할 수 없음 (revoke)
    not exists (select 1 from g1_functions f
      where to_regprocedure(f.sig) is not null
        and (pg_catalog.has_function_privilege('authenticated', to_regprocedure(f.sig), 'EXECUTE')
          or pg_catalog.has_function_privilege('anon', to_regprocedure(f.sig), 'EXECUTE')))
      as g1_functions_not_client_executable,
    -- 4. 사진 업로드 판정이 G-1 정의 (재원 원아 ∧ 반 쓰기 · not_entitled) 로 바뀌어 있음
    pg_catalog.pg_get_functiondef('private.observation_media_upload_block_reason(uuid, uuid, uuid)'::regprocedure) like '%not_entitled%'
      as g1_media_upload_judgement_active,
    -- 5. 일반 migration evidence gate (Growth5 · 사진 · Weekly 사진 · 메모) 는 G-1 과 함께 그대로 켜져 있음
    (select count(*) from evidence_triggers e
      join pg_catalog.pg_trigger t on t.tgname = e.tgname and not t.tgisinternal and t.tgenabled = 'O') = 6
      as evidence_gate_triggers_enabled,
    -- 6. 가장 최근 G-1 audit 이 적용(applied)
    coalesce((select a.event_type from public.audit_events a
      where a.event_type in ('cutover.m3_entitlement_gates_applied', 'cutover.m3_entitlement_gates_rolled_back')
      order by a.created_at desc, a.id desc limit 1) = 'cutover.m3_entitlement_gates_applied', false)
      as g1_applied_audit_latest,
    -- 7. G-2 가 그대로 (G-1 이 G-2 를 되돌리지 않았음)
    position('''sales''' in pg_catalog.pg_get_functiondef('private.is_soyes_admin()'::regprocedure)) = 0
      as g2_is_soyes_admin_admin_only,
    (select count(*) from pg_catalog.pg_trigger t
      where not t.tgisinternal and t.tgenabled = 'O'
        and t.tgname in ('trg_observation_ai_drafts_release_gate', 'trg_growth_report_ai_drafts_release_gate')) = 2
      as g2_release_gate_triggers_enabled,
    not pg_catalog.has_any_column_privilege('authenticated', 'public.organization_members', 'INSERT')
      and not pg_catalog.has_any_column_privilege('authenticated', 'public.organization_members', 'UPDATE')
      as g2_member_direct_write_closed,
    coalesce((select a.event_type from public.audit_events a
      where a.event_type in ('cutover.g2_hq_role_split_applied', 'cutover.g2_hq_role_split_rolled_back')
      order by a.created_at desc, a.id desc limit 1) = 'cutover.g2_hq_role_split_applied', false)
      as g2_applied_audit_latest,
    -- 정보: M5 적용 여부 (수업 상태 직접 UPDATE 권한 회수) · G-1 blocking 조건의 기관 수 (verdict 에 넣지 않음)
    not pg_catalog.has_column_privilege('authenticated', 'public.class_sessions', 'status', 'UPDATE')
      as m5_applied,
    (select count(distinct o.id) from public.organizations o
      join public.classes cl on cl.organization_id = o.id and cl.status = 'active'
      where o.status = 'active' and private.org_service_mode(o.id) <> 'active')::int
      as g1_blocking_organizations
)
select
  c.*,
  array_remove(array[
    case when not c.g1_gate_triggers_enabled then 'g1_gate_triggers_enabled' end,
    case when not c.g1_gate_functions_present then 'g1_gate_functions_present' end,
    case when not c.g1_functions_not_client_executable then 'g1_functions_not_client_executable' end,
    case when not c.g1_media_upload_judgement_active then 'g1_media_upload_judgement_active' end,
    case when not c.evidence_gate_triggers_enabled then 'evidence_gate_triggers_enabled' end,
    case when not c.g1_applied_audit_latest then 'g1_applied_audit_latest' end,
    case when not c.g2_is_soyes_admin_admin_only then 'g2_is_soyes_admin_admin_only' end,
    case when not c.g2_release_gate_triggers_enabled then 'g2_release_gate_triggers_enabled' end,
    case when not c.g2_member_direct_write_closed then 'g2_member_direct_write_closed' end,
    case when not c.g2_applied_audit_latest then 'g2_applied_audit_latest' end
  ], null) as missing,
  case
    when c.g1_gate_triggers_enabled and c.g1_gate_functions_present and c.g1_functions_not_client_executable
     and c.g1_media_upload_judgement_active and c.evidence_gate_triggers_enabled and c.g1_applied_audit_latest
     and c.g2_is_soyes_admin_admin_only and c.g2_release_gate_triggers_enabled and c.g2_member_direct_write_closed
     and c.g2_applied_audit_latest
    then 'G-1 ACTIVE — VERIFIED'
    else 'G-1 NOT VERIFIED — missing or disabled G-1 / G-2 authority objects (see missing)'
  end as verdict
from checks c;
