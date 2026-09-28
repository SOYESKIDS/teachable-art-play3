# PHASE 09C — Staging Service QA · QA Fixes · G-2 Readiness (2026-09-28)

기준: `saas-v2` HEAD = origin = `99f10a7` · Staging `itcddooiuqsqingfhxkk` · 일반 migration 37 local = remote (… `20261002095000`) · G-2 · G-1 · M5 미적용.
**remote 쓰기 0 · cutover 적용 0 (G-2 0 · G-1 0 · M5 0) · Production 변경 0 · bypass 비밀 생성 0 · 커밋 0.**

## 상태 표기

| 표기 | 의미 |
|---|---|
| PASS | 이번에 실행해 확인 |
| BLOCKED | 외부 조건(Preview SSO · 비밀번호 · DB 연결 문자열)으로 실행 불가 |
| CUTOVER_PENDING | cutover 전 기대 상태 (결함 아님) |
| DEFERRED | 알고도 이번에 고치지 않음 (분류 · 사유 기록) |
| OPEN | 사람 결정 · 정책 항목 (이번에 판단하지 않음) |

## 요약

| 영역 | 결과 |
|---|---|
| Preview HTTP (`dpl_cvTikwdVDaVcKnfJ8Ao73eobj485` · Ready · alias 연결) | **BLOCKED** — 모든 경로 302 → vercel.com SSO (edge). `vercel curl` 은 bypass 비밀을 새로 만들기 때문에 실행하지 않음 (open-items P09C-V1) |
| Staging DB (읽기 전용) | PASS — 비합성 사용자 0 · 합성 기관 1 · 반 1 · 원아 3 · 예정 수업 4 · 기록 0 · cutover audit 0 ([cutover-readiness-update.md](./cutover-readiness-update.md)) |
| local role E2E | PASS — 45 PASS · 1 CUTOVER_PENDING · 0 FAIL · DB 전후 일치 ([role-e2e-matrix.md §3](./role-e2e-matrix.md)) |
| QA 수정 | A11Y-1 FIXED · A11Y-2 FIXED · PERF-1 P0 FIXED (나머지 분류 · DEFERRED) · HQ 로그인 aria FIXED ([qa-fixes.md](./qa-fixes.md)) |
| G-2 | app 18/18 · DB `READY (DB) · ESCALATE` (active Sales 1) · rehearsal 계획 작성 ([g2-rehearsal-plan.md](./g2-rehearsal-plan.md)) · CUTOVER NOT APPLIED |
| G-1 | `SAFE TO APPLY` (blocking 0 · WARN 3) → **G-1 PREFLIGHT SAFE · CUTOVER NOT APPLIED** |
| M5 | NOT READY (app 2/7 · DB NOT SAFE) |
| J/K/L | DO NOT START J · NOT READY (G-2 미적용) |

## G-2 Staging rehearsal 전 남은 전제 (사람)

1. 09C 변경 커밋 · Preview 재배포 후 그 커밋으로 preflight 재확인
2. Preview 앱 수준 확인 수단 — 사람이 Vercel 로그인 브라우저로 `/sales` 분기 확인 (또는 alias Deployment Protection Exception)
3. psql + Staging 직접 DB 연결 문자열 (운영자 로컬에만 · `DATABASE_URL` / `SUPABASE_DB_URL` 로 export 금지)
4. ~~적용 후 release gate trigger 확인용 읽기 전용 SQL 추가~~ → **완료 (09C.1)** `sql/g2_post_verify.sql` · Sales 사진 · Growth5 명시 assertion 추가 (G2_post 67/67)
5. rollback 담당 · 시간창 지정 · 적용 승인

## 그대로 OPEN

CO-2 · CO-8 · CO-9 · CO-10 · CO-12 · DB-9 · AR-8 · IB-1~7 · BC-* · BP-* · PH3-2 · P08-OPEN-1 · 2 · 3 · 4 · 5 · 6 · 7 · 9 · 10 · 11 · 12.
제품 규칙(STARTER 8주 · Weekly · 대시보드 없음 · Growth5 · Stage · AI 선택 사항 · Parent 사진 비활성) · 콘텐츠 상태(W1~8 운영 자료 ·
W9~16 SOURCE EXISTS MIXED · W17~24 SOURCE EXISTS DRAFT/PROPOSAL) 변경 없음.
