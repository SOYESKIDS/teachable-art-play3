# PHASE 09A — Remote Staging Validation · E2E Harness · Cutover Preflight

| | |
|---|---|
| 기준 | `saas-v2` · HEAD = origin = `153a413` (PHASE 08) · Staging `itcddooiuqsqingfhxkk` · migration 37 local = remote (… `20261002095000`) |
| cutover | G-2 · G-1 · M5 **미적용** (Staging · Production 모두) — 의도된 상태 |
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

## 2. 검증 방식의 한계 (솔직히)

- Preview 가 SSO 뒤에 있어 **remote 앱 수준 E2E · responsive · a11y · 성능은 이번에 Preview 에서 실행하지 못했다.** 같은 커밋(153a413) 코드를
  local-rehearsal(로컬 Supabase · 합성 계정)로 실행한 결과를 기준선으로 기록했고, Preview 실행은 비밀이 준비되면 같은 스크립트로 한다.
- Staging 에는 오늘 예정 수업이 1건뿐이다 — 쓰기 E2E 는 1회만 완전 실행 가능 (수업 완료는 되돌릴 수 없음).
