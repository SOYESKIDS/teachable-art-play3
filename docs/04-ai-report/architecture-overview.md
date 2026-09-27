# AI Growth / Report — Architecture Overview

| | |
|---|---|
| 문서 상태 | PHASE 04 승인본 |
| 작성 기준일 | 2026-09-27 |
| Branch / 기준 commit | `saas-v2` / `11269e6` |
| 대상 독자 | PM · 교육기획 · DB Architect · 개발자 |
| 선행 문서 | [../00-project/decision-log.md](../00-project/decision-log.md) · [../01-product/product-definition.md](../01-product/product-definition.md) · [../02-ia/report-portal-flow.md](../02-ia/report-portal-flow.md) · [../03-commerce/product-catalog.md](../03-commerce/product-catalog.md) |
| PHASE 04 문서 | **architecture-overview.md** · [evidence-growth-model.md](./evidence-growth-model.md) · [report-architecture.md](./report-architecture.md) · [ai-architecture.md](./ai-architecture.md) · [report-lifecycle.md](./report-lifecycle.md) · [legacy-migration.md](./legacy-migration.md) · [open-items.md](./open-items.md) |
| 관련 결정 | DEC-064 ~ DEC-078 (및 DEC-005 ~ DEC-011 · DEC-024 · DEC-030 · DEC-039 · DEC-040 · DEC-043 · DEC-055 · DEC-057 · DEC-060 · DEC-063) |

> 이 PHASE는 **제품 구조와 데이터 계약(개념)**을 정한다. DB Schema · SQL · RLS · 프롬프트 코드 · API는 다루지 않는다 (PHASE 05 · 07).
>
> 핵심 질문: "AI가 무엇을 할 것인가?"가 아니라 **"어떤 원자료가 어떤 규칙으로 어떤 리포트를 만들고, AI는 그 과정의 어느 부분만 보조하는가?"**

---

## 1. Executive Summary

| 주제 | 확정 내용 | 결정 |
|---|---|---|
| 사실의 원천 | **Teacher Evidence > Structured Curriculum Context > AI Draft.** Teacher Final은 upstream Evidence가 아니라 리포트의 최종 출력 | DEC-064 |
| Growth 5 · Stage | 공식 5지표 · Stage는 참여·지원 방식 · 숫자 변환 · 집계 · 비교 금지 · 같은 아이의 시간순 사례만 | DEC-065 |
| Weekly (P0) | Child × Assignment × Week · **Generative AI 없음** · deterministic assemble · 교사 관찰 prefill → Complete가 확인 | DEC-066 |
| Monthly (P1) | **Program 4-Week Block** (Week 1~4, 5~8 …) | DEC-067 |
| Semester (P2) | Child × Assignment × **Reporting Term** · Monthly에 비의존 | DEC-068 |
| 8주 요약 | STARTER **Summary View** (새 report_type 아님) · STARTER 활성화 전 Ready | DEC-069 |
| AI 상품 배분 | `ai_assist` 1개 · STARTER 제외 · STANDARD/PREMIUM 포함(C1+C2+C3) · PILOT C1만 | DEC-070 |
| AI 원칙 | **AI 없이 전 경로 완주** · server-only · 입력 최소화 · No-Invention · 자동 공개 없음 | DEC-071 |
| Provenance | generation attempt 단위 기록 · 자동 retry 없음 · 소급 재생성 없음 · Template ≠ Product Version | DEC-072 |
| Raw payload | provider 원본 request/response · 전체 prompt · 실패 raw output **미저장** · validated structured draft + provenance만 · 로그 최소화 | DEC-078 |
| Revision | working vs latest_completed · 정정 = 새 Revision (PH3-3) · 이중 Snapshot | DEC-073 |
| Visibility | 계산값 · 숨김은 논리 리포트 단위 · 자동 해제 없음 | DEC-074 |
| 학부모 · 원장 | Stage 미노출 · 사례 서술 · 원장 Growth 5 집계 없음 · "업데이트됨" 표시 | DEC-075 |
| Legacy | 보존 · 자동 매핑 없음 · 신규 Portal 미편입 | DEC-076 |
| 멀티 교사 | 반 담당 교사 공동 편집 · authorship 추적 · 낙관적 동시성 | DEC-077 |

---

## 2. AI-Independent Principle (DEC-071)

```
PATH A — NO AI
  Teacher Evidence → Teacher Writing → Teacher Final → Complete → Visible when eligible

PATH B — OPTIONAL AI
  Teacher Evidence → AI Draft → Teacher Review/Edit → Teacher Final → Complete → Visible when eligible
```

- AI Draft가 없다는 이유로 Report 생성 · Complete · Parent visibility가 막혀서는 안 된다.
- "AI optional"은 **교사가 AI를 쓰지 않아도 된다**는 뜻이다. **상품이 약속한 AI 기능이 구현되지 않아도 된다는 뜻이 아니다** (DEC-063 · DEC-070).

---

## 3. Source Hierarchy (DEC-064)

| 순위 | 층 | 성격 | 예 |
|---|---|---|---|
| 1 | **Teacher Evidence** | 아이에 대한 사실 (canonical) | 관찰 노트 · Child Quote(verbatim) · Growth 5 선택 · 선택 사진 참조 |
| 2 | **Structured Curriculum Context** | 맥락 (아이에 대한 사실 아님) | 주제 · 그림책 · 활동 · 가정연계 · 다음 주 |
| 3 | **AI Draft** | 초안 (원천 아님) | C1 · C2 · C3 출력 |

| 출력 | 성격 |
|---|---|
| **Teacher Final** | 교사가 검토·확정한 리포트 최종 내용. **upstream Evidence가 아니다.** Monthly · Semester에서 완료된 Weekly Teacher Final은 **secondary source**로만 사용하며 underlying Evidence를 canonical로 함께 유지한다 |

규칙: **Child Quote는 원 Evidence의 verbatim text가 항상 우선** · **Goal ≠ Observed Outcome**.

---

## 4. Current vs Target (HEAD `11269e6` READ-ONLY 감사)

| AREA | CURRENT (파일 근거) | TARGET | GAP | PRI | PHASE |
|---|---|---|---|---|---|
| **AI dependency** | 리포트 근거 선택에 `review_status='accepted'` 필수 → 없으면 **GR003** (`M/20260901160000…` L1088-1116) · 근거 트리거 GR003 4종 (L697-715) | AI 없이 전 경로 완주 | **치명적 — P0 제거** | P0 | 05 · 07 |
| AI NOT NULL | `child_growth_report_sources.ai_draft_id not null` (L259) · `source_ai_updated_at not null` (L271) · `reviewed_text_snapshot not null` (L287) | 필수 의존 제거 | P0 제거 | P0 | 05 |
| Observation domain | 구 5영역 시드 (`M/20260831093000…` L255-287) · Growth 5는 마케팅 문구에만 (`site-copy.ts` L239-245) | 공식 Growth 5 | 신규 · 구 영역 historical | P0 | 05 |
| Stage | 연결 테이블에 stage 없음 · 금지 주석 (`M/20260831094000…` L12-13) | 지표별 Stage | 신규 · IA-3 | P0 | 05 |
| Quick Memo | 없음 | 교사 전용 서버 임시저장 · 원천 아님 | 신규 | P0 | 05 · 07 |
| Report type | **없음** · 임의 기간 · unique `(child_id, period_start, period_end)` (L184-185) | weekly · monthly · semester · legacy_period | 신규 | P0 | 05 |
| Weekly | 없음 | 아동×배정×주차 · deterministic | 신규 | P0 | 05 · 07 |
| Monthly | 3블록 기간 리포트가 유사 | Program 4-Week Block | 재정의 | P1 | 05 · 07 |
| Semester | 없음 | Reporting Term | 신규 | P2 | 05 · 07 |
| AI Draft | 관찰 AI: 관찰당 1행 덮어쓰기 · 자유 텍스트 `output_text` / 리포트 AI: JSON 텍스트 파싱 (json_schema 아님) | generation attempt · structured output · sourceRefs | 재설계 | P1 | 05 · 07 |
| Teacher Final | 3블록 텍스트 | 유형별 섹션 | 확장 | P0 | 05 · 07 |
| Complete | 3블록 필수 · 잠금 (GR001 · GR005) | 유형별 최소 조건 · Revision Snapshot | 수정 | P0 | 05 |
| Publish | 원장이 리포트별 공유 링크 발급 · 30일 | 계산된 visibility · 아동 Portal | 재설계 | P0 | 05 · 07 |
| Hide | 없음 | 논리 리포트 hide/unhide | 신규 | P0 | 05 · 07 |
| Reopen / Revision | **없음** (완료 후 잠금 · 주석상 향후 설계) | working / latest_completed Revision | 신규 | P0 | 05 · 07 |
| Parent DTO | 3블록 + 활동 목록 (아이의 말 · 교사 관찰 · 사진 · 가정연계 · 다음 주 **없음**) | Weekly 5항목 + 예고 · 실제 week/date | 재설계 | P0 | 05 · 07 |
| Report list | `MAX_GROWTH_REPORT_LIST = 200` · 페이징 없음 (`src/types/staff-growth-report.ts` L51) | P0 반×주차 대기열 · 서버 페이징 | 수정 | P0 / STARTER 활성화 전 | 07 |
| AI provenance | provider · model · prompt_version (`"v1"` · `"growth-report-v1"`) | + template · schema · refs · 검증 · attempt | 확장 | P1 | 05 |
| AI input 최소화 | 이름 · ID · 사진 미전송 · 자유 텍스트 내 이름 가능 (코드 주석 인정) | placeholder · 자유 텍스트 최소화 (AR-8) | 강화 | **외부 AI 사용 전** | 07 |
| AI server boundary | 서버 액션에서 호출 · provider 모듈은 `typeof window` 런타임 검사만 (컴파일 단계 표시 없음) | server-only 강제 | 강화 | P1 | 07 |
| Legacy report | 3블록 · 리포트 단위 공유 | legacy_period read-only · DEC-041 | 전환 | P0 | 05 · 07 |

> 이 표는 코드 구조상의 관찰이며 보안 인증을 의미하지 않는다.

---

## 5. P0 / P1 / P2

| 시기 | 범위 |
|---|---|
| **P0** | Growth 5 + Stage · Quick Memo(참고만) · **Weekly deterministic · 완료 조건 · 대기열** · **Safety / Correction Path** (아래) · 이중 Snapshot · computed visibility · **AI dependency 제거** · Parent DTO · C1 Observation Cleanup(현재 기능, AR-8 해결 전에는 외부 사용 불가 → AI OFF 운영) · raw payload 미저장 (DEC-078) · Legacy read-only |
| **STARTER 활성화 전** | **8주 Summary View** (DEC-069) · 목록 서버 페이징 |
| **P1** | Monthly (4주 블록) · C2 Period Narrative Draft (structured · sourceRefs · 검증) · C3 Writing Assist · generation attempt 이력 · Quick Memo "관찰로 옮기기" · 교직원 인쇄 · Bulk Print · **Advanced Revision Management** (아래) |
| **P2** | Semester Portfolio · Reporting Term 설정 · 근거 추적 UI ("이 문장의 근거 보기") · 다국어 검토 |

### 5-1. Revision 범위 — SAFETY / CORRECTION PATH = P0 · ADVANCED REVISION MANAGEMENT = P1+

Emergency Hide가 P0이고, 잘못된 사진 · privacy issue · 중대한 사실 오류 처리에는 **Hide → Correction Revision → Complete → Unhide** 경로가 필요하다. 따라서 mvp-scope P1-9(Report Reopen / Correction)를 **P0로 이동**한다 (DEC-073 · DEC-074).

| P0 최소 범위 | P1+ |
|---|---|
| correction revision 생성 | rich revision history UI |
| correction reason required | side-by-side diff |
| previous complete revision immutable | advanced revision filters |
| working revision · latest completed revision | bulk correction tools |
| v2 draft 중 Parent는 v1 유지 · v2 complete 시 latest completed 전환 | |
| hide / unhide | |
| actor · time · reason audit | |

STANDARD · PREMIUM은 DEC-063에 따라 **약속한 Weekly · Monthly · Semester · Dashboard · AI capability 전체가 Ready가 되기 전 Production Activation 불가**이며, 이 PHASE는 이를 우회하지 않는다.
