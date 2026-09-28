# PHASE 09A — Role E2E Matrix (PRE-CUTOVER · 기대값은 코드에서 파생)

현재 Staging = 일반 migration 37 적용 · **G-2 · G-1 · M5 미적용** · Preview `SOYE_SAAS_V2_APP_CUTOVER=true` (saas_v2 화면).
PRE 상태의 넓은 권한은 결함이 아니라 **CUTOVER PENDING** 으로 분류한다 (target 검증은 PHASE 09B).

## 1. 역할별 기대

| Role | Current PRE-cutover expected | Target POST-cutover expected |
|---|---|---|
| HQ Admin | `/admin/login` → `/admin/leads` · 기관 목록(페이지네이션) · 상세 · 계약 · Readiness · 상품/기능. 관찰 · 리포트 · 사진 표를 앱이 직접 읽지 않음 (DB 는 PRE-G2 blanket SELECT 가능) · 초대 = service-role 초대 메일 → `hq_add_organization_member` (사유 · audit) | 같은 화면 · DB blanket SELECT 제거 (G-2 §3) · 구성원 직접 DML 거부 · RPC 만 (G-2 §5) |
| HQ Sales | `/admin/login` → `/sales/leads` · `/sales/organizations` (상업 요약 · 아동 이름 없음). **PRE-G2: `requireAdmin` 을 통과해 `/admin/*` 전부 열람 가능 (원아 이름 포함 기관 상세) · 구성원 직접 DML 가능(자기 자신 제외) · 초대 제출 시 초대 메일이 먼저 발송된 뒤 RPC 가 거부 → CUTOVER PENDING** | `/admin/*` → `/sales` redirect · 아동 이름 · 관찰 · Growth5 · 사진 · 리포트 · portal token · 아동별 동의 · 구성원 쓰기 모두 불가 |
| Director (STARTER) | `/login` → `/director/sessions` (director_dashboard 없음) · nav 에 "홈" 없음 · `/director` = "현재 이용 상품에 포함되지 않은 기능입니다." (집계 · 누락 감지 없음) · 일괄 인쇄 UI 없음 · 수업 이력 · 출결 조회/정정 · 관찰 읽기 전용 · 완료 Weekly 조회 · 긴급 숨김(사유) · Portal 발급/중지 · 동의 운영 상태 기록 | 같음 (G-1 후에도 활성 계약 범위 안에서 동일) |
| Teacher | `/login` → `/teacher` "오늘의 수업" (오늘 · 지난 예정 · 진행 중 · 날짜 없음만) → "수업 준비" → BEFORE (필수 2개 확인 전 "수업 시작" 비활성) → DURING (빠른 메모 자동 저장 · 작성자만) → 마치기 → 출결 → Growth5 관찰 (지표 선택 시 함께 · 보고 나서 · 스스로 · 미선택 = 기록 없음) → Weekly 초안 · 편집 · 완료. **AI UI 없음 · AI 불필요** | 같음 · legacy 직접 status 쓰기 경로는 M5 에서 회수 |
| Parent Portal | 계정 없음 · `/share/portal/{id}#{43자 token}` (fragment) · 잘못된 · 중지 · 만료 · 기능 off = 같은 문구 "이 링크로는 기록을 확인할 수 없습니다." · 유효 = "{아이}의 기록" · 이번 주 / 지난 기록 · 사진 없음 · stage 코드 없음 · 결석 · 미작성 사유 구분 없음 · 숨긴 리포트 비노출 | 같음 (CO-9 · CO-10 · DB-9 · CO-12 OPEN) |

## 2. 실행 결과

| Role | Staging (Preview) | local-rehearsal (같은 커밋 코드 · 로컬 Supabase · 합성 계정) |
|---|---|---|
| Teacher | **BLOCKED_PENDING_LOCAL_SECRETS** | 13/13 PASS (로그인 · 오늘 · AI UI 없음 · BEFORE 비활성 → 시작 · 메모 저장 · 메모 삭제 · 마치기 · 출결 · Growth5 창의적 시도/스스로 · Weekly 완료 · 콘솔/네트워크 오류 0) |
| Director | BLOCKED_PENDING_LOCAL_SECRETS | 14/14 PASS (착지 `/director/sessions` · 홈 없음 · not-entitled · 일괄 인쇄 없음 · 이력 · 출결 · 관찰 읽기 전용 · 완료 Weekly · 동의 선택 · Portal 발급 · 오류 0 · 긴급 숨김 · 다시 공개 · 링크 중지) |
| Parent Portal | BLOCKED_PENDING_LOCAL_SECRETS (Preview SSO 뒤) | 5/5 PASS (잘못된 token · 유효 token · 사진 0 · stage 코드 0 · 숨긴 리포트 비노출 · 중지 token) |
| HQ Admin | BLOCKED_PENDING_LOCAL_SECRETS | 6/6 PASS (착지 `/admin/leads` · 기관 목록 · 상세 · Readiness · 상품 · 오류 0) · 초대 제출 안 함 |
| HQ Sales | BLOCKED_PENDING_LOCAL_SECRETS | 2 PASS + 1 **CUTOVER_PENDING** (`/admin/organizations` 열림 — PRE-G2 기대대로) |

local-rehearsal 합계 **40 PASS · 1 CUTOVER_PENDING · 0 FAIL** (최종 실행). DB 전후 비교(`sql/e2e_effects.sql`):
완료 수업 +1 · 출결 +3 · E2E 관찰 1 · Growth5(창의적 시도 · 스스로) 1 · E2E 메모 남음 0 · E2E Weekly 완료 1 · 숨김 0(다시 공개) ·
Portal 활성 0 · 중지 1 · audit +4 (`portal.issued · report.hidden · report.unhidden · portal.revoked`).

pre-commit 안전 검토 후(지정 수업 · 판정 강화) 재실행해도 같은 합계였다 ([harness-safety-review.md](./harness-safety-review.md)). harness 자체 결함(수정함): ① 성공 여부를 문자열로 돌려준 단계가 PASS 로 기록되던 판정 → PASS/FAIL/CUTOVER_PENDING 명확화
② Growth5 지표 label 이 설명을 포함해 정확 일치 클릭이 조용히 빗나감 → 포함 일치 + 클릭 확인 + DB 전후 비교로 발견 · 수정.

## 3. PHASE 09C 재실행 (2026-09-28 · local-rehearsal · 09C QA 수정 포함 빌드)

위 §2 는 PHASE 09A 기록이다 (그대로 둔다). 09C 에서 단계를 추가했다:
auth 4 (첫 화면 alert 없음 · 잘못된 자격 증명 일반 문구 · aria — staff · HQ) · 원장 "누락 자동 탐지 없음(STARTER)" 1 ·
Parent 숨김 상태에서 숨김 · 결석 · 미작성 사유 비노출 확인 (기존 단계 강화) · 출결 성공 문구 `role=status` 확인 (기존 단계 강화).

| Role | Staging (Preview) | local-rehearsal |
|---|---|---|
| auth | BLOCKED (Preview SSO · 실패 로그인은 local 전용) | 4/4 PASS |
| Teacher | BLOCKED_BY_VERCEL_DEPLOYMENT_PROTECTION · 비밀번호 MISSING | 13/13 PASS (AI key 없음 = provider 호출 없이 완료) |
| Director | 〃 | 15/15 PASS |
| Parent Portal | 〃 | 5/5 PASS |
| HQ Admin | 〃 | 6/6 PASS (초대 제출 안 함) |
| HQ Sales | 〃 | 2 PASS + 1 **CUTOVER_PENDING** |

합계 **45 PASS · 1 CUTOVER_PENDING · 0 FAIL** · 임시 browser profile 삭제. DB 전후(`e2e_effects.sql`): 전 `2|2|6|0|0|0|0|0|0|0|0` → 후 `3|2|9|1|1|0|1|0|0|1|4`
(완료 +1 · 출결 +3 · E2E 관찰 1 · Growth5 1 · 메모 남음 0 · Weekly 완료 1 · 숨김 0 · portal 활성 0 · 중지 1 · audit +4) — 09A 와 같다.
