-- =====================================================================
-- FACT FINGERPRINT (READ ONLY · LOCAL) — migration 전후 기존 사실 보존 확인
-- 같은 스크립트를 PHASE 07 migration 전 · 후에 실행해 출력이 같아야 한다.
-- PHASE 07 이전에도 존재하던 컬럼만 해시한다 (새 컬럼은 비교 대상 아님).
-- =====================================================================
begin;
set transaction read only;
select 'organizations', count(*), md5(string_agg(id::text || name || status || updated_at::text, '|' order by id)) from public.organizations
union all select 'members', count(*), md5(string_agg(id::text || role || status || updated_at::text, '|' order by id)) from public.organization_members
union all select 'classes', count(*), md5(string_agg(id::text || status || updated_at::text, '|' order by id)) from public.classes
union all select 'children', count(*), md5(string_agg(id::text || coalesce(class_id::text, '') || name || status || updated_at::text, '|' order by id)) from public.children
union all select 'assignments', count(*), md5(string_agg(id::text || status || coalesce(start_date::text, '') || updated_at::text, '|' order by id)) from public.class_program_assignments
union all select 'sessions', count(*), md5(string_agg(id::text || status || coalesce(scheduled_date::text, '') || lesson_id::text || updated_at::text, '|' order by id)) from public.class_sessions
union all select 'attendance', count(*), md5(string_agg(id::text || attendance_status || updated_at::text, '|' order by id)) from public.class_session_attendance
union all select 'observations', count(*), md5(string_agg(id::text || coalesce(teacher_note, '') || coalesce(child_voice, '') || record_status || updated_at::text, '|' order by id)) from public.class_session_observations
union all select 'observation_domains', count(*), md5(string_agg(observation_id::text || domain_code, '|' order by observation_id, domain_code)) from public.class_session_observation_domains
union all select 'media', count(*), md5(string_agg(id::text || storage_path || byte_size::text, '|' order by id)) from public.class_session_observation_media
union all select 'obs_ai_drafts', count(*), md5(string_agg(id::text || generated_text || coalesce(reviewed_text, '') || review_status || updated_at::text, '|' order by id)) from public.class_session_observation_ai_drafts
union all select 'legacy_reports', count(*), md5(string_agg(id::text || status || period_start::text || period_end::text || coalesce(growth_changes, '') || updated_at::text, '|' order by id)) from public.child_growth_reports
union all select 'legacy_sources', count(*), md5(string_agg(id::text || reviewed_text_snapshot, '|' order by id)) from public.child_growth_report_sources
union all select 'legacy_report_ai', count(*), md5(string_agg(id::text || generated_growth_changes || updated_at::text, '|' order by id)) from public.child_growth_report_ai_drafts
union all select 'legacy_shares', count(*), md5(string_agg(id::text || token_hash || expires_at::text || coalesce(revoked_at::text, ''), '|' order by id)) from public.child_growth_report_shares
union all select 'leads', count(*), md5(string_agg(id::text || status || updated_at::text, '|' order by id)) from public.lead_submissions
union all select 'admin_users', count(*), md5(string_agg(user_id::text || role, '|' order by user_id)) from private.admin_users
order by 1;
rollback;
