-- =====================================================================
-- ROLLBACK — M5 legacy write revoke (M5_legacy_write_revoke.sql) · PHASE 08
-- ---------------------------------------------------------------------
-- M5 적용 전 권한으로 되돌린다. 데이터 변경 없음 (grant · trigger 정의만).
-- 복원 값은 각 원본 migration 의 grant 와 같다:
--   A. class_sessions update(status)                      ← 20260826
--   B. child_growth_reports · _sources · _ai_drafts 쓰기 + RPC 4  ← 20260901160000 · 20260901190000
--   C. child_growth_report_shares insert + 발급 RPC          ← 20260903090000
--   D. class_session_observation_domains insert · delete + legacy 관찰 RPC ← 20260831094000 · 20260831100000
--   E. legacy 형식 관찰 closure trigger 제거
--   F. class_session_observation_ai_drafts 쓰기 + RPC 2    ← 20260901090000
-- 되돌리면 legacy 화면 계열의 쓰기 경로가 다시 열린다 — 장애 대응용 (legacy 앱을 다시 배포해야 할 때).
-- 실행: psql --single-transaction -v ON_ERROR_STOP=1 -f supabase/cutover/M5_legacy_write_rollback.sql
-- =====================================================================

-- A
grant update (status) on public.class_sessions to authenticated;

-- B
grant execute on function public.create_or_refresh_child_growth_report(uuid, uuid, date, date, text)
  to authenticated;
grant execute on function public.save_child_growth_report_atomic(uuid, text, text, text, text, text, timestamptz)
  to authenticated;
grant execute on function public.save_child_growth_report_ai_draft(uuid, text, text, text, text, text, text)
  to authenticated;
grant execute on function public.apply_child_growth_report_ai_draft(uuid, timestamptz)
  to authenticated;

grant insert (organization_id, class_id, child_id, period_start, period_end, title)
  on public.child_growth_reports to authenticated;
grant update (title, growth_changes, observation_summary, next_support, status)
  on public.child_growth_reports to authenticated;
grant insert (report_id, observation_id) on public.child_growth_report_sources to authenticated;
grant delete on public.child_growth_report_sources to authenticated;
grant insert (report_id, generated_growth_changes, generated_observation_summary, generated_next_support,
              provider, model, prompt_version)
  on public.child_growth_report_ai_drafts to authenticated;
grant update (generated_growth_changes, generated_observation_summary, generated_next_support,
              provider, model, prompt_version)
  on public.child_growth_report_ai_drafts to authenticated;

-- C
grant execute on function public.create_child_growth_report_share(uuid, text) to authenticated;
grant insert (report_id, token_hash) on public.child_growth_report_shares to authenticated;

-- D
grant execute on function public.save_class_session_observation_atomic(uuid, uuid, text, text, text, text[], timestamptz)
  to authenticated;
grant insert (observation_id, domain_code) on public.class_session_observation_domains to authenticated;
grant delete on public.class_session_observation_domains to authenticated;

-- E
drop trigger if exists trg_observations_legacy_write_closed on public.class_session_observations;
drop function if exists private.close_legacy_observation_write();

-- F
grant execute on function public.save_observation_ai_generated_atomic(uuid, text, text, text, text)
  to authenticated;
grant execute on function public.save_observation_ai_review_atomic(uuid, text, timestamptz)
  to authenticated;
grant insert (organization_id, class_session_id, class_id, child_id, observation_id,
              source_observation_updated_at, generated_text, provider, model, prompt_version)
  on public.class_session_observation_ai_drafts to authenticated;
grant update (source_observation_updated_at, generated_text, provider, model, prompt_version,
              review_status, reviewed_text)
  on public.class_session_observation_ai_drafts to authenticated;

select private.record_audit_event(
  null, 'cutover.m5_legacy_writes_restored', 'cutover', null, 'M5 rollback',
  jsonb_build_object('file', 'supabase/cutover/M5_legacy_write_rollback.sql')
);
