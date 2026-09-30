# PHASE 10D — STARTER 8주 출시 준비 마감 (결정 문서)

| | |
|---|---|
| 브랜치 | `phase-10c-release-controls` (시작 HEAD = origin = `db4fc3d`) · **병합하지 않음** |
| 범위 | STARTER 8주 모아보기 수락 · W7/W8 (BC-3) 증거 감사 · class_mode · weekly_report 체크리스트 승인용 정리 · 남은 blocker 목록 |
| 출시 | **어떤 기능도 출시하지 않음** — class_mode · weekly_report `is_released = false` · parent_portal CO-12 · ai_assist AR-8 · branding CO-8 유지 |
| 원격 | Staging **읽기 전용 조회만** (쓰기 0) · **Production 접근 0** |
| 자격증명 | Staging 역할 비밀번호 env 4개 = PRESENT (값 확인 · 출력 없음). **TEACHER CREDENTIAL ROTATION: HUMAN CONFIRMATION REQUIRED** — `staging-teacher@example.test` 가 노출 이후 새 값으로 재설정됐다는 운영자 확인이 없다. git secret scan 결과로 닫지 않는다. |

## A. STARTER 상품 정의

| 항목 | 값 | 증거 |
|---|---|---|
| product code | `starter` ("STARTER · 스타터 밸런스 팩" · regular) | `20261001100000_m2…:67` |
| version | `2026.1` — Staging `published` · migration seed 는 `draft` 로 만든다 (발행은 운영 입력) | m2 `:77` · Staging 조회 (2026-09-30) |
| 기간 | **week 1~8 = 8주** (`product_versions.week_from/week_to` · 발행 후 변경 불가 DEC-081) | m2 `:77` · pgTAP 10D S1 · Staging 조회 |
| 포함 기능 | `class_mode` · `weekly_report` · `parent_portal` (3개 · Staging 과 같음) | m2 `:89-91` · pgTAP 10D S2 |
| 제외 | `ai_assist` · `director_dashboard` · `monthly_report` · `semester_report` · `branding` (`content_playback` 은 의도적으로 seed 안 함) | m2 `:62-63` · `M3_post_cutover:265-275` |
| 콘텐츠 요건 | W1~W8 각 주차: 게시 프로그램 · 게시 차시 · 필수 section 11개 (s1 · s2 · s3 · s4a · s4c · s5 · s6 · s11 · s12 · s13 · s15) | `20261001111000_m3…:111-169` · m1 `:574-581` |
| 8주 모아보기 | STARTER 약속 기능 (DEC-069 · DEC-104) · capability · Readiness 항목 없음 (staff 화면) | `docs/03-commerce/product-catalog.md:195,209` |
| **AI 없이 운영** | **YES — 의도된 제품 결정**. DEC-070 (STARTER ai_assist EXCLUDED) · AR-8 은 STARTER blocker 아님 · weekly · 모아보기 경로 AI 호출 0 | `docs/00-project/decision-log.md:1796-1815` · `ai-ar8.md:33-36` · 앱 테스트 10D #8 |

변경하지 않았다.

## B. 8주 모아보기 수락 결과 — **PASS (수정 후)**

### 구현 경로

`reports`(weekly · 같은 아이 · 같은 배정 · 구간 · 완료본) + `report_revisions.content`(topic · quote_choice) + `report_revision_media`/`class_session_observation_media`(대표 사진 · 서명 URL 10분) + `class_sessions`(날짜) + `organization_entitlements`(STABLE · 구간)
→ `src/lib/staff/program-summary-queries.ts` (loader · server component 에서 호출 · server action 아님)
→ `src/lib/staff/program-summary-window.ts` (순수 구간 · 행 계산 · **PHASE 10D 신규**)
→ `src/app/{teacher,director}/growth-reports/weekly/[reportId]/summary/page.tsx` (`requireTeacher` · `requireDirector` · `?org` 기관)
→ `src/components/staff/ProgramSummaryView.tsx` (Week N · 날짜 · 사진 · 주제 · 아이의 말 · 수정본 · 숨김 표시 · Weekly 링크)
권한: RLS (교사 = 담당 반 · 원장 = 기관 · 원장은 완료 revision 만) · 학부모 portal 에는 없음.

### PHASE 10D 수정 (최소 · 앱만 · DB 변경 없음)

| 발견 | 수정 |
|---|---|
| 구간 edge case 3개: (a) 계약 정보 없음 → 계약 끝 clamp 없이 8주 · (b) 기준 주가 계약 끝보다 뒤 → clamp 없이 8주 · (c) 기준 주가 계약 시작보다 앞 → **기준 주가 구간에서 빠짐** — 모두 안내 없이 표시 | `summaryWindow` 가 `inContract` 를 돌려준다. 계약 범위 안 = 계약 시작부터 8주 단위 · 끝 clamp. 범위 밖 · 계약 없음 = 기준 주가 든 8주 구간 + 화면 안내("현재 계약 주차 범위 밖의 기록입니다" / "계약 주차 범위를 확인할 수 없어…"). 기준 주는 항상 구간 안. 행 조립도 구간 밖 Weekly · 날짜를 버린다 |
| page 가 기준 Weekly 의 기관을 선택 기관(`?org`)과 비교하지 않음 (RLS 가 읽기 범위는 막음) | loader 에 `organizationId` 필수 · 다르면 `not_found` (entitlement 조회 전) |
| 테스트 없음 | pgTAP `supabase/tests/p0_phase10d_starter_summary.test.sql` **22/22** · 앱 `supabase/validation/phase10d/starter_summary.test.mjs` **6/6** |

### 수락 기준 10개

| # | 기준 | 결과 | 증거 |
|---|---|---|---|
| 1 | STARTER = 8주 | **PASS** | pgTAP S1 · 앱 #1 (anchor W1~W8 → 1~8) |
| 2 | 교사 · 원장이 역할에 맞는 모아보기에 도달 | **PASS** | 앱 #2·3 (requireTeacher/Director · 기관 확인) · pgTAP W1 · A7 |
| 3 | 허용된 기관 · 반 · 아이만 | **PASS** | pgTAP A1~A12 (다른 반 교사 0 · 다른 기관 원장 0 · 기준 Weekly 읽기 불가 · 원장 완료본만) |
| 4 | 8주 밖 주를 조용히 포함하지 않음 | **PASS (수정)** | 앱 #4 · pgTAP W2 · G3 (실제 9주 완료본이 있어도 제외) |
| 5 | 빈 주에 관찰을 만들지 않음 | **PASS** | 앱 #5-7 (report = null · 날짜 null) · pgTAP W3 |
| 6 | Growth5 는 텍스트 · 서술 | **PASS** | 모아보기는 Growth5 값을 싣지 않음 (출력 키 검사) · 저장은 stage 텍스트 (DEC-065) |
| 7 | 점수 · 순위 · 진단 생성 없음 | **PASS** | pgTAP G1 (저장 열 없음) · 앱 화면 단어 검사 · 21개 weekly/portal 파일 검사 (부정 안내문 2건만) |
| 8 | STARTER 모아보기에 AI 불필요 | **PASS** | 앱 #8 (AI import 0) · pgTAP S2 (ai_assist 없음) |
| 9 | 발달 진단을 암시하지 않음 | **PASS (자동)** · 톤 최종 확인 = HUMAN APPROVAL REQUIRED | 화면 문구 "완료된 주간 리포트를 모아 보여 줍니다" · 빈 주 중립 문구 · 평가 · 비교 표현 없음 |
| 10 | 조회가 과거 기록을 바꾸지 않음 | **PASS** | pgTAP M1 · M2 (역할별 조회 전후 지문 동일) · 앱 #8 (insert/update/upsert/delete · server action 0 · RPC = STABLE entitlement 뿐) |

Staging 에서 모아보기 화면을 실제로 연 기록은 없다 (Staging 에 완료 Weekly 0 · 쓰기 금지). saas-v2 Preview 에는 이 수정이 배포되지 않았다.

## C. W7 상태

| 항목 | 결과 | 근거 |
|---|---|---|
| CONTENT EXISTS | **NO** (저장소) — 마케팅 제목만 (`src/data/program-products.ts:570-581` 주제 "나비·별 / 기다림") · 원자료 PDF 는 저장소 밖 (`docs/01-product/open-items.md:56`) | Explore 감사 · repo 전체 검색 |
| STRUCTURALLY COMPLETE | **NO** — 표준화 규격 v1.0 미적용 (`content-governance.md:20,265`) · W1~6 에 있는 growthKeyword · experienceSummary · experienceFlow · homeConnection 없음 · section 본문 없음 | `program-products.ts:67-69,571` "별도 준비 중" |
| LOADED IN STAGING | **NO (실제 콘텐츠)** — Staging 의 W7 행은 **합성** "7주 색과 모양 놀이(가상)" (프로그램 `STAGING-P8` "(가상)" · section 11 · 본문 합계 292자 · source_ref 없음) | `sql/p10d_starter_content.sql` #3 (2026-09-30) |
| MARKED OPERATIONAL | **충돌** — "W1~8 운영 자료" (`docs/10-employee-uat/known-limitations.md:30` · `phase-09c-report.md:40` · `docs/09-staging-validation/open-items.md:50` — 출처 · 승인자 · 날짜 없음) vs `DRAFT` 고정 (`content-governance.md:20,112,265,283` · `open-items.md:56` BC-3 · `mvp-scope.md:114` 외) | |
| HUMAN CONTENT APPROVAL EVIDENCE | **NO** — 승인 DEC 없음 · DB 에 승인 상태 · 승인자 열 없음 (`draft/published/archived` 만) · 서명 · 날짜 기록 없음 | `decision-log.md` 색인 · schema |

**Operational 로 표시하지 않는다.**

## D. W8 상태

| 항목 | 결과 | 근거 |
|---|---|---|
| CONTENT EXISTS | **NO** (저장소) — 마케팅 제목만 (`program-products.ts:582-593` 주제 "숲 / 공동체" · `finale: true`) · PDF 저장소 밖 | 위와 같음 |
| STRUCTURALLY COMPLETE | **NO** — W7 과 같은 누락 · 규격 미적용 | `content-governance.md:20,265` |
| LOADED IN STAGING | **NO (실제 콘텐츠)** — Staging W8 = 합성 "8주 색과 모양 놀이(가상)" (292자 · source_ref 없음) | `sql/p10d_starter_content.sql` #3 |
| MARKED OPERATIONAL | **충돌** (W7 과 같은 문서들) | |
| HUMAN CONTENT APPROVAL EVIDENCE | **NO** | |

**Operational 로 표시하지 않는다.**

참고: W1~W6 도 저장소 · Staging 에 **실제 콘텐츠가 없다** (Staging W1~6 = 같은 합성 차시). W1~6 의 "확정본"은 문서 서술뿐이다 — 콘텐츠 적재는 STARTER 전체의 문제다.
Staging 계약 Readiness 의 `content` 항목이 `ok = true` 인 것은 **합성 차시 때문**이다 (`missing_weeks = []`) — 콘텐츠 준비 증거가 아니다.

## E. BC-3 분류

**B. TECHNICALLY INCOMPLETE**

근거: W7 · W8 모두 저장소에 규격 적용 콘텐츠가 없고 (구조 미완) · Staging 에는 합성 행만 있으며 · 사람 승인 기록이 없다. "W1~8 운영 자료" 표기는 근거 없는 서술이므로 정정 대상이다. 승인을 만들어 넣지 않았다.
해소 조건: W7 · W8 원자료에 표준화 규격 v1.0 적용 → 교육 검토 · 콘텐츠 승인 (승인자 · 날짜 기록) → HQ Admin 으로 게시 차시 · 필수 section 입력 (Production · Staging 각각) → Readiness `content` 확인.

## F. class_mode 체크리스트

[class-mode-release-checklist.md](./class-mode-release-checklist.md) — 24항목: **PASS 15 · FAIL 0 · HUMAN APPROVAL REQUIRED 5 · BLOCKED 4** (BC-3 · G-1 · M5 · P10C-PROD). **출시 불가.**

## G. weekly_report 체크리스트

[weekly-report-release-checklist.md](./weekly-report-release-checklist.md) — 27항목: **PASS 18 · FAIL 0 · HUMAN APPROVAL REQUIRED 5 · BLOCKED 4** (CO-12 · G-1 · M5 · P10C-PROD). 8주 모아보기 항목은 **PASS**. **출시 불가.**

## H. CO-12 의존

`parent_portal.blocked_by = {CO-12}` · `is_released = false` (2026-09-30 Staging). STARTER 는 parent_portal 을 포함하므로 **CO-12 해결 없이는 STARTER 계약을 활성화 · (정지 후) 재개할 수 없다** (Readiness `feature:parent_portal = policy_blocked`). class_mode · weekly_report 를 출시해도 STARTER 는 활성화되지 않는다. 결정 필요: portal 만료 · 재발급 · 사후 보존 · 법적 문구 (SEC-NEW-3 "30일" 문구 일치) · rate limit (IB-5).

## I. G-1 의존

Staging G-1 **NOT APPLIED** (P09F-AUTH-1 · pooler 인증) · local 24/24 · 70/70. G-1 없이도 SaaS 2.0 RPC 의 쓰기 gate(SS005 · RP007)는 있으나, 수업 일정 계약 gate(EN002) · legacy 공유 쓰기 표면 gate 는 G-1 에만 있다. 체크리스트는 **G-1 을 출시 전제로 기록** (JUDGEMENT) — 사람이 면제할 수 있다.

## J. M5 의존

Staging M5 **NOT APPLIED** · 앱 `M5_app_preflight` **7/7** · JKL 앱 gate **READY** · `M5_post_cutover` 46/46 (local). legacy 직접 status UPDATE (P08-OPEN-1) 는 M5 가 닫는다. 체크리스트는 **M5 후 출시로 기록** (JUDGEMENT). 순서: G-1 → M5 → J/K/L (runbook).

## K. 남은 사람 결정

1. **BC-3**: W7 · W8 콘텐츠 규격 적용 · 교육 검토 · 승인 (승인자 · 날짜 기록) — 그리고 W1~6 실제 콘텐츠 적재 확인
2. **UAT 문서 정정 승인**: "W1~8 운영 자료" 표기(3곳)를 근거 있는 상태로 정정
3. **CO-12**: portal 정책 결정
4. **G-1 · M5 를 출시 전제로 할지** (체크리스트 JUDGEMENT 확인 · 면제 여부)
5. **class_mode · weekly_report 체크리스트 최종 승인** (승인자 · 날짜)
6. **Staging 출시 · 미출시 rehearsal 승인** (별도 · 이번 phase 금지)
7. **Staging 쓰기 흐름 직원 UAT** (수업 → Weekly 완료 → 모아보기) 수행 · 기록
8. **화면 표현 · 톤 최종 검토** (발달 진단 · 비교로 읽히지 않는지)
9. **TEACHER CREDENTIAL ROTATION: HUMAN CONFIRMATION REQUIRED** (`staging-teacher@example.test` 새 값 재설정 확인)
10. P09D-C2 (노출된 Staging `SUPABASE_SECRET_KEY` 회전/폐기) — Production 활성화 전

## L. PHASE 10D 이후 Production blocker

| ID | 내용 | 상태 |
|---|---|---|
| BC-3 | STARTER W7~8 콘텐츠 (규격 · 승인 · 적재) — W1~6 실제 적재 확인 포함 | **TECHNICALLY INCOMPLETE** |
| CO-12 | Child Portal 정책 · parent_portal blocker | OPEN |
| class_mode · weekly_report | 출시 승인 없음 · 체크리스트 BLOCKED 4 · HUMAN 5 | NOT APPROVED |
| G-1 | Staging 미적용 (P09F-AUTH-1) · Production 미적용 | OPEN |
| M5 · J/K/L | 미적용 · 미시작 | OPEN |
| P10C-PROD | Production 10C migration 미적용 | OPEN |
| G-2 (Prod) | Production PRE-G2 | OPEN |
| CO-2 | 데이터 보존 · 삭제 · 내보내기 | OPEN |
| P09D-C2 | 노출 Staging secret key | OPEN |
| SEC-NEW-3 · IB-5 | portal 만료 문구 · rate limit (portal 출시 시) | OPEN |
| 교사 자격증명 | 회전 확인 | HUMAN CONFIRMATION REQUIRED |

**Production Ready 아님.**

## 검증 (2026-09-30)

| 항목 | 결과 |
|---|---|
| Staging 읽기 전용 (`p10c_post_apply_verify` · `g2_post_verify` · `g1_post_verify` · `p10d_starter_content`) | 계약 active 1 · suspended 0 · 비합성 사용자 0 · class_mode · weekly_report 미출시 · parent_portal CO-12 · G-2 ACTIVE — VERIFIED · G-1 · M5 NOT APPLIED · 10C VERIFIED · 업무 데이터 지문 10C.2 와 동일 |
| pgTAP (local · run-local) | `supabase/tests` 5 files **301/301** (신규 22) · `G1_rehearsal_verify` 24/24 · `G2_post_cutover` 67/67 · `M3_post_cutover` 70/70 · `M5_post_cutover` 46/46 |
| 앱 테스트 | 10D 6/6 · 10C 6/6 · harness 49/49 · PHASE 08 app gates 13/13 · 09C QA 5/5 |
| `M5_app_preflight` · `JKL_start_gate` · `G2_app_preflight` | 7/7 PASS · READY · 17/18 (기대한 lifecycle FAIL · crash 없음) |
| lint · tsc · build | 통과 · 통과 · 통과 |

## 하지 않은 것

class_mode · weekly_report 출시 · CO-12 해제 · parent_portal 변경 · G-1 · M5 · J/K/L · UAT 계약 정지 · Staging 쓰기 · Production 접근 · 자격증명 회전 · 콘텐츠 작성 · 승인 기록 작성 · `saas-v2` · `main` 병합.

## 판정

**PHASE 10D STARTER READINESS PASS — HUMAN RELEASE DECISIONS REMAIN**

(8주 모아보기 구현 · 수락 테스트 완료 · 체크리스트 승인용 정리 완료. 남은 것은 사람 결정 · 콘텐츠(BC-3) · cutover · Production 이다 — 이 phase 에서 구현이 더 필요한 항목은 없다.)
