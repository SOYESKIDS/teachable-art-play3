# IA Overview — TeachAble Art Play SaaS Platform 2.0

| | |
|---|---|
| 문서 상태 | PHASE 02 승인본 (검토 반영) |
| 작성 기준일 | 2026-09-26 |
| Branch / 기준 commit | `saas-v2` / `0ceb8ad` |
| 대상 독자 | PM · UX Designer · DB Architect · 개발자 |
| 선행 문서 | [../00-project/project-charter.md](../00-project/project-charter.md) · [../00-project/decision-log.md](../00-project/decision-log.md) · [../01-product/product-definition.md](../01-product/product-definition.md) · [../01-product/mvp-scope.md](../01-product/mvp-scope.md) |
| PHASE 02 문서 | **ia-overview.md** · [role-flows.md](./role-flows.md) · [class-mode-flow.md](./class-mode-flow.md) · [report-portal-flow.md](./report-portal-flow.md) · [screen-inventory.md](./screen-inventory.md) · [permission-matrix.md](./permission-matrix.md) · [state-error-model.md](./state-error-model.md) · [open-items.md](./open-items.md) |
| 관련 결정 | DEC-033 ~ DEC-045 |

> 본 PHASE 문서는 **"누가 어떤 화면에서 어떤 순서로 무엇을 하는가"**까지만 정한다. Wireframe · Visual Design · DB Schema · SQL · RLS 구현은 다루지 않는다.
>
> 표기: **CURRENT** = 기준 commit의 실제 코드 · **TARGET** = 2.0 목표. 두 값을 섞지 않는다.

---

## 1. Executive IA Summary

| 질문 | 답 |
|---|---|
| 구조 원칙 | 새 앱을 만들지 않는다. `/admin` · `/director` · `/teacher` 3개 영역을 유지하고 Class Mode · 아동 단위 Portal · 계약/이용권을 **추가**한다 (DEC-033) |
| Teacher | 메뉴 3개 유지(오늘의 수업 · 수업 이력 · 성장 리포트). Class Mode = 세션 카드에서 진입하는 전체화면 모드. BEFORE · DURING 신규, AFTER는 기존 출결·관찰 화면 재사용 |
| Director | 기존 대시보드 보존. 신규 화면은 **학부모 공유·사진 동의 관리 1개**. 공유는 **아동 단위 1회 활성** → 이후 완료 리포트 자동 노출 (DEC-040). 공개 후 문제 시 리포트 1건 **긴급 숨김** (DEC-043) |
| Parent | 신규 `/share/portal/[portalId]` 1개 화면. Navigation은 **이번 주 · 지난 기록** 2개 (DEC-042). 링크 실패 사유는 학부모에게 구분하지 않는다 (DEC-044) |
| HQ | 기존 7단계 온보딩 앞에 **0단계 상품·계약**. Pilot은 여기서 분기. 상품·계약 별도 관리 UI는 P1 (DEC-045) |
| Entitlement | 테넌트·역할 밖 = "찾을 수 없음", 상품 밖 = "현재 이용 상품에 포함되지 않은 기능" (DEC-044) |
| 수업 시작 · 종료 | Class Mode 적용 세션은 `scheduled → BEFORE 필수 확인 → Teacher [수업 시작] → in_progress → Teacher [수업 마치기] → completed` 한 흐름뿐이다. 오늘 화면 · 원장 · HQ의 직접 시작과 `scheduled → completed` 빠른 완료는 없다. 취소는 유지 (DEC-046 · DEC-047) |
| 화면 수 | 전체 46 화면 · P0 작업 24 화면 (MODIFY 19 · CREATE 5). 상세는 [screen-inventory.md](./screen-inventory.md) |

---

## 2. Flow Design Principles

| # | 원칙 | 근거 |
|---|---|---|
| F-1 | **URL을 유지하고 기능을 확장한다.** 신규 경로는 의미가 바뀌는 곳에만 둔다 | DEC-033 |
| F-2 | **교사 한 수업 = 한 흐름.** 오늘 → BEFORE → DURING → AFTER → Weekly 대기열. 각 구간 끝에는 "다음" 버튼 하나 | DEC-004 |
| F-3 | **AI는 항상 보조 위치.** AI 없이 모든 주 경로가 완주된다. P0 Weekly에는 AI가 없다 | DEC-009 · DEC-039 |
| F-4 | **Growth 5 / Stage는 순서·크기·색으로 위계를 만들지 않는다.** "기록 없음"은 기본 상태 | DEC-008 · DEC-038 · U-1~U-5 |
| F-5 | **원장은 승인자가 아니라 발견자·통제자.** 매 건 조치 흐름을 만들지 않는다. 긴급 숨김은 예외 대응이지 승인이 아니다 | DEC-030 · DEC-043 |
| F-6 | **학부모에게는 실패 사유를 구분하지 않는다.** 원장에게만 사유를 보여준다 | DEC-044 · AI-14 |
| F-7 | **서버가 판단한다.** 메뉴 숨김은 편의. 모든 화면은 직접 URL 접근에도 같은 결론을 낸다 | DEC-016 · DEC-031 · AI-9 |
| F-8 | **데이터 손실 0건.** 수업 중 입력(Quick Memo)과 필수 확인은 서버에 보존한다 | DEC-035 · DEC-036 |
| F-9 | **"완료"를 섞지 않는다.** Session completed ≠ Observation complete ≠ Weekly complete | DEC-034 |
| F-10 | **Pilot 범위를 넘는 화면을 만들지 않는다.** 수동으로 가능한 HQ 작업은 P1 | mvp-scope §0 · DEC-045 |

---

## 3. Target Sitemap

| 영역 | PATH | SCREEN | ROLE | ENTITLEMENT | CURRENT → TARGET | PRI |
|---|---|---|---|---|---|---|
| PUBLIC | `/` | 판매 홈 | 공개 | — | 유지 | — |
| PUBLIC | `/programs/[slug]` | 상품 상세 | 공개 | — | 유지 | — |
| PUBLIC | `/kindergarten` | 교직원 로그인 안내 | 공개 | — | 유지 | — |
| PUBLIC | `/privacy` · `/terms` | 법적 고지 | 공개 | — | 수정 (P0-16) | P0 |
| AUTH | `/login` | 교직원 로그인 · 역할 착지 | 원장·교사 | 원장 착지 결정 | 수정 | P0 |
| AUTH | `/auth/set-password` · `/auth/forgot-password` | 초대·재설정 | 교직원 | — | 유지 | — |
| AUTH | `/admin/login` | HQ 로그인 | HQ | — | 유지 | — |
| HQ | `/admin` | 운영 대시보드 | admin | — | 유지 | — |
| HQ | `/admin/readiness` | 오픈 준비 + **Pilot Ready 점검** | admin | — | 수정 | P0 |
| HQ | `/admin/onboarding` | **0 상품·계약** + 7단계 | admin | — | 수정 | P0 |
| HQ | `/admin/organizations` | 기관 목록 + 상품·계약 | admin · sales(메타) | — | 수정 | P0 |
| HQ | `/admin/organizations/[id]` | 기관 상세 + **계약·이용권** + **긴급 숨김** | admin (sales: 계약 metadata read-only · 집계만 — DEC-058) | — | 수정 | P0 |
| HQ | `/admin/organizations/[id]/program-assignments/[assignmentId]` | 배정 · 세션 | admin | 주차 범위 | 수정 | P0 |
| HQ | `/admin/curriculum` · `/admin/curriculum/[id]` | 프로그램 · 차시 목록 | admin | — | 유지 | — |
| HQ | `/admin/curriculum/[id]/lessons/[lessonId]` | 차시 **15섹션 검수** | admin | — | 수정 | P0 |
| HQ | `/admin/leads` | 문의 관리 | admin · sales | — | 유지 | — |
| HQ | `/admin/products` | 상품 카탈로그 | admin | — | 신규 | P1 |
| HQ | `/admin/contracts` | 계약 목록 · 만료 | admin | — | 신규 | P1 |
| HQ | `/admin/content` | 콘텐츠 거버넌스 · 자산 | content roles | — | 신규 | P1 |
| HQ | `/admin/curriculum/[id]/lessons/[lessonId]/preview` | Class Mode 미리보기 | admin | — | 신규 | P1 |
| HQ | `/admin/shipments` · `/admin/support` | 배송 · 지원 | admin | — | 신규 | P2 |
| DIRECTOR | `/director` | 대시보드 | 원장 | **director_dashboard** | 수정 (게이트) | P0 |
| DIRECTOR | `/director/sessions` | 수업 운영 ([수업 시작] 직접 전환 제거) | 원장 | 전 상품 (DEC-056) | 수정 (DEC-046) | P0 |
| DIRECTOR | `/director/sessions/history` | 수업 이력 | 원장 | 전 상품 (DEC-056) | 유지 | — |
| DIRECTOR | `/director/sessions/[sessionId]/attendance` | 출결 관리 | 원장 | 전 상품 (DEC-056) | 유지 | — |
| DIRECTOR | `/director/sessions/[sessionId]/observations` | 관찰 조회 + Growth 5/Stage | 원장 | 전 상품 (DEC-056) | 수정 | P0 |
| DIRECTOR | `/director/growth-reports` · `/director/growth-reports/[reportId]` | complete 리포트 · 긴급 숨김 | 원장 | 전 상품 (DEC-056) | 수정 | P0 |
| DIRECTOR | `/director/portal` | **학부모 공유 · 사진 동의** | 원장 | parent_portal | 신규 | P0 |
| DIRECTOR | `/director/growth-reports/print` | 반 일괄 인쇄 | 원장 | `bulk_print` (STANDARD · PREMIUM · STARTER 제외 — DEC-056) | 신규 | P1 |
| TEACHER | `/teacher` | 오늘의 수업 | 교사 | — | 수정 | P0 |
| TEACHER | `/teacher/sessions/[sessionId]` | Class Mode 진입 (route handler) | 교사 | class_mode + 주차 | 신규 | P0 |
| TEACHER | `/teacher/sessions/[sessionId]/before` | BEFORE | 교사 | 〃 | 신규 | P0 |
| TEACHER | `/teacher/sessions/[sessionId]/during` | DURING | 교사 | 〃 | 신규 | P0 |
| TEACHER | `/teacher/sessions/[sessionId]/attendance` | AFTER ① 출결 | 교사 | — | 수정 | P0 |
| TEACHER | `/teacher/sessions/[sessionId]/observations` | AFTER ② 관찰 | 교사 | — | 수정 | P0 |
| TEACHER | `/teacher/history` | 수업 이력 | 교사 | — | 유지 | — |
| TEACHER | `/teacher/growth-reports` · `/teacher/growth-reports/[reportId]` | Weekly 대기열 · 검토 | 교사 | weekly_report | 수정 | P0 |
| PARENT | `/share/portal/[portalId]` | Child Secure Portal | anon | parent_portal | 신규 | P0 |
| PARENT | `/share/growth-report/[shareId]` | 기존 리포트 링크 | anon | — | 유지 → Cutover 후 신규 발급 중단 (DEC-041) | — |
| API | `/api/share/portal/resolve` | Portal 조회 | anon | — | 신규 | P0 |
| API | `/api/share/growth-report/resolve` | 기존 리포트 조회 | anon | — | 유지 | — |
| 공통 | (상태 화면) | Not Entitled · 이용 기간 외 · 수업 내용 준비 안 됨 | 교직원 | — | 신규 | P0 |

---

## 4. Role Navigation

| Role | Primary Navigation (TARGET) | CURRENT 대비 |
|---|---|---|
| **Teacher** | 오늘의 수업 · 수업 이력 · 성장 리포트 | **변경 없음.** Class Mode 중에는 StaffShell 메뉴를 숨기고 "나가기"만 둔다 |
| **Director (Pilot · STANDARD · PREMIUM)** | 홈 · 수업 운영 · 수업 이력 · 성장 리포트 · **학부모 공유** | 메뉴 1개 추가 |
| **Director (정규 STARTER)** | 수업 운영 · 수업 이력 · 성장 리포트 · 학부모 공유 | "홈" 숨김 (HARD RULE) · 나머지 운영 화면 제공 · 집계/누락 탐지 우회 제공 금지 (*Updated by DEC-056*) |
| **HQ admin** | 운영 대시보드 · 오픈 준비 · 새 기관 도입 · 기관 관리 · 수업 프로그램 · 문의 관리 (P1: 상품·계약 · 콘텐츠) | P0 메뉴 변경 없음. 계약은 기관 상세 내부 |
| **HQ sales** | 문의 관리 · 기관 관리 (메타데이터만) | **신규 분기** (P0-15). 현재 로그인 착지 `/admin/leads`는 그대로 적합 |
| **Parent** | 이번 주 · 지난 기록 | 신규 (DEC-042) |

재사용 원칙: `StaffShell` · `AdminNav`를 유지하고 메뉴 배열에 역할 · Entitlement 필터만 적용한다. 신규 셸은 **Class Mode 전체화면 레이아웃 1개**뿐이다.

---

## 5. Responsive Usage Context

> 레이아웃 디자인이 아니라 **정보 우선순위 차이**만 정의한다. 레이아웃은 PHASE 06.

| 대상 | 기준 기기 | 정보 우선순위 |
|---|---|---|
| Teacher 일반 | 태블릿 우선 · 모바일 사용 가능 · 데스크톱 보조 | 모바일에서는 세션 카드당 CTA 1개(수업 준비 / 이어서 / 기록하기) |
| Class Mode — 태블릿 가로 | 교실 거치 | 좌: 단계 목록 · Timer / 우: 핵심 문장 · 프롬프트 · 펼침 가이드 |
| Class Mode — 태블릿 세로 | 손에 들고 이동 | 상단 고정 Timer → 핵심 문장 → 프롬프트 → (펼침) Playbook · 가이드. Quick Memo는 하단 고정 버튼 |
| AFTER 관찰 | 태블릿 | 가로: 아동 목록 + 입력 / 세로: 상단 아동 선택 바 + 입력 |
| Director | 데스크톱 · 태블릿 | follow-up 최상단 → 오늘 수업 → 리포트 |
| HQ | 데스크톱 우선 | 표 중심 · 필터 |
| Parent | 모바일 우선 | 이번 주: 오늘의 활동 → 아이의 작품(사진) → 아이의 말 → 교사 관찰 → 가정연계 Tip → 다음 주 예고. 인쇄는 하단 |

---

## 6. Existing Route Strategy

| 원칙 | 내용 |
|---|---|
| 유지 | `/admin/**` · `/director/**` · `/teacher/**` · 공개/인증 경로는 URL을 바꾸지 않는다 |
| 하위 확장 | Class Mode는 기존 `/teacher/sessions/[sessionId]/` 계층에 `before` · `during`을 추가한다. 진입 경로 `/teacher/sessions/[sessionId]`는 화면이 없는 route handler다 |
| AFTER 재사용 | `attendance` · `observations`를 Class Mode 헤더와 함께 AFTER ①② 로 쓴다. 원장 follow-up 링크와의 대응을 유지한다 |
| 신규 경로 | 의미가 바뀌는 곳에만: `/share/portal/[portalId]` (리포트 → 아동) · `/director/portal` (리포트 단위 공유 → 아동 단위 공유) |
| 호환 유지 | `/share/growth-report/[shareId]` + resolve API는 유지한다. Portal Production Cutover 시점부터 신규 발급만 중단 (DEC-041) |
| 제거 | P0에서 제거하는 URL은 없다 |

전체 매핑은 [screen-inventory.md §5](./screen-inventory.md#5-existing-route--target-route)를 참조한다.
