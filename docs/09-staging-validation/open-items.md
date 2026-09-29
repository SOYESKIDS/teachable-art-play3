# PHASE 09A — Open Items · 결함 · 09B 전제

## 1. 결함

| ID | 등급 | 내용 | 조치 |
|---|---|---|---|
| — | SEV-0 · SEV-1 | 없음 | — |
| — | SEV-2 | 없음 | — |
| P09-D1 | SEV-3 · CUTOVER PENDING | PRE-G2 에서 HQ Sales 가 `/admin` 을 열 수 있고 원장 · 교사 초대를 제출하면 service-role `inviteUserByEmail` 이 **먼저** 실행된다 (Auth 사용자 생성 · 초대 메일) — 이후 `hq_add_organization_member` 가 거부. Staging 에 active Sales 1 | G-2 가 `requireAdmin` 에서 Sales 를 막아 닫는다 (G2_db_preflight ESCALATE). 추가 제안: 초대 Action 이 Auth 호출 전에 `current_hq_role() = 'admin'` 을 확인 (제품 코드 · 미수정) |
| A11Y-1 | SEV-3 | 출결 성공 문구가 `role="alert"` (`AttendanceEditor.tsx:665`) | **FIXED (PHASE 09C · 미커밋)** — 성공 `status`/polite · 오류 `alert` ([qa-fixes.md](./qa-fixes.md) §1) |
| A11Y-2 | SEV-3 | HQ 운영 화면 조작 요소 38~42px | **FIXED (PHASE 09C · 미커밋)** — 44px 미만 130 → 14 (남은 14 = 문서화된 예외) · `DirectorDashboard` 는 DEFERRED ([qa-fixes.md](./qa-fixes.md) §2) |
| PERF-1 | SEV-3 | 원장 portal · 동의 · 반 조회 · Sales 기관 요약 · 이력 2000 cap 에 페이지네이션 없음 | **부분 FIXED (09C)** — 원장 portal/동의 = 상한 + "더 있음" 안내 (P0) · 반 · 이력 = P1 PILOT ACCEPTABLE · Sales 요약 = P2 · 이력 2000 은 PostgREST max_rows 1000 보다 커서 조용히 잘릴 수 있음 = DEFERRED ([qa-fixes.md](./qa-fixes.md) §3) |
| P09C-A1 | SEV-3 | HQ `/admin/login` 필드에 `aria-invalid` · `aria-describedby` 없음 (staff 로그인은 있음) | **FIXED (PHASE 09C · 미커밋)** |
| P09C-V1 | 정보 · 운영 | `npx vercel curl` 은 bypass 비밀이 없으면 **프로젝트에 "Protection Bypass for Automation" 비밀을 새로 만든다** (CLI 56.2.1 소스 `getOrCreateDeploymentProtectionToken` · `PATCH /v1/projects/{id}/protection-bypass`). 2026-09-28 Staging 프로젝트 bypass 항목 0 → 09C 는 `vercel curl` 을 **실행하지 않았다** (bypass 재생성 금지) | Preview 앱 수준 확인은 ① 사람이 Vercel 로그인 브라우저로 · 또는 ② alias Deployment Protection Exception (09B 결정) 중 하나로 |
| P09D-R1 | 운영 · 정보 | G-2 runner 가 두 번 실행되어 2차 실행이 공용 로그를 새로 쓰면서 1차 실행의 적용 줄이 지워졌다 (2차는 PRE 게이트에서 올바르게 거부 · 이중 적용 없음 · audit 1건) | 다음 cutover runner(G-1 · M5): 실행별 로그 파일 · 동시 실행 lock · 결과 요약을 먼저 출력 |
| P09D-S1 | 해소 (Staging) | PHASE 09A HQ Sales `CUTOVER_PENDING`(PRE-G2 에서 `/admin` 열람) | Staging 에서 G-2 로 닫힘 (POST-G2 Preview PASS) · Production 은 G-2 전이므로 여전히 CUTOVER PENDING |
| P09C-L2 | local 전용 | local storage 1.68.10 이 `03_media` 업로드 4장 모두 500 (`42P10` ON CONFLICT 인덱스 없음 · local 도구 버전 불일치) | 영향 없음 (e2e 는 사진 없이 · Parent 사진 비노출 확인) |
| H-1 | 정보 | CSP 없음 (next.config.ts 에 의도적 제외로 기록) | 기존 결정 유지 |
| P09-L1 | local 전용 | browser_smoke `03_media.mjs` 가상 사진 4번째 업로드 500 (로컬 storage) | 영향 없음 (3장으로 흐름 검증) |

harness 결함 2건은 발견 · 수정 (role-e2e-matrix.md §2). pre-commit 안전 검토에서 harness 안전 결함 12건을 추가로 수정 ([harness-safety-review.md](./harness-safety-review.md)).

## 2. BLOCKED (사람이 준비할 것 · 값 공유 금지)

| 필요 | 이유 |
|---|---|
| saas-v2 Preview alias 의 Vercel Deployment Protection Exception | PHASE 09B 결정 — bypass 비밀 대신 alias 하나만 보호 예외 (Production 은 그대로) · 검증 후 제거 ([phase-09-plan.md §1-1](./phase-09-plan.md)). 없으면 `BLOCKED_BY_VERCEL_DEPLOYMENT_PROTECTION` |
| `SOYE_STAGING_{HQ_ADMIN,HQ_SALES,DIRECTOR,TEACHER}_PASSWORD` | 역할별 로그인 (로컬 env · 없으면 `BLOCKED_PENDING_LOCAL_PASSWORDS`) |
| `SOYE_STAGING_E2E_SESSION_ID` | 쓰기 E2E 가 소비할 합성 수업 (자동 선택 없음 · 쓰기 실행 때만) |

준비 후 실행 순서: `preview_probe.mjs` → `ui_audit.mjs --target staging` → `remote_readonly_query.mjs sql/e2e_effects.sql` (전) →
`e2e_roles.mjs --target staging` (읽기) → 승인 시 `SOYE_STAGING_E2E_SESSION_ID`(사람이 지정한 오늘 예정 합성 수업 1건) + `--allow-staging-writes` (합성 범위 확인 통과 시에만 · 그 수업 1건 소모) → `e2e_effects.sql` (후).

## 3. PHASE 09B 전제 (사람 결정)

1. Staging 인증 E2E(위 BLOCKED) 를 09B 전에 실행할지, 09B 의 PRE 단계로 넣을지
2. active HQ Sales 1 (ESCALATE) — G-2 rehearsal 을 가장 먼저
3. J/K/L rehearsal 에 필요한 "legacy 화면 계열을 뺀 빌드" 를 어떻게 만들지 (현재 브랜치 M5 앱 preflight FAIL)
4. Staging 오늘 예정 수업 추가 필요 여부 (쓰기 E2E 1회 · rehearsal 전후 비교용) — 합성 seed 추가는 별도 승인

## 4. 그대로 OPEN (이번에 판단하지 않음)

CO-2 · CO-8 · CO-9 · CO-10 · CO-12 · DB-9 · AR-8 · IB-1~7 · BC-* · BP-* · PH3-2 ·
P08-OPEN-1 · 2 · 3 · 4 · 5 · 6 · 7 · 9 · 10 · 11 · 12. 콘텐츠: W1~8 운영 자료 · W9~16 SOURCE EXISTS(MIXED) · W17~24 SOURCE EXISTS(DRAFT/PROPOSAL).
