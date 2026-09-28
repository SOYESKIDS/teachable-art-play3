# PHASE 08 — Test Matrix (local 전용 · 2026-09-28 · PRE-COMMIT review 후)

모든 실행은 local Docker Supabase(`supabase_db_teachable-art-play3`)에서만 했다. remote · `--linked` · Staging SQL 없음.

## 1. 결과 (최종 실행 · fresh `db reset` 부터)

| # | Suite | 명령 | 결과 | PHASE 07 기준 |
|---|---|---|---|---|
| 1 | fresh reset | `npx supabase@2.113.0 db reset` | PASS · migration 37개 (기존 21 · PHASE 07 10 · PHASE 08 6) | — |
| 2 | pre-cutover pgTAP | `npx supabase@2.113.0 test db` | **232/232** (baseline 30 · hardening 116 · PHASE 08 86) | 146 |
| 3 | POST-G2 | `run-local.mjs G2_post_cutover.test.sql` | **47/47** (기존 28 + PHASE 08 19) | 28 |
| 4 | POST-G1 | `run-local.mjs M3_post_cutover.test.sql` | **59/59** (기존 24 + PHASE 08 35 · ISSUE1 · ISSUE4 포함) | 24 |
| 5 | POST-M5 | `run-local.mjs M5_post_cutover.test.sql` | **46/46** | — |
| 6 | 잔여 확인 | test 후 local 상태 | G-1 gate 0 · G-2 AI gate 0 · M5 미적용 · audit 0 · 기관 0 · 상품 버전 전부 draft | — |
| 7 | production-shaped | reset `--version 20260904090000` → seed → fingerprint → `migration up --local` → fingerprint → G1_preflight → 03 | fingerprint **IDENTICAL (17 rows)** · G1 NOT SAFE (5 · 미mapping · 기존과 같음) · **83/83** | 83 |
| 8 | 앱 gate · J/K/L gate | `node --test supabase/validation/phase08/app_gates.test.mjs` | **12/12** | — |
| 9 | G-2 앱 preflight | `node supabase/cutover/G2_app_preflight.mjs` | **18/18 PASS** | 15/15 |
| 10 | G-2 DB preflight (신규) | `run-local.mjs G2_db_preflight.sql --raw` | 새 DB: READY · active Sales 1 추가: **READY · ESCALATE** | — |
| 11 | G-1 preflight | `run-local.mjs G1_preflight.sql --raw` | 새 DB: SAFE (기관 0) · production-shaped: NOT SAFE 5 | 같음 |
| 12 | M5 DB preflight | `run-local.mjs M5_preflight.sql --raw` (새 DB) | NOT SAFE (G-2 · G-1 미적용 · 정상) | — |
| 13 | M5 guard | 변수 없이 · 변수만 (local) | **M5001** · **M5002** 중단 · 권한 변화 0 · audit 0 | — |
| 14 | M5 앱 preflight | `node supabase/cutover/M5_app_preflight.mjs` | 2/7 · **FAIL (정상: legacy 화면 계열 유지)** | — |
| 15 | J/K/L start gate (신규) | `node supabase/cutover/JKL_start_gate.mjs` | **DO NOT START J** (현재 브랜치) · fixture 빌드 READY · legacy 소비자 빌드 차단 (node:test) | — |
| 16 | J/K/L window DB preflight (신규) | `run-local.mjs JKL_window_preflight.sql --raw` | 새 DB: NOT READY (G-2 미적용) · local G-2 후: READY · 계약 없는 운영 기관 추가: NOT READY (G-1 blocking) | — |
| 17 | tsc · lint · build | `npx tsc --noEmit` · `npx eslint` · `npm run build` | PASS · PASS · PASS | PASS |
| 18 | diff check | `git diff --check` | PASS | PASS |

pgTAP 합계: **467** = pre 232 + G-2 47 + G-1 59 + M5 46 + production-shaped 83
(PHASE 07 기준 281 은 모두 그대로 포함 · 신규 186). TODO 0 · SKIP 0.

### 기존 suite 에서 바꾼 것 (약화 없음)

| 파일 | 변경 | 이유 |
|---|---|---|
| `p0_security_baseline.test.sql` | fixture 에 1주 차시 필수 섹션 10행 (assertion · plan 불변) | 시작 RPC Required Content Set (SS008) |
| `p0_hardening.test.sql` | fixture 에 아이 A1 동의 consented 1행 (assertion · plan 불변) | Weekly 사진 consented 만 (RP011) |
| `G2_post_cutover.test.sql` · `M3_post_cutover.test.sql` | PHASE 08 assertion 추가 (기존 assertion 불변) | G-2 §5 §6 · G-1 D4 · D5 · ISSUE1 · ISSUE4 · rollback |
| `browser_smoke/02_seed.sql` | [LOCAL SIMULATION] 아이 1 동의 consented (evidence_ref 비움) | smoke Weekly 사진 흐름 유지 (smoke 는 이번에 실행 안 함) |

## 2. PRE-COMMIT review 필수 테스트

| 요구 | 위치 |
|---|---|
| 1. active contract creation BEFORE G-1 does not change legacy write behavior | phase08 `ISSUE1:` 5개 (범위 밖 반 출결 · legacy 관찰 + 관찰영역 · 업로드 · 정지 계약 직접 시작 · 정지 계약 업로드) · POST-G1 `ISSUE1/POST` 3개 (같은 경로가 G-1 에서만 차단) · rollback 후 원래 동작 2개 |
| 2. post-G1 new-org onboarding bootstrap end-to-end | POST-G1 `ISSUE4:` 12개 (초안 배정 · provenance · Readiness READY · 활성화 · 서비스 모드 · 계약 1개 · 일정 · BEFORE · 시작 · 출결 · Growth5 · G-1 재적용 없음) |
| 3. J/K/L runbook prevents starting J when M5 readiness is not clean | app_gates `JKL:` 3개 · JKL window preflight 실행 기록 (#16) · runbook §2-1 |
| 4. post-G2 Sales membership mutation denied | POST-G2 (RPC 42501 · 직접 자기 부여 · 다른 사용자 INSERT · UPDATE 42501) |
| 5. post-G2 HQ Admin direct membership DML denied and audited RPC succeeds | POST-G2 (직접 INSERT · UPDATE 42501 · add · change RPC 성공 · audit via rpc 2 · direct 0) |

## 3. PHASE 08 요구 테스트 ↔ 위치

| 요구 | 위치 |
|---|---|
| membership self-grant · Sales · last-director · audit | phase08 WS1 · POST-G2 |
| AI key present + AR-8 blocked · no ai_assist · authorized only · AI off | phase08 WS2 · app_gates A1 · POST-G2 AG002 |
| G-1 onboarding bootstrap · post-cutover · rollback | POST-G1 D4 · ISSUE4 · ROLLBACK · RE-APPLY |
| missing gate regression | phase08 WS5 · WS9 (V2 전용) · POST-G1 ISSUE1/POST · D5 |
| Pilot max classes | phase08 WS6 |
| V2 legacy-session bypass | app_gates A2 · POST-G1 ISSUE1/POST · POST-M5 |
| required lesson-section RPC gate | phase08 WS8 |
| attendance entitlement · media consent · weekly photo | POST-G1 (출결 EN003 · 업로드) · phase08 WS9 |
| legacy share hide/revoke | phase08 WS10 · POST-M5 |
| M5 preflight / post / rollback | M5_preflight · M5_app_preflight · POST-M5 · guard 실행 |

## 4. 실행하지 않은 것 (의도 · GAP)

- Remote Staging role-by-role E2E (GAP 유지) · local 브라우저 smoke (범위 밖)
- Production active HQ Sales 수 원격 조회 (G-2 DB preflight 필수 항목으로 대체)
- Next 런타임 Server Action E2E (legacy 수업 Action 모드 거부는 정적 검사)
