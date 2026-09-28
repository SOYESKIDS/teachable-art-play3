-- PHASE 09C.1 — G-2 적용 후 확인 (READ ONLY · catalog 조회만)
-- ---------------------------------------------------------------------
-- 목적: G-2(M3_hq_role_split_sensitive_access.sql) 적용 뒤, 보안 · release gate 객체가 **있고 켜져 있는지** 운영자가 확인한다.
-- 실행 (Staging · 읽기 전용 transaction · DB 지문 확인 포함):
--   node supabase/validation/staging_e2e/remote_readonly_query.mjs supabase/validation/staging_e2e/sql/g2_post_verify.sql
-- local 증거: supabase/cutover/tests/G2_post_cutover.test.sql 이 이 파일로 PRE · 적용 · rollback · 재적용 네 상태를 판정한다.
--
-- ★ SELECT 하나 · catalog 함수(pg_get_functiondef · has_*_privilege · to_regprocedure)만 쓴다.
--   INSERT · UPDATE · DELETE · DDL · 쓰는 함수 호출 · cutover · rollback 실행 없음.
-- ★ 기대: 적용 후 verdict = 'G-2 ACTIVE — VERIFIED' · missing = '{}'.
--          적용 전(PRE-G2) · rollback 후 = 'G-2 NOT VERIFIED — …' (빠진 항목 목록) — 이 상태에서 G-2 가 켜졌다고 말하지 않는다.
-- ★ g1_entitlement_gates 는 정보 항목이다 (G-2 는 G-1 을 설치하지 않는다 · G-1 적용 뒤에는 6 이 정상).
-- ★ 문장은 하나 · 끝의 ; 하나 (G2_post_cutover.test.sql 이 `create temp view … as` 뒤에 이 파일을 펼친다).

with checks as (
  select
    -- 1. legacy is_soyes_admin() 이 admin 만 (Sales 제외) — G-2 §1
    position('''sales''' in pg_catalog.pg_get_functiondef('private.is_soyes_admin()'::regprocedure)) = 0
      as is_soyes_admin_admin_only,
    -- 2. AI 초안 release gate trigger 2개가 있고 켜져 있음 (tgenabled = 'O') — G-2 §6
    (select count(*) from pg_catalog.pg_trigger t
      where not t.tgisinternal and t.tgenabled = 'O'
        and t.tgname in ('trg_observation_ai_drafts_release_gate', 'trg_growth_report_ai_drafts_release_gate')) = 2
      as release_gate_triggers_enabled,
    to_regprocedure('private.gate_ai_draft_release()') is not null
      as release_gate_function_present,
    -- 3. 기관 구성원 직접 쓰기 회수 · legacy 정책 제거 — G-2 §5
    not pg_catalog.has_any_column_privilege('authenticated', 'public.organization_members', 'INSERT')
      as member_direct_insert_closed,
    not pg_catalog.has_any_column_privilege('authenticated', 'public.organization_members', 'UPDATE')
      as member_direct_update_closed,
    not exists (select 1 from pg_catalog.pg_policies p
      where p.schemaname = 'public' and p.tablename = 'organization_members'
        and p.policyname in ('members insert by soyes admin', 'members update by soyes admin'))
      as legacy_member_write_policies_removed,
    -- 4. audited 구성원 RPC · guard · audit trigger (PHASE 08 기반 · G-2 가 유일한 쓰기 경로로 만든다)
    to_regprocedure('public.hq_add_organization_member(uuid, uuid, text, text)') is not null
      and to_regprocedure('public.hq_change_organization_member(uuid, uuid, text, text, text, timestamptz)') is not null
      as membership_rpcs_present,
    (select count(*) from pg_catalog.pg_trigger t
      where not t.tgisinternal and t.tgenabled = 'O'
        and t.tgname in ('trg_organization_members_write_check', 'trg_organization_members_audit')) = 2
      as membership_guard_audit_triggers_enabled,
    -- 5. 아동 민감 표의 RLS 가 켜져 있음
    (select count(*) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relrowsecurity
        and c.relname in ('children', 'class_session_observations', 'class_session_observation_media',
                          'observation_growth_selections', 'child_growth_reports', 'reports', 'report_revisions',
                          'child_portals', 'child_media_consents', 'organization_members')) = 10
      as sensitive_tables_rls_enabled,
    -- 6. 사진 storage 읽기 정책이 서명 판정 함수를 거친다
    exists (select 1 from pg_catalog.pg_policies p
      where p.schemaname = 'storage' and p.tablename = 'objects' and p.cmd = 'SELECT'
        and p.qual like '%can_read_observation_media_object%')
      as media_storage_policy_present,
    -- 7. 가장 최근 G-2 audit 이 적용(applied) 이다 (rollback 뒤가 아님)
    coalesce((select a.event_type from public.audit_events a
      where a.event_type in ('cutover.g2_hq_role_split_applied', 'cutover.g2_hq_role_split_rolled_back')
      order by a.created_at desc, a.id desc limit 1) = 'cutover.g2_hq_role_split_applied', false)
      as g2_applied_audit_latest,
    -- 정보: G-1 entitlement gate trigger 수 (verdict 에 넣지 않는다)
    (select count(*) from pg_catalog.pg_trigger t where not t.tgisinternal and t.tgname like '%entitlement_gate%')::int
      as g1_entitlement_gates
)
select
  c.*,
  array_remove(array[
    case when not c.is_soyes_admin_admin_only then 'is_soyes_admin_admin_only' end,
    case when not c.release_gate_triggers_enabled then 'release_gate_triggers_enabled' end,
    case when not c.release_gate_function_present then 'release_gate_function_present' end,
    case when not c.member_direct_insert_closed then 'member_direct_insert_closed' end,
    case when not c.member_direct_update_closed then 'member_direct_update_closed' end,
    case when not c.legacy_member_write_policies_removed then 'legacy_member_write_policies_removed' end,
    case when not c.membership_rpcs_present then 'membership_rpcs_present' end,
    case when not c.membership_guard_audit_triggers_enabled then 'membership_guard_audit_triggers_enabled' end,
    case when not c.sensitive_tables_rls_enabled then 'sensitive_tables_rls_enabled' end,
    case when not c.media_storage_policy_present then 'media_storage_policy_present' end,
    case when not c.g2_applied_audit_latest then 'g2_applied_audit_latest' end
  ], null) as missing,
  case
    when c.is_soyes_admin_admin_only and c.release_gate_triggers_enabled and c.release_gate_function_present
     and c.member_direct_insert_closed and c.member_direct_update_closed and c.legacy_member_write_policies_removed
     and c.membership_rpcs_present and c.membership_guard_audit_triggers_enabled and c.sensitive_tables_rls_enabled
     and c.media_storage_policy_present and c.g2_applied_audit_latest
    then 'G-2 ACTIVE — VERIFIED'
    else 'G-2 NOT VERIFIED — missing or disabled G-2 authority objects (see missing)'
  end as verdict
from checks c;
