# Product Catalog — TeachAble Art Play SaaS Platform 2.0

| | |
|---|---|
| 문서 상태 | PHASE 03 승인본 (검토 반영 · Source 상태 정정 2026-09-27) |
| 작성 기준일 | 2026-09-27 |
| Branch / 기준 commit | `saas-v2` / `b31fdc9` |
| 관련 문서 | [commerce-overview.md](./commerce-overview.md) · [entitlement-policy.md](./entitlement-policy.md) · [open-items.md](./open-items.md) |
| 관련 결정 | DEC-010 · DEC-024 · DEC-031 · DEC-032 · DEC-048 · DEC-054 · DEC-055 · DEC-057 · DEC-062 · DEC-063 |

---

## 1. Source Status와 Certainty

### 1-1. Source 상태 3단계 (혼동 금지)

| 상태 | 의미 |
|---|---|
| **SOURCE EXISTS** | Project 원본 자료가 존재한다 (Project External Source 포함) |
| **LOCAL / REPO OPERATIONAL SOURCE** | repo 안에서 읽을 수 있고 운영 데이터 · 코드로 연결 가능한 자료 |
| **PRODUCTION READY** | 승인된 콘텐츠와 필수 기능이 실서비스 조건을 충족 (DEC-063) |

금지하는 추론:
- "repo에서 PDF를 읽을 수 없다" → "SOURCE가 존재하지 않는다" ✖
- "Project source에 초안이 있다" → "Production Ready다" ✖

### 1-2. PROJECT EXTERNAL SOURCE

> **PROJECT EXTERNAL SOURCE** — source verified during PHASE 03 review (2026-09-27) · original PDF exists in Project materials · PDF is not versioned inside this Git repository. 이 문서 작성자가 repo 안에서 원본을 직접 읽은 것이 아니며, 아래 내용은 PHASE 03 review에서 확인된 원본 기재 사항이다.

| 자료 | 상태 | 비고 |
|---|---|---|
| `TeachAble_Art_Play_유치원_상품소개서_v4.pdf` | **SOURCE EXISTS** · repo에 versioned source로 포함되지 않음 | 확인된 항목은 §3에서 `SOURCE(v4)`로 표기 |
| `TeachAble_ArtPlay_24주_강의교안_데이터구조.pdf` | **SOURCE EXISTS** · repo 미포함 | Week 1~24 구조 존재 |
| — P2 · Week 9~16 "우리 그리고 모두의 사계절" | SOURCE EXISTS · **MIXED** | 출처: 9~16주 스탠다드 교사용 프로그램 설명서(PDF) + 미기재 항목 초안 |
| — P3 · Week 17~24 "두근두근 세계여행" | SOURCE EXISTS · **DRAFT / PROPOSAL** | 출처: 주제 원안(주차별 키워드) + 전체 초안 설계 |

두 범위 모두 **production-approved operational content는 아직 없다** — repo 내 승격 · 정규화 · 이관이 되지 않았다 (BC-1 · BC-2). 따라서 STANDARD · PREMIUM은 **Service Ready가 아니다** (DEC-063).

### 1-3. Certainty 표기

| 표기 | 의미 |
|---|---|
| **DECISION** | decision-log의 확정 결정 |
| **SOURCE(v4)** | 상품소개서 v4 원본 — PROJECT EXTERNAL SOURCE · PHASE 03 review에서 확인된 항목 (Weekly = STARTER 이상 · Monthly = STANDARD 이상 · Semester Portfolio = STANDARD 이상 · STANDARD 16주 150,000원/월 · 600,000원/학기 · Weekly / Monthly Report · Semester Portfolio · Director Dashboard · PREMIUM 250,000원/월 · 1,500,000원/24주 · STANDARD 모든 구성 포함 · 15명/1개 반 · VAT 별도 · 초과 1인당 월 6,600원부터 · 3개 반 이상 별도 상담 · 키트 배송비 포함) |
| **SOURCE(guide)** | repo 안의 원본 교육자료 (STARTER 표준화 규격 · 1~6주차 가이드) |
| **CODE** | 현재 HEAD 코드에만 확인된 값 (`src/data/packages.ts` · `program-products.ts` · `site-copy.ts`). 원본에서 확인하지 못한 항목은 CODE로 둔다 |
| **UNKNOWN** | 자료 없음 |
| **CONFLICT** | 원본 · 결정 간 불일치 |
| **DRIFT** | 원본 · 결정과 현재 코드 · 마케팅 문구의 불일치 (원본 · 결정이 옳다) |

---

## 2. Product Catalog

| Code | 이름 (CODE) | Offer | 판매 상태 | 비고 |
|---|---|---|---|---|
| `starter` | STARTER · 스타터 밸런스 팩 | regular | 공개 판매 중 | Week 7~8 규격 미적용 (BC-3) |
| `standard` | STANDARD · 플레이 팩 | regular | 공개 판매 중 | Week 9~16: SOURCE EXISTS (MIXED) · production-approved content pending (BC-1 · BP-14) |
| `premium` | PREMIUM · 스마트 아트 & 플레이 | regular | 공개 판매 중 | Week 17~24: SOURCE EXISTS (DRAFT/PROPOSAL) · production-approved content pending (BC-2 · BP-14) |
| `pilot` | 4주 파일럿 | **pilot (별도 Offer)** | 정규 판매상품 아님 (DEC-054) | 가격 UNKNOWN (CO-3) |

Product Version: P0는 각 상품 **v1** 하나. 상품 정의 변경 시 새 버전을 만들고 체결된 계약은 체결 당시 버전을 유지한다 (DEC-048).

---

## 3. Package Comparison

| 항목 | STARTER | STANDARD | PREMIUM | PILOT |
|---|---|---|---|---|
| Weeks | 8 · DECISION | 16 · SOURCE(v4) | 24 · SOURCE(v4) | 4 · Week 1~4 · DECISION |
| Duration | 약 2개월 · CODE | 한 학기 · SOURCE(v4) ("600,000원 / 학기") | 24주 · SOURCE(v4) | 4주 · DECISION |
| Target Age | 만 4~6세 · **CONFLICT** (X-2) | 만 4~7세 · **CONFLICT** | 만 4~7세 · **CONFLICT** | UNKNOWN |
| Base Class Size | 1개 반 · 15명 · SOURCE(v4) | 동일 · SOURCE(v4) | 동일 · SOURCE(v4) | 반당 최대 15명 · DECISION |
| Price Basis | 월 99,000원 / 반 · CODE | 월 150,000원 · SOURCE(v4) | 월 250,000원 · SOURCE(v4) | **UNKNOWN** |
| Total Price | 198,000원 · CODE | 600,000원 / 학기 · SOURCE(v4) | 1,500,000원 / 24주 · SOURCE(v4) | UNKNOWN |
| VAT | 별도 · SOURCE(v4) | 별도 · SOURCE(v4) | 별도 · SOURCE(v4) | UNKNOWN |
| Additional Child | 월 6,600원 "부터" / 명 · SOURCE(v4) | 동일 · SOURCE(v4) | 동일 · SOURCE(v4) | 해당 없음 (최대 15명) |
| 3개 반 이상 | 별도 상담 · SOURCE(v4) | 동일 · SOURCE(v4) | 동일 · SOURCE(v4) | 해당 없음 (최대 2반) |
| 키트 배송비 | 포함 · SOURCE(v4) | 포함 · SOURCE(v4) | 포함 · SOURCE(v4) | UNKNOWN |
| **Reports** | **Weekly** · SOURCE(v4) + DECISION (DEC-057) · "8주 요약" UNKNOWN (CO-4) | **Weekly · Monthly · Semester Portfolio** · SOURCE(v4) + DECISION (DEC-057) | Weekly · Monthly · Semester · SOURCE(v4) ("STANDARD 모든 구성 포함") + DECISION | Weekly · DECISION |
| Director Dashboard | **EXCLUDED** · DECISION (DEC-031) | INCLUDED · SOURCE(v4) + DECISION | INCLUDED · SOURCE(v4) ("STANDARD 모든 구성 포함") | INCLUDED · DECISION (검증용) |
| Class Mode | INCLUDED · DECISION (DEC-004) | INCLUDED | INCLUDED | INCLUDED |
| Parent Portal | INCLUDED · DECISION (DEC-055) | INCLUDED | INCLUDED | INCLUDED |
| Content Range | Week 1~8 | Week 1~16 (9~16 SOURCE EXISTS · MIXED · production pending) | Week 1~24 (17~24 SOURCE EXISTS · DRAFT/PROPOSAL · production pending) | Week 1~4 |
| Branding | — | — | "원 브랜딩 지원" · CODE · 시스템 기능 UNKNOWN (CO-8) | — |
| Contract Deliverable | 창의활동 키트 2회 · CODE | 키트 4회 · CODE | 키트 6회 · 도입원 현판 · 상담자료 팩 · CODE (DEC-062) | UNKNOWN |
| In-app Media | P1 · DECISION (DEC-029) | P1 | P1 | 없음 |
| AI (`ai_assist`) | **UNKNOWN** (CO-5) | "AI 성장기록 플랫폼 Full" · CODE · 의미 UNKNOWN | UNKNOWN (추정 포함) | 관찰 AI optional (CURRENT) |
| Support | UNKNOWN | UNKNOWN | UNKNOWN | 지원 채널 확보 (G-11) |
| Contract Type | regular | regular | regular | pilot offer |

- 원본(v4)에서 확인하지 못한 항목은 CODE로 남겼다 (STARTER 가격 · 기간 표현 · 키트 횟수 · 현판 등). v4에 있을 수 있으나 이번 확인 목록에 없던 항목을 SOURCE로 올리지 않는다.
- 가격 숫자가 있다고 해서 **자동 청구 · 결제주기 정책이 있다고 해석하지 않는다.** 월 금액 × 개월 수(4주 = 1개월)는 세 상품 모두 총액과 일치하지만(99,000×2 · 150,000×4 · 250,000×6) 결제주기(BP-3)는 미확정이다.

---

## 4. Source Conflict · Drift

### 4-1. Source Conflict (원본 · 결정 간)

| # | 항목 | 출처 A | 출처 B | 상태 |
|---|---|---|---|---|
| X-2 | 대상 연령 | 판매 사이트 4~6세 / 4~7세 (CODE) | STARTER 표준화 규격 전 주차 미표기 (BC-4) | OPEN — 원본 우선(R-1). v4 기재 여부 미확인 |
| X-5 | STARTER "8주 요약" | `packages.ts` STARTER 구성 (CODE) | DEC-010 3계층에 없음 | OPEN → **CO-4** (DEC-063 STARTER Readiness에 영향) |
| X-6 | "AI 성장기록 플랫폼 Full" | STANDARD 구성에만 기재 (CODE) | DEC-009 AI optional · STARTER 기재 없음 | OPEN → **CO-5** |
| X-8 | 포트폴리오 | STANDARD "학기 성장 포트폴리오" | DEC-015 Semester Portfolio | 충돌 아님 — **포트폴리오 = Semester 산출물** |

### 4-2. CURRENT CODE / MARKETING DRIFT (원본 · 결정이 옳다)

| # | 항목 | 원본 · 결정 | 현재 코드 · 마케팅 | 정합화 |
|---|---|---|---|---|
| X-1 | **STANDARD Weekly** | SOURCE(v4): Weekly = STARTER 이상 · STANDARD = Weekly / Monthly Report + Semester Portfolio + DEC-057 | `packages.ts` 비교표 "월간 · 학기 리포트" · `program-products.ts` STANDARD 설명 · SEO (주간 없음). `packages.ts` 구성 목록 "주간 · 월간 리포트"는 원본과 일치 | P1-14 |
| X-3 | 수업 구성 | DEC-023 (워크북 50분 밖) · SOURCE(guide) | `program-products.ts` 1주차 블록 (워크북 8분 포함 · 몸놀이 12 · 미술 12) | P1-15 범위 |
| X-4 | 수업 시간 | DEC-023 50분 + 워크북 10분 | "주 1회 · 40~50분" | 마케팅 문구 검토 |
| X-7 | PREMIUM 기간 표현 | SOURCE(v4) "1,500,000원 / 24주" | 상세 "일 년의 수업" · "연간 단위로" | 판매 표현 검토 |

### 4-3. 법무 문서와 제품 설계의 긴장 (R-7 대상)

| # | 현재 문구 (`src/data/legal.ts`) | 2.0 설계 | 상태 |
|---|---|---|---|
| L-1 | 공유 화면에는 원아의 내부 식별자나 **사진이 포함되지 않으며** | Weekly · Portal 선택 사진 노출 (DEC-014 · DEC-024) | **CO-10 · Production Blocker** — 개정 여부 · 방식은 법무 검토 |
| L-2 | 링크는 **기본 30일** 후 만료 | 아동 단위 링크 학기 사용 (DEC-040) | **CO-12 · Production Blocker** |
| L-3 | 계약 유지 동안 보유 · 종료 시 확인 절차를 거쳐 파기 · 기록 권리는 기관 | DEC-052 종료 모델 | 방향은 일치. 기간 · 절차는 **CO-1 · CO-2** |
| L-4 | 즉시 결제 · 온라인 구독 신청 · 공개 회원가입 없음 | DEC-061 | 일치 |

---

## 5. Report Entitlement (DEC-057 · SOURCE(v4))

| | Weekly | Monthly | Semester |
|---|---|---|---|
| **STARTER** | YES | NO | NO |
| **STANDARD** | **YES** | YES | YES |
| **PREMIUM** | YES | YES | YES |
| **PILOT** | YES | NO | NO |

- 근거: SOURCE(v4) "Weekly = STARTER 이상 · Monthly = STANDARD 이상 · Semester Portfolio = STANDARD 이상" + DEC-057.
- STARTER Weekly는 **축약판이 아니다.** DEC-024 5항목 + 다음 주 예고. "주간 미니 리포트"는 마케팅 표현이며 별도 축약 데이터 모델을 만들지 않는다.
- Semester는 Monthly Entitlement를 필수 dependency로 두지 않는다 (DEC-055).
- 제공 시기: Weekly P0 · Monthly P1 · Semester P2.

---

## 6. Feature Catalog (DEC-055)

정책 코드이며 DB enum이 아니다. 과도하게 쪼개지 않는다.

| CODE | HUMAN NAME | STARTER | STANDARD | PREMIUM | PILOT | 시기 | 확정 | DEPENDENCY |
|---|---|---|---|---|---|---|---|---|
| *(base)* | 교직원 기본 운영 — 오늘 · 이력 · 출결 · 관찰 · 리포트 조회 · 긴급 숨김 · 단건 인쇄 | ✅ | ✅ | ✅ | ✅ | P0 | HARD | 유효 계약 (별도 코드 없음) |
| `class_mode` | Class Mode | ✅ | ✅ | ✅ | ✅ | P0 | HARD | 콘텐츠 범위 |
| `weekly_report` | 주간 리포트 | ✅ | ✅ | ✅ | ✅ | P0 | HARD (DEC-057 · v4) | — |
| `monthly_report` | 월간 리포트 | ✖ | ✅ | ✅ | ✖ | P1 | HARD | — |
| `semester_report` | 학기 리포트 · 성장 포트폴리오 | ✖ | ✅ | ✅ | ✖ | P2 | HARD | **없음** — 허용된 Evidence Source에서 독립 생성 (source aggregation은 PHASE 04/05) |
| `director_dashboard` | 원장 대시보드 · 자동 누락 탐지 · 기간 집계 | ✖ | ✅ | ✅ | ✅ | P0 | HARD | — |
| `parent_portal` | Child Secure Portal | ✅ | ✅ | ✅ | ✅ | P0 | HARD (DEC-055) | 리포트 기능 1개 이상 |
| `bulk_print` | 반 단위 리포트 일괄 인쇄 | ✖ | ✅ | ✅ | ✖ | P1 | STARTER 제외 HARD (DEC-056) · 포함은 PROVISIONAL | — |
| `content_playback` | 콘텐츠 인앱 재생 | ✅ | ✅ | ✅ | ✖ | P1 | PROVISIONAL | Content Delivery Layer · 자산 권리 (BC-14) |
| `ai_assist` | AI 관찰 정리 · 리포트 초안 | UNKNOWN | ✅ 추정 | ✅ 추정 | ✅ (CURRENT 관찰 AI) | P0 (기존) | **UNKNOWN** (CO-5) | AI 설정 |
| `branding` | 시스템 브랜딩 | ✖ | ✖ | ✅ | ✖ | P2 | 존재 HARD · 범위 UNKNOWN (CO-8) | — |

**Feature가 아닌 것**

| 항목 | 관리 방식 |
|---|---|
| 콘텐츠 주차 범위 | Entitlement 매개변수 ([entitlement-policy.md §2](./entitlement-policy.md#2-content-entitlement)) |
| 사진 공유 | 기관 설정 + 아동별 동의 (DEC-059). 상품으로 사고파는 기능이 아님 |
| 현판 · 상담자료 팩 · 키트 | Contract Deliverable (DEC-062) |

---

## 7. Product Access Matrix

| 기능 | STARTER | STANDARD | PREMIUM | PILOT |
|---|---|---|---|---|
| Teacher Today | INCLUDED | INCLUDED | INCLUDED | INCLUDED |
| Class Mode | INCLUDED | INCLUDED | INCLUDED | INCLUDED |
| Week range | 1~8 | 1~16 | 1~24 | 1~4 |
| Observation · Growth 5 | INCLUDED | INCLUDED | INCLUDED | INCLUDED |
| Weekly | INCLUDED | **INCLUDED** | INCLUDED | INCLUDED |
| Monthly | EXCLUDED | P1 | P1 | EXCLUDED |
| Semester | EXCLUDED | P2 | P2 | EXCLUDED |
| Director Dashboard | **EXCLUDED** | INCLUDED | INCLUDED | **INCLUDED** |
| Director Sessions · History · Attendance | INCLUDED | INCLUDED | INCLUDED | INCLUDED |
| Director Reports (complete 조회 · Emergency Hide) | INCLUDED | INCLUDED | INCLUDED | INCLUDED |
| Portal | INCLUDED | INCLUDED | INCLUDED | INCLUDED |
| Photo (동의 전제) | INCLUDED | INCLUDED | INCLUDED | INCLUDED |
| Print (리포트 1건) | INCLUDED | INCLUDED | INCLUDED | INCLUDED |
| Bulk Print | EXCLUDED | P1 | P1 | EXCLUDED |
| Content Playback | P1 (PROVISIONAL) | P1 (PROVISIONAL) | P1 (PROVISIONAL) | EXCLUDED |
| Branding | EXCLUDED | EXCLUDED | P2 (범위 UNKNOWN) | EXCLUDED |
| Portfolio (= Semester) | EXCLUDED | P2 | P2 | EXCLUDED |

---

## 8. Commercial Activation Readiness (DEC-063)

**Product Version이 계약상 INCLUDED라고 약속하는 Content · Report capability · Feature · Entitlement dependency는 Production Service Activation 전에 모두 Service Ready여야 한다. "학기 후반에 필요하니 지금 없어도 된다"는 자동 예외는 없다.**

| 상품 | Service Ready 요건 (약속한 것 전체) |
|---|---|
| PILOT | 기존 P0 Ready 조건 — Week 1~4 필수 수업 데이터 (DEC-037) · Class Mode · Weekly · Portal · Dashboard · 반당 ≤ 15명 (DEC-051) |
| STARTER | Week 1~8 필수 수업 데이터 · Class Mode · Weekly · Portal · (구성으로 약속된다면) "8주 요약" — CO-4 해결 전 영향 |
| STANDARD | Week 1~16 필수 수업 데이터 · Class Mode · Weekly · **Monthly · Semester** · Director Dashboard · Portal |
| PREMIUM | Week 1~24 필수 수업 데이터 · STANDARD 전체 · (Branding은 CO-8에서 계약상 약속 범위가 정해진 뒤 요건에 반영) |

- 일부 기능을 나중에 제공하는 상품을 판매하려면 **기존 Product Version을 불완전하게 활성화하지 않고**, 향후 별도 결정으로 별도 Product Version 또는 명시적으로 축소된 계약 Offer를 정의한다.
- 준비되지 않은 상품: marketing · consultation · quote는 가능할 수 있으나 **production service activation은 차단**.
- 계산 방식은 PHASE 05. 현재 자료 기준 판정은 [commerce-overview.md §6](./commerce-overview.md#6-activation-readiness-dec-063).
