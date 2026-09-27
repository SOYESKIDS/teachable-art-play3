# Open Items — PHASE 02 (User Flow / IA)

| | |
|---|---|
| 문서 상태 | 운영 중 (PHASE 02에서 남은 미확정 사항만 기록) |
| 최종 갱신 | 2026-09-26 |
| Branch / 기준 commit | `saas-v2` / `0ceb8ad` |
| 관련 문서 | [../00-project/decision-log.md](../00-project/decision-log.md) · [../01-product/open-items.md](../01-product/open-items.md) |

---

## 0. 규칙

| # | 규칙 |
|---|---|
| 1 | [../01-product/open-items.md](../01-product/open-items.md)의 규칙을 그대로 따른다. 확정된 것은 decision-log로 옮기고 여기서 제거한다 |
| 2 | ID 접두어: `IA-` (PHASE 02 제품·흐름 미결정) · `AH-` (PHASE 05로 넘기는 Architecture Handoff) |
| 3 | 한 번 쓴 IA 번호는 재사용하지 않는다 |
| 4 | 01-product/open-items.md에 이미 있는 항목은 새 ID를 만들지 않고 §4에서 참조만 한다 |

---

## 1. PHASE 02 검토에서 확정되어 제거된 항목

| 구 ID | 내용 | 확정 |
|---|---|---|
| IA-1 | Quick Memo 보존 위치 | → **DEC-035** (교사 전용 서버 임시저장) |
| IA-2 | BEFORE 체크 보존 | → **DEC-036** (선택 체크는 편의 · 필수 안전·개인정보 확인은 서버 보존 · 수업 시작 조건) |
| IA-4 | Portal P0 Navigation | → **DEC-042** (이번 주 · 지난 기록) |
| IA-5 | Portal 신규 route | → **DEC-040** (`/share/portal/[portalId]`) |
| IA-7 | 원장의 리포트 1건 숨김 | → **DEC-043** (Emergency Hide **P0**) |
| IA-14 | 기존 report share 퇴역 시점 | → **DEC-041** (Production Cutover 시 신규 발급 중단 · 기발급분은 만료/중지까지 동작) |
| IA-18 | 오늘 보드 · 원장 [수업 시작]과 BEFORE 필수 확인의 관계 | → **DEC-046** (Class Mode 적용 세션의 `scheduled → in_progress`는 Teacher BEFORE 경로로 단일화 · 우회 경로 없음 · 비상 강제 경로는 PHASE 05 검토) |
| IA-19 | `scheduled → completed` 직접 전환(빠른 완료) 유지 여부 | → **DEC-047** (Class Mode 적용 세션에서 교사 · 원장 · HQ 일반 UI 모두 금지 · 취소는 유지 · 1.0 과거 기록 불변 · Emergency Override는 PHASE 05 검토) |

---

## 2. Open Decisions (PHASE 02 종료 시 9건 → PHASE 03 이후 미해결 2건: IA-3 · IA-13 → PHASE 04 이후: IA-3만 Open · IA-13은 Copy만 PHASE 06)

> 2026-09-27 PHASE 03 상태 정합화: 해결 항목은 삭제하지 않고 상태를 표시한다. 잔여 부분은 [../03-commerce/open-items.md](../03-commerce/open-items.md)의 CO 항목으로 관리한다.

| ID | 항목 | 현재 상태 / 논점 | 권고 (확정 아님) | Owner | 확정 PHASE |
|---|---|---|---|---|---|
| **IA-3** | Growth 지표 미선택 시 저장 방식 | (A) 행 없음 = NOT_OBSERVED / (B) NOT_OBSERVED 명시 저장. 제품 개념 4 states · UX 3 choices는 DEC-038로 확정. 지표만 선택하고 방식을 고르지 않은 경우의 저장 처리도 포함 | (A) | Architecture | PHASE 05 (AD-3 연동) |
| **IA-6** | 사진 동의의 운영정책 · 법적 단위 | 🟡 **Resolved portion**: 운영 책임 (**DEC-059**) / **Remaining portion**: 법적 단위 · 문구 · 단체 사진 → **CO-9 · CO-10** · (이전 논점) 누가 입력하는가(원장 / HQ) · 단위(아동 단위 동의 여부 / 촬영 · 학부모 공유 분리 여부) · 철회 처리 · 증빙 보관. BEFORE 필수 확인 · Pilot Ready G-8 · Portal 사진 노출이 모두 의존 | 원장이 아동 단위로 입력 | Product + 법무 | PHASE 03 |
| **IA-8** | HQ sales의 원아 명단 열람 | ✅ **RESOLVED by DEC-058** (원아 명단 불가) · (이전 논점) 관찰기록 · 사진 금지는 HARD. 기관 상세의 원아 이름 목록은 미정 | 불가 | Product + 보안 | PHASE 03 |
| **IA-9** | 정규 STARTER 원장의 비대시보드 Feature 최종 목록 | ✅ **RESOLVED by DEC-056** · (이전 논점) `/director` 홈 미포함은 HARD. 수업 운영 · 이력 · 출결 · 리포트 조회 · 학부모 공유 허용 범위 | 허용 (C-5 성립 조건) | Product + 사업 | PHASE 03 (BP-11) |
| **IA-10** | 계약 종료 후 Read-only 기간 | 🟡 **Resolved portion**: 접근 모델 (**DEC-052**) / **Remaining portion**: 유예 기간 → **CO-1** · 보관·파기 → **CO-2** · (이전 논점) 종료 후 기록 열람 · 학부모 Portal 유지 · 이관/파기 시점 | 일정 기간 읽기 전용 | 사업 + 법무 | PHASE 03 (BP-17) |
| **IA-11** | 결석 주차의 Parent 표시 | ✅ **RESOLVED by DEC-060** (결석 표시 없음 · 사유 무구분 · 이전 리포트를 "이번 주"로 보이지 않음 · 실제 week/date 표시) · (이전 논점) 리포트는 만들지 않는다(확정). Portal에 "이번 주 결석" 흔적을 둘지 | 표시 안 함 | Product (교육) | PHASE 03 |
| **IA-12** | 좌석 초과 정책 최종 | ✅ **RESOLVED by DEC-051** (반 수 HARD · 원아 ALLOW + OVERAGE RECORD · Pilot 15명 초과 Ready 불가) · 청구 방식은 BP-6 유지 · (이전 논점) 반 수 · 반당 원아 수 초과 시 경고 / 차단. 초과요금 자동청구는 없음(DEC-018) | 경고 | 사업 | PHASE 03 (BP-6 · BP-7) |
| **IA-13** | Parent Weekly의 Stage 최종 표현 | 🟡 **Architecture RESOLVED by DEC-075** (Stage chip · raw label 미노출 · 지표명 + 구체적 Evidence 서술 · 고정 안내 문구 · Monthly/Semester는 사례 narrative만) / **Remaining: 한국어 Copy → PHASE 06** · (이전 논점) Stage 라벨을 그대로 노출할지, 서술문으로 풀어 쓸지. U-1 · U-3 · PH3-1과 연결 | 서술문 | Product (교육) | PHASE 04 · 06 |
| **IA-15** | STANDARD의 Weekly 포함 여부 | ✅ **RESOLVED by DEC-057** (STANDARD Weekly 포함) · (이전 논점) PHASE 02 HARD RULE 목록에는 STANDARD Weekly가 없고, DEC-010 비교표는 "STARTER 이상"으로 기재. 문서 간 차이 | — (추측 금지) | 사업 | PHASE 03 (BP-11 · BP-13) |

---

## 3. Architecture Handoff → PHASE 05 (5)

> 제품 요구는 확정되었고, 저장 구조 · RLS · 구현 방식만 남은 항목. Invariant(AI-1 ~ AI-17) 준수가 전제다.

| ID | 항목 | 확정된 제품 요구 | PHASE 05에서 정할 것 |
|---|---|---|---|
| **AH-1** | Quick Memo 저장 | DEC-035: 교사 전용 서버 임시저장 · Director/Parent/AI 비노출 · Observation 아님 | 저장 단위(세션 · 교사) · RLS · 보존 기간 · 삭제 · 동시 편집 · 오프라인 재전송 |
| **AH-2** | BEFORE 필수 확인 기록 · 세션 상태 흐름 단일화 | DEC-036 · DEC-046 · DEC-047: who · when · session · confirmation state · `scheduled → in_progress`는 Teacher BEFORE 경로만 · `scheduled → completed` 직접 전환 없음 · 취소 유지 | 저장 구조 · 확인 항목 버전(커리큘럼 개정 대응) · 여러 교사 반의 귀속 · 원장/HQ 조회 여부 · 서버/DB에서 단일 흐름 강제 방법 · Class Mode 적용 세션과 1.0 과거 세션의 구분 · **Emergency Override (admin only · explicit reason · actor · timestamp · audit log) 필요 여부와 설계** |
| **AH-3** | Report Emergency Hide | DEC-043: visible/hidden · reason · by · at · 원장 · HQ admin · Portal revoke와 분리 | 저장 위치 · Portal resolve 제외 조건 · 사진 스냅샷 노출 중단 · 감사 이력 · RLS(sales 제외) |
| **AH-4** | Required Content Set | DEC-037: 필수 데이터 부족 시 Class Mode 차단 · 선택 섹션은 숨김 | 15섹션 중 필수 목록 · 판정 위치(발행 게이트 / 진입 시점) · Pilot Ready 점검 방식 |
| **AH-5** | Child Portal resolve · DTO | DEC-040 · DEC-042 · DEC-044: 아동 단위 · 2탭 · 실패 무구분 · 노출 조건(complete ∧ 활성 ∧ visible) | 토큰 · 만료 · resolve RPC · DTO 필드 · 사진 anon 제공(AD-1) · rate limit(AD-14) · 조직 정지 시 동작 |

---

## 4. 기존 Open Item에 대한 PHASE 02 영향 (참조 · 신규 ID 없음)

| 01-product ID | 항목 | PHASE 02 영향 |
|---|---|---|
| **PH3-1** | Growth 5 시계열 표현 | DEC-039로 P0 Weekly는 비교 표기 없음 → **P0 차단 해소**. Portal 성장 탭(P1) · Monthly에서 다시 필요 |
| **PH3-3** | 리포트 reopen 정책 | Weekly 흐름에 PROPOSED placeholder만 둠. **Emergency Hide의 숨김 해제 · 정정 경로도 여기서 함께 확정** |
| **PH3-4** | Child Portal 링크 만료 기간 | 아동 단위 링크 1개를 학기 동안 쓰는 흐름(DEC-040)이 이 결정에 의존. CURRENT 30일 · ↪ **MOVED → 03-commerce CO-12** (Production Blocker) |
| **PH3-2** | 원장에게 교사 초대·배정 위임 | 변경 없음 (HQ 전용 유지 가정) |
| **BP-1 ~ BP-10** | 계약 · 결제 · 갱신 · 해지 · 단위 | Contract 상태 흐름(draft/active/suspended/ended)만 정의. 세부 정책은 PHASE 03 |
| **BP-11 · BP-13** | Entitlement feature 목록 · STARTER Weekly 범위 | IA-9 · IA-15를 함께 넘김 |
| **AD-2** | Entitlement 게이팅 구현 위치 | DEC-044의 404 / Not Entitled 구분을 만족해야 함 |
| **AD-3** | Growth 5 / Stage 저장 구조 | IA-3과 함께 결정 |
| **AD-12** | Class Mode 오프라인 전략 | P0: Step 위치 로컬 + Quick Memo 서버 (DEC-035) |

---

## 5. PHASE 03 Inputs

PHASE 03 (Product / Contract / Entitlement / Commerce) 착수 시 넘기는 입력.

| 항목 | 넘기는 내용 |
|---|---|
| Product feature boundary | `director_dashboard` = `/director` 홈 · STARTER 원장 비대시보드 범위 (IA-9) · STANDARD Weekly (IA-15) · Portal · Emergency Hide 전 상품 공통 여부 |
| Pilot entitlement | Week 1~4 · Weekly · Class Mode · Portal · Director Dashboard · Monthly 제외 · 좌석 경고/차단 (IA-12) |
| Organization provisioning | 온보딩 0단계 필수 입력 · 기존 운영 기관의 계약 소급 방식 |
| Contract activation | draft → active 트리거 (자동 / 수동) · 시작 전 로그인 경험 |
| Package access | SY-02 안내 화면의 정보 범위 · 404와의 구분 (DEC-044) |
| Upgrade path | STARTER → STANDARD 시 기록 · 리포트 · Portal 유지 · 대시보드 즉시 활성 (BP-9) |
| Expired contract UX | 읽기 전용 기간 · Portal 유지 · 이관/파기 (IA-10 · BP-17) |
| 사진 동의 | IA-6 |
| reopen · 숨김 해제 | PH3-3 |

---

## 6. P0 UX 리스크 (추적)

| # | 리스크 | 수준 | 완화 · 측정 |
|---|---|---|---|
| R-1 | Class Mode 정보 과부하 | 중 | DURING 기본 노출 = 핵심 문장 + 프롬프트. 나머지 펼침. V-12 |
| R-2 | 15명 AFTER 20분 | 중 | 기록 없음 기본값 · 모두 출석 · 저장하고 다음 아이 · Growth 5 필수 아님. V-2 |
| R-3 | Growth 5 + Stage가 평가처럼 보임 | **높음** | 중립색 · 무번호 · 고정 안내문 5곳 · 집계 화면 없음 · 오리엔테이션. V-4 · IA-13 |
| R-4 | Weekly 3분 | 낮음 | 일괄 조립 · 교사 입력 2항목 · 다음 아동 자동 이동. V-3 |
| R-5 | STARTER 대시보드 제외로 누락 발견 약화 | 중 | **DEC-031 변경 없음.** 리스크만 기록. 수업 운영 · 이력 허용(IA-9)으로 일부 완화 |
| R-6 | Portal 링크 1개 학기 유지 | 중 | PH3-4 만료 기간 · 재발급 시 기존 링크 무효 안내 · 실패 화면 "원에 새 링크 요청" 고정 |
| R-7 | P0 화면 수 | 낮음 | 신규 5 · 수정 19 ([screen-inventory.md §7](./screen-inventory.md#7-screen-count-inventory-1에서-계산)) |
| R-8 | Session completed 직후 follow-up 발생 | 낮음 | 의도된 동작 (DEC-034). 문구는 비난이 아니라 안내 |
| R-9 | 사진 동의 입력 지연 시 사진 전면 차단 | 중 | Pilot Ready 점검 항목 (G-8) · IA-6 |

---

## 7. PHASE 03 결정으로 갱신이 필요한 PHASE 02 서술 (정합화 대기)

> PHASE 03 문서 작업의 수정 허용 범위가 `docs/02-ia/open-items.md`로 제한되어, 아래 PHASE 02 본문은 이번에 고치지 않았다. **Decision Log가 우선한다.** 다음 docs 정합화 작업에서 반영한다.
>
> ✅ **2026-09-27 정합화 완료** (PHASE 03 최종 검토): 아래 각 위치에 `Updated by DEC-XXX` 주석으로 반영했다. STANDARD Weekly(DEC-057) · HQ SALES(DEC-058) · STARTER Director(DEC-056) · Parent "이번 주"(DEC-060) · Contract Ended(DEC-052). role-flows의 IA-6 · IA-10 · IA-12 참조는 이 문서 §2에 해결 상태가 표시되어 있어 본문을 바꾸지 않았다.

| 문서 · 위치 | 현재 서술 | 우선하는 결정 |
|---|---|---|
| [permission-matrix.md](./permission-matrix.md) §3 | STANDARD Weekly `◐ P (IA-15)` · 원장 비대시보드 기능 `◐ P (IA-9)` · Parent Portal `✅ P` | DEC-057 (STANDARD Weekly YES) · DEC-056 · DEC-055 |
| [permission-matrix.md](./permission-matrix.md) §2 | HQ SALES 원아 명단 `◐ P (IA-8)` · 계약 메타 `◐ 읽기 P` | DEC-058 |
| [permission-matrix.md](./permission-matrix.md) §4 | CONTRACT ENDED `P` | DEC-052 |
| [report-portal-flow.md](./report-portal-flow.md) §3 · §4-2 | "이번 주 = 가장 최근 노출 Weekly" · "직전 노출 리포트 또는 빈 상태" | **DEC-060** — 이전 리포트를 "이번 주"로 보이지 않음 · "현재 새로 공유된 기록이 없습니다" + 최근 공유 기록(Week · 날짜) |
| [report-portal-flow.md](./report-portal-flow.md) §1-3 | 결석 아동 Portal 표시 IA-11 | DEC-060 |
| [role-flows.md](./role-flows.md) §2 · §3 | 사진 동의 IA-6 · STARTER 원장 IA-9 | DEC-059 · DEC-056 |
| [ia-overview.md](./ia-overview.md) §4 | STARTER 원장 "나머지 경계는 PROVISIONAL (IA-9)" | DEC-056 |
