# Navigation · Screen System

| | |
|---|---|
| 문서 상태 | PHASE 06 승인본 (문서 검토 대기) |
| 작성 기준일 | 2026-09-27 |
| 상위 문서 | [architecture-overview.md](./architecture-overview.md) |
| 관련 결정 | DEC-097 · DEC-106 · DEC-108 · DEC-111 (및 DEC-042 · DEC-044 · DEC-056 · DEC-058) |

---

## 1. App Shell (DEC-097)

| Shell | 대상 | 구성 | 반응형 |
|---|---|---|---|
| **Teacher** | 교사 | 상단 context(기관 · 반) + 사용자 메뉴 · 메뉴 3개 | tablet/desktop 상단 탭 · mobile 하단 탭 |
| **Class Mode** | 교사 (수업 중) | 전체 화면 · 메뉴 없음 · 상단 단계 바 + [나가기] · 하단 고정 action bar | 모든 폭에서 큰 action 유지 (DEC-098) |
| **Director** | 원장 | 좌측 메뉴 · 머리글에 기관명 | desktop 사이드 · tablet 상단 탭 · mobile 요약 + 탭 |
| **HQ Admin** | 본사 운영 | 좌측 메뉴 · 머리글 "SOYE KIDS 본사 · 운영 관리자" | desktop 우선 |
| **HQ Sales** | 본사 영업 | **별도 축소 Shell** · 머리글 "SOYE KIDS 본사 · 영업" | desktop 우선 |
| **Parent** | 학부모 | 메뉴 없음 · 아이 이름 · 반 · 기관 · 탭 2개 | mobile 단일 열 |

한 Shell로 모든 역할을 합치지 않는다. HQ Sales는 Admin Shell에서 메뉴를 숨기는 방식이 아니다.

---

## 2. Context · Role Switching

- context를 경로 형태로 항상 표시한다: `SOYE KIDS 본사` 또는 `○○유치원 › 햇님반`.
- 여러 기관에 속한 사용자는 기존 기관 선택(`OrganizationPicker` · `?org`)을 유지하고, 선택한 기관이 머리글에 보인다.
- HQ 전역 역할과 기관 역할은 로그인 입구부터 분리된다 (`/admin/login` · `/login`). 한 화면에서 두 역할의 권한을 섞어 보여주지 않는다.
- 두 역할을 모두 가진 사용자는 사용자 메뉴의 명시적 전환("본사 화면으로 이동" 등)으로만 이동한다.

---

## 3. Role Navigation

### 3-1. Teacher (P0)

| 메뉴 | Route | 비고 |
|---|---|---|
| 오늘의 수업 | `/teacher` | scheduled 카드의 주 행동 = [수업 준비] |
| 수업 이력 | `/teacher/history` | 읽기 전용 |
| 리포트 | `/teacher/growth-reports` | Weekly 대기열 · 작성 · legacy |

계약 · 상품 · Admin 메뉴 없음. 판매 UX 없음. Class Mode 중에는 [나가기]만.

### 3-2. Director (P0)

| 메뉴 | STANDARD · PREMIUM · Pilot | STARTER |
|---|---|---|
| 홈 (Director Dashboard) | ✅ (`director_dashboard`) | **없음** — 로그인 착지 = 수업 운영 · 직접 접근 시 SY-02 |
| 수업 운영 | ✅ | ✅ |
| 수업 이력 | ✅ | ✅ |
| 리포트 | ✅ | ✅ (완료 리포트 · 숨김 · 단건 인쇄) |
| 학부모 공유 | ✅ | ✅ |

STARTER에서 "대시보드 없음"은 원장 화면 전체 없음이 아니다. 운영 · 출결 · 관찰 조회 · 완료 리포트 · 학부모 공유 · 사진 공유 기록 · 숨김 · 단건 인쇄는 제공한다 (DEC-056). **Dashboard 집계 · 누락 탐지 count를 다른 화면에서 우회 제공하지 않는다.**

원장이 자기 기관의 교사 · 반 운영 정보를 **보는 것**과 교사 초대 · 배정을 **수정하는 것**은 구분한다. 후자는 PH3-2 · UI-9 OPEN.

### 3-3. HQ Admin

| 메뉴 | P0 | 비고 |
|---|---|---|
| 운영 현황 | ✅ | — |
| 서비스 준비 | ✅ | Readiness checklist (DEC-106) |
| 새 기관 도입 | ✅ | + Contract step |
| 기관 관리 | ✅ | 기관 상세 안 **계약 · 이용권** section |
| 수업 프로그램 | ✅ | — |
| 문의 관리 | ✅ | — |
| 상품 버전 · 계약 목록 | P1 | 독립 목록 |
| 지원 | P2 | 민감 기록은 "지원 목적으로 열람" 흐름만 (DEC-108) |

민감 아동 교육 기록을 자유 탐색하는 메뉴는 두지 않는다.

### 3-4. HQ Sales

| 메뉴 | 내용 |
|---|---|
| 문의 관리 | Lead |
| 기관 | 영업 요약 · 기관 metadata · 계약 metadata (읽기) · 원아 수 · 교사 수 · 초과 인원 **숫자** |
| 상품 안내 | 상품 정보 |
| 준비 현황 | Readiness summary |

**아동 이름 · 상세 · 관찰 · 인용 · Growth5 · 사진 · 리포트 · Portal token · 아동별 consent는 경로 자체가 없다.** UI 숨김만이 아니라 data boundary(DEC-079)가 전제다.

### 3-5. Parent

| 탭 | 내용 |
|---|---|
| 이번 주 | 현재 주 수업 week의 visible Weekly (DEC-103) |
| 지난 기록 | 노출 가능한 이전 기록 목록 → 상세 |

### 3-6. 상품 미포함 기능 패턴

| 위치 | 패턴 |
|---|---|
| 메뉴 (원장 홈 · 일괄 인쇄) | 숨김 · 직접 접근 시 SY-02 |
| 업무 중 버튼 (STARTER · AI OFF의 AI 버튼) | 숨김 |
| 업그레이드 안내 | Director SY-02 화면에서만 · Teacher에게는 원장 문의 안내 |

---

## 4. Screen State Model (DEC-111)

주요 화면은 happy path만이 아니라 다음 상태를 정의한다.

| 상태 | 의미 | 기본 표현 |
|---|---|---|
| Loading | 불러오는 중 | 목록 · Parent는 skeleton · 버튼 전환은 버튼 내부 표시 |
| Loaded | 정상 | — |
| Empty | 데이터 없음 | 이유 · 다음 행동 · 해결 주체 |
| Partial | 일부 실패 | 실패한 부분만 안내 ("지금은 집계할 수 없습니다" 등) |
| Error | 서버 · 네트워크 | 재시도 · 내부 code 비노출 |
| Permission Denied | 권한 · tenant 밖 | SY-01 (존재 여부 무구분) |
| Not Entitled | 상품 미포함 | SY-02 |
| Read Only | 계약 기간 외 · 정지 | 상단 banner |
| Conflict | 동시 수정 | 충돌 패널 |
| (필요 시) Hidden · Revoked · Not Ready | 리포트 숨김 · 링크 중지 · 콘텐츠 미준비 | 화면별 |

Parent는 원인을 구분하지 않는 단일 실패 화면을 쓴다 (DEC-103).

---

## 5. Entitlement · Read-only Screens (DEC-106)

| 유형 | 화면 | 문구 | 다음 행동 |
|---|---|---|---|
| 없는 경로 · 다른 tenant · role 부족 | **SY-01** | "찾을 수 없거나 접근 권한이 없습니다." | 돌아가기 |
| 상품 미포함 | **SY-02** | "현재 이용 상품에 포함되지 않은 기능입니다." | Director: 포함 상품 · 도입 문의 / Teacher: "원장님께 문의해 주세요." |
| 계약 시작 전 | SY-02 · 오늘 화면 | "이용 기간이 아닙니다." + 이용 시작일 | — |
| 계약 종료 | SY-02 · banner | "이용 기간이 종료되었습니다." | 읽기 전용 |
| 계약 정지 · 읽기 전용 | banner | "현재 읽기 전용 상태입니다. 기존 기록은 확인할 수 있지만 새 기록은 작성할 수 없습니다." | Teacher: 원장 문의 / Director: 본사 담당자 문의 |
| 기관 정지 | `/login?error=no_access` (CURRENT 유지) | "접근 권한이 없는 계정입니다." | — |
| 콘텐츠 미준비 | 카드 비활성 · SY-02 | "수업 내용이 아직 준비되지 않았습니다." | — |

사유 · CO-1 유예 기간은 표시하지 않는다.

---

## 6. Screen Inventory 2.0

PHASE 02 [screen-inventory.md](../02-ia/screen-inventory.md)의 ID를 유지하고 PHASE 06 기준으로 재평가한다.

| ID | Route | Role | 주 목표 | 주 행동 | 보조 행동 | 핵심 상태 | 반응형 우선 | P | 처리 |
|---|---|---|---|---|---|---|---|---|---|
| SY-01 | not-found | 전체 | 안전한 실패 | 돌아가기 | — | 존재 무구분 | 전체 | P0 | Adapt |
| SY-02 | 상태 안내 | 교직원 | 상태 이해 | 문의 · 돌아가기 | — | 상품 미포함 · 기간 외 · 미준비 | 전체 | P0 | New |
| AU-01 | `/login` | 원장 · 교사 | 로그인 | 로그인 | 비밀번호 찾기 | no_access · 링크 오류 | mobile · desktop | P0 | Adapt (STARTER 착지) |
| TC-01 | `/teacher` | 교사 | 오늘 수업 파악 | [수업 준비] | 이어서 · 기록하기 | 수업 없음 · 미배정 · 미준비 · 읽기 전용 | tablet | P0 | Adapt |
| TC-02 | `.../before` | 교사 | 수업 준비 확인 | [수업 시작] | 준비물 체크 | 필수 N개 남음 · 취소됨 · 미준비 | tablet | P0 | New |
| TC-03 | `.../during` | 교사 | 수업 진행 | 다음 단계 · [수업 마치기] | 빠른 메모 · 상황 도움말 | offline · 이어서 | tablet | P0 | New |
| TC-04 | `.../attendance` | 교사 | 출결 | [출결 저장] | 모두 출석 | 충돌 · 읽기 전용 | mobile · tablet | P0 | Keep |
| TC-05 | `.../observations` | 교사 | 아동별 관찰 | [관찰 완료하고 다음 아이] | 임시저장 · 나중에 작성 · 관찰 마무리 | 방식 미선택 · 충돌 · AI 실패 · 사진 실패 · offline | tablet | P0 | Replace |
| TC-06 | `/teacher/history` | 교사 | 이력 | — | 필터 | 빈 이력 | 전체 | — | Keep |
| TC-07 | Weekly 대기열 | 교사 | 이번 주 리포트 준비 | [이번 주 리포트 만들기 (N명)] | 필터 | 관찰 필요 · 결석 · 숨김 | tablet · desktop | P0 | New |
| TC-08 | 리포트 작성 · 검토 | 교사 | 리포트 완료 | [리포트 완료] | 임시저장 · 수정본 만들기 · AI | 필수 누락 · 충돌 · 수정본 작성 중 · 숨김 | desktop | P0 | Replace |
| DR-01 | `/director` | 원장 | 운영 개요 | — | — | STARTER SY-02 · 집계 불가 | desktop | P0 | Adapt |
| DR-02 | `/director/sessions` | 원장 | 수업 운영 | 조회 · 출결 정정 | 취소 · **복구 처리** | 복구 사유 · 읽기 전용 | desktop | P0 | Adapt (동작 교체) |
| DR-03 · DR-04 | 이력 · 출결 | 원장 | 조회 · 정정 | [출결 저장] | — | 충돌 | desktop | — | Keep |
| DR-05 | 관찰 조회 | 원장 | 관찰 확인 | — | — | AI 초안 비노출 | desktop | P0 | Adapt |
| DR-06 · DR-07 | 리포트 목록 · 상세 | 원장 | 완료 리포트 관리 | [학부모 화면에서 숨기기] | 다시 공개 · 인쇄 | 숨김 · 수정본 작성 중 · 표시 중 | desktop | P0 | Adapt |
| DR-08 | `/director/portal` | 원장 | 학부모 공유 | 링크 발급 | 공유 링크 중지 · 사진 공유 기록 | 미발급 · 중지 · 미확인 | desktop | P0 | New |
| DR-09 | 일괄 인쇄 | 원장 | 인쇄 | 인쇄 | — | STARTER 숨김 · Hidden 제외 | desktop | P1 | New |
| HQ-02 | `/admin/readiness` | HQ | 활성화 판단 | [활성화] | 해결 링크 | 미준비 이유 · Pilot 초과 | desktop | P0 | Adapt |
| HQ-03 | `/admin/onboarding` | HQ | 도입 | 다음 단계 | — | Contract step | desktop | P0 | Adapt |
| HQ-04 · HQ-05 | 기관 목록 · 상세 | HQ | 기관 · 계약 관리 | 계약 · 이용권 | 반 · 원아 · 교사 | 계약 없음 · 초과 인원 | desktop | P0 | Adapt |
| HQ-06 | 수업 실행 관리 | HQ | 일정 | 일정 등록 | **복구 처리** | 일반 상태 전환 제거 | desktop | P0 | Adapt |
| HQ-09 | lesson 15섹션 | HQ | 콘텐츠 | 저장 | — | 필수 섹션 누락 | desktop | P0 | Adapt |
| HQ-10 | `/admin/leads` | admin · sales | 문의 | 상태 변경 | — | — | desktop | — | Keep |
| HQ-11 · HQ-12 | 상품 버전 · 계약 목록 | HQ | commercial admin | 새 버전 만들기 | — | 발행 불변 | desktop | P1 | New |
| PT-01 | `/share/portal/[portalId]` | 학부모 | 아이 기록 읽기 | 이번 주 · 지난 기록 | 인쇄 | 무효 링크 · 기록 없음 · 업데이트됨 | mobile | P0 | New |
| PT-02 | legacy share | 학부모 | legacy 리포트 | 인쇄 | — | 단일 실패 | mobile | — | Keep (문구 조정) |
| SL-S | Sales Shell | HQ Sales | 영업 | — | — | 아동 경로 없음 | desktop | P0 | New |

---

## 7. Search · Filter · Notification

| 역할 | P0 필터 |
|---|---|
| Teacher | 반 · 원아 · 주차 |
| Director | 반 · 교사 · 리포트 상태 |
| HQ Admin | 기관 · 계약 · 준비 상태 |
| HQ Sales | 문의 · 기관 · 계약 metadata |

전체 검색은 P0에 넣지 않는다. 알림 platform은 P0에서 새로 만들지 않고 대기열 · 상태 · 화면 내 count로 해결한다 (UI-10 DEFERRED P1). **STARTER 원장에게 Dashboard 집계 · 누락 count를 우회 제공하지 않는다.**

---

## 8. Information Disclosure

| 역할 | 보이지 않는 것 |
|---|---|
| Teacher | 다른 반 원아 · 계약 상세 · 초과 인원 commercial 경고 |
| Director | AI 초안 · 교사 초안 · 빠른 메모 · audit_events 전체 |
| HQ Admin | 민감 교육 콘텐츠의 일반 browsing (지원 흐름만) |
| HQ Sales | 아동 단위 데이터 전부 |
| Parent | 다른 아동 · 내부 상태 · 초안 · raw Stage · consent · audit |
| Public | 내부 준비 상태 · 기능 readiness |

권한 없음 화면에서 대상의 존재 여부를 드러내지 않는다 (SY-01).
