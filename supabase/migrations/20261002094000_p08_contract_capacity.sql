-- =====================================================================
-- PHASE 08 · WS6 (D6) — 계약 반 수 한도 · Pilot 한도의 지속 판정
-- ---------------------------------------------------------------------
-- 근거: DEC-051 · DEC-054 · DEC-063 · DEC-082
--
-- 문제: max_classes · Pilot 한도는 활성화(draft → active) 때만 Readiness 로 확인했다.
--       활성화 이후 계약 반 범위 추가 · 정지 후 재개(suspended → active)에서는 다시 확인하지 않았다.
--
-- 규칙:
--   · 활성화된 계약(active · suspended)의 반 범위 추가(contract_classes INSERT):
--       반 수 ≤ product_versions.max_classes (값이 있을 때 · Pilot 최대 2 · CT009)
--       Pilot 계약이면 추가하는 반의 active 원아 ≤ children_per_class (15 · DEC-051 HARD · CT009)
--     초안(draft)은 막지 않는다: DEC-051 은 데이터 준비 중 Pilot 반 16명 이상을 허용하고 Readiness(Ready 불가 ·
--     활성화 차단)로 판정한다 (production-shaped 검증 READINESS 항목과 같은 흐름).
--   · 정지 후 재개(suspended → active): Readiness 의 구조 항목을 다시 확인 (CT010)
--       class_scope (반 수 한도 · 보관 반 없음) · Pilot 이면 pilot_capacity · pilot_teachers
--     (콘텐츠 · 기능 출시 항목은 재개 조건으로 새로 만들지 않는다 — 활성화 조건 DEC-063 을 바꾸지 않음)
--   · 원아 등록 자체는 막지 않는다 (DEC-051: 정규 = ALLOW + OVERAGE RECORD · Pilot 15 초과는
--     Ready 불가 · 활성화 차단이며 등록 차단이 아니다). 정규 상품 16명+ 초과 인원은 계산값 그대로 (DEC-095).
-- =====================================================================


create or replace function private.enforce_contract_class_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract record;
  v_count integer;
  v_children integer;
begin
  select c.id, c.status, pv.max_classes, pv.children_per_class, p.offer_type
  into v_contract
  from public.contracts c
  join public.product_versions pv on pv.id = c.product_version_id
  join public.products p on p.id = pv.product_id
  where c.id = new.contract_id;

  -- 초안은 Readiness 가 판정한다 (DEC-051: 데이터 준비 중 16명 이상 가능 · Ready 불가 · 활성화 차단).
  -- 활성화된 계약(active · suspended)만 여기서 막는다 — 활성화 이후 한도가 깨지지 않게.
  if not found or v_contract.status not in ('active', 'suspended') then
    return new;
  end if;

  -- 같은 계약에 동시에 반을 추가해도 한도를 넘지 않도록 계약 단위로 직렬화한다
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('contract-classes:' || new.contract_id::text, 0)
  );

  if v_contract.max_classes is not null then
    select count(*) into v_count
    from public.contract_classes cc
    where cc.contract_id = new.contract_id;

    if v_count + 1 > v_contract.max_classes then
      raise exception '이 상품의 서비스 반 수 한도(%반)를 넘을 수 없습니다.', v_contract.max_classes
        using errcode = 'CT009';
    end if;
  end if;

  if v_contract.offer_type = 'pilot' then
    select count(*) into v_children
    from public.children ch
    where ch.class_id = new.class_id and ch.status = 'active';

    if v_children > v_contract.children_per_class then
      raise exception 'Pilot 반은 원아 %명 이하여야 합니다. (현재 %명)', v_contract.children_per_class, v_children
        using errcode = 'CT009';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_contract_class_capacity() from public, anon, authenticated;

drop trigger if exists trg_contract_classes_capacity_check on public.contract_classes;
create trigger trg_contract_classes_capacity_check
  before insert on public.contract_classes
  for each row execute function private.enforce_contract_class_capacity();


create or replace function private.enforce_contract_reactivation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_failed jsonb;
begin
  if not (old.status = 'suspended' and new.status = 'active') then
    return new;
  end if;

  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_failed
  from jsonb_array_elements(private.contract_readiness_internal(new.id) -> 'items') e
  where e ->> 'code' in ('class_scope', 'pilot_capacity', 'pilot_teachers')
    and (e ->> 'ok')::boolean is not true;

  if jsonb_array_length(v_failed) > 0 then
    raise exception '반 범위 · 한도 조건을 충족하지 않아 계약을 다시 시작할 수 없습니다.'
      using errcode = 'CT010',
            detail = v_failed::text;
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_contract_reactivation() from public, anon, authenticated;

drop trigger if exists trg_contracts_reactivation_check on public.contracts;
create trigger trg_contracts_reactivation_check
  before update on public.contracts
  for each row execute function private.enforce_contract_reactivation();
