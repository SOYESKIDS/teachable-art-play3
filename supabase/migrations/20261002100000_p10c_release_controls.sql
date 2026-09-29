-- =====================================================================
-- PHASE 10C — 기능 출시 변경 audit RPC · 정지 후 재개(suspended → active) Readiness 재확인
-- ---------------------------------------------------------------------
-- 근거: DEC-063 (약속한 기능 · 콘텐츠 전체 Ready 여야 활성화) · DEC-106 · DEC-111 · PHASE 10A SEC-NEW-1 · SEC-NEW-2
--
-- 문제 (PHASE 10A):
--   1. platform_capabilities.is_released 를 앱이 직접 UPDATE 했다 — 사유 없음 · blocked_by 확인은 앱에만 있음.
--   2. suspended → active 는 구조 항목(CT010)만 다시 확인했다 — 기능 출시 · 정책 blocker · 콘텐츠 ·
--      프로그램 배정 · 기관 상태가 바뀌었어도 재개할 수 있었다.
--
-- 규칙:
--   · 출시 · 미출시 변경은 public.set_capability_release 만 (HQ Admin · 사유 필수 · updated_at 동시성 검사)
--   · blocked_by 가 비어 있지 않은 기능은 출시 상태가 될 수 없다 — DB trigger 가 모든 경로에서 판정 (CP003)
--     (이미 출시된 기능에 blocker 를 추가하는 것은 막지 않는다 — blocker 정책 결정은 별도 · Readiness 가 Ready 아님으로 판정)
--   · authenticated 의 is_released 직접 UPDATE 권한 회수 (blocked_by · note 권한 · 정책은 그대로)
--   · audit: 기존 capability.changed 이벤트 하나로 남긴다 (중복 없음 · 기존 metadata 키 유지)
--       + reason (RPC 사유) · actor (auth.uid) · released_from / released_to · blocked_by_from · via
--   · 출시는 계약 Readiness 항목만 바꾼다 — class_write_allowed 등 런타임 권한 함수는 바꾸지 않는다
--   · suspended → active: HQ Admin 만 · 구조 항목 CT010 (PHASE 08 그대로) → 활성화와 같은 전체 Readiness (CT005)
--       행 자체의 'suspended' 는 전환 대상('active')으로 본다 · 기관 정지는 그대로 Ready 아님
--       activated_at · activated_by 는 최초 활성화 값 유지 (enforce_contract_write 그대로)
--
-- 이 migration 은 어떤 기능도 출시하지 않는다 (class_mode · weekly_report 미출시 · parent_portal CO-12 blocker 유지).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 출시 invariant: blocker 가 있는 기능은 출시 상태가 될 수 없다 (모든 쓰기 경로)
-- ---------------------------------------------------------------------

create or replace function private.enforce_capability_release()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.is_released
    and (tg_op = 'INSERT' or not old.is_released)
    and cardinality(new.blocked_by) > 0
  then
    raise exception '정책 결정 대기 중인 기능은 출시할 수 없습니다.'
      using errcode = 'CP003',
            detail = jsonb_build_object('code', new.code, 'blocked_by', to_jsonb(new.blocked_by))::text;
  end if;
  return new;
end;
$$;

revoke execute on function private.enforce_capability_release() from public, anon, authenticated;

drop trigger if exists trg_platform_capabilities_release_guard on public.platform_capabilities;
create trigger trg_platform_capabilities_release_guard
  before insert or update on public.platform_capabilities
  for each row execute function private.enforce_capability_release();


-- ---------------------------------------------------------------------
-- 2. audit: capability.changed 하나 · 사유 · 이전/이후 출시 상태 · blocker 변화
-- ---------------------------------------------------------------------
-- 사유는 set_capability_release 가 transaction-local 설정으로 넘긴다 (다른 경로는 via = direct · reason null).

create or replace function private.audit_platform_capability_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(current_setting('soye.capability_release_reason', true), '')), '');
  v_metadata jsonb;
begin
  v_metadata := jsonb_build_object(
    'code', new.code,
    'is_released', new.is_released,
    'blocked_by', to_jsonb(new.blocked_by),
    'via', case when v_reason is null then 'direct' else 'set_capability_release' end
  );

  if old.is_released is distinct from new.is_released then
    v_metadata := v_metadata || jsonb_build_object(
      'released_from', old.is_released,
      'released_to', new.is_released
    );
  end if;

  if old.blocked_by is distinct from new.blocked_by then
    v_metadata := v_metadata || jsonb_build_object('blocked_by_from', to_jsonb(old.blocked_by));
  end if;

  perform private.record_audit_event(
    null,
    'capability.changed',
    'platform_capability',
    null,
    case when old.is_released is distinct from new.is_released then v_reason else null end,
    v_metadata
  );
  return new;
end;
$$;

revoke execute on function private.audit_platform_capability_change() from public, anon, authenticated;
-- trigger trg_platform_capabilities_audit (after update · 출시 또는 blocker 변화 시) 는 그대로 쓴다


-- ---------------------------------------------------------------------
-- 3. public.set_capability_release (HQ Admin · 사유 · 동시성)
-- ---------------------------------------------------------------------

create or replace function public.set_capability_release(
  p_code text,
  p_released boolean,
  p_reason text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_row record;
  v_updated_at timestamptz;
begin
  if not private.is_hq_admin() then
    raise exception '기능 출시 상태는 본사 운영 관리자만 바꿀 수 있습니다.' using errcode = 'CP002';
  end if;

  if p_code is null or not private.is_known_feature_code(p_code) then
    raise exception '알 수 없는 기능입니다.' using errcode = 'CP001';
  end if;

  if p_released is null or p_expected_updated_at is null then
    raise exception '요청 값을 확인할 수 없습니다.' using errcode = 'CP001';
  end if;

  if v_reason is null then
    raise exception '출시 · 미출시 변경 사유를 입력해 주세요.' using errcode = 'CP001';
  end if;

  if char_length(v_reason) > 500 then
    raise exception '사유는 500자 이내로 입력해 주세요.' using errcode = 'CP001';
  end if;

  select pc.code, pc.is_released, pc.blocked_by, pc.updated_at
  into v_row
  from public.platform_capabilities pc
  where pc.code = p_code
  for update;

  if not found then
    raise exception '알 수 없는 기능입니다.' using errcode = 'CP001';
  end if;

  if v_row.updated_at is distinct from p_expected_updated_at then
    raise exception '다른 곳에서 먼저 변경되었습니다. 새로고침한 뒤 다시 확인해 주세요.' using errcode = 'CP004';
  end if;

  if v_row.is_released = p_released then
    raise exception '이미 % 상태입니다.', case when p_released then '출시' else '미출시' end using errcode = 'CP001';
  end if;

  -- blocker 는 여기서 해제하지 않는다 (정책 결정은 별도 · trigger 가 같은 규칙을 한 번 더 판정)
  if p_released and cardinality(v_row.blocked_by) > 0 then
    raise exception '정책 결정 대기 중인 기능은 출시할 수 없습니다.' using errcode = 'CP003';
  end if;

  perform pg_catalog.set_config('soye.capability_release_reason', v_reason, true);

  update public.platform_capabilities pc
  set is_released = p_released,
      updated_by = (select auth.uid())
  where pc.code = p_code
  returning pc.updated_at into v_updated_at;

  perform pg_catalog.set_config('soye.capability_release_reason', '', true);

  return jsonb_build_object('code', p_code, 'is_released', p_released, 'updated_at', v_updated_at);
end;
$$;

revoke execute on function public.set_capability_release(text, boolean, text, timestamptz) from public, anon;
grant execute on function public.set_capability_release(text, boolean, text, timestamptz) to authenticated;


-- ---------------------------------------------------------------------
-- 4. 직접 UPDATE 권한: is_released 회수 (blocked_by · note 는 기존 정책 그대로)
-- ---------------------------------------------------------------------

revoke update (is_released) on public.platform_capabilities from authenticated;


-- ---------------------------------------------------------------------
-- 5. 정지 후 재개(suspended → active) = 활성화와 같은 Readiness
-- ---------------------------------------------------------------------
-- trigger trg_contracts_reactivation_check (PHASE 08) 의 함수를 확장한다.
-- 순서: HQ Admin → 구조 항목 CT010 (기존 그대로) → 전체 Readiness CT005 (draft → active 와 같은 detail 형태)

create or replace function private.enforce_contract_reactivation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_readiness jsonb;
  v_failed jsonb;
  v_items jsonb;
begin
  if not (old.status = 'suspended' and new.status = 'active') then
    return new;
  end if;

  if not private.is_hq_admin() then
    raise exception '계약 재개는 본사 운영 관리자만 할 수 있습니다.' using errcode = '42501';
  end if;

  v_readiness := private.contract_readiness_internal(new.id);

  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_failed
  from jsonb_array_elements(v_readiness -> 'items') e
  where e ->> 'code' in ('class_scope', 'pilot_capacity', 'pilot_teachers')
    and (e ->> 'ok')::boolean is not true;

  if jsonb_array_length(v_failed) > 0 then
    raise exception '반 범위 · 한도 조건을 충족하지 않아 계약을 다시 시작할 수 없습니다.'
      using errcode = 'CT010',
            detail = v_failed::text;
  end if;

  -- 저장된 행은 아직 'suspended' 다 → 계약 상태 항목만 전환 대상으로 본다 (기관 정지 등 다른 사유는 그대로)
  select coalesce(jsonb_agg(
           case
             when t.e ->> 'code' = 'contract' and t.e ->> 'reason' = 'contract_suspended'
               then t.e || jsonb_build_object('ok', true, 'reason', null)
             else t.e
           end
           order by t.ord), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(v_readiness -> 'items') with ordinality as t(e, ord);

  if exists (
    select 1 from jsonb_array_elements(v_items) e
    where (e ->> 'ok')::boolean is not true
  ) then
    raise exception '서비스 준비가 끝나지 않아 계약을 다시 시작할 수 없습니다.'
      using errcode = 'CT005',
            detail = jsonb_build_object('ready', false, 'items', v_items)::text;
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_contract_reactivation() from public, anon, authenticated;
