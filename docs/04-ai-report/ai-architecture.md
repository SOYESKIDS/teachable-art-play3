# AI Architecture

| | |
|---|---|
| 문서 상태 | PHASE 04 승인본 |
| 작성 기준일 | 2026-09-27 |
| Branch / 기준 commit | `saas-v2` / `11269e6` |
| 관련 문서 | [architecture-overview.md](./architecture-overview.md) · [evidence-growth-model.md](./evidence-growth-model.md) · [report-lifecycle.md](./report-lifecycle.md) · [../03-commerce/product-catalog.md](../03-commerce/product-catalog.md) |
| 관련 결정 | DEC-009 · DEC-027 · DEC-039 · DEC-063 · DEC-064 · DEC-070 · DEC-071 · DEC-072 · DEC-078 · Invariant AI-10 ~ AI-13 |

> 실제 프롬프트 · API · JSON Schema 구현은 PHASE 07. 여기서는 개념 계약만 정한다.

---

## 1. Capabilities (DEC-070)

| Capability | 입력 | 출력 | 적용 | 시기 |
|---|---|---|---|---|
| **C1 Observation Cleanup** | 관찰 노트 · Child Quote · Growth 5 선택 · 차시 맥락 | 관찰 문장 초안 | 관찰 1건 | CURRENT 기능 (structured 전환은 P1) |
| **C2 Period Narrative Draft** | 기간 Evidence 묶음 + Weekly Teacher Final (secondary) + 맥락 | 섹션별 초안 + sourceRefs | Monthly · Semester | P1 · P2 |
| **C3 Writing Assist** | 교사가 쓴 문장 | 의미를 보존한 다듬은 문장 | 교사 요청 시 (Weekly 포함) | P1 |

**AI가 하지 않는 것**: 진단 · 발달검사 · 발달 단계 판정 · 점수화 · 또래 비교 · 순위 · 능력 등급 · 성격 단정 · 미래 예측 · 위험도 판정 · **Growth 5 지표 · Stage 선택/추천** · 사실 창작 · 관찰되지 않은 행동 추정 · **부모에게 자동 공개** · 사진 분석 · AI 설명(explanation-of-AI) 생성 · 15명 일괄 자동 생성.

---

## 2. Product Entitlement (DEC-070)

| 상품 | `ai_assist` | 사용 가능 Capability | 근거 |
|---|---|---|---|
| STARTER | **EXCLUDED** | 없음 | PHASE 04 Product Decision. SOURCE(v4)는 STARTER 구성에 AI 항목을 명시하지 않는다 |
| STANDARD | **INCLUDED** | C1 + C2 + C3 = "AI Growth Platform Full" | SOURCE(v4) "AI 성장기록 플랫폼 Full" + Decision |
| PREMIUM | **INCLUDED** | C1 + C2 + C3 | SOURCE(v4) "STANDARD 모든 구성 포함" |
| PILOT | **특수 Entitlement** | **C1만** | Decision |

- Source: `TeachAble_Art_Play_유치원_상품소개서_v4.pdf` — PROJECT EXTERNAL SOURCE (verified during PHASE 04 review · original PDF exists in Project materials · not versioned in this Git repository). **"STARTER ai_assist EXCLUDED"는 Source Fact가 아니라 PHASE 04 Product Decision이다.**
- **사용 가능 = `ai_assist` ∧ 해당 Report Entitlement ∧ 해당 기능 Service Ready.** C2 Monthly Draft는 `monthly_report`가 없는 상품에서 쓸 수 없다.
- 판매 Entitlement Code를 `ai_observation` · `ai_monthly` · `ai_writing`으로 나누지 않는다.
- STARTER에 AI를 추가하려면 새 Product Version · Decision.
- **DEC-063**: STANDARD · PREMIUM이 AI를 계약상 약속하므로 해당 capability가 Production Activation 전에 필요한 수준으로 Ready여야 한다.
- AI 생성 권한: **Teacher (담당 반)만.** Director · HQ의 AI 생성 권한은 두지 않는다 (근거 없음).

---

## 3. AI-Independent Path (DEC-071)

| 요구 | CURRENT GAP (P0 제거 대상) |
|---|---|
| AI Draft 없이 Report create · Complete · Parent visibility | **GR003** (accepted 관찰 AI 초안 없으면 리포트 생성 불가) |
| 근거 선택 = 완료된 관찰 (AI 상태와 무관) | 근거 조건 `review_status='accepted'` · stale 검사 · `reviewed_text` 비어 있지 않음 |
| AI 필수 컬럼 없음 | `ai_draft_id NOT NULL` · `source_ai_updated_at NOT NULL` · `reviewed_text_snapshot NOT NULL` |

AI 실패는 **리포트 작성 실패가 아니다.** 어떤 실패에서도 "AI 없이 계속 작성"이 가능하다.

---

## 4. Input Allowlist / Denylist (DEC-071)

| ALLOW (필요한 것만) | DENY (기본) |
|---|---|
| teacher observation text · child quote(원문) · teacher-selected Growth 5 metric/stage · curriculum topic · activity goal(맥락) · report period · Weekly Teacher Final(C2) · evidence ref(불투명 값) | photo binary · facial data · consent state · guardian name/contact · full class roster · unnecessary DOB · internal identifiers(원본) · Portal token · hidden internal memo · **Quick Memo(교사 승격 전)** · **other child's information** · attendance 상세 · 기관명 · 교사명 |

| 원칙 | 내용 |
|---|---|
| Placeholder | child name → neutral placeholder. 표시가 필요하면 AI 생성 후 application layer에서 치환 |
| Server-only | client direct call 금지. API key · prompt · raw request/response를 client에 노출하지 않는다 |
| 호출 전 재검증 | auth · role · tenant · assigned class · child scope · **entitlement** · contract effect (DEC-052) |
| 로그 | Production log에 API key · full prompt · child quote body · teacher note body · AI raw output · parent data · Portal token을 남기지 않는다. 필요한 경우 opaque ids · event ids · error category · duration · status만 (DEC-078 · CURRENT 원칙 유지) |

### 4-1. AR-8 — 자유 텍스트 개인정보 최소화 (Required timing)

| 항목 | 내용 |
|---|---|
| 내용 | 교사 자유 텍스트(노트 · 인용) 안의 **아동 · 다른 아동 · 사람의 개인정보** 최소화 처리 |
| Owner | Privacy + PHASE 07 implementation |
| **Required** | **BEFORE EXTERNAL P0 AI USE** — C1이 Pilot에서 쓰일 수 있으므로 P1이 아니라 외부 AI 사용 전 |
| 미해결 시 | Pilot은 **AI OFF**로 운영 가능해야 한다 (Pilot 자체를 막지 않음) |
| 구분 | 법무 판단(CO-10)과 별개 |

---

## 5. No-Invention Contract (DEC-071)

| 규칙 |
|---|
| **제공된 Evidence 안에서만** 작성한다 |
| 근거가 부족한 섹션은 `INSUFFICIENT_EVIDENCE` 또는 빈 값. 자연스럽게 채우지 않는다 |
| Quote는 **원문 그대로만** 인용 (생성 · 수정 · 교정 · 합성 금지) |
| **Goal ≠ Observed Outcome** — 커리큘럼 목표를 달성 여부로 쓰지 않는다 |
| 한 번의 관찰을 아이의 일반 특성으로 넓히지 않는다 |
| 금지 예: "빨간색을 골랐다" → "색감이 뛰어나다" ✖ · "도움을 받아 블록을 세웠다" → "협동심이 발달했다" ✖ |

---

## 6. Generated Text Safety Rules (DEC-027 확장)

| 금지 범주 | 권장 |
|---|---|
| 진단형 · 의학 용어 · 심리검사처럼 보이는 표현 | 관찰 중심 · 구체적 활동 중심 |
| 단정형 성격 ("~한 아이") | 아이의 실제 선택 중심 |
| 능력 등급 · 점수 · 발달 속도 · 정상/비정상 | "이번 활동에서" · "이 기록에서는" |
| 부족 · 뒤처짐 · 또래 대비 · 위험도 | "교사의 도움과 함께" · "보고 난 뒤" |
| 인과 단정 (향상 · 발달 · 길러짐) · 미래 예측 | "스스로 시도한 모습이 기록됨" |

---

## 7. Structured Output Contract (개념)

```
draftSections[]:
  sectionKey            e.g. activityStory · observedMoments · teacherComment
  text
  sourceRefs[]          evidence ref ids
  quotesUsed[]          { evidenceRef, verbatimText }
  status                OK | INSUFFICIENT_EVIDENCE
warnings[]
insufficientEvidence[]  sectionKey
meta: { outputSchemaVersion }
```

- **Growth 5 · Stage 필드는 출력 계약에 없다** (AI가 만들 수 없다).
- 문단마다 가능한 한 sourceRefs를 연결해 교사가 "왜 이 문장이 나왔는지" 근거로 확인할 수 있게 한다. 근거 추적 UI는 P2.

---

## 8. Validation (DEC-071)

규칙 기반 · 구조 검증을 먼저 한다. **추가 AI judge를 필수 구조로 두지 않는다.**

| 검출 | 처리 |
|---|---|
| 스키마 불일치 · 파싱 실패 | **reject** — 초안 미저장 · 교사 직접 작성 |
| 금지 범주 표현 | 해당 섹션 **reject** |
| Quote가 Evidence 원문과 불일치 | 해당 섹션 **reject** |
| 존재하지 않는 sourceRef | 해당 섹션 **reject** |
| sourceRef 없는 섹션 | **warning** — 교사가 수정 또는 삭제 |
| 모든 경우 | **자동 Parent publish 없음** · validation 실패 결과는 Report 데이터에 바로 반영하지 않는다 |

---

## 9. Pipeline (개념)

| # | 단계 | OUTPUT | FAILURE | RETRY | AUDIT |
|---|---|---|---|---|---|
| 1 | Teacher Evidence 저장 (**AI 호출 전**) | 저장된 관찰 | 저장 실패 → AI 호출 없음 | 교사 | 관찰 이벤트 |
| 2 | 서버 재검증 (auth · scope · entitlement) | 허용/거부 | 거부 | — | 요청 |
| 3 | 허용 입력 구성 · 최소화 (placeholder · AR-8) | 입력 묶음 | 근거 없음 → `no_source` | — | input refs |
| 4 | 템플릿 · 프롬프트 · 스키마 버전 선택 | 버전 | — | — | 버전 |
| 5 | 모델 요청 | 원 응답 | 제공자 장애 · 타임아웃 · rate limit | **수동 retry = 새 attempt** | attempt |
| 6 | 구조 검증 | 섹션 | 스키마 오류 | 수동 | 결과 |
| 7 | 근거 · 안전 검증 | 통과/경고/거부 | §8 | 수동 | 결과 |
| 8 | AI Draft 저장 (attempt) | 초안 | — | — | generated |
| 9 | 교사 검토 · 편집 | 교사 텍스트 | — | — | 편집 |
| 10 | Teacher Final 저장 (working revision) | 섹션 | — | — | 저장 |
| 11 | Complete | Revision Snapshot | 최소 조건 미달 | — | complete |
| 12 | Publish eligible → computed visibility | — | — | — | — |

네트워크 원칙: **Teacher Evidence를 먼저 저장한 뒤 AI를 호출한다.** AI 실패로 로컬 작업을 잃지 않는다.

---

## 10. Provenance (DEC-072)

| 필수 | 선택 |
|---|---|
| provider · model · promptTemplateId · promptVersion · outputSchemaVersion · reportType · period · requestedBy · generatedAt · inputEvidenceRefs · validationStatus · attemptNo | 모델 설정(temperature 등) · usage · finish_reason · response_id |

### 10-1. Raw Payload Retention (DEC-078 · PH3-5 해소)

**RAW AI RESPONSE ≠ VALIDATED STRUCTURED AI DRAFT.**

| NOT PERSISTED | PERSISTED (가능 / 필수) |
|---|---|
| raw provider request body | validated structured AI draft |
| raw provider response body · envelope | input Evidence refs · sourceRefs |
| complete prompt text copy | provenance (§10 필수 항목) · capability · requestedAt |
| raw child evidence text의 별도 AI 로그 복제 | provider response_id / request id (있으면) · token / usage metadata (있으면) |
| failed / rejected raw model output | sanitized error category / code · retry relation · application status |

- Teacher Final은 AI Structured Draft와 별개다.
- 향후 장애 분석용 raw 보존이 필요해지면 별도 Security / Privacy Decision이 필요하다 (explicit enablement · 제한 접근 · 암호화 · 짧은 보존 · 삭제 · audit · 아동 데이터 처리 · 법무 검토). **기본 제품에는 raw retention 없음.**
- 실제 컬럼은 PHASE 05 — **raw_response 같은 TEXT/JSONB 컬럼을 기본 설계에 두지 않는다.**

---

## 11. Retry · Duplicate · Error Model (DEC-072)

| 실패 | 교사 경험 |
|---|---|
| 미설정 · 제공자 장애 · 타임아웃 · rate limit | "AI 초안을 만들 수 없습니다 — 직접 작성해 주세요." 입력 유지 |
| 스키마 오류 · unsafe output · 검증 실패 | 초안 미저장 또는 해당 섹션 제외 · 일반화된 안내 문구 · **raw output은 DB · 로그에 저장하지 않고** attempt · provider/model · 시각 · sanitized error code · validation result만 기록 (DEC-078) |
| insufficient evidence | 해당 섹션 비움 + 안내 |

| 규칙 | 내용 |
|---|---|
| 자동 retry | **기본 없음** (CURRENT `maxRetries: 0` 유지) |
| 수동 retry | **새 generation attempt**로 기록. 이전 attempt는 이력 보존 (CURRENT의 덮어쓰기 방식 변경) |
| 현재 초안 | 마지막 성공 attempt |
| 중복 방지 | generating 상태 · 같은 대상 동시 요청 1건 · 버튼 비활성 |

---

## 12. Prompt / Model / Template Versioning (DEC-072)

| 규칙 |
|---|
| Prompt · model 변경은 **미래 generation에만** 적용. Complete · 공개된 Report를 자동 재생성하지 않는다 |
| Reopen(새 Revision)에서 AI를 다시 쓰면 새 generation metadata를 남긴다 |
| 특정 모델 이름 · 파라미터를 Product Decision으로 고정하지 않는다. 목표: 낮은 창의성 · 근거 중심 · structured output · deterministic에 가까운 문장 |
| **Report Template Version ≠ Product Version** (예: Product v1 + `weekly-v2`). Revision마다 Template Version 추적 |
| Growth 5 문구 · 템플릿 변경도 기존 Complete Revision을 바꾸지 않는다 |

---

## 13. Language

P0 기본 리포트 언어는 한국어. Source evidence language · Report language · AI output language 분리는 **보류** (AR-5).

---

## 14. CURRENT AI Code 관찰 (HEAD `11269e6`)

| 항목 | 관찰 |
|---|---|
| 호출 위치 | 서버 액션(`"use server"`) → `src/lib/ai/observation-draft-provider.ts` · `growth-report-draft-provider.ts` |
| Server 경계 | provider 모듈에 컴파일 단계 서버 전용 표시 없음 · `typeof window` 런타임 검사만 → PHASE 07 강화 |
| 프롬프트 | `SYSTEM_INSTRUCTIONS` 상수 (관찰 L110-133 · 리포트 L117-159) |
| 모델 결정 | env `OPENAI_OBSERVATION_MODEL` · `OPENAI_GROWTH_REPORT_MODEL` (fallback observation) |
| 출력 | Responses API `output_text` — 관찰은 자유 텍스트 · 리포트는 JSON 텍스트 직접 파싱 (**json_schema 아님**) |
| 입력 | 관찰: 차시 · 영역 라벨 · 아이의 말 · 교사 노트 / 리포트: 기간 · 출결 집계 · 근거 스냅샷. 이름 · ID · 사진 미전송 |
| 저장 | 관찰 AI: 관찰당 1행 · 재생성 시 덮어씀 · `generated → accepted` / 리포트 AI: 리포트당 1행 · `source_revision` stale 감지 · "적용" |
| Retry · 타임아웃 | `maxRetries: 0` · 25초 / 40초 |
| 권한 | `requireTeacher` · 기관 일치 · 세션 · 반 상태 검증 후 호출 · 원장은 리포트 AI 초안 비열람 |

이는 코드 구조 관찰이며 보안 인증을 의미하지 않는다.
