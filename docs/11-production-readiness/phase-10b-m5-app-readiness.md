# PHASE 10B — Legacy-free Teacher / Director Build (M5 App Readiness)

| | |
|---|---|
| 브랜치 | `phase-10b-m5-app-readiness` (source `saas-v2` @ `80537ae`) · **saas-v2 에 병합하지 않음 (승인 전)** |
| 목적 | M5 적용 전 앱 조건 — legacy 쓰기 경로 제거 · SaaS 2.0 단일 경로 · legacy 읽기 호환 유지 |
| 결과 | `M5_app_preflight` **2/7 → 7/7 PASS** (gate 변경 없음) · `JKL_start_gate` 앱 조건 **READY** |
| 하지 않은 것 | M5 · G-1 · J/K/L 적용 없음 · migration 변경 없음 · 원격 DB · Staging · Production 변경 없음 · 직원 UAT(`saas-v2`) 변경 없음 · 새 기능 플래그 없음 |

## 1. 삭제한 파일 (14)

| 파일 | 이유 |
|---|---|
| `src/lib/rollout/staff-app-routing.ts` | legacy / saas_v2 라우팅 스위치 — 교사 · 원장은 SaaS 2.0 단일 경로 |
| `src/lib/staff/legacy-session-actions.ts` · `src/components/staff/LegacySessionActions.tsx` | `class_sessions.status` 직접 UPDATE (M5 회수) |
| `src/app/teacher/growth-reports/LegacyTeacherGrowthReportsPage.tsx` · `src/components/staff/GrowthReportCreateForm.tsx` | legacy 성장 리포트 생성 (`create_or_refresh_child_growth_report`) |
| `src/components/staff/GrowthReportEditor.tsx` · `src/lib/staff/growth-report-actions.ts` | legacy 리포트 저장 (`save_child_growth_report_atomic`) |
| `src/components/staff/GrowthReportAiDraftSection.tsx` · `src/lib/staff/growth-report-ai-actions.ts` | legacy 리포트 AI 초안 (`save_child_growth_report_ai_draft` · `apply_child_growth_report_ai_draft`) |
| `src/app/teacher/sessions/[sessionId]/observations/LegacyTeacherObservationPage.tsx` · `src/components/staff/ObservationChildForm.tsx` · `src/lib/staff/observation-actions.ts` | legacy 관찰 저장 (`save_class_session_observation_atomic`) |
| `src/components/staff/ObservationAiDraftSection.tsx` · `src/lib/staff/observation-ai-actions.ts` | legacy 관찰 AI (`save_observation_ai_generated_atomic` · `save_observation_ai_review_atomic`) |

## 2. 바꾼 파일

| 파일 | 변경 |
|---|---|
| `src/app/login/actions.ts` | 원장 착지 = `/director/sessions` (대시보드 기능이 있는 단일 기관만 `/director`) · 스위치 제거 |
| `src/app/director/nav.ts` | legacy 메뉴 제거 · 기능 권한 기반 메뉴만 |
| `src/app/director/page.tsx` | 대시보드는 항상 `director_dashboard` 권한으로 판정 (STARTER = not entitled) |
| `src/app/director/sessions/page.tsx` · `src/app/teacher/page.tsx` · `TodaySessionBoard.tsx` · `SessionCard.tsx` | `appRouting` 제거 · 수업 상태 변경은 SaaS 2.0 `SessionActions`(전환 RPC)만 |
| `src/app/teacher/growth-reports/page.tsx` · `teacher/sessions/[sessionId]/observations/page.tsx` | legacy 분기 제거 (Weekly 대기열 · Observation 2.0 만) |
| `src/app/teacher/growth-reports/[reportId]/page.tsx` | 이전 형식 리포트 **읽기 전용** (편집기 · AI 초안 제거 · 안내 문구) |
| `src/app/director/growth-reports/[reportId]/page.tsx` | 공용 읽기 전용 본문 컴포넌트 사용 |
| `src/components/staff/GrowthReportReadOnlyContent.tsx` (신규) | 이전 형식 리포트 본문 읽기 전용 (교사 · 원장 공용) |
| `src/components/staff/GrowthReportShareSection.tsx` · `src/lib/staff/growth-report-share-actions.ts` | 새 공유 링크 발급 제거 · 기존 링크 상태 표시 · **중지만** 유지 |
| `src/components/staff/ObservationBoard.tsx` · `director/sessions/[sessionId]/observations/page.tsx` | 원장 전용 읽기 전용 보드 (입력 form · AI 영역 · 업로드 없음 · 사진은 보기만) |
| `src/lib/supabase/admin.ts` · `src/lib/admin/director-invite.ts` · `src/lib/ai/observation-draft-provider.ts` · `src/lib/ai/growth-report-draft-provider.ts` | `import "server-only"` |
| `supabase/validation/phase08/app_gates.test.mjs` | PHASE 10B 상태로 갱신 (§5) |
| `supabase/validation/staging_e2e/e2e_roles.mjs` | legacy 읽기 호환 E2E 2 단계 추가 (local-rehearsal 전용) |

## 3. legacy 쓰기 제거 · 읽기 유지

**제거 (앱)**: 수업 상태 직접 UPDATE · legacy 관찰 저장 · legacy 관찰 AI 생성/검토 · legacy 성장 리포트 생성 · 저장 · AI 초안 · 적용 · legacy 공유 새 링크 발급 — M5 가 회수하는 RPC 8종 소비자 0.
대체 경로를 새로 만들지 않았다 (직접 표 쓰기 · service role · RLS 우회 없음). SaaS 2.0 대응 기능이 이미 있다: 수업 전환 RPC · Observation 2.0 · Weekly 리포트 · 아동별 portal.

**유지 (M5 runbook "legacy 조회 · 공유 읽기 유지" · DEC-041)**
- 이전 형식 성장 리포트 **목록 · 상세 조회** (교사 · 원장 · 읽기 전용)
- 학부모 legacy 공유 링크 **열람** (`/share/growth-report/*` · `read_shared_growth_report` — 코드 변경 없음)
- 원장의 기존 legacy 공유 링크 **중지** (`revoke_child_growth_report_share` — M5 가 유지하는 경로)
- 원장 관찰 기록 조회 · 사진 보기
- 출결 RPC (`save_class_session_attendance_atomic` — SaaS 2.0 Class Mode 가 함께 쓴다)

**행동 변화 (M5 설계와 같음)**: 교사는 작성 중이던 이전 형식 리포트를 더 이상 완료할 수 없다 (M5_preflight WARN 3 과 같은 결과) · 교사 관찰 작성은 Observation 2.0 만 (계약 반 기능 필요 — J 전 계약 mapping 이 전제 · runbook §2-1).

## 4. server-only 경계

- 추가: 비밀 키를 쓰거나 privileged client 를 만드는 모듈 4개 (`admin.ts` · `director-invite.ts` · AI provider 2)
- 추가하지 않음: `src/lib/ai/ai-assist-gate.ts` — 비밀 없음 · Node 테스트(`phase08/app_gates.test.mjs`)가 직접 import (Node 에서 `server-only` 는 해석되지 않음)
- Next.js 가 `server-only` 를 내부 처리 (`node_modules/next/dist/docs/.../05-server-and-client-components.md` · 설치 선택) → 새 npm 의존성 없음 · `npm run build` 로 client 번들 유입 없음 확인
- AI provider 모듈은 남아 있지만 **어떤 앱 코드도 호출하지 않는다** (AR-8 OPEN · AI 기능 확장 없음 · AI 준비 완료 주장 없음)

## 5. 검증

| 항목 | 결과 |
|---|---|
| `M5_app_preflight` | **before 2/7 → after 7/7 PASS** |
| `JKL_start_gate` (앱) | **READY** (exit 0) — DB 조건은 별도 (G-1 · M5 미적용 · J/K/L 미시작 그대로) |
| local role E2E (local-rehearsal · 지정 합성 수업) | **47 PASS · 1 CUTOVER_PENDING · 0 FAIL** — auth 4 · teacher 13 · director 15 · parent 5 · **legacyTeacher 1 · legacyDirector 1 (legacy 리포트 읽기 전용 · 쓰기 UI 없음)** · hqAdmin 6 · hqSales 2 + 1 (local DB 는 G-2 전 · 기대) |
| DB 전후 (`e2e_effects.sql`) | `2\|2\|6\|0\|0\|0\|0\|0\|0\|0\|0` → `3\|2\|9\|1\|1\|0\|1\|0\|0\|1\|4` (PHASE 09C 와 동일 · legacy 읽기 단계는 쓰기 없음) |
| UI audit (local) | 12 화면 · 가로 넘침 0 · label 누락 0 · 콘솔/네트워크 오류 0 |
| pgTAP 기본 | 3 files · 232 PASS |
| post-cutover (local · transaction rollback) | G-2 67/67 · G-1 70/70 · G-1 rehearsal 24/24 · **M5 46/46** (legacy 공유 읽기 · 조회 유지 포함) |
| PHASE 08 app gates | 11/11 (A1 → "앱 코드가 AI provider 를 호출하지 않음" · A2 → "legacy 수업 Action · 스위치 제거 · status 직접 UPDATE 0" · JKL 현재 브랜치 → READY) |
| harness safety · QA fixes | 48/48 · 5/5 |
| lint · tsc · build | 통과 · 통과 · 통과 |

## 6. 남은 blocker · 검토 필요

1. **병합 승인 전** — 이 브랜치는 `saas-v2`(직원 UAT)에 합치지 않았다.
2. **J/K/L · G-1 · M5 는 여전히 미적용** (DB 조건 · Staging G-1 은 P09F-AUTH-1).
3. ~~`G2_app_preflight.mjs` 는 이 브랜치에서 실행 불가 (ENOENT)~~ → **PHASE 10B.1 에서 해결 (승인된 수명 주기 보강 · gate 약화 없음)**:
   - 이 브랜치(J-ready): **예외 없이 FAIL 17/18** — 실패 항목은 PRE-G2 전용 조건 "staff app routing switch …" 하나 (`pre-G2 routing switch absent; this source appears to be a post-G2 / J-ready build`) + `LIFECYCLE:` 안내
   - 알려진 PRE-G2 소스(`saas-v2` @ `80537ae` · 임시 worktree · `--root`): **18/18 PASS** · 원래 스크립트와 항목별 결과 **동일**
   - 강화된 부분: AI provider 판정 순서를 legacy Action 파일 2개뿐 아니라 **src 전체 provider 호출**에 적용 · 원장 관찰 보드 파일이 없으면 FAIL
   - 문서화: `docs/07-implementation/cutover-runbook.md` §3 "G-2 app preflight 의 수명 주기" — PRE-G2 빌드 전용 · G-2 ACTIVE 뒤 J 용 앱 gate 는 M5_app_preflight · JKL_start_gate · role E2E · **FAIL 을 G-2 재적용 근거로 쓰지 않는다** · Production 순서 불변
   - 테스트: `supabase/validation/phase08/app_gates.test.mjs` +2 (lifecycle FAIL · 새 ungated provider 호출 적발) → 13/13
4. 교사 legacy 작성 중 리포트 · legacy 기관 교사 관찰 작성 — J 전 계약 mapping · 사람 공지 필요 (runbook §2-1 · M5_preflight WARN)
5. PHASE 10A 의 나머지: CO-12 · class_mode / weekly_report 출시 · CO-2 · BC-3 · P09D-C2 · 출시 플래그 audited RPC · `suspended→active` 재확인 · IB-5

**G-1 · M5 · J/K/L · CO-12 · AR-8 완료 아님 · Production Ready 아님.**
