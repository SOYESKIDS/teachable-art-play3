# Decision Log — SOYE KIDS TeachAble Art Play SaaS Platform 2.0

| | |
|---|---|
| 문서 상태 | 운영 중 (누적 기록) |
| 최종 갱신 | 2026-09-26 |
| 범위 | PHASE 01 (Product Definition) · PHASE 02 (User Flow / IA) · PHASE 03 (Product / Contract / Entitlement / Commerce) · PHASE 04 (AI Growth / Report) 확정 사항 |
| Branch / commit | `saas-v2` / `faa8f9a` (PHASE 01) · `0ceb8ad` (PHASE 02 기준) · `b31fdc9` (PHASE 03 기준) · `11269e6` (PHASE 04 기준) |
| 관련 문서 | [project-charter.md](./project-charter.md) · [../01-product/open-items.md](../01-product/open-items.md) · [../02-ia/open-items.md](../02-ia/open-items.md) · [../03-commerce/open-items.md](../03-commerce/open-items.md) · [../04-ai-report/open-items.md](../04-ai-report/open-items.md) |

---

## 0. 기록 규칙

### 0-1. Decision ID

```
DEC-001, DEC-002, DEC-003, ...
```

- **한 번 부여한 ID는 재사용하지 않는다.** 결정이 폐기되어도 ID는 남는다.
- ID는 결정된 순서대로 증가한다. 번호에 의미를 부여하지 않는다.

### 0-2. 결정 변경 규칙

기존 결정을 바꿀 때는 **기존 항목을 수정하지 않고 새 Decision을 만든다.**

```
DEC-007  Observation Stage는 교사가 직접 선택한다              [SUPERSEDED by DEC-045]
DEC-045  Observation Stage에 AI 제안을 도입한다  (supersedes DEC-007)
```

| 규칙 | 내용 |
|---|---|
| R-1 | 기존 항목의 **본문을 고치지 않는다.** 상태만 `SUPERSEDED by DEC-XXX`로 바꾼다 |
| R-2 | 새 항목에 `Supersedes: DEC-XXX`를 명시한다 |
| R-3 | 새 항목에 **왜 바뀌었는지**를 적는다. 바뀐 내용만 적으면 6개월 뒤에 판단할 수 없다 |
| R-4 | Architecture Invariant(project-charter §5)를 바꾸는 결정은 **대체 방어 수단 + 회귀테스트 + 영향 RLS 정책 전수 재검토 결과**를 함께 기록한다 |
| R-5 | 결정을 되돌릴 때도 새 ID를 쓴다. "DEC-007로 복귀"는 `DEC-051 (supersedes DEC-045, restores DEC-007 intent)`로 기록한다 |
| R-6 | 미확정 사항은 Decision이 아니다. `open-items.md`에서 관리한다 |

### 0-3. 상태 값

| 상태 | 의미 |
|---|---|
| `ACTIVE` | 현재 유효 |
| `SUPERSEDED by DEC-XXX` | 다른 결정으로 대체됨 |
| `ACTIVE · clarified by DEC-XXX` | 결정 자체는 유효. 본문 일부 서술(주로 결정 이유 안의 부수 서술)이 후속 결정으로 명확화됨. **본문은 수정하지 않고** 후속 결정이 관계와 우선 내용을 적는다 (2026-09-27 PHASE 03에서 추가) |
| `WITHDRAWN` | 철회됨 (대체 결정 없음). 철회 이유 필수 |

### 0-4. 결정 출처 표기

| 표기 | 의미 |
|---|---|
| `사용자 확정` | 프로젝트 오너의 직접 결정 |
| `AUDIT n` | REPOSITORY AUDIT 1/2/3의 조사 결과에 근거한 결정 |
| `SOURCE DOCUMENT` | SOYE 원본 교육자료(교사가이드 · 표준화 규격) 판독 결과에 근거한 결정 |

---

## 1. 커리큘럼 · 콘텐츠

### DEC-001 · 24주 전체 플랫폼화 + 콘텐츠 거버넌스

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
24주 커리큘럼 전체를 플랫폼화한다. 원본 자료마다 확정도가 다르므로 DRAFT / REVIEWED / APPROVED / PUBLISHED / ARCHIVED 5단계 콘텐츠 거버넌스를 둔다.

**결정 이유**
Repository에 16/24주 데이터가 없다는 사실과, SOYE 원본 교육자료의 확정 상태는 별개의 문제다. 확정도가 다른 자료를 같은 상태로 다루면 미완성 콘텐츠가 교실에 나가거나, 완성된 콘텐츠가 발행되지 않고 묶인다. 거버넌스 상태가 이 둘을 구분한다.

**관련**: DEC-028 · [content-governance.md](../01-product/content-governance.md)

---

### DEC-002 · 콘텐츠를 플랫폼 안에서 제공

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
EBOOK · 마음동화 · VOD · MV · 음원 · 워크북 · Teacher Guide · 활동자료를 플랫폼 안에서 제공한다. 콘텐츠 전달계층(Content Delivery Layer)이 SaaS 2.0의 핵심이다.

**결정 이유**
AUDIT 3 확인 결과 PREMIUM 기준 디지털 자산 약 144~180건을 판매하면서 플랫폼 내 저장·전달·이용집계 구조가 0%였다. 버킷은 관찰사진용 1개뿐이고 DB에 자산 URL 필드가 0개다. 콘텐츠가 플랫폼 밖에 있으면 "수업·활동·기록·소통을 하나로 연결한다"는 제품 정의 자체가 성립하지 않는다.

**관련**: DEC-029 (P0 인앱 재생 제외) · DEC-003

---

### DEC-003 · Teacher Guide를 수업 화면에서 제공

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
Teacher Guide를 PDF 다운로드만으로 제공하지 않는다. 실제 수업 화면(Class Mode)에서 제공한다.

**결정 이유**
AUDIT 3 확인 결과 `lesson_activities`는 Admin 화면에서만 참조되고, 교사에게는 `week_no · session_no · title · status`만 내려간다. `objective`(≤1000자 수업 목표)조차 전달되지 않는다. 즉 Admin이 24주치를 성실히 입력해도 교사 화면에는 차시 제목만 보인다. 확정된 15섹션 가이드(주차당 4,000~6,500자)가 존재하는데 교사가 종이/PDF를 따로 보는 것은 제품의 핵심 가치 손실이다.

**관련**: DEC-004 · DEC-028

---

### DEC-023 · 50분 6단계 골격 채택

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | SOURCE DOCUMENT (STARTER 표준화 규격 v1.0 §2) |

**결정 내용**
표준 수업 골격을 다음 6단계로 채택한다.

| 순서 | 단계 | 시간 |
|---|---|---|
| 1 | 도입 | 5분 |
| 2 | 그림책 | 8분 |
| 3 | 활동 약속 | 2분 |
| 4 | 핵심활동 | 20분 |
| 5 | 미술·창작 | 10분 |
| 6 | 마무리 | 5분 |
| — | **워크북** | **별도 10분 (50분 밖)** |

예외: 6주차는 핵심활동 15분 + 미술 15분 (대형 공동작업). 총 50분 동일.
분할 운영 절단선: ③↔④ 또는 ④↔⑤ 사이만. 1회차 35분 / 2회차 15분 + 워크북 10분.

**결정 이유**
원본 표준화 규격이 전 주차 공통 골격으로 확정한 값이다. 현재 repository의 `src/data/site-copy.ts` `classSteps`는 5단계(마음열기5·주제이해10·창의표현25·정리5·나눔5)로 원본과 불일치한다. Source-of-Truth 규칙 R-1(DB·코드가 원본과 다르면 원본이 옳다)에 따라 원본을 기준으로 통일한다. 워크북을 50분 안에 넣지 않는 것은 기존 55~70분 초과의 주된 원인이 워크북 10분 포함이었기 때문이다.

**관련**: DEC-028 · DEC-020

---

### DEC-026 · 성장키워드 8개는 Week 주제

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | SOURCE DOCUMENT (STARTER 표준화 규격 v1.0 §1) |

**결정 내용**
성장키워드 8개는 성장 **지표**가 아니라 **주차 주제(Week theme)**다.

| 주차 | 성장키워드 | 프로그램명 |
|---|---|---|
| 1 | 시작 | 유치원 가는 날 |
| 2 | 끈기 | 끝까지 해보자 |
| 3 | 표현 | 마음을 말해줘 |
| 4 | 발견 | 소예의 씨앗 |
| 5 | 자존감 | 우린 모두 특별해 |
| 6 | 협력 | 우리들의 비밀기지 |
| 7 | 기다림 | *(원자료 필요)* |
| 8 | 공동체 | *(원자료 필요)* |

**결정 이유**
관찰 관련 분류가 4개 체계로 갈라져 있어 각각의 지위를 확정해야 했다. 성장키워드는 주차마다 하나씩 부여되고 순서가 있는 로드맵이므로, 아동별로 관찰되는 지표가 아니라 커리큘럼의 주제 축이다. 이를 지표로 오해하면 주차마다 지표가 달라져 시계열 비교가 불가능해진다.

**관련**: DEC-005 · DEC-025

---

### DEC-028 · Teacher Guide 15섹션 = Curriculum 모델 사양서

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | SOURCE DOCUMENT (STARTER 표준화 규격 v1.0 §3 + 1~6주차 가이드 판독) |

**결정 내용**
원본 교사용 수업가이드의 고정 15섹션 구조를 Curriculum 데이터 모델의 사양서로 사용한다. 매핑:

| § | 원본 섹션 | 모델 엔티티 | Class Mode |
|---|---|---|---|
| 1 | 수업을 시작하기 전에 | LessonMeta.perspective | BEFORE |
| 2 | 수업 한눈에 보기 (10필드) | LessonMeta | BEFORE |
| 3 | 교육목표 및 누리과정 연계 | NuriLink | BEFORE · Report |
| 4-A | 준비물 (구분·품목·수량기준) | Material | BEFORE |
| 4-B | 공간 세팅 | Preparation.space | BEFORE |
| 4-C | 안전 및 개인정보 확인 | Preparation.safety | BEFORE |
| 5 | 권장 시간표 (6단계 × 5열) | Step | DURING |
| 6 | 실제 수업 진행안 | Step + TeacherPrompt + ResponsePlaybook | DURING |
| 7 | 핵심활동 | Activity (core) | DURING |
| 8 | 미술·창작활동 | Activity (creative) | DURING |
| 9 | 워크북·교구 운영 | Activity (workbook) + ActivityItem | DURING(확장) |
| 10 | EBOOK·음원·MV 활용 | StepAsset (사용시점 + 역할) | DURING |
| 11 | 마무리 대화 | Step (closing) + TeacherPrompt | DURING |
| 12 | 관찰 및 기록 | ObservationFocus + Weekly 서식 | AFTER |
| 13 | 가정연계 | FamilyConnection | AFTER · Parent |
| 14 | 수업 중 이런 상황이 생기면 | SituationPlaybook | DURING |
| 15 | 교사용 1페이지 퀵 가이드 | QuickGuide | BEFORE · DURING |

**결정 이유**
현재 DB 커리큘럼 모델(`curriculum_programs` / `curriculum_lessons` / `lesson_activities`)은 수업 일정 뼈대만 담고 교육 구조를 담지 못한다. 그림책 제목·성장키워드·경험 흐름·워크북 항목·교사 발문·상황 대응을 저장할 필드가 없고, `activity_type` enum에 워크북·완성작품·가정연계에 해당하는 값이 없다. 원본이 이미 15섹션으로 정규화되어 있으므로 이를 모델 사양으로 채택하면 이관 손실이 최소화되고 Class Mode 화면 구조와 1:1로 대응한다.

**관련**: DEC-003 · DEC-004 · DEC-019 · DEC-025

---

## 2. 수업 운영

### DEC-004 · Class Mode 신규 개발

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
Class Mode를 신규 핵심 기능으로 개발한다. 3구간 구성:

| 구간 | 내용 |
|---|---|
| **BEFORE CLASS** | 준비물 · 교실 준비 · 안전 · 수업목표 · 예상시간 |
| **DURING CLASS** | Story · EBOOK · Teacher Prompt · VOD · Music · Activity · Workbook · Creative · Timer · Next Step |
| **AFTER CLASS** | Attendance · Observation · Photo · Child Voice · Teacher Note · Growth 5 · Complete |

**결정 이유**
교사가 수업을 진행하면서 종이 가이드·별도 콘텐츠 재생기·기록 화면을 오가는 현재 구조는 준비 부담과 기록 누락을 동시에 만든다. 수업 전·중·후를 하나의 흐름으로 묶는 것이 2.0의 가장 큰 신규 가치다.

**관련**: DEC-003 · DEC-029

---

### DEC-029 · Class Mode P0에서 인앱 재생 제외

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (Open Decision O-1 확정) |

**결정 내용**
Class Mode P0에서 **EBOOK / VOD / MV / 음원의 플랫폼 내 직접 재생을 제외**한다.

P0에서 제공하는 것:

```
수업 목표 · 준비물 · 교실 준비 · 안전 체크
6단계 Step · Timer · Teacher Prompt · Response Playbook
Activity Guide · Workbook Guide · Situation Help · Quick Memo
Attendance · Observation · Photo · Child Voice
Growth 5 · Observation Stage
```

EBOOK / VOD / MV / Audio의 플랫폼 내 직접 재생은 **P1 Content Delivery Layer 이후** 구현한다.

**결정 이유**
P0 Pilot의 목적은 교사가 화면을 보면서 BEFORE → DURING → AFTER 수업 흐름을 실제로 운영할 수 있는지 검증하는 것이다. 콘텐츠 인앱 재생은 자산 확보·저장·전송·권한·저작권 설계가 선행되어야 하며(AUDIT 3: 플랫폼 내 실제 VOD·음원·EBOOK 파일 0건), 이를 P0에 넣으면 Pilot 일정이 콘텐츠 준비에 종속된다. 가이드·프롬프트·타이머·기록 흐름이 P0의 본체이고, 이것이 검증되지 않으면 콘텐츠를 얹어도 의미가 없다.

**관련**: DEC-002 · DEC-032 · [mvp-scope.md](../01-product/mvp-scope.md)

---

## 3. 관찰 · 성장

### DEC-005 · SOYE Growth 5를 유일한 성장 지표로 확정

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
다음 5개를 유일한 성장 지표 체계로 한다.

1. 표현 다양성
2. 형태·공간 구성
3. 창의적 시도
4. 활동 참여·몰입
5. 자기 설명·소통

**결정 이유**
AUDIT 3에서 관찰 관련 분류가 4개 체계로 갈라져 있음이 확인되었다. DB 시드는 미술 어휘 5영역(색채 표현·형태·공간 구성·표현의 세밀도·창의적 확장·활동 완결성)이고, 공개 홈페이지(`src/data/site-copy.ts` `growthObservationItems`)는 이미 위 Growth 5를 상품 특징으로 게시하고 있다. 즉 **판매 사이트가 제품이 기록하지 않는 지표를 이미 공개한 상태**였다. 홈페이지가 공개한 값을 철회하는 것보다 DB를 홈페이지에 맞추는 것이 정합적이고, Growth 5가 SOYE의 공식 기준이다.

**관련**: DEC-006 · DEC-020 · DEC-025 · DEC-026

---

### DEC-006 · 구 미술 5영역 inactive/historical 처리

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
현재 DB의 구 미술 5영역(`color_expression` · `form_space` · `detail_expression` · `creative_extension` · `activity_completion`)은 **과거 기록을 변경하지 않는다.** inactive / historical로 처리하고, 새 Growth 5는 **별도 code**로 만든다.

**결정 이유**
`observation_domains.code`는 FK 대상이고 UPDATE GRANT 컬럼 목록(`label` · `description` · `sort_order` · `is_active`)에 `code`가 없어 불변이다. 또한 `class_session_observation_domains`가 `on delete restrict`로 참조하므로 행 삭제도 불가능하다. `label`만 갱신해 기존 code를 재사용하면 과거 관찰기록의 의미가 소급 변경되어 감사 추적성이 훼손된다. 새 code 추가 + 구 code `is_active=false`가 유일하게 안전한 경로다.

**관련**: DEC-005 · DEC-011

---

### DEC-007 · Observation Stage는 교사가 직접 선택

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
Observation Stage 4단계를 교사가 직접 선택한다. **AI가 이 단계를 판정하거나 추천하지 않는다.**

| code | 한국어 UX |
|---|---|
| `NOT_OBSERVED` | 기록 없음 |
| `WITH_TEACHER` | 함께 |
| `AFTER_MODELING` | 보고 나서 |
| `INDEPENDENT` | 스스로 |

**결정 이유**
단계를 AI가 판정하면 이 제품은 즉시 아동 평가 도구가 된다. 또한 현재 AI SYSTEM_INSTRUCTIONS는 "점수·등급·수준·발달단계를 쓰지 않습니다"를 명시적으로 금지하고 있어, AI가 단계를 판정하면 자기 지침과 충돌한다. 교사가 선택하면 기록의 책임 주체가 분명해지고 AI 안전선도 유지된다.

**관련**: DEC-008 · DEC-009 · AI 금지 사항 (product-definition §12)

---

### DEC-008 · Observation Stage의 의미 정의

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
Observation Stage는 점수 · 등급 · 발달수준 · 또래평가가 **아니다.**
「이번 활동에서 관찰된 참여 / 지원 방식」이다.

**결정 이유**
4개 값이 나열되면 사용자는 자동으로 순위로 읽는다. 의미를 문서·UI·교사 오리엔테이션에서 반복 선언하지 않으면 "스스로"가 목표가 되고 "함께"가 결핍이 된다. 원본 표준화 규격 §5의 금지 표현(상·중·하, 우수, 부족, 또래 대비)과 §12의 기록 원칙("아이 간 비교나 몇 번 성공했는지가 아니라, 아이가 한 말·시도·바꾼 방법을 그대로 적습니다")이 같은 취지다.

**관련**: DEC-007 · DEC-027 · product-definition §10-5 (UX 원칙 U-1~U-9)

---

### DEC-012 · 워크북 정량 데이터 MVP 제외

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
색 개수 · 채운 비율 등 워크북 정량 데이터를 MVP 필수 입력으로 만들지 않는다. 향후 특정 Workbook의 **optional evidence**로 확장 가능하게만 고려한다.

**결정 이유**
현장 교사 입력 부담이 지나치게 크다. 아동 15명 × 24주 × 수치 여러 개는 Observation Stage 선택보다 훨씬 무거운 입력이며, 교사 작업량이 제품의 성패를 결정한다는 전제와 직접 충돌한다.

**관련**: DEC-032 (Pilot 성공 기준: 관찰 15명 20분)

---

### DEC-025 · 주차별 관찰영역은 지표가 아니라 ObservationFocus

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | SOURCE DOCUMENT (교사가이드 §12 판독) |

**결정 내용**
원본 교사가이드 §12의 주차별 관찰영역은 성장 **지표가 아니라** 차시별 **ObservationFocus(교사 안내 데이터)**다. Lesson에 귀속되며, 교사에게 "이 차시에서는 이런 모습을 보세요"로 제시되고 **입력 항목이 아니다.**

예 (1주차): 환경 적응 / 사회관계 / 의사소통 / 생활자립 / 안전·신체

**결정 이유**
이 5개는 주차마다 다르다. 지표로 채택하면 주차마다 측정 축이 바뀌어 시계열 비교가 원리적으로 불가능해지고, 누적 흐름을 보여주겠다는 리포트 설계가 성립하지 않는다. 반대로 차시별 관찰 초점으로 두면 교사의 관찰 품질을 높이는 안내로 기능하면서 Growth 5의 시계열성을 해치지 않는다.

**관련**: DEC-005 · DEC-026 · DEC-028

---

## 4. 리포트

### DEC-010 · 리포트 3계층 정의

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` · clarified by DEC-057 (결정 이유 안의 상품별 리포트 배분 서술) |
| 출처 | 사용자 확정 |

**결정 내용**
리포트를 3계층으로 정의한다.

| 계층 | 구성 |
|---|---|
| **WEEKLY** | 이번 주 활동 · Growth 5 · 관찰단계 · 아이의 말 · 교사 관찰 · 선택된 사진 · 가정연계 · 다음 주 예고 |
| **MONTHLY** | 이번 달 성장 변화 · 대표 관찰 · Growth 5 흐름 · 대표 활동 · 교사 서술 · 가정연계 |
| **SEMESTER** | 학기 성장 이야기 · 주차별 변화 · Growth 5 누적 흐름 · 대표 작품 · 대표 발화 · 누리과정 연결 · 교사 종합기록 |

**결정 이유**
상품 3종의 리포트 포함 범위가 다르고(STARTER 주간 / STANDARD 월간·학기 / PREMIUM 전부), 각 주기가 답하는 질문이 다르다. 주간은 "이번 주에 무슨 일이 있었나", 월간은 "한 달 동안 무엇이 달라졌나", 학기는 "한 학기의 성장 이야기"다. 하나의 서식으로 세 주기를 덮으면 주간은 과하고 학기는 부족해진다.

**관련**: DEC-011 · DEC-015 · DEC-024 · DEC-030 · DEC-031

---

### DEC-011 · 기존 3블록 구조 재사용

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
현재 구현된 `growth_changes` · `observation_summary` · `next_support` 3블록 구조를 **폐기하지 않는다.** 월간 / 학기 리포트에서 재사용 가능한 자산으로 본다.

**결정 이유**
3블록 서술형은 주간 리포트로는 과하지만 월간·학기 리포트에는 적합한 형태다. 이미 AI 초안 생성·적용·근거 스냅샷·완료 잠금까지 전 경로가 동작하므로, 폐기하면 검증된 구현을 버리고 다시 만드는 일이 된다.

**관련**: DEC-010 · DEC-024

---

### DEC-015 · Semester Portfolio는 아동 단위 누적 산출물

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
Semester Portfolio는 리포트 PDF 여러 개를 묶는 수준이 아니다. **아동 단위 누적 산출물**로 설계한다. 포함: 대표 성장기록 · Growth 5 흐름 · 대표 사진/작품 · 대표 발화 · 교사 종합기록 · 누리과정 연결.

**결정 이유**
PDF 묶음은 학부모에게 "24개 파일"이고, 원장에게는 평가·장학 증빙으로 쓸 수 없다. 학기 전체를 하나의 이야기로 읽을 수 있는 산출물이어야 PREMIUM의 차별점이 되고, 원본 작품 누적(이름표→메달→팔찌→마라카스→꽃→비밀기지)이 의미를 갖는다.

**관련**: DEC-010 · DEC-013

---

### DEC-024 · Weekly 리포트 5항목 서식

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | SOURCE DOCUMENT (STARTER 표준화 규격 v1.0 §4 + 교사가이드 §12) |

**결정 내용**
Weekly 리포트 서식을 다음 5항목 + 다음 주 예고로 한다.

| 항목 | 데이터 출처 | 입력 주체 |
|---|---|---|
| 오늘의 활동 | Lesson.story_title + Activity 제목 | **자동 조립** |
| 아이의 작품 | Lesson.take_home + 교사 선별 사진 | 자동 + **교사 선택** |
| 아이의 말 | `child_voice` (기존 필드) | **교사 입력** |
| 교사 관찰 | `teacher_note` + Growth 5 / Stage | **교사 입력** |
| 가정연계 Tip | Lesson.FamilyConnection | **자동 조립** |
| 다음 주 예고 | 다음 Lesson 주제·성장키워드 | **자동 조립** |

**결정 이유**
원본 표준화 규격 §4가 이 5항목을 전 주차 공통 고정 서식으로 지정하고 **"플랫폼 서식과 동일"**이라고 명시했다. 즉 원본 교육자료와 플랫폼이 같은 서식을 쓰기로 이미 합의된 상태다. 또한 공개 홈페이지의 `parentReportInfoItems`도 정확히 같은 5개다. 설계 불확실성이 없다.

실행 관점에서 더 중요한 점: **5항목 중 교사 입력은 2개(아이의 말·교사 관찰)뿐이고 나머지는 커리큘럼 데이터에서 자동 조립된다.** 사진 선택 1~3장을 더하면 끝난다. 이것이 "주 1회 × 15명"을 현실화하는 유일한 방법이다.

**관련**: DEC-010 · DEC-030 · DEC-032

---

### DEC-030 · Weekly Report에 원장 사전승인을 요구하지 않음

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (Open Decision O-2 확정) |

**결정 내용**
Weekly Report는 원장의 **매 건 사전승인을 필수로 하지 않는다.**

기본 Flow:

```
Teacher Observation
  → Weekly Report Draft
  → Teacher Review
  → Teacher Complete
  → Parent Publish Eligible
```

Director의 역할:

- complete 리포트 조회
- 미발행 / 누락 현황 확인
- Child Portal 공유 활성 / 중지
- 필요 시 리포트 검토

**유지되는 RLS 원칙**: Teacher가 complete하기 전의 draft와 AI draft는 **Director에게 노출하지 않는다.**

**결정 이유**
주 60건 이상(아동 15명 × 4반)을 원장이 모두 승인해야 하는 구조는 Pilot 운영부담이 지나치다. 승인이 병목이 되면 리포트 발행이 지연되고, 지연되면 학부모 신뢰라는 목적 자체가 훼손된다. 대신 원장에게 "누락 현황"과 "공유 통제권"을 주면 품질 관리는 유지되면서 병목이 사라진다.

draft·AI draft 비노출은 별개의 이유로 유지한다. 교사가 다듬는 중인 문장과 AI 원문을 원장이 보면 교사가 초안 단계에서 자기검열하게 되고, 이는 기록 품질을 떨어뜨린다. 현재 RLS(`child_growth_reports` SELECT는 director에게 `status='complete'`만, `child_growth_report_ai_drafts`는 교사 전용)가 이미 이 원칙을 구현하고 있다.

**관련**: DEC-010 · DEC-024 · DEC-013 · DEC-031

---

## 5. AI

### DEC-009 · AI는 optional assistant

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
AI는 optional assistant다. AI 장애 · API Key 미설정 · quota 문제가 발생해도 **수업 · 관찰 · 성장리포트가 정상적으로 운영되어야 한다.**

AI의 역할: 관찰 정리 · 리포트 초안 · 문장 보조
AI가 하지 않는 것: 진단 · 평가 · 점수 · 등급 · 단계 자동판정 · 또래 비교 · 관찰되지 않은 사실 생성

**결정 이유**
AUDIT 2에서 확인된 구조적 결합이 근거다. `child_growth_report_sources.ai_draft_id`가 `NOT NULL`이고 `create_or_refresh_child_growth_report`가 `review_status='accepted'`인 AI 초안을 요구하기 때문에, **OpenAI API Key가 없으면 성장 리포트를 단 한 건도 생성할 수 없다** (`GR003`). `.env.example`은 "AI 정리 기능만 비활성화되고 나머지 화면은 그대로 동작한다"고 적고 있어 사실과 다르다.

이 결합은 AI 장애·쿼터 소진·모델 폐기 시 STANDARD·PREMIUM의 핵심 판매 근거를 정지시킨다. 또한 교사가 AI 없이 직접 쓴 관찰기록을 리포트 근거로 쓸 수 없다는 것은 제품 철학(교사가 주체)과도 어긋난다.

**필요 변경**: `ai_draft_id` nullable화 + 교사 직접 작성 근거 경로 신설 + `.env.example` 주석 정정.

**관련**: DEC-007 · DEC-027 · DEC-011

---

### DEC-027 · 원본 금지 표현을 AI 지침 + 문구 검수 기준으로 승격

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | SOURCE DOCUMENT (STARTER 표준화 규격 v1.0 §5) |

**결정 내용**
원본 표준화 규격의 금지 표현 5범주를 AI SYSTEM_INSTRUCTIONS와 제품 문구 검수 기준으로 사용한다.

| 범주 | 금지어 |
|---|---|
| 평가·진단 | 잘함/못함, 상·중·하, 우수, 부족, 미흡, 발달지연, 정상, 또래 대비 |
| 인과 단정 | 향상된다, 발달시킨다, 길러진다, 치료한다, 개선한다 |
| 통제 | 반드시 ~하게 한다, 끝까지 해야 한다 |
| 정답 유도 | 정답은 무엇일까요, 누가 제일 잘했나요 |
| 외부 서비스 | 키즈노트 → **학부모 성장리포트** |
| 비공식 영역 | 정서·자기조절을 누리과정 영역으로 표기 → **SOYE KIDS 핵심경험**으로 분리 |

**결정 이유**
같은 금지 규칙이 교육자료와 AI 지침과 제품 UI 문구에 각각 따로 존재하면 언젠가 한쪽만 갱신된다. 원본 규격이 이미 범주별로 정리해 두었으므로 이를 단일 출처로 삼는다. 특히 "정서·자기조절을 누리과정 영역으로 표기하지 않는다"는 항목은 Nuri 매핑 데이터 설계에 직접 영향을 준다.

**관련**: DEC-008 · DEC-009 · DEC-019 · DEC-020

---

## 6. 학부모

### DEC-013 · parent role 미추가 · Child Secure Portal로 발전

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
당장 `organization_members`에 `parent` role을 추가하지 않는다. 현재 secure share 구조를 발전시켜 **Child Secure Portal** 형태로 만든다.

Portal 구성: 이번 주 · 성장 · 활동 · 작품 · 가정연계 · 지난 기록 · 학기 포트폴리오
Parent Account는 후속 단계로 검토한다.

**결정 이유**
`organization_members.role`에 `parent`를 추가하면 **RLS 정책 66개를 전수 재검토**해야 한다. 특히 `private.is_active_org_member()`가 커리큘럼 읽기를 열어주므로, 학부모에게 교사용 수업안·발문·관찰포인트가 노출될 위험이 있다. 회귀테스트 체계가 없는 상태에서 이 규모의 변경은 AUDIT 2가 확인한 방어를 검증 없이 흔드는 일이다.

반대로 아동 단위 링크 1개로 누적 경험을 제공하면, 기존 검증된 보안 설계(256bit 토큰·해시만 저장·fragment 전송·pass-the-hash 방지·실패 무구분·anon 전용 GRANT)를 그대로 유지하면서 학부모 경험 문제를 해결할 수 있다. 현재는 리포트 1건 = 링크 1개라서 24주면 링크가 24개가 되어 운영이 불가능하다.

**관련**: DEC-014 · DEC-015 · DEC-021

---

### DEC-014 · 사진 제공 순서 고정

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
학부모 사진 제공은 **한다.** 그러나 순서는 다음으로 고정한다.

```
① 삭제 / 파기 경로
② 보호자 동의
③ 교사 사진 선택
④ report snapshot
⑤ parent exposure
```

기존 private storage 원칙을 최대한 유지한다.

**결정 이유**
AUDIT 2에서 확인된 현재 상태가 근거다. `class_session_observation_media`와 `storage.objects` 양쪽에 **UPDATE·DELETE 정책이 0개**여서 업로드된 아동 사진을 **아무도 삭제할 수 없다.** 잘못 올린 사진(다른 아이 얼굴, 개인정보 노출 배경)을 회수할 수 없고, 개인정보보호법상 삭제 요구권과 파기 의무를 이행할 수 없다.

①을 건너뛰고 ⑤를 먼저 만들면 되돌릴 수 없는 노출이 발생한다. ②가 없으면 동의 없는 노출이고, ③이 없으면 전체 사진이 나가고, ④가 없으면 발행 후 내용이 바뀐다. 순서 자체가 안전장치다.

원본 표준화 규격 §4-C가 전 주차 고정문구로 "사진 촬영·공유는 기관의 보호자 동의 및 개인정보 운영 기준을 따릅니다"를 지정한 것도 ②의 근거다.

**관련**: DEC-013 · DEC-024

---

## 7. 상품 · 계약

### DEC-016 · Product / Contract / Entitlement를 DB에서 표현

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
STARTER 8주 / STANDARD 16주 / PREMIUM 24주의 상품 · 계약 · Entitlement를 DB에서 표현할 수 있어야 한다. 상품에 따라 기능 차이가 있다면 **UI 숨김만 하지 않고 Server / DB 차원에서도 feature gating**이 가능해야 한다.

**결정 이유**
AUDIT 3 확인 결과 `organizations` 테이블의 컬럼은 `id · name · institution_type · status · created_at · updated_at`뿐이다. 상품·플랜·계약기간·좌석·한도·기능권한을 표현하는 필드가 하나도 없고, `package_code`가 등장하는 유일한 곳은 `lead_submissions`(문의 폼의 관심 상품)이다. 즉 **계약된 상품이 시스템에 존재하지 않는다.**

결과로 "STARTER는 대시보드 미포함"을 강제할 수단이 없고, 원장이면 누구나 대시보드에 접근한다. UI 숨김만으로 막으면 Server Action 직접 호출로 우회된다.

**관련**: DEC-017 · DEC-018 · DEC-031

---

### DEC-017 · B2B/B2G 우선 · Payment Adapter 전제 · PG 미확정

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
B2B / B2G 특성을 우선한다. 먼저 **상담 · 견적 · 계약 · 기관 활성화**를 정상 지원한다.
온라인 구매·결제도 확장 가능하게 설계하지만 **PG 사업자를 이번 PHASE에서 확정하지 않는다. Payment Adapter를 전제로 한다.**
환불 · 자동갱신 · 해지 · 결제주기 정책은 **미확정 상태로 기록한다.**

**결정 이유**
현재 공개 홈페이지는 온라인 결제와 공개 회원가입을 제공하지 않으며, 이용약관과 개인정보처리방침이 그 사실을 명시하고 있다(`"공개 회원가입은 제공하지 않습니다"` / `"웹사이트를 통한 즉시 결제나 온라인 구독 신청을 제공하지 않으며"`). 기관 고객의 실제 구매는 상담·견적·계약을 거치므로 B2B 흐름이 먼저 완성되어야 한다.

동시에 `src/data/packages.ts` 주석이 기록한 대로 환불·자동갱신·결제주기·계약해지 조건이 확정되지 않았다. 확정되지 않은 정책을 제품이 먼저 만들면 계약서와 어긋난다. PG를 확정하지 않고 Adapter 인터페이스만 두면 정책 확정 시점에 구현을 붙일 수 있다.

**관련**: DEC-018 · DEC-020 · [open-items.md](../01-product/open-items.md) Blocked By Business Policy

---

### DEC-018 · 초과요금은 데이터로 관리, 자동청구 미구현

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
15명 기준 및 초과요금 정보(1인당 월 6,600원부터)를 **상품 데이터로 관리 가능하게 한다.** 그러나 정책 확정 전 **자동 청구를 구현하지 않는다.**

**결정 이유**
초과요금을 자동 청구하려면 원아 수 스냅샷 시점, 청구 주기, 중도 입·퇴원 처리, 반 분할 시 계산 방식이 모두 확정되어야 한다. 이 중 어느 것도 확정되지 않았다. 잘못된 자동 청구는 계약 분쟁으로 직결되므로, 데이터는 관리하고 청구는 사람이 확인하는 단계를 유지한다.

**관련**: DEC-016 · DEC-017

---

### DEC-031 · STARTER 대시보드 미포함을 시스템에서 강제

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (Open Decision O-3 확정) |

**결정 내용**
정규 STARTER 상품에 Director Dashboard가 포함되지 않는다는 현재 상품 정의를 **시스템에서도 강제한다.** UI 숨김만 하지 않고 Product / Contract / Entitlement를 통해 **Server / DB 수준에서 feature gate**한다.

예시 (확정 아님 — PHASE 03에서 최종 확정):

```
starter:   weekly_report · teacher_class_mode · parent_portal
standard:  starter 기능 + director_dashboard · monthly_report · semester_report
premium:   standard 기능 + 24_week_content · branding · 기타 Premium entitlement
```

**Pilot은 정규 STARTER와 다른 별도 entitlement로 취급**하여, 검증에 필요한 Director Dashboard 기능을 허용할 수 있게 한다.

**결정 이유**
상품 비교표가 STARTER의 대시보드를 "－"로 명시하고 있으므로, 강제하지 않으면 상품 차별이 신뢰 문제로 돌아온다. UI 숨김만으로 막으면 Server Action 직접 호출·URL 직접 입력으로 우회되고, 이는 AUDIT 2가 확인한 "클라이언트 값을 신뢰하지 않는다"는 전 코드의 일관된 원칙과도 어긋난다.

Pilot을 별도 entitlement로 분리하는 이유는 Pilot 검증 항목에 "원장이 누락을 먼저 발견하는가"(V-6)가 포함되기 때문이다. 정규 STARTER 규칙을 Pilot에 그대로 적용하면 검증 자체가 불가능하다. 또한 Pilot은 정규 판매상품이 아니라는 기존 상품 정의(`pilotOffer.note`)와도 일치한다.

**관련**: DEC-016 · DEC-032 · DEC-010

---

## 8. 데이터 · 품질

### DEC-019 · 누리과정을 실제 Curriculum 데이터로

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 + SOURCE DOCUMENT (교사가이드 §3 판독) |

**결정 내용**
누리과정 연결을 마케팅 문구가 아니라 **실제 Curriculum 데이터**로 만든다. 차시와 누리과정의 연결이 교사 / 원장 / 리포트에서 재사용 가능해야 한다.
현재 SOYE 원본자료에 실제 존재하는 연계 수준을 우선 사용한다. **공식 세부 분류는 검증된 자료 없이 추측하지 않는다.**

**결정 이유**
AUDIT 3은 "누리과정 연계가 홈페이지 문구(영역 이름 5개)로만 존재한다"고 판정했으나, PHASE 01에서 원본 교사가이드를 판독한 결과 **§3에 주차별 실데이터가 존재함**이 확인되었다. 구조는 `누리과정 영역 × 교육목표 × 교사가 볼 행동` 5행이며, 1주차 예시는 사회관계·의사소통·자연탐구·신체운동·건강·예술경험이다. 즉 이관 과제이지 설계 과제가 아니다.

동시에 원본 규격 §5가 "정서·자기조절을 누리과정 영역으로 표기하지 않고 SOYE KIDS 핵심경험으로 분리"할 것을 지정했으므로, 누리 5영역과 SOYE 핵심경험을 같은 필드에 섞지 않는다. 59개 내용 요소 수준의 세부 분류는 원본에 없으므로 만들지 않는다.

**관련**: DEC-027 · DEC-028 · DEC-020

---

### DEC-020 · Single Source of Truth = DATABASE

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
운영 사실 데이터의 최종 출처는 **DATABASE**다. (상품 코드 · 상품 기간 · 상품 가격 · Entitlement · Curriculum version · Week · Growth metric · published content)
Editorial Marketing Copy는 TypeScript / static content를 유지할 수 있다. 그러나 **가격 · 주차 · Growth 5 · 패키지 기능 같은 제품 사실은 DB와 다른 값을 독립적으로 갖지 않는다.**

**결정 이유**
동기화 장치가 없어서 이미 불일치가 발생했다. 공개 홈페이지의 `growthObservationItems`는 Growth 5를 게시하고 있는데 DB는 미술 5영역을 갖고 있고, 상품 가격·기간·콘텐츠 수량은 `src/data/packages.ts`에만 존재한다. 손님에게 잘못된 값이 보이는 쪽은 항상 덜 보는 화면이다.

**관련**: DEC-005 · DEC-016 · DEC-023 · project-charter §8

---

### DEC-021 · DB/RLS 변경 전 회귀테스트 체계 구축

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 |

**결정 내용**
SaaS 2.0에서 DB / RLS를 본격적으로 변경하기 전에 **RLS / Auth / Tenant isolation 회귀테스트 체계를 만든다.**

**결정 이유**
현재 프로젝트에 테스트 프레임워크 자체가 없다(`package.json`에 테스트 의존성 0개). RLS 정책 66개와 RPC 13개의 동작을 검증할 수단이 없는 상태다. 2.0은 관찰 테이블·리포트 테이블·신규 상품/계약 테이블을 모두 건드리므로, AUDIT 2가 확인한 6개 크로스테넌트 방어가 깨졌는지 매번 수동 재검증할 수는 없다.

이것이 P0의 첫 항목이며 **다른 모든 DB 작업의 선행 조건**이다.

**관련**: DEC-022 · [mvp-scope.md](../01-product/mvp-scope.md) P0-1

---

### DEC-022 · AUDIT 2 보존 자산을 Architecture Invariants로 고정

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 + AUDIT 2 |

**결정 내용**
REPOSITORY AUDIT 2가 식별한 "반드시 유지해야 할 구조"를 Architecture Invariants로 고정한다. 전체 목록은 [project-charter.md §5](./project-charter.md) 참조 (AI-1 ~ AI-17).

**결정 이유**
AUDIT 2에서 6개 크로스테넌트 공격 시나리오가 전부 방어됨으로 판정되었고 CRITICAL 결함은 0건이었다. 이 방어는 단일 장치가 아니라 서버 게이트 + RLS + 트리거 + 복합 FK + 컬럼 GRANT가 겹쳐서 만들어진 것이며, 하나를 빼면 나머지가 약해진다. 신규 기능이 "이번만 예외"를 요구할 때 근거로 쓸 문서가 필요하다.

**관련**: DEC-021

---

## 9. Pilot

### DEC-032 · Pilot 범위 확정

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (Open Decision O-4 확정) |

**결정 내용**

| 항목 | 값 |
|---|---|
| 기관 | 1~2개 |
| 반 | 기관당 1~2개 |
| 원아 | 반당 최대 15명 |
| 교사 | 2~4명 |
| 기간 | 4주 |
| 커리큘럼 | **Week 1~4** |
| 리포트 | **Weekly** |

**Pilot은 정규 판매상품이 아니라 도입 전 검증용 Offer다.**

**결정 이유**
Week 1~4로 한정하는 이유는 원본 표준화 규격이 적용된 확정본이 1~6주차이고, 그 중 앞 4주가 적응·도전·표현·발견으로 성장키워드 흐름의 한 묶음을 이루기 때문이다. 4주는 주간 리포트 4회를 발행해 "반복 운영이 지속 가능한가"를 볼 수 있는 최소 기간이다.

기관 1~2개 / 반 1~2개로 좁히는 이유는 Pilot의 목적이 규모 검증이 아니라 **흐름 검증**이기 때문이다. 동시에 2기관을 운영하면 테넌트 격리(V-8)를 실제 환경에서 확인할 수 있다.

정규 판매상품과 분리하는 것은 기존 상품 정의(`pilotOffer.note`: "4주 파일럿은 STARTER · STANDARD · PREMIUM과 동일한 정규 판매상품이 아닌, 도입 전 체험 프로그램입니다")와 일치하며, DEC-031의 별도 entitlement 처리 근거가 된다.

**관련**: DEC-029 · DEC-031 · DEC-024 · [mvp-scope.md](../01-product/mvp-scope.md)

---

## 10. User Flow · IA (PHASE 02)

> PHASE 02 검토·승인(2026-09-26)에서 확정된 결정. 화면 배치 수준의 세부는 [../02-ia/](../02-ia/) 문서에 두고, 여기에는 제품 동작·권한·데이터 요구에 영향을 주는 결정만 기록한다.

### DEC-033 · 기존 URL 유지 · Class Mode 경로 구조

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 검토) |

**결정 내용**
`/admin` · `/director` · `/teacher` 기존 URL 체계를 유지하고 기능을 확장한다. Class Mode는 기존 세션 경로 아래에 둔다.

| 구간 | 경로 | 처리 |
|---|---|---|
| 진입 | `/teacher/sessions/[sessionId]` | 신규 route handler — 세션 상태에 따라 해당 구간으로 보낸다 |
| BEFORE | `/teacher/sessions/[sessionId]/before` | 신규 |
| DURING | `/teacher/sessions/[sessionId]/during` | 신규 |
| AFTER ① 출결 | `/teacher/sessions/[sessionId]/attendance` | 기존 재사용 · 수정 |
| AFTER ② 관찰 | `/teacher/sessions/[sessionId]/observations` | 기존 재사용 · 수정 |

Teacher Primary Navigation은 현재 3개(오늘의 수업 · 수업 이력 · 성장 리포트)를 유지한다. Class Mode는 메뉴가 아니라 세션 카드에서 진입하는 전체화면 모드다.

**결정 이유**
출결·관찰 화면은 이미 권한(`requireTeacher` · RLS · 비대칭 권한)과 동시성 처리가 검증된 상태다. AFTER를 새로 만들면 검증된 쓰기 경로를 중복 구현하게 된다. URL을 유지하면 기존 링크·원장 follow-up 링크(`/director/sessions/{id}/…`)와의 대응도 깨지지 않는다.

**관련**: DEC-004 · DEC-029 · [../02-ia/class-mode-flow.md](../02-ia/class-mode-flow.md)

---

### DEC-034 · Session / Observation / Report "완료"의 의미 분리

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 검토) |

**결정 내용**

| 용어 | 의미 | 전환 시점 |
|---|---|---|
| **Session completed** | 교실 수업 진행 종료 | Class Mode DURING의 [수업 마치기] → `in_progress → completed` |
| **Observation complete** | 아동 1명의 관찰 기록 완료 | AFTER에서 아동별 저장 (`record_status = 'complete'`) |
| **Weekly complete** | 아동 1명의 주간 리포트 작성 완료 · 잠금 | 리포트 검토 화면의 작성완료 |

세 상태를 UI·문서·지표에서 같은 "완료"로 부르지 않는다. Session completed 후 Observation이 미작성인 상태가 Director follow-up에 잡히는 것은 **의도된 동작**이다.

**결정 이유**
현재 원장 대시보드의 관찰 follow-up은 `completed` 세션만 대상으로 한다(`isObservationRecordTarget`). 수업 종료를 AFTER 이후로 미루면 관찰 누락이 대시보드에 나타나지 않고, 반대로 세 "완료"를 섞으면 교사는 수업을 끝냈는데 "미완료"로 보이는 혼란이 생긴다.

**관련**: DEC-030 · DEC-033 · [../02-ia/state-error-model.md](../02-ia/state-error-model.md)

---

### DEC-035 · Quick Memo P0 교사 전용 서버 임시저장

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 IA-1) |

**결정 내용**
Class Mode DURING의 Quick Memo는 브라우저 local-only가 아니라 **교사 전용 서버 임시저장**을 P0 Product Requirement로 한다.

| 항목 | 요구 |
|---|---|
| 목적 | 새로고침 후 복구 · 기기 문제 시 손실 방지 · Pilot KPI "Class Mode 중 데이터 손실 0건" |
| 접근 | 작성 교사 본인 / 담당 반 범위 |
| Director | **노출하지 않는다** |
| Parent | **노출하지 않는다** |
| AI | 입력으로 사용하지 않는다 |
| 지위 | **최종 Observation이 아니다.** 교사가 AFTER에서 참고하고 필요한 내용만 직접 Observation으로 옮긴다. 자동 이관하지 않는다 |

정확한 저장 구조와 RLS는 PHASE 05에서 설계한다.

**결정 이유**
Quick Memo는 수업 중 아이의 말·행동을 붙잡는 유일한 수단이고, 기억에 의존하는 기록 문제(Teacher Pain Point)를 푸는 장치다. local-only는 기기 교체·저장소 삭제·브라우저 오류 시 복구할 수 없다. 원장 비노출은 DEC-030의 "draft 비노출" 원칙과 같은 이유(초안 단계 자기검열 방지)다.

**관련**: DEC-030 · DEC-033 · Invariant AI-10

---

### DEC-036 · BEFORE 필수 안전·개인정보 확인의 서버 보존과 수업 시작 조건

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 IA-2) |

**결정 내용**
BEFORE 확인 항목을 두 종류로 나눈다.

| 구분 | 예 | P0 보존 | 수업 시작 조건 |
|---|---|---|---|
| **A. Optional preparation check** | 준비물 확인 | 사용자 편의 체크. 서버 감사기록 필수 아님 | 아님 |
| **B. Required safety/privacy confirmation** | 안전 확인 · 사진/개인정보 확인 (원본 §4-C) | **서버에 확인 상태를 보존** — 최소 개념: who · when · session · confirmation state | **필수** — 완료되어야 Class Mode [수업 시작] 가능 |

정확한 저장 구조는 PHASE 05에서 설계한다.

**결정 이유**
§4-C는 원본이 전 주차 고정문구로 지정한 안전·개인정보 확인이다. 사진 동의 확인이 기록으로 남지 않으면 사고 발생 시 확인 여부를 증명할 수 없다. 반면 준비물 체크까지 감사 대상으로 만들면 교사 입력 부담만 늘어난다.

**관련**: DEC-014 · DEC-033 · [../02-ia/class-mode-flow.md](../02-ia/class-mode-flow.md)

---

### DEC-037 · Pilot 필수 커리큘럼 데이터 게이트

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 검토) |

**결정 내용**
P0 Pilot(Week 1~4)에서는 필수 커리큘럼 데이터가 누락된 상태로 수업을 시작시키지 않는다.

| 지점 | 동작 |
|---|---|
| Pilot Ready 점검 | Week 1~4 발행 커리큘럼 + 필수 수업 데이터 존재를 확인한다 |
| Class Mode 직접 URL 접근 | 필수 데이터가 부족하면 "수업 내용이 아직 준비되지 않았습니다" 상태로 **차단**한다 |
| 선택·부가 섹션 누락 | 해당 섹션만 숨기고 진행을 허용한다 |

Required Content Set(어떤 섹션이 필수인가)은 PHASE 05에서 구체적으로 정의한다.

**결정 이유**
Class Mode의 가치는 교사가 종이 가이드 없이 수업하는 것이다. 핵심 단계·프롬프트가 빠진 상태로 진입시키면 수업 중에 교사가 막히고, V-1(화면으로 수업 진행) 검증이 콘텐츠 누락 때문에 실패한 것인지 제품 때문에 실패한 것인지 구분할 수 없다.

**관련**: DEC-028 · DEC-032 · content-governance G-8

---

### DEC-038 · Observation Stage: 4-state 개념 / 3개 명시 선택 UX

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 검토) |

**결정 내용**
Observation Stage의 **제품 개념은 4가지 그대로**다 (기록 없음 · 함께 · 보고 나서 · 스스로). 교사 UI는 다음과 같이 구성한다.

| 항목 | 내용 |
|---|---|
| 기본 상태 | 모든 Growth 지표는 **기록 없음**이 기본값이다. 교사가 "기록 없음"을 매번 누르지 않는다 |
| 명시 선택 | 교사가 관찰된 Growth 지표를 선택했을 때만 **함께 · 보고 나서 · 스스로** 3개 선택지를 보여준다 |
| 요약 | Product Concept = 4 states · Explicit Teacher Choices after observation = 3 |
| 표현 금지 | 숫자 · 상/중/하 · 화살표 · 진행바 · 점수 색 · 레이더차트 · 달성률 |

이 결정은 DEC-007 · DEC-008을 **대체하지 않는다** (교사 직접 선택, AI 판정·추천 금지, 평가가 아님은 그대로다).

저장 방식 — (A) 행 없음 = `NOT_OBSERVED` / (B) `NOT_OBSERVED` 명시 저장 — 은 PHASE 05 Architecture Decision으로 남긴다 (open-items AD-3 · 02-ia IA-3).

**결정 이유**
15명 × 5지표에서 "기록 없음"을 명시적으로 누르게 하면 최대 75회의 불필요한 탭이 생기고, "기록 없음" 버튼을 누르는 행위 자체가 결핍 판정처럼 느껴진다(U-2). 기본값으로 두면 입력 부담과 평가 인상이 함께 줄어든다.

**관련**: DEC-005 · DEC-007 · DEC-008

---

### DEC-039 · Weekly Report = Child × Week · 반 단위 일괄 조립 · P0 AI 없음

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` · clarified by DEC-066 (Weekly 식별자 · 완료 조건) · DEC-070 (P1 문장 다듬기 = C3, `ai_assist` 포함 상품에서만) |
| 출처 | 사용자 확정 (PHASE 02 검토) |

**결정 내용**

| 항목 | 내용 |
|---|---|
| 단위 | **아동 × 주차(week_no)**. 자유 기간 입력을 쓰지 않는다. 분할 운영으로 한 주에 세션이 2개면 두 관찰을 모두 근거로 쓴다 |
| 생성 | 교사가 반 × 주차 대기열에서 관찰 완료 아동의 draft를 **일괄 조립**한다 |
| 교사 작업 | 아이의 말 · 교사 관찰 확인(관찰에서 복사된 값) + 사진 0~3장 선택 + 작성완료 |
| 편집 범위 | 리포트에서 고친 문장은 리포트 사본에만 반영된다. 관찰 원문은 바뀌지 않는다 (AI-10 · AI-11) |
| AI | **P0 Weekly에는 AI 기능이 없다.** 문장 다듬기는 P1 |
| 비교 | Weekly는 지난주와 비교 표기를 하지 않는다 |
| 관찰 없음 | 관찰이 complete가 아닌 아동은 draft를 만들지 않는다 (C-3) |

**결정 이유**
DEC-024가 교사 입력을 2항목으로 줄였으므로 남은 병목은 "15명을 하나씩 만드는 반복"이다. 일괄 조립과 완료 후 다음 아동 자동 이동이 V-3(아동당 3분)의 실질 수단이다. P0에서 AI를 빼면 V-7(AI 없이 운영)이 구조적으로 보장되고, 비교 표기를 빼면 PH3-1(시계열 표현)이 P0를 차단하지 않는다.

**관련**: DEC-009 · DEC-010 · DEC-024 · DEC-030

---

### DEC-040 · Child Secure Portal 신규 route · 아동 단위 공유 활성

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 IA-5) |

**결정 내용**
- 신규 route: **`/share/portal/[portalId]`** (+ 대응 resolve API). 토큰은 기존과 같이 `#fragment`로 전달한다.
- 기존 `/share/growth-report/[shareId]`는 호환성을 위해 유지한다 (전환 정책은 DEC-041).
- 공유 활성/중지는 **아동 단위**다. 원장이 아동 Portal을 한 번 활성화하면, 이후 Teacher Complete된 리포트는 원장 추가 조치 없이 Portal에 노출된다 (C-5: Teacher Complete ∧ Portal 공유 활성 ∧ 숨김 아님).

**결정 이유**
식별 대상이 리포트에서 아동으로 바뀌고, 노출 범위·DTO가 다르다. 같은 경로에 두 의미를 섞으면 resolve 로직과 로그 해석이 모호해진다. `/share/` 접두사는 유지해 기존 no-store · noindex · no-referrer 정책을 동일하게 적용한다. 아동 단위 활성은 DEC-030(원장 매 건 조치 없음)을 공유 단계에서도 성립시킨다.

**관련**: DEC-013 · DEC-030 · DEC-041 · Invariant AI-14

---

### DEC-041 · Legacy report share — Production Cutover 정책

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 IA-14 → IA-5 확정 시 함께) |

**결정 내용**

| 시점 | 기존 report share |
|---|---|
| 개발 중 | 신규 발급을 **중단하지 않는다** (운영 기능 유지) |
| Child Secure Portal **Production Cutover** 시점 | 기존 report share **신규 발급 중단** |
| Cutover 이후 | 이미 발급된 링크는 **만료 또는 revoked될 때까지 정상 동작**한다. 원장은 만료 전까지 기존 링크 조회·중지를 계속 할 수 있다 |

**결정 이유**
Portal이 운영 투입되기 전에 기존 공유를 끊으면 현재 이용 기관의 학부모 소통이 중단된다. 기존 링크는 트리거로 최대 30일이면 자연 소멸하므로, 강제 폐기 없이 전환할 수 있다.

**관련**: DEC-040

---

### DEC-042 · Parent Portal P0 Navigation = 이번 주 / 지난 기록

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 IA-4) |

**결정 내용**
P0 Portal Navigation은 **2개**만 둔다.

1. **이번 주** — 오늘의 활동 · 아이의 작품 · 아이의 말 · 교사 관찰 · 가정연계 Tip · 다음 주 예고
2. **지난 기록** — 노출 가능한 이전 리포트 목록 → 상세

별도의 "활동" · "가정연계" P0 탭을 만들지 않는다. P1: 성장 · 작품 / P2: 학기 포트폴리오.

**결정 이유**
DEC-024의 Weekly 5항목이 이미 활동과 가정연계를 포함하므로 별도 탭은 같은 정보를 두 번 보여준다. 학부모는 모바일에서 링크를 한 번 열어 읽는 사용자이므로 탐색 단계가 적을수록 V-5(열람·이해) 가능성이 높다. product-definition §12-2의 P0 구성 요소(이번 주 · 활동 · 가정연계 · 지난 기록 · 인쇄)는 정보로서 모두 유지되며, 배치만 2개 화면으로 통합한다.

**관련**: DEC-013 · DEC-024 · DEC-040

---

### DEC-043 · Report Emergency Hide (P0)

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` · clarified by DEC-074 (숨김 단위 = 논리 리포트 · 해제 권한 · 자동 해제 없음) · DEC-073 (정정 = 새 Revision) |
| 출처 | 사용자 확정 (PHASE 02 IA-7 수정 · P1 → P0) |

**결정 내용**
Portal에 노출된 리포트 **1건**을 즉시 숨기는 최소 Emergency Visibility Control을 P0에 둔다.

| 항목 | 내용 |
|---|---|
| 사용 상황 | 공개 후 잘못된 사진 · 개인정보 문제 · 중대한 오타/내용 오류 발견 |
| 권한 | Director · 권한 있는 HQ (admin. **sales 제외**) |
| 범위 | 리포트 1건. **Portal 전체 revoke와 분리**한다 |
| 필요 개념 | `visible / hidden` · hidden reason · hidden by · hidden at |
| 학부모 화면 | 해당 리포트가 목록·이번 주에서 사라진다. 숨김 사유·흔적을 표시하지 않는다 |
| 교사 | 자기 리포트가 숨겨졌다는 상태와 사유를 볼 수 있다 |

**이것은 사전승인이 아니다.** 기본 흐름은 그대로 Teacher Complete → Publish Eligible → Portal 활성이면 자동 노출이다. 이 기능을 이유로 원장 사전승인을 추가하지 않는다.

숨김 해제(재노출) 허용 여부와 숨긴 리포트의 정정 경로는 리포트 reopen 정책(open-items PH3-3)과 함께 PHASE 03에서 확정한다. 저장 구조는 PHASE 05.

**결정 이유**
DEC-030으로 사전승인을 없앴기 때문에, 공개 후 문제가 발견되었을 때 되돌릴 수단이 반드시 있어야 한다. Portal 전체 revoke는 정상 리포트까지 모두 끊고 링크 재발급을 강요하므로 사고 대응으로는 과하다. 사진 오노출은 개인정보 사고이므로 P1까지 기다릴 수 없다.

**관련**: DEC-014 · DEC-030 · DEC-040

---

### DEC-044 · 접근 실패 UX: 404 / Not Entitled / 학부모 무구분

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 검토) |

**결정 내용**

| 상황 | 보여주는 것 |
|---|---|
| 테넌트 · 역할 · 배정 범위 밖의 자원 | 기존과 같이 **"찾을 수 없거나 접근 권한이 없습니다"** (존재 여부 무구분) |
| 콘텐츠 주차가 Entitlement 범위 밖 | 없는 것으로 보인다 (조회 0건) |
| 기관이 보유한 기능이지만 **상품이 허용하지 않음** | **"현재 이용 상품에 포함되지 않은 기능"** 안내 화면 (404 아님) |
| 학부모 링크 invalid · expired · revoked | **하나의 화면**. 사유를 구분하지 않는다 (Invariant AI-14). 사유 구분은 원장 화면에서만 한다 |
| 정규 STARTER 원장 | `/director` 홈을 메뉴에서 숨기고, 로그인 착지를 `/director/sessions`로 한다. 직접 접근 시 Not Entitled 안내 |

**결정 이유**
존재 탐지를 막아야 하는 곳(테넌트 경계·학부모 링크)과, 숨길 이유가 없고 영업 경로를 안내해야 하는 곳(상품 기능 차이)은 목적이 다르다. 둘을 같은 404로 처리하면 원장은 "고장"으로 오해하고, 반대로 테넌트 경계에서 안내를 주면 존재 여부가 새어 나간다.

**관련**: DEC-016 · DEC-031 · Invariant AI-9 · AI-14

---

### DEC-045 · P0 상품·계약 운영은 기관 상세 내부에서

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 검토) |

**결정 내용**
- P0에서는 별도 Product / Contract 관리 화면을 만들지 않는다. 상품(Pilot · STARTER · STANDARD · PREMIUM)은 기준 데이터로 두고, **기관 상세 안의 "계약·이용권" 섹션**과 **온보딩 0단계(상품·계약)**에서 Contract / Entitlement를 운영한다.
- `/admin/products` · `/admin/contracts` 별도 관리 UI는 **P1**.
- Pilot은 정규상품과 다른 별도 Entitlement로 프로비저닝한다 (DEC-031 · DEC-032).

**결정 이유**
Pilot은 1~2개 기관이다. 상품 편집 화면은 4개 상품을 바꿀 일이 거의 없는 단계에서 P0 화면 수만 늘린다. 계약은 기관 단위로 발생하므로 기관 상세에 두는 것이 운영 흐름과도 맞다.

**관련**: DEC-016 · DEC-031 · DEC-032

---

### DEC-046 · Class Mode 적용 세션의 수업 시작은 BEFORE 필수 확인을 통과한 Teacher 경로로 단일화

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 IA-18) |

**결정 내용**
P0 Pilot 및 Class Mode가 적용되는 세션에서 `scheduled → in_progress` 전환은 **Teacher가 Class Mode BEFORE의 필수 안전·개인정보 확인을 완료한 뒤 [수업 시작]을 눌렀을 때만** 발생한다.

```
scheduled
  → BEFORE
  → required safety/privacy confirmation   (DEC-036)
  → Teacher [수업 시작]
  → in_progress
```

| 경로 | CURRENT | TARGET (P0 · Class Mode 적용 세션) |
|---|---|---|
| Teacher `/teacher` 오늘 화면 [수업 시작] | 세션을 직접 `in_progress`로 전환 | **직접 전환하지 않는다.** `/teacher/sessions/[sessionId]` 또는 BEFORE로 이동시킨다 |
| Director `/director/sessions` [수업 시작] | 세션을 직접 `in_progress`로 전환 | **직접 전환하지 않는다.** Director는 교사의 필수 확인을 대신하지 않는다. 운영 조회 · 출결 정정 · 취소 등 허용된 기능은 유지한다 |
| HQ 프로그램 배정 화면의 상태 변경 | 세션을 `in_progress`로 전환 가능 | 필수 확인 없이 `in_progress`로 전환하는 경로를 두지 않는다 |
| 우회 경로 | — | **P0에 두지 않는다** |

HQ / Admin의 비상 강제 상태변경이 필요한 경우는 PHASE 05 Architecture에서 **audit log가 있는 별도 예외 경로**로 검토한다. 지금 구현하지 않는다.

**결정 이유**
DEC-036이 필수 안전·개인정보 확인을 수업 시작 조건으로 정했지만, CURRENT에는 교사 오늘 화면과 원장 수업 운영 화면에서 확인 없이 `in_progress`로 가는 버튼이 있다. 이 경로가 남으면 필수 확인은 선택 사항이 되고, 사진 동의 확인 여부를 증명할 수 없게 된다. 확인은 교실에 있는 교사만 할 수 있으므로 원장이 대신할 수 없다.

**관련**: DEC-034 · DEC-036 · DEC-033 · [../02-ia/class-mode-flow.md](../02-ia/class-mode-flow.md)

---

### DEC-047 · Class Mode 적용 세션의 `scheduled → completed` 직접 전환 금지

| | |
|---|---|
| 결정일 | 2026-09-26 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 02 IA-19) |

**결정 내용**
SaaS 2.0 Class Mode 적용 세션에서는 `scheduled → completed` 직접 전환(CURRENT "빠른 완료")을 제거하고, 다음 정상 흐름으로 단일화한다.

```
scheduled
  → BEFORE
  → required safety/privacy confirmation   (DEC-036)
  → Teacher [수업 시작]                      (DEC-046)
  → in_progress
  → DURING
  → Teacher [수업 마치기]
  → completed
```

| 항목 | 결정 |
|---|---|
| Teacher 빠른 [완료] | Class Mode 적용 세션에서 **제거** |
| Director `scheduled → completed` 직접 완료 | Class Mode 적용 세션에서 **제거** |
| HQ / Admin 일반 운영 UI | `scheduled → completed` 직접 전환 **불허** |
| 취소 | 기존 정책 유지 — `scheduled → cancelled` · `in_progress → cancelled` 허용 |
| `completed`의 의미 | "교실 수업 진행이 종료되었다"만 뜻한다. Observation 완료 · Weekly 완료는 별도 상태다 (DEC-034 유지) |
| 적용 범위 | SaaS 2.0 Class Mode 대상 세션의 TARGET FLOW. **1.0의 과거 `completed` 기록은 변경하지 않는다** |
| Emergency Override | 데이터 복구 · 운영 오류 정정 · 마이그레이션 등으로 강제 상태변경이 필요한 경우 PHASE 05 Architecture에서 **admin only · explicit reason · actor · timestamp · audit log**를 갖춘 별도 예외 경로로 검토한다. **P0 일반 UI에는 구현하지 않는다** |

**결정 이유**
DEC-046으로 `in_progress` 진입을 필수 확인 경로로 단일화해도, `scheduled`에서 바로 `completed`로 가는 경로가 남으면 필수 안전·개인정보 확인 없이 "수업이 진행된 세션"이 기록된다. 이는 DEC-036 · DEC-046이 막으려는 결과를 옆 경로로 허용하는 것이다. 또한 `completed`가 원장 관찰 follow-up의 기준(`isObservationRecordTarget`)이므로, 실제 수업 흐름을 거치지 않은 `completed`는 운영 지표의 신뢰도도 떨어뜨린다.

**관련**: DEC-034 · DEC-036 · DEC-046 · [../02-ia/state-error-model.md](../02-ia/state-error-model.md)

---

## 11. Product · Contract · Entitlement · Commerce (PHASE 03)

> PHASE 03 검토·승인(2026-09-27)에서 확정된 결정. 상세 정책은 [../03-commerce/](../03-commerce/) 문서에 둔다. Feature Code와 Contract State는 **제품 정책 이름**이며 DB enum · SQL이 아니다 (PHASE 05).

### DEC-048 · Product / Product Version / Contract / Entitlement 계층

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-1) |

**결정 내용**

| 층 | 정의 |
|---|---|
| **Product** | 판매 정의 (STARTER · STANDARD · PREMIUM) |
| **Product Version** | 특정 시점의 판매 정의 스냅샷. 상품 정의가 바뀌면 새 버전이 생기고, 체결된 계약은 체결 당시 버전을 유지한다 |
| **Contract** | 기관과 체결한 서비스 약정 |
| **Entitlement** | 현재 시스템이 실제로 허용하는 기능 · 콘텐츠 · 한도. **Contract에서 파생한다** |

일반 운영자는 Entitlement를 직접 수정하지 않는다. 허용 범위를 바꾸려면 Contract를 변경한다 (감사 대상).

**결정 이유**
판매 정의 · 약정 사실 · 시스템 권한이 한 곳에 섞이면 상품 개편이 기존 기관의 권한을 소급 변경하거나, 수동 예외가 계약 근거 없이 쌓인다. 파생 구조는 "왜 이 기관이 이 기능을 쓰는가"를 항상 계약으로 설명하게 한다.

**관련**: DEC-016 · DEC-031 · [../03-commerce/commerce-overview.md](../03-commerce/commerce-overview.md)

---

### DEC-049 · Contract Unit과 ONE EFFECTIVE CONTRACT AT A TIME

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-2 · BP-8) |

**결정 내용**
- Contract Unit = **Organization × Product Version × Contract Class Scope × Contract Period**.
- 한 기관에는 **같은 시점에 효력이 발생하는 정규 계약이 최대 1개**만 존재할 수 있다.
- 다음은 현재 계약과 **함께 존재할 수 있다**: `draft` 계약 · 미래 시작일의 Renewal Contract · 미래 시작일의 Upgrade Contract.
- Pilot Offer는 별도 유형이다 (DEC-054).
- 한 기관 안에서 반별로 다른 상품을 동시에 계약하는 구조는 미결정 (03-commerce CO-6).

**결정 이유**
가격 근거가 "1개 반 · 15명 기준"이므로 반 수가 계약 범위여야 한다. 반마다 계약을 두면 기관 기능(원장 대시보드)과 어긋나고 갱신이 반 수만큼 늘어난다. 동시 효력 계약을 1개로 제한하면 Entitlement 계산이 모호해지지 않으면서, 미래 시작 후속 계약은 끊김 없는 갱신·업그레이드를 가능하게 한다.

**관련**: DEC-048 · DEC-053 · DEC-054

---

### DEC-050 · Contract State · 날짜 파생 상태 · Activation

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-3) |

**결정 내용**
- Product State: `draft` · `active` · `suspended` · `ended`.
- 날짜 기반 파생 상태 개념: `before_start` · `in_service` · `expired`. DB enum 여부는 PHASE 05.
- **서비스 활성화 = HQ 확인 AND Start Date 도래.**
- **Payment Status는 활성화 조건이 아니다.**
- **Contract active와 Organization active는 서로 다른 축이다.** 기관 상태는 테넌트 보안 · 전면 차단 스위치이고, 계약 상태는 상업적 권한이다.

**결정 이유**
B2B/B2G에서는 서명·발주 후 입금 전에 서비스를 여는 것이 정상 관행이다. 입금을 활성화 조건으로 묶으면 결제 시스템이 없는 P0에서 서비스를 열 수 없다. 기관 상태와 계약 상태를 섞으면 계약 만료가 로그인 차단(보안 조치)과 구분되지 않는다.

**관련**: DEC-017 · DEC-048

---

### DEC-051 · 반 · 원아 한도 정책

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-4 · IA-12) |

**결정 내용**

| 대상 | 정규 상품 | Pilot |
|---|---|---|
| 서비스 반 수 | Contract Class Scope를 초과할 수 없다. **프로그램 배정 HARD BLOCK** | 최대 2반 |
| 반당 원아 | 16번째 이상도 등록을 막지 않는다. **ALLOW + OVERAGE RECORD** | 15명 초과 시 **Pilot Ready 불가** (검증 조건) |
| 청구 | **자동 청구하지 않는다** (DEC-018) | — |

**Pilot 15명의 의미 (HARD)**: 데이터 준비 과정에서 Pilot 반에 16명 이상이 등록될 수는 있다. 그러나 반당 child count > 15이면 **Pilot Ready = FALSE**이고 **Pilot Activation은 차단**된다. **P0에서 HQ reason만으로 Ready를 override할 수 없다.** 15명 초과 Pilot을 허용하려면 향후 별도 Business Decision이 필요하다. 정규 상품의 ALLOW + OVERAGE RECORD와 혼동하지 않는다.

**결정 이유**
반은 가격 단위이므로 계약 범위 밖 반에 서비스를 여는 것은 무계약 제공이다. 반면 실제 반에서 16번째 아동의 등록을 막으면 그 아이만 수업 기록과 리포트에서 빠지게 되며, 제품이 만들어서는 안 되는 결과다. Pilot의 15명은 가격 조건이 아니라 검증 설계 조건이다 (DEC-032).

**관련**: DEC-018 · DEC-032 · DEC-049

---

### DEC-052 · Contract Suspended / Ended 접근 모델

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-5 · IA-10 · BP-17 일부) |

**결정 내용**
- Contract `suspended` / `ended` 시 새로운 **Class Mode · Observation · Report 작성 · 새 Publish**를 차단한다.
- 기존 기록은 **Read-only 정책**을 따른다.
- Parent Portal은 기존 공개 링크에 대해 **별도 정책**을 따른다 (새 공개 · 새 링크 발급 없음).
- **Organization suspended는 보안 · 전면 차단이며 Contract suspended보다 우선한다.**
- Read-only 유예 기간 · Data Retention · 삭제/파기 기간의 **숫자는 확정하지 않는다** (03-commerce CO-1 · CO-2).
- 데이터는 자동 삭제하지 않는다. 파기는 별도 확인 절차로만 한다 (현행 개인정보처리방침 문구와 일치).

**결정 이유**
계약 종료 즉시 전면 차단하면 마지막 주 리포트 확인·인쇄가 불가능하고, 기관이 자기 데이터를 확인할 수 있다는 약관과 긴장이 생긴다. 반대로 종료 후에도 새 작업을 허용하면 계약 없는 서비스 제공이 된다. 기간 숫자는 법무·계약 서식 사항이므로 제품이 추측하지 않는다.

**관련**: DEC-050 · DEC-044 · [../03-commerce/contract-policy.md](../03-commerce/contract-policy.md)

---

### DEC-053 · Upgrade · Renewal · Downgrade · Amendment

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-6 · BP-9) |

**결정 내용**

| 변경 | 처리 |
|---|---|
| Upgrade | **후속 Contract** |
| Renewal | **후속 Contract** |
| Downgrade | **Renewal 시점에서만** 허용 |
| 단순 날짜 조정 | 현재 Contract 수정 가능 · **reason · audit 필수** |

어떤 경우에도 기존 Observation · Report · Portal 데이터를 **삭제하거나 재생성하지 않는다.** 가격 차액은 P0 시스템에서 계산하지 않는다 (견적·계약서로 처리).

**결정 이유**
계약 기간마다 상품 버전 · 반 범위 · 가격 근거가 독립 기록으로 남아야 감사 추적이 가능하다. 기간 중 다운그레이드는 이미 제공한 기능·콘텐츠의 처리 문제를 만들므로 갱신 경계에서만 허용한다.

**관련**: DEC-049 · DEC-055

---

### DEC-054 · Pilot Offer

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` · clarified by DEC-070 (Pilot 특수 Entitlement에 C1 Observation Cleanup만 포함) |
| 출처 | 사용자 확정 (PHASE 03 C-7) |

**결정 내용**
- Pilot은 **별도 Offer 유형**이다. **STARTER 할인판이 아니다.**
- Entitlement: Class Mode · Weekly · Parent Portal · Director Dashboard · Content Week 1~4. 한도: 반 최대 2 · 반당 15명 · 교사 2~4 (DEC-032 · DEC-051).
- Pilot → Regular 전환 시 **organization · class · child · teacher · record · report · portal**을 유지한다.
- Pilot 가격 · 무료 여부는 미확정 (03-commerce CO-3).

**결정 이유**
Pilot에는 STARTER에 없는 대시보드가 있고 한도가 검증 조건이므로 같은 상품의 가격 변형으로 표현할 수 없다. 전환 시 데이터를 유지해야 Pilot 4주가 정규 운영의 1~4주로 이어진다.

**관련**: DEC-031 · DEC-032 · DEC-049

---

### DEC-055 · Entitlement Feature Catalog · Content Entitlement · 기록 보존

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` · clarified by DEC-070 (`ai_assist` 상품 배분 확정) · DEC-068 (Semester 원천 · Reporting Term) |
| 출처 | 사용자 확정 (PHASE 03 C-8 · BP-11) |

**결정 내용**
1. Feature Catalog (정책 코드, enum 아님): `class_mode` · `weekly_report` · `monthly_report` · `semester_report` · `director_dashboard` · `parent_portal` · `bulk_print` · `content_playback` · `ai_assist` · `branding`. 상품별 배분과 확정도는 [../03-commerce/product-catalog.md](../03-commerce/product-catalog.md).
2. 교직원 기본 운영(오늘 · 이력 · 출결 · 관찰 · 리포트 조회 · 긴급 숨김)은 유효 계약이면 항상 허용되며 별도 Feature Code를 두지 않는다.
3. **콘텐츠 권한(주차 범위)은 기능 권한과 분리**한다: STARTER Week 1~8 · STANDARD 1~16 · PREMIUM 1~24 · PILOT 1~4.
4. **권한이 줄어도 기존 기록은 삭제되지 않는다.** 상품 downgrade · entitlement 축소 시 기존 기록 접근은 기본적으로 유지된다. 단 Contract 종료 이후의 실제 Staff 접근 가능 기간은 DEC-052(End / Read-only)를 따른다. **이 원칙을 영구 로그인 권리로 해석하지 않는다.**
5. **`semester_report`는 `monthly_report` Entitlement를 필수 dependency로 두지 않는다.** Semester는 Observation · Weekly · Monthly 등 허용된 Evidence Source에서 독립 생성 가능하게 한다. 정확한 source aggregation은 PHASE 04/05.
6. 사진 공유는 Entitlement가 아니라 기관 설정 + 아동별 동의로 제어한다 (DEC-059).

**결정 이유**
기능과 콘텐츠 범위를 한 코드로 묶으면 주차 확장이 기능 코드 폭증을 부른다. Semester를 Monthly에 종속시키면 Monthly가 없는 운영 형태(향후 상품 개편)에서 Semester를 만들 수 없게 된다.

**관련**: DEC-048 · DEC-052 · DEC-057

---

### DEC-056 · STARTER Director Boundary

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-9 · IA-9) |

**결정 내용**

| 구분 | 기능 |
|---|---|
| **NOT INCLUDED / UPSELL** | `/director` Dashboard · 자동 누락 탐지 · 기간 집계 · Dashboard 확장 카드 · Bulk Print |
| **STARTER에도 운영상 제공** | Director Sessions · Session History · Attendance read/edit · Observation read · Complete Report read · Parent Portal 관리 · Photo Consent 상태 · Emergency Hide · 단건 Print |

제공되는 화면에서 **Dashboard의 집계 · 누락 탐지 가치를 우회 제공하지 않는다.**

**결정 이유**
대시보드의 가치는 "놓친 것을 시스템이 먼저 알려주는 것"이다. 그러나 원장이 공유를 활성화하고(C-5) 동의를 기록하고(C-6) 사고 리포트를 숨길 수 없으면 STARTER 기관은 서비스를 운영할 수 없다.

**관련**: DEC-031 · DEC-043 · DEC-044

---

### DEC-057 · Package별 Report Entitlement (STANDARD Weekly 포함 · STARTER Weekly 전체 서식)

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-10 · C-11 · IA-15 · BP-13) + **SOURCE DOCUMENT** — 상품소개서 v4 (`TeachAble_Art_Play_유치원_상품소개서_v4.pdf` — PROJECT EXTERNAL SOURCE: source verified during PHASE 03 review · original PDF exists in Project materials · PDF is not versioned inside this Git repository): Weekly = STARTER 이상 · Monthly = STANDARD 이상 · Semester Portfolio = STANDARD 이상 · STANDARD 구성 = Weekly / Monthly Report · Semester Portfolio · Director Dashboard |
| Clarifies | **DEC-010** 결정 이유의 "STANDARD 월간·학기" 서술 |

**결정 내용**

| | Weekly | Monthly | Semester |
|---|---|---|---|
| **STARTER** | YES | NO | NO |
| **STANDARD** | **YES** | YES | YES |
| **PREMIUM** | YES | YES | YES |
| **PILOT** | YES | NO | NO |

- **STARTER Weekly는 축약판이 아니다.** DEC-024 5항목 Weekly 구조를 사용한다. 마케팅 표현 "주간 미니 리포트"가 있어도 별도 축약 데이터 모델을 만들지 않는다.
- 이 결정은 **SOURCE DOCUMENT(상품소개서 v4)와 일치**하며, 문서 · 코드 간 불일치를 정리하는 Product Decision이다. 현재 코드에서 STANDARD Weekly가 빠진 문구는 Source Conflict가 아니라 **CURRENT CODE / MARKETING DRIFT**다.

**기존 결정과의 관계**
DEC-010의 결정 본문(3계층 정의)은 그대로 유효하다. DEC-010 **결정 이유** 안의 "(STARTER 주간 / STANDARD 월간·학기 / PREMIUM 전부)"는 상품별 배분을 확정한 문장이 아니었으며, 본 결정으로 STANDARD에 Weekly가 포함됨이 명확해진다 (`ACTIVE · clarified by DEC-057`).

**Marketing Drift 정합화 대상 (코드 미수정 · 향후 작업)**
`src/data/packages.ts` 비교표 "월간 · 학기 리포트" · `src/data/program-products.ts` STANDARD 설명·SEO(주간 없음). R-2(DB ≠ Marketing → Marketing 수정)에 따라 P1-14 범위에서 수정한다.

**결정 이유**
Monthly · Semester는 Weekly와 같은 주차별 관찰 흐름 위에 있어 Weekly를 빼도 교사 작업이 거의 줄지 않는다. Weekly가 없으면 STANDARD 학부모의 Portal이 한 달 중 3주 비고, STARTER → STANDARD 업그레이드가 학부모에게는 주간 소식이 끊기는 다운그레이드가 된다. STARTER 5항목 서식은 원본 STARTER 표준화 규격 §4가 "플랫폼 서식과 동일"로 지정한 것이다.

**관련**: DEC-010 · DEC-024 · DEC-039 · DEC-055

---

### DEC-058 · HQ Sales 최소 권한

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-12 · IA-8) |

**결정 내용**

| ALLOW | DENY |
|---|---|
| Lead · Institution metadata · Contact · Product / Contract metadata (read-only) · Contract dates / status · Class count · Child count aggregate · Teacher count aggregate · Overage aggregate · Readiness summary | Child name list · Child detail · Observation · Child Voice · Growth 5 · Stage · Photo · Report · Portal token/link · Consent per child · Emergency Hide · Contract state mutation |

**결정 이유**
영업에는 규모(수치)가 필요하고 아동 신원은 필요하지 않다. 최소권한 원칙과 project-charter §3-1(영업은 아동 관찰기록·활동사진에 접근하지 않는다)을 원아 명단까지 확장한다.

**관련**: P0-15 · DEC-043

---

### DEC-059 · Photo Consent 운영 책임

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-13 · IA-6 운영 부분) |

**결정 내용** (제품 운영 책임만 정한다)

| 주체 | 책임 |
|---|---|
| Director | 아동별 Consent State를 기록한다 |
| Teacher | BEFORE에서 상태를 확인하고, 공개 가능한 사진만 Report에 선택한다 |
| HQ Admin | 운영상 필요한 Consent State 확인만 한다 |
| HQ Sales | 접근 금지 |
| Parent | Portal에 Consent State 자체를 노출하지 않는다 |
| Consent withdrawal | Product Requirement: 향후 공개 사진 노출 중단을 지원해야 한다 |

동의의 법적 단위 · 촬영/공유 분리 · 동의 문구 · 단체 사진 · 개인정보처리방침에 대해서는 **법적 결론을 내리지 않는다** (03-commerce CO-9 · CO-10).

**관련**: DEC-014 · DEC-036 · DEC-058

---

### DEC-060 · Parent Portal: 결석 · 미공개 주차 표시 규칙

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-14 · IA-11) |
| Clarifies | DEC-042 "이번 주" 탭의 빈 상태 동작 |

**결정 내용**
- 결석한 주차를 Portal에서 **"결석"이라는 성장기록으로 표시하지 않는다.**
- 학부모에게 **결석 · 교사 미작성 · 미공개 사유를 구분해서 노출하지 않는다.**
- 이번 주에 공개된 Report가 없을 때 **이전 Report를 "이번 주 Report"처럼 보여주지 않는다.** 화면은 "현재 새로 공유된 기록이 없습니다."를 표시하고, 필요 시 "최근 공유 기록 · Week N · 실제 날짜"를 별도로 보여준다.
- 모든 리포트 표시에 **실제 week와 date를 항상 표시**한다.
- "이번 주"의 정확한 판정 기준은 PHASE 05/06.

**기존 서술과의 관계**
[../02-ia/report-portal-flow.md](../02-ia/report-portal-flow.md) §3 · §4-2의 "이번 주 = 가장 최근 노출 Weekly", "직전 노출 리포트 또는 빈 상태" 서술은 본 결정이 우선한다 (02-ia/open-items §7 정합화 대기).

**결정 이유**
"결석"이 성장 기록 화면에 나오면 결핍 신호로 읽힌다. 사유를 구분하면 교사 미작성이라는 운영 누락이 학부모에게 드러난다. 반대로 지난 기록을 "이번 주"로 보여주면 학부모가 오래된 내용을 새 소식으로 오해한다.

**관련**: DEC-042 · DEC-043 · DEC-044

---

### DEC-061 · Commerce Flow · Signup · Payment Boundary

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-15) |

**결정 내용**
- P0 · P1에 **Public self-signup 없음.** 상담 우선 (Lead → 상담 → Demo → 견적 → 계약 → Contract Record → Activation → Entitlement → Onboarding).
- "구매하기" = `purchase_interest` Lead. 즉시 결제로 가지 않는다.
- **P0: Payment 구현 없음.** P1: Payment Adapter + manual payment status 후보. P2: PG 후보. **특정 PG는 선택하지 않는다.**
- Commercial Contract · Service Entitlement · Payment Status를 분리한다.

**관련**: DEC-017 · DEC-050

---

### DEC-062 · Contract Deliverable과 Branding

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 03 C-16 · BP-12 일부) |

**결정 내용**
- PREMIUM의 **현판 · 상담자료 팩은 Contract Deliverable**이며 시스템 Entitlement가 아니다.
- PREMIUM "원 브랜딩"의 정확한 시스템 기능은 SOURCE가 없다. **P0 · P1 시스템 Branding 없음.** P2 Open (03-commerce CO-8).

**관련**: DEC-055

---

### DEC-063 · Commercial Activation Readiness Gate

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` · clarified by DEC-069 (STARTER "8주 요약" = Summary View · 활성화 전 Ready 필요) · DEC-070 (STANDARD · PREMIUM AI capability Ready 필요) |
| 출처 | 사용자 확정 (PHASE 03 C-17) |

**결정 내용**
Product가 Catalog에 존재하거나 공개 사이트에 소개되어 있는 것과, 실제 기관에 **Service Contract를 활성화할 수 있는 것**을 구분한다.

**Product Version이 계약상 INCLUDED라고 약속하는 모든 것** — Content · Report capability · Feature · Entitlement dependency — 은 Production Service Activation 전에 **모두 Service Ready**여야 한다.
- published curriculum (필수 수업 데이터 · DEC-037 기준)
- 약속한 week range 전체 (STARTER 1~8 · STANDARD 1~16 · PREMIUM 1~24)
- 약속한 report capability 전체 (예: STANDARD = Weekly · Monthly · Semester)
- 약속한 feature · entitlement dependency 전체 (예: STANDARD · PREMIUM = Director Dashboard)

**"학기 후반에 필요하니 지금 없어도 된다"는 자동 예외는 없다.** STANDARD Product Version이 Weekly · Monthly · Semester · Director Dashboard · Week 1~16을 INCLUDED로 약속하면, 전부 Production Ready가 되기 전에는 STANDARD Production Activation이 불가하다. PREMIUM도 동일하다. STARTER Product Version이 "8주 요약"을 구성으로 약속한다면, CO-4가 해결되어 그 산출물이 정의되기 전까지 해당 Version의 Readiness에 영향을 준다. Pilot은 기존 P0 Ready 조건(DEC-037 · DEC-051 · DEC-054)을 유지한다.

일부 기능을 나중에 제공하는 상품을 판매하려는 경우 **기존 Product Version을 불완전한 상태로 활성화하지 않는다.** 향후 별도 결정으로 (a) 별도 Product Version 또는 (b) 명시적으로 축소된 계약 Offer를 정의해야 한다.

준비되지 않은 상품은 marketing · consultation · quote는 가능할 수 있으나 **production service activation은 차단**한다. 정확한 Readiness **계산 방식**은 PHASE 05에서 정하되, 위 "약속한 것 전체" 원칙은 바꾸지 않는다.

현재 STANDARD · PREMIUM의 판정 근거: Week 9~16 · 17~24 **원본 자료는 Project External Source로 존재**하나(9~16 MIXED · 17~24 DRAFT/PROPOSAL), repo 내 **Production-approved operational content로 승격 · 정규화되지 않았다** (BC-1 · BC-2). 또한 Monthly(P1) · Semester(P2)가 아직 없다. 판매 고지 정합성(BP-14)은 이 Gate와 연결된다.

*(2026-09-27 PHASE 03 검토 반영: "후반 기능" 처리를 명확화하고 CO-13을 이 결정으로 해소. Week 9~24 근거 표현을 정정.)*

**결정 이유**
콘텐츠가 없는 16주·24주 상품의 계약을 시스템에서 활성화하면 교사는 9주차부터 빈 화면을 만나고, 계약 이행 불능이 운영 중에 드러난다. 판매 활동과 서비스 개시를 분리하면 영업은 계속하되 이행 불가능한 활성화를 막을 수 있다. DEC-037(Pilot 필수 데이터 게이트)을 정규 상품 활성화 단위로 확장한 것이다.

**관련**: DEC-037 · DEC-050 · BC-1 · BC-2 · BP-14

---

## 12. AI Growth · Report (PHASE 04)

> PHASE 04 검토·승인(2026-09-27)에서 확정된 결정. 상세는 [../04-ai-report/](../04-ai-report/). 상태 값 · 필드 이름은 제품 개념이며 DB 구조는 PHASE 05에서 정한다.

### DEC-064 · Evidence 모델과 사실 우선순위

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-1 · A-3 · A-20) |

**결정 내용**
1. **FACT / EVIDENCE PRIORITY**: **Teacher Evidence > Structured Curriculum Context > AI Draft.** AI Draft는 사실의 원천이 아니다.
2. **Teacher Final은 upstream Evidence가 아니다.** 교사가 검토 · 확정한 리포트의 최종 출력이다. 흐름은 `Teacher Evidence → (optional) AI Draft → Teacher Review/Edit → Teacher Final`.
3. Monthly · Semester는 완료된 Weekly의 Teacher Final을 **secondary source**로 쓸 수 있으나, underlying Evidence를 **canonical source**로 함께 유지한다.
4. **Child Quote는 원 Evidence의 verbatim text가 항상 우선**한다. AI도 Teacher Final도 인용 원문을 바꾸지 않는다.
5. Curriculum은 **맥락(context)**이며 아이에 대한 사실이 아니다. **Goal ≠ Observed Outcome.**
6. **Quick Memo는 Report Evidence가 아니다.** Observation 자동 전환 · Report 유입 · AI 입력을 모두 금지한다. 교사가 직접 옮긴 경우에만 Teacher Observation Note가 된다 (P0 수동 복사 · P1 "관찰로 옮기기" 후보).
7. **사진은 Display Asset이며 AI Evidence가 아니다.** AI 입력 금지 · 사진 없이도 리포트 완료 가능 · 동의 가능한 사진만 학부모에게 표시.

**결정 이유**
리포트의 모든 문장은 "교사가 그 자리에서 본 것"으로 설명될 수 있어야 한다. 교사의 최종 문장까지 원천으로 올리면 AI가 다듬은 문장이 다음 기간의 사실로 재사용되는 순환이 생긴다.

**관련**: DEC-009 · DEC-014 · DEC-035 · Invariant AI-10 · [../04-ai-report/evidence-growth-model.md](../04-ai-report/evidence-growth-model.md)

---

### DEC-065 · Growth 5 · Stage 의미와 추세 규칙

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-2) |

**결정 내용**
- 공식 Growth 5: 표현 다양성 · 형태·공간 구성 · 창의적 시도 · 활동 참여·몰입 · 자기 설명·소통. 지표별 의미 · 기록 기준 · 기록 금지 항목은 [../04-ai-report/evidence-growth-model.md §3](../04-ai-report/evidence-growth-model.md).
- Stage: 기록 없음 · 함께 · 보고 나서 · 스스로 — **이 활동의 이 지표에서 관찰된 참여·지원 방식**이다. 점수 · 발달단계 · Quality가 아니다.
- **0/1/2 변환 · 평균 · 합계 · 백분율 · 반 평균 · 순위를 어떤 계층에서도 만들지 않는다.**
- 추세는 **같은 아이의 시간순 사례**만 본다. "스스로가 늘었으므로 발달했다" 같은 인과 · 발달 판정은 금지한다.
- DEC-007 · DEC-008 · DEC-038을 유지하며 대체하지 않는다.

**관련**: DEC-005 · DEC-007 · DEC-008 · DEC-038

---

### DEC-066 · Weekly Report 구조와 완료 조건

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-4 · AR-3) |

**결정 내용**
- 식별자: **Child × Program Assignment × Week.**
- P0 **Generative AI 없음.** System + Teacher 입력으로 **deterministic assemble**.

| 섹션 | 출처 | 방식 |
|---|---|---|
| 1 이번 주 활동 주제 | Published Curriculum Context | AUTO |
| 2 아이의 실제 말과 선택 | Child Quote 또는 Teacher Evidence에 기록된 구체적 선택 | TEACHER SELECT |
| 3 교사 관찰 기록 | Teacher Observation 기반 Teacher Final sentence | TEACHER WRITE (prefill → 확인·수정) |
| 4 작품 · 활동 장면 | consent-eligible selected media | AUTO + TEACHER SELECT |
| 5 가정연계 대화 제안 | curriculum family connection | AUTO |
| + 다음 주 예고 | next published curriculum | SYSTEM ASSEMBLE |

| 완료 조건 | 항목 |
|---|---|
| **HARD REQUIRED** | child · program assignment · week · 완료된 관찰 1건 이상 · activity topic · **teacher final observation sentence** · family connection source |
| **RECOMMENDED** | child quote 또는 구체적 선택 · Growth 5 selection |
| **OPTIONAL** | photo · next week preview |

- Quote · 사진 · Growth 5가 없어도 차단하지 않는다.
- "아이의 말과 선택"에 실제 근거가 없으면 **AI나 시스템이 내용을 만들어 넣지 않는다.** 빈 사실을 채우는 placeholder narrative도 만들지 않는다.
- 교사 관찰 문장은 선택한 Teacher Observation Note로 **prefill할 수 있고**, 교사가 Complete 전에 확인 · 수정한다. **별도 승인 체크박스 없음 — Complete 행위 자체가 Teacher Final 확인이다** (AR-3 해소).

**관련**: DEC-024 · DEC-039 · DEC-064

---

### DEC-067 · Monthly = Program 4-Week Block

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-5) + SOURCE DOCUMENT 상품소개서 v4 ("월간 요약 리포트 · 월 1회 · STANDARD 이상" — PROJECT EXTERNAL SOURCE, verified during PHASE 04 review) |

**결정 내용**
- Monthly의 SaaS 내부 기간은 **Calendar Month가 아니라 Program Month**다: Block 1 = Week 1~4 · Block 2 = 5~8 · Block 3 = 9~12 · Block 4 = 13~16 · Block 5 = 17~20 · Block 6 = 21~24.
- 식별자: **Child × Program Assignment × Program Month Index.**
- 원천: underlying Evidence(canonical) + 완료된 Weekly Teacher Final(secondary) + Curriculum Context. Weekly 문자열만 AI가 재요약하는 구조는 금지.
- 서비스 내부 의미를 **"월간 요약 리포트 = 4주 단위"**로 명확히 한다. 향후 Marketing · UI 문구도 "월간 요약 리포트 · 4주 단위"처럼 오해 없게 맞춘다.
- CO-11(계약의 달력 기간)은 별도 Open으로 유지한다. **리포트 기간 쪽 의존만 해소**한다.

**결정 이유**
Weekly 식별자가 주차 기반이므로 달력 월을 쓰면 주차가 월 경계에서 쪼개지고 휴원 달은 빈 리포트가 된다. 상품 가격 근거도 4주 = 1개월이다.

**관련**: DEC-010 · DEC-011 · DEC-057 · CO-11

---

### DEC-068 · Semester = Child × Program Assignment × Reporting Term

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-6) |

**결정 내용**
- 식별자: **Child × Program Assignment × Reporting Term.** Assignment 하나로 고정하지 않는다.
- STANDARD 16주는 기본적으로 하나의 Reporting Term이 될 수 있다. PREMIUM 24주가 1회인지 별도 학기 경계가 있는지는 **P2 제품 설정**으로 확정한다 (AR-2).
- Architecture는 **처음부터 flexible reporting period**를 지원한다.
- Semester는 Monthly Entitlement에 의존하지 않고 Observation · Weekly · Monthly · Child Quote · Growth 5 · Teacher Final 등 허용된 Source를 독립적으로 사용한다 (DEC-055).
- Semester Portfolio는 **아이의 활동 · 표현 기록 모음**이며 발달 평가서 · 진단서 · 성적표가 아니다.

**관련**: DEC-015 · DEC-055 · DEC-065

---

### DEC-069 · STARTER "8주 요약" = Program Completion Summary View

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-21 · CO-4) + SOURCE DOCUMENT 상품소개서 v4 (STARTER "주간 미니 리포트 + 8주 요약" — PROJECT EXTERNAL SOURCE) |

**결정 내용**
"8주 요약" = **8주 동안 완료된 Weekly Report를 시스템이 규칙적으로 모아서 보여주는 Program Completion Summary View.**

| 이다 | 아니다 |
|---|---|
| 8주 Timeline · Week 번호 · 실제 날짜 · Weekly 제목 · Weekly에서 이미 선택된 아이의 말/선택 · 이미 선택된 대표 사진(있으면) · 각 Weekly 링크 | **새 report_type** · Monthly · Semester-lite · AI Report |
| 기존 Weekly Snapshot에서만 deterministic하게 생성 | 새 성장 판정 · 새 AI Narrative · 새 Teacher Complete · 새 Revision |

- UI 명칭 후보 "8주 기록 요약" / "8주 기록 모아보기" — Copy는 PHASE 06.
- STARTER Product Version이 이를 계약상 약속하므로 **DEC-063에 따라 Regular STARTER Production Activation 전에 Service Ready**여야 한다 (기존 "P1" 표현 대신 이 기준을 쓴다).

**관련**: DEC-057 · DEC-063 · DEC-066

---

### DEC-070 · AI Product Capability와 `ai_assist` 배분 (CO-5)

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-7 · CO-5) + SOURCE DOCUMENT 상품소개서 v4 (STANDARD "AI 성장기록 플랫폼 Full" · PREMIUM "STANDARD 모든 구성 포함" · STARTER 구성에 AI 항목 명시 없음 — PROJECT EXTERNAL SOURCE, verified during PHASE 04 review) |

**결정 내용**
- Feature Code는 **`ai_assist` 하나**를 유지한다. `ai_observation` · `ai_monthly` · `ai_writing` 같은 판매 Entitlement Code를 만들지 않는다.

| Capability | 의미 |
|---|---|
| **C1 Observation Cleanup** | 관찰 1건의 문장 정리 초안 |
| **C2 Period Narrative Draft** | Monthly · Semester 섹션 초안 |
| **C3 Writing Assist** | 교사가 쓴 문장의 가독성 보조 |

| 상품 | `ai_assist` | 근거 |
|---|---|---|
| STARTER | **EXCLUDED** | PHASE 04 Product Decision (Source는 AI 항목을 명시하지 않음) |
| STANDARD | **INCLUDED** — "AI Growth Platform Full" = C1 + C2 + C3 | SOURCE(v4) + Decision |
| PREMIUM | **INCLUDED** | SOURCE(v4) "STANDARD 모든 구성 포함" |
| PILOT | **특수 Entitlement: C1 Observation Cleanup만** | Decision |

- 실제 사용 가능 여부 = **`ai_assist` ∧ 해당 Report Entitlement ∧ 해당 기능 Service Ready.** 예: C2 Monthly Draft는 `monthly_report`가 없는 상품에서 쓸 수 없다.
- STARTER에 향후 AI를 추가하려면 현재 Product Version을 조용히 바꾸지 않고 **새 Product Version · Decision**으로 처리한다.
- **DEC-063 유지**: STANDARD · PREMIUM이 AI를 계약상 약속하므로 해당 AI capability도 Product Activation 전에 필요한 수준으로 Ready여야 한다. "AI optional"은 교사가 쓰지 않아도 된다는 뜻이지, 약속한 기능이 없어도 된다는 뜻이 아니다.
- DEC-039의 Weekly P1 문장 다듬기는 C3이며 `ai_assist` 포함 상품에서만 쓸 수 있다.

**관련**: DEC-009 · DEC-039 · DEC-054 · DEC-055 · DEC-063

---

### DEC-071 · AI Independence · Input 최소화 · No-Invention · 검증

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-8 · A-9 · A-10 · A-19) |

**결정 내용**
1. **AI 없이 전 경로 완주 필수**: `Evidence → Teacher Writing → Teacher Final → Complete → Visible when eligible`. AI Draft가 없어도 Report create · Complete · Parent visibility가 가능해야 한다.
2. 현재 코드의 **GR003 · `ai_draft_id NOT NULL` · `reviewed_text_snapshot NOT NULL` · accepted draft 조건은 P0 제거 대상**이다.
3. AI 호출은 **server-only**. 호출 전 auth · role · tenant · assigned class · child scope · entitlement를 서버에서 재검증한다.
4. AI Input Allowlist / Denylist를 따른다 ([../04-ai-report/ai-architecture.md §4](../04-ai-report/ai-architecture.md)). 이름 · 식별자는 가능하면 placeholder. 사진 · 얼굴 · consent · guardian · roster · token 입력 금지.
5. **자유 텍스트 속 개인정보 최소화(AR-8)는 EXTERNAL P0 AI USE 이전 요구사항**이다. 해결 전에는 Pilot을 **AI OFF**로 운영할 수 있어야 한다. 법무 판단(CO-10)과 구분한다.
6. **No-Invention Contract**: Evidence 안에서만 작성 · Quote 원문 유지 · Goal ≠ Observed Outcome · 일반화 금지 · 없는 사실 생성 금지 · insufficient evidence 명시 · sourceRefs · rule-based validation 우선 · **자동 공개 금지** · AI Judge 필수 아님.
7. Monthly · Semester Evidence 부족 시 AI는 빈 기간을 채우지 않는다. 근거가 있는 섹션만 생성하고 부족한 섹션은 비운다. Evidence coverage 숫자는 **Teacher operational UI에만** 표시한다 (Parent 금지 · Director Dashboard에서 평가 수치처럼 노출 금지). 최소 기준 숫자는 AR-1.

**관련**: DEC-009 · DEC-027 · DEC-064 · P0-8

---

### DEC-072 · AI Provenance · Retry · Prompt/Model/Template Versioning

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` · clarified by DEC-078 (raw provider payload 미저장 · 저장 대상 명확화) |
| 출처 | 사용자 확정 (PHASE 04 A-11 · A-17) |

**결정 내용**
- AI generation provenance 개념: provider · model · promptTemplateId · promptVersion · outputSchemaVersion · reportType · period · requestedBy · generatedAt · inputEvidenceRefs · validationStatus · attemptNo.
- Retry는 **새 generation attempt**다. 기본 자동 retry 없음.
- Prompt · model · Growth 5 문구 · Report Template이 바뀌어도 **Complete된 Revision을 소급 재생성 · 자동 변경하지 않는다.** 새 Revision에만 새 규칙이 적용된다.
- **Report Template Version ≠ Product Version.** Revision마다 Template Version을 추적 가능하게 한다.
- 특정 모델 이름 · 모델 파라미터는 Product Decision으로 고정하지 않는다.

**관련**: Invariant AI-13 · DEC-071

---

### DEC-073 · Report Revision · Snapshot · 정정 (PH3-3)

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-12 · A-13 · A-14 · PH3-3) |

**결정 내용**
- Logical Report(유형 × 아동 × 배정 × 기간) : Revision = 1 : N.
- 개념적으로 **working_revision**과 **latest_completed_revision**을 구분한다 (이름은 PHASE 05).
  - v1 complete → latest_completed = v1
  - v2 draft 생성 → working = v2, latest_completed는 여전히 v1
  - v2 complete → latest_completed = v2, working 종료
- **Completed Report 직접 수정 금지 · complete → draft rollback 금지.** 정정은 **새 Revision**이며 **정정 사유 필수**. P0는 minor/major를 나누지 않는다.
- visible v1 + draft v2 상태에서 **학부모는 계속 v1을 본다.**
- Complete Revision마다 **Evidence Snapshot**과 **Final Content Snapshot**(Teacher Final text · curriculum context snapshot · selected child quote · media references · template version 등)을 **둘 다** 보존한다.
- **Immutable content snapshot ≠ 영구 photo visibility.** 사진 참조가 스냅샷에 있어도 학부모 노출은 현재 consent · privacy 정책으로 동적으로 차단될 수 있다. Consent withdrawal 때문에 과거 스냅샷을 삭제 · 재작성하는 구조를 기본값으로 두지 않는다 (법적 삭제 · 보존은 CO-2 · CO-9 · CO-10).
- 완료된 적 없는 draft만 삭제할 수 있다. 완료 Revision은 hard delete하지 않는다 (파기는 CO-2).

**관련**: DEC-043 · Invariant AI-11 · DEC-074

---

### DEC-074 · Report State Axes · Emergency Hide/Unhide · Computed Visibility

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-13 · A-14) |

**결정 내용**

| 축 | 값 |
|---|---|
| REPORT TYPE | weekly · monthly · semester · legacy_period |
| CONTENT REVISION | draft · complete |
| HIDE (Logical Report 단위) | visible · hidden |
| AI GENERATION (attempt 단위) | requested · generated · failed · rejected + applied 여부 |
| PARENT VISIBILITY | **계산값** — 별도 "published" 상태를 저장하지 않는다 |

**Parent visibility = latest_completed_revision 존재 ∧ report not hidden ∧ Child Portal active ∧ Portal/Contract access policy 허용.**

- Teacher Complete = Publish Eligible. Director 사전승인 · 별도 publish 조치 없음 (DEC-030 · DEC-040).
- 잘못된 사진 · privacy · 중대한 사실 오류는 **먼저 Emergency Hide**. Hide 단위 = **Logical Report.**
- **hide · unhide는 Director · Authorized HQ(admin)만** 가능하며 사유 · actor · timestamp · audit 필수. Teacher는 Correction Revision을 작성한다.
- **Hidden 중 v2가 complete돼도 자동 unhide하지 않는다.** Director · HQ가 사유와 함께 unhide해야 한다.
- CO-1 · CO-12(계약 종료 · Portal 기간)는 별도 Open 유지.

**관련**: DEC-030 · DEC-040 · DEC-043 · DEC-052 · DEC-073

---

### DEC-075 · Parent · Director용 Growth 5 표현과 Revision 표시

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-15 · IA-13 · AR-9 · AR-6 · AR-7) |

**결정 내용**
- **Parent Weekly**: 지표명 + 구체적 Evidence 중심 서술. **Stage chip · raw label을 표시하지 않는다.** 고정 안내 문구(취지: "Growth 5는 아이의 능력이나 발달 단계를 평가하는 점수가 아니라 활동에서 관찰된 참여·표현 방식을 기록한 것입니다")를 둔다.
- **Parent Monthly · Semester**: raw Stage를 표 · chip으로 보여주지 않는다. 사례 중심 narrative만.
- **Director (P0 · P1)**: Growth 5 평균 · Stage 분포 · 점수 · 순위 · 그래프 없음. 기록 있음/없음 · 개별 기록 읽기만.
- **AI Stage 추천(구 AR-6)**과 **Director Stage 분포(구 AR-7)**는 **BASE PRODUCT에서 제외**(DEFERRED / NOT PLANNED BY DEFAULT). 도입하려면 새 Product Decision이 필요하다.
- **Parent에게 이전 Revision history를 보여주지 않는다.** 현재 표시 Revision이 revision > 1이면 **"업데이트됨 YYYY.MM.DD"** 표시 (AR-9 해소).
- 정확한 한국어 Copy · 위치는 PHASE 06.

**관련**: DEC-008 · DEC-038 · DEC-056 · DEC-065 · PH3-1

---

### DEC-076 · Legacy Observation · Legacy Report

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-16 · AR-4) |

**결정 내용**
- Legacy Observation(구 5영역 태그 포함)은 **그대로 보존**한다. 공식 Growth 5는 새 기록부터 사용한다.
- **구 5영역 → Growth 5 자동 매핑 금지 · AI 자동 변환 금지.**
- Legacy Report는 `legacy_period` · **read-only** · 자동 변환 없음.
- Legacy share는 DEC-041을 유지한다.
- **Legacy Report를 신규 Child Portal에 자동 편입하지 않는다** (AR-4 해소). 기존 Legacy Share Link로만 Cutover 정책에 따라 유지한다. 향후 통합이 필요하면 새 Decision.

**관련**: DEC-006 · DEC-011 · DEC-041

---

### DEC-077 · Multi-teacher Authorship · Concurrency

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 A-18) |

**결정 내용**
- 리포트 접근 · 편집 권한은 해당 **Class Assignment에 연결된 Teacher**가 가진다. Logical Report identity는 Child / Assignment / Period 기준이다.
- Authorship 추적: Observation author · Revision creator · Last editor · Completer.
- 같은 반 담당 Teacher는 다른 담당 Teacher의 Evidence를 사용할 수 있다.
- **낙관적 동시성 유지 · last-write-wins 금지** (Invariant AI-6).

**관련**: Invariant AI-6 · AI-7 · DEC-073

---

### DEC-078 · AI Raw Payload Retention and Generation Record Policy

| | |
|---|---|
| 결정일 | 2026-09-27 |
| 상태 | `ACTIVE` |
| 출처 | 사용자 확정 (PHASE 04 최종 검토 · PH3-5) |
| Clarifies | DEC-072 (provenance는 유지하고, **저장하지 않는 것**을 명확히 한다) |

**결정 내용**
Production Application은 AI Provider의 **원본 Request Body와 원본 Response Body / Envelope를 영구 저장하지 않는다.**

| NOT PERSISTED | PERSISTED (가능 / 필수) |
|---|---|
| raw provider request body | **validated structured AI draft** |
| raw provider response body | input Evidence references · sourceRefs |
| raw provider response envelope | provider · model · promptTemplateId · promptVersion · outputSchemaVersion |
| complete prompt text copy | reportType / capability · requestedBy · requestedAt / generatedAt |
| raw child evidence text의 별도 AI 로그 복제 | validationStatus · generation attempt number · application status |
| failed / rejected raw model output | provider response_id / request id (있으면) · token / usage metadata (있으면) |
| | sanitized error category / code · retry relation |

- **RAW AI RESPONSE ≠ VALIDATED STRUCTURED AI DRAFT.** Validated structured draft는 교사가 검토하기 위한 Application Data이므로 저장할 수 있다. Raw provider payload 전체는 장기 저장하지 않는다.
- **Teacher Final은 AI Structured Draft와 별개**다 (DEC-064 · DEC-073).
- **Failure / Rejection** (timeout · provider failure · schema invalid · safety rejection · source ref invalid · quote mismatch · validation failure)에도 raw response body를 DB나 일반 로그에 저장하지 않는다. 저장은 attempt · provider/model · time · sanitized error code/category · validation result · (안전하고 가능한 경우) request/response id만. Teacher는 항상 manual path로 계속 작업한다 (DEC-071).
- **Logging**: Production log에 API key · full prompt · child quote body · teacher note body · AI raw output · parent data · Portal token을 남기지 않는다. 필요한 경우 opaque ids · event ids · error category · duration · status만 사용한다.
- **Future Diagnostic Mode**: 향후 AI Provider 장애 분석을 위해 raw payload 보존이 필요해지면 **이 결정을 조용히 바꾸지 않고 별도 Security / Privacy Decision**을 만든다. 그 결정은 최소 explicit enablement · restricted authorized access · encryption · short retention · deletion · audit · production child data handling · legal/privacy review를 정의해야 한다. **기본 제품에는 raw retention을 넣지 않는다.**

**결정 이유**
원본 요청 · 응답에는 교사 노트와 아이의 말이 그대로 들어 있어, 저장하면 아동 관련 문장이 리포트 외부에 한 벌 더 보관된다. 감사와 재현에 필요한 것은 "어떤 근거로 어떤 규칙에서 무엇이 나왔는가"이며, 이는 Evidence refs · provenance · validated draft로 충분하다 (Invariant AI-10 ~ AI-13 유지).

**관련**: DEC-071 · DEC-072 · DEC-073 · Invariant AI-10 ~ AI-13 · PH3-5

---

## 13. 결정 요약표

| ID | 영역 | 결정 | 상태 | 출처 |
|---|---|---|---|---|
| DEC-001 | 커리큘럼 | 24주 플랫폼화 + 거버넌스 5단계 | ACTIVE | 사용자 |
| DEC-002 | 콘텐츠 | 플랫폼 안에서 콘텐츠 제공 | ACTIVE | 사용자 |
| DEC-003 | 콘텐츠 | Teacher Guide를 수업 화면에서 제공 | ACTIVE | 사용자 |
| DEC-004 | 수업 | Class Mode 신규 개발 | ACTIVE | 사용자 |
| DEC-005 | 관찰 | SOYE Growth 5를 유일한 지표로 | ACTIVE | 사용자 |
| DEC-006 | 관찰 | 구 미술 5영역 inactive/historical | ACTIVE | 사용자 |
| DEC-007 | 관찰 | Observation Stage는 교사 직접 선택 | ACTIVE | 사용자 |
| DEC-008 | 관찰 | Stage는 평가가 아니라 참여/지원 방식 | ACTIVE | 사용자 |
| DEC-009 | AI | AI는 optional assistant | ACTIVE | 사용자 |
| DEC-010 | 리포트 | 리포트 3계층 정의 | ACTIVE | 사용자 |
| DEC-011 | 리포트 | 기존 3블록 재사용 | ACTIVE | 사용자 |
| DEC-012 | 관찰 | 워크북 정량 MVP 제외 | ACTIVE | 사용자 |
| DEC-013 | 학부모 | parent role 미추가 · Child Secure Portal | ACTIVE | 사용자 |
| DEC-014 | 학부모 | 사진 제공 순서 고정 | ACTIVE | 사용자 |
| DEC-015 | 리포트 | Semester Portfolio는 누적 산출물 | ACTIVE | 사용자 |
| DEC-016 | 상품 | Product/Contract/Entitlement DB 표현 | ACTIVE | 사용자 |
| DEC-017 | 상품 | B2B/B2G 우선 · Payment Adapter · PG 미확정 | ACTIVE | 사용자 |
| DEC-018 | 상품 | 초과요금 데이터 관리, 자동청구 미구현 | ACTIVE | 사용자 |
| DEC-019 | 데이터 | 누리과정을 실제 Curriculum 데이터로 | ACTIVE | 사용자 + SOURCE |
| DEC-020 | 데이터 | Single Source of Truth = DATABASE | ACTIVE | 사용자 |
| DEC-021 | 품질 | DB/RLS 변경 전 회귀테스트 구축 | ACTIVE | 사용자 |
| DEC-022 | 품질 | AUDIT 2 보존 자산을 Invariants로 고정 | ACTIVE | 사용자 + AUDIT 2 |
| DEC-023 | 커리큘럼 | 50분 6단계 골격 채택 | ACTIVE | SOURCE |
| DEC-024 | 리포트 | Weekly 5항목 서식 | ACTIVE | SOURCE |
| DEC-025 | 관찰 | 주차별 관찰영역 = ObservationFocus | ACTIVE | SOURCE |
| DEC-026 | 커리큘럼 | 성장키워드 8개 = Week 주제 | ACTIVE | SOURCE |
| DEC-027 | AI | 금지 표현을 AI 지침·문구 검수 기준으로 | ACTIVE | SOURCE |
| DEC-028 | 커리큘럼 | 15섹션 = Curriculum 모델 사양서 | ACTIVE | SOURCE |
| **DEC-029** | 수업 | **Class Mode P0 인앱 재생 제외** | ACTIVE | 사용자 (O-1) |
| **DEC-030** | 리포트 | **Weekly 원장 사전승인 불필요** | ACTIVE | 사용자 (O-2) |
| **DEC-031** | 상품 | **STARTER 대시보드 미포함 시스템 강제 · Pilot 별도 entitlement** | ACTIVE | 사용자 (O-3) |
| **DEC-032** | Pilot | **Pilot 범위 확정 (1~2기관/4주/Week 1~4/Weekly)** | ACTIVE | 사용자 (O-4) |
| DEC-033 | IA | 기존 URL 유지 · Class Mode 경로 구조 · AFTER 재사용 | ACTIVE | 사용자 (PHASE 02) |
| DEC-034 | IA | Session / Observation / Report "완료" 의미 분리 | ACTIVE | 사용자 (PHASE 02) |
| DEC-035 | 수업 | Quick Memo P0 교사 전용 서버 임시저장 | ACTIVE | 사용자 (IA-1) |
| DEC-036 | 수업 | BEFORE 필수 안전·개인정보 확인 서버 보존 · 수업 시작 조건 | ACTIVE | 사용자 (IA-2) |
| DEC-037 | 커리큘럼 | Pilot 필수 커리큘럼 데이터 게이트 | ACTIVE | 사용자 (PHASE 02) |
| DEC-038 | 관찰 | Stage 4-state 개념 / 3개 명시 선택 UX | ACTIVE | 사용자 (PHASE 02) |
| DEC-039 | 리포트 | Weekly = Child × Week · 일괄 조립 · P0 AI 없음 | ACTIVE | 사용자 (PHASE 02) |
| DEC-040 | 학부모 | Child Portal 신규 route · 아동 단위 공유 활성 | ACTIVE | 사용자 (IA-5) |
| DEC-041 | 학부모 | Legacy report share Production Cutover 정책 | ACTIVE | 사용자 (IA-14) |
| DEC-042 | 학부모 | Portal P0 Navigation = 이번 주 / 지난 기록 | ACTIVE | 사용자 (IA-4) |
| DEC-043 | 리포트 | Report Emergency Hide P0 | ACTIVE | 사용자 (IA-7) |
| DEC-044 | 권한 | 404 / Not Entitled / 학부모 무구분 접근 실패 UX | ACTIVE | 사용자 (PHASE 02) |
| DEC-045 | 상품 | P0 상품·계약 운영은 기관 상세 내부 · 관리 UI P1 | ACTIVE | 사용자 (PHASE 02) |
| DEC-046 | 수업 | Class Mode 적용 세션의 수업 시작 = BEFORE 필수 확인 통과 Teacher 경로로 단일화 | ACTIVE | 사용자 (IA-18) |
| DEC-047 | 수업 | Class Mode 적용 세션의 `scheduled → completed` 직접 전환 금지 · 정상 흐름 단일화 | ACTIVE | 사용자 (IA-19) |
| DEC-048 | 상품 | Product / Version / Contract / Entitlement 계층 · Entitlement는 파생 | ACTIVE | 사용자 (C-1) |
| DEC-049 | 계약 | Contract Unit · ONE EFFECTIVE CONTRACT AT A TIME | ACTIVE | 사용자 (C-2 · BP-8) |
| DEC-050 | 계약 | Contract State · 날짜 파생 상태 · 활성화 = HQ 확인 ∧ 시작일 | ACTIVE | 사용자 (C-3) |
| DEC-051 | 계약 | 서비스 반 수 HARD · 초과 원아 허용 + 기록 · Pilot 15명 | ACTIVE | 사용자 (C-4 · IA-12) |
| DEC-052 | 계약 | Suspended / Ended 접근 모델 · 기관 정지 우선 · 기간 미확정 | ACTIVE | 사용자 (C-5 · IA-10) |
| DEC-053 | 계약 | Upgrade · Renewal = 후속 계약 · Downgrade는 갱신 시점만 | ACTIVE | 사용자 (C-6 · BP-9) |
| DEC-054 | Pilot | Pilot = 별도 Offer · 전환 시 전체 데이터 유지 | ACTIVE | 사용자 (C-7) |
| DEC-055 | 권한 | Feature Catalog · Content 범위 분리 · 기록 보존 · Semester 독립 | ACTIVE | 사용자 (C-8 · BP-11) |
| DEC-056 | 권한 | STARTER Director Boundary | ACTIVE | 사용자 (C-9 · IA-9) |
| DEC-057 | 리포트 | Package별 Report Entitlement · STANDARD Weekly 포함 (clarifies DEC-010) | ACTIVE | 사용자 (C-10 · C-11) |
| DEC-058 | 권한 | HQ Sales 최소 권한 | ACTIVE | 사용자 (C-12 · IA-8) |
| DEC-059 | 학부모 | Photo Consent 운영 책임 | ACTIVE | 사용자 (C-13 · IA-6) |
| DEC-060 | 학부모 | Portal 결석 · 미공개 주차 표시 규칙 (clarifies DEC-042) | ACTIVE | 사용자 (C-14 · IA-11) |
| DEC-061 | 상품 | 상담 우선 · Self-signup 없음 · P0 결제 없음 | ACTIVE | 사용자 (C-15) |
| DEC-062 | 상품 | 현판 · 상담자료 팩 = Contract Deliverable · 시스템 Branding P2 | ACTIVE | 사용자 (C-16) |
| DEC-063 | 상품 | Commercial Activation Readiness Gate · 약속한 것 전체 Ready · 후반 기능 예외 없음 | ACTIVE | 사용자 (C-17) |

| DEC-064 | AI · 리포트 | Evidence 모델 · 사실 우선순위 (Teacher Final은 upstream 아님) · Quick Memo · 사진 경계 | ACTIVE | 사용자 (A-1 · A-3 · A-20) |
| DEC-065 | 관찰 | Growth 5 · Stage 의미 · 추세는 같은 아이 시간순 사례만 | ACTIVE | 사용자 (A-2) |
| DEC-066 | 리포트 | Weekly 구조 · deterministic · 완료 조건 · 교사 관찰 prefill | ACTIVE | 사용자 (A-4 · AR-3) |
| DEC-067 | 리포트 | Monthly = Program 4-Week Block | ACTIVE | 사용자 (A-5) + SOURCE |
| DEC-068 | 리포트 | Semester = Child × Assignment × Reporting Term | ACTIVE | 사용자 (A-6) |
| DEC-069 | 리포트 | STARTER 8주 요약 = Summary View (새 report_type 아님) | ACTIVE | 사용자 (A-21 · CO-4) + SOURCE |
| DEC-070 | AI · 상품 | `ai_assist` 1개 · STARTER 제외 · STANDARD/PREMIUM 포함 · PILOT C1 | ACTIVE | 사용자 (A-7 · CO-5) + SOURCE |
| DEC-071 | AI | AI Independence · 입력 최소화 · No-Invention · AR-8은 외부 AI 사용 전 | ACTIVE | 사용자 (A-8 · A-9 · A-10 · A-19) |
| DEC-072 | AI | Provenance · Retry · Prompt/Model/Template Versioning | ACTIVE | 사용자 (A-11 · A-17) |
| DEC-073 | 리포트 | Revision · 이중 Snapshot · 정정 (PH3-3) | ACTIVE | 사용자 (A-12 · A-13 · A-14) |
| DEC-074 | 리포트 | State Axes · Hide/Unhide · Computed Visibility | ACTIVE | 사용자 (A-13 · A-14) |
| DEC-075 | 학부모 · 원장 | Growth 5 표현 · Stage 미노출 · "업데이트됨" · AR-6/7 제외 | ACTIVE | 사용자 (A-15 · AR-9) |
| DEC-076 | 데이터 | Legacy Observation · Report · Portal 미편입 | ACTIVE | 사용자 (A-16 · AR-4) |
| DEC-077 | 리포트 | Multi-teacher Authorship · 낙관적 동시성 | ACTIVE | 사용자 (A-18) |
| DEC-078 | AI | Raw Payload 미저장 · Validated Draft + Provenance만 저장 · 로그 최소화 | ACTIVE | 사용자 (PH3-5) |

**총 78건 · ACTIVE 78 (clarified: DEC-010 · DEC-039 · DEC-043 · DEC-054 · DEC-055 · DEC-063 · DEC-072) · SUPERSEDED 0 · WITHDRAWN 0**

---

## 14. 다음 Decision 예정 영역

아래는 아직 Decision이 아니다. [../01-product/open-items.md](../01-product/open-items.md) · [../02-ia/open-items.md](../02-ia/open-items.md) · [../03-commerce/open-items.md](../03-commerce/open-items.md) · [../04-ai-report/open-items.md](../04-ai-report/open-items.md)에서 관리되며, 확정 시 DEC-079부터 부여한다.

| 예정 영역 | 확정 PHASE |
|---|---|
| ~~Entitlement feature 목록 최종 확정~~ → **DEC-055로 확정** (`ai_assist` 배분은 03-commerce CO-5) | PHASE 03 |
| 환불 · 자동갱신 · 해지 · 결제주기 정책 | PHASE 03 (사업) |
| PG 사업자 선정 | PHASE 03 (사업) |
| ~~Growth 5 시계열 표현 방식~~ → **DEC-065 · DEC-075로 확정** (사례 중심 서술 · 단계 증감 표기 없음) | PHASE 02~04 (교육) |
| 사진 anon 노출 방식 (service_role 확장 vs 별도 사본) | PHASE 05 (Architecture) |
| Child Portal 링크 만료 · 재발급 정책 (03-commerce CO-12 · Production Blocker) | P0 Portal Production 전 |
| ~~AI 원본 응답 저장 범위~~ → **DEC-078로 확정** (raw payload 미저장 · validated draft + provenance) | PHASE 04 |
| Part 계층 도입 여부 | PHASE 05 |
| Marketing↔DB 동기화 방식 (DB 직독 vs 빌드 검증) | PHASE 05 |
| ~~리포트 reopen · 숨김 해제 정책~~ → **DEC-073 · DEC-074로 확정** | PHASE 04 |
| 원장에게 교사 초대·배정 권한 위임 여부 (PHASE 03에서 미처리 → 03-commerce §3 이월) | PHASE 05 전 |
| 회귀테스트 도구 선정 | PHASE 05 |
| 16 · 24주 콘텐츠 제작 계획 | 콘텐츠 트랙 |
