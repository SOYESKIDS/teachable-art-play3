# PHASE 09C — QA 수정 (A11Y-1 · A11Y-2 · PERF-1 · 로그인)

모두 local 에서 검증했다 (browser = `e2e_roles.mjs` · `ui_audit.mjs` local-rehearsal · 정적 = `supabase/validation/phase09c/qa_fixes.test.mjs`).
Staging · Production 에는 아직 배포되지 않았다 (미커밋).

## 1. A11Y-1 — 출결 성공 문구 `role="alert"` → FIXED

| | |
|---|---|
| 파일 | `src/components/staff/AttendanceEditor.tsx` |
| 전 | 성공 · 오류 모두 `role="alert"` |
| 후 | 오류 = `role="alert"` · `aria-live="assertive"` / 성공 = `role="status"` · `aria-live="polite"` (다른 staff 화면과 같은 방식) |
| 검증 | e2e teacher `attendance` 단계가 성공 문구가 `role=status` · `aria-live=polite` 안에 있는지 확인 (PASS) · 정적 test |
| 오류 공지 약화 | 없음 (오류는 여전히 alert) |

## 2. A11Y-2 — HQ Admin · Sales 조작 요소 38~42px → FIXED (예외 3종 문서화)

| 대상 | 전 | 후 |
|---|---|---|
| HQ 가로 메뉴 (`AdminNav` · 데스크톱) | 38px (`py-2`) | `min-h-11` (44px) · 모양 유지 |
| Lead · 기관 필터 (select · 검색 · 검색 버튼) — Sales `/sales/leads` 도 같은 컴포넌트 | 40px (`h-10`) | `h-11` |
| 필터 초기화 · 표 안 글자 버튼(수정 · 관리 등) · 대화상자 열기 링크 | 22px 높이 · 두 글자 22px 폭 | `inline-flex min-h-11 min-w-11` (글자 크기 · 색 유지) |
| 대화상자 기본 · 보조 버튼 | 42px (`py-2.5`) | `min-h-11` |
| onboarding 입력 | 42px | `min-h-11` |

측정 (local · 로그인 후 HQ Admin 8 화면 + Sales 3 화면 × desktop · mobile · 44px 미만 요소 수):

| | 전 | 후 |
|---|---|---|
| 합계 | **130** | **14** |
| 남은 14 | — | skip link(화면에 없는 1×1 · focus 시 표시) 6 · 표 셀 안 전화 · 이메일 링크 6 (행 전체 클릭 가능 · WCAG 2.5.8 inline 예외) · 카드 전체 클릭 링크 2 (`after:inset-0` · 실제 목표 = 카드) |

표 행 높이는 필요한 만큼만 늘었다 (행 안 글자 버튼 44px). 재설계 없음. `DirectorDashboard`(STANDARD 이상 · STARTER 미노출)는 HQ 범위 밖이라 그대로 — DEFERRED.

## 3. PERF-1 — 목록 상한 분류

| 목록 | 현재 | 분류 | 조치 |
|---|---|---|---|
| 원장 학부모 공유 · 동의 (`fetchDirectorPortalRows`) | 원아 500 상한 · **상한에 닿아도 표시 없음** · 반 · portal · 동의 조회 무상한 (PostgREST 기본 max_rows 1000) | **P0 FIX NOW (저위험)** | 501 개를 읽어 500 초과면 `truncated` · 화면에 "앞의 500명만 표시 · 더 있음" 안내 (`role=status`). 반 · portal · 동의 조회는 org 범위 그대로 — 원아 1000 명 이상 기관에서만 잘릴 수 있음 → P2 |
| 반 목록 (교사 · 원장 · HQ) | 2000 `.limit` | P1 PILOT ACCEPTABLE | 반은 기관당 수십 개 규모 |
| Sales 기관 요약 (`hq_sales_organization_summary` RPC) | 전 기관 1회 반환 · SQL 상한 없음 | P2 SCALE LATER | 본사 기관 수 규모에서 문제 없음 · 고치려면 migration 필요 (이번 범위 밖) |
| 수업 이력 (교사 · 원장) | `.limit(2000)` · 최신순 | P1 PILOT ACCEPTABLE | **주의**: PostgREST max_rows(기본 1000)가 2000 보다 먼저 적용된다 — 1000 건 넘는 기관은 조용히 잘린다. Pilot(반당 24주) 규모에서는 도달 불가. 규모 확대 전 limit ≤ max_rows + "더 있음" 표시 필요 → DEFERRED |
| HQ 관리 대시보드 · Readiness | `MAX_ADMIN_*` 상한 + truncated 처리 있음 | 해당 없음 | — |

## 4. 로그인 / 인증 회귀

| 확인 | 결과 |
|---|---|
| `/login` · `/admin/login` 첫 화면에 오류 alert 없음 | PASS (e2e auth) |
| 잘못된 자격 증명 → 일반 문구 하나 (`이메일 또는 비밀번호를 확인해주세요.`) · 없는 이메일과 틀린 비밀번호가 **같은 문구** | PASS (e2e auth · 정적 test) |
| staff 로그인 `aria-invalid` · `aria-describedby` → 오류 문구 | PASS (기존) |
| **HQ `/admin/login` 에 `aria-invalid` · `aria-describedby` 없음** | **FIXED** (`src/app/admin/login/LoginForm.tsx` · staff 로그인과 같은 방식) |
| 권한 없는 계정 문구 (`접근 권한이 없는 계정입니다.` · `관리자 권한이 없는 계정입니다.`) | 비밀번호가 맞은 뒤에만 보인다 — 계정 존재 추측에는 비밀번호가 필요하므로 그대로 둠 (정보) |
| Staging 에서 실패 로그인 시도 | 하지 않는다 (Auth 감사 기록 · rate limit) — e2e 는 local-rehearsal 에서만 실행 · staging = SKIP |
