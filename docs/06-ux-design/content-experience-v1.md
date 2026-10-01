# Content Experience V1 — 정보구조 · 콘텐츠 · 역할별 화면

> 상태: **LOCAL REVIEW READY · NOT COMMITTED · NOT DEPLOYED** (branch `ui-brand-renewal`) · 2026-10-01
> 선행: [design-system-v3.md](./design-system-v3.md) (PHASE UI-01 Warm Atelier)
> 근거 순서: Decision log · 03-commerce · 01-product · `content/starter/2026.1` (canonical) · 승인 Phase 문서 · 현재 구현

---

## 1. Content strategy

**제품의 핵심은 연결이다.** 수업 → 관찰 → 기록 → 교사 확인 → 성장 기록 → 원 운영 확인. 화면의 모든 문장은 이 흐름의 어느 칸을 말하는지 분명해야 한다.

| 원칙 | 적용 |
|---|---|
| 근거 없는 말 금지 | 출시되지 않은 기능은 `준비 중`, 상품마다 다른 기능은 `STANDARD 이상` · `계약 범위` 배지(`AvailabilityTag`)를 단다. 수치는 원본에 있는 것만(8주 · 50분 6단계 · 성장 지표 5가지). |
| 브랜드 문장은 한 번 | "아이의 놀이를, 성장 이야기로 기록합니다."는 Hero H1 에만. 나머지 섹션은 각자의 역할 문장을 갖는다. |
| 짧고 구체적으로 | 교사가 이해하고 · 원장이 설명할 수 있고 · 학부모가 불안하지 않은 문장. "혁신 · 무한한 가능성 · AI 분석" 금지. |
| AI 는 조연 | "교사가 쓴 기록을 정리하는 보조 도구 · 준비 중 · STARTER 미포함"으로만 말한다 (DEC-009 · 070 · 071 · AR-8). |
| 실제 콘텐츠로 보여 주기 | 예시는 지어내지 않고 canonical STARTER 원본(1주차 · 4주차 · §12 관찰 가이드)에서 가져온다. |

## 2. Homepage narrative (19 → 13 섹션)

| # | 섹션 (id) | 메시지 | 합친 것 |
|---|---|---|---|
| 01 | Hero (`hero`) | 누구 · 무엇 · 차이 — proof 4개(8주 STARTER · 담임교사 직접 운영 · 주 1회 50분 · 회차별 가이드) | Hero 미니 흐름 제거 |
| 02 | Why (`why`) | 문제 A~E: 수업 전 · 중 · 후 · 학부모 · 원 운영 | Why + Needs |
| 03 | How it works (`solution`) | 수업 → 관찰 → 기록 → 교사 확인 → 운영 확인 | CoreSolution + Value |
| 04 | One session (`program`) | 50분 6단계 (DEC-023) + 수업 전 · 중 · 후 지원 | ClassTeacher (5단계 오류 수정) |
| 05 | Content (`content`) | 이야기 → 몸 → 표현 → 기록, 예시 = canonical W4 | Content + Nuri |
| 06 | 8-week journey (`journey`) | 마음 열기 → 자라나기 → 우리의 숲, 4~7주 → 8주 현수막 | 신규 |
| 07 | Growth record (`growth-record`) | 점수가 아니라 필요한 도움 · Growth5 규칙 · §12 가이드 · AI 원칙 | AIPrinciple + GrowthComparison + ParentReport + PlatformPreview(AI 탭) |
| 08 | Roles (`benefits`) | 교사 · 원장 · 학부모 가치 + 제공 상태 | Benefits |
| 09 | Director dashboard (`dashboard`) | 실제 대시보드 항목만 (오늘 요약 · 반별 · 확인 필요) · 예시 화면 | DirectorDashboard + PlatformPreview(원장 탭) |
| 10 | Packages (`pricing`) | "어떤 원에 맞나요?" → 카드 → 비교표 | Pricing (StarterShowcase · 시나리오 정리) |
| 11 | Onboarding (`adoption`) | 상담·데모 → 범위 → 설정 → 교사 온보딩 → 첫 수업 · 파일럿은 선택 | Adoption + Pilot |
| 12 | Trust (`safe-operation`) | 승인된 운영 원칙 6가지 | SafeOperation |
| 13 | Final CTA (`contact`) | "수업은 끝나도, 아이의 과정은 기록으로 남습니다." | — |

리듬: 마케팅은 **왼쪽 정렬 편집 지면**(섹션 머리 `HomeHeading`), 바탕 ivory → white → sand 교차, 가운데 정렬은 Final CTA 하나.

## 3. Dashboard hierarchy by role

공통 순서: **STATUS → NEXT ACTION → PROGRESS → EXCEPTION**. 장식 KPI · 가짜 수치 · 차트 금지. 새 쿼리 없음.

| 역할 | 화면 | 순서 |
|---|---|---|
| 교사 | `/teacher` | h1 오늘의 수업 → **오늘 먼저 할 수업** 패널(반 · 주차 · 차시 · 상태 · 성장키워드 · 오늘의 목표 · 준비물 미리보기, `fetchClassModeData` 1회) → 오늘 현황 숫자 → 오늘/진행 중/지난 예정/일정 미정 카드 |
| 교사 | `/teacher/sessions/[id]/before` | 수업 목표 → s1 → **수업 안내**(s15 · s4a · s4b · s4c · s5 · s6 · s11 · s12 · s13 · s14, `<details>` 56px) → 준비 확인 체크리스트 |
| 원장 | `/director` (대시보드 권한) | h1 오늘의 우리 원 → 오늘 운영 요약 → 확인이 필요한 기록 → 반별 오늘 수업 → 최근 성장 리포트 |
| 원장 | `/director/sessions` | h1 수업 운영 → 반별 오늘 현황(예정 · 진행 중 · 완료 · 취소 · 이전 날짜) → 수업 카드 |
| 본사 | `/admin` | 확인이 필요한 기관 → 운영 중 기관(KPI 한 줄) → 최근 활동 |
| 본사 | `/admin/readiness` | 기관별 준비 현황(미완료 먼저 · 확인 필요 N곳) → 요약 수치 |
| 영업 | `/sales/leads` | 오늘 할 일(신규 문의 → `?status=new`) → 문의 유형(→ `?type=`) → 목록 |
| 영업 | `/sales/organizations` | 모바일 카드 / md 이상 표 · 아동 개인정보 없음 |

E2E 계약은 그대로다: 교사 첫 h1 "오늘의 수업" · 카드당 `/before` 1개(패널은 `#session-<id>` 앵커만) · 원장 비대상 화면에 "확인이 필요한 기록" 없음 · "주간 리포트 (완료)" 등.

## 4. Program information architecture

- **목록 = 이해, 상세 = 실행.** 주차 카드에는 WEEK · 그림책 제목 · 성장키워드 · 한 줄(core message) · "8주 숲으로 이어짐" 표시만.
- **상세(`<details>`)**: 이번 주 이야기 · 활동 목표(O = 목표, X = 하지 않는 것) · 그림책 · 신체 활동 · 미술·교구 · 워크북 · 준비물 · 관찰 포인트 · 가정연계 · 누리과정 · 권장 시간.
- **여정 묶음**: 마음 열기(1~3주) · 자라나기(4~7주) · 우리의 숲(8주). 묶는 기준은 원본 `cross_week` (4~7주 결과물 → 8주 현수막).
- **원본 하나**: `src/lib/content/starter-journey.ts` 가 `manifest.json` 을 읽는다. 클라이언트용 사본(`program-products.ts`)은 빌드 시 manifest 와 대조해 다르면 빌드가 멈춘다.
- STANDARD · PREMIUM: 9주 이후 콘텐츠 미승인 → 주차 목록 없음, "주차별 구성은 상담 시 안내 · 준비 중".

## 5. Growth5 presentation rules

| 규칙 | 근거 |
|---|---|
| 점수 · 등급 · 발달 수준 · 순위 · 평균 · % · 별점 · 진행 막대로 그리지 않는다 | DEC-065 |
| 단계 셋(함께 · 보고 나서 · 스스로)은 같은 크기 · 같은 색 | DEC-065 |
| 설명 문장: "얼마나 잘했는지가 아니라, 그 활동에서 어떤 도움이 필요했는지를 남기는 기록" · "단계는 오르내릴 수 있고 다른 아이와 비교하지 않는다" | GrowthMetricSelector legend · 홈 07 |
| "기록 없음"은 실패가 아니다 — 단계가 아니라 기록이 없는 상태 | staff-observation.ts |
| 변화는 같은 아이의 지난 기록과만 · ↑성장 ↓하락 같은 평가 기호 금지 | DEC-065 |
| 학부모 화면에는 단계 칩을 싣지 않는다 | parent-portal-co12.md |

## 6. Product / package content rules

- 결정 순서: **어떤 원에 적합 → 무엇을 운영 → 기간 → 포함 내용 → 비용**.
- 포함 항목마다 `포함 · 준비 중 · 계약 범위` 중 하나. 주간 리포트 = 준비 중(개발 완료 · 미출시), 월간 요약 · 학기 포트폴리오 = 준비 중(P1/P2), 원장 대시보드 = STANDARD · PREMIUM, AI = 준비 중 · STARTER 미포함, 키트 · 현판 · 상담자료 팩 = 계약 범위.
- 가격 값은 바꾸지 않는다. 가격 조건(VAT 별도 등)은 기존 문구 유지.
- 온라인 결제 · 즉시 이용 표현 금지 (P0 결제 없음 · `PurchaseSection` 미렌더링 유지).

## 7. Microcopy rules

- 버튼은 **행동의 결과**를 말한다: "저장" → "반 정보 저장" · "원아 정보 저장" · "차시 저장" · "기관 등록" 등 (본사 폼 9곳).
- E2E 가 정확한 문구에 의존하는 버튼은 바꾸지 않는다 (작성하기 · 수업 시작 · 출결 저장 · 임시저장 · 리포트 완료 · 출시 · 취소 등 — 목록은 design-system-v3 §5).
- EmptyState = 무엇이 없는지 · 왜 · 다음 행동(실제 존재하는 경로로만 링크).
- 상태 배지는 색 + 점 + 한국어 라벨.

## 8. Responsive content rules

| 사용자 | 기준 |
|---|---|
| 공개 | mobile-first 전환 — 하단 고정 CTA · 첫 화면 데모 버튼은 lg 이상 |
| 교사 | 태블릿 · 휴대폰 — 큰 summary(56px) · 한 단계 한 행동 · 오늘 할 일 먼저 |
| 원장 | 태블릿 + 데스크톱 — 표는 md 미만에서 행 = 카드로 재배치(같은 DOM · id 중복 없음) |
| 본사 | 데스크톱 우선 — 사이드바 · 높은 밀도 |

820~980px 표(학부모 공유 · 원장 리포트 · 영업 기관 현황)는 가로 스크롤 대신 모바일 카드로 바꿨다.

## 9. Source conflicts

| # | 내용 | 처리 |
|---|---|---|
| SC-1 | STARTER 2026.1 은 **Staging UAT 승인 · Production 미승인**인데 공개 홈 · 상품 상세가 canonical 주차 내용을 싣는다 | 코드에 반영했으나 **공개 배포 전 운영자 콘텐츠 승인 필요** |
| SC-2 | 여정 묶음 이름(마음 열기 · 자라나기 · 우리의 숲)은 원본에 없다 | 표시용 묶음으로 사용 · 승인 필요 |
| SC-3 | "씨앗에서 숲까지"는 원본에서 W8 본문 속 구절일 뿐 프로그램 제목이 아니다 | 기존 마케팅 문구로 유지 · 승인 필요 |
| SC-4 | STARTER 가격 99,000원/월 · 198,000원은 코드에만 있고 상품소개서 v4 에 없다 | 값 유지 · 확인 필요 |
| SC-5 | 대상 연령(만 4~6세 / 4~7세) 근거 없음 (BC-4 · DB NULL) | "상담 시 안내"로 변경 |
| SC-6 | 수업 시간: 공개 "40~50분" vs DEC-023 "50분 + 워크북 10분" vs 주차 가이드 권장 50~70분 | DEC-023 기준으로 통일, 주차 권장 시간은 상세에 별도 표기 |
| SC-7 | W4 성장키워드 "시작"이 W1 과 같다 (원본 그대로 승인) | 원본 유지 |
| SC-8 | 1·4·6·8주 외 주차 키트 횟수(2/4/6회) 매핑 근거 없음 | 계약 범위로 표시 |
| SC-9 | 연락처(전화 · 이메일 · 웹사이트)는 코드에만 있고 문서 근거 없음 | 유지 · 확인 필요 |
| SC-10 | 1개 반 15명 기준 · 원아 추가 6,600원 등 가격 조건 | 기존 문구 유지(v4 일치 항목) |
| SC-11 | 법적 고지의 "공유 링크 기본 30일 만료"는 새 포털(만료 없음, CO-12)과 다르다 | 범위 밖 · 미변경 · 법무 확인 필요 |
| SC-12 | 데모 "온라인 · 방문 모두 가능" 근거 없음 | 삭제 |

## 10. Future improvements

1. 콘텐츠 승인(SC-1~3) 후 공개 배포 — 승인 문구를 `content-readiness.md` 에 기록.
2. 교사 before 화면의 s6 진행안을 단계별 카드(현재 단계 · 다음)로 — DuringView 와 연결 (`lesson_activities` 미적재 STARTER 대응).
3. 원장 반별 집계는 지금 화면 데이터에서 계산한다. 반별 누적 진행(계획 · 완료 회차)이 필요하면 읽기 전용 집계 쿼리를 별도 승인 후 추가.
4. 영업 문의 상태별 건수(연락완료 · 상담진행 · 도입확정)는 현재 KPI 쿼리에 없다 — 필요 시 별도 승인.
5. 학부모 포털 출시(CO-12 해소) 시 역할 섹션 · 상품 카드의 "준비 중" 배지를 갱신.
6. 공개 홈 Lighthouse · 실제 기기(iPad · Galaxy Tab) 확인.
