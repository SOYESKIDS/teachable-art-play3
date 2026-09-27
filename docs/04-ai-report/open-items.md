# Open Items — PHASE 04 (AI Growth / Report)

| | |
|---|---|
| 문서 상태 | 운영 중 |
| 최종 갱신 | 2026-09-27 |
| Branch / 기준 commit | `saas-v2` / `11269e6` |
| 관련 문서 | [../00-project/decision-log.md](../00-project/decision-log.md) · [../01-product/open-items.md](../01-product/open-items.md) · [../02-ia/open-items.md](../02-ia/open-items.md) · [../03-commerce/open-items.md](../03-commerce/open-items.md) |

---

## 0. 규칙

### 0-1. ID Namespaces

| Namespace | 의미 | 정의 위치 |
|---|---|---|
| **`AI-XX`** | **Architecture Invariant** (AI-1 ~ AI-17) | [../00-project/project-charter.md §5](../00-project/project-charter.md) — **Open Item ID로 사용 금지** |
| **`AR-XX`** | **AI / Report Product Open Item** (PHASE 04 이후 AI · Report 미결정 사항) | 이 문서 |
| `DEC-XXX` | 승인된 project / product decision | [../00-project/decision-log.md](../00-project/decision-log.md) |
| `CO-XX` | Commerce open item | [../03-commerce/open-items.md](../03-commerce/open-items.md) |
| `IA-XX` | Information Architecture open item | [../02-ia/open-items.md](../02-ia/open-items.md) |
| `PH3-X` · `BP-X` · `BC-X` · `AD-X` | PHASE 01 open items (보존된 legacy 식별자) | [../01-product/open-items.md](../01-product/open-items.md) |
| `AH-X` | PHASE 05 Architecture Handoff | [../02-ia/open-items.md](../02-ia/open-items.md) |

- 향후 새 AI / Report Open Item에는 **`AI-` 접두어를 사용하지 않는다.**
- *Namespace correction (2026-09-27, commit 전)*: PHASE 04 초안의 Open Item `AI-1 ~ AI-9`는 Invariant와 충돌하여 **숫자를 유지한 채 `AR-1 ~ AR-9`로 변경**했다. 번호 없이 남아 있던 AI Usage Limit은 **AR-10**으로 부여했다. DEC-064 ~ DEC-078 본문의 Open Item 참조도 AR로 정정했다 (의미 변경 없음).

### 0-2. 운영 규칙

| # | 규칙 |
|---|---|
| 1 | ID 접두어 `AR-`. 한 번 쓴 번호는 재사용하지 않는다 |
| 2 | 해결 항목은 삭제하지 않고 `RESOLVED by DEC-XXX` · `DEFERRED` 등으로 표시한다 |
| 3 | 법무 · 사업 · 교육 확인이 필요한 것은 억지로 결정하지 않는다 |

---

## 1. PHASE 04에서 해결된 항목

| ID | 항목 | 상태 |
|---|---|---|
| **CO-4** | STARTER "8주 요약" | ✅ **RESOLVED by DEC-069** — Program Completion Summary View (새 report_type 아님) · STARTER 활성화 전 Ready |
| **CO-5** | "AI 성장기록 플랫폼 Full" · `ai_assist` | ✅ **RESOLVED by DEC-070** — STARTER 제외 · STANDARD/PREMIUM 포함(C1+C2+C3) · PILOT C1 |
| **PH3-3** | 리포트 reopen · 숨김 해제 | ✅ **RESOLVED by DEC-073 · DEC-074** — 새 Revision · 사유 필수 · 논리 리포트 단위 hide/unhide · 자동 해제 없음 |
| **PH3-1** | Growth 5 시계열 표현 | ✅ **RESOLVED by DEC-065 · DEC-075** — 같은 아이 시간순 사례 · 단계 증감 표기 없음 |
| **IA-13** | Parent Weekly Stage 표현 | 🟡 **Architecture RESOLVED by DEC-075** (Stage chip · raw label 미노출 · 사례 서술) / **Copy → PHASE 06** → ✅ **RESOLVED by DEC-100** |
| AR-3 | Weekly 교사 관찰 기본 채움 규칙 | ✅ **RESOLVED by DEC-066** — Note prefill · Complete 행위가 확인 · 별도 체크박스 없음 |
| AR-4 | Legacy Report의 신규 Portal 표시 | ✅ **RESOLVED by DEC-076** — 자동 편입 없음 · Legacy Share Link로만 |
| AR-6 | AI Stage 추천 | ⏸ **DEFERRED / NOT PLANNED BY DEFAULT** (DEC-075) — 도입 시 새 Product Decision |
| AR-7 | Director Growth 5 Stage 분포 | ⏸ **DEFERRED / NOT PLANNED BY DEFAULT** (DEC-075) — P0/P1 없음 · 평가 Dashboard로 확장하지 않음 |
| AR-9 | Parent Revision history · "업데이트됨" | ✅ **RESOLVED by DEC-075** — history 비노출 · revision > 1이면 "업데이트됨 YYYY.MM.DD" |
| **PH3-5** | AI 원본 응답 저장 범위 | ✅ **RESOLVED by DEC-078** — raw provider request/response body · envelope · 전체 prompt · 실패/거부 raw output **미저장** · validated structured draft + provenance + sanitized error만 저장 · 로그 최소화 |

> **ID 주의**: PH3-5는 DEC-078로 해결되었으며 **새 AR 번호를 부여하지 않는다.** (초안에서 Open Item ID로 잠시 쓰였던 "AI-10"은 Invariant AI-10과 충돌하여 폐기했다. Invariant AI-1 ~ AI-17은 그대로다.)

---

## 2. Remaining AR Open Items

| ID | 항목 | 논점 | Owner | Required-by | Blocker |
|---|---|---|---|---|---|
| **AR-1** | Monthly · Semester 최소 Evidence 기준 | 4주 블록 중 몇 주 · 학기 중 몇 주 이상일 때 C2 생성 · 완료를 권장할지 (생성 차단 아님 · DEC-071) | 교육 + 제품 | P1 Monthly 전 | — |
| **AR-2** | Semester Portfolio 상세 구성 + PREMIUM Reporting Term 경계 | 대표 근거 수 · 섹션 · PREMIUM 24주가 1회인지 학기 경계가 있는지 (DEC-068) | 교육 + 제품 | P2 Semester 전 | — |
| **AR-5** | 다국어 | Source evidence · Report · AI output 언어 분리 | 제품 | 보류 | — |
| **AR-8** | 자유 텍스트 속 개인정보 최소화 | 교사 노트 · 인용 안의 아동 · 다른 아동 · 사람 정보 처리 (placeholder · 경고 · 제거) | Privacy + PHASE 07 | **BEFORE EXTERNAL P0 AI USE** | **외부 AI 사용 Blocker** (Pilot은 AI OFF로 진행 가능) |
| **AR-10** | AI usage limit / quota / generation limit | 호출 · 토큰 · 생성 수 한도. 가격 · 정확한 limit 값은 정하지 않음 | Business / Product | P1+ | — |

### 2-1. AR 최종 상태표

| ID | 항목 | 상태 |
|---|---|---|
| AR-1 | Monthly · Semester 최소 Evidence 기준 | **OPEN** |
| AR-2 | Semester Portfolio 상세 구성 + PREMIUM Reporting Term boundary | **OPEN** |
| AR-3 | Weekly Teacher Observation prefill rule | ✅ RESOLVED by DEC-066 |
| AR-4 | Legacy Report 신규 Child Portal 자동 미편입 | ✅ RESOLVED by DEC-076 |
| AR-5 | 다국어 | **OPEN** |
| AR-6 | AI Growth 5 Stage recommendation | ⏸ DEFERRED / EXCLUDED BY DEFAULT (DEC-075) |
| AR-7 | Director Growth 5 Stage distribution | ⏸ DEFERRED / EXCLUDED BY DEFAULT (DEC-075) |
| AR-8 | 자유 텍스트 개인정보 최소화 | **OPEN** — Required before external P0 AI use |
| AR-9 | Parent revision update label structure | ✅ RESOLVED by DEC-075 · **Copy RESOLVED by DEC-102 ("업데이트됨 YYYY.MM.DD")** |
| AR-10 | AI usage limit | **OPEN** — P1+ business decision |

---

## 3. 관련 CO · 기존 항목

| ID | 항목 | 상태 · PHASE 04 관계 |
|---|---|---|
| **CO-2** | 데이터 보관 · 파기 · Export | 🔴 **Production Blocker** — 완료 Revision · Snapshot · AI attempt 보존 기간 포함 |
| **CO-9** | 단체 사진 내 다른 아동 식별 | 🔴 **Production Blocker** |
| **CO-10** | Consent 법적 단위 · 문구 · Privacy 고지 | 🔴 **Production Blocker** — AR-8(제품 · 구현 요구)과 구분 |
| **CO-12** | Portal 만료 · 재발급 | 🔴 **Production Blocker** — Revision은 같은 Portal에서 표시 (정책 분리) |
| CO-1 | Read-only 유예 기간 | Open · 계약 종료 후 리포트 조회 기간에 영향 |
| CO-11 | 달력 계약 기간 vs 운영 주차 | Open · **리포트 기간 쪽 의존은 DEC-067로 해소** · 계약 기간 문제는 남음 |
| IA-3 | Stage 저장 방식 (absent vs NOT_OBSERVED) | ✅ RESOLVED by DEC-086 (행 없음 = 기록 없음 · stage NOT NULL · `together`) |
| PH3-9 | 워크북 optional evidence | PHASE 04 이후 (변경 없음) |

---

## 4. Blockers

| 구분 | 항목 |
|---|---|
| **Production Blocker** | CO-2 · CO-9 · CO-10 · CO-12 |
| **External P0 AI Use Blocker** | AR-8 (해결 전 Pilot은 AI OFF 운영) |
| **Pilot 기능 전제 (P0)** | AI dependency 제거 (GR003 · `ai_draft_id` 등) — AI OFF 운영(V-7)을 위해 필수 · *Clarified by PHASE 05 DB architecture (DEC-091): 신규 2.0 경로(`reports` · `report_revisions` · `report_revision_evidence`)에 AI 필수 의존을 두지 않음으로써 달성한다. legacy 스키마는 Cutover까지 현재 제약 유지(운영 중 NOT NULL 부분 완화 · GR003 부분 제거 없음) → Cutover에서 legacy write 중지 · read-only* |
| **STARTER Production Activation 전** | 8주 Summary View (DEC-069) · 목록 서버 페이징 |
| **STANDARD · PREMIUM Production Activation 전** | Monthly · Semester · C1+C2+C3 AI capability · Week 9~24 production content (DEC-063 · DEC-070) |

---

## 5. PHASE 05 Inputs (DB / Security — 개념 요구, SQL 아님)

> *2026-09-27 PHASE 05 처리: Growth 5 DEC-086 · Logical Report · Revision DEC-089 · Snapshot DEC-090 · Hide · Portal DEC-092 · AI generation · AI dependency DEC-091 · Audit DEC-093 · Entitlement DEC-083 · Legacy DEC-094. **working revision은 포인터를 저장하지 않고 `status = draft` 부분 unique로 파생 · 논리 리포트는 `latest_completed_revision_id` 개념 포인터 (DEC-089)**. 상세 [../05-data-security/](../05-data-security/)*

| 영역 | 요구 |
|---|---|
| Growth 5 | 공식 5지표 코드 · 구 5영역 historical 공존 · 관찰 × 지표 × Stage 저장 (IA-3) |
| Logical Report | 유형 · 아동 · 배정 · 기간(week · program month index · reporting term) · **unique logical identity** |
| Reporting period | flexible (Reporting Term) |
| Revision | revision number · reason · status · **working_revision** · **latest_completed_revision** 구분 · authorship (creator · last editor · completer) |
| Snapshot | Evidence Snapshot + Final Content Snapshot · media refs · template version |
| Hide | logical report 단위 hide state · hide/unhide audit (사유 · actor · 시각) |
| Visibility | 계산 의존성: latest completed · hidden · Portal active · Contract policy (DEC-052) |
| AI generation | attempt 단위. **저장**: validated structured draft · provenance · sourceRefs · validation metadata · status · sanitized error category · retry relation · (있으면) provider response_id · usage. **저장하지 않음**: raw provider request/response body · envelope · 전체 prompt · 실패/거부 raw output (DEC-078). **raw_response 같은 TEXT/JSONB 컬럼을 기본 설계에 두지 않는다** |
| **AI dependency 제거** | **GR003 제거 · `ai_draft_id` 필수 의존 제거 · `reviewed_text_snapshot` · `source_ai_updated_at` NOT NULL 해제 · 근거 조건 = 완료된 관찰** · *Clarified by PHASE 05 DB architecture (DEC-091): 신규 2.0 경로(`reports` · `report_revisions` · `report_revision_evidence`)에 AI 필수 의존을 두지 않음으로써 달성한다. legacy 스키마는 Cutover까지 현재 제약 유지(운영 중 NOT NULL 부분 완화 · GR003 부분 제거 없음) → Cutover에서 legacy write 중지 · read-only* |
| Legacy | `legacy_period` · read-only · 기존 unique와 공존 · 기존 AI 초안 보존 |
| Concurrency | 낙관적 동시성 유지 (Invariant AI-6) |
| Consent | 사진 표시 차단을 Snapshot 불변과 분리 |
| Entitlement | AI 호출 · 리포트 유형 생성에 `ai_assist` · report entitlement · 계약 효력 반영 |
| Access | AI 생성 Teacher만 · Director AI draft 비노출 유지 · Sales 리포트 접근 없음 · hide/unhide Director · HQ admin |

---

## 6. PHASE 06 Inputs (UX Copy)

> *2026-09-27 PHASE 06 처리: Parent Growth5 문구 DEC-100 · "업데이트됨" DEC-102 · 8주 명칭 · 월간 표기 DEC-104 · AI 실패 · 근거 부족 DEC-105 · 숨김 사유 DEC-102. 정정 사유 선택지는 PHASE 07 구현 시 확정 — [../06-ux-design/copy-terminology.md](../06-ux-design/copy-terminology.md)*

| 항목 |
|---|
| Parent Growth 5 서술 문구 · 고정 안내 문구 (DEC-075) |
| "업데이트됨 YYYY.MM.DD" 문구 · 위치 (AR-9 구조 RESOLVED · Copy만 PHASE 06) |
| 8주 요약 명칭 ("8주 기록 요약" / "8주 기록 모아보기") |
| "월간 요약 리포트 · 4주 단위" 표기 (DEC-067) |
| AI 실패 · 근거 부족 안내 문구 |
| 정정 사유 선택지 · 숨김 사유 선택지 |

---

## 7. PHASE 07 Inputs (Implementation)

| 항목 |
|---|
| deterministic Weekly assembler · Weekly batch queue · 교사 관찰 prefill |
| AI server-only provider (컴파일 단계 강제) · AR-8 PII 최소화 · 이름 placeholder 치환 |
| **DEC-078**: provider raw request/response logging 금지 · structured validated output만 persistence · sanitized error logging · provider response id는 metadata로만 · secret · prompt · evidence · output body 로그 금지 · AI failure 시 manual fallback |
| C2 · C3 structured output · 규칙 기반 validation (스키마 · 금지어 · 인용 원문 · ref) |
| AI manual fallback · generation 중복 방지 · attempt 이력 |
| Revision UX (정정 · 사유) · hide/unhide UX |
| Parent DTO · 실제 week/date · "업데이트됨" label · 이번 주 판정 |
| 8주 Summary View |
| 서버 페이징 · 필터 |
| Print = Final Content Snapshot만 · AI Draft 인쇄 금지 |
| 근거 추적 UI (P2) |
