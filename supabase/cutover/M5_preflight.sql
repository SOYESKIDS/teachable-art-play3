-- =====================================================================
-- M5 PREFLIGHT — legacy 쓰기 회수 cutover 전 DB 점검 (READ ONLY) · PHASE 08
-- ---------------------------------------------------------------------
-- 실행:  psql -v ON_ERROR_STOP=1 -f supabase/cutover/M5_preflight.sql
-- · 데이터를 바꾸지 않는다 (read only transaction · 마지막 rollback)
-- · 앱 점검은 따로: node supabase/cutover/M5_app_preflight.mjs (legacy 쓰기 호출 0 확인)
-- · 기관 · 반 이름과 개수만 출력한다. 아동 이름 · 기록 본문 · token 은 출력하지 않는다.
-- · VERDICT = SAFE 이고 앱 점검이 PASS 일 때만 운영자가 -v m5_preflight=passed 를 줄 수 있다.
-- =====================================================================

begin;
set transaction read only;

\echo
\echo '== [BLOCKING] 1. 선행 cutover (runbook 순서: G-2 → G-1 → Step J → M5)'
select
  pg_catalog.pg_get_functiondef('private.is_soyes_admin()'::regprocedure) not like '%''sales''%' as g2_applied,
  exists (select 1 from pg_catalog.pg_trigger
          where tgname = 'trg_class_program_assignments_entitlement_gate' and not tgisinternal) as g1_applied,
  to_regprocedure('private.gate_growth5_observation_write()') is not null as phase08_migrations_applied;

\echo
\echo '== [BLOCKING] 2. 계약 적용이 안 된 운영 기관 (운영 중 반이 있는데 활성화된 계약 없음)'
select o.id as organization_id, o.name,
       (select count(*) from public.classes cl where cl.organization_id = o.id and cl.status = 'active') as active_classes
from public.organizations o
where o.status = 'active'
  and exists (select 1 from public.classes cl where cl.organization_id = o.id and cl.status = 'active')
  and not private.org_contract_governed(o.id)
order by o.name;

\echo
\echo '== [WARN] 3. 작성 중(draft) legacy 성장 리포트 — M5 후 수정 · 완료 불가 (조회는 유지)'
select o.name as organization, count(*) as draft_legacy_reports
from public.child_growth_reports r
join public.organizations o on o.id = r.organization_id
where r.status = 'draft'
group by o.name
order by o.name;

\echo
\echo '== [WARN] 4. 진행 중 · 예정 수업의 legacy 형식 관찰 — M5 후 수정 불가 (Growth5 관찰로 새로 기록)'
select o.name as organization, count(*) as legacy_observations_open_sessions
from public.class_session_observations ob
join public.class_sessions s on s.id = ob.class_session_id
join public.organizations o on o.id = ob.organization_id
where ob.taxonomy is distinct from 'growth5'
  and s.status in ('scheduled', 'in_progress')
group by o.name
order by o.name;

\echo
\echo '== [WARN] 5. 검토 전 legacy 관찰 AI 초안 — M5 후 검토 · 재생성 불가'
select o.name as organization, count(*) as unreviewed_ai_drafts
from public.class_session_observation_ai_drafts d
join public.organizations o on o.id = d.organization_id
where d.review_status = 'generated'
group by o.name
order by o.name;

\echo
\echo '== [INFO] 6. 유효한 legacy 공유 링크 — M5 후에도 만료 · 중지까지 동작 · 원장 중지 가능 (DEC-041)'
select o.name as organization, count(*) as active_legacy_shares, max(s.expires_at) as last_expiry
from public.child_growth_report_shares s
join public.organizations o on o.id = s.organization_id
where s.revoked_at is null and s.expires_at > pg_catalog.clock_timestamp()
group by o.name
order by o.name;

\echo
\echo '== [INFO] 7. 진행 중 수업 — M5 후에는 담당 교사 마치기 · 원장 복구 · 취소 RPC 로만 정리'
select o.name as organization, count(*) as in_progress_sessions
from public.class_sessions s
join public.organizations o on o.id = s.organization_id
where s.status = 'in_progress'
group by o.name
order by o.name;

\echo
\echo '== VERDICT'
select case
         when not (
           pg_catalog.pg_get_functiondef('private.is_soyes_admin()'::regprocedure) not like '%''sales''%'
           and exists (select 1 from pg_catalog.pg_trigger
                       where tgname = 'trg_class_program_assignments_entitlement_gate' and not tgisinternal)
           and to_regprocedure('private.gate_growth5_observation_write()') is not null
         ) then 'NOT SAFE — 선행 cutover(G-2 · G-1) 또는 PHASE 08 migration 미적용'
         when exists (
           select 1 from public.organizations o
           where o.status = 'active'
             and exists (select 1 from public.classes cl where cl.organization_id = o.id and cl.status = 'active')
             and not private.org_contract_governed(o.id)
         ) then 'NOT SAFE — 계약 적용이 안 된 운영 기관 있음'
         else 'SAFE TO APPLY M5 (DB) · M5_app_preflight.mjs PASS 도 필요 · WARN 항목은 사람이 검토'
       end as verdict;

rollback;
