# Legacy Migration — Observation · Report · Share

| | |
|---|---|
| 문서 상태 | PHASE 04 승인본 |
| 작성 기준일 | 2026-09-27 |
| Branch / 기준 commit | `saas-v2` / `11269e6` |
| 관련 문서 | [report-lifecycle.md](./report-lifecycle.md) · [../02-ia/report-portal-flow.md §6](../02-ia/report-portal-flow.md) |
| 관련 결정 | DEC-006 · DEC-011 · DEC-041 · DEC-076 |

> 실제 데이터 이관 절차 · SQL은 PHASE 05 · 07.

---

## 1. Legacy Observation

| 항목 | 정책 |
|---|---|
| 기존 관찰 기록 | **그대로 보존** (노트 · 아이의 말 · 사진 · 완료 상태) |
| 구 5영역 태그 (`color_expression` · `form_space` · `detail_expression` · `creative_extension` · `activity_completion`) | `inactive` / historical. 기존 태그는 **historical 라벨로 표시** (DEC-006) |
| 공식 Growth 5 | **새 기록부터** 사용 |
| 구 5영역 → Growth 5 | **자동 매핑 금지** — 체계가 다르다. `form_space`(형태·공간 구성)처럼 이름이 같은 항목도 기존 기록이 신규 정의(DEC-065) 기준으로 태그되었다고 보장할 수 없고, 구 영역에는 Stage가 없다 |
| AI 자동 변환 | **금지** — 판정에 해당한다 |
| 관리자 수동 이관 | 기본안 아님. 필요성이 생기면 별도 Decision (P2 이후) |

| 후보 | 평가 |
|---|---|
| **A. Legacy 그대로 보존 + B. 새 Growth 5 기록만 신규 적용** | **채택** |
| C. 관리자 수동 migration | 기본안 아님 |
| AI 자동 변환 | 금지 |

---

## 2. Legacy Observation AI Drafts

| 항목 | 정책 |
|---|---|
| 기존 `class_session_observation_ai_drafts` | 보존 (감사용) |
| 리포트 근거 조건 | 2.0에서는 AI 초안 수락 여부를 근거 조건으로 쓰지 않는다 (DEC-071) |

---

## 3. Legacy Report

| 항목 | 정책 |
|---|---|
| 기존 3블록 기간 리포트 (`child_growth_reports`) | 유형 `legacy_period` · **read-only** |
| 자동 변환 | **없음** — Weekly · Monthly · Semester로 억지 변환하지 않는다 |
| 기존 리포트 AI 초안 (`child_growth_report_ai_drafts`) | 보존 (감사용) |
| 기존 근거 스냅샷 | 보존 (AI-11) |
| 3블록 구조 | Monthly 출력 구조에 재사용 가능 (DEC-011) — 기존 데이터 변환이 아니라 구조 재사용 |
| 교직원 조회 | 리포트 목록에서 유형 "기존 기간 리포트"로 조회 가능 (read-only) |

---

## 4. Legacy Share Links (DEC-041)

| 시점 | `/share/growth-report/[shareId]` |
|---|---|
| 개발 중 | 신규 발급 계속 · 정상 동작 |
| Child Secure Portal **Production Cutover** | 신규 발급 중단 |
| Cutover 이후 | 기발급 링크는 **만료 또는 revoked까지 정상 동작** · 원장은 조회 · 중지 가능 |

---

## 5. Child Portal Boundary (DEC-076)

| 규칙 |
|---|
| **Legacy Report를 신규 Child Portal에 자동 편입하지 않는다** |
| Legacy 리포트는 기존 Legacy Share Link로만, Cutover 정책에 따라 유지된다 |
| 향후 Portal 통합이 필요하면 **새 Decision** |

---

## 6. PHASE 05 · 07 입력

| 항목 |
|---|
| `legacy_period` 유형 표현 · read-only 강제 |
| 구 5영역 historical 표시와 신규 Growth 5 공존 |
| 기존 리포트 unique `(child_id, period_start, period_end)`와 신규 논리 식별자 공존 |
| 기존 AI 초안 · 근거 스냅샷 보존 |
| Legacy share와 신규 Portal 병행 (Cutover 절차) |
