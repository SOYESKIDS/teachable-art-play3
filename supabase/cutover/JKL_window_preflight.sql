-- =====================================================================
-- J / K / L CONTROLLED WINDOW — DB PREFLIGHT (READ ONLY) · PHASE 08
-- ---------------------------------------------------------------------
-- 실행:  psql -v ON_ERROR_STOP=1 -f supabase/cutover/JKL_window_preflight.sql   (window 를 열기 직전)
-- · 데이터를 바꾸지 않는다 (read only transaction · 마지막 rollback)
-- · J → K(G-1) → L(M5) 를 한 번의 controlled window 에서 연속 수행할 수 있는 DB 상태인지 본다.
--   앱 조건은 node supabase/cutover/JKL_start_gate.mjs (M5 앱 preflight) 가 따로 본다.
-- · VERDICT 가 READY 가 아니면 J 를 시작하지 않는다.
-- =====================================================================

begin;
set transaction read only;

\echo
\echo '== [BLOCKING] 1. 선행 상태: G-2 적용 · PHASE 08 기반 · G-1 / M5 아직 미적용'
select
  pg_catalog.pg_get_functiondef('private.is_soyes_admin()'::regprocedure) not like '%''sales''%' as g2_applied,
  to_regprocedure('private.gate_growth5_observation_write()') is not null
    and to_regprocedure('public.hq_add_organization_member(uuid, uuid, text, text)') is not null as phase08_migrations_applied,
  not exists (select 1 from pg_catalog.pg_trigger
              where tgname = 'trg_class_program_assignments_entitlement_gate' and not tgisinternal) as g1_not_yet_applied,
  has_column_privilege('authenticated', 'public.class_sessions', 'status', 'UPDATE') as m5_not_yet_applied;

\echo
\echo '== [BLOCKING] 2. G-1 을 곧바로 적용할 수 없는 운영 기관 (G1001 과 같은 조건 · 운영 중 반 · 서비스 모드 ≠ active)'
select o.id as organization_id, o.name, private.org_service_mode(o.id) as service_mode
from public.organizations o
where o.status = 'active'
  and exists (select 1 from public.classes cl where cl.organization_id = o.id and cl.status = 'active')
  and private.org_service_mode(o.id) <> 'active'
order by o.name;

\echo
\echo '== [INFO] 3. 진행 중 수업 (window 안에서 V2 마치기 · 복구로 정리)'
select count(*) as in_progress_sessions from public.class_sessions where status = 'in_progress';

\echo
\echo '== VERDICT'
select case
         when pg_catalog.pg_get_functiondef('private.is_soyes_admin()'::regprocedure) like '%''sales''%'
           then 'NOT READY — G-2 미적용 (J/K/L window 를 열지 않는다)'
         when to_regprocedure('private.gate_growth5_observation_write()') is null
           then 'NOT READY — PHASE 08 일반 migration 미적용'
         when exists (select 1 from pg_catalog.pg_trigger
                      where tgname = 'trg_class_program_assignments_entitlement_gate' and not tgisinternal)
           then 'NOT READY — G-1 이 이미 적용됨 (window 순서 확인: 이 preflight 는 J 시작 전에만 쓴다)'
         when not has_column_privilege('authenticated', 'public.class_sessions', 'status', 'UPDATE')
           then 'NOT READY — M5 가 이미 적용됨'
         when exists (
           select 1 from public.organizations o
           where o.status = 'active'
             and exists (select 1 from public.classes cl where cl.organization_id = o.id and cl.status = 'active')
             and private.org_service_mode(o.id) <> 'active'
         ) then 'NOT READY — G-1 blocking 기관 있음 (계약 mapping · 정지 처리 먼저)'
         else 'READY (DB) — JKL_start_gate.mjs 도 READY 일 때만 J → K → L 을 한 window 에서 연속 수행'
       end as verdict;

rollback;
