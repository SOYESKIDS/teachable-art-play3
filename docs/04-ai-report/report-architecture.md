# Report Architecture

| | |
|---|---|
| 문서 상태 | PHASE 04 승인본 |
| 작성 기준일 | 2026-09-27 |
| Branch / 기준 commit | `saas-v2` / `11269e6` |
| 관련 문서 | [evidence-growth-model.md](./evidence-growth-model.md) · [report-lifecycle.md](./report-lifecycle.md) · [ai-architecture.md](./ai-architecture.md) · [../02-ia/report-portal-flow.md](../02-ia/report-portal-flow.md) |
| 관련 결정 | DEC-010 · DEC-011 · DEC-015 · DEC-024 · DEC-039 · DEC-055 · DEC-057 · DEC-060 · DEC-064 ~ DEC-069 · DEC-073 · DEC-075 |

---

## 1. Report Taxonomy

| 유형 | 상품 (DEC-057) | 시기 | 식별자 | AI |
|---|---|---|---|---|
| **Weekly** | STARTER · STANDARD · PREMIUM · PILOT | P0 | Child × Program Assignment × **Week** | **Generative AI 없음** (P0). C3 문장 다듬기는 P1 · `ai_assist` 상품만 |
| **Monthly** | STANDARD · PREMIUM | P1 | Child × Program Assignment × **Program Month Index** | C2 선택 |
| **Semester** | STANDARD · PREMIUM | P2 | Child × Program Assignment × **Reporting Term** | C2 선택 |
| legacy_period | (기존 데이터) | — | 기존 `(child, period_start, period_end)` | — (read-only) |
| *8주 요약* | STARTER | STARTER 활성화 전 | **report_type 아님** — Weekly를 모은 View | 없음 |

---

## 2. Weekly (P0 · DEC-066)

| 섹션 | 출처 | 방식 |
|---|---|---|
| 1 이번 주 활동 주제 | Published Curriculum Context (주차 · 그림책 · 활동) | **AUTO** |
| 2 아이의 실제 말과 선택 | Child Quote(verbatim) 또는 Teacher Evidence에 기록된 구체적 선택 | **TEACHER SELECT** |
| 3 교사 관찰 기록 | 선택한 Teacher Observation Note로 **prefill** → 교사가 확인 · 수정한 Teacher Final sentence (+ Growth 5 서술) | **TEACHER WRITE** |
| 4 작품 · 활동 장면 | 작품명(커리큘럼) + consent-eligible selected media 0~3장 | AUTO + **TEACHER SELECT** |
| 5 가정연계 대화 제안 | curriculum family connection | **AUTO** |
| + 다음 주 예고 | 같은 배정의 next published curriculum week (없으면 생략) | **SYSTEM ASSEMBLE** |

- **Deterministic**: 같은 입력이면 같은 조립 결과. **LLM 없음.**
- 한 주에 세션이 2개(분할 운영)면 두 관찰을 모두 근거로 쓴다.
- 리포트에서 고친 문장은 **리포트 Revision에만** 반영된다. 관찰 원문은 바뀌지 않는다.

---

## 3. Weekly Completion Rules (DEC-066)

| 구분 | 항목 |
|---|---|
| **HARD REQUIRED** | child · program assignment · week · **완료된 관찰 1건 이상** (C-3) · activity topic · **teacher final observation sentence** · family connection source |
| **RECOMMENDED** | child quote 또는 구체적 선택 · Growth 5 selection |
| **OPTIONAL** | photo · next week preview |

| 원칙 |
|---|
| Quote · 사진 · Growth 5가 없어도 **차단하지 않는다** |
| 근거가 없는 섹션을 AI · 시스템이 채우지 않는다. **placeholder narrative 금지** |
| 교사 관찰 prefill 후 **Complete 행위 자체가 Teacher Final 확인**이다. 별도 승인 체크박스 · AI acceptance 없음 |
| family connection source는 DEC-037 필수 커리큘럼 데이터로 사전 보장된다 |

---

## 4. Monthly — Program 4-Week Block (P1 · DEC-067)

| Program Month Index | Weeks |
|---|---|
| Block 1 | 1~4 |
| Block 2 | 5~8 |
| Block 3 | 9~12 |
| Block 4 | 13~16 |
| Block 5 | 17~20 |
| Block 6 | 21~24 |

| 원천 | 역할 |
|---|---|
| Underlying Evidence (완료된 관찰 · Quote · Growth 5) | **Canonical** |
| 완료된 Weekly의 Teacher Final | Secondary (교사가 이미 다듬은 문장) |
| Curriculum Context | 맥락 |

**Weekly 문자열만 AI가 재요약하는 구조는 금지한다.**

| Parent 출력 구조 (**PROPOSED** — 원본 서식 없음) | 출처 |
|---|---|
| 이번 기간의 활동 이야기 | Curriculum + Teacher Final |
| 기억에 남는 표현 | Child Quote 원문 (교사 선택) |
| 관찰된 모습 (Growth 5 사례 서술) | Growth 5 Evidence |
| 교사의 종합 코멘트 | Teacher Final (C2 초안 선택) |
| 가정 연계 | Curriculum |
| 대표 작품 · 사진 | 교사 선택 |

- 기존 3블록(`growth_changes` · `observation_summary` · `next_support`)은 DEC-011에 따라 "활동 이야기 · 관찰된 모습 · 다음 지원"에 재사용할 수 있다.
- 서비스 내부 의미: **"월간 요약 리포트 = 4주 단위."** UI · 마케팅 문구도 "월간 요약 리포트 · 4주 단위"처럼 맞춘다 (Copy는 PHASE 06).
- CO-11(계약 달력 기간)과 무관하게 동작한다.

---

## 5. Semester — Reporting Term (P2 · DEC-068)

| 항목 | 내용 |
|---|---|
| 식별자 | Child × Program Assignment × **Reporting Term** |
| STANDARD 16주 | 기본적으로 1개 Reporting Term이 될 수 있다 |
| PREMIUM 24주 | 1회인지 별도 학기 경계가 있는지는 **P2 제품 설정** (AR-2) |
| Architecture | 처음부터 **flexible reporting period** 지원 |
| 원천 | Observation · Weekly · Monthly · Child Quote · Growth 5 · Teacher Final — **Monthly에 비의존** (DEC-055) |
| 구조 (PROPOSED) | 기간 개요 · 활동 · 작품 연대기 · 기억에 남는 말 · 교사 서술 · Growth 5 **사례 흐름** · 교사가 고른 포트폴리오 근거 · 가정 대화 제안 |
| 경계 | "성장 포트폴리오" = **아이의 활동과 표현이 쌓인 기록 모음.** 발달 평가서 · 진단서 · 성적표 아님. 점수 · 단계 요약표 · "도달" 표현 없음 |
| 교사 작업 | 대표 근거 선택 + (선택) C2 초안 + 검토 · 완료 |

---

## 6. 8주 요약 — Program Completion Summary View (DEC-069)

| 이다 | 아니다 |
|---|---|
| 8주 동안 완료된 Weekly를 **시스템이 규칙적으로 모아 보여주는 View** | 새 report_type · Monthly · Semester-lite · AI Report |
| 8주 Timeline · Week 번호 · 실제 날짜 · Weekly 제목 · Weekly에서 이미 선택된 아이의 말/선택 · 이미 선택된 대표 사진(있으면) · 각 Weekly 링크 | 새 성장 판정 · 새 AI Narrative · 새 Teacher Complete · 새 Revision |
| 기존 Weekly **Snapshot에서만** deterministic 생성 | — |

- UI 명칭 후보: "8주 기록 요약" / "8주 기록 모아보기" (Copy PHASE 06).
- **Regular STARTER Production Activation 전에 Service Ready** (DEC-063).
- Weekly가 없는 주차는 Timeline에서 **표시하지 않거나 중립적으로 비워 두고**, 사유(결석 · 미작성 · 미공개)를 구분하지 않는다 (DEC-060).

---

## 7. Report Logical Identity & Uniqueness

| 유형 | 논리적 식별자 | 유일성 |
|---|---|---|
| Weekly | Child × Program Assignment × Week | 1 logical report (Revision은 별도) |
| Monthly | Child × Program Assignment × Program Month Index | 1 |
| Semester | Child × Program Assignment × Reporting Term | 1 |
| legacy_period | 기존 `(child_id, period_start, period_end)` | 기존 유지 · read-only |

실제 unique 제약은 PHASE 05.

---

## 8. Report Source Snapshot (DEC-073)

| 후보 | 평가 |
|---|---|
| A. Source ID만 | ✖ 원천 수정 시 재현 불가 |
| B. Evidence Snapshot | 현재 `*_snapshot` 구조 |
| C. Final Content Snapshot | 학부모에게 보인 그대로 |
| **D. B + C** | **확정** — Complete Revision마다 둘 다 보존 |

Final Content Snapshot: Teacher Final text · curriculum context snapshot · selected child quote(원문) · media references · template version 등.

**Immutable content snapshot ≠ 영구 photo visibility** — 사진 표시는 현재 consent · privacy 정책으로 동적으로 차단될 수 있다.

---

## 9. Parent Report Contract

| 노출 가능 | 노출 금지 |
|---|---|
| 아동 표시 이름 · 반 · 기관 | AI prompt · raw AI draft · raw model metadata |
| 리포트 유형 · **실제 Week · 날짜** (DEC-060) | Growth 5 내부 코드 · 숫자 · Stage chip |
| Weekly: 활동 주제 · 아이의 말/선택(원문) · 교사 관찰(Teacher Final) · Growth 5 사례 서술 · 선택 사진(consent-eligible) · 가정연계 · 다음 주 예고 | consent state · 결석 · 미작성 · 미공개 사유 · attendance inference |
| Monthly · Semester: 확정 섹션 · 선택 인용 · 선택 사진 | Quick Memo · hidden internal note · 숨김 사유 |
| "업데이트됨 YYYY.MM.DD" (현재 Revision > 1일 때 · DEC-075) | 이전 Revision · 내부 ID · failure reason |
| 인쇄 / PDF — **현재 표시 Revision의 Final Content Snapshot만** | AI Draft 인쇄 |

현재 주에 새 공개 리포트가 없으면 "현재 새로 공유된 기록이 없습니다." + 필요 시 "최근 공유 기록 · Week N · 실제 날짜" (DEC-060).

---

## 10. Batch Report Workflow (DEC-039 · DEC-066)

```
반 × 주차 대기열
 → 아동별 근거 상태 (관찰 완료 · 관찰 미완료 · 결석)
 → [이번 주 리포트 만들기 N명] — deterministic 일괄 조립
 → 아동별 검토 (교사 관찰 prefill 확인 · 인용 · 사진 선택)
 → Complete → 다음 아동 자동 이동
```

- **AI로 15명 리포트를 한 번에 생성하는 기능은 P0 Weekly에 없다.**
- 대기열의 아동별 상태 표시는 **교사 작업 도구**이며, 원장 Dashboard의 집계 가치와 다르다 (DEC-056).

| Report Type | Teacher required interaction |
|---|---|
| Weekly | select + short write(확인·수정) + complete |
| Monthly | (선택) C2 draft + review + complete |
| Semester | 포트폴리오 근거 선택 + (선택) C2 draft + review + complete |

---

## 11. Partial / Missing Evidence · Absence (DEC-060 · DEC-071)

| 규칙 |
|---|
| Monthly · Semester에서 Evidence가 부족해도 **AI가 빈 기간을 채우지 않는다.** 근거가 있는 섹션만 생성하고 부족한 섹션은 비운다 |
| 교사가 Evidence 부족 상태를 확인한 뒤 직접 작성하거나 완료한다 |
| Evidence coverage 숫자는 **Teacher operational UI에만** 표시 · Parent 금지 · Director Dashboard에서 평가 수치처럼 노출 금지 |
| 내부 집계는 `NO_REPORT` · `NO_EVIDENCE`를 구분할 수 있다 (교사용) |
| Parent narrative에서 **없는 주차를 언급하지 않는다.** 결석 · 미작성 · 미공개 이유를 추정하지 않는다 |
| AI 입력에는 근거가 있는 주차만 넣는다 |
| 최소 기준 숫자 | AR-1 |

---

## 12. Report Query Views

| 역할 | 조회 |
|---|---|
| Teacher | 내 반 · 이번 주 대기열 · 관찰 미완료 · draft · complete · working revision |
| Director | complete 리포트 · hidden 상태 · 개별 목록 (반 · 주차 필터) · 대시보드 포함 상품은 누락 탐지 |
| **STARTER Director** | 개별 리포트 목록은 가능 · **"미작성 N건" 같은 자동 집계는 제공하지 않는다** (DEC-056) |
| Parent | computed visibility = TRUE인 latest completed revision만 |
| HQ Admin | 지원 · 감사 최소 범위 · hide/unhide |
| HQ Sales | **리포트 접근 없음** (DEC-058) |

규모: Pilot 기관당 최대 120건(2반 × 15명 × 4주)은 반 × 주차 대기열로 충분하다. STARTER 2반 = 240건 > 현재 상한 200 → **서버 페이징 · 필터(반 · 주차 · 상태)는 STARTER Production Activation 전 필수.**
