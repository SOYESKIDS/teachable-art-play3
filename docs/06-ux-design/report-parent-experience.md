# Report · Parent Experience

| | |
|---|---|
| 문서 상태 | PHASE 06 승인본 (문서 검토 대기) |
| 작성 기준일 | 2026-09-27 |
| 상위 문서 | [architecture-overview.md](./architecture-overview.md) |
| 관련 결정 | DEC-101 · DEC-102 · DEC-103 · DEC-104 · DEC-100 (및 DEC-039 · DEC-040 ~ DEC-044 · DEC-056 · DEC-060 · DEC-066 ~ DEC-069 · DEC-073 ~ DEC-076 · DEC-089 · DEC-092) |
| 흐름 원본 | [../02-ia/report-portal-flow.md](../02-ia/report-portal-flow.md) · [../04-ai-report/report-lifecycle.md](../04-ai-report/report-lifecycle.md) |

---

## 1. Weekly Composer (DEC-101)

Weekly는 P0 · **Generative AI 없음** · deterministic assemble (DEC-066). 섹션마다 **출처와 수정 가능 여부**를 표시한다. "AUTO" 같은 기술 용어는 UI copy로 쓰지 않는다.

| # | 섹션 (DEC-066 순서) | 출처 표시 (예) | 교사 조작 |
|---|---|---|---|
| 1 | 이번 주 활동 주제 | "수업 자료" | 읽기 |
| 2 | 아이의 말과 선택 | "관찰 기록에서" | 선택 · 실제 quote 또는 구체적 choice evidence가 있을 때만 · 없으면 섹션을 비우고 문장을 만들지 않음 |
| 3 | 교사 관찰 기록 | "관찰 기록에서 가져옴 · 확인 후 수정" | 확인 · 수정 (Teacher Final) |
| 4 | 작품 · 활동 장면 | "사진 0~3장 선택 · 선택 사항" | 사진 0~3장 선택 |
| 5 | 가정연계 대화 제안 (Parent 표시: 가정에서 나눌 이야기) | "수업 자료" | 읽기 |
| + | 다음 주 예고 | "수업 자료 · 선택 사항" | 읽기 |

- **사진은 0~3장 선택 (DEC-039)** — 0장 정상 · 사진은 선택 사항 · 최대 3장. 사진이 없어도 [리포트 완료]를 막지 않는다. PHASE 07은 이 규칙을 다시 결정하지 않고 picker · 선택/업로드 검증 · gallery layout 같은 구현 세부만 다룬다.
- Parent에는 선택된 사진 중 **현재 display eligibility가 true인 사진만** 표시한다 (§7-6). "0~3장 선택 가능"이라는 Report rule과 "Parent에게 실제 공개 가능"이라는 Privacy/Security rule은 다르며, Production Parent 사진은 CO-9 · CO-10 · DB-9 해결 이후다.
- 대기열 CTA: "[이번 주 리포트 만들기 (N명)]".
- Layout: desktop 두 열(좌 근거 · 우 작성) · tablet 한 열 쌓기 · 하단 고정 [리포트 완료].

---

## 2. Weekly Readiness States (DEC-101)

| Teacher / Internal | 의미 | Parent |
|---|---|---|
| 관찰 필요 | 완료된 관찰 0건 | 비노출 |
| 작성 가능 | 필수 근거 충족 | — |
| 작성 중 | draft 존재 | — |
| 완료 | Teacher Complete | 공개 조건 충족 시 표시 |
| 숨김 | Director/HQ가 숨김 | 사라짐 (흔적 없음) |
| 결석 · 작성 대상 아님 | 출결 결과 | 비노출 (DEC-060) |

Parent와 Internal의 상태 언어는 같지 않아도 된다. Internal은 정확한 운영 사유, Parent는 원인 비노출.

STARTER 원장에게는 누락 탐지 목록 · 집계 count를 제공하지 않는다 (DEC-056).

---

## 3. Complete (DEC-101)

- 버튼 **[리포트 완료]** = publish eligible (실제 표시는 visibility 규칙).
- 필수 누락 시 구체적 안내 (예):
  - "완료된 관찰 기록이 1건 이상 필요합니다."
  - "교사 관찰 문장을 확인해 주세요."
  - "가정연계 내용이 수업 자료에 없습니다. 본사 확인이 필요합니다." (교사가 해결할 수 없는 항목은 해결 주체 표시)
- **AI 사용 여부를 완료 조건으로 표시하지 않는다.**
- 완료 확인: "완료하면 직접 수정할 수 없습니다. 수정이 필요하면 수정본을 만듭니다."

---

## 4. Revision (DEC-102)

| 항목 | 내용 |
|---|---|
| CTA | **[수정본 만들기]** · 사유 필수 ("수정 사유") |
| Internal 표시 | **최근 완료본** (예: 2026.09.20 완료) · **작성 중인 수정본** (예: 저장됨) |
| 표시 중 표시 | **"학부모 화면에 표시 중"은 computed visibility가 TRUE일 때만** |
| 금지 | "현재 공개 중: v1"처럼 최근 완료본을 항상 공개 중인 것처럼 표시 · "published revision"을 저장 상태처럼 사용 · 완료본 직접 편집 |

### 4-1. 용어 구분

| 용어 | 의미 |
|---|---|
| 완료본 | complete revision |
| 최근 완료본 | latest completed revision |
| 작성 중인 수정본 | working draft revision |
| 학부모 화면에 표시 중 | computed visibility TRUE (Portal 활성 · 숨김 아님 · 계약 정책 허용 등) |

최근 완료본 ≠ 항상 학부모에게 보이는 기록 (Portal 비활성 · 숨김 등).

### 4-2. Parent 표시 (AR-9 해소)

revision > 1이면 **"업데이트됨 YYYY.MM.DD"** (예: 업데이트됨 2026.09.27) — 제목 아래 날짜 정보 옆 작은 글자. 정정됨 · 오류 수정 · 수정본 v2 사용 금지. Revision history는 Parent에 노출하지 않는다 (DEC-075).

---

## 5. Hide / Unhide (DEC-102 · DEC-074)

| | 숨기기 | 다시 공개 |
|---|---|---|
| Action | **[학부모 화면에서 숨기기]** | **[학부모 화면에 다시 공개]** |
| Dialog | "학부모 화면에서 이 기록을 즉시 숨깁니다. 내부 기록은 삭제되지 않습니다." | "가장 최근에 완료된 기록을 학부모 화면에 다시 표시합니다." |
| Reason | 필수 (사진 오류 · 개인정보 · 내용 오류 · 기타 + 메모) | 필수 |
| 주체 | Director · authorized HQ Admin | Director · authorized HQ Admin |
| 결과 | Parent 즉시 미노출 · 흔적 없음 | 최근 완료본이 visibility 규칙에 따라 표시 |

- "삭제"라는 단어를 쓰지 않는다.
- Hidden 상태에서 새 수정본을 Complete해도 **자동 공개하지 않는다.** 다시 공개는 별도 명시 행동.
- Teacher는 숨김 상태와 사유를 볼 수 있다 (DEC-043).
- Confirmation LEVEL 2 (DEC-111).

---

## 6. Print (DEC-102)

| 대상 | 정책 |
|---|---|
| 완료된 visible · non-hidden report | 단건 인쇄 가능 (모든 상품) |
| Draft | 인쇄 불가 |
| **Hidden** | **internal 일반 인쇄 · 일괄 인쇄 모두 불가** (정정 + 권한자 다시 공개 후 가능) |
| Parent | 현재 표시 중인 latest completed만 · AI Draft 인쇄 금지 |
| Bulk Print | STARTER 제외 · STANDARD/PREMIUM은 P1 entitlement · Hidden 제외 |
| Legacy | 기존 legacy 인쇄 동작 유지 |
| 법적 export · 보존 | CO-2 별도 |

---

## 7. Parent Portal — "아이 기록" (DEC-103)

### 7-1. 구조

- Parent-facing 명칭 **"아이 기록"** (제목 예: "○○의 기록"). "Portal"이라는 단어를 Parent에게 쓰지 않는다.
- 탭 2개: **이번 주 · 지난 기록** (DEC-042). mobile 단일 열 · 큰 글자 · 가로 표 없음 · 기술 용어 없음.
- 상단: 아이 이름 · 반 · 기관명.

### 7-2. "이번 주" 판정

```text
이번 주 =
  현재 로컬 달력 주간
  ∩ 해당 아동의 Program Assignment에서 실제 수업 일정이 잡힌 program week (week_no)
  ∩ 그 week의 Weekly Report
  ∩ latest completed revision
  ∩ visibility 규칙 (Portal 활성 · 숨김 아님 · 계약 정책)
```

- "가장 최근 발행 리포트"가 아니다. "이번 주에 공개된 아무 과거 리포트"도 아니다.
- 해당 visible Weekly가 없으면: **"현재 새로 공유된 기록이 없습니다."**
- **이전 Week 리포트를 이번 주 탭으로 끌어올리지 않는다.**
- 최근 기록을 보조로 보여줄 때: 제목 "최근 공유 기록" + **Week 번호 + 실제 날짜** 필수.
- 같은 주에 수업이 여러 개인 특수 상황에서는 visible Weekly가 여러 개일 수 있음을 막지 않는다.
- timezone · date utility 구현은 PHASE 07.

### 7-3. 빈 상태 · 실패

| 상황 | 문구 |
|---|---|
| 이번 주 visible Weekly 없음 | **"현재 새로 공유된 기록이 없습니다."** |
| 공유 기록 0건 | **"아직 공유된 기록이 없습니다."** |
| 링크 사용 불가 (invalid · wrong child · revoked · expired · hidden-only · access blocked 무구분) | **"이 링크로는 기록을 확인할 수 없습니다. 기관에 새 공유 링크를 요청해 주세요."** / 기관 display name을 쓸 수 있으면 "○○유치원에 새 공유 링크를 요청해 주세요." |

- 원인을 구분해 알리지 않는다. CO-12 만료 정책(기간)을 문구로 확정하지 않는다.
- "원"을 generic 용어로 hardcode하지 않는다. 실제 organization display name 우선 · fallback "기관".

### 7-4. Weekly Parent 섹션 순서

```text
이번 주 활동 주제
→ 아이의 말과 선택
→ 교사 관찰 기록
→ (관찰된 모습)          ← Growth5 presentation · 선택 섹션
→ 작품 · 활동 장면
→ 가정에서 나눌 이야기
→ 다음 주 예고
```

- 순서는 DEC-066을 따른다. DEC-042 본문의 과거 순서는 historical record로 유지하며 DEC-042는 clarified by DEC-060 and DEC-066.
- "관찰된 모습"은 Teacher Evidence의 presentation이다. 위치는 교사 관찰 기록 뒤 · 작품·활동 장면 앞을 권장한다. Weekly 5요소 source 구조는 바꾸지 않는다.
- 모든 기록에 실제 week · 날짜를 표시한다 (DEC-060).

### 7-5. 관찰된 모습 (Growth5 · DEC-100)

- 섹션 이름 **"관찰된 모습"** · 형식 = 지표명 + 실제 장면 문장 (예: "창의적 시도 — 붓 대신 손가락으로 색을 섞어 보았어요.").
- **raw Stage label · chip 미노출.** 점수 · 등급 · 진행바 · 비교 없음.
- 설명 문구 (IA-13): **"이 기록은 점수나 평가가 아니라, 이번 활동에서 보인 아이의 모습을 담은 것입니다."**
- 우수 · 부족 · 발달 수준 표현 금지.

### 7-6. 사진

- display eligibility가 false(동의 미충족 · 삭제 · privacy 차단 등)이면 **사진 영역 자체를 표시하지 않는다.**
- 사유("동의가 철회됨" · "사진을 사용할 수 없음" · "사진이 삭제됨") · placeholder 문구 없음.
- Internal 권한 화면만: "이 사진은 현재 학부모 화면에 표시되지 않습니다."
- **Production Parent 사진은 CO-9 · CO-10 · DB-9 해결 전 enable하지 않는다.**

### 7-7. Parent Flow

```text
링크 → 토큰 확인 → 실패 시 단일 실패 화면
                → 성공: 아이 기록 (이름 · 반 · 기관)
                    → 이번 주 (없으면 빈 문구 + 최근 공유 기록)
                    → 지난 기록 목록 → 상세 → (조건 충족 시) 사진
```

---

## 8. Director Report UX

| 가능 | 불가 |
|---|---|
| 완료 리포트 조회 · 필터 | 교사 draft · AI draft 조회 |
| 숨기기 · 다시 공개 (사유) | STARTER: 누락 탐지 · 집계 |
| 학부모 공유 (아동별 링크 발급 · 중지) | Hidden 인쇄 |
| 단건 인쇄 (visible · non-hidden) | — |
| STANDARD · PREMIUM: Dashboard의 누락 · 운영 상태 | — |

공유 링크 중지: Confirmation 필수 · **reason은 필수 아님** (DEC-111). 문구: "이 링크는 즉시 열리지 않습니다. 다시 공유하려면 새 링크를 발급해야 합니다."

---

## 9. Monthly (DEC-104 · P1)

- Program 4-Week Block (DEC-067). Generic **"월간 요약 · 4주 단위"** · block **"월간 요약 · 1~4주"**, "월간 요약 · 5~8주", "월간 요약 · 9~12주" …
- 달력 월 이름("9월 월간 리포트") 사용 금지.
- 최소 근거 기준 숫자는 AR-1 미정 → UI에 쓰지 않는다.

## 10. Semester (P2)

- Reporting Term 기반 (DEC-068). Internal "학기 리포트" · Parent "학기 포트폴리오" · Marketing "학기 성장 포트폴리오".
- STANDARD 16주는 기본 1개 Term 후보 · **PREMIUM 24주 Term 경계는 AR-2 OPEN → UI에 hardcode하지 않는다.**

## 11. 8주 기록 모아보기 (DEC-104 · DEC-069)

- App UI 이름 **"8주 기록 모아보기"** · Marketing 상품 설명의 "8주 요약"은 유지 가능.
- 완료된 Weekly를 모아 보여주는 **derived view**: 새 report type 아님 · AI summary 아님 · Teacher Complete 없음.
- 내용: 8주 timeline · Week 번호 · 실제 날짜 · Weekly 제목 · 아이의 말/선택 · 대표 사진(표시 가능할 때) · 각 Weekly 링크. 빈 주는 중립적으로 비우고 사유를 구분하지 않는다.
- "성장 평가" 등 평가 표현 금지.

## 12. Legacy Report (DEC-076 · DEC-104)

- 교직원 UI: **"이전 형식 리포트 (기간형)"** 표시 · 새 Weekly/Monthly/Semester처럼 보이지 않게.
- 새 "아이 기록"에 자동 편입하지 않는다. 기존 legacy 링크는 DEC-041대로.
- Legacy 공유 화면의 실패 문구도 원인을 나열하지 않도록 조정한다 (PHASE 07 · DEC-044).
- Cutover 원장 안내: "이제 아동별 공유 링크 하나에서 공개된 기록을 함께 확인할 수 있습니다. 기존 리포트별 공유 링크는 사용이 끝날 때까지 별도로 유지됩니다." · 짧은 UI "새 공유는 아동별 링크로 관리합니다." ("만료일까지" 금지 · CO-12)
