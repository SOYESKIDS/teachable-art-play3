-- =====================================================================
-- G-1 PREFLIGHT — M3 entitlement write gate cutover 전 점검 (READ ONLY)
-- ---------------------------------------------------------------------
-- 실행:  psql -v ON_ERROR_STOP=1 -f supabase/cutover/G1_preflight.sql
-- · 데이터를 바꾸지 않는다 (read only transaction · 마지막 rollback)
-- · "migration 적용됨" ≠ "enforcement 적용해도 안전함" — 이 보고서의 VERDICT 로만 판단한다
-- · 새 bypass 필드 없음: 비운영 기관은 기존 모델의 organizations.status = 'suspended' 로만 구분한다
-- · 기관 · 반 이름이 출력된다. 아동 이름 · 기록 본문은 출력하지 않는다 (수만 센다)
-- =====================================================================

begin;
set transaction read only;

\echo
\echo '== [BLOCKING] 1. 유효 계약 없이 운영 중인 기관 (cutover 즉시 기록 쓰기 차단 대상)'
select o.id as organization_id, o.name, private.org_service_mode(o.id) as service_mode,
       (select count(*) from public.classes cl where cl.organization_id = o.id and cl.status = 'active') as active_classes,
       (select count(*) from public.contracts c where c.organization_id = o.id) as contracts_total,
       (select string_agg(distinct c.status, ',') from public.contracts c where c.organization_id = o.id) as contract_statuses
from public.organizations o
where o.status = 'active'
  and exists (select 1 from public.classes cl where cl.organization_id = o.id and cl.status = 'active')
  and private.org_service_mode(o.id) <> 'active'
order by o.name;

\echo
\echo '== [WARN] 2. 운영 중 반 중 유효 계약 범위 밖 (cutover 후 이 반의 새 수업 · 출결 · 관찰 쓰기 불가)'
select o.name as organization, cl.id as class_id, cl.name as class_name,
       private.org_service_mode(o.id) as service_mode
from public.classes cl
join public.organizations o on o.id = cl.organization_id
where o.status = 'active' and cl.status = 'active'
  and not private.class_in_effective_contract_scope(cl.id)
order by o.name, cl.name;

\echo
\echo '== [WARN] 3. active 배정 중 유효 entitlement 없음 (반 범위 밖 또는 class_mode 기능 없음)'
select o.name as organization, a.id as assignment_id, cl.name as class_name, a.origin_contract_id
from public.class_program_assignments a
join public.classes cl on cl.id = a.class_id
join public.organizations o on o.id = a.organization_id
where a.status = 'active' and o.status = 'active'
  and not private.class_write_allowed(a.class_id, 'class_mode')
order by o.name, cl.name;

\echo
\echo '== [WARN] 4. 쓰기 권한을 잃게 되는 예정 · 진행 중 세션 (수 · 기관 · 반별)'
select o.name as organization, cl.name as class_name,
       count(*) filter (where s.status = 'scheduled') as scheduled,
       count(*) filter (where s.status = 'in_progress') as in_progress,
       count(*) filter (where s.status = 'in_progress' and s.scheduled_date < private.local_today()) as in_progress_past_date,
       count(*) filter (where s.status = 'scheduled'
                          and s.week_no is not null
                          and not private.class_week_entitled(s.class_id, s.week_no)) as scheduled_outside_week_range
from public.class_sessions s
join public.classes cl on cl.id = s.class_id
join public.organizations o on o.id = s.organization_id
where s.status in ('scheduled', 'in_progress')
  and o.status = 'active'
  and not private.class_write_allowed(s.class_id, 'class_mode')
group by o.name, cl.name
order by o.name, cl.name;

\echo
\echo '== [WARN] 5. 읽기 전용이 되는 교사 업무 (담당 반에 쓰기 entitlement 없음)'
select o.name as organization,
       count(distinct m.id) as affected_teachers,
       count(distinct ct.class_id) as affected_classes
from public.class_teachers ct
join public.organization_members m on m.id = ct.organization_member_id and m.status = 'active' and m.role = 'teacher'
join public.classes cl on cl.id = ct.class_id and cl.status = 'active'
join public.organizations o on o.id = cl.organization_id and o.status = 'active'
where not private.class_write_allowed(ct.class_id, 'class_mode')
group by o.name
order by o.name;

\echo
\echo '== [INFO] 6. 상품 버전 lifecycle (draft 는 계약에 쓸 수 없음 · G-3)'
select p.code as product, pv.version_label, pv.lifecycle
from public.product_versions pv join public.products p on p.id = pv.product_id
order by p.code, pv.version_label;

\echo
\echo '== [INFO] 7. 초안 · 유효 계약의 Readiness 미충족 항목'
select o.name as organization, c.status as contract_status, c.start_date, c.end_date,
       e ->> 'code' as item, e ->> 'reason' as reason, e -> 'detail' as detail
from public.contracts c
join public.organizations o on o.id = c.organization_id
cross join lateral jsonb_array_elements(private.contract_readiness_internal(c.id) -> 'items') e
where c.status in ('draft', 'active')
  and (e ->> 'ok')::boolean is not true
order by o.name, c.start_date, item;

\echo
\echo '== [INFO] 8. 정책 blocker (platform_capabilities.blocked_by — 여기서 해제하지 않는다)'
select code, is_released, blocked_by, note
from public.platform_capabilities
where cardinality(blocked_by) > 0 or not is_released
order by code;

\echo
\echo '== [INFO] 9. 상품별 포함 기능 중 policy blocker (이 상품의 계약은 blocker 해소 전 활성화 불가)'
select p.code as product, pv.version_label, f.feature_code, pc.blocked_by
from public.product_version_features f
join public.product_versions pv on pv.id = f.product_version_id
join public.products p on p.id = pv.product_id
join public.platform_capabilities pc on pc.code = f.feature_code
where cardinality(pc.blocked_by) > 0
order by p.code, f.feature_code;

\echo
\echo '== [BLOCKING-FOR-PILOT] 10. Pilot 계약 반 정원 초과 (override 없음 · 활성화 차단)'
select o.name as organization, cl.name as class_name, pv.children_per_class,
       (select count(*) from public.children ch where ch.class_id = cl.id and ch.status = 'active') as active_children
from public.contracts c
join public.product_versions pv on pv.id = c.product_version_id
join public.products p on p.id = pv.product_id and p.offer_type = 'pilot'
join public.contract_classes cc on cc.contract_id = c.id
join public.classes cl on cl.id = cc.class_id
join public.organizations o on o.id = c.organization_id
where c.status in ('draft', 'active', 'suspended')
  and (select count(*) from public.children ch where ch.class_id = cl.id and ch.status = 'active') > pv.children_per_class
order by o.name, cl.name;

\echo
\echo '== [INFO] 11. 정규 계약 반 기준 인원 초과 (정보 · 차단 아님 · 청구 아님 · DEC-095)'
select o.name as organization, cl.name as class_name, pv.children_per_class,
       (select count(*) from public.children ch where ch.class_id = cl.id and ch.status = 'active') as active_children
from public.contracts c
join public.product_versions pv on pv.id = c.product_version_id
join public.products p on p.id = pv.product_id and p.offer_type = 'regular'
join public.contract_classes cc on cc.contract_id = c.id
join public.classes cl on cl.id = cc.class_id
join public.organizations o on o.id = c.organization_id
where c.status in ('draft', 'active', 'suspended')
  and (select count(*) from public.children ch where ch.class_id = cl.id and ch.status = 'active') > pv.children_per_class
order by o.name, cl.name;

\echo
\echo '== [INFO] 12. 비운영(정지) 기관 — cutover 차단 조건에서 제외 (기존 organizations.status)'
select o.id as organization_id, o.name, o.status
from public.organizations o
where o.status <> 'active'
order by o.name;

\echo
\echo '== VERDICT'
select case when count(*) = 0
            then 'SAFE TO APPLY M3 CUTOVER (blocking 0 · WARN 항목은 사람이 검토)'
            else 'NOT SAFE — blocking organizations: ' || count(*)
       end as verdict
from public.organizations o
where o.status = 'active'
  and exists (select 1 from public.classes cl where cl.organization_id = o.id and cl.status = 'active')
  and private.org_service_mode(o.id) <> 'active';

rollback;
