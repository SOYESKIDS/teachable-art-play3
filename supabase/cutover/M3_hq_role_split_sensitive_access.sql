-- =====================================================================
-- ███  DO NOT APPLY UNTIL G-2 APPLICATION PREFLIGHT PASSES  ███
-- =====================================================================
-- PHASE 07 · M3 CUTOVER (G-2) — HQ Admin / Sales 분리 · HQ 민감 blanket SELECT 제거 ·
--                              원장 AI 초안 접근 제거
--
-- 이 파일은 migration 이 아니다. `supabase db reset` · `db push` 는 적용하지 않는다.
-- 원래 위치: supabase/migrations/20261001110000_m3_hq_role_split_sensitive_access.sql §1~§3
-- (PHASE 07 세션 7 에서 분리 · 본문 변경 없음)
-- 근거: DEC-058 · DEC-079 · DEC-093 · DEC-108 · RLS 우선순위 1 · 2 · 5
--
-- ★ 왜 cutover 인가
--   이 변경이 적용되면 HQ Sales 는 is_soyes_admin() 을 통과하지 못해 현재 앱의 /admin 을 쓸 수 없고,
--   HQ Admin 은 관찰 · 사진 · AI 초안 · 리포트 본문을 직접 읽지 못한다. PHASE 07 앱(/sales Shell ·
--   HQ 메타데이터 RPC · 지원 열람)이 먼저 배포되어 있어야 한다.
--
-- ★ 적용 조건 (G-2 application preflight · cutover-runbook.md)
--   1. PHASE 07 앱 배포 확인 (/sales · Sales 로그인 분기 · HQ 메타데이터 RPC 사용)
--   2. node supabase/cutover/G2_app_preflight.mjs  → PASS
--   3. 실행 시 운영자가 확인 변수를 명시한다:
--        psql --single-transaction -v ON_ERROR_STOP=1 -v g2_app_preflight=passed -f <this file>
--      변수가 없으면 G2001 로 중단한다 (실수 적용 방지 · 데이터 변경 없음).
--
-- ★ 되돌리기: supabase/cutover/M3_hq_role_split_rollback.sql (적용 전 정의로 복원 · 데이터 변경 없음)
-- ★ G-1 (M3_entitlement_write_gates.sql) · M5 와 별개다. 이 파일은 G-1 을 적용하지 않는다.
-- =====================================================================

\if :{?g2_app_preflight}
\else
  \set g2_app_preflight missing
\endif

select set_config('g2.app_preflight', :'g2_app_preflight', false) as g2_app_preflight;

do $$
begin
  if current_setting('g2.app_preflight', true) is distinct from 'passed' then
    raise exception 'G-2 application preflight 확인 변수가 없습니다. HQ 역할 cutover 를 적용하지 않습니다.'
      using errcode = 'G2001',
            hint = 'node supabase/cutover/G2_app_preflight.mjs 통과 후 -v g2_app_preflight=passed 로 실행하세요.';
  end if;

  -- 이 cutover 가 기대하는 additive 기반(일반 migration)이 있는지 확인
  if to_regprocedure('public.current_hq_role()') is null
    or to_regprocedure('public.hq_sales_organization_summary()') is null
    or to_regprocedure('public.hq_support_open_observation(uuid, text)') is null
    or to_regprocedure('public.hq_completed_legacy_report_meta(uuid[], integer)') is null
  then
    raise exception 'G-2 선행 migration(HQ 역할 기반)이 적용되지 않았습니다.' using errcode = 'G2002';
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 1. legacy helper 의미 축소: Sales ≠ Admin (DEC-079)
-- ---------------------------------------------------------------------

create or replace function private.is_soyes_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  -- legacy 호환 이름. 의미 = HQ Admin 만 (Sales 제외).
  select private.is_hq_admin();
$$;

revoke execute on function private.is_soyes_admin() from public;
grant execute on function private.is_soyes_admin() to authenticated;


-- ---------------------------------------------------------------------
-- 2. Lead: Sales 업무 유지 (Admin + Sales)
-- ---------------------------------------------------------------------

drop policy if exists "admin can select lead submissions" on public.lead_submissions;
create policy "admin can select lead submissions"
  on public.lead_submissions
  for select
  to authenticated
  using ((select private.is_hq_admin()) or (select private.is_hq_sales()));

drop policy if exists "admin can update lead submissions" on public.lead_submissions;
create policy "admin can update lead submissions"
  on public.lead_submissions
  for update
  to authenticated
  using ((select private.is_hq_admin()) or (select private.is_hq_sales()))
  with check ((select private.is_hq_admin()) or (select private.is_hq_sales()));


-- ---------------------------------------------------------------------
-- 3. HQ Admin 민감 교육 콘텐츠 blanket SELECT 제거 (DEC-093)
-- ---------------------------------------------------------------------
-- 운영 메타(기관 · 반 · 원아 운영 메타 · 계약 · 세션 · 출결)는 유지한다.
-- 관찰 본문 · 인용 · 사진 · AI 초안 · 리포트 본문은 지원 RPC 로만 (§6).

drop policy if exists "observations readable by org staff and soyes admin"
  on public.class_session_observations;
create policy "observations readable by org staff and soyes admin"
  on public.class_session_observations
  for select
  to authenticated
  using (
    private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );

drop policy if exists "observation domains link readable by org staff and soyes admin"
  on public.class_session_observation_domains;
create policy "observation domains link readable by org staff and soyes admin"
  on public.class_session_observation_domains
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_session_observations o
      where o.id = class_session_observation_domains.observation_id
        and (
          private.has_org_role(o.organization_id, array['director'])
          or private.is_assigned_class_teacher(o.class_id)
        )
    )
  );

drop policy if exists "observation media readable by org staff and soyes admin"
  on public.class_session_observation_media;
create policy "observation media readable by org staff and soyes admin"
  on public.class_session_observation_media
  for select
  to authenticated
  using (
    private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );

-- Director AI 초안 접근 제거 (RLS 우선순위 5 · DEC-093). 담당 교사만.
drop policy if exists "observation ai drafts readable by org staff and soyes admin"
  on public.class_session_observation_ai_drafts;
create policy "observation ai drafts readable by org staff and soyes admin"
  on public.class_session_observation_ai_drafts
  for select
  to authenticated
  using (private.is_assigned_class_teacher(class_id));

drop policy if exists "growth reports readable by org staff and soyes admin"
  on public.child_growth_reports;
create policy "growth reports readable by org staff and soyes admin"
  on public.child_growth_reports
  for select
  to authenticated
  using (
    (
      private.has_org_role(organization_id, array['director'])
      and status = 'complete'
    )
    or private.is_assigned_class_teacher(class_id)
  );

drop policy if exists "growth report sources readable by org staff and soyes admin"
  on public.child_growth_report_sources;
create policy "growth report sources readable by org staff and soyes admin"
  on public.child_growth_report_sources
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.child_growth_reports r
      where r.id = child_growth_report_sources.report_id
        and (
          (
            private.has_org_role(r.organization_id, array['director'])
            and r.status = 'complete'
          )
          or private.is_assigned_class_teacher(r.class_id)
        )
    )
  );


-- 사진 객체: HQ 제외 · 숨김(hidden) 사진은 서명 대상 아님 (DEC-088)
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
        private.has_org_role(m.organization_id, array['director'])
        or private.is_assigned_class_teacher(m.class_id)
      )
  );
$$;


create or replace function private.can_read_child_observation_history(
  p_child_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_session_observations o
    where o.child_id = p_child_id
      and (
        private.has_org_role(o.organization_id, array['director'])
        or private.is_assigned_class_teacher(o.class_id)
      )
  );
$$;


-- ---------------------------------------------------------------------
-- 적용 기록 (audit · 운영 절차 추적)
-- ---------------------------------------------------------------------
select private.record_audit_event(
  null, 'cutover.g2_hq_role_split_applied', 'cutover', null,
  'G-2 application preflight passed',
  jsonb_build_object('file', 'supabase/cutover/M3_hq_role_split_sensitive_access.sql')
);
