-- =====================================================================
-- ███  DO NOT APPLY UNTIL M5 PREFLIGHT PASSES  ███
-- =====================================================================
-- PHASE 07 · M5 (PHASE 08 완성) — Cutover: legacy 쓰기 회수 · 세션 status 직접 UPDATE 회수
-- ---------------------------------------------------------------------
-- ★ 이 파일은 supabase/migrations 밖에 있다. 자동 적용되지 않는다 (db reset · db push 대상 아님).
--
-- ★ 적용 조건 (cutover-runbook.md Step L · docs/08-security-hardening/cutover-readiness.md)
--   1. Step J 완료 (SOYE_SAAS_V2_APP_CUTOVER=true) · legacy 화면 계열 코드 제거가 배포됨
--   2. node supabase/cutover/M5_app_preflight.mjs  → PASS (앱이 회수 대상 경로를 쓰지 않음)
--   3. psql -f supabase/cutover/M5_preflight.sql   → VERDICT = SAFE (G-2 · G-1 적용 · 운영 기관 계약 적용)
--   4. 실행 시 운영자가 확인 변수를 명시한다:
--        psql --single-transaction -v ON_ERROR_STOP=1 -v m5_preflight=passed -f <this file>
--      변수가 없으면 M5001 로 중단 · G-2 / G-1 / PHASE 08 기반이 없으면 M5002 로 중단 (부분 적용 없음).
--
-- ★ 되돌리기: supabase/cutover/M5_legacy_write_rollback.sql (회수한 grant · 경로 복원 · 데이터 변경 없음)
-- ★ 반복 적용: revoke · drop … if exists · create or replace 로 안전 (audit 행은 적용할 때마다 1행 추가).
--
-- 회수 대상 (새 앱이 쓰지 않는 legacy 쓰기 전부 · docs/08-security-hardening/write-surface-matrix.md §M5):
--   A. class_sessions.status 직접 UPDATE           → 전환 RPC(start · finish · recovery · cancel)만
--   B. legacy 성장 리포트 RPC 4 + 표 쓰기 grant      → child_growth_reports · _sources · _ai_drafts
--   C. legacy 공유 신규 발급 RPC + 표 INSERT grant    → child_growth_report_shares (DEC-041)
--   D. legacy 관찰 RPC + 관찰영역 연결 표 쓰기 grant  → class_session_observation_domains
--   E. legacy 관찰 형식(legacy_domains) 관찰 작성 · 수정 → trigger 로 거부 (OB008)
--      (관찰 표 grant 는 SaaS 2.0 save_class_observation 이 함께 쓰므로 회수하지 않는다)
--   F. legacy 관찰 AI RPC 2 + 표 쓰기 grant          → class_session_observation_ai_drafts
-- 유지 (legacy historical read · retention 결정 전 · DEC-041):
--   · 모든 legacy 표 SELECT · HQ 메타데이터 RPC · read_shared_growth_report(anon)
--   · 기존 공유 링크 중지: revoke_child_growth_report_share + update(revoked_at)
--   · 출결 RPC(save_class_session_attendance_atomic): SaaS 2.0 Class Mode 가 함께 쓴다 (G-1 gate 적용)
--   · class_sessions.scheduled_date UPDATE (예정일 변경)
-- legacy 데이터 삭제 · 물리 정리는 M6 (CO-2 · 별도 승인).
-- =====================================================================

\if :{?m5_preflight}
\else
  \set m5_preflight missing
\endif

select set_config('m5.preflight', :'m5_preflight', false) as m5_preflight;

do $$
begin
  if current_setting('m5.preflight', true) is distinct from 'passed' then
    raise exception 'M5 preflight 확인 변수가 없습니다. legacy 쓰기 회수를 적용하지 않습니다.'
      using errcode = 'M5001',
            hint = 'M5_app_preflight.mjs · M5_preflight.sql 통과 후 -v m5_preflight=passed 로 실행하세요.';
  end if;

  -- 선행 cutover · migration (runbook 순서: G-2 → G-1 → Step J → M5)
  if pg_catalog.pg_get_functiondef('private.is_soyes_admin()'::regprocedure) like '%''sales''%' then
    raise exception 'G-2 cutover 가 적용되지 않았습니다 (is_soyes_admin 에 sales 포함).' using errcode = 'M5002';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'trg_class_program_assignments_entitlement_gate' and not tgisinternal
  ) then
    raise exception 'G-1 cutover 가 적용되지 않았습니다.' using errcode = 'M5002';
  end if;

  if to_regprocedure('private.gate_growth5_observation_write()') is null
    or to_regprocedure('public.ai_assist_authorization(text, uuid)') is null
  then
    raise exception 'M5 선행 migration(PHASE 08)이 적용되지 않았습니다.' using errcode = 'M5002';
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- A. 세션 status 직접 UPDATE 회수 (예정일 변경 권한은 유지)
-- ---------------------------------------------------------------------
revoke update (status) on public.class_sessions from authenticated;
grant update (scheduled_date) on public.class_sessions to authenticated;


-- ---------------------------------------------------------------------
-- B. legacy 성장 리포트 쓰기 (RPC · 표) — 조회 · 기존 공유 읽기는 유지
-- ---------------------------------------------------------------------
revoke execute on function public.create_or_refresh_child_growth_report(uuid, uuid, date, date, text)
  from authenticated;
revoke execute on function public.save_child_growth_report_atomic(uuid, text, text, text, text, text, timestamptz)
  from authenticated;
revoke execute on function public.save_child_growth_report_ai_draft(uuid, text, text, text, text, text, text)
  from authenticated;
revoke execute on function public.apply_child_growth_report_ai_draft(uuid, timestamptz)
  from authenticated;

revoke insert, update on public.child_growth_reports from authenticated;
revoke insert, delete on public.child_growth_report_sources from authenticated;
revoke insert, update on public.child_growth_report_ai_drafts from authenticated;


-- ---------------------------------------------------------------------
-- C. legacy 공유 신규 발급 중지 (기존 링크는 만료 · 중지까지 동작 · 원장 중지 가능 · DEC-041)
-- ---------------------------------------------------------------------
revoke execute on function public.create_child_growth_report_share(uuid, text)
  from authenticated;
revoke insert on public.child_growth_report_shares from authenticated;


-- ---------------------------------------------------------------------
-- D. legacy 관찰 저장 경로 · 관찰영역 연결 (신규는 save_class_observation · Growth5)
-- ---------------------------------------------------------------------
revoke execute on function public.save_class_session_observation_atomic(uuid, uuid, text, text, text, text[], timestamptz)
  from authenticated;
revoke insert, delete on public.class_session_observation_domains from authenticated;


-- ---------------------------------------------------------------------
-- E. legacy 형식 관찰 작성 · 수정 거부 (관찰 표 grant 는 SaaS 2.0 과 공유)
-- ---------------------------------------------------------------------
create or replace function private.close_legacy_observation_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 내용 변경 없는 UPDATE(FK SET NULL 정리)는 막지 않는다
  if tg_op = 'UPDATE'
    and (to_jsonb(new) - array['created_by', 'updated_by', 'updated_at'])
      = (to_jsonb(old) - array['created_by', 'updated_by', 'updated_at'])
  then
    return new;
  end if;

  if new.taxonomy is distinct from 'growth5' then
    raise exception '이전 형식 관찰기록은 더 이상 작성하거나 수정할 수 없습니다.' using errcode = 'OB008';
  end if;
  return new;
end;
$$;

revoke execute on function private.close_legacy_observation_write() from public, anon, authenticated;

drop trigger if exists trg_observations_legacy_write_closed on public.class_session_observations;
create trigger trg_observations_legacy_write_closed
  before insert or update on public.class_session_observations
  for each row execute function private.close_legacy_observation_write();


-- ---------------------------------------------------------------------
-- F. legacy 관찰 AI (정리 초안 생성 · 검토) — SaaS 2.0 은 이 표를 쓰지 않는다
-- ---------------------------------------------------------------------
revoke execute on function public.save_observation_ai_generated_atomic(uuid, text, text, text, text)
  from authenticated;
revoke execute on function public.save_observation_ai_review_atomic(uuid, text, timestamptz)
  from authenticated;
revoke insert, update on public.class_session_observation_ai_drafts from authenticated;


-- ---------------------------------------------------------------------
-- 적용 기록 (audit · 운영 절차 추적)
-- ---------------------------------------------------------------------
select private.record_audit_event(
  null, 'cutover.m5_legacy_writes_revoked', 'cutover', null,
  'M5 preflight passed',
  jsonb_build_object('file', 'supabase/cutover/M5_legacy_write_revoke.sql')
);
