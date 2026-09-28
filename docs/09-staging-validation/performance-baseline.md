# PHASE 09A — Performance Baseline (정밀 부하 테스트 아님)

## 1. Preview (edge)

| 경로 | 결과 |
|---|---|
| /login · /admin/login · /teacher · /director · /admin · /sales · /share/portal | SSO 302 · TTFB 9~107 ms (edge 응답 · 앱 SSR 아님) |
| 앱 SSR 시간 · payload | **BLOCKED_PENDING_LOCAL_SECRETS** |
| 배치 | Vercel functions bom1 · Staging DB ap-south-1 (같은 지역) · 사용자(한국) → edge icn1 → 함수 bom1 왕복 지연은 E2E 실행 시 측정 |

## 2. local-rehearsal (같은 코드 · 로컬 DB · 절대값은 운영 지표 아님)

| 화면 | 로드(ms · idle 대기 포함) | 요청 수 (첫 뷰포트 · 이후) | DOM 노드 |
|---|---|---|---|
| /login | ~780–830 | 39 · 14 | 73 |
| /teacher | ~800–815 | 70 · 35 | 121 |
| /director/sessions | ~803 | 66 · 31 | 120 |
| /admin/organizations | ~795–813 | 56 · 29 | 160 |

## 3. 코드 기준 무제한 · 대형 목록 (N+1 · 큰 payload 후보 · 현재 합성 데이터 규모에서는 영향 없음)

| 위치 | 내용 | 등급 |
|---|---|---|
| `src/lib/staff/director-report-queries.ts:74 · 137 · 139 · 143` | 기관의 portal · 반 · 동의 전체 조회 (limit 없음) | SEV-3 |
| `src/app/admin/(dashboard)/products/page.tsx:42 · 44 · 49` | 상품 · 버전 · capability 전체 (작은 표) | 정보 |
| `src/lib/admin/contract-queries.ts:61` | 기관의 반 전체 | 정보 |
| `src/app/admin/(dashboard)/curriculum/[id]/lessons/[lessonId]/page.tsx:83` | 차시 섹션 전체 (최대 17) | 정보 |
| `hq_sales_organization_summary` → `src/app/sales/organizations/page.tsx:78` | 모든 기관 · 전부 렌더 (페이지네이션 없음) | SEV-3 (기관 수 증가 시) |
| 수업 이력 · 오늘 보드 (`class-session-queries.ts:47`) | 2000 cap · 페이지네이션 없음 | SEV-3 |
| Portal 원아 500 · `read_child_portal` 지난 기록 200 | cap | 정보 |
