-- SOYESKIDS Admin Authorization 기반
-- private.admin_users + private.is_soyes_admin() + lead_submissions 관리자 SELECT / UPDATE(status) 권한
--
-- 이 파일은 20260812_create_lead_submissions.sql이 이미 적용된 프로젝트에 이어서 적용합니다.
-- 기존 Migration 파일(20260812_create_lead_submissions.sql)은 전혀 수정하지 않았습니다.
-- 아직 Supabase 프로젝트에는 적용되지 않았습니다. 승인 후 1회 실행하세요.

-- =========================================================
-- 1. private schema
-- =========================================================
-- Supabase Data API는 Dashboard의 "Exposed Schemas"에 등록된 schema만 REST/RPC로 노출합니다.
-- private schema는 그 목록에 넣지 않는 한 외부에서 직접 호출할 수 없습니다.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;


-- =========================================================
-- 2. private.admin_users
-- =========================================================

create table if not exists private.admin_users (
  user_id uuid primary key
    references auth.users (id) on delete cascade,

  role text not null default 'admin'
    constraint admin_users_role_check
    check (role in ('admin', 'sales')),

  is_active boolean not null default true,

  created_at timestamptz not null default now()
);

alter table private.admin_users enable row level security;

-- 의도적으로 어떤 Policy도 만들지 않습니다.
-- RLS가 켜진 상태에서 Policy가 없으면 anon/authenticated 누구도 이 테이블을 직접
-- SELECT / INSERT / UPDATE / DELETE 할 수 없습니다. 관리자 여부 확인은 반드시
-- 아래 SECURITY DEFINER 함수를 통해서만 이루어집니다.

revoke all on private.admin_users from anon, authenticated, public;


-- =========================================================
-- 3. 관리자 판별 함수
-- =========================================================

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


-- =========================================================
-- 4. lead_submissions — 관리자 SELECT / UPDATE(status) 권한 추가
-- =========================================================
-- 기존 "public can insert lead submissions" INSERT Policy와 GRANT는 절대 건드리지 않습니다.

-- 관리자 SELECT를 위해 테이블 단위 SELECT 권한이 먼저 필요합니다.
-- 실제로 어떤 행이 보이는지는 아래 RLS Policy(is_soyes_admin())가 결정합니다.
grant select on public.lead_submissions to authenticated;

-- 관리자가 바꿀 수 있는 컬럼을 status 하나로 제한합니다.
grant update (status) on public.lead_submissions to authenticated;

drop policy if exists "admin can select lead submissions" on public.lead_submissions;

create policy "admin can select lead submissions"
  on public.lead_submissions
  for select
  to authenticated
  using ((select private.is_soyes_admin()));

drop policy if exists "admin can update lead submissions" on public.lead_submissions;

create policy "admin can update lead submissions"
  on public.lead_submissions
  for update
  to authenticated
  using ((select private.is_soyes_admin()))
  with check ((select private.is_soyes_admin()));

-- DELETE Policy는 만들지 않습니다 — 관리자도 삭제할 수 없습니다.
