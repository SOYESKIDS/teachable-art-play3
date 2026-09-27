# Open Items — TeachAble Art Play SaaS Platform 2.0

| | |
|---|---|
| 문서 상태 | 운영 중 (미확정 사항만 기록) |
| 최종 갱신 | 2026-09-27 (PHASE 03 상태 정합화) |
| Branch / commit | `saas-v2` / `faa8f9a` |
| 관련 문서 | [../00-project/decision-log.md](../00-project/decision-log.md) · [product-definition.md](./product-definition.md) · [mvp-scope.md](./mvp-scope.md) · [content-governance.md](./content-governance.md) |

---

## 0. 이 문서의 규칙

| # | 규칙 |
|---|---|
| **1** | 이 문서에는 **확정되지 않은 것만** 적는다. 확정된 것은 [decision-log.md](../00-project/decision-log.md)로 옮긴다 |
| **2** | 항목이 확정되면 **이 문서에서 제거**하고 `DEC-0XX`를 부여한다. 이 문서에 "확정됨" 상태를 남기지 않는다 |
| **3** | **추측을 적지 않는다.** 원본 자료가 없으면 `SOURCE NOT AVAILABLE`로 기록한다 |
| **4** | 각 항목에 **차단하는 것(Blocks)**과 **결정 주체(Owner)**를 명시한다 |
| **5** | 항목 ID는 분류별 접두어를 쓴다. `BC-` (Content) · `BP-` (Business Policy) · `PH3-` (PHASE 03 이후) · `AD-` (Architecture Decision) |

### 0-0. PHASE 03 이후 상태 표시 방식

2026-09-27 PHASE 03부터는 해결된 항목을 **삭제하지 않고** 상태 칸에 표시한다 (역사 보존). 규칙 2는 PHASE 01 제거분에만 적용되었다.

| 표시 | 의미 |
|---|---|
| ✅ **RESOLVED by DEC-XXX** | 전체 해결 |
| 🟡 **Resolved portion / Remaining portion → CO-XX** | 일부 해결. 잔여는 [../03-commerce/open-items.md](../03-commerce/open-items.md)에서 관리 |
| ↪ **MOVED → CO-XX** | 해당 문서로 관리 이관 |

### 0-1. PHASE 01에서 제거된 항목

다음 4건은 PHASE 01 승인 시 확정되어 이 문서에서 제거되었다.

| 구 ID | 내용 | 확정 |
|---|---|---|
| O-1 | Class Mode P0에 콘텐츠 인앱 재생 포함 여부 | → **DEC-029** (제외) |
| O-2 | Weekly Report 원장 매 건 사전승인 여부 | → **DEC-030** (불필요) |
| O-3 | STARTER 대시보드 미포함을 시스템에서 강제할지 | → **DEC-031** (강제 + Pilot 별도 entitlement) |
| O-4 | Pilot 범위 | → **DEC-032** (1~2기관 / 4주 / Week 1~4 / Weekly) |

---

## 1. Blocked By Content

> 교육 콘텐츠·원본 자료가 확보되지 않아 진행할 수 없는 항목.
> **Owner: 교육기획 / 콘텐츠 제작**

### 1-1. 🔴 콘텐츠 미존재

| ID | 항목 | 상태 | Blocks |
|---|---|---|---|
| **BC-1** | **STANDARD Week 9~16 커리큘럼** | 🔴 `SOURCE NOT AVAILABLE`<br>`D:\소예키즈` 3단계 전수 탐색 결과 16주 자료 0건<br>🟡 **Updated 2026-09-27**: 위 판정은 **로컬 탐색 범위 기준**이었다. **SOURCE EXISTS (MIXED)** — Project External Source `TeachAble_ArtPlay_24주_강의교안_데이터구조.pdf` P2 "우리 그리고 모두의 사계절" (9~16주 스탠다드 교사용 프로그램 설명서 PDF + 미기재 항목 초안). repo 미포함 · **production-approved operational content pending** (DEC-063 Not Ready 유지) | STANDARD 판매 · P2-1 · Monthly/Semester 리포트 실운영 |
| **BC-2** | **PREMIUM Week 17~24 커리큘럼** | 🔴 `SOURCE NOT AVAILABLE`<br>동일 탐색 결과 24주 자료 0건<br>🟡 **Updated 2026-09-27**: 위 판정은 **로컬 탐색 범위 기준**이었다. **SOURCE EXISTS (DRAFT / PROPOSAL)** — 같은 자료 P3 "두근두근 세계여행" (주제 원안 · 주차별 키워드 + 전체 초안 설계). repo 미포함 · **production-approved operational content pending** (DEC-063 Not Ready 유지) | PREMIUM 판매 · P2-1 · Semester Portfolio 실운영 |
| **BC-3** | **STARTER Week 7~8 규격 확정본** | ⚠️ PDF는 존재 (`SOYE_KIDS_STARTER_7주차_기다림.pdf` · `8주차_공동체.pdf`)<br>그러나 표준화 규격 v1.0 §7-7이 "7·8주차 전체 원자료 없음"으로 기록 → **규격 미적용 상태** | STARTER 8주 정식 판매 · P1-4 |

> **BC-1 · BC-2가 이 프로젝트의 최대 병목이다.** Repository 부재가 아니라 SOURCE 자체가 존재하지 않으므로 이관 과제가 아니라 **제작 과제**다. 개발 트랙(PHASE 02~08)과 무관하게 즉시 착수해야 한다.
>
> *Updated 2026-09-27: "SOURCE 자체가 존재하지 않는다"는 판단은 정정한다. Week 9~16(MIXED) · 17~24(DRAFT/PROPOSAL) 원본은 Project External Source로 존재한다. 따라서 과제는 "처음부터 제작"이 아니라 **원본의 확정(미기재 · 초안 부분 보완) → 표준 규격 적용 → 승인 → repo 이관**이다. 최대 병목이라는 판단과 즉시 착수 필요성은 유지한다.*

### 1-2. 🔴 원본 미해결 데이터 (표준화 규격 §7이 스스로 기록)

| ID | 항목 | 상태 | Blocks |
|---|---|---|---|
| **BC-4** | **대상 연령** (만 3·4·5세 / 혼합) | 🔴 전 주차 미표기. 각 문서에 `[확인 필요]` 표시됨 | Program `age_group` 설정 · `APPROVED` 게이트 · 반 배정 시 연령 경고 |
| **BC-5** | **워크북 총 페이지 수** | 🔴 2주차만 12P 확인, 나머지 미표기 | 워크북 Activity 매핑 · 워크북 뷰어 (P1) · `APPROVED` 게이트 |
| **BC-6** | **음원 러닝타임** | 🔴 전 주차 미표기 | Step Timer 정밀화 · 오디오 플레이어 (P1) |
| **BC-7** | **준비물 수량 기준** (1인 / 1모둠 / 1반) | 🟡 일부 미표기 (1주차는 일부 명시) | 준비물 체크리스트 정확도 · 배송 관리 (P2) |
| **BC-8** | **5주차 음원 4곡이 4주차와 완전히 동일** (씨앗이 톡! / 물을 주세요 / 햇살이 좋아요 / 우리는 친구 새싹) | 🔴 의도된 묶음인지 오기인지 미확인 | Asset 모델 (재사용 vs 오기) · `AssetReuse` Cross Week 설계 |
| **BC-9** | **3주차 마음다리 링 개수·간격** | 🔴 미표기 | Activity 상세 · 준비물 |

### 1-3. 🔴 원본 내부 충돌 (추측 금지 · R-5)

| ID | 항목 | 상태 | Blocks |
|---|---|---|---|
| **BC-10** | **프로그램 구성표 내부 불일치** — 우상단 '성장 로드맵' 7개(적응·도전·친구·자존감·협력·기다림·공동체)가 8주와 맞지 않고, 하단 '우리의 성장 스토리' 8개와도 다름. 표준화 규격이 **8개 단일 체계로 통일** 요청 | 🔴 승인 대기.<br>`참고자료/프로그램 구성 8주차.png`는 **미판독(이미지)** | Week 주제 확정 · DEC-026 최종 확정 · 홈페이지 성장 로드맵 표기 |
| **BC-11** | **4주차 성장키워드** — 표준화 규격 권고안은 `발견`('시작' 중복 해소), repository `program-products.ts`는 `(씨앗)` 계열 | 🔴 미확정.<br>규격의 대안 `자람`도 제시됨 | Week 주제 확정 · 커리큘럼 이관 (P0-2) |
| **BC-12** | **가정연계 4·5·6주차 연속 중복** — 3주 연속 '도안 + 가족사진 붙이기'. 표준화 규격 §6이 "5주차를 생활실천형으로 바꾸면 반복이 해소된다"며 결정 요청 | 🔴 결정 대기.<br>원자료 기준이므로 규격 문서가 임의 변경하지 않음 | FamilyConnection 데이터 · Weekly 리포트 가정연계 Tip |

### 1-4. 🔴 자산 실물 · 권리

| ID | 항목 | 상태 | Blocks |
|---|---|---|---|
| **BC-13** | **VOD · 음원 · EBOOK · MV 실제 파일** | 🔴 플랫폼 내 0건.<br>`public/images/site/content/`에 VOD 스틸 2장만 존재 | P1-1 Content Delivery Layer · P1-2 인앱 재생 · DEC-002 |
| **BC-14** | **자산 저작권 · 라이선스 범위** (그림책 · 음원 · MV · 캐릭터) | 🔴 미확인 | P1-1 · 다운로드 허용 정책 · 법적 위험 |

### 1-5. ⚠️ 세션 첨부 자료 재확보

| ID | 항목 | 상태 | Blocks |
|---|---|---|---|
| **BC-15** | **상품소개서 v4 원본** | ⚠️ 세션 첨부본. 현재 재판독 불가.<br>`src/data/packages.ts`가 대리 출처 역할<br>🟡 **Updated 2026-09-27**: `TeachAble_Art_Play_유치원_상품소개서_v4.pdf`는 **PROJECT EXTERNAL SOURCE**다 (source verified during PHASE 03 review · original PDF exists in Project materials · PDF is not versioned inside this Git repository). PHASE 03 review에서 확인된 항목은 [03-commerce/product-catalog.md §3](../03-commerce/product-catalog.md)에 `SOURCE(v4)`로 반영 | 상품 데이터 검증 (P0-14) · BP 항목 다수 |
| **BC-16** | **샘플 주간 리포트 3페이지 PDF** | ⚠️ 세션 첨부본. 재판독 불가.<br>단 원본 §12가 5항목 서식을 교차 확인하여 설계 불확실성은 해소됨 | Weekly 리포트 레이아웃 상세 (PHASE 06) → *DEC-101 · DEC-103 ([../06-ux-design/report-parent-experience.md](../06-ux-design/report-parent-experience.md))* |
| **BC-17** | **연구자료 12종** (AI 아동발달 · 누리과정 · 벤치마킹 · 해외 플랫폼 사례) | ⚠️ 세션 첨부본. 재판독 불가.<br>AUDIT 1/2에 기록된 사실만 인용 가능 | 교육적 근거 문서화 · AI 원칙 근거 보강 |

---

## 2. Blocked By Business Policy

> 사업 정책이 확정되지 않아 진행할 수 없는 항목.
> **Owner: 사업 / 경영**
> **원칙: 확정되지 않은 정책을 제품이 먼저 만들지 않는다** (DEC-017).

### 2-1. 🔴 결제 · 계약 정책

| ID | 항목 | 상태 | Blocks |
|---|---|---|---|
| **BP-1** | **환불 정책** | 🔴 미확정. `src/data/packages.ts` 주석이 명시: *"환불 · 자동갱신 · 결제주기 · 계약해지 조건은 아직 확정되지 않았다"* | 이용약관 개정 · P2-6 온라인 결제 |
| **BP-2** | **자동갱신** 여부 · 조건 | 🔴 미확정 | 동일 |
| **BP-3** | **결제주기** (월납 / 일시납 / 분납) | 🔴 미확정 | 동일 · Contract 모델 |
| **BP-4** | **계약 해지 조건** | 🔴 미확정 | 동일 · Contract `ended` 전이 |
| **BP-5** | **PG 사업자 선정** | 🔴 이번 PHASE 미확정 (DEC-017). Payment Adapter 전제 | P2-6. **P1-16 Adapter 인터페이스는 진행 가능** |
| **BP-6** | **초과요금 청구 방식** (15명 초과 1인당 월 6,600원) | 🔴 정책 미확정.<br>확정 전 자동 청구 미구현 (DEC-018) | 자동 청구 · 원아 수 스냅샷 시점 · 중도 입퇴원 처리 |
| **BP-7** | **3개 반 이상 단가** | 🔴 "별도 상담" | Product 데이터 · 견적 자동화 |
| **BP-8** | **계약 단위** (8주 = 2개월 vs 학기) | 🟡 **Resolved portion**: 계약 단위 = Organization × Product Version × Class Scope × Period · ONE EFFECTIVE CONTRACT AT A TIME (**DEC-049**) / **Remaining portion**: 달력 계약기간 vs 운영 주차 → **CO-11** · (이전 상태: 🔴 미확정) | Contract `period` 모델 |
| **BP-9** | **연장 · 업그레이드 규칙** (STARTER → STANDARD) | ✅ **RESOLVED by DEC-053** (Upgrade · Renewal = 후속 계약 · Downgrade는 갱신 시점) · 프로그램 구조 세부는 **CO-7** · (이전 상태: 🔴 미정의) | Lifecycle ⑧ RENEWAL |
| **BP-10** | **B2G 조건** (교육청 · 늘봄학교 등) | 🔴 별도 검토 | 별도 상품/계약 유형 |

### 2-2. 🔴 상품 정의

| ID | 항목 | 상태 | Blocks |
|---|---|---|---|
| **BP-11** | **Entitlement feature 목록 최종 확정** | 🟡 **Resolved portion**: Feature Catalog · 상품별 배분 (**DEC-055** · **DEC-057**) / **Remaining portion**: `ai_assist` 상품 배분 → **CO-5** · (이전 상태: 🔴 PHASE 03에서 확정, DEC-031이 방향만 제시) | P0-14 구현 상세 · 권한 매트릭스 (PHASE 02) |
| **BP-12** | **원 브랜딩 지원의 실체** (PREMIUM) | 🟡 **Resolved portion**: 현판 · 상담자료 팩 = Contract Deliverable · P0/P1 시스템 Branding 없음 (**DEC-062**) / **Remaining portion**: 시스템 Branding 범위 → **CO-8** · (이전 상태: 🔴 미확정) | P2-9 · Entitlement `branding` feature 정의 |
| **BP-13** | **STARTER의 Weekly 리포트 범위** — 상품표는 "주간 미니 리포트". 5항목 전체인가 축약형인가 | ✅ **RESOLVED by DEC-057** (축약판 아님 · DEC-024 5항목 구조 · STANDARD Weekly 포함도 함께 확정) · (이전 상태: 🔴 미확정) | Weekly 리포트 상품별 차이 (P0-9) |

### 2-3. 🔴 판매 고지 정합성

| ID | 항목 | 상태 | Blocks |
|---|---|---|---|
| **BP-14** | **16 · 24주 콘텐츠 제작 전 STANDARD · PREMIUM 판매 고지 정합성** | 🔴 **사업 판단 필요.**<br>공개 홈페이지가 현재 STANDARD(600,000원/학기) · PREMIUM(1,500,000원)을 판매 중이나 Week 9~24 콘텐츠가 존재하지 않는다 (BC-1 · BC-2) · *Updated 2026-09-27: 원본 자료는 존재(9~16 MIXED · 17~24 DRAFT/PROPOSAL)하나 production-approved 운영 콘텐츠가 없다*<br>🟡 **Resolved portion (2026-09-27)**: 콘텐츠 미준비 상품의 **production service activation 차단** (**DEC-063**) / **Remaining portion**: 판매 고지 문구 · 계약 이행 조건은 여전히 사업 판단 | 판매 고지 · 계약 이행 · 법적 위험 |
| **BP-15** | **결제 도입 시 법무 문서 개정** | 🔴 현재 이용약관·개인정보처리방침이 *"웹사이트를 통한 즉시 결제나 온라인 구독 신청을 제공하지 않으며"* · *"공개 회원가입은 제공하지 않습니다"* · "결제정보 수집 안 함"을 명시 | P2-6. Source-of-Truth R-7 (법적 고지 ≠ 제품 동작 → 즉시 수정 대상) |
| **BP-16** | **개인정보 국외이전 (AI 위탁) 고지 범위** | ⚠️ `/privacy` 실내용 점검 필요.<br>AI provider 코드 주석이 자유입력 내 실명 전송 가능성을 인정하고 있다 | P0-16 고지 정합화 · Pilot Go G-9 |
| **BP-17** | **계약 종료 시 데이터 이관 · 보관 · 파기 기준** | 🔴 미확정. 상품소개서가 "종료 시 이관·보관·파기 기준 확정"을 약속<br>🟡 **Resolved portion (2026-09-27)**: 종료 시 접근 모델 · 새 작업 차단 · 자동 삭제 없음 (**DEC-052**) / **Remaining portion**: Read-only 유예 기간 → **CO-1** · 보관 · 파기 · Export → **CO-2** (Production Blocker) | P2-11 · Lifecycle ⑧ · Pilot Go G-12 |

---

## 3. PHASE 03 이후 결정

> 제품·운영 결정이지만 PHASE 02(User Flow / IA)를 차단하지 않는 항목.
> 확정 시 `DEC-033`부터 부여한다.

| ID | 항목 | 현재 상태 / 논점 | Owner | 확정 PHASE |
|---|---|---|---|---|
| **PH3-1** | **Growth 5 시계열 표현 방식** | 🟠 **부분 차단 (PHASE 02 IA에 영향)**<br>샘플 주간 리포트의 "지난주 대비 ↑ 한 단계" 표기가 UX 원칙 **U-1**(단계는 순위가 아니다) · **U-3**("스스로"가 목표가 아니다)과 충돌한다.<br>선택지: (a) 변화 서술만 — "3월: 한두 가지 색 → 6월: 여러 색 조합" (b) 단계 증감 기호 병기 (c) 주차별 격자만 제시하고 증감 표기 없음 · ✅ **RESOLVED by DEC-065 · DEC-075** (같은 아이 시간순 사례 서술 · 단계 증감 표기 없음 · Stage chip 미노출) | Product (교육) | PHASE 02~04 |
| **PH3-2** | **원장에게 교사 초대 · 배정 권한 위임 여부** | 현재 `organization_members` INSERT/UPDATE와 `class_teachers` INSERT/DELETE가 HQ 전용.<br>운영 편의 vs 통제. 위임하면 기관이 스스로 교사를 늘릴 수 있으나 좌석(seat) 관리와 충돌 가능 · ↪ PHASE 03에서 미처리 → [03-commerce §3](../03-commerce/open-items.md) 이월 (DEC-049 · DEC-051의 반 범위와 함께 검토) | Product + 사업 | PHASE 03 → PHASE 05 전 → *PHASE 05 미처리 (배정 기반 권한 구조만 DEC-080) · PHASE 07 전* |
| **PH3-3** | **리포트 reopen 정책** | `complete → draft` 전환 경로가 없다. 주간 다건 운영 시 오타 정정 수단이 필요.<br>논점: 권한(교사만/원장 승인) · 사유 기록 · 이력 보존 · 이미 학부모가 본 경우 처리 · ↪ PHASE 03에서 미처리 → [03-commerce §3](../03-commerce/open-items.md) 이월 (DEC-043 숨김 해제와 함께) · ✅ **RESOLVED by DEC-073 · DEC-074** (정정 = 새 Revision · 사유 필수 · 학부모는 기존 완료본 유지 · 논리 리포트 단위 hide/unhide · 자동 해제 없음) | Product | PHASE 03 → PHASE 04 |
| **PH3-4** | **Child Portal 링크 만료 기간** | 현재 트리거가 30일로 설정. 아동 단위 링크는 학기(약 6개월) 필요.<br>논점: 보안(장기 링크 노출 위험) vs UX(학부모가 매번 새 링크를 받지 않아도 됨). 중간안으로 만료 시 원장 재발급 알림 · ↪ **MOVED → CO-12** (Production Blocker) | Security + Product | PHASE 03 → P0 Portal Production 전 |
| **PH3-5** | **AI 원본 응답 저장 범위** | 현재 `response.output_text`만 취하고 `usage` · `finish_reason` · `response_id`를 버린다.<br>논점: 메타만 저장(비용·품질 추적) vs 본문까지 저장(사후 감사). 본문 저장은 아동 관련 문장을 추가 보관하는 것이므로 개인정보 검토 필요 · ✅ **RESOLVED by DEC-078** — raw provider request · response body · envelope · 전체 prompt · 실패/거부 raw output **미저장** · validated structured draft + provenance(response_id · usage 메타 포함 가능) + sanitized error만 저장 · 로그 최소화 (provenance 항목은 DEC-072) | Privacy + Product | PHASE 04 |
| **PH3-6** | **Asset 다운로드 허용 정책** | 자산 type별로 다르다. VOD는 스트리밍, 워크북은 인쇄용 다운로드가 필요할 수 있다.<br>논점: 저작권(BC-14) · 워터마크 · 기관 종료 후 잔존 · ↪ PHASE 03에서 미처리 → [03-commerce §3](../03-commerce/open-items.md) 이월 (P1 콘텐츠 재생 전) | Product + 법무 | PHASE 03 → P1 |
| **PH3-7** | **Demo 계정 · 샘플 데이터 체계** | Lifecycle ② DEMO가 오프라인으로만 운영된다. 20분 데모용 샘플 기관/반/아동 데이터를 시스템에 둘지, 매번 만들지 · ↪ PHASE 03에서 미처리 → [03-commerce §3](../03-commerce/open-items.md) 이월 | 사업 + Product | PHASE 03 → P1 |
| **PH3-8** | **학기 전환 절차** | 반 재편성 · 원아 진급 · 프로그램 재배정을 어떻게 처리할지. 현재 `children.class_id` nullable과 `is_assigned_class_teacher` 비대칭 설계로 기록 연속성은 확보되어 있으나 전환 절차 자체가 정의되지 않았다 · ↪ PHASE 03에서 미처리 → [03-commerce §3](../03-commerce/open-items.md) 이월 (DEC-053 Renewal과 연결) | Product + 운영 | PHASE 03 → Renewal 첫 사례 전 |
| **PH3-9** | **워크북 optional evidence 설계** | DEC-012가 MVP 제외를 확정했으나 "향후 특정 Workbook의 optional evidence로 확장 가능하게만 고려"라고 여지를 남겼다. 어떤 워크북에 어떤 수치를, 누가 언제 입력하는지 | Product (교육) | PHASE 04 이후 |
| **PH3-10** | **Parent Account 도입 여부** | DEC-013이 2.0 범위 밖으로 확정. 도입 시 RLS 정책 66개 전수 재검토 필요.<br>특히 `private.is_active_org_member()`가 커리큘럼 읽기를 열어주므로 학부모에게 교사용 수업안이 노출될 위험 | Product + Architecture | 2.0 이후 |

---

## 4. Architecture Decision

> 기술 구조 결정. PHASE 05(DB / ERD / Security Architecture Freeze)에서 확정하는 것이 원칙.
> **Architecture Invariants(project-charter §5)를 바꾸는 결정은 대체 방어 수단 · 회귀테스트 · 영향 RLS 정책 전수 재검토 결과를 함께 기록해야 한다.**
>
> *2026-09-27 PHASE 05 처리 상태: AD-2 · AD-3 · AD-4 · AD-10 · AD-11 확정 · AD-1 · AD-9 부분 확정(AD-1 잔여 = DB-9) · 나머지 AD-5 ~ AD-8 · AD-12 ~ AD-14는 PHASE 05에서 결정하지 않았으며 PHASE 07 또는 콘텐츠 트랙으로 이월 — [../05-data-security/open-items.md §3](../05-data-security/open-items.md)*

### 4-1. 🔴 Invariant에 영향을 주는 결정

| ID | 항목 | 논점 | 영향 Invariant | 확정 PHASE |
|---|---|---|---|---|
| **AD-1** | **학부모(anon)에게 사진을 제공하는 방식** | `storage.objects` SELECT 정책은 `authenticated` 전용이고, SQL에서 Storage 서명을 만들 수 없다.<br>**(a)** `service_role`로 서명 — 현재 "Secret Key는 Auth Admin 전용" 원칙을 넓혀야 한다<br>**(b)** 발행 시 리사이즈 사본을 별도 public bucket에 생성 — 원본은 private 유지, 사본은 추측 불가 경로<br>**(c)** anon 전용 Storage 정책 — `share_id`+`token` 검증을 정책에서 받을 수 없어 실현 곤란 | **AI-1** (`service_role` 미사용) | **PHASE 05** → ◐ **부분 확정**: private bucket + 짧은 TTL signed URL 방향만 승인 · 서명 주체 · credential은 **DB-9 OPEN** ([../05-data-security/open-items.md](../05-data-security/open-items.md)) · AI-1 미변경 |
| **AD-2** | **Entitlement 게이팅을 RLS로 구현할지 Server 게이트로 구현할지** | DEC-031이 "Server / DB 수준"을 요구. RLS로 넣으면 모든 콘텐츠 조회 정책에 Entitlement 조건이 추가되어 정책 복잡도가 올라간다. Server 게이트만 두면 RLS 우회 경로가 남는다.<br>권고 방향: 읽기는 RLS + Server 이중, 쓰기는 트리거까지 | AI-3 · AI-4 · AI-9 | **PHASE 05** → ✅ **RESOLVED by DEC-083** (class-aware runtime entitlement · 쓰기 RLS/트리거/RPC gate + 서버 이중) |
| **AD-3** | **Growth 5 / Observation Stage 저장 구조** | 현재 `class_session_observation_domains`는 `(observation_id, domain_code)` 순수 태그 링크로 level 컬럼이 없다.<br>**(a)** 링크 테이블에 `stage` 컬럼 추가 — GRANT 목록·RPC 시그니처(`save_class_session_observation_atomic`의 `text[]` 인자) 변경 필요<br>**(b)** 별도 테이블 신설 — 기존 구조 보존, 조회 join 증가 | AI-5 (컬럼 GRANT) | **PHASE 05** → ✅ **RESOLVED by DEC-086** (별도 선택 테이블 · 행 없음 = 기록 없음 · stage NOT NULL) |

### 4-2. 🟠 구조 선택

| ID | 항목 | 논점 | 확정 PHASE |
|---|---|---|---|
| **AD-4** | **회귀테스트 도구 선정** | pgTAP (DB 내부) vs 통합 테스트 (앱 경유) vs 조합.<br>RLS 정책 66개를 역할별로 검증해야 하므로 여러 JWT 컨텍스트를 만들 수 있어야 한다.<br>**P0-1의 전제이므로 가장 먼저 결정해야 한다** | **PHASE 05 (조기)** → ✅ **RESOLVED by DEC-094** (pgTAP · `supabase test db` + PHASE 07 앱 통합) |
| **AD-5** | **Asset 저장 위치 및 전송 방식** | Supabase Storage vs 외부 CDN.<br>VOD 24편 + 음원 72곡 + EBOOK 24 + 워크북 24의 용량·대역폭·스트리밍 요구.<br>기관별 접근 제어가 필요한가 (published 프로그램이면 전 기관 공통인가) | **PHASE 05** |
| **AD-6** | **Marketing ↔ DB 동기화 방식** | DEC-020이 "DB가 최종 출처"를 확정했으나 구현 방식은 미정.<br>**(a)** 홈페이지가 DB를 직접 읽음 — 공개 페이지 캐시·성능 설계 필요<br>**(b)** TS 파일 유지 + 빌드 시 DB 대조 검증 — 배포 파이프라인에 검증 단계 추가 | **PHASE 05** |
| **AD-7** | **Part 계층 도입 여부** | 24주를 묶는 중간 계층(예: 1~8주 "적응·도전"). 8주 상품에는 불필요하고 24주에는 유용하다.<br>P0 모델에 넣을지, P2로 미룰지 | **PHASE 05** |
| **AD-8** | **콘텐츠 거버넌스 상태 저장 구조** | 단일 `status` 컬럼 + 감사 컬럼 vs 별도 전이 이력 테이블.<br>Week 단위 부분 발행을 Program 상태와 어떻게 조합할지 | **PHASE 05** |
| **AD-9** | **Content Role 저장 위치** | `private.admin_users.role` 확장 (현재 `admin`/`sales`) vs 별도 role 테이블.<br>Content Editor / Education Reviewer / Content Approver 3종 추가 | **PHASE 05** → ◐ `private.admin_users` 역할 확장 방향 (DEC-079) · Content 역할 세부는 PHASE 07 |
| **AD-10** | **리포트 Growth 5 / Stage 스냅샷 구조** | 현재 `child_growth_report_sources.domain_labels_snapshot text[]`로는 단계를 담을 수 없다.<br>`jsonb` 전환 vs 별도 컬럼 vs 별도 스냅샷 테이블. 이미 운영 데이터가 있으면 변환 마이그레이션 필요 | **PHASE 05** → ✅ **RESOLVED by DEC-090** (근거 정규화 행 · 본문 JSONB + template version · 사진 reference) |
| **AD-11** | **주차(week_no) 비정규화 여부** | 시계열 집계 시 `class_sessions → curriculum_lessons.week_no` 3-hop 조인이 필요하다. 대시보드가 이미 N+1을 경계하는 구조이므로 캐시 컬럼을 둘지 | **PHASE 05** → ✅ **RESOLVED by DEC-085** (세션 생성 시 `week_no` 복사 · 불변) |
| **AD-12** | **Class Mode 오프라인 전략** | 교실 네트워크가 불안정하다.<br>**(a)** 진행 상태만 로컬 보존 (P0)<br>**(b)** 완전 오프라인 + 동기화 (P2) — 충돌 해소 정책 필요.<br>현재 낙관적 동시성(`updated_at` 토큰)과 어떻게 조합할지 | **PHASE 05~06** → *PHASE 06: P0 offline UX는 DEC-098 (banner · 서버 전환은 연결 복구 후 · 비민감 진행 상태만 유지 · 민감 텍스트 지속 client 저장 없음 DEC-099) · 완전 offline sync는 P2 유지* |
| **AD-13** | **커리큘럼 이관 파이프라인 형태** | 원본 MD → DB. 스크립트(반복 가능, diff 리포트) vs Admin UI 수동 입력(검수 자연스러움).<br>규격 확정본이 구조화된 Markdown이므로 파싱 가능 | **PHASE 07** |
| **AD-14** | **anon rate limit 구현 위치** | `lead_submissions` INSERT · `read_shared_growth_report`.<br>Vercel WAF / BotID vs DB 레벨(카운터 테이블) vs Route Handler 레벨 | **PHASE 05** |

---

## 5. 요약

| 분류 | 항목 수 | 최대 병목 | Owner |
|---|---|---|---|
| **Blocked By Content** | 17 (BC-1~17) | **BC-1 · BC-2** (Week 9~24 `SOURCE NOT AVAILABLE` → *Updated 2026-09-27: SOURCE EXISTS · production-approved content pending*) | 교육기획 / 콘텐츠 |
| **Blocked By Business Policy** | 17 (BP-1~17) | **BP-14** (판매 고지 정합성) · **BP-11** (Entitlement feature) | 사업 / 경영 |
| **PHASE 03 이후 결정** | 10 (PH3-1~10) | **PH3-1** (Growth 5 시계열 표현 — PHASE 02 부분 차단) | Product |
| **Architecture Decision** | 14 (AD-1~14) | **AD-4** (회귀테스트 도구 — P0-1 전제) · **AD-1** (사진 anon 노출) | Architecture |
| **총계** | **58** | | |

### 5-1. 지금 즉시 착수해야 하는 3건

| # | 항목 | 이유 |
|---|---|---|
| **1** | **BC-1 · BC-2 콘텐츠 제작 착수** | 가장 긴 리드타임. 개발과 무관하게 병행 가능하고, 이것이 완료되지 않으면 STANDARD·PREMIUM은 영구히 판매 불가 상태다 |
| **2** | **BC-4 ~ BC-12 원본 확인 요청** | Curriculum 모델 확정(P0-2)과 `APPROVED` 게이트의 전제. 확인만 하면 되는 일이 10건 묶여 있다 |
| **3** | **AD-4 회귀테스트 도구 결정** | P0-1의 전제이고, P0-1은 다른 모든 P0 항목의 선행 조건이다 |

### 5-2. PHASE 02를 차단하지 않는 것 (확인)

PHASE 02(User Flow / IA)는 다음 4건이 확정되어 진입 가능하다.

| 확정 | Decision |
|---|---|
| Class Mode P0 범위 | DEC-029 |
| Weekly Report 승인 흐름 | DEC-030 |
| Entitlement 강제 방향 + Pilot 별도 처리 | DEC-031 |
| Pilot 범위 | DEC-032 |

**부분 영향**: PH3-1(Growth 5 시계열 표현)은 Portal "성장" 탭과 Weekly 리포트 레이아웃에 영향을 주지만, P1 화면이므로 PHASE 02에서 "표현 방식 미정"으로 두고 진행할 수 있다.
