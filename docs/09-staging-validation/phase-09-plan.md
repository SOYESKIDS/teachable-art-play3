# PHASE 09A — Remote Staging Validation · E2E Harness · Cutover Preflight

| | |
|---|---|
| 기준 | `saas-v2` · HEAD = origin = `153a413` (PHASE 08) · Staging `itcddooiuqsqingfhxkk` · migration 37 local = remote (… `20261002095000`) |
| cutover | G-2 · G-1 · M5 **미적용** (Staging · Production 모두) — 의도된 상태 (PHASE 09A 기준 · 아래 현재 상태 참고) |
| **현재 (PHASE 09D 이후 · 2026-09-29)** | Staging: **G-2 ACTIVE — VERIFIED** · G-1 NOT APPLIED (preflight SAFE) · M5 NOT READY · J/K/L DO NOT START · Production: 변경 없음 ([phase-09d-g2-rehearsal-result.md](./phase-09d-g2-rehearsal-result.md)) |
| 범위 | 읽기 전용 remote 검증 · E2E harness · read-only cutover preflight · responsive · a11y · performance · runtime baseline |
| 범위 밖 (PHASE 09B · 사람 승인 후) | Staging G-2 · G-1 · M5 rehearsal · rollback rehearsal · post-cutover role E2E |
| 관련 | [remote-baseline.md](./remote-baseline.md) · [role-e2e-matrix.md](./role-e2e-matrix.md) · [cutover-preflight.md](./cutover-preflight.md) · [responsive-a11y.md](./responsive-a11y.md) · [performance-baseline.md](./performance-baseline.md) · [open-items.md](./open-items.md) · [harness-safety-review.md](./harness-safety-review.md) · harness: `supabase/validation/staging_e2e/` |

## 1. 실행 결과 요약

| 영역 | 결과 |
|---|---|
| Staging DB (read-only) | inventory = 기대 seed 와 일치 · 비합성 사용자 0 · cutover 흔적 0 · preflight 4개 실행 |
| Preview | Vercel Deployment Protection(SSO) 로 보호 · 모든 경로 302 → vercel.com SSO · 앱 수준 자동 점검 = **BLOCKED_PENDING_LOCAL_SECRETS** (`SOYE_STAGING_VERCEL_BYPASS` · 역할 비밀번호 MISSING) · 사람 login smoke 는 PASS (사용자 보고) |
| Runtime logs (Vercel CLI · 읽기) | 최근 7일 saas-v2 Preview: 5xx 0 · error/fatal/warning 0 (요청 36건 · 인증 흐름 트래픽 거의 없음) |
| Harness | guard · read-only SQL · probe · UI audit · role E2E 작성 · local-rehearsal 로 전 흐름 검증 (40 PASS · 1 CUTOVER_PENDING · DB 전후 비교 일치) |
| remote 쓰기 · cutover · Production 변경 | 0 |

## 1-1. PHASE 09B 접근 전략 변경 — Preview Deployment Protection Exception

**saas-v2 Preview uses a Vercel Deployment Protection Exception. Automation bypass secrets are not part of the PHASE 09 workflow.**

| | |
|---|---|
| 이유 | 프로젝트 소유자가 개발자가 아니고, "Protection Bypass for Automation" 비밀을 만들고 · 로컬 env 로 넣는 흐름이 복잡하고 실수가 잦았다 |
| 범위 | Exception 은 **saas-v2 Preview alias 하나만** (`https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app`) |
| Production | 이 결정으로 Production 을 공개하거나 Production 보호 · 설정을 바꾸지 않는다 |
| 데이터 | Preview 는 Staging Supabase(`itcddooiuqsqingfhxkk`)의 **합성 데이터만** 가리킨다 (번들 ref · DB 지문 guard 그대로) |
| 종료 | Staging 검증이 끝나면 **Exception 을 제거**한다 (사람이 Vercel 설정에서) |
| harness | `SOYE_STAGING_VERCEL_BYPASS` · bypass header · bypass query · bypass cookie 설정 제거. `/login` 이 여전히 vercel.com SSO 로 가면 `BLOCKED_BY_VERCEL_DEPLOYMENT_PROTECTION` 으로 멈춘다 (우회 시도 없음). 역할 비밀번호 4개만 로컬 env · 없으면 `AUTHENTICATED_E2E = BLOCKED_PENDING_LOCAL_PASSWORDS`. 그 밖의 guard(alias 정확히 하나 · Production host · project ref · 번들 ref · DB 지문 · 읽기 전용 SQL · 합성 범위 · 쓰기 gate)는 그대로 |

아래 §1 · 다른 문서의 `BLOCKED_PENDING_LOCAL_SECRETS` 는 PHASE 09A 당시 결과 기록이다.

## 1-2. PHASE 09C — Staging service QA · QA 수정 · G-2 준비

보고: [phase-09c-report.md](./phase-09c-report.md) · QA 수정: [qa-fixes.md](./qa-fixes.md) · G-2 계획: [g2-rehearsal-plan.md](./g2-rehearsal-plan.md) ·
cutover 상태: [cutover-readiness-update.md](./cutover-readiness-update.md). remote 쓰기 0 · cutover 적용 0 · Production 변경 0.

## 1-3. PHASE 09D — G-2 Staging rehearsal

**Staging: G-2 ACTIVE — VERIFIED** (2026-09-29 · rollback 불필요) · G-1 · M5 미적용 · J/K/L 시작 안 함 · Production 변경 0 ·
결과: [phase-09d-g2-rehearsal-result.md](./phase-09d-g2-rehearsal-result.md).

## 2. 검증 방식의 한계 (솔직히)

- Preview 가 SSO 뒤에 있어 **remote 앱 수준 E2E · responsive · a11y · 성능은 이번에 Preview 에서 실행하지 못했다.** 같은 커밋(153a413) 코드를
  local-rehearsal(로컬 Supabase · 합성 계정)로 실행한 결과를 기준선으로 기록했고, Preview 실행은 비밀이 준비되면 같은 스크립트로 한다.
- Staging 에는 오늘 예정 수업이 1건뿐이다 — 쓰기 E2E 는 1회만 완전 실행 가능 (수업 완료는 되돌릴 수 없음).
