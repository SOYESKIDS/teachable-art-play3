-- =====================================================================
-- PHASE 07 · M3 — Contract write rules · Service Readiness · Activation ·
--                 Product Version publish · Capacity events
-- ---------------------------------------------------------------------
-- 근거: DEC-049 ~ DEC-054 · DEC-063 · DEC-081 · DEC-082 · DEC-095 · DEC-106
--
-- · 쓰기 주체: HQ Admin 만 (Sales 는 읽기 · 요약만 · DEC-058).
-- · 동시 effective 계약 1개 (Pilot 포함) — 기관 단위 advisory lock + 검사.
-- · 활성화 = 모든 필수 Readiness 항목 충족 (DEC-063). 결제는 조건 아님.
-- · 정책 미해결(platform_capabilities.blocked_by) 기능이 포함되면 Ready 아님.
-- · Pilot: 반 ≤ max_classes · 반당 원아 ≤ children_per_class · 교사 2~4 ·
--          override 없음 (DEC-051 · DEC-054). 원아 등록 자체는 막지 않는다.
-- · 정규 초과 인원: 저장하지 않고 계산 · 경계 변화만 audit 이벤트 (DEC-095).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Service Readiness checklist (DEC-063 · DEC-106)
-- ---------------------------------------------------------------------
-- 반환: { "ready": bool, "items": [ { "code", "ok", "reason", "detail" } ] }
-- 아동 식별 정보를 담지 않는다 (개수 · id 만).

create or replace function private.contract_readiness_internal(p_contract_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_contract record;
  v_items jsonb := '[]'::jsonb;
  v_ok boolean;
  v_count integer;
  v_detail jsonb;
  v_required text[] := private.required_lesson_sections();
  v_feature record;
begin
  select c.id, c.organization_id, c.status, c.start_date, c.end_date,
         pv.id as version_id, pv.lifecycle, pv.week_from, pv.week_to,
         pv.children_per_class, pv.max_classes, p.offer_type, o.status as org_status
  into v_contract
  from public.contracts c
  join public.product_versions pv on pv.id = c.product_version_id
  join public.products p on p.id = pv.product_id
  join public.organizations o on o.id = c.organization_id
  where c.id = p_contract_id;

  if not found then
    return jsonb_build_object('ready', false, 'items',
      jsonb_build_array(jsonb_build_object('code', 'contract', 'ok', false, 'reason', 'not_found')));
  end if;

  -- 1) 계약 · 기관
  v_ok := v_contract.status in ('draft', 'active') and v_contract.org_status = 'active';
  v_items := v_items || jsonb_build_object(
    'code', 'contract', 'ok', v_ok,
    'reason', case
      when v_contract.org_status <> 'active' then 'organization_suspended'
      when v_contract.status not in ('draft', 'active') then 'contract_' || v_contract.status
      else null end
  );

  -- 2) 상품 버전 발행
  v_ok := v_contract.lifecycle in ('published', 'retired');
  v_items := v_items || jsonb_build_object(
    'code', 'product_version', 'ok', v_ok,
    'reason', case when v_ok then null else 'version_not_published' end
  );

  -- 3) 반 범위
  select count(*) into v_count
  from public.contract_classes cc
  where cc.contract_id = v_contract.id;

  v_ok := v_count > 0
    and not exists (
      select 1 from public.contract_classes cc
      join public.classes cl on cl.id = cc.class_id
      where cc.contract_id = v_contract.id and cl.status <> 'active'
    )
    and (v_contract.max_classes is null or v_count <= v_contract.max_classes);

  v_items := v_items || jsonb_build_object(
    'code', 'class_scope', 'ok', v_ok,
    'reason', case
      when v_count = 0 then 'no_class_in_scope'
      when v_contract.max_classes is not null and v_count > v_contract.max_classes then 'too_many_classes'
      when not v_ok then 'archived_class_in_scope'
      else null end,
    'detail', jsonb_build_object('class_count', v_count, 'max_classes', v_contract.max_classes)
  );

  -- 4) 반별 프로그램 배정
  select count(*) into v_count
  from public.contract_classes cc
  where cc.contract_id = v_contract.id
    and not exists (
      select 1 from public.class_program_assignments a
      where a.class_id = cc.class_id
        and a.organization_id = cc.organization_id
        and a.status = 'active'
    );

  v_items := v_items || jsonb_build_object(
    'code', 'program_assignment', 'ok', v_count = 0,
    'reason', case when v_count = 0 then null else 'class_without_active_assignment' end,
    'detail', jsonb_build_object('classes_missing', v_count)
  );

  -- 5) 콘텐츠: 약속한 week 범위 전체에 발행된 차시 + 필수 섹션 (DEC-063 · DEC-096)
  --    반에 배정된 프로그램 기준으로 판정한다 (상품-프로그램 구조는 CO-7 OPEN).
  with scope_programs as (
    select distinct a.program_id
    from public.contract_classes cc
    join public.class_program_assignments a
      on a.class_id = cc.class_id
     and a.organization_id = cc.organization_id
     and a.status = 'active'
    where cc.contract_id = v_contract.id
  ),
  weeks as (
    select sp.program_id, w.week_no
    from scope_programs sp
    cross join generate_series(v_contract.week_from, v_contract.week_to) as w(week_no)
  ),
  week_state as (
    select
      wk.program_id,
      wk.week_no,
      exists (
        select 1
        from public.curriculum_programs cp
        join public.curriculum_lessons l on l.program_id = cp.id
        where cp.id = wk.program_id
          and cp.status = 'published'
          and l.week_no = wk.week_no
          and l.status = 'published'
          and not exists (
            select 1 from unnest(v_required) as req(code)
            where not exists (
              select 1 from public.lesson_sections ls
              where ls.lesson_id = l.id and ls.section_code = req.code
            )
          )
      ) as ready
    from weeks wk
  )
  select count(*) filter (where not ws.ready),
         jsonb_agg(jsonb_build_object('program_id', ws.program_id, 'week_no', ws.week_no)
                   order by ws.program_id, ws.week_no) filter (where not ws.ready)
  into v_count, v_detail
  from week_state ws;

  v_ok := coalesce(v_count, 0) = 0
    and exists (
      select 1 from public.contract_classes cc
      join public.class_program_assignments a
        on a.class_id = cc.class_id and a.status = 'active'
      where cc.contract_id = v_contract.id
    );

  v_items := v_items || jsonb_build_object(
    'code', 'content', 'ok', v_ok,
    'reason', case when v_ok then null else 'content_not_ready' end,
    'detail', jsonb_build_object(
      'week_from', v_contract.week_from,
      'week_to', v_contract.week_to,
      'missing_weeks', coalesce(v_detail, '[]'::jsonb)
    )
  );

  -- 6) 포함 기능 · 리포트 capability 출시 (약속한 것 전체 · 후반 기능 예외 없음)
  for v_feature in
    select f.feature_code,
           coalesce(pc.is_released, false) as is_released,
           coalesce(pc.blocked_by, '{}'::text[]) as blocked_by
    from public.product_version_features f
    left join public.platform_capabilities pc on pc.code = f.feature_code
    where f.product_version_id = v_contract.version_id
    order by f.feature_code
  loop
    v_ok := v_feature.is_released and cardinality(v_feature.blocked_by) = 0;
    v_items := v_items || jsonb_build_object(
      'code', 'feature:' || v_feature.feature_code, 'ok', v_ok,
      'reason', case
        when cardinality(v_feature.blocked_by) > 0 then 'policy_blocked'
        when not v_feature.is_released then 'not_released'
        else null end,
      'detail', jsonb_build_object('blocked_by', to_jsonb(v_feature.blocked_by))
    );
  end loop;

  -- 7) Pilot 조건 (override 없음)
  if v_contract.offer_type = 'pilot' then
    select count(*) into v_count
    from (
      select cc.class_id
      from public.contract_classes cc
      join public.children ch
        on ch.class_id = cc.class_id
       and ch.organization_id = cc.organization_id
       and ch.status = 'active'
      where cc.contract_id = v_contract.id
      group by cc.class_id
      having count(*) > v_contract.children_per_class
    ) over_cap;

    v_items := v_items || jsonb_build_object(
      'code', 'pilot_capacity', 'ok', v_count = 0,
      'reason', case when v_count = 0 then null else 'pilot_capacity_exceeded' end,
      'detail', jsonb_build_object('classes_over_capacity', v_count,
                                   'children_per_class', v_contract.children_per_class)
    );

    select count(distinct ct.organization_member_id) into v_count
    from public.contract_classes cc
    join public.class_teachers ct on ct.class_id = cc.class_id
    join public.organization_members m
      on m.id = ct.organization_member_id and m.status = 'active' and m.role = 'teacher'
    where cc.contract_id = v_contract.id;

    v_items := v_items || jsonb_build_object(
      'code', 'pilot_teachers', 'ok', v_count between 2 and 4,
      'reason', case when v_count between 2 and 4 then null else 'pilot_teacher_count' end,
      'detail', jsonb_build_object('teacher_count', v_count)
    );
  end if;

  return jsonb_build_object(
    'ready', not exists (
      select 1 from jsonb_array_elements(v_items) e
      where (e ->> 'ok')::boolean is not true
    ),
    'items', v_items
  );
end;
$$;

revoke execute on function private.contract_readiness_internal(uuid) from public, anon, authenticated;


create or replace function public.contract_readiness(p_contract_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not (private.is_hq_admin() or private.is_hq_sales()) then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;
  return private.contract_readiness_internal(p_contract_id);
end;
$$;

revoke execute on function public.contract_readiness(uuid) from public, anon;
grant execute on function public.contract_readiness(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 2. contracts write rules
-- ---------------------------------------------------------------------

create or replace function private.enforce_contract_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lifecycle text;
  v_readiness jsonb;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception '계약은 초안으로만 만들 수 있습니다.' using errcode = 'CT001';
    end if;
    new.created_by := (select auth.uid());
    new.activated_at := null;
    new.activated_by := null;
  else
    if new.organization_id is distinct from old.organization_id
      or new.created_at is distinct from old.created_at
      or new.created_by is distinct from old.created_by
    then
      raise exception '계약의 기관은 바꿀 수 없습니다.' using errcode = 'CT001';
    end if;

    if old.status = 'ended' then
      raise exception '종료된 계약은 바꿀 수 없습니다.' using errcode = 'CT002';
    end if;

    if new.product_version_id is distinct from old.product_version_id
      and old.status <> 'draft'
    then
      raise exception '활성화된 계약의 상품 버전은 바꿀 수 없습니다. 후속 계약을 만들어 주세요.'
        using errcode = 'CT001';
    end if;

    if new.status is distinct from old.status then
      if not (
        (old.status = 'draft' and new.status in ('active', 'ended'))
        or (old.status = 'active' and new.status in ('suspended', 'ended'))
        or (old.status = 'suspended' and new.status in ('active', 'ended'))
      ) then
        raise exception '허용되지 않는 계약 상태 변경입니다. (% -> %)', old.status, new.status
          using errcode = 'CT002';
      end if;

      if not (old.status = 'draft' and new.status = 'active')
        and nullif(btrim(coalesce(new.status_reason, '')), '') is null
      then
        raise exception '계약 정지 · 재개 · 종료에는 사유가 필요합니다.' using errcode = 'CT004';
      end if;
    end if;

    if (new.start_date is distinct from old.start_date or new.end_date is distinct from old.end_date)
      and old.status <> 'draft'
      and nullif(btrim(coalesce(new.status_reason, '')), '') is null
    then
      raise exception '활성화된 계약의 기간 변경에는 사유가 필요합니다.' using errcode = 'CT004';
    end if;

    new.activated_at := old.activated_at;
    new.activated_by := old.activated_by;
  end if;

  -- 계약은 published 버전만 참조 (retired 는 기존 계약 유지용)
  if tg_op = 'INSERT' or new.product_version_id is distinct from old.product_version_id then
    select pv.lifecycle into v_lifecycle
    from public.product_versions pv
    where pv.id = new.product_version_id;

    if v_lifecycle is distinct from 'published' then
      raise exception '발행된 상품 버전만 계약에 사용할 수 있습니다.' using errcode = 'CT001';
    end if;
  end if;

  -- 동시 effective 계약 1개 (Pilot 포함 · DEC-082)
  if new.status in ('active', 'suspended') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('contract-effective:' || new.organization_id::text, 0)
    );

    if exists (
      select 1 from public.contracts c
      where c.organization_id = new.organization_id
        and c.id <> new.id
        and c.status in ('active', 'suspended')
        and daterange(c.start_date, c.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
    ) then
      raise exception '같은 기관에 기간이 겹치는 유효 계약이 있습니다.' using errcode = 'CT003';
    end if;
  end if;

  -- 활성화: 모든 필수 Readiness 충족 (DEC-063 · 결제 무관)
  if tg_op = 'UPDATE' and old.status = 'draft' and new.status = 'active' then
    if not private.is_hq_admin() then
      raise exception '계약 활성화는 본사 운영 관리자만 할 수 있습니다.' using errcode = '42501';
    end if;

    v_readiness := private.contract_readiness_internal(new.id);
    if (v_readiness ->> 'ready')::boolean is not true then
      raise exception '서비스 준비가 끝나지 않아 활성화할 수 없습니다.'
        using errcode = 'CT005',
              detail = v_readiness::text;
    end if;

    new.activated_at := pg_catalog.clock_timestamp();
    new.activated_by := (select auth.uid());
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_contract_write() from public;

drop trigger if exists trg_contracts_write_check on public.contracts;
create trigger trg_contracts_write_check
  before insert or update on public.contracts
  for each row execute function private.enforce_contract_write();


create or replace function private.audit_contract_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.record_audit_event(
      new.organization_id, 'contract.created', 'contract', new.id, null,
      jsonb_build_object('product_version_id', new.product_version_id,
                         'start_date', new.start_date, 'end_date', new.end_date)
    );
  else
    if new.status is distinct from old.status then
      perform private.record_audit_event(
        new.organization_id, 'contract.status_changed', 'contract', new.id, new.status_reason,
        jsonb_build_object('from', old.status, 'to', new.status)
      );
    end if;
    if new.start_date is distinct from old.start_date
      or new.end_date is distinct from old.end_date
      or new.product_version_id is distinct from old.product_version_id
    then
      perform private.record_audit_event(
        new.organization_id, 'contract.terms_changed', 'contract', new.id, new.status_reason,
        jsonb_build_object(
          'start_date', jsonb_build_array(old.start_date, new.start_date),
          'end_date', jsonb_build_array(old.end_date, new.end_date),
          'product_version_id', jsonb_build_array(old.product_version_id, new.product_version_id)
        )
      );
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function private.audit_contract_change() from public;

drop trigger if exists trg_contracts_audit on public.contracts;
create trigger trg_contracts_audit
  after insert or update on public.contracts
  for each row execute function private.audit_contract_change();


grant insert (organization_id, product_version_id, start_date, end_date, status_reason)
  on public.contracts to authenticated;
grant update (product_version_id, start_date, end_date, status, status_reason)
  on public.contracts to authenticated;

drop policy if exists "contracts insert by hq admin" on public.contracts;
create policy "contracts insert by hq admin"
  on public.contracts
  for insert
  to authenticated
  with check ((select private.is_hq_admin()));

drop policy if exists "contracts update by hq admin" on public.contracts;
create policy "contracts update by hq admin"
  on public.contracts
  for update
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));


-- ---------------------------------------------------------------------
-- 3. contract_classes write rules · audit
-- ---------------------------------------------------------------------

create or replace function private.enforce_contract_class_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract_id uuid := case when tg_op = 'DELETE' then old.contract_id else new.contract_id end;
  v_status text;
  v_org uuid;
begin
  select c.status, c.organization_id into v_status, v_org
  from public.contracts c where c.id = v_contract_id;

  if v_status = 'ended' then
    raise exception '종료된 계약의 반 범위는 바꿀 수 없습니다.' using errcode = 'CT002';
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.classes cl
      where cl.id = new.class_id and cl.status = 'active'
    ) then
      raise exception '운영 중인 반만 계약 범위에 넣을 수 있습니다.' using errcode = 'CT006';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    raise exception '계약 반 범위는 수정하지 않고 추가 · 삭제로 바꿉니다.' using errcode = 'CT006';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function private.enforce_contract_class_write() from public;

drop trigger if exists trg_contract_classes_write_check on public.contract_classes;
create trigger trg_contract_classes_write_check
  before insert or update or delete on public.contract_classes
  for each row execute function private.enforce_contract_class_write();


create or replace function private.audit_contract_class_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
begin
  if tg_op = 'DELETE' then v_row := old; else v_row := new; end if;
  perform private.record_audit_event(
    v_row.organization_id, 'contract.class_scope_changed', 'contract', v_row.contract_id, null,
    jsonb_build_object('op', lower(tg_op), 'class_id', v_row.class_id)
  );
  return null;
end;
$$;

revoke execute on function private.audit_contract_class_change() from public;

drop trigger if exists trg_contract_classes_audit on public.contract_classes;
create trigger trg_contract_classes_audit
  after insert or delete on public.contract_classes
  for each row execute function private.audit_contract_class_change();


grant insert (organization_id, contract_id, class_id) on public.contract_classes to authenticated;
grant delete on public.contract_classes to authenticated;

drop policy if exists "contract classes insert by hq admin" on public.contract_classes;
create policy "contract classes insert by hq admin"
  on public.contract_classes
  for insert
  to authenticated
  with check ((select private.is_hq_admin()));

drop policy if exists "contract classes delete by hq admin" on public.contract_classes;
create policy "contract classes delete by hq admin"
  on public.contract_classes
  for delete
  to authenticated
  using ((select private.is_hq_admin()));


-- ---------------------------------------------------------------------
-- 4. RPCs (SECURITY INVOKER · Invariant AI-1)
-- ---------------------------------------------------------------------

create or replace function public.activate_contract(
  p_contract_id uuid,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated_at timestamptz;
  v_status text;
begin
  if p_contract_id is null or p_expected_updated_at is null then
    raise exception '계약 정보가 필요합니다.' using errcode = 'CT001';
  end if;

  update public.contracts c
  set status = 'active'
  where c.id = p_contract_id
    and c.status = 'draft'
    and c.updated_at = p_expected_updated_at
  returning c.updated_at, c.status into v_updated_at, v_status;

  if not found then
    if not exists (select 1 from public.contracts c where c.id = p_contract_id) then
      raise exception '계약을 찾을 수 없거나 권한이 없습니다.' using errcode = 'CT007';
    end if;
    raise exception '계약이 이미 변경되었습니다. 최신 내용을 다시 불러와 확인해 주세요.'
      using errcode = 'CT008';
  end if;

  return jsonb_build_object('contract_id', p_contract_id, 'status', v_status, 'updated_at', v_updated_at);
end;
$$;

revoke execute on function public.activate_contract(uuid, timestamptz) from public, anon;
grant execute on function public.activate_contract(uuid, timestamptz) to authenticated;


create or replace function public.change_contract_status(
  p_contract_id uuid,
  p_status text,
  p_reason text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated_at timestamptz;
begin
  if p_status not in ('suspended', 'active', 'ended') then
    raise exception '변경할 상태가 올바르지 않습니다.' using errcode = 'CT002';
  end if;

  update public.contracts c
  set status = p_status,
      status_reason = nullif(btrim(coalesce(p_reason, '')), '')
  where c.id = p_contract_id
    and c.status <> 'draft'
    and c.updated_at = p_expected_updated_at
  returning c.updated_at into v_updated_at;

  if not found then
    if not exists (select 1 from public.contracts c where c.id = p_contract_id) then
      raise exception '계약을 찾을 수 없거나 권한이 없습니다.' using errcode = 'CT007';
    end if;
    raise exception '계약이 이미 변경되었거나 이 상태에서는 바꿀 수 없습니다.' using errcode = 'CT008';
  end if;

  return jsonb_build_object('contract_id', p_contract_id, 'status', p_status, 'updated_at', v_updated_at);
end;
$$;

revoke execute on function public.change_contract_status(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.change_contract_status(uuid, text, text, timestamptz) to authenticated;


create or replace function public.publish_product_version(
  p_product_version_id uuid,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated_at timestamptz;
begin
  update public.product_versions pv
  set lifecycle = 'published'
  where pv.id = p_product_version_id
    and pv.lifecycle = 'draft'
    and pv.updated_at = p_expected_updated_at
  returning pv.updated_at into v_updated_at;

  if not found then
    raise exception '상품 버전이 이미 변경되었거나 발행할 수 없는 상태입니다.' using errcode = 'CT008';
  end if;

  return jsonb_build_object('product_version_id', p_product_version_id,
                            'lifecycle', 'published', 'updated_at', v_updated_at);
end;
$$;

revoke execute on function public.publish_product_version(uuid, timestamptz) from public, anon;
grant execute on function public.publish_product_version(uuid, timestamptz) to authenticated;


create or replace function private.audit_product_version_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.record_audit_event(
    null, 'product_version.' || new.lifecycle, 'product_version', new.id, null,
    jsonb_build_object('from', old.lifecycle, 'to', new.lifecycle)
  );
  return null;
end;
$$;

revoke execute on function private.audit_product_version_publish() from public;

drop trigger if exists trg_product_versions_audit on public.product_versions;
create trigger trg_product_versions_audit
  after update on public.product_versions
  for each row
  when (old.lifecycle is distinct from new.lifecycle)
  execute function private.audit_product_version_publish();


-- ---------------------------------------------------------------------
-- 5. 정규 초과 인원 경계 이벤트 (DEC-095 · 계산값 · 청구 없음)
-- ---------------------------------------------------------------------

create or replace function private.class_capacity_threshold(p_class_id uuid)
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select pv.children_per_class
  from public.classes cl
  join public.contract_classes cc on cc.class_id = cl.id and cc.organization_id = cl.organization_id
  join public.contracts c on c.id = cc.contract_id
  join public.product_versions pv on pv.id = c.product_version_id
  join public.products p on p.id = pv.product_id
  where cl.id = p_class_id
    and c.id = private.effective_contract_id(cl.organization_id)
    and p.offer_type = 'regular';
$$;

revoke execute on function private.class_capacity_threshold(uuid) from public;


create or replace function private.record_class_capacity_crossing(
  p_organization_id uuid,
  p_class_id uuid,
  p_delta integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_threshold integer;
  v_after integer;
  v_before integer;
begin
  if p_class_id is null then
    return;
  end if;

  v_threshold := private.class_capacity_threshold(p_class_id);
  if v_threshold is null then
    return;
  end if;

  select count(*) into v_after
  from public.children ch
  where ch.class_id = p_class_id and ch.status = 'active';

  v_before := v_after - p_delta;

  if v_before <= v_threshold and v_after > v_threshold then
    perform private.record_audit_event(
      p_organization_id, 'capacity.overage_started', 'class', p_class_id, null,
      jsonb_build_object('active_children', v_after, 'included', v_threshold)
    );
  elsif v_before > v_threshold and v_after <= v_threshold then
    perform private.record_audit_event(
      p_organization_id, 'capacity.overage_cleared', 'class', p_class_id, null,
      jsonb_build_object('active_children', v_after, 'included', v_threshold)
    );
  end if;
end;
$$;

revoke execute on function private.record_class_capacity_crossing(uuid, uuid, integer) from public;


-- 반별 활성 원아 수가 기준 인원을 넘거나 내려올 때 한 번만 기록한다 (DEC-095 · 청구 아님).
-- statement 단위로 반별 순증감(net delta)을 모아 계산한다. row 단위 AFTER trigger 는 statement
-- 끝에 한꺼번에 실행되어 모든 행이 최종 인원을 보므로, 여러 명을 한 번에 등록 · 이동하면
-- 같은 넘어섬이 행 수만큼 중복 기록된다 (PHASE 07 production-shaped 검증에서 발견).
create or replace function private.track_child_capacity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
begin
  if tg_op = 'INSERT' then
    for v_row in
      select n.organization_id, n.class_id, count(*)::integer as delta
      from new_rows n
      where n.status = 'active' and n.class_id is not null
      group by n.organization_id, n.class_id
    loop
      perform private.record_class_capacity_crossing(v_row.organization_id, v_row.class_id, v_row.delta);
    end loop;
  else
    for v_row in
      select m.organization_id, m.class_id, sum(m.delta)::integer as delta
      from (
        select n.organization_id, n.class_id, 1 as delta
        from new_rows n where n.status = 'active' and n.class_id is not null
        union all
        select o.organization_id, o.class_id, -1 as delta
        from old_rows o where o.status = 'active' and o.class_id is not null
      ) m
      group by m.organization_id, m.class_id
      having sum(m.delta) <> 0
    loop
      perform private.record_class_capacity_crossing(v_row.organization_id, v_row.class_id, v_row.delta);
    end loop;
  end if;

  return null;
end;
$$;

revoke execute on function private.track_child_capacity_change() from public;

-- transition table 은 이벤트 · 컬럼 목록을 함께 쓸 수 없어 INSERT · UPDATE 를 나눈다.
drop trigger if exists trg_children_capacity_events on public.children;
drop trigger if exists trg_children_capacity_events_insert on public.children;
create trigger trg_children_capacity_events_insert
  after insert on public.children
  referencing new table as new_rows
  for each statement execute function private.track_child_capacity_change();

drop trigger if exists trg_children_capacity_events_update on public.children;
create trigger trg_children_capacity_events_update
  after update on public.children
  referencing old table as old_rows new table as new_rows
  for each statement execute function private.track_child_capacity_change();
