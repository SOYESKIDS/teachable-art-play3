-- =====================================================================
-- PHASE 07 · M3 — HQ 역할 기반 (additive · 현재 앱과 호환)
-- ---------------------------------------------------------------------
-- 근거: DEC-058 · DEC-079 · DEC-093 · DEC-108
--
-- 이 migration 은 기존 권한을 줄이지 않는다 (G-2 · PHASE 07 세션 7 분리).
--   · HQ Admin 운영 메타데이터 RPC (본문 없음) · HQ Sales 요약 RPC · HQ 지원 열람 RPC(사유 + audit)
--   · 사진 서명 helper: 기존 역할 판정 그대로 + 숨김(hidden) 사진 제외 (DEC-088 · 숨김은 새 hide RPC 로만 생김)
--
-- 제한 변경(legacy is_soyes_admin 의미 축소 · HQ 민감 blanket SELECT 제거 · 원장 AI 초안 접근 제거 ·
-- HQ 제외 helper)은 supabase/cutover/M3_hq_role_split_sensitive_access.sql 로 옮겼다.
-- 그 cutover 는 G-2 application preflight 통과 후에만 적용한다 (cutover-runbook.md).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 사진 객체 서명 helper — 기존 역할 판정 유지 · 숨김 사진 제외
-- ---------------------------------------------------------------------
-- 역할 분기(is_soyes_admin · 원장 · 담당 교사)는 20260831110000 과 같다.
-- HQ 제외는 G-2 cutover 가 이 함수를 다시 정의할 때 적용된다.

create or replace function private.can_read_observation_media_object(p_name text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_session_observation_media m
    where m.storage_path = p_name
      and m.hidden_at is null
      and (
        (select private.is_soyes_admin())
        or private.has_org_role(m.organization_id, array['director'])
        or private.is_assigned_class_teacher(m.class_id)
      )
  );
$$;


-- ---------------------------------------------------------------------
-- 4. HQ Admin 운영 메타데이터 RPC (본문 없음)
-- ---------------------------------------------------------------------
-- 운영 현황 · 서비스 준비 화면이 쓰던 "완료 리포트 수 · 최근 완료 리포트 ·
-- 관찰이 있는 수업" 을 본문 없이 제공한다.

create or replace function public.hq_completed_legacy_report_meta(
  p_organization_ids uuid[],
  p_limit integer default 20
)
returns table (
  report_id uuid,
  organization_id uuid,
  period_start date,
  period_end date,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_hq_admin() then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  return query
  select r.id, r.organization_id, r.period_start, r.period_end, r.completed_at
  from public.child_growth_reports r
  where r.organization_id = any (coalesce(p_organization_ids, '{}'::uuid[]))
    and r.status = 'complete'
  order by r.completed_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 20), 200));
end;
$$;

revoke execute on function public.hq_completed_legacy_report_meta(uuid[], integer) from public, anon;
grant execute on function public.hq_completed_legacy_report_meta(uuid[], integer) to authenticated;


create or replace function public.hq_completed_legacy_report_counts(
  p_organization_ids uuid[]
)
returns table (
  organization_id uuid,
  completed_count bigint
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_hq_admin() then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  -- p_organization_ids 가 null 이면 전체 기관
  return query
  select r.organization_id, count(*)::bigint
  from public.child_growth_reports r
  where (p_organization_ids is null or r.organization_id = any (p_organization_ids))
    and r.status = 'complete'
  group by r.organization_id;
end;
$$;

revoke execute on function public.hq_completed_legacy_report_counts(uuid[]) from public, anon;
grant execute on function public.hq_completed_legacy_report_counts(uuid[]) to authenticated;


create or replace function public.hq_observed_session_ids(
  p_session_ids uuid[]
)
returns table (class_session_id uuid)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_hq_admin() then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  if cardinality(coalesce(p_session_ids, '{}'::uuid[])) > 2000 then
    raise exception '한 번에 조회할 수 있는 수업 수를 넘었습니다.' using errcode = '22023';
  end if;

  return query
  select distinct o.class_session_id
  from public.class_session_observations o
  where o.class_session_id = any (coalesce(p_session_ids, '{}'::uuid[]));
end;
$$;

revoke execute on function public.hq_observed_session_ids(uuid[]) from public, anon;
grant execute on function public.hq_observed_session_ids(uuid[]) to authenticated;


-- ---------------------------------------------------------------------
-- 5. HQ Sales 영업 요약 RPC (DEC-058 · 아동 식별 정보 없음)
-- ---------------------------------------------------------------------

create or replace function public.hq_sales_organization_summary()
returns table (
  organization_id uuid,
  organization_name text,
  institution_type text,
  organization_status text,
  service_mode text,
  contract_id uuid,
  contract_status text,
  contract_start_date date,
  contract_end_date date,
  product_code text,
  product_name text,
  version_label text,
  scoped_class_count bigint,
  active_class_count bigint,
  active_child_count bigint,
  teacher_count bigint,
  overage_child_count bigint
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not (private.is_hq_sales() or private.is_hq_admin()) then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  return query
  with eff as (
    select o.id as org_id, private.effective_contract_id(o.id) as contract_id
    from public.organizations o
  ),
  latest as (
    -- effective 계약이 없으면 가장 최근 계약 메타를 보여준다
    select distinct on (c.organization_id)
      c.organization_id, c.id
    from public.contracts c
    order by c.organization_id, c.start_date desc, c.created_at desc
  )
  select
    o.id,
    o.name,
    o.institution_type,
    o.status,
    private.org_service_mode(o.id),
    c.id,
    c.status,
    c.start_date,
    c.end_date,
    p.code,
    p.display_name,
    pv.version_label,
    (select count(*) from public.contract_classes cc where cc.contract_id = c.id)::bigint,
    (select count(*) from public.classes cl
      where cl.organization_id = o.id and cl.status = 'active')::bigint,
    (select count(*) from public.children ch
      where ch.organization_id = o.id and ch.status = 'active')::bigint,
    (select count(*) from public.organization_members m
      where m.organization_id = o.id and m.role = 'teacher' and m.status = 'active')::bigint,
    coalesce((
      select sum(greatest(x.cnt - pv.children_per_class, 0))
      from (
        select cc.class_id, count(ch.id) as cnt
        from public.contract_classes cc
        left join public.children ch
          on ch.class_id = cc.class_id
         and ch.organization_id = cc.organization_id
         and ch.status = 'active'
        where cc.contract_id = c.id
        group by cc.class_id
      ) x
    ), 0)::bigint
  from public.organizations o
  left join eff on eff.org_id = o.id
  left join latest on latest.organization_id = o.id
  left join public.contracts c on c.id = coalesce(eff.contract_id, latest.id)
  left join public.product_versions pv on pv.id = c.product_version_id
  left join public.products p on p.id = pv.product_id
  order by o.name;
end;
$$;

revoke execute on function public.hq_sales_organization_summary() from public, anon;
grant execute on function public.hq_sales_organization_summary() to authenticated;


-- ---------------------------------------------------------------------
-- 6. HQ Admin 지원 목적 열람 (DEC-093 · DEC-108)
-- ---------------------------------------------------------------------
-- 일반 browsing 이 아니다. 사유 필수 · audit 기록 · 최소 반환.
-- audit 에는 사유와 대상 id 만 남긴다 (본문 · 인용 저장 금지).

create or replace function public.hq_support_open_observation(
  p_observation_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_row record;
begin
  if not private.is_hq_admin() then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  if v_reason is null or char_length(v_reason) > 500 then
    raise exception '지원 열람 사유를 500자 이내로 입력해 주세요.' using errcode = 'HS001';
  end if;

  select o.id, o.organization_id, o.class_session_id, o.record_status, o.taxonomy,
         o.teacher_note, o.child_voice, o.updated_at
  into v_row
  from public.class_session_observations o
  where o.id = p_observation_id;

  if not found then
    raise exception '대상을 찾을 수 없습니다.' using errcode = 'HS002';
  end if;

  perform private.record_audit_event(
    v_row.organization_id,
    'support.observation_opened',
    'observation',
    v_row.id,
    v_reason,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'observation_id', v_row.id,
    'class_session_id', v_row.class_session_id,
    'record_status', v_row.record_status,
    'taxonomy', v_row.taxonomy,
    'teacher_note', v_row.teacher_note,
    'child_voice', v_row.child_voice,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke execute on function public.hq_support_open_observation(uuid, text) from public, anon;
grant execute on function public.hq_support_open_observation(uuid, text) to authenticated;
