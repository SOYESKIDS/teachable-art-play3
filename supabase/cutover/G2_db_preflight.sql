-- =====================================================================
-- G-2 DB PREFLIGHT (READ ONLY) — HQ role / membership cutover 전 DB 점검 · PHASE 08
-- ---------------------------------------------------------------------
-- 실행:  psql -v ON_ERROR_STOP=1 -f supabase/cutover/G2_db_preflight.sql
-- · 데이터를 바꾸지 않는다 (read only transaction · 마지막 rollback)
-- · 앱 점검(G2_app_preflight.mjs)과 함께 통과해야 -v g2_app_preflight=passed 를 줄 수 있다.
-- · 개인 식별 정보(이메일 등)는 출력하지 않는다 (개수만).
-- =====================================================================

begin;
set transaction read only;

\echo
\echo '== [BLOCKING] 1. PHASE 08 membership authority · AI 판정 기반 (G2002 와 같은 조건)'
select
  to_regprocedure('public.hq_add_organization_member(uuid, uuid, text, text)') is not null as membership_add_rpc,
  to_regprocedure('public.hq_change_organization_member(uuid, uuid, text, text, text, timestamptz)') is not null as membership_change_rpc,
  exists (select 1 from pg_catalog.pg_trigger where tgname = 'trg_organization_members_write_check' and not tgisinternal) as membership_guard_trigger,
  exists (select 1 from pg_catalog.pg_trigger where tgname = 'trg_organization_members_audit' and not tgisinternal) as membership_audit_trigger,
  to_regprocedure('private.ai_assist_allowed(uuid, text, text)') is not null as ai_gate_function;

\echo
\echo '== [REQUIRED · ESCALATION] 2. READ-ONLY: active HQ Sales account count'
\echo '   0 보다 크면 G-2 전까지 HQ Sales 가 아동 기록 조회 · 기관 구성원 직접 쓰기(자기 자신 제외)를 할 수 있다 (감사 D3 · D2).'
\echo '   → G-2 적용 시점을 보안 우선으로 escalation 한다 (cutover-runbook §3).'
select count(*) as active_hq_sales_accounts
from private.admin_users au
where au.is_active = true and au.role = 'sales';

\echo
\echo '== [INFO] 3. active HQ Admin account count (G-2 후 구성원 변경 · 지원 열람 주체)'
select count(*) as active_hq_admin_accounts
from private.admin_users au
where au.is_active = true and au.role = 'admin';

\echo
\echo '== [INFO] 4. G-2 전 직접 DML 로 남은 구성원 변경 기록 (audit via = direct · PHASE 08 migration 적용 이후)'
select event_type, count(*) as events
from public.audit_events
where event_type like 'membership.%' and metadata ->> 'via' = 'direct'
group by event_type
order by event_type;

\echo
\echo '== VERDICT'
select case
         when to_regprocedure('public.hq_add_organization_member(uuid, uuid, text, text)') is null
           or to_regprocedure('private.ai_assist_allowed(uuid, text, text)') is null
           or not exists (select 1 from pg_catalog.pg_trigger where tgname = 'trg_organization_members_write_check' and not tgisinternal)
           then 'NOT READY — PHASE 08 일반 migration 미적용'
         when exists (select 1 from private.admin_users au where au.is_active and au.role = 'sales')
           then 'READY (DB) · ESCALATE — active HQ Sales 계정이 있다: G-2 적용 시점을 보안 우선으로 앞당긴다'
         else 'READY (DB) — G2_app_preflight.mjs PASS 도 필요'
       end as verdict;

rollback;
