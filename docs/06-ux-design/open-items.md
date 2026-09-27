# UX / Design — Open Items

| | |
|---|---|
| 문서 상태 | PHASE 06 승인본 (문서 검토 대기) |
| 작성 기준일 | 2026-09-27 |
| 상위 문서 | [architecture-overview.md](./architecture-overview.md) |
| 관련 결정 | DEC-097 ~ DEC-112 |

---

## 0. 규칙

| # | 규칙 |
|---|---|
| 1 | `UX-` = PHASE 06 분석의 결정 후보 번호 (확정되어 DEC-097 ~ DEC-112로 이동). `UI-` = PHASE 06 UX open item. 두 접두어는 PHASE 06 이전 문서에서 사용된 적이 없다 |
| 2 | 기존 `U-1 ~ U-9` (product-definition UX 원칙) · Architecture Invariant `AI-*`와 섞지 않는다 |
| 3 | UX 문구로 법적 결론을 만들지 않는다 (CO-2 · CO-9 · CO-10 · CO-12 · DB-9) |
| 4 | 새 Decision은 DEC-113부터 |
| 5 | 새 UI 번호를 불필요하게 추가하지 않는다 |

---

## 1. UI-1 ~ UI-10 Final Status

| ID | 항목 | 상태 |
|---|---|---|
| UI-1 | Hidden report print | ✅ **RESOLVED by DEC-102** — Hidden은 internal 일반 · 일괄 인쇄 불가 · 정정 + 권한자 다시 공개 후 가능 · 법적 export는 CO-2 |
| UI-2 | Parent photo unavailable | ✅ **RESOLVED by DEC-103** — 사진 영역 자체 미표시 · 사유 · placeholder 없음 · Internal만 안내 |
| UI-3 | Parent organization naming | ✅ **RESOLVED by DEC-103** — 실제 기관 display name · fallback "기관" · "원" hardcode 없음 |
| UI-4 | HQ Contract/Product P0 위치 | ✅ **RESOLVED by DEC-106** — P0 = 기관 상세 "계약 · 이용권" section + onboarding Contract step · 독립 목록은 P1 |
| UI-5 | Yellow · Serif | ✅ **RESOLVED by DEC-109** — Yellow는 Target token 아님 · serif italic 제거 · Pretendard 중심 |
| UI-6 | Marketing copy · code sync | 🔧 **IMPLEMENTATION SYNC (PHASE 07)** — Product Decision Open Item 아님 (§5) |
| UI-7 | Offline UX baseline | ✅ **RESOLVED by DEC-098** (UX behavior) — 완전 offline sync는 P2 · AD-12 확장으로 deferred |
| UI-8 | DEC-041 Director cutover copy | ✅ **RESOLVED by DEC-112** |
| UI-9 | Director teacher invite · assignment UX | ⏳ **OPEN** — dependency = PH3-2. 운영 정보 조회와 초대 · 배정 수정 권한은 구분한다 |
| UI-10 | Notification system 필요성 | ⏸ **DEFERRED P1** — P0는 대기열 · 상태 · 화면 내 count · STARTER 우회 집계 금지 |

---

## 2. 기존 항목 상태

| ID | 상태 |
|---|---|
| AR-9 | ✅ RESOLVED (DEC-075 구조 + **DEC-102 copy "업데이트됨 YYYY.MM.DD"**) |
| IA-13 | ✅ Architecture RESOLVED (DEC-075) + **Parent 설명 copy RESOLVED (DEC-100)** |
| IA-3 | ✅ DEC-086 그대로 |
| AR-1 | OPEN — Monthly · Semester 최소 근거 (UI에 숫자 쓰지 않음) |
| AR-2 | OPEN — Semester Portfolio · PREMIUM Term 경계 (UI hardcode 금지) |
| AR-5 | OPEN — 다국어 |
| AR-8 | OPEN — 자유 텍스트 개인정보 · 외부 P0 AI 사용 전 필수 (완전 보호 약속 문구 금지) |
| AR-10 | OPEN — AI usage limit |
| CO-1 | OPEN — Read-only 유예 기간 (banner에 기간 표기 안 함) |
| CO-3 · CO-8 | OPEN — Pilot 가격 · 브랜딩 |
| DB-1 · DB-5 · DB-6 · DB-8 · DB-9 | OPEN (PHASE 05 그대로) |
| PH3-2 | OPEN — UI-9 의존 |
| AD-12 | UX 부분은 DEC-098 · 완전 sync는 P2 |
| AD-14 | OPEN — anon rate limit (PHASE 07) |
| Weekly 사진 | **DEC-039 = 0~3장 선택** · 0장 정상 · 선택 사항 · 결정 완료 (PHASE 07은 구현 세부만) |
| Typed-name 확인 · AI 요청 취소 | PHASE 07 사용성 · 기술 확인 (DEC-105 · DEC-111) |
| 파생 색 대비 | PHASE 07 contrast tool 검증 (DEC-109) |

---

## 3. Production Blockers (변경 없음)

| ID | 항목 | UX 영향 |
|---|---|---|
| **CO-2** | 보존 · 삭제 · export | 사진 삭제 · 빠른 메모 보존 문구에 기간 · "영구 삭제" 표현 금지 |
| **CO-9** | 단체 사진 | 단체 사진 UX 없음 · Parent 사진 Production 금지 |
| **CO-10** | Consent 법적 의미 · 문구 | "사진 공유 기록"은 운영 표시 · 법적 동의 표현 금지 |
| **CO-12** | Portal 만료 · 재발급 | 실패 문구 · 안내에 기간 표기 금지 |

추가: External Parent Photo Publication = **CO-9 · CO-10 · DB-9** 해결 후.

---

## 4. PHASE 07 Implementation Inputs

### 4-1. 구현 우선순위

| 순위 | 범위 |
|---|---|
| **0 — Security / decision violations** | HQ Sales vs Admin Shell · data 분리 · 세션 상태 action 교체 (카드 직접 시작/완료 제거 · scheduled → completed 제거 · 원장/HQ 일반 완료 제거 · 복구 처리) · 원장 AI 초안 노출 제거 · STARTER Dashboard gate |
| **1 — Foundation** | design token · focus · 접근성 primitive · Button · Dialog (focus trap) · StatusBadge · Error/Empty/SY-01/SY-02 · App Shell |
| **2 — Core Teacher** | Class Mode · BEFORE · DURING · Observation · 관찰 포인트 · 빠른 메모 · offline banner |
| **3 — Report** | Weekly composer · 대기열 · 수정본 · 숨김/다시 공개 · 인쇄 |
| **4 — Parent** | 아이 기록 · 빈/실패 · 이번 주 판정 · 사진 eligibility |
| **5 — HQ** | 계약 · 이용권 · Readiness checklist · 복구 처리 · 지원 목적 열람 |
| **6 — Marketing** | visual refactor (Yellow · serif 정리) · copy sync (UI-6) |

**PHASE 05 DB · RLS 구현 dependency와 실제 migration 순서(M0 ~ M6)를 함께 고려한다.** 예: Sales Shell 분리는 DEC-079 헬퍼 분리와, 세션 action 교체는 DEC-085 RPC와, Weekly는 DEC-089 리포트 구조와 같은 단계에 맞춘다.

### 4-2. 확인 · 결정 필요 (구현 중)

| # | 항목 |
|---|---|
| 1 | 사진 0~3장 picker 구현 · 선택/업로드 validation · photo eligibility filtering · responsive gallery layout · signed URL (DB-9 의존) |
| 2 | Product Version Publish 강한 확인 방식 (typed-name 포함 여부) |
| 3 | AI 요청 abort/cancel 기술 지원 여부 |
| 4 | 파생 색 contrast 측정 · 확정 |
| 5 | "이번 주" timezone · date utility |
| 6 | Class Mode touch target 크기 확정 |
| 7 | 기존 Admin UI 민감 테이블 직접 조회 화면 목록 (DEC-093 Cutover 호환) |
| 8 | Legacy 공유 실패 문구 조정 (원인 나열 제거) |

---

## 5. Marketing Sync Items (UI-6 · Implementation Sync)

| 구분 | 항목 | 처리 |
|---|---|---|
| 공식 Decision으로 해결됨 | STANDARD 비교표 Weekly 누락 (X-1) 등 | PHASE 07에서 marketing code 수정 |
| Source conflict 유지 | 대상 연령 (X-2) · 수업 시간 (X-4) · PREMIUM "연간" 표현 (X-7) | 기존 conflict 상태 유지 · PHASE 06 copy가 해결하지 않음 |
| Visual | Yellow CTA · serif italic · backdrop-blur | Target palette · token으로 정리 |
| 미사용 코드 | `PurchaseSection` · `purchaseCopy` (결제 · 구독 흐름 문구) | 렌더링하지 않음 유지 (DEC-061) · 정리는 PHASE 07 판단 |
