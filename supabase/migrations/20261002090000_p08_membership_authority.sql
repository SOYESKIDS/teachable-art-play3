-- =====================================================================
-- PHASE 08 · WS1 (D2) — organization_members 변경 권한 · audit
-- ---------------------------------------------------------------------
-- 근거: PHASE 08 고정 결정 1 (HQ membership mutation policy) · DEC-079 · DEC-093
--
-- 이 migration 은 일반(forward) migration 이다. 현재 Production legacy 앱과 호환된다:
--   · legacy 앱의 원장 · 교사 초대는 HQ 세션의 직접 INSERT(RLS is_soyes_admin)를 쓴다.
--     이 경로는 여기서 막지 않는다 (막으면 legacy 앱의 초대가 깨진다).
--     직접 INSERT/UPDATE 회수는 G-2 cutover 에 둔다 (supabase/cutover/M3_hq_role_split_sensitive_access.sql §5).
--   · 여기서 추가하는 trigger 는 정상 운영 경로가 만들지 않는 변경만 막는다:
--       - 자기 자신의 membership 쓰기 (self-grant) — 어떤 역할이든 거부
--       - 기관의 마지막 active 원장을 없애는 변경 (역할 변경 · 비활성 · 삭제)
--       - 담당 반이 있는 교사를 원장으로 바꾸는 변경 (class_teachers 정합성)
--       - 소속 기관 · 사용자 바꿔치기
--   · 모든 membership 변경은 audit_events 에 남는다 (직접 DML 경로 포함 · via 로 구분).
--
-- 새 경로: HQ Admin 전용 audited RPC (SECURITY DEFINER · 내부에서 is_hq_admin 확인).
--   public.hq_add_organization_member      — 사유 필수
--   public.hq_change_organization_member   — 사유 필수 · 낙관적 잠금
--   HQ Sales 는 G-2 적용 여부와 무관하게 이 RPC 를 쓸 수 없다 (is_hq_admin 만).
--   DEFINER 인 이유: G-2 이후 authenticated 의 직접 INSERT/UPDATE grant 가 회수되므로
--   INVOKER RPC 는 쓸 수 없다. 권한 판정은 함수 첫 줄에서 DB 가 한다.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 쓰기 규칙 (모든 경로 · BEFORE)
-- ---------------------------------------------------------------------

create or replace function private.enforce_organization_member_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_org uuid;
  v_removes_director boolean;
begin
  -- (1) 자기 자신의 membership 은 어떤 역할로도 쓰지 않는다 (self-grant 금지).
  --     FK cascade(프로필 삭제)로 인한 삭제는 사용자의 쓰기가 아니므로 제외한다.
  if v_actor is not null then
    if tg_op in ('INSERT', 'UPDATE') and new.user_id = v_actor then
      raise exception '자기 자신의 기관 구성원 정보는 바꿀 수 없습니다.' using errcode = 'MB003';
    end if;
    if tg_op = 'DELETE' and pg_catalog.pg_trigger_depth() = 1 and old.user_id = v_actor then
      raise exception '자기 자신의 기관 구성원 정보는 바꿀 수 없습니다.' using errcode = 'MB003';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    -- (2) 소속 기관 · 사용자는 바꾸지 않는다 (역할 · 상태만 변경)
    if new.organization_id is distinct from old.organization_id
      or new.user_id is distinct from old.user_id
      or new.created_at is distinct from old.created_at
    then
      raise exception '구성원의 기관 · 사용자는 바꿀 수 없습니다.' using errcode = 'MB001';
    end if;

    -- (3) 담당 반이 있는 교사를 원장으로 바꾸지 않는다 (class_teachers 는 교사만 · 20260824)
    if old.role = 'teacher' and new.role = 'director'
      and exists (select 1 from public.class_teachers ct where ct.organization_member_id = old.id)
    then
      raise exception '담당 반 배정을 먼저 해제한 뒤 역할을 바꿔 주세요.' using errcode = 'MB007';
    end if;
  end if;

  -- (4) 마지막 active 원장 보호: 기관에 active 원장이 0명이 되는 변경 금지
  v_removes_director :=
    tg_op <> 'INSERT'
    and old.role = 'director'
    and old.status = 'active'
    and (
      (tg_op = 'DELETE' and pg_catalog.pg_trigger_depth() = 1)
      or (tg_op = 'UPDATE' and (new.role <> 'director' or new.status <> 'active'))
    );

  if v_removes_director then
    v_org := old.organization_id;
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('org-members:' || v_org::text, 0)
    );
    if not exists (
      select 1
      from public.organization_members m
      where m.organization_id = v_org
        and m.id <> old.id
        and m.role = 'director'
        and m.status = 'active'
    ) then
      raise exception '기관의 마지막 원장은 비활성화하거나 역할을 바꿀 수 없습니다. 새 원장을 먼저 등록해 주세요.'
        using errcode = 'MB006';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function private.enforce_organization_member_write() from public, anon, authenticated;

drop trigger if exists trg_organization_members_write_check on public.organization_members;
create trigger trg_organization_members_write_check
  before insert or update or delete on public.organization_members
  for each row execute function private.enforce_organization_member_write();


-- ---------------------------------------------------------------------
-- 2. audit (모든 경로 · AFTER)
-- ---------------------------------------------------------------------
-- 사유는 RPC 가 transaction-local 설정(soye.member_change_reason)으로 넘긴다.
-- PostgREST 요청은 set_config 를 호출할 수 없으므로 client 가 위조할 수 없다.
-- 직접 DML(legacy 앱 · G-2 이전)은 reason 없이 via = 'direct' 로 남는다.

create or replace function private.audit_organization_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(current_setting('soye.member_change_reason', true), '')), '');
  v_via text := case
    when current_setting('soye.member_write_via', true) = 'rpc' then 'rpc'
    else 'direct'
  end;
begin
  if tg_op = 'INSERT' then
    perform private.record_audit_event(
      new.organization_id, 'membership.added', 'organization_member', new.id, v_reason,
      jsonb_build_object('user_id', new.user_id, 'role', new.role, 'status', new.status, 'via', v_via)
    );
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      perform private.record_audit_event(
        new.organization_id, 'membership.changed', 'organization_member', new.id, v_reason,
        jsonb_build_object(
          'user_id', new.user_id,
          'role', jsonb_build_array(old.role, new.role),
          'status', jsonb_build_array(old.status, new.status),
          'via', v_via
        )
      );
    end if;
  else
    perform private.record_audit_event(
      old.organization_id, 'membership.removed', 'organization_member', old.id, v_reason,
      jsonb_build_object('user_id', old.user_id, 'role', old.role, 'status', old.status,
                         'via', case when pg_catalog.pg_trigger_depth() > 1 then 'cascade' else v_via end)
    );
  end if;
  return null;
end;
$$;

revoke execute on function private.audit_organization_member_change() from public, anon, authenticated;

drop trigger if exists trg_organization_members_audit on public.organization_members;
create trigger trg_organization_members_audit
  after insert or update or delete on public.organization_members
  for each row execute function private.audit_organization_member_change();


-- ---------------------------------------------------------------------
-- 3. HQ Admin 전용 audited RPC
-- ---------------------------------------------------------------------

create or replace function public.hq_add_organization_member(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_member public.organization_members%rowtype;
begin
  if (select auth.uid()) is null or not private.is_hq_admin() then
    raise exception '본사 운영 관리자만 기관 구성원을 등록할 수 있습니다.' using errcode = '42501';
  end if;

  if p_organization_id is null or p_user_id is null or p_role not in ('director', 'teacher') then
    raise exception '기관 · 사용자 · 역할(원장 · 교사)을 확인해 주세요.' using errcode = 'MB001';
  end if;

  if v_reason is null or char_length(v_reason) > 500 then
    raise exception '구성원 등록 사유를 500자 이내로 입력해 주세요.' using errcode = 'MB001';
  end if;

  if not exists (select 1 from public.organizations o where o.id = p_organization_id) then
    raise exception '기관을 찾을 수 없습니다.' using errcode = 'MB002';
  end if;

  if not exists (select 1 from public.profiles p where p.user_id = p_user_id) then
    raise exception '사용자를 찾을 수 없습니다.' using errcode = 'MB002';
  end if;

  if p_user_id = (select auth.uid()) then
    raise exception '자기 자신의 기관 구성원 정보는 바꿀 수 없습니다.' using errcode = 'MB003';
  end if;

  if exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = p_user_id
  ) then
    raise exception '이미 이 기관에 등록된 사용자입니다.' using errcode = 'MB004';
  end if;

  perform pg_catalog.set_config('soye.member_change_reason', v_reason, true);
  perform pg_catalog.set_config('soye.member_write_via', 'rpc', true);

  insert into public.organization_members (organization_id, user_id, role, status)
  values (p_organization_id, p_user_id, p_role, 'active')
  returning * into v_member;

  perform pg_catalog.set_config('soye.member_change_reason', '', true);
  perform pg_catalog.set_config('soye.member_write_via', '', true);

  return jsonb_build_object(
    'member_id', v_member.id,
    'organization_id', v_member.organization_id,
    'role', v_member.role,
    'status', v_member.status
  );
exception
  when unique_violation then
    raise exception '이미 이 기관에 등록된 사용자입니다.' using errcode = 'MB004';
end;
$$;

revoke execute on function public.hq_add_organization_member(uuid, uuid, text, text) from public, anon;
grant execute on function public.hq_add_organization_member(uuid, uuid, text, text) to authenticated;


create or replace function public.hq_change_organization_member(
  p_member_id uuid,
  p_organization_id uuid,
  p_role text,
  p_status text,
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
  v_member public.organization_members%rowtype;
begin
  if (select auth.uid()) is null or not private.is_hq_admin() then
    raise exception '본사 운영 관리자만 기관 구성원을 변경할 수 있습니다.' using errcode = '42501';
  end if;

  if p_member_id is null or p_organization_id is null or p_expected_updated_at is null then
    raise exception '구성원 정보가 필요합니다.' using errcode = 'MB001';
  end if;

  if (p_role is not null and p_role not in ('director', 'teacher'))
    or (p_status is not null and p_status not in ('active', 'invited', 'disabled'))
    or (p_role is null and p_status is null)
  then
    raise exception '바꿀 역할 또는 상태를 확인해 주세요.' using errcode = 'MB001';
  end if;

  if v_reason is null or char_length(v_reason) > 500 then
    raise exception '구성원 변경 사유를 500자 이내로 입력해 주세요.' using errcode = 'MB001';
  end if;

  select * into v_member
  from public.organization_members m
  where m.id = p_member_id
  for update;

  -- 기관 교차 검증: 요청한 기관의 구성원이 아니면 없는 것과 같다
  if not found or v_member.organization_id is distinct from p_organization_id then
    raise exception '구성원을 찾을 수 없습니다.' using errcode = 'MB002';
  end if;

  if v_member.user_id = (select auth.uid()) then
    raise exception '자기 자신의 기관 구성원 정보는 바꿀 수 없습니다.' using errcode = 'MB003';
  end if;

  if v_member.updated_at is distinct from p_expected_updated_at then
    raise exception '구성원 정보가 이미 변경되었습니다. 최신 내용을 다시 불러와 확인해 주세요.'
      using errcode = 'MB005';
  end if;

  perform pg_catalog.set_config('soye.member_change_reason', v_reason, true);
  perform pg_catalog.set_config('soye.member_write_via', 'rpc', true);

  update public.organization_members m
  set role = coalesce(p_role, m.role),
      status = coalesce(p_status, m.status)
  where m.id = p_member_id
  returning * into v_member;

  perform pg_catalog.set_config('soye.member_change_reason', '', true);
  perform pg_catalog.set_config('soye.member_write_via', '', true);

  return jsonb_build_object(
    'member_id', v_member.id,
    'organization_id', v_member.organization_id,
    'role', v_member.role,
    'status', v_member.status,
    'updated_at', v_member.updated_at
  );
end;
$$;

revoke execute on function public.hq_change_organization_member(uuid, uuid, text, text, text, timestamptz) from public, anon;
grant execute on function public.hq_change_organization_member(uuid, uuid, text, text, text, timestamptz) to authenticated;
