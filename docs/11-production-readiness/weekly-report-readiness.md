# weekly_report Release Readiness (PHASE 10A · 읽기 전용)

## 왜 OPEN 인가 (정확히)

`platform_capabilities.weekly_report.is_released = false` (seed `20261001100000_m2…:134` · 변경 없음) → Readiness `feature:weekly_report = not_released` → 활성화 CT005.
출시 기준 문서가 없고, STARTER 가 약속한 **"8주 기록 모아보기"(DEC-069 · `docs/03-commerce/product-catalog.md:209`)** 는 어떤 capability · Readiness 항목에도 연결되지 않았고 DB 테스트가 없다.
학부모에게 닿는 가치는 `parent_portal` 에 달려 있는데 CO-12 로 막혀 있다 → weekly 만 출시해도 STARTER 는 활성화되지 않는다.

## end-to-end 현황 (증거 · `20261001093000_m1_report_portal_foundation.sql` · `20261001120000_m4_report_portal_rpcs.sql`)

| 영역 | 상태 |
|---|---|
| schema | `reports` (아동 × 배정 × 주차 유일) · `report_revisions` (draft/complete · 2번째부터 정정 사유) · `report_revision_evidence` (growth snapshot · AI 컬럼 없음) · `report_revision_media` (0~3장) |
| 생성 | `create_weekly_report_draft` — 차시 제목 · s13 · 교사 메모로 결정적 구성 · "AI 없음 · DEC-066" |
| 쓰기 권한 | 담당 교사 · `class_write_allowed(…,'weekly_report')` ∧ `class_week_entitled` (RP007) |
| 교사 검토 | 완료는 교사의 명시적 `complete_report_revision` · 조건: 완료 관찰 ≥1 · 주제 · 교사 관찰 · 가정 대화 (RP006) · Growth5 는 선택 · 완료 revision 불변 · 정정은 `start_report_correction` |
| 원장 | RLS 로 완료 revision 만 · 숨김 · 다시 공개(사유 · audit · 자동 재공개 없음 · DEC-074) |
| 학부모 | 저장된 "게시" 플래그 없음 · `report_parent_visible` = 최신 완료 ∧ 숨김 아님 ∧ weekly ∧ 기관 active ∧ `parent_portal` (계산) · **교사 완료 = 게시 가능**(DEC-074) · portal DTO 는 지표 이름만 (stage · 사진 없음) |
| AI | weekly 경로에 AI 없음 (`src/lib/staff/weekly-report-actions.ts:14` · `WeeklyComposer.tsx:49`) |
| 테스트 | p0_hardening (RP006 · RP007 · 숨김 audit · 정정 · portal) · production_shaped · p0_phase08_security · local role E2E (Weekly 완료) |
| 없는 테스트 | Readiness `not_released` → ok · 8주 모아보기 · 출시 경로 (class_mode 와 같음) |

## 제품 규칙 guard (코드 확인)

- Growth5 는 점수 · 순위 · 진단 아님: stage 는 `together` · `after_modeling` · `independent` 텍스트 · "숫자 변환 없음 (DEC-065)" (`20261001092000…:427-430`) · 행 없음 = 기록 없음 · stage 집계 없음 · portal 은 이름만
- AI 는 Growth5 · stage 를 고르지 않는다: 관찰 저장은 교사 입력만 · stage 없으면 GM005 · AI 입력 · 출력에 Growth5 없음 · 완료 · 숨김 RPC 를 부르는 AI 코드 없음

## 닫기 위한 최소 안전 단위

1. **weekly 출시 체크리스트 (사람 승인)**: RP006 완료 조건 · 불변 · 정정 · 숨김 · portal DTO(stage · 사진 없음) · AI 없음 · "교사 완료 = portal 활성 시 학부모 노출" 명시
2. **8주 모아보기 수락 기준 + 테스트** (`src/lib/staff/program-summary-queries.ts`)
3. class_mode 와 같은 **audited release RPC · pgTAP** (한 번에)
4. 실제 출시는 CO-12 해결과 함께 (STARTER 활성화 조건)
