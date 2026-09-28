-- PHASE 09A · remote 쓰기 E2E 대상 범위 확인 (READ ONLY · 개수 · 참/거짓 · id 만 · 이름 출력 없음)
-- 파라미터: :'session_id' (UUID · remote_readonly_query.mjs --param session_id=<uuid> 로만 채운다)
-- 판정: guards.assertSyntheticScope (하나라도 어긋나면 REFUSE TO RUN)
with target as (
  select s.id, s.status, s.organization_id, s.class_id
  from public.class_sessions s
  where s.id = :'session_id'
)
select
  exists (select 1 from target) as session_found,
  (select t.status from target t) as session_status,
  (select t.organization_id from target t) as organization_id,
  coalesce((select o.name ~ '(가상|STAGING_|PHASE09_|E2E_)' from public.organizations o join target t on t.organization_id = o.id), false) as org_synthetic,
  coalesce((select c.name ~ '(가상|STAGING_|PHASE09_|E2E_)' from public.classes c join target t on t.class_id = c.id), false) as class_synthetic,
  (select count(*) from public.children ch join target t on t.class_id = ch.class_id)::int as children_total,
  (select count(*) from public.children ch join target t on t.class_id = ch.class_id
    where ch.name ~ '(가상|STAGING_|PHASE09_|E2E_)')::int as children_synthetic,
  (select count(*) from public.organization_members m join target t on t.organization_id = m.organization_id)::int as members_total,
  (select count(*) from public.organization_members m join target t on t.organization_id = m.organization_id
     join auth.users u on u.id = m.user_id where u.email like '%@example.test')::int as members_synthetic,
  (select count(*) from auth.users where email not like '%@example.test')::int as non_synthetic_users,
  coalesce((select private.class_write_allowed(t.class_id, 'class_mode') from target t), false) as class_mode_write
