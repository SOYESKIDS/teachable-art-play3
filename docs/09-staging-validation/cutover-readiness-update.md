# PHASE 09C — Cutover Readiness Update (2026-09-28 · Staging 읽기 전용 재실행)

모든 DB 확인은 `remote_readonly_query.mjs` (Staging `itcddooiuqsqingfhxkk` · 문장마다 READ ONLY transaction · DB 지문 비합성 사용자 0) 로 했다.
앱 확인은 이 저장소 작업 트리(`99f10a7` + 09C 미커밋 수정) 기준이다. **G-2 · G-1 · M5 는 어디에도 적용하지 않았다.**

| cutover | 앱 preflight | DB preflight (Staging) | 판정 |
|---|---|---|---|
| **G-2** | `G2_app_preflight.mjs` **18/18 PASS** | `G2_db_preflight.sql` = **READY (DB) · ESCALATE** — PHASE 08 객체 5/5 · active HQ Sales **1** · active HQ Admin 1 | 준비됨 · 적용 시점을 보안 우선으로 앞당길 것 (ESCALATE) · 계획 [g2-rehearsal-plan.md](./g2-rehearsal-plan.md) · **CUTOVER NOT APPLIED** |
| **G-1** | — | `G1_preflight.sql` = **SAFE TO APPLY M3 CUTOVER** (blocking 0) · WARN 3 (active 계약의 feature `class_mode` · `weekly_report` = not_released · `parent_portal` = policy_blocked CO-12) · INFO: 상품 lifecycle starter=published · pilot/standard/premium=draft · 정책 blocker AR-8 · CO-8 · CO-12 | **G-1 PREFLIGHT SAFE · CUTOVER NOT APPLIED** (WARN 은 사람이 검토 · G-1 은 G-2 이후 J/K/L window 안에서만) |
| **M5** | `M5_app_preflight.mjs` **2/7 FAIL** | `M5_preflight.sql` = **NOT SAFE** — `g2_applied=false` · `g1_applied=false` · `phase08_migrations_applied=true` | **NOT READY** (정상 · 우회하지 않음) |
| **J/K/L** | `JKL_start_gate.mjs` = **DO NOT START J** (exit 1) | `JKL_window_preflight.sql` = **NOT READY — G-2 미적용** · in_progress 수업 0 · G-1 · M5 미적용 · PHASE 08 기반 true | **NOT READY** · J 를 시작하지 않는다 |

## M5 앱 FAIL 5 항목 (정확한 사유 · 그대로 둔다)

1. M5 가 회수하는 RPC 를 앱이 아직 호출 — `growth-report-actions` (`create_or_refresh_child_growth_report` · `save_child_growth_report_atomic`) · `growth-report-ai-actions` (AI 초안 저장 · 적용) · `growth-report-share-actions` (`create_child_growth_report_share`) · `observation-actions` (`save_class_session_observation_atomic`) · `observation-ai-actions` (AI 생성 · 검토 저장)
2. `class_sessions.status` 직접 UPDATE — `src/lib/staff/legacy-session-actions.ts`
3. legacy 화면 계열 파일 · routing switch 존재 — `legacy-session-actions.ts` · `LegacySessionActions.tsx` · `src/lib/rollout/staff-app-routing.ts`
4. legacy UI import — `teacher/growth-reports/page.tsx` · `teacher/sessions/[sessionId]/observations/page.tsx` · `SessionCard.tsx`
5. legacy Action · routing switch 의존 — director nav · director page · director sessions · login actions · teacher 화면 · `TodaySessionBoard` 등 12 파일

→ Production 기본이 legacy 화면 계열이라 현재 브랜치에서는 FAIL 이 정상 (runbook §2-1 · PHASE 08 결정). "legacy 계열을 뺀 빌드" 를 만드는 방법은 사람 결정 (open-items §3).

## local 증거 (transaction 안 적용 → 검증 → rollback → 재적용 → 전부 rollback · 저장되지 않음)

| suite | 결과 |
|---|---|
| `G2_post_cutover.test.sql` | 47/47 PASS (09C) → **67/67 PASS (09C.1** · Sales 사진 · Growth5 · portal · 동의 거부 + 대조군 + `g2_post_verify.sql` 판정) |
| `M3_post_cutover.test.sql` (G-1) | 59/59 PASS |
| `M5_post_cutover.test.sql` | 46/46 PASS |
| 실행 후 local DB | `cutover.*` audit 0 · `is_soyes_admin` 여전히 sales 포함 · release gate trigger 0 (PRE-CUTOVER 그대로) |

## Staging 합성 상태 (읽기 전용 · 개수만)

기관 1 · 반 1 · 원아 3 (합성 표시) · auth 사용자 4 (전원 합성) · active 계약 1 (starter · class_mode · parent_portal · weekly_report) ·
수업 4 (예정 4: 오늘 1 · 미래 3 · 지난 0 · 진행 중 0 · 완료 0) · 1~4주 · 출결 · 관찰 · Growth5 · 메모 · 리포트 · portal · 동의 · 사진 0 ·
audit 0 · cutover audit 0 · 게시 차시 8 · lesson section 88.
PRE-G2 표시: `is_soyes_admin` 이 Sales 포함 = true · 구성원 직접 INSERT 열림 = true · (PRE-M5) 수업 상태 직접 UPDATE 열림 = true — 모두 cutover 전 기대 상태.
