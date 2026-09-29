# AI · AR-8 (PHASE 10A · 읽기 전용)

## 정의 · 상태

**AR-8 — 자유 텍스트 속 개인정보 최소화** (`docs/04-ai-report/open-items.md:66,80` · OPEN · "BEFORE EXTERNAL P0 AI USE" · "Pilot 은 AI OFF 로 진행 가능") · 관련 P08-OPEN-9(식별자 검사 한계) · BP-16(국외 이전 고지).
`ai_assist.blocked_by = {AR-8}` (seed m2 `:141`).

## 현재 AI 경로 (코드 확인)

| 경로 | 위치 | 판정 |
|---|---|---|
| 관찰 정리 초안 (legacy C1) | `src/lib/staff/observation-ai-actions.ts` → `src/lib/ai/observation-draft-provider.ts` | `authorizeAiAssist` (DB `ai_assist_authorization`) → env 확인 → 명시 식별자 차단 → provider → 저장 RPC |
| 성장 리포트 초안 (legacy C2) | `growth-report-ai-actions.ts` → `growth-report-draft-provider.ts` | 같은 순서 · C2 는 `monthly_report` 도 필요 |
| DB 판정 | `private.ai_assist_block_reason`: policy_blocked → not_released → not_entitled → read_only (`20261002091000`) | fail closed |
| 저장 gate | G-2 의 `gate_ai_draft_release` (AG002) — Staging 적용됨 | — |
| **Weekly · Observation 2.0 · portal** | **AI 없음** (weekly-report-actions `:14` · WeeklyComposer `:49` · portal DTO) | — |
| env | 이름만: `OPENAI_API_KEY` · `OPENAI_OBSERVATION_MODEL` · `OPENAI_GROWTH_REPORT_MODEL` (서버 전용) | — |

## AI 없이 완주 (증거)

- 신규 리포트 schema 에 AI 컬럼 없음 ("신규 2.0 경로에는 AI 필수 의존이 없다" · `20261001093000…:7-8`)
- Weekly 완료 조건에 AI 없음 (RP006)
- pgTAP "WS2: AI-off path — Growth5 observation works with AI blocked" (`supabase/tests/p0_phase08_security.test.sql:383-391`)
- local role E2E 교사 13/13 — AI key 없음 (PHASE 09C)
- V2 교사 화면에 AI UI 없음 (e2e 단계)

## Guard (코드 확인)

진단 · 점수 · 발달 단계 · 또래 비교 · 예측 금지 (provider prompt) · AI 는 자유 텍스트만 반환 → **Growth5 · stage 자동 선택 없음** · 초안은 draft 로만 · 교사 검토 · 작성완료 필수 · 페이지 로드 시 자동 생성 없음 · 아동 이름 · id · 기관 · 반 · 사진 미전송 · 명시 식별자 차단(자유 텍스트 속 이름은 남을 수 있음 = AR-8).

## 분류

**feature-specific blocker** (`ai_assist` · 외부 AI 사용). 핵심 흐름 · STARTER 의 blocker 아님.
- `docs/04-ai-report/open-items.md:105` 의 Production Blocker 집합은 CO-2 · CO-9 · CO-10 · CO-12 (AR-8 없음)
- 단 **STANDARD · PREMIUM · PILOT 은 `ai_assist` 를 포함** → AR-8 해결(또는 상품 정의 변경 · 사람 결정) 전 활성화 불가
- STARTER 는 `ai_assist` 미포함 (`docs/03-commerce/product-catalog.md:160`)
