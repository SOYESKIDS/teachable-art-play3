# PHASE 09A — Responsive · Accessibility Baseline

| | |
|---|---|
| 도구 | `supabase/validation/staging_e2e/ui_audit.mjs` (CDP · 새 의존성 없음) |
| Preview | **BLOCKED_PENDING_LOCAL_SECRETS** (Vercel SSO · `SOYE_STAGING_VERCEL_BYPASS` MISSING) |
| 기준선 | local-rehearsal — HEAD `153a413` 코드 · local Supabase · saas_v2 · 합성 계정 |
| 뷰포트 | desktop 1366×768 · tablet 768×1024 · mobile 390×844 |

## 1. 결과 (local-rehearsal)

| 화면 | 가로 넘침 | 44px 미만 조작 요소 | label 없는 입력 | 이름 없는 버튼 | h1 · heading 건너뜀 | 초기 alert | 콘솔 오류 · 실패 요청 | Tab focus 표시 | lang |
|---|---|---|---|---|---|---|---|---|---|
| /login (3 뷰포트) | 0 | 0 | 0 | 0 | 1 · 0 | 0 | 0 · 0 | 5/5 보임 | ko |
| 교사 /teacher (3) | 0 | 0 | 0 | 0 | 1 · 0 | 0 | 0 · 0 | 6/6 | ko |
| 원장 /director/sessions (3) | 0 | 0 | 0 | 0 | 1 · 0 | 0 | 0 · 0 | 6/6 | ko |
| HQ /admin/organizations | 0 | desktop 13 · tablet 6 · mobile 4 (높이 38~42px 링크 · 버튼 · 입력) | 0 | 0 | 1 · 0 | 0 | 0 · 0 | 6/6 | ko |

## 2. 발견

| ID | 내용 | 등급 | 제안 (제품 코드 미수정) |
|---|---|---|---|
| A11Y-1 | 출결 저장 **성공** 문구("n명의 출결을 저장했습니다.")가 오류와 같은 `role="alert"` 로 렌더된다 (`src/components/staff/AttendanceEditor.tsx:665`). 스크린리더가 성공을 경고로 읽는다 | SEV-3 | `role={state.phase === "error" ? "alert" : "status"}` |
| A11Y-2 | HQ 운영 화면 조작 요소 높이 38~42px (44px 권장 미만) · 모바일에서 16px 높이 링크 1개 | SEV-3 | HQ 는 주로 desktop 사용 · 다음 UI pass 에서 min-h-11 |
| — | 자동 a11y 도구(axe 등) 추가 제안: 대비(contrast) 자동 측정이 이번 정적 점검 범위 밖. 필요 시 devDependency 1개(axe-core)만 · 이번에는 추가하지 않음 | 제안 | — |

대비(contrast) · modal overflow · 긴 한국어 줄바꿈은 이번 자동 점검에서 측정하지 않았다 (가로 넘침 0 은 긴 문구 넘침이 없다는 간접 증거).
