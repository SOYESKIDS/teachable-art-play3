-- =====================================================================
-- PHASE 07 · M1 (additive only) — HQ role helpers · audit foundation
-- ---------------------------------------------------------------------
-- 근거: DEC-079 (HQ Admin ≠ HQ Sales) · DEC-093 (Hybrid audit) · DEC-094 (M1)
--
-- 이 migration 은 기존 정책 · 제약을 바꾸지 않는다.
--   - private.is_hq_admin() / private.is_hq_sales() 를 추가만 한다.
--     기존 private.is_soyes_admin() 의 의미 변경은 M3 migration 에서 한다.
--   - audit_events 는 append-only 다. 행 기록은 SECURITY DEFINER trigger ·
--     helper 만 한다 (authenticated 에 INSERT 권한 없음).
--   - audit 에는 아동 발화 · 관찰 본문 · AI 원문 · 사진 경로 · portal token ·
--     prompt · 보호자 개인정보를 넣지 않는다 (DEC-093).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. HQ role helpers (DEC-079)
-- ---------------------------------------------------------------------

create or replace function private.is_hq_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from private.admin_users au
    where au.user_id = (select auth.uid())
      and au.is_active = true
      and au.role = 'admin'
  );
$$;

revoke execute on function private.is_hq_admin() from public;
grant execute on function private.is_hq_admin() to authenticated;


create or replace function private.is_hq_sales()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from private.admin_users au
    where au.user_id = (select auth.uid())
      and au.is_active = true
      and au.role = 'sales'
  );
$$;

revoke execute on function private.is_hq_sales() from public;
grant execute on function private.is_hq_sales() to authenticated;


-- 앱 Shell 분기용: 현재 사용자의 HQ 역할 ('admin' | 'sales' | null).
-- user_id 인자를 받지 않는다 (auth.uid() 기준).
create or replace function public.current_hq_role()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select au.role
  from private.admin_users au
  where au.user_id = (select auth.uid())
    and au.is_active = true
  limit 1;
$$;

revoke execute on function public.current_hq_role() from public, anon;
grant execute on function public.current_hq_role() to authenticated;


-- ---------------------------------------------------------------------
-- 2. updated_at 동시성 토큰 (Invariant AI-6: clock_timestamp)
-- ---------------------------------------------------------------------

create or replace function private.set_updated_at_clock()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

revoke execute on function private.set_updated_at_clock() from public;


-- 한국 운영 기준 오늘 날짜. 앱의 Asia/Seoul 표시 규칙과 같은 기준을 쓴다.
create or replace function private.local_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (pg_catalog.now() at time zone 'Asia/Seoul')::date;
$$;

revoke execute on function private.local_today() from public;
grant execute on function private.local_today() to authenticated, anon;


-- ---------------------------------------------------------------------
-- 3. audit_events (DEC-093 · append-only)
-- ---------------------------------------------------------------------

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid
    references public.organizations (id) on delete restrict,

  actor_user_id uuid
    references auth.users (id) on delete set null,

  -- 예: session.recovery_completed · report.hidden · contract.status_changed
  event_type text not null
    constraint audit_events_event_type_check
    check (
      char_length(event_type) <= 80
      and event_type ~ '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$'
    ),

  target_type text not null
    constraint audit_events_target_type_check
    check (target_type ~ '^[a-z][a-z0-9_]{1,40}$'),

  target_id uuid,

  -- 사용자가 입력한 사유 (민감 본문 금지 · UI 에서 안내)
  reason text
    constraint audit_events_reason_check
    check (
      reason is null
      or (char_length(reason) <= 500 and btrim(reason) <> '')
    ),

  -- 안전한 메타데이터만 (상태값 · 개수 · id). 본문 · 경로 · token 금지.
  metadata jsonb not null default '{}'::jsonb
    constraint audit_events_metadata_check
    check (
      jsonb_typeof(metadata) = 'object'
      and pg_column_size(metadata) <= 4096
    ),

  created_at timestamptz not null default pg_catalog.clock_timestamp()
);

create index if not exists audit_events_org_created_idx
  on public.audit_events (organization_id, created_at desc);

create index if not exists audit_events_target_idx
  on public.audit_events (target_type, target_id);

alter table public.audit_events enable row level security;

revoke all on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;

-- Director 는 audit_events 전체를 직접 읽지 않는다 (DEC-093). HQ Admin 만.
drop policy if exists "audit events readable by hq admin" on public.audit_events;
create policy "audit events readable by hq admin"
  on public.audit_events
  for select
  to authenticated
  using ((select private.is_hq_admin()));


create or replace function private.enforce_audit_events_append_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'audit 기록은 수정하거나 삭제할 수 없습니다.'
    using errcode = 'check_violation';
end;
$$;

revoke execute on function private.enforce_audit_events_append_only() from public;

drop trigger if exists trg_audit_events_append_only on public.audit_events;
create trigger trg_audit_events_append_only
  before update or delete on public.audit_events
  for each row execute function private.enforce_audit_events_append_only();


-- 기록 helper. SECURITY DEFINER trigger · 함수 안에서만 호출한다.
-- authenticated 에 EXECUTE 를 주지 않는다 (임의 audit 행 위조 방지).
create or replace function private.record_audit_event(
  p_organization_id uuid,
  p_event_type text,
  p_target_type text,
  p_target_id uuid,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (
    organization_id,
    actor_user_id,
    event_type,
    target_type,
    target_id,
    reason,
    metadata
  )
  values (
    p_organization_id,
    (select auth.uid()),
    p_event_type,
    p_target_type,
    p_target_id,
    nullif(btrim(coalesce(p_reason, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke execute on function private.record_audit_event(uuid, text, text, uuid, text, jsonb)
  from public, anon, authenticated;
