-- =====================================================================
-- ROLLBACK — 20261002110000_uat_db_guard.sql 되돌리기 (수동 · 승인 후에만 · Staging 전용)
-- ---------------------------------------------------------------------
-- ★ 이 파일은 migrations 폴더 밖에 있어 자동 적용되지 않는다.
-- ★ 데이터를 지우지 않는다 — trigger · 함수만 되돌린다. 실행 후 migration 기록(schema_migrations)의
--   20261002110000 행 처리 방식(repair 또는 새 되돌림 migration)은 운영자가 정한다.
-- ★ 권장: 되돌림이 필요하면 이 내용을 새 migration(예: 20261002120000_uat_db_guard_revert.sql)으로 만들어
--   기록이 앞으로만 쌓이게 한다.
-- =====================================================================

begin;

drop trigger if exists trg_zz_future_session_guard on public.class_sessions;
drop trigger if exists trg_zz_future_session_guard on public.class_session_transitions;
drop trigger if exists trg_zz_future_session_guard on public.session_before_confirmations;
drop trigger if exists trg_zz_future_session_guard on public.quick_memos;
drop trigger if exists trg_zz_future_session_guard on public.class_session_attendance;
drop trigger if exists trg_zz_future_session_guard on public.class_session_observations;
drop trigger if exists trg_zz_future_session_guard on public.observation_growth_selections;
drop trigger if exists trg_zz_future_session_guard on public.class_session_observation_domains;
drop trigger if exists trg_zz_future_session_guard on public.class_session_observation_ai_drafts;
drop trigger if exists trg_zz_future_session_guard on public.class_session_observation_media;
drop trigger if exists trg_zz_parent_sharing_release_lock on public.child_portals;

-- Storage helper — 20261002093000_p08_evidence_write_gates.sql 정의로 되돌린다 (미래 수업 조건 한 줄 제거)
create or replace function private.can_upload_observation_media_object(p_name text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_sessions s
    join public.children c
      on c.id = private.safe_uuid(split_part(p_name, '/', 3))
     and c.organization_id = s.organization_id
     and c.class_id = s.class_id
    where p_name ~ (
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
            || '\.(jpg|png|webp)$'
          )
      and s.id = private.safe_uuid(split_part(p_name, '/', 2))
      and s.organization_id = private.safe_uuid(split_part(p_name, '/', 1))
      and private.is_class_teacher(s.class_id)
      and private.is_recordable_session(s.id)
      -- PHASE 08 WS9 (G-1 이 판정 범위를 넓힌다)
      and private.observation_media_upload_block_reason(s.organization_id, s.class_id, c.id) is null
  );
$$;

revoke execute on function private.can_upload_observation_media_object(text) from public, anon;
grant execute on function private.can_upload_observation_media_object(text) to authenticated;

drop function if exists private.reject_future_session_write();
drop function if exists private.enforce_parent_sharing_release_lock();
drop function if exists private.is_future_session(uuid);

commit;
