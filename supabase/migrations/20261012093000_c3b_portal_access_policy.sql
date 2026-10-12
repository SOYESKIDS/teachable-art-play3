-- =====================================================================
-- 실행 묶음 C3 보완 — Portal 접근 정책 게이트
-- ---------------------------------------------------------------------
-- 근거: 사용자 지시 항목 3 — "필수 보안 설정이나 migration 이 없을 때 제한을
--       우회해 민감한 내용을 제공하지 않도록 처리" ·
--       "기존 무기한 링크의 소급 처리 결정과 새 링크 정책을 구분" ·
--       "이전 링크를 원격에서 변경하지 마"
--
-- 문제 1 — 제한 장치가 없으면 그냥 통과했다
--   20261012091000 의 rate limit 은 앱에서 "미적용·미설정이면 조회를 허용"하도록
--   되어 있었다. 보호자가 못 보는 것보다 낫다는 판단이었지만, 그러면 **보안 설정이
--   빠진 환경에서 아동 기록이 제한 없이 나간다.** 민감 내용 쪽으로 기울여 고친다.
--
-- 문제 2 — 무기한 legacy 링크가 조용히 영구 제공된다
--   `read_child_portal` 은 `expires_at is null` 을 "만료 없음" 으로 읽는다.
--   기존 행을 바꾸는 것은 소급 처리 **결정**이고, 새 링크에 만료를 주는 것은
--   **정책**이다. 두 가지를 섞지 않으려면 읽기 경로에서 분리해 판정해야 한다.
--
-- 이 migration 이 하는 것
--   · Portal 접근 정책 1행 테이블 (무기한 legacy 허용 여부 · 변경 사유 · audit)
--   · 정책을 적용하는 wrapper RPC `read_child_portal_guarded`
--   · 기존 `read_child_portal` 을 **고치지 않는다** (이미 작성된 migration 보존)
--
-- 이 migration 이 하지 않는 것
--   ★ 기존 `child_portals` 행을 바꾸지 않는다. UPDATE 문이 없다.
--   ★ 정책 기본값을 "거부" 로 두지 않는다.
--     기본값은 현재 동작(허용)이다. 적용만으로 살아 있는 링크가 끊기면
--     그것이 곧 "원격에서 이전 링크를 바꾼" 결과가 된다.
--     대신 정책이 **명시적으로 보이고**, 한 줄로 바꿀 수 있게 한다.
--   ★ parent_portal 기능을 출시하지 않는다.
--
-- 적용 상태: **원격 미적용.** 로컬 파일로만 둔다.
-- 의존: 20261001093000 (child_portals) · 20261001120000 (read_child_portal)
--       20261001090000 (audit_events) · 20261001110000 (is_hq_admin)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 접근 정책 (1행)
-- ---------------------------------------------------------------------

create table if not exists public.portal_access_policy (

  -- 1행만 존재하게 묶는다
  id boolean primary key default true
    constraint portal_access_policy_single_row_check check (id),

  /*
   * 만료가 없는(legacy) 활성 링크를 계속 제공할지.
   *
   * ★ 기본값 true = 현재 동작 유지.
   *   false 로 바꾸면 기존 무기한 링크가 **행을 바꾸지 않고** 거부된다.
   *   소급 처리 결정을 행 UPDATE 없이 되돌릴 수 있게 하기 위한 구조다.
   */
  allow_unlimited_legacy boolean not null default true,

  /** 왜 그렇게 정했는지. 운영자가 바꿀 때 기록한다 */
  decision_note text
    constraint portal_access_policy_decision_note_check
    check (decision_note is null or char_length(decision_note) <= 500),

  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,

  updated_at timestamptz not null default pg_catalog.clock_timestamp()
);

comment on table public.portal_access_policy is
  '보호자 공유 링크 접근 정책. 무기한 legacy 링크 제공 여부를 행 변경 없이 판정한다.';

insert into public.portal_access_policy (id, allow_unlimited_legacy, decision_note)
values (
  true,
  true,
  '초기값 — 현재 동작(무기한 legacy 링크 제공)을 유지한다. 소급 처리 결정 후 변경한다.'
)
on conflict (id) do nothing;

alter table public.portal_access_policy enable row level security;

drop policy if exists portal_access_policy_select_hq on public.portal_access_policy;

create policy portal_access_policy_select_hq
  on public.portal_access_policy
  for select
  to authenticated
  using ((select private.is_hq_admin()));

revoke all on public.portal_access_policy from anon;
revoke all on public.portal_access_policy from authenticated;
grant select on public.portal_access_policy to authenticated;


-- ---------------------------------------------------------------------
-- 2. 정책 조회 helper
-- ---------------------------------------------------------------------
-- anon 이 wrapper RPC 안에서 읽어야 하므로 DEFINER 로 둔다.
-- 돌려주는 것은 boolean 하나다 — 정책 행의 다른 내용은 나가지 않는다.

create or replace function private.portal_allows_unlimited_legacy()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  -- 행이 없으면 보수적으로 거부한다. 정책을 모르는 상태에서 제공하지 않는다.
  select coalesce(
    (select p.allow_unlimited_legacy from public.portal_access_policy p where p.id),
    false
  );
$$;

revoke execute on function private.portal_allows_unlimited_legacy() from public;
grant execute on function private.portal_allows_unlimited_legacy() to anon;
grant execute on function private.portal_allows_unlimited_legacy() to authenticated;


-- ---------------------------------------------------------------------
-- 3. 정책을 적용하는 wrapper
-- ---------------------------------------------------------------------
-- ★ 기존 read_child_portal 을 고치지 않는다.
--   이미 작성된 migration 의 본문을 덮어쓰지 않는다는 규칙을 지킨다.
--   대신 앞단에서 정책을 판정하고, 통과하면 그대로 위임한다.
--
-- ★ 실패 이유를 구분해 돌려주지 않는다.
--   무효 · 중지 · 만료 · 정책 거부를 모두 null 로 돌려준다.
--   앱은 지금처럼 { ok: false } 하나만 내보낸다.

create or replace function public.read_child_portal_guarded(
  p_public_id uuid,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_expires_at timestamptz;
  v_status text;
begin
  -- 정책 판정에 필요한 최소 정보만 본다. 토큰 검증은 위임 대상이 한다.
  select p.expires_at, p.status
  into v_expires_at, v_status
  from public.child_portals p
  where p.public_id = p_public_id;

  if not found then
    return null;
  end if;

  -- 만료가 없는 legacy 링크는 정책이 허용할 때만 통과한다.
  -- 행을 바꾸지 않고 읽기 경로에서 막는다.
  if v_status = 'active'
     and v_expires_at is null
     and not private.portal_allows_unlimited_legacy() then
    return null;
  end if;

  -- 토큰 · 중지 · 만료 · 계약 범위 · 숨김 판정은 기존 함수가 그대로 한다.
  return public.read_child_portal(p_public_id, p_token);
end;
$$;

comment on function public.read_child_portal_guarded(uuid, text) is
  '접근 정책을 적용한 뒤 read_child_portal 에 위임한다. 실패 이유를 구분하지 않는다.';

revoke execute on function public.read_child_portal_guarded(uuid, text) from public;
revoke execute on function public.read_child_portal_guarded(uuid, text) from authenticated;
grant execute on function public.read_child_portal_guarded(uuid, text) to anon;


-- ---------------------------------------------------------------------
-- 4. 정책 변경 RPC (HQ Admin)
-- ---------------------------------------------------------------------

create or replace function public.set_portal_access_policy(
  p_allow_unlimited_legacy boolean,
  p_decision_note text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_before boolean;
begin
  if not (select private.is_hq_admin()) then
    raise exception 'PP401 권한이 없습니다.' using errcode = 'PP401';
  end if;

  if p_decision_note is null or btrim(p_decision_note) = '' then
    raise exception 'PP400 변경 사유를 입력해 주세요.' using errcode = 'PP400';
  end if;

  select p.allow_unlimited_legacy into v_before
  from public.portal_access_policy p where p.id;

  update public.portal_access_policy
  set
    allow_unlimited_legacy = p_allow_unlimited_legacy,
    decision_note = p_decision_note,
    decided_by = auth.uid(),
    decided_at = pg_catalog.clock_timestamp(),
    updated_at = pg_catalog.clock_timestamp()
  where id;

  insert into public.audit_events (
    organization_id, actor_user_id, event_type, target_type, target_id, reason, metadata
  )
  values (
    null,
    auth.uid(),
    'portal.access_policy_changed',
    'portal_policy',
    null,
    p_decision_note,
    jsonb_build_object(
      'allow_unlimited_legacy_from', v_before,
      'allow_unlimited_legacy_to', p_allow_unlimited_legacy
    )
  );
end;
$$;

-- 정책 행 직접 UPDATE 권한을 주지 않는다. 이 RPC 만 쓴다 (사유 · audit 강제).
revoke execute on function public.set_portal_access_policy(boolean, text) from public;
revoke execute on function public.set_portal_access_policy(boolean, text) from anon;
grant execute on function public.set_portal_access_policy(boolean, text) to authenticated;


-- =====================================================================
-- 변경하지 않은 것 (명시)
-- ---------------------------------------------------------------------
--   public.read_child_portal                      본문 그대로 (wrapper 가 앞에 선다)
--   public.child_portals 의 모든 행                **그대로.** UPDATE 문이 없다
--   20261012091000 의 z_ 발급 trigger             그대로 (새 링크 만료 정책)
--   child_growth_report_shares (legacy 30일)       그대로
--   platform_capabilities.parent_portal            그대로 (CO-12 blocker 유지)
--
--   ★ 새 링크 정책(발급 시 만료 부여)과 기존 링크 소급 처리(정책 토글 또는
--     apply_portal_share_window 실행)는 서로 다른 수단으로 분리되어 있다.
-- =====================================================================
