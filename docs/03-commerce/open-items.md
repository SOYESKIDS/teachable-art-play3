# Open Items — PHASE 03 (Product / Contract / Entitlement / Commerce)

| | |
|---|---|
| 문서 상태 | 운영 중 (Commerce 관련 미확정 사항) |
| 최종 갱신 | 2026-09-27 |
| Branch / 기준 commit | `saas-v2` / `b31fdc9` |
| 관련 문서 | [../00-project/decision-log.md](../00-project/decision-log.md) · [../01-product/open-items.md](../01-product/open-items.md) · [../02-ia/open-items.md](../02-ia/open-items.md) |

---

## 0. 규칙

| # | 규칙 |
|---|---|
| 1 | 확정되지 않은 것만 적는다. 확정되면 decision-log에 DEC-064부터 부여하고, 이 문서에서는 삭제하지 않고 `RESOLVED by DEC-XXX`로 표시한다 |
| 2 | ID 접두어 `CO-` (Commerce Open). 한 번 쓴 번호는 재사용하지 않는다 |
| 3 | **법무 · 회계 · PG · 영업 정책 · 원본 자료 확인이 필요한 것은 억지로 결정하지 않는다** |
| 4 | 각 항목에 Owner · Required-by · Production Blocker 여부를 명시한다 |

---

## 1. Production Blocker

> Pilot 내부 개발을 모두 막지는 않지만 **Production 공개 전에 해결되어야 한다.**

| ID | 항목 | 왜 Blocker인가 |
|---|---|---|
| **CO-2** | 데이터 보관 · 파기 · Export | 계약 종료 기관의 데이터를 언제 · 어떻게 파기하고 반환할지 기준이 없다. 현재 개인정보처리방침은 "확인 절차를 거쳐 파기"만 기재 — 적용 법령상 요구 사항은 법무 확인 대상 |
| **CO-9** | 단체 사진 내 다른 아동 식별 처리 | Portal 사진 공개 시 동의하지 않은 아동이 노출될 수 있음 |
| **CO-10** | Consent 법적 단위 · 문구 + Privacy 고지 정합 | 현재 개인정보처리방침은 "공유 화면에 사진이 포함되지 않는다"고 기재 (L-1) — 설계와 불일치 (R-7) |
| **CO-12** | Portal 만료 · 재발급 정책 | 현재 고지 · 트리거는 30일 (L-2). 아동 단위 학기 링크(DEC-040)와 불일치 |

---

## 2. Commerce Open Decisions

| ID | 항목 | 논점 | Owner | Required-by | Blocker |
|---|---|---|---|---|---|
| **CO-1** | 계약 종료 후 Staff Read-only 유예 기간 | 기간 길이 · Pilot 동일 여부 · 계약서 조정 범위 (DEC-052 모델은 확정) | 사업 + 법무 | 계약서 서식 확정 전 · 첫 계약 종료 전 | — |
| **CO-2** | 데이터 보관 · 파기 · Export | 보관 기간 · 파기 시점 · 파기 확인 절차 · Export 형식 · 법령상 보존 요구 여부 확인 (BP-17 잔여) | 법무 + Privacy | **P0 Production 전** | **YES** |
| **CO-3** | Pilot 가격 · 무료 여부 · 계약서 형태 | 공개 문구 "파일럿 운영 조건은 담당자 상담". 무료로 가정하지 않는다 | 사업 | Pilot 영업 전 | — |
| **CO-4** | STARTER "8주 요약"의 실체 | `packages.ts` STARTER 구성에만 존재 · DEC-010 3계층에 없음. 별도 산출물인가, Weekly 누적 보기인가 | 사업 + 교육 | STARTER 정식 판매(P1) 전 · DEC-063 STARTER Service Ready 판단 전 | — |
| **CO-5** | "AI 성장기록 플랫폼 Full" 의미 · `ai_assist` 상품 배분 | STANDARD에만 기재. STARTER AI 포함 여부 UNKNOWN. DEC-009 AI optional과의 관계 | 사업 | PHASE 04 | — |
| **CO-6** | 한 기관 다중 상품 (반별 상품) | site-copy 시나리오 A→B (1~2반 STARTER → 전 학급 STANDARD). DEC-049는 동시 효력 정규 계약 1개 | 사업 + 제품 | P2 | — |
| **CO-7** | Upgrade 시 Program 구조 | 상품별 Program(TAP-STARTER-08 등) vs 24주 단일 계열 + 주차 범위. Pilot → STARTER Week 5 연속 · Upgrade 연속에 영향 | Architecture + 콘텐츠 | PHASE 05 | — |
| **CO-8** | 시스템 Branding 범위 | PREMIUM "원 브랜딩 지원"의 시스템 기능 (로고 · Portal 헤더 · 인쇄 표지 등). SOURCE 없음 · 화이트라벨 근거 없음 | 사업 | P2 전 | — |
| **CO-9** | 단체 사진 내 다른 아동 식별 | 선택 사진에 비동의 아동이 식별되는 경우의 처리 · 교사 확인 절차 여부 | 법무 + 제품 | **P0 Production 전** (사진 공개 전) | **YES** |
| **CO-10** | Consent 법적 단위 · 문구 · Privacy 고지 정합 | 아동 단위 충분 여부 · 촬영/공유 분리 · 동의 문구 · 철회 처리 범위 · 개인정보처리방침 L-1 개정 | 법무 + Privacy | **P0 Production 전** | **YES** |
| **CO-11** | 달력 계약 기간 vs 운영 주차 | 16주 = "한 학기" · 휴원 · 방학 반영 · 계약 End Date와 주차 수 관계 (BP-8 잔여) | 사업 | 계약서 서식 확정 전 | — |
| **CO-12** | **Child Secure Portal Expiration / Reissue Policy** | 계약 기간과 링크 만료의 관계 · 학기 동안 동일 링크 사용 기간 · 계약 종료 후 Portal 유지 기간 · 재발급 시 기존 링크 revoke 여부 · 링크 분실 · 장기 링크 보안 · 기존 30일 정책에서 migration (PH3-4 이관) | Product + Security + Privacy/Legal | **P0 Portal Production 전** | **YES** |
| ~~CO-13~~ | ~~Service Ready 계산에서 "후반 기능"의 처리~~ | ✅ **RESOLVED by DEC-063 clarification (2026-09-27)** — Product Version이 약속한 것 전체가 활성화 전에 Ready여야 하며 후반 기능 자동 예외 없음. 나중에 제공하려면 별도 Product Version 또는 축소 Offer를 향후 결정으로 정의 | — | — | — |

---

## 3. PHASE 03 대상이었으나 미처리 → 이월

01-product/open-items.md에서 "PHASE 03 확정"으로 예정되었으나 이번 PHASE에서 다루지 않은 항목. 새 ID를 만들지 않고 원 ID로 추적한다.

| 원 ID | 항목 | Commerce 관련성 | 새 Required-by |
|---|---|---|---|
| **PH3-2** | 원장에게 교사 초대 · 배정 권한 위임 | DEC-049 · DEC-051 Class Scope · 좌석 관리와 연결 | PHASE 05 전 |
| **PH3-3** | 리포트 reopen 정책 | DEC-043 Emergency Hide의 **숨김 해제 · 정정 경로**와 함께 결정 | PHASE 04 |
| **PH3-6** | Asset 다운로드 허용 정책 | `content_playback` (P1) · 저작권 BC-14 · 계약 종료 후 잔존 | P1 콘텐츠 재생 전 |
| **PH3-7** | Demo 계정 · 샘플 데이터 | Lead → Demo 영업 흐름 | P1 |
| **PH3-8** | 학기 전환 절차 | DEC-053 Renewal (반 재편성 · 원아 진급 · 프로그램 재배정) | 첫 Renewal 사례 전 |

---

## 4. 기존 BP · BC 중 Commerce 관련 잔여

| ID | 항목 | 상태 | Blocker |
|---|---|---|---|
| BP-1 · BP-2 · BP-3 · BP-4 | 환불 · 자동갱신 · 결제주기 · 해지 | 미확정 (결제 도입 · 계약서 서식 전) | — |
| BP-5 | PG 사업자 | 미확정 · DEC-061 (P2 후보) | — |
| BP-6 | 초과 인원 청구 방식 · 산정 시점 | 미확정 · DEC-051은 기록까지만 | — |
| BP-7 | 3개 반 이상 단가 | 별도 상담 | — |
| BP-10 | B2G 조건 | 미확정 · 향후 Offer 유형 | — |
| BP-14 | STANDARD · PREMIUM 판매 고지 정합성 | 부분 해결: 활성화 차단(DEC-063) · 판매 문구는 사업 판단 | 판매 계약 체결 시 |
| BP-15 | 결제 도입 시 법무 문서 개정 | 결제 도입 시점까지 유지 | — |
| BP-16 | 개인정보 국외이전(AI 위탁) 고지 범위 | P0-16 · Pilot Go G-9 | Pilot Go |
| BC-1 | Week 9~16 — **SOURCE EXISTS (MIXED)**: `TeachAble_ArtPlay_24주_강의교안_데이터구조.pdf` P2 "우리 그리고 모두의 사계절" (9~16주 스탠다드 교사용 프로그램 설명서 PDF + 미기재 항목 초안) · PROJECT EXTERNAL SOURCE (source verified during PHASE 03 review · original PDF exists in Project materials · PDF is not versioned inside this Git repository) | **production-approved operational content pending** (승격 · 정규화 · 이관 전) → STANDARD **Service Ready 불가** (DEC-063) | 해당 상품 활성화 |
| BC-2 | Week 17~24 — **SOURCE EXISTS (DRAFT / PROPOSAL)**: 같은 자료 P3 "두근두근 세계여행" (주제 원안 · 주차별 키워드 + 전체 초안 설계) · repo 미포함 | **production-approved operational content pending** → PREMIUM **Service Ready 불가** (DEC-063) | 해당 상품 활성화 |
| BC-3 | STARTER Week 7~8 규격 미적용 | STARTER Service Ready 조건 | STARTER 활성화 |
| BC-4 | 대상 연령 (판매 문구 X-2와 충돌) | 원본 확인 필요 | — |
| BC-14 | 자산 저작권 · 라이선스 | `content_playback` 전제 | P1 |
| BC-15 | 상품소개서 v4 원본 | **SOURCE EXISTS** — `TeachAble_Art_Play_유치원_상품소개서_v4.pdf`는 PROJECT EXTERNAL SOURCE다 (source verified during PHASE 03 review · original PDF exists in Project materials · PDF is not versioned inside this Git repository). 확인 항목은 [product-catalog.md §3](./product-catalog.md#3-package-comparison)에 `SOURCE(v4)`로 반영. repo 편입 여부는 운영 판단 | — |

---

## 5. 정합화 대상 (결정은 완료 · 코드/마케팅 미반영)

| 대상 | 내용 | 근거 | 시점 |
|---|---|---|---|
| `src/data/packages.ts` 비교표 | STANDARD "월간 · 학기 리포트" → Weekly 포함 표기 (**MARKETING DRIFT** — 원본 v4 · DEC-057과 불일치) | SOURCE(v4) · DEC-057 · R-2 | P1-14 |
| `src/data/program-products.ts` STANDARD 설명 · SEO | Weekly 누락 (**MARKETING DRIFT**) | SOURCE(v4) · DEC-057 | P1-14 |
| `program-products.ts` 1주차 블록 · "40~50분" | DEC-023 6단계 · 워크북 50분 밖 | DEC-023 · X-3 · X-4 | P1-15 |
| 판매 사이트 대상 연령 | 원본 미표기 | BC-4 · X-2 | 원본 확인 후 |
| `src/data/legal.ts` 사진 · 30일 문구 | Portal 설계 반영 | CO-10 · CO-12 · R-7 | **Production 전** |
| PHASE 02 본문 서술 | STANDARD Weekly · STARTER 원장 · Sales · Portal "이번 주" 등 | [../02-ia/open-items.md §7](../02-ia/open-items.md#7-phase-03-결정으로-갱신이-필요한-phase-02-서술-정합화-대기) | 다음 docs 정합화 |

---

## 6. PHASE 04 / 05 Inputs

**PHASE 04 (AI Growth)**

| 항목 |
|---|
| `ai_assist` 상품 배분 (CO-5) |
| P0 Weekly AI 없음 (DEC-039) · Monthly AI 초안 범위 (STANDARD · PREMIUM) |
| **Semester는 Monthly에 종속되지 않음** — Observation · Weekly · Monthly 등 허용된 Evidence Source 집계 규칙 (DEC-055) |
| 결석 · 미공개 주차는 Monthly · Semester 서술에서 "기록 없는 주"로만 다룸 · 사유 추정 금지 (DEC-060) |
| 사진 · Consent 정보는 AI 입력에서 제외 |
| 리포트 reopen · 숨김 해제 (PH3-3) |
| Usage Limit (AI 호출) — P1 이후 |

**PHASE 05 (DB / ERD / Security)**

| 항목 |
|---|
| Product · Product Version · Offer · Contract · Contract 이벤트 · 감사 구조 (DEC-048 · admin-flow §4) |
| ONE EFFECTIVE CONTRACT AT A TIME 강제 · 미래 후속 계약 허용 (DEC-049) |
| 날짜 파생 상태 계산 위치 · Entitlement 파생 · 캐시 (DEC-050 · DEC-055) |
| Read-only 모드를 모든 쓰기 경로(Server Action · RPC · 트리거)에 적용 (DEC-052) |
| Organization suspended 우선 판정 |
| 서비스 반 수 HARD · 초과 원아 계산 (DEC-051) |
| Service Ready 계산 방식 (DEC-063 — 약속한 것 전체 · 후반 기능 예외 없음 원칙은 확정) |
| Week 9~24 Project External Source의 승격 · 정규화 · 이관 경로 (BC-1 · BC-2 — 자료 존재 ≠ Production Ready) |
| Program 구조 (CO-7) |
| Consent state 저장 · 철회 시 사진 노출 중단 (DEC-059) |
| Portal 판정에 Contract 상태 반영 · 만료 정책 (CO-12) |
| Sales RLS 분리 (DEC-058 · P0-15) |
| 기존 1.0 기관 Contract 소급 절차 |
| Emergency Override (DEC-047) · 기능 제한 구현 위치 (AD-2) |
