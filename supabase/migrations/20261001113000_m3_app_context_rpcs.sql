-- =====================================================================
-- PHASE 07 · M3 — App context RPC (entitlement 조회 · 화면 분기용)
-- ---------------------------------------------------------------------
-- 근거: DEC-044 · DEC-056 · DEC-083 · DEC-097 · DEC-106
--
-- 화면은 이 결과로 메뉴 · 버튼을 정하지만, 권한의 최종 판정은 각 RPC ·
-- trigger · RLS 가 다시 한다 (버튼 숨김만으로 보안 구현 금지).
-- 반환에는 가격 · 청구 정보가 없다.
-- =====================================================================


create or replace function public.organization_entitlements(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_contract record;
begin
  if not (
    private.has_org_role(p_organization_id, array['director', 'teacher'])
    or private.is_hq_admin()
  ) then
    raise exception '찾을 수 없거나 접근 권한이 없습니다.' using errcode = '42501';
  end if;

  select c.id, c.status, c.start_date, c.end_date,
         p.code as product_code, p.offer_type, pv.week_from, pv.week_to,
         pv.children_per_class
  into v_contract
  from public.contracts c
  join public.product_versions pv on pv.id = c.product_version_id
  join public.products p on p.id = pv.product_id
  where c.id = private.effective_contract_id(p_organization_id);

  return jsonb_build_object(
    'service_mode', private.org_service_mode(p_organization_id),
    'product_code', v_contract.product_code,
    'offer_type', v_contract.offer_type,
    'contract_status', v_contract.status,
    'contract_start_date', v_contract.start_date,
    'contract_end_date', v_contract.end_date,
    'week_from', v_contract.week_from,
    'week_to', v_contract.week_to,
    'children_per_class', v_contract.children_per_class,
    'features', coalesce((
      select jsonb_agg(f.feature_code order by f.feature_code)
      from public.product_version_features f
      join public.contracts c on c.product_version_id = f.product_version_id
      where c.id = v_contract.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.organization_entitlements(uuid) from public, anon;
grant execute on function public.organization_entitlements(uuid) to authenticated;


create or replace function public.class_entitlements(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_class record;
begin
  select cl.id, cl.organization_id, cl.status
  into v_class
  from public.classes cl
  where cl.id = p_class_id;

  if not found or not (
    private.is_assigned_class_teacher(p_class_id)
    or private.has_org_role(v_class.organization_id, array['director'])
    or private.is_hq_admin()
  ) then
    raise exception '찾을 수 없거나 접근 권한이 없습니다.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'service_mode', private.org_service_mode(v_class.organization_id),
    'in_contract_scope', private.class_in_effective_contract_scope(p_class_id),
    'class_mode_write', private.class_write_allowed(p_class_id, 'class_mode'),
    'weekly_report_write', private.class_write_allowed(p_class_id, 'weekly_report'),
    'ai_c1', private.class_ai_capability_allowed(p_class_id, 'c1'),
    'ai_c2', private.class_ai_capability_allowed(p_class_id, 'c2'),
    'ai_c3', private.class_ai_capability_allowed(p_class_id, 'c3')
  );
end;
$$;

revoke execute on function public.class_entitlements(uuid) from public, anon;
grant execute on function public.class_entitlements(uuid) to authenticated;
