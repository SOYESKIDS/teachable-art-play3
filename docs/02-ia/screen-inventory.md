# Screen Inventory — TeachAble Art Play SaaS Platform 2.0

| | |
|---|---|
| 문서 상태 | PHASE 02 승인본 (검토 반영 · Screen Count 재계산) |
| 작성 기준일 | 2026-09-26 |
| Branch / 기준 commit | `saas-v2` / `0ceb8ad` |
| 관련 문서 | [ia-overview.md](./ia-overview.md) · [permission-matrix.md](./permission-matrix.md) |

---

## 0. 계산 규칙

| 규칙 | 내용 |
|---|---|
| Screen | 사용자가 보는 페이지 1개 = 1 Screen. route가 같으면 기능이 늘어도 1 Screen이다 |
| 제외 | **Route-only handler / API** (화면 없음) · **Shell / Layout** (메뉴·셸) — 별도 표로 센다 (§2 · §3) |
| 기능 확장 | 기존 Screen에 P1/P2 기능이 추가되는 것은 Screen 수에 넣지 않고 §4에 기록한다 |
| CURRENT STATUS | `EXISTING` 현재 그대로 존재 · `PARTIAL` 존재하나 TARGET 기능 일부 없음 · `NEW` 없음 |
| TARGET ACTION | `KEEP` · `MODIFY` · `REPLACE` · `CREATE` |
| PRIORITY | 작업이 필요한 시점. KEEP은 `—` |

> PHASE 02 초안의 "수정 14개"는 실제 나열 항목(16개)과 맞지 않았다. 또한 초안은 privacy/terms를 1행으로 합쳤고, 같은 route의 P1/P2 기능 확장(DR-09 · DR-11 · TC-10 · TC-11 · TC-12 · PT-02 · PT-03)을 별도 Screen으로 세었다. 본 문서는 위 규칙으로 **Inventory 행에서 직접 계산**한다.

---

## 1. Full Screen Inventory

| ID | SCREEN NAME | ROLE | ROUTE | PURPOSE | CURRENT STATUS | TARGET ACTION | PRIORITY | ENTITLEMENT |
|---|---|---|---|---|---|---|---|---|
| PB-01 | 판매 홈 | 공개 | `/` | 판매 · 상담 신청 | EXISTING | KEEP | — | — |
| PB-02 | 상품 상세 | 공개 | `/programs/[slug]` | 상품 소개 | EXISTING | KEEP | — | — |
| PB-03 | 교직원 로그인 안내 | 공개 | `/kindergarten` | 교직원 진입 | EXISTING | KEEP | — | — |
| PB-04 | 개인정보처리방침 | 공개 | `/privacy` | 고지 정합화 (AI 위탁 · 사진 처리) | PARTIAL | MODIFY | P0 | — |
| PB-05 | 이용약관 | 공개 | `/terms` | 고지 정합화 | PARTIAL | MODIFY | P0 | — |
| SY-01 | 찾을 수 없음 | 전체 | (not-found) | 테넌트·역할 밖 · 없는 자원 | EXISTING | KEEP | — | — |
| SY-02 | 상태 안내 | 교직원 | (공통 상태 화면) | Not Entitled · 이용 기간 외 · 수업 내용 준비 안 됨 | NEW | CREATE | P0 | — |
| AU-01 | 교직원 로그인 | 원장 · 교사 | `/login` | 인증 · **Entitlement 기반 원장 착지** | PARTIAL | MODIFY | P0 | 착지 |
| AU-02 | 비밀번호 설정 | 교직원 | `/auth/set-password` | 초대 수락 · 재설정 | EXISTING | KEEP | — | — |
| AU-03 | 비밀번호 찾기 | 교직원 | `/auth/forgot-password` | 재설정 요청 | EXISTING | KEEP | — | — |
| AU-04 | HQ 로그인 | HQ | `/admin/login` | HQ 인증 | EXISTING | KEEP | — | — |
| HQ-01 | 운영 대시보드 | admin | `/admin` | 전체 운영 현황 | EXISTING | KEEP | — | — |
| HQ-02 | 오픈 준비 | admin | `/admin/readiness` | + **Pilot Ready 점검** | PARTIAL | MODIFY | P0 | — |
| HQ-03 | 새 기관 도입 | admin | `/admin/onboarding` | + **0단계 상품·계약** · Pilot 분기 | PARTIAL | MODIFY | P0 | — |
| HQ-04 | 기관 목록 | admin · sales(메타) | `/admin/organizations` | + 상품 · 계약 상태 컬럼 | PARTIAL | MODIFY | P0 | — |
| HQ-05 | 기관 상세 | admin (sales 제한) | `/admin/organizations/[id]` | + **계약·이용권** · **학부모 공개 리포트 긴급 숨김** · sales 비노출 영역 (*Updated by DEC-058*: sales는 계약 metadata read-only · 원아/교사/초과 인원 집계만. 원아 명단 · 동의 · 리포트 · 긴급 숨김 · 계약 변경 불가) | PARTIAL | MODIFY | P0 | — |
| HQ-06 | 프로그램 배정 · 세션 | admin | `/admin/organizations/[id]/program-assignments/[assignmentId]` | 세션 생성 시 Entitlement 주차 범위 제한 · **`in_progress` 직접 전환 제거** (DEC-046) · **`scheduled → completed` 불허** (DEC-047) | PARTIAL | MODIFY | P0 | 주차 범위 |
| HQ-07 | 프로그램 목록 | admin | `/admin/curriculum` | 프로그램 관리 | EXISTING | KEEP | — | — |
| HQ-08 | 프로그램 상세 | admin | `/admin/curriculum/[id]` | 차시 목록 | EXISTING | KEEP | — | — |
| HQ-09 | 차시 상세 | admin | `/admin/curriculum/[id]/lessons/[lessonId]` | **15섹션 표시 · 필수 데이터 검수** | PARTIAL | MODIFY | P0 | — |
| HQ-10 | 문의 관리 | admin · sales | `/admin/leads` | 리드 처리 | EXISTING | KEEP | — | — |
| HQ-11 | 상품 카탈로그 | admin | `/admin/products` | 상품 조회 · 편집 | NEW | CREATE | P1 | — |
| HQ-12 | 계약 목록 | admin | `/admin/contracts` | 만료 · 갱신 관리 | NEW | CREATE | P1 | — |
| HQ-13 | 콘텐츠 거버넌스 | content roles | `/admin/content` | 5단계 상태 · 자산 | NEW | CREATE | P1 | — |
| HQ-14 | Class Mode 미리보기 | admin | `/admin/curriculum/[id]/lessons/[lessonId]/preview` | 이관 검수 | NEW | CREATE | P1 | — |
| HQ-15 | 배송 관리 | admin | `/admin/shipments` | KIT · 워크북 | NEW | CREATE | P2 | — |
| HQ-16 | 지원 · 문의 이력 | admin | `/admin/support` | 기관 지원 | NEW | CREATE | P2 | — |
| DR-01 | 대시보드 | 원장 | `/director` | 누락 발견 (내용 KEEP) + **Entitlement 게이트** | PARTIAL | MODIFY | P0 | **director_dashboard** (HARD) |
| DR-02 | 수업 운영 | 원장 | `/director/sessions` | 오늘 수업 · 상태 변경. **[수업 시작] 직접 전환 제거 (DEC-046) · `scheduled → completed` 직접 완료 제거 (DEC-047)** — 조회 · 출결 정정 · 취소 · 진행 중 세션 완료 유지 | PARTIAL | MODIFY | P0 | 전 상품 (DEC-056) |
| DR-03 | 수업 이력 | 원장 | `/director/sessions/history` | 이력 | EXISTING | KEEP | — | 전 상품 (DEC-056) |
| DR-04 | 출결 관리 | 원장 | `/director/sessions/[sessionId]/attendance` | 출결 정정 | EXISTING | KEEP | — | 전 상품 (DEC-056) |
| DR-05 | 관찰 조회 | 원장 | `/director/sessions/[sessionId]/observations` | + Growth 5 / Stage 읽기 · 고정 안내문 | PARTIAL | MODIFY | P0 | 전 상품 (DEC-056) |
| DR-06 | 성장 리포트 목록 | 원장 | `/director/growth-reports` | + 유형 · 주차 필터 · 숨김 상태 | PARTIAL | MODIFY | P0 | 전 상품 (DEC-056) |
| DR-07 | 성장 리포트 상세 | 원장 | `/director/growth-reports/[reportId]` | Weekly 서식 · **긴급 숨김** · 기존 공유 섹션 Cutover 처리 | PARTIAL | MODIFY | P0 | 전 상품 (DEC-056) |
| DR-08 | 학부모 공유 · 사진 동의 | 원장 | `/director/portal` | 아동별 Portal 링크 · 사진 동의 상태 · 노출 리포트 · 긴급 숨김 | NEW | CREATE | P0 | parent_portal |
| DR-09 | 리포트 일괄 인쇄 | 원장 | `/director/growth-reports/print` | 반 단위 인쇄 (D-5) | NEW | CREATE | P1 | `bulk_print` — STANDARD · PREMIUM (STARTER 제외 · DEC-056) |
| TC-01 | 오늘의 수업 | 교사 | `/teacher` | + **[수업 준비] → Class Mode** · Week · 성장키워드 · "이어서" · 기존 [수업 시작]은 **BEFORE 이동만** (직접 전환 제거, DEC-046) · 빠른 [완료] **제거** (DEC-047) | PARTIAL | MODIFY | P0 | — |
| TC-02 | Class Mode BEFORE | 교사 | `/teacher/sessions/[sessionId]/before` | 준비 · 필수 확인 · 수업 시작 | NEW | CREATE | P0 | class_mode · 주차 |
| TC-03 | Class Mode DURING | 교사 | `/teacher/sessions/[sessionId]/during` | 6단계 진행 · Timer · Quick Memo | NEW | CREATE | P0 | class_mode · 주차 |
| TC-04 | AFTER ① 출결 | 교사 | `/teacher/sessions/[sessionId]/attendance` | + Class Mode 헤더 · 다음 | PARTIAL | MODIFY | P0 | — |
| TC-05 | AFTER ② 관찰 | 교사 | `/teacher/sessions/[sessionId]/observations` | + 아동별 집중 · Growth 5 / Stage · ObservationFocus · Quick Memo 패널 · 관찰 마무리 | PARTIAL | MODIFY | P0 | — |
| TC-06 | 수업 이력 | 교사 | `/teacher/history` | 이력 | EXISTING | KEEP | — | — |
| TC-07 | Weekly 대기열 | 교사 | `/teacher/growth-reports` | 기간 입력 폼 → **반 × 주차 대기열 · 일괄 조립** | PARTIAL | MODIFY | P0 | weekly_report |
| TC-08 | 리포트 검토 | 교사 | `/teacher/growth-reports/[reportId]` | 3블록 편집 → **Weekly 5항목 검토 · 사진 선택 · 다음 아동** (3블록은 Monthly용 유지) | PARTIAL | MODIFY | P0 | weekly_report |
| PT-01 | Child Secure Portal | anon | `/share/portal/[portalId]` | 이번 주 · 지난 기록 | NEW | CREATE | P0 | parent_portal |
| PT-02 | 기존 리포트 공유 | anon | `/share/growth-report/[shareId]` | 리포트 1건 (Cutover 후 기발급분만) | EXISTING | KEEP | — | — |

`REPLACE`는 사용하지 않았다. 기존 화면을 다른 화면으로 대체하는 경우가 없고, 기존 기능은 모두 같은 route에서 확장한다.

---

## 2. Route-only Handler / API (Screen 수 제외)

| ID | ROUTE | 역할 | CURRENT | ACTION | PRI |
|---|---|---|---|---|---|
| RH-01 | `/teacher/sessions/[sessionId]` | Class Mode 진입 · 상태별 구간 결정 | NEW | CREATE | P0 |
| RH-02 | `/api/share/portal/resolve` | Portal 조회 | NEW | CREATE | P0 |
| RH-03 | `/api/share/growth-report/resolve` | 기존 리포트 조회 | EXISTING | KEEP | — |
| RH-04 | `/auth/confirm` | 초대 · 재설정 토큰 교환 | EXISTING | KEEP | — |
| RH-05 | `/auth/logout` | 교직원 로그아웃 | EXISTING | KEEP | — |
| RH-06 | `/admin/logout` | HQ 로그아웃 | EXISTING | KEEP | — |

**합계 6** — CREATE 2 (P0) · KEEP 4

---

## 3. Shell / Layout (Screen 수 제외)

| ID | 대상 | 변경 | ACTION | PRI |
|---|---|---|---|---|
| SL-01 | `StaffShell` · Director 메뉴 (`app/director/nav.ts`) | "학부모 공유" 추가 · Entitlement에 따라 "홈" 숨김 | MODIFY | P0 |
| SL-02 | Admin layout · `AdminNav` | sales 역할 메뉴 분기 · "운영 관리자" 표기 분리 | MODIFY | P0 |
| SL-03 | Class Mode 전체화면 레이아웃 | 메뉴 숨김 · 구간 표시 · 나가기 | CREATE | P0 |

Teacher 메뉴 (`app/teacher/nav.ts`)는 변경 없음.

---

## 4. 기존 Screen의 P1 / P2 기능 확장 (Screen 수 제외)

| 대상 Screen | 확장 | PRI |
|---|---|---|
| DR-01 | D-1 진행률 · D-2 리포트 누락 · D-3 공유 현황 · D-4 동의 현황 카드 | P1 |
| DR-01 | D-6 콘텐츠 이용 · D-7 교사 부담 신호 | P2 |
| DR-06 · DR-07 · TC-07 · TC-08 | Monthly Report | P1 |
| DR-06 · DR-07 · TC-07 · TC-08 | Semester Report | P2 |
| TC-03 | EBOOK · VOD · MV · Audio 인앱 재생 (DEC-029) | P1 |
| TC-08 | Weekly AI 문장 다듬기 | P1 |
| PT-01 | 성장 · 작품 탭 | P1 |
| PT-01 | 학기 포트폴리오 | P2 |
| HQ-01 | 계약 만료 · 갱신 카드 | P1 |
| AU-04 | 역할별 착지 (admin → `/admin`) | P1 |

Parent Account는 POST-2.0 (DEC-013).

---

## 5. Existing Route → Target Route

| CURRENT ROUTE | CURRENT FUNCTION | TARGET ROUTE | ACTION | WHY | PRI | MIGRATION IMPACT |
|---|---|---|---|---|---|---|
| `/teacher` | 오늘 보드 | 동일 | MODIFY | Class Mode 진입 · [수업 시작] 직접 전환 제거 (DEC-046) · 빠른 [완료] 제거 (DEC-047) | P0 | URL 없음. 교사 동선 변경 (오리엔테이션 G-10) |
| — | — | `/teacher/sessions/[sessionId]` · `/before` · `/during` | CREATE | Class Mode (DEC-033) | P0 | 기존 하위 경로와 같은 계층 |
| `/teacher/sessions/[sessionId]/attendance` | 출결 | 동일 | MODIFY | AFTER ① | P0 | 없음 (링크 호환) |
| `/teacher/sessions/[sessionId]/observations` | 관찰 | 동일 | MODIFY | AFTER ② | P0 | 기존 미술 5영역 기록은 historical 표시 (DEC-006) |
| `/teacher/growth-reports` · `/[reportId]` | 3블록 기간 리포트 | 동일 | MODIFY | Weekly 대기열 · 5항목 | P0 | 기존 3블록 리포트는 조회 유지 · Monthly로 재사용 (DEC-011) |
| `/director` | 대시보드 | 동일 | MODIFY | Entitlement 게이트 (DEC-031) | P0 | STARTER 원장 착지 변경 |
| `/director/sessions` | 오늘 보드 · 시작/완료/취소 | 동일 | MODIFY | 원장 [수업 시작] 제거 (DEC-046) · `scheduled → completed` 제거 (DEC-047) | P0 | 원장 운영 습관 변경 — 수업 시작 · 종료는 교사가 한다는 안내 필요 |
| `/admin/organizations/[id]/program-assignments/[assignmentId]` | 세션 생성 · 상태 변경 | 동일 | MODIFY | 주차 범위 · `in_progress` 직접 전환 제거 (DEC-046) · `scheduled → completed` 불허 (DEC-047) | P0 | Emergency Override 없음 (PHASE 05 검토) · 1.0 과거 `completed` 기록 불변 |
| `/director/growth-reports/[reportId]` | 상세 + 리포트 공유 | 동일 | MODIFY | 긴급 숨김 · Cutover | P0 | 기존 링크는 만료까지 동작 (DEC-041) |
| — | — | `/director/portal` | CREATE | 아동 단위 공유 · 동의 | P0 | — |
| `/share/growth-report/[shareId]` | 리포트 1건 | 동일 | KEEP | 호환 | — | Cutover 후 신규 발급 중단 |
| — | — | `/share/portal/[portalId]` | CREATE | 아동 단위 · 다른 DTO (DEC-040) | P0 | no-store · noindex 정책 복제 |
| `/admin/onboarding` | 7단계 | 동일 | MODIFY | 0단계 상품·계약 | P0 | 기존 기관은 계약 소급 등록 필요 |
| `/admin/organizations/[id]` | 기관 상세 | 동일 | MODIFY | 계약 · 긴급 숨김 · sales 제한 | P0 | — |
| `/admin/readiness` | 준비 현황 | 동일 | MODIFY | Pilot Ready | P0 | — |
| `/admin/curriculum/[id]/lessons/[lessonId]` | 차시 · 활동 | 동일 | MODIFY | 15섹션 | P0 | 모델 확장(PHASE 05) 이후 |
| `/login` | 역할 착지 | 동일 | MODIFY | 원장 착지 결정 | P0 | 없음 |
| 그 외 공개 · 인증 · HQ 목록 · 원장 수업 · 교사 이력 | — | 동일 | KEEP | — | — | 없음 |

---

## 6. P0 Pilot Screen Set

**A. 기존 그대로 재사용 — Pilot 운영에 쓰는 KEEP (12)**
SY-01 · PB-03 · AU-02 · AU-03 · AU-04 · HQ-01 · HQ-07 · HQ-08 · HQ-10 · DR-03 · DR-04 · TC-06

(KEEP 중 Pilot 운영에 쓰지 않는 3개: PB-01 · PB-02 · PT-02)

**B. 기존 수정 — MODIFY · P0 (19)**
PB-04 · PB-05 · AU-01 · HQ-02 · HQ-03 · HQ-04 · HQ-05 · HQ-06 · HQ-09 · DR-01 · DR-02 · DR-05 · DR-06 · DR-07 · TC-01 · TC-04 · TC-05 · TC-07 · TC-08

> DR-02는 DEC-046(수업 시작 단일 경로)으로 KEEP → MODIFY가 되었다.

**C. 신규 생성 — CREATE · P0 (5)**
SY-02 상태 안내 · DR-08 학부모 공유·사진 동의 · TC-02 BEFORE · TC-03 DURING · PT-01 Child Secure Portal

(+ Route-only CREATE 2: RH-01 · RH-02 / Shell 변경 3: SL-01 · SL-02 · SL-03)

### 6-1. 화면 수 절감 방식 (반영됨)

| 방식 | 효과 |
|---|---|
| 상품 · 계약 · 콘텐츠 관리 UI를 P1로 (DEC-045) | HQ 신규 P0 화면 0개 |
| AFTER를 기존 출결 · 관찰 화면으로 (DEC-033) | 신규 AFTER 화면 0개 |
| 아동 단위 공유 (DEC-040) | 원장 리포트별 공유 작업 제거 |
| Portal 2탭 · 한 화면 (DEC-042) | Portal 1 Screen |
| Weekly P0 AI 없음 (DEC-039) | AI UI 수정 0건 |
| 긴급 숨김을 기존 상세 화면에 배치 (DEC-043) | 신규 화면 0개 |

---

## 7. Screen Count (Inventory §1에서 계산)

| 구분 | KEEP | MODIFY | CREATE | 합계 |
|---|---|---|---|---|
| PUBLIC (PB) | 3 | 2 | 0 | 5 |
| SYSTEM (SY) | 1 | 0 | 1 | 2 |
| AUTH (AU) | 3 | 1 | 0 | 4 |
| HQ | 4 | 6 | 6 | 16 |
| DIRECTOR (DR) | 2 | 5 | 2 | 9 |
| TEACHER (TC) | 1 | 5 | 2 | 8 |
| PARENT (PT) | 1 | 0 | 1 | 2 |
| **합계** | **15** | **19** | **12** | **46** |

| 우선순위 | MODIFY | CREATE | 작업 Screen |
|---|---|---|---|
| **P0** | 19 | 5 | **24** |
| P1 | 0 | 5 (HQ-11 · HQ-12 · HQ-13 · HQ-14 · DR-09) | 5 |
| P2 | 0 | 2 (HQ-15 · HQ-16) | 2 |
| **합계** | **19** | **12** | **31** |

| 별도 집계 (Screen 제외) | 수 |
|---|---|
| Route-only handler / API | 6 (CREATE P0 2 · KEEP 4) |
| Shell / Layout | 3 (MODIFY P0 2 · CREATE P0 1) |
| **Pilot 운영 Screen Set** | 36 = 재사용 12 + 수정 19 + 신규 5 |
