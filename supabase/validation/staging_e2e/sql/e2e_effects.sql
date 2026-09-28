-- PHASE 09A · E2E 쓰기 결과 확인 (READ ONLY · E2E_ 표시 기록의 개수 · 상태만 · 본문 출력 없음)
-- e2e_roles.mjs 실행 전후에 remote_readonly_query.mjs 로 실행해 비교한다.
select
  (select count(*) from public.class_sessions where status = 'completed') as sessions_completed,
  (select count(*) from public.class_sessions where status = 'in_progress') as sessions_in_progress,
  (select count(*) from public.class_session_attendance) as attendance_rows,
  (select count(*) from public.class_session_observations where teacher_note like 'E2E\_OBS\_%') as e2e_observations,
  (select count(*) from public.observation_growth_selections g
     join public.class_session_observations o on o.id = g.observation_id
    where o.teacher_note like 'E2E\_OBS\_%' and g.metric_code = 'creative_attempt' and g.stage = 'independent') as e2e_growth5_independent,
  (select count(*) from public.quick_memos where body like 'E2E\_%') as e2e_memos_remaining,
  (select count(*) from public.report_revisions where status = 'complete' and content::text like '%E2E\_WEEKLY\_%') as e2e_weekly_completed,
  (select count(*) from public.reports where hidden_at is not null) as hidden_reports,
  (select count(*) from public.child_portals where status = 'active') as active_portals,
  (select count(*) from public.child_portals where status <> 'active') as stopped_portals,
  (select count(*) from public.audit_events) as audit_events
