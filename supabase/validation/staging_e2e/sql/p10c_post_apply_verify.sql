-- PHASE 10C.2 — 10C migration 적용 전후 확인 (READ ONLY · SELECT/WITH · catalog · 집계만)
-- ---------------------------------------------------------------------
-- 실행: node supabase/validation/staging_e2e/remote_readonly_query.mjs supabase/validation/staging_e2e/sql/p10c_post_apply_verify.sql
-- 각 문장은 runner 가 `begin transaction read only; … rollback;` 로 감싼다. 상태를 바꾸지 않는다.
-- set_capability_release 는 호출하지 않는다 (catalog 로만 확인 · 기능 출시 없음).
-- 개인 정보 없음: 행 내용은 md5 지문으로만 비교한다 (이름 · 이메일 · 본문을 출력하지 않는다).
--
-- ★ 문장 1 (데이터 지문) 은 적용 전 · 후에 같은 값이어야 한다 (migration 은 schema · 함수 · 권한만 바꾼다).
-- ★ 기대 (적용 후): 문장 2 verdict = 'P10C ACTIVE — VERIFIED' · missing = '{}'.
--          적용 전: 'P10C NOT VERIFIED — …' (빠진 항목 목록).

-- 1. 업무 데이터 지문 (적용 전 · 후 동일해야 함)
select
  (select count(*) from public.platform_capabilities)::int as platform_capabilities_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.code), '')) from public.platform_capabilities t) as platform_capabilities_md5,
  (select count(*) from public.contracts)::int as contracts_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.contracts t) as contracts_md5,
  (select count(*) from public.organizations)::int as organizations_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.organizations t) as organizations_md5,
  (select count(*) from public.classes)::int as classes_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.classes t) as classes_md5,
  (select count(*) from public.children)::int as children_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.children t) as children_md5,
  (select count(*) from public.class_sessions)::int as class_sessions_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.class_sessions t) as class_sessions_md5,
  (select count(*) from public.class_session_observations)::int as observations_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.class_session_observations t) as observations_md5,
  (select count(*) from public.reports)::int as reports_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.reports t) as reports_md5,
  (select count(*) from public.child_growth_reports)::int as child_growth_reports_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.child_growth_reports t) as child_growth_reports_md5,
  (select count(*) from public.audit_events)::int as audit_events_rows,
  (select count(*) from auth.users)::int as users_total,
  (select count(*) from auth.users where email not like '%@example.test')::int as non_synthetic_users;

-- 2. 10C 객체 · 권한 · trigger
with fn as (
  select to_regprocedure('public.set_capability_release(text,boolean,text,timestamp with time zone)') as rpc
),
checks as (
  select
    (select count(*) from supabase_migrations.schema_migrations where version = '20261002100000')::int = 1
      as migration_row_exactly_once,
    (select rpc from fn) is not null
      as rpc_present,
    coalesce((select pg_catalog.has_function_privilege('authenticated', rpc, 'EXECUTE') from fn), false)
      as rpc_authenticated_execute,
    not coalesce((select pg_catalog.has_function_privilege('anon', rpc, 'EXECUTE') from fn), true)
      as rpc_anon_no_execute,
    coalesce((select p.proacl is not null
                 and not exists (select 1 from pg_catalog.aclexplode(p.proacl) a
                                 where a.grantee = 0 and a.privilege_type = 'EXECUTE')
              from pg_catalog.pg_proc p where p.oid = (select rpc from fn)), false)
      as rpc_public_no_execute,
    coalesce((select p.prosecdef from pg_catalog.pg_proc p where p.oid = (select rpc from fn)), false)
      as rpc_definer,
    not pg_catalog.has_column_privilege('authenticated', 'public.platform_capabilities', 'is_released', 'UPDATE')
      as authenticated_is_released_update_revoked,
    not pg_catalog.has_column_privilege('anon', 'public.platform_capabilities', 'is_released', 'UPDATE')
      as anon_is_released_update_absent,
    exists (select 1 from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid
            where not t.tgisinternal and t.tgenabled = 'O' and c.relname = 'platform_capabilities'
              and t.tgname = 'trg_platform_capabilities_release_guard'
              and t.tgfoid = to_regprocedure('private.enforce_capability_release()'))
      as release_guard_trigger_enabled,
    coalesce(pg_catalog.pg_get_functiondef(to_regprocedure('private.enforce_capability_release()')) like '%CP003%', false)
      as release_guard_function_cp003,
    exists (select 1 from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid
            where not t.tgisinternal and t.tgenabled = 'O' and c.relname = 'platform_capabilities'
              and t.tgname = 'trg_platform_capabilities_audit'
              and t.tgfoid = to_regprocedure('private.audit_platform_capability_change()'))
      as capability_audit_trigger_enabled,
    coalesce(pg_catalog.pg_get_functiondef(to_regprocedure('private.audit_platform_capability_change()')) like '%capability_release_reason%', false)
      as capability_audit_function_p10c,
    exists (select 1 from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid
            where not t.tgisinternal and t.tgenabled = 'O' and c.relname = 'contracts'
              and t.tgname = 'trg_contracts_reactivation_check'
              and t.tgfoid = to_regprocedure('private.enforce_contract_reactivation()'))
      as contract_reactivation_trigger_enabled,
    coalesce(pg_catalog.pg_get_functiondef(to_regprocedure('private.enforce_contract_reactivation()')) like '%CT005%', false)
      as contract_reactivation_function_ct005,
    not exists (select 1 from (values ('private.enforce_capability_release()'),
                                      ('private.audit_platform_capability_change()'),
                                      ('private.enforce_contract_reactivation()')) as f(sig)
                where to_regprocedure(f.sig) is not null
                  and (pg_catalog.has_function_privilege('authenticated', to_regprocedure(f.sig), 'EXECUTE')
                    or pg_catalog.has_function_privilege('anon', to_regprocedure(f.sig), 'EXECUTE')))
      as private_functions_not_client_executable
)
select
  c.*,
  array_remove(array[
    case when not c.migration_row_exactly_once then 'migration_row_exactly_once' end,
    case when not c.rpc_present then 'rpc_present' end,
    case when not c.rpc_authenticated_execute then 'rpc_authenticated_execute' end,
    case when not c.rpc_anon_no_execute then 'rpc_anon_no_execute' end,
    case when not c.rpc_public_no_execute then 'rpc_public_no_execute' end,
    case when not c.rpc_definer then 'rpc_definer' end,
    case when not c.authenticated_is_released_update_revoked then 'authenticated_is_released_update_revoked' end,
    case when not c.anon_is_released_update_absent then 'anon_is_released_update_absent' end,
    case when not c.release_guard_trigger_enabled then 'release_guard_trigger_enabled' end,
    case when not c.release_guard_function_cp003 then 'release_guard_function_cp003' end,
    case when not c.capability_audit_trigger_enabled then 'capability_audit_trigger_enabled' end,
    case when not c.capability_audit_function_p10c then 'capability_audit_function_p10c' end,
    case when not c.contract_reactivation_trigger_enabled then 'contract_reactivation_trigger_enabled' end,
    case when not c.contract_reactivation_function_ct005 then 'contract_reactivation_function_ct005' end,
    case when not c.private_functions_not_client_executable then 'private_functions_not_client_executable' end
  ], null) as missing,
  case
    when c.migration_row_exactly_once and c.rpc_present and c.rpc_authenticated_execute and c.rpc_anon_no_execute
     and c.rpc_public_no_execute and c.rpc_definer and c.authenticated_is_released_update_revoked
     and c.anon_is_released_update_absent and c.release_guard_trigger_enabled and c.release_guard_function_cp003
     and c.capability_audit_trigger_enabled and c.capability_audit_function_p10c
     and c.contract_reactivation_trigger_enabled and c.contract_reactivation_function_ct005
     and c.private_functions_not_client_executable
    then 'P10C ACTIVE — VERIFIED'
    else 'P10C NOT VERIFIED — missing 10C objects or grants (see missing)'
  end as verdict
from checks c;

-- 3. 기능 출시 상태 (변경 없어야 함 · 요청 5종)
select pc.code, pc.is_released, pc.blocked_by, pc.updated_at
from public.platform_capabilities pc
where pc.code in ('class_mode', 'weekly_report', 'parent_portal', 'ai_assist', 'branding')
order by pc.code;

-- 4. 계약 상태 개수 (0 포함)
select s.status,
       (select count(*) from public.contracts c where c.status = s.status)::int as contracts
from (values ('draft'), ('active'), ('suspended'), ('ended')) as s(status)
order by array_position(array['draft', 'active', 'suspended', 'ended'], s.status);

-- 5. UAT STARTER 계약 · 기관 상태 (운영 메타데이터만)
select c.id as contract_id,
       c.status as contract_status,
       p.code as product_code,
       pv.version_label,
       c.start_date,
       c.end_date,
       c.updated_at as contract_updated_at,
       o.status as organization_status,
       (select count(*) from public.contract_classes cc where cc.contract_id = c.id)::int as contract_class_scope
from public.contracts c
join public.organizations o on o.id = c.organization_id
join public.product_versions pv on pv.id = c.product_version_id
join public.products p on p.id = pv.product_id
order by c.id;

-- 6. cutover 상태 요약 (G-2 · G-1 · M5 · 정보)
select
  coalesce((select a.event_type from public.audit_events a
    where a.event_type in ('cutover.g2_hq_role_split_applied', 'cutover.g2_hq_role_split_rolled_back')
    order by a.created_at desc, a.id desc limit 1), 'none') as g2_latest_audit,
  (select count(*) from pg_catalog.pg_trigger t where not t.tgisinternal and t.tgname like '%entitlement_gate%')::int
    as g1_entitlement_gate_triggers,
  coalesce((select a.event_type from public.audit_events a
    where a.event_type in ('cutover.m3_entitlement_gates_applied', 'cutover.m3_entitlement_gates_rolled_back')
    order by a.created_at desc, a.id desc limit 1), 'none') as g1_latest_audit,
  not pg_catalog.has_column_privilege('authenticated', 'public.class_sessions', 'status', 'UPDATE') as m5_applied,
  coalesce((select a.event_type from public.audit_events a
    where a.event_type in ('cutover.m5_legacy_writes_revoked', 'cutover.m5_legacy_writes_restored')
    order by a.created_at desc, a.id desc limit 1), 'none') as m5_latest_audit;
