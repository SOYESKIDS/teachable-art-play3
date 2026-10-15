-- Staff curriculum lookup without exposing the contracts table.
-- Teacher contract SELECT remains forbidden; this RPC returns only the mapped program ID.
-- Depends on E1 product_version_programs and existing effective-contract/role helpers.
create or replace function public.resolve_organization_content_program(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_contract_id uuid;
  v_program_id uuid;
begin
  if not private.has_org_role(p_organization_id, array['director','teacher']) then
    raise exception '찾을 수 없거나 접근 권한이 없습니다.' using errcode = '42501';
  end if;
  select c.id, m.program_id into v_contract_id, v_program_id
  from public.contracts c
  left join public.product_version_programs m on m.product_version_id=c.product_version_id
  where c.id=private.effective_contract_id(p_organization_id);
  if not found then
    return jsonb_build_object('ok',false,'reason','no_contract');
  end if;
  if v_program_id is null then
    return jsonb_build_object('ok',false,'reason','program_not_found');
  end if;
  return jsonb_build_object('ok',true,'program_id',v_program_id);
end;
$$;
revoke execute on function public.resolve_organization_content_program(uuid) from public, anon;
grant execute on function public.resolve_organization_content_program(uuid) to authenticated;
comment on function public.resolve_organization_content_program(uuid) is
  '기관 교직원에게 유효 계약의 교안 ID만 반환한다. 계약표 열람·본문 발행 권한은 추가하지 않는다.';
