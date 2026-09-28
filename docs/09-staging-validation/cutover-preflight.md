# PHASE 09A — Read-only Cutover Preflight (Staging · 2026-09-28)

DB preflight 는 `remote_readonly_query.mjs` 로 **정식 preflight 파일의 SELECT 문을 그대로** 한 문장씩 read-only transaction 안에서 실행했다
(psql meta · begin/rollback 제거 · 쓰기 키워드 거부). 앱 preflight 는 HEAD `153a413` 소스(= Preview 빌드 커밋)를 정적 점검했다.
**cutover 는 적용하지 않았다.** 아래 FAIL · NOT READY 는 현재 상태에서 의도된 결과다.

| cutover | preflight | 결과 | 해석 |
|---|---|---|---|
| G-2 | `G2_app_preflight.mjs` | **18/18 PASS** | 앱은 G-2 이후 동작 준비됨 |
| G-2 | `G2_db_preflight.sql` | PHASE 08 객체 5/5 · active HQ Sales **1** · active HQ Admin 1 · 직접 구성원 변경 기록 0 · VERDICT **READY (DB) · ESCALATE** | Staging 에 active Sales 가 있다 → G-2 rehearsal · 적용 시점을 보안 우선으로 (PHASE 09B) |
| G-1 | `G1_preflight.sql` | BLOCKING 0 · WARN 0 · Pilot 초과 0 · Readiness 미충족 3 (활성 합성 STARTER: class_mode · weekly_report not_released · parent_portal CO-12) · VERDICT **SAFE TO APPLY M3 CUTOVER** | 유일한 운영 기관이 (합성) 유효 계약을 가진 상태. 합성 계약이라 Production 판단 근거 아님 |
| M5 | `M5_preflight.sql` | g2_applied false · g1_applied false · PHASE 08 true · VERDICT **NOT SAFE — 선행 cutover(G-2 · G-1) 미적용** | 의도된 결과 (runbook 순서) |
| M5 | `M5_app_preflight.mjs` | **2/7 FAIL** (legacy RPC 소비자 · legacy 직접 status UPDATE · legacy 파일 · Legacy* UI import · 라우팅 스위치 의존) | 의도된 결과: saas-v2 는 legacy 화면 계열을 아직 유지 |
| J/K/L | `JKL_start_gate.mjs` | **DO NOT START J** | M5 앱 조건 미충족 (위와 같음) |
| J/K/L | `JKL_window_preflight.sql` | G-2 false · PHASE 08 true · G-1 미적용 · M5 미적용 · 진행 중 수업 0 · VERDICT **NOT READY — G-2 미적용** | 의도된 결과 |

## PHASE 09B 로 넘길 것 (적용하지 않음)

- G-2 rehearsal 전: active Sales 1 → ESCALATE 기록 유지 · G2_app_preflight PASS 유지.
- J/K/L rehearsal 은 legacy 화면 계열을 뺀 빌드(M5 앱 preflight PASS)가 있어야 시작 가능 — 현재 브랜치에는 없다.
  09B 에서 J/K/L 까지 rehearsal 하려면 그 빌드를 어떻게 만들지(별도 브랜치 · 빌드 플래그 불가 · legacy 제거 PR) 사람 결정이 필요하다.
