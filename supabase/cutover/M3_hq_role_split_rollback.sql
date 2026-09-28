-- =====================================================================
-- ROLLBACK — G-2 HQ role / sensitive access cutover (M3_hq_role_split_sensitive_access.sql)
-- ---------------------------------------------------------------------
-- G-2 cutover 적용 전 정의로 되돌린다. 데이터 변경 없음 (함수 · 정책 정의만).
--   · private.is_soyes_admin()                      ← 20260813 (admin + sales)
--   · lead · 관찰 · 사진 · AI 초안 · 성장 리포트 정책    ← 각 원본 migration (아래 주석)
--   · private.can_read_observation_media_object()   ← 일반 migration 20261001110000 (기존 역할 + 숨김 제외)
--   · private.can_read_child_observation_history()  ← 20260831095000
-- 되돌리면 현재(legacy) 앱의 Sales-via-admin 동작과 HQ blanket 조회가 다시 열린다 — 장애 대응용.
-- 실행: psql --single-transaction -v ON_ERROR_STOP=1 -f supabase/cutover/M3_hq_role_split_rollback.sql
-- =====================================================================

create or replace function private.is_soyes_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from private.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
      and au.role in ('admin', 'sales')
  );
$$;

revoke execute on function private.is_soyes_admin() from public;
grant execute on function private.is_soyes_admin() to authenticated;


-- 원본: 20260813_create_admin_access.sql
drop policy if exists "admin can select lead submissions" on public.lead_submissions;
create policy "admin can select lead submissions"
  on public.lead_submissions
  for select
  to authenticated
  using ((select private.is_soyes_admin()));

-- 원본: 20260813_create_admin_access.sql
drop policy if exists "admin can update lead submissions" on public.lead_submissions;
create policy "admin can update lead submissions"
  on public.lead_submissions
  for update
  to authenticated
  using ((select private.is_soyes_admin()))
  with check ((select private.is_soyes_admin()));

-- 원본: 20260831094000_create_class_session_observations.sql
drop policy if exists "observations readable by org staff and soyes admin" on public.class_session_observations;
create policy "observations readable by org staff and soyes admin"
  on public.class_session_observations
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );

-- 원본: 20260831094000_create_class_session_observations.sql
drop policy if exists "observation domains link readable by org staff and soyes admin" on public.class_session_observation_domains;
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
          (select private.is_soyes_admin())
          or private.has_org_role(o.organization_id, array['director'])
          or private.is_assigned_class_teacher(o.class_id)
        )
    )
  );

-- 원본: 20260831110000_create_observation_media.sql
drop policy if exists "observation media readable by org staff and soyes admin" on public.class_session_observation_media;
create policy "observation media readable by org staff and soyes admin"
  on public.class_session_observation_media
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );

-- 원본: 20260901090000_create_observation_ai_drafts.sql
drop policy if exists "observation ai drafts readable by org staff and soyes admin" on public.class_session_observation_ai_drafts;
create policy "observation ai drafts readable by org staff and soyes admin"
  on public.class_session_observation_ai_drafts
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );

-- 원본: 20260901160000_create_child_growth_reports.sql
drop policy if exists "growth reports readable by org staff and soyes admin" on public.child_growth_reports;
create policy "growth reports readable by org staff and soyes admin"
  on public.child_growth_reports
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or (
      private.has_org_role(organization_id, array['director'])
      and status = 'complete'
    )
    or private.is_assigned_class_teacher(class_id)
  );

-- 원본: 20260901160000_create_child_growth_reports.sql
drop policy if exists "growth report sources readable by org staff and soyes admin" on public.child_growth_report_sources;
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
          (select private.is_soyes_admin())
          or (
            private.has_org_role(r.organization_id, array['director'])
            and r.status = 'complete'
          )
          or private.is_assigned_class_teacher(r.class_id)
        )
    )
  );

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
        (select private.is_soyes_admin())
        or private.has_org_role(o.organization_id, array['director'])
        or private.is_assigned_class_teacher(o.class_id)
      )
  );
$$;

select private.record_audit_event(
  null, 'cutover.g2_hq_role_split_rolled_back', 'cutover', null, 'G-2 rollback',
  jsonb_build_object('file', 'supabase/cutover/M3_hq_role_split_rollback.sql')
);
