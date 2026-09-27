# Current Frontend Audit (READ-ONLY)

| | |
|---|---|
| 문서 상태 | PHASE 06 승인본 (문서 검토 대기) |
| 감사 기준 | `saas-v2` / `dc5ba3d` · `src/**` 정적 읽기 |
| 감사 방식 | **소스 읽기만.** 앱 실행 · 브라우저 렌더링 · 실제 대비 측정은 하지 않았다 |
| 상위 문서 | [architecture-overview.md](./architecture-overview.md) |

> 이 문서는 **CURRENT 사실**과 **TARGET**을 구분한다. 여기 적힌 격차는 이번 PHASE에서 고치지 않았으며 모두 **CURRENT GAP → PHASE 07**이다.

---

## 1. Stack (CURRENT)

| 항목 | 사실 |
|---|---|
| Framework | Next 16.3.0 · React 19.2.8 |
| CSS | Tailwind v4 (`@tailwindcss/postcss`) · 설정 파일 없음 · `src/app/globals.css`의 `@theme inline` |
| UI · 아이콘 라이브러리 | 없음 · 아이콘은 inline SVG |
| Font | Pretendard Variable (`next/font/local`, `src/app/layout.tsx`) · `font-serif italic` 9곳은 serif 폰트를 불러오지 않아 시스템 기본체로 표시 |
| 전역 상태 파일 | `not-found.tsx`만 있음 · `loading.tsx` · `error.tsx` 없음 |
| 인증 게이트 | `src/proxy.ts` → `/admin` · `/director` · `/teacher` · `<html lang="ko">` |

---

## 2. Route Inventory (CURRENT → TARGET)

| Route | 대상 | 현재 용도 · 상태 | Target | 처리 | 위험 |
|---|---|---|---|---|---|
| `/` | Public | 판매 랜딩 19섹션 · 주 CTA "20분 데모 신청" | 마케팅 | Adapt | 비교표 문구 drift (X-1 · X-2 · X-4 · X-7) |
| `/programs/[slug]` | Public | 상품 상세 3종 | 마케팅 | Adapt | PILOT이 Tier처럼 보이지 않게 유지 |
| `/kindergarten` · `/login` | 원장 · 교사 | 기관 로그인 · director → `/director` | Keep | Adapt | STARTER 원장 착지 `/director/sessions` 필요 |
| `/admin/login` | HQ | admin · sales 구분 없음 | Keep | Adapt | Sales Shell 분기 필요 |
| `/auth/*` | 공통 | 인증 · 비밀번호 | Keep | Keep | — |
| `/privacy` · `/terms` | Public | 법적 문서 | Keep | Keep | L-1 · L-2 (CO-10 · CO-12) |
| `/teacher` | 교사 | 오늘의 수업 · 카드에서 시작/완료/취소 | 오늘의 수업 | Replace (동작) | 🔴 scheduled → completed |
| `/teacher/history` | 교사 | 수업 이력 (읽기 전용) | Keep | Keep | — |
| `/teacher/sessions/[id]/attendance` | 교사 | 출결 · 수동 일괄 저장 | AFTER ① | Adapt | — |
| `/teacher/sessions/[id]/observations` | 교사 | 구 5영역 체크 · AI 기록정리 | AFTER ② | Replace | 🔴 Growth5 · Stage 없음 |
| `/teacher/growth-reports(/[id])` | 교사 | 기간형 legacy · AI 검토 완료 관찰만 근거 | Weekly 대기열 · composer + legacy 표시 | Replace | 🔴 AI 의존 |
| `/director` | 원장 | 대시보드 · 상품 무관 노출 | `director_dashboard` 권한 | Adapt | STARTER 노출 위험 |
| `/director/sessions(/history)` | 원장 | 교사와 같은 SessionActions | 조회 · 출결 · 취소 · 복구 처리 | Replace (동작) | 🔴 원장 일반 시작/완료 |
| `/director/sessions/[id]/attendance` | 원장 | 출결 정정 | Keep | Keep | — |
| `/director/sessions/[id]/observations` | 원장 | 관찰 조회 · 교사 확정 AI 정리 문장 표시 | 조회 | Adapt | 🔴 원장 AI 초안 노출 (DEC-093) |
| `/director/growth-reports(/[id])` | 원장 | 완료 리포트 · 공유 (중지 확인 없음) | 리포트 · 숨김 · 인쇄 | Adapt | 숨김 없음 |
| `/share/growth-report/[shareId]` | 학부모 | legacy 공유 · 실패 문구가 원인 나열 | legacy 유지 (DEC-041) | Keep + 문구 조정 | DEC-044 |
| `/api/share/growth-report/resolve` | API | 토큰 확인 · 항상 200 | Keep | Keep | — |
| `/admin` | HQ | 운영 대시보드 | HQ 홈 | Adapt | Sales 동일 노출 |
| `/admin/readiness` | HQ | 기관 설정 점검표 | 상품 기준 Readiness | Adapt | 콘텐츠 · 상품 준비 미확인 |
| `/admin/onboarding` | HQ | 7단계 마법사 | + Contract step | Adapt | — |
| `/admin/organizations(/[id])` | HQ | 기관 · 반 · 원아 · 교사 · 배정 · CRUD 모달 | + 계약 · 이용권 section | Adapt | Sales 원아 명단 노출 |
| `.../program-assignments/[aid]` | HQ | 선택 목록으로 시작/완료/취소 | 일정 + 복구 처리 | Replace (동작) | 🔴 HQ 일반 상태 변경 |
| `/admin/curriculum/**` | HQ | 프로그램 CRUD 모달 | + 15섹션 | Adapt | — |
| `/admin/leads` | admin · sales | 문의 관리 | Keep | Keep | — |
| before · during · portal · director portal · Contract/Product 화면 | — | **NOT IMPLEMENTED** | TC-02 · TC-03 · PT-01 · DR-08 · HQ 계약 | New | — |

**NOT IMPLEMENTED (CURRENT):** Class Mode (마케팅 문구에만 존재) · 빠른 메모 · Growth5 · Weekly · Child Portal · Contract/Product UI · Entitlement 상태 · 계약 기반 읽기 전용 banner · Sales UI · Parent 계정 · 알림 · 토스트 · 전체 검색 · 다국어.

---

## 3. Component Inventory (CURRENT)

| Component | 현재 모양 | 재사용 | 접근성 gap | 모바일 gap |
|---|---|---|---|---|
| `Button` / `ButtonLink` (`components/ui`) | pill · yellow / navy | 마케팅만 | 로딩 상태 없음 | — |
| 앱 버튼 (35곳 직접 작성) | `rounded-lg` · navy · 13px | ❌ | 크기 불일치 | touch target 작음 |
| `Card` | 마케팅 | 부분 | div onClick · 키보드 없음 | — |
| `surface.tsx` (PageHeader · SectionCard · MetricCard · StatusPill · EmptyState · ErrorState) | 앱 콘솔용 | 4개 파일만 사용 | ErrorState `role="alert"` 없음 | — |
| `field.ts` 입력 클래스 | `h-11 rounded-lg` | 19개 파일 | **`focus:outline-none`** | — |
| `LeadForm` | Tailwind 기본 빨강 | 단일 | `aria-invalid` · `aria-describedby` 없음 | — |
| Modal 18개 | 직접 만든 `role="dialog"` | ❌ | **16개 focus trap · 초점 복귀 · 스크롤 잠금 없음** | 긴 CRUD 폼이 모달 안 |
| Table 15개 | 13px | 부분 | caption 없음 · `scope` 4곳 | 모바일 카드 전환 패턴 있음 ✅ |
| Tabs | 1곳 | — | tabpanel · 방향키 없음 | — |
| `StaffShell` | 1100px · 밑줄 탭 | 원장 · 교사 | `aria-current` ✅ | 가로 스크롤 탭 |
| `AdminNav` | 가로 / 3열 | HQ | `aria-label` ✅ | — |
| `AttendanceEditor` | 아동별 group · 하단 고정 저장 | ✅ | 양호 | ✅ |
| `SessionCard` / `SessionActions` | 상태 badge · 확인 모달 | ✅ | 모달 focus trap 없음 | — |
| `ParentGrowthReportView` | 스켈레톤 · 인쇄 CSS | legacy | 양호 | 양호 |
| 상태 badge 매핑 8벌 (`src/lib/admin/*`) | 중복 | ❌ | 글자 병기 ✅ | — |
| Toast · 공통 Modal · Table · Select | **없음** | — | — | — |

---

## 4. Design Language (CURRENT)

| 항목 | CURRENT | TARGET 판단 |
|---|---|---|
| 기본 색 | navy #152e4f · yellow #f3ba18 · trust-blue #2d70c7 · ivory #fbf8f1 | Target palette로 전환 · Yellow 제외 (DEC-109) |
| Target brand hex 8개 | src에 **0건** | PHASE 07 도입 |
| 테두리 | `border-navy/10` 등 불투명도 7종 (line token 사용은 57회) | 토큰 2단계 |
| 보조 글자 | `text-navy/45 ~ /60` 560회 이상 · 11~13px | `text-muted` 토큰 |
| 글자 크기 | `text-[13px]` 312 · `[12px]` 290 · `[11px]` 103 · type scale 거의 미사용 | 역할별 type scale |
| 모서리 · 그림자 | rounded-lg/xl/full 혼재 · 그림자 변수 4종 | 8/12/16/full · overlay만 그림자 |
| Container | 1280 (마케팅) · 앱은 1100/1440 hard-code · `--container-app` 미사용 | 템플릿별 폭 |
| AI 느낌 styling | 보라 · 네온 · sparkle **없음** · `backdrop-blur` 6곳 | 유지 금지 · blur 최소화 |
| 움직임 | 애니메이션 없음 · `prefers-reduced-motion` 전역 대응 ✅ | 유지 |
| 두 디자인 언어 | 마케팅(pill yellow) vs 앱(rounded-lg navy 직접 작성) | 하나의 token 체계 · 역할별 밀도 |

---

## 5. Accessibility Gaps (CURRENT)

| Gap | 근거 |
|---|---|
| 입력칸 focus 표시 제거 | `focus:outline-none` 16곳 (`field.ts:22-34` 포함) — 전역 `:focus-visible`을 덮어씀 |
| Modal focus 관리 | 18개 중 16개 focus trap · 초기 초점 · 초점 복귀 · 스크롤 잠금 없음 (완전한 것은 `LeadFormDialog` · `ProgramDetailOverlay`) |
| 대비 | `text-navy/45 ~ /60`이 작은 글자에 다수 사용 — 분석 시 계산으로 약 2.6~3.9:1 추정 (**측정값 아님 · PHASE 07 검증**) |
| 폼 오류 연결 | `aria-invalid` · `aria-describedby` 사용 4개 파일뿐 |
| 표 | caption 없음 · `scope` 4곳 |
| Skip link | 없음 |
| Card | div onClick · role/키보드 없음 |
| 상태 알림 | `role="alert"` / `aria-live` 약 30곳 (양호) · ErrorState 누락 |

---

## 6. Current UX Risk Top 10

| # | 위험 | 근거 | 연결 결정 |
|---|---|---|---|
| 1 | 🔴 세션 전환: 카드에서 바로 시작 · scheduled → completed · 원장 · HQ 일반 완료 | `SessionActions.tsx` · `src/lib/staff/session-actions.ts:83` · `ClassSessionManageDialog.tsx:34-36` | DEC-046 · DEC-047 · DEC-085 · DEC-098 |
| 2 | 🔴 리포트 AI 의존 문구 · 흐름 ("AI 정리를 검토 완료한 뒤 다시 시도해주세요") | `GrowthReportCreateForm` | DEC-071 · DEC-091 · DEC-101 |
| 3 | 🔴 Sales = Admin 화면 · 머리글 "운영 관리자" · Sales 원아 명단 노출 | `admin/(dashboard)/layout.tsx:36` · `src/lib/auth/admin.ts` | DEC-079 · DEC-097 · DEC-108 |
| 4 | 🔴 구 미술 5영역 관찰 · Stage 없음 (마케팅은 Growth5 공개) | `observation_domains` seed · `ObservationChildForm` | DEC-005 · DEC-086 · DEC-100 |
| 5 | 🔴 원장 AI 정리 문장 노출 · STARTER 대시보드 게이트 없음 | `ObservationAiDraftSection` · `/director` | DEC-093 · DEC-056 · DEC-106 |
| 6 | 🟠 흐린 보조 글자 대비 | §4 · §5 | DEC-109 · DEC-110 |
| 7 | 🟠 focus 제거 · modal focus trap 없음 · 복잡한 CRUD 모달 | §5 | DEC-110 · DEC-112 |
| 8 | 🟠 상태 체계 없음 (전역 loading/error · SY-02 · 읽기 전용 · 상품 미포함 · 토스트) | §1 | DEC-106 · DEC-111 |
| 9 | 🟠 Parent 실패 문구가 원인 나열 · 공유 중지 확인 없음 · 사진 삭제 UI 없음 | `ParentGrowthReportView.tsx:166-170` · `GrowthReportShareSection` · `ObservationMediaSection` | DEC-103 · DEC-107 · DEC-111 |
| 10 | 🟡 두 디자인 언어 · 직접 작성 버튼 35곳 · 상태 매핑 8벌 · Target palette 0% | §3 · §4 | DEC-109 |

---

## 7. Current vs Target Gap 요약

| 영역 | Gap 상태 |
|---|---|
| 세션 · Recovery | CURRENT GAP → PHASE 07 (P0 우선순위 0) |
| Sales/Admin 분리 | CURRENT GAP → PHASE 07 (PHASE 05 RLS와 함께) |
| 원장 AI 초안 · STARTER 게이트 | CURRENT GAP → PHASE 07 (우선순위 0) |
| Class Mode · 빠른 메모 · Growth5 · Weekly · Portal | NOT IMPLEMENTED → PHASE 07 |
| Design token · focus · dialog | CURRENT GAP → PHASE 07 (우선순위 1) |
| 마케팅 visual · copy sync | Implementation Sync (UI-6) → PHASE 07 |
