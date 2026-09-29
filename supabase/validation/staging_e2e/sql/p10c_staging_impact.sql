-- PHASE 10C.1 — Staging 재개 영향 점검 (READ ONLY · SELECT/WITH 만)
-- ---------------------------------------------------------------------
-- 실행: node supabase/validation/staging_e2e/remote_readonly_query.mjs supabase/validation/staging_e2e/sql/p10c_staging_impact.sql
-- 각 문장은 runner 가 `begin transaction read only; … rollback;` 로 감싼다. 상태를 바꾸지 않는다.
-- 개인 정보 없음: 원아 · 학부모 · 교사 이름 · 이메일 · 전화 · 사유 본문을 읽지 않는다 (기관 이름 · 상품 · 날짜 · 코드 · 개수만).
-- private.contract_readiness_internal 은 STABLE 판정 함수다 (쓰기 없음).

-- 0. 기준: 합성 계정 지문 · PHASE 10C migration 적용 여부 (적용되지 않았어야 한다)
select
  (select count(*) from auth.users)::int as users_total,
  (select count(*) from auth.users where email not like '%@example.test')::int as non_synthetic_users,
  (to_regprocedure('public.set_capability_release(text,boolean,text,timestamp with time zone)') is not null) as p10c_rpc_present,
  (select count(*) from supabase_migrations.schema_migrations where version = '20261002100000')::int as p10c_migration_rows;

-- A-1. 계약 상태별 개수 (0 포함)
select s.status,
       (select count(*) from public.contracts c where c.status = s.status)::int as contracts
from (values ('draft'), ('active'), ('suspended'), ('ended')) as s(status)
order by array_position(array['draft', 'active', 'suspended', 'ended'], s.status);

-- A-2. 기관 상태별 개수
select o.status, count(*)::int as organizations
from public.organizations o
group by o.status
order by o.status;

-- B. 정지 계약 목록 (운영 메타데이터만)
select c.id as contract_id,
       c.organization_id,
       o.name as organization_name,
       o.status as organization_status,
       p.code as product_code,
       pv.version_label,
       pv.lifecycle as version_lifecycle,
       c.start_date,
       c.end_date,
       c.status as contract_status,
       (c.start_date <= private.local_today() and c.end_date >= private.local_today()) as in_period_today
from public.contracts c
join public.organizations o on o.id = c.organization_id
join public.product_versions pv on pv.id = c.product_version_id
join public.products p on p.id = pv.product_id
where c.status = 'suspended'
order by c.start_date, c.id;

-- C · D. 현재 Readiness · 재개 projection
--   failed_items            = 지금 판정의 실패 항목 전체 (저장된 행이 suspended 라 contract 항목 포함)
--   other_blocker_count     = contract/contract_suspended 를 뺀 실패 항목 수 (PHASE 10C 가 보는 것)
--   structural_blocker_count= class_scope · pilot_capacity · pilot_teachers 실패 (PHASE 08 CT010 · 현재 Staging 에서도 재개 거부)
--   resumable_before_p10c   = 현재 Staging(PHASE 08 규칙)에서 재개가 허용되는지 (구조 항목만 확인)
--   p10c_expected_result    = PHASE 10C 적용 시 예상 (CT010 → CT005 → 통과 순)
with s as (
  select c.id, private.contract_readiness_internal(c.id) as r
  from public.contracts c
  where c.status = 'suspended'
),
f as (
  select s.id, e
  from s
  cross join lateral jsonb_array_elements(s.r -> 'items') e
  where (e ->> 'ok')::boolean is not true
),
agg as (
  select s.id,
         (s.r ->> 'ready')::boolean as ready_now,
         (select count(*) from f where f.id = s.id)::int as failed_items,
         (select count(*) from f where f.id = s.id
            and not (f.e ->> 'code' = 'contract' and f.e ->> 'reason' = 'contract_suspended'))::int as other_blocker_count,
         (select count(*) from f where f.id = s.id
            and f.e ->> 'code' in ('class_scope', 'pilot_capacity', 'pilot_teachers'))::int as structural_blocker_count,
         (select jsonb_agg(jsonb_build_object('code', f.e ->> 'code', 'reason', f.e ->> 'reason', 'detail', f.e -> 'detail')
                           order by f.e ->> 'code')
          from f where f.id = s.id) as failed
  from s
)
select a.id as contract_id,
       a.ready_now,
       a.failed_items,
       a.other_blocker_count,
       a.structural_blocker_count,
       (a.structural_blocker_count = 0) as resumable_before_p10c,
       case when a.other_blocker_count = 0 then 'WOULD_PASS_IF_ONLY_STATUS_WERE_ACTIVE'
            else 'WOULD_STILL_FAIL_READINESS' end as p10c_reactivation_projection,
       case when a.structural_blocker_count > 0 then 'CT010'
            when a.other_blocker_count > 0 then 'CT005'
            else 'RESUMES' end as p10c_expected_result,
       a.failed
from agg a
order by a.id;

-- E. 기능 출시 상태 (전체 · 요청 5종 포함)
select pc.code, pc.is_released, pc.blocked_by, pc.updated_at
from public.platform_capabilities pc
order by pc.code;

-- F. 정지 계약 상품 버전의 parent_portal 포함 여부 · 현재 blocker 여부
select c.id as contract_id,
       p.code as product_code,
       pv.version_label,
       (select array_agg(pf.feature_code order by pf.feature_code)
        from public.product_version_features pf
        where pf.product_version_id = pv.id) as version_features,
       exists (select 1 from public.product_version_features pf
               where pf.product_version_id = pv.id and pf.feature_code = 'parent_portal') as version_has_parent_portal,
       pp.is_released as parent_portal_released,
       pp.blocked_by as parent_portal_blocked_by,
       (exists (select 1 from public.product_version_features pf
                where pf.product_version_id = pv.id and pf.feature_code = 'parent_portal')
        and (not coalesce(pp.is_released, false) or cardinality(coalesce(pp.blocked_by, '{}'::text[])) > 0)) as parent_portal_blocks_readiness
from public.contracts c
join public.product_versions pv on pv.id = c.product_version_id
join public.products p on p.id = pv.product_id
left join public.platform_capabilities pp on pp.code = 'parent_portal'
where c.status = 'suspended'
order by c.id;

-- G. 참고: 모든 상품 버전의 parent_portal 포함 여부 (정지 계약이 없을 때도 영향 범위 판단)
select p.code as product_code,
       pv.version_label,
       pv.lifecycle,
       exists (select 1 from public.product_version_features pf
               where pf.product_version_id = pv.id and pf.feature_code = 'parent_portal') as version_has_parent_portal,
       (select count(*) from public.contracts c where c.product_version_id = pv.id)::int as contracts_on_version
from public.product_versions pv
join public.products p on p.id = pv.product_id
order by p.code, pv.version_label;

-- H. 참고: 활성 계약이 나중에 정지되면 PHASE 10C 에서 재개할 수 있는지 (현재 Readiness · 계약 상태 항목 제외)
--   활성 계약은 contract 항목이 ok 다 → other_blocker_count = 현재 실패 항목 수
with s as (
  select c.id, private.contract_readiness_internal(c.id) as r
  from public.contracts c
  where c.status = 'active'
),
f as (
  select s.id, e
  from s
  cross join lateral jsonb_array_elements(s.r -> 'items') e
  where (e ->> 'ok')::boolean is not true
)
select s.id as contract_id,
       (s.r ->> 'ready')::boolean as ready_now,
       (select count(*) from f where f.id = s.id
          and not (f.e ->> 'code' = 'contract' and f.e ->> 'reason' = 'contract_suspended'))::int as other_blocker_count,
       case when (select count(*) from f where f.id = s.id
                    and not (f.e ->> 'code' = 'contract' and f.e ->> 'reason' = 'contract_suspended')) = 0
            then 'WOULD_RESUME_AFTER_SUSPEND' else 'WOULD_NOT_RESUME_AFTER_SUSPEND' end as p10c_projection_if_suspended,
       (select jsonb_agg(jsonb_build_object('code', f.e ->> 'code', 'reason', f.e ->> 'reason', 'detail', f.e -> 'detail')
                         order by f.e ->> 'code')
        from f where f.id = s.id) as failed
from s
order by s.id;
