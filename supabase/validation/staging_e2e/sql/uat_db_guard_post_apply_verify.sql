-- PHASE UAT-DB-GUARD — Staging 적용 후 확인 (READ ONLY · SELECT/WITH 만 · 쓰기 없음)
-- 대상: Staging itcddooiuqsqingfhxkk 만. Production(vpppxuhodwauaclhybtg)에서 실행하지 않는다.
-- 기대값은 각 문장 위 주석.

-- 1. 새 trigger 11개 (미래 수업 10 · 학부모 공유 1) — 기대: 11 행
select c.relname as table_name, t.tgname as trigger_name, t.tgenabled
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and t.tgname in ('trg_zz_future_session_guard', 'trg_zz_parent_sharing_release_lock')
  and not t.tgisinternal
order by c.relname, t.tgname;

-- 2. 새 함수 3개 · SECURITY DEFINER · search_path='' — 기대: 3 행 · prosecdef = true · config = {search_path=""}
select p.proname, p.prosecdef, p.proconfig
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname in ('is_future_session', 'reject_future_session_write', 'enforce_parent_sharing_release_lock')
order by p.proname;

-- 3. 새 함수에 authenticated · anon EXECUTE 없음 — 기대: 0 행
select p.proname, r.rolname
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
cross join (values ('authenticated'), ('anon')) as r(rolname)
where n.nspname = 'private'
  and p.proname in ('is_future_session', 'reject_future_session_write', 'enforce_parent_sharing_release_lock')
  and pg_catalog.has_function_privilege(r.rolname, p.oid, 'execute');

-- 4. Storage helper 에 미래 수업 조건 포함 · 권한 그대로 (authenticated 만) — 기대: has_guard = true · auth = true · anon = false
select pg_catalog.pg_get_functiondef(p.oid) like '%is_future_session%' as has_guard,
       pg_catalog.has_function_privilege('authenticated', p.oid, 'execute') as auth,
       pg_catalog.has_function_privilege('anon', p.oid, 'execute') as anon
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private' and p.proname = 'can_upload_observation_media_object';

-- 5. parent_portal 은 미출시 · CO-12 — 기대: is_released = false · blocked_by 에 CO-12
select code, is_released, blocked_by from public.platform_capabilities where code = 'parent_portal';

-- 6. 기존 데이터 불변 (건수만) — 적용 전 값과 같아야 한다
select
  (select count(*) from public.class_sessions) as sessions,
  (select count(*) from public.class_sessions where scheduled_date > private.local_today() and status = 'scheduled') as future_scheduled,
  (select count(*) from public.class_sessions where scheduled_date > private.local_today() and status <> 'scheduled') as future_not_scheduled,
  (select count(*) from public.child_portals) as portals,
  (select count(*) from public.child_portals where status = 'active') as active_portals,
  (select count(*) from public.class_session_attendance) as attendance,
  (select count(*) from public.class_session_observations) as observations;

-- 7. migration 기록 — 기대: 20261002110000 이 마지막
select version from supabase_migrations.schema_migrations order by version desc limit 3;
