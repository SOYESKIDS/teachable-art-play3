-- =====================================================================
-- PHASE 07 · M5 — Cutover: legacy write 회수 · 세션 status 직접 UPDATE 회수
-- ---------------------------------------------------------------------
-- ★ 이 파일은 supabase/migrations 밖에 있다. 자동 적용되지 않는다.
--   앱 cutover 배포와 같은 시점에, 사용자 승인 후 migration 으로 옮겨 적용한다
--   (migration-cutover.md §2 M5 · §5 체크리스트).
--
-- 적용 전 확인
--   [ ] 새 앱이 세션 전환을 모두 RPC(start/finish/recover/cancel)로 한다
--   [ ] 새 앱이 관찰을 save_class_observation 으로 저장한다
--   [ ] legacy 리포트 작성 화면이 비활성 · 조회 adapter 만 남았다
--   [ ] M0 기준선 · M3 음성 테스트 통과
--   [ ] Contract mapping gate 완료 (미등록 production 기관 0)
--
-- legacy 조회 · 기존 공유 링크(read_shared_growth_report)는 유지한다 (DEC-041).
-- legacy 데이터 삭제 · 물리 정리는 M6 (CO-2 · 별도 승인).
-- =====================================================================


-- 1. 세션 status 직접 UPDATE 권한 회수 (예정일 변경 권한은 유지)
revoke update (status) on public.class_sessions from authenticated;
grant update (scheduled_date) on public.class_sessions to authenticated;


-- 2. legacy 리포트 쓰기 경로 중지 (read-only compatibility)
revoke execute on function public.create_or_refresh_child_growth_report(uuid, uuid, date, date, text)
  from authenticated;
revoke execute on function public.save_child_growth_report_atomic(uuid, text, text, text, text, text, timestamptz)
  from authenticated;
revoke execute on function public.save_child_growth_report_ai_draft(uuid, text, text, text, text, text, text)
  from authenticated;
revoke execute on function public.apply_child_growth_report_ai_draft(uuid, timestamptz)
  from authenticated;

-- 신규 legacy 공유 발급 중지 (기존 링크는 만료 · 중지까지 동작 · DEC-041)
revoke execute on function public.create_child_growth_report_share(uuid, text)
  from authenticated;


-- 3. legacy 관찰 저장 경로 중지 (신규는 save_class_observation)
revoke execute on function public.save_class_session_observation_atomic(uuid, uuid, text, text, text, text[], timestamptz)
  from authenticated;
