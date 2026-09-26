# Decision Log — SOYE KIDS TeachAble Art Play SaaS Platform 2.0

| | |
|---|---|
| 문서 상태 | 운영 중 (누적 기록) |
| 최종 갱신 | 2026-09-26 |
| 범위 | PHASE 01 (Product Definition) 확정 사항 |
| Branch / commit | `saas-v2` / `faa8f9a` |
| 관련 문서 | [project-charter.md](./project-charter.md) · [../01-product/open-items.md](../01-product/open-items.md) |

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
| 상태 | `ACTIVE` |
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

## 10. 결정 요약표

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

**총 32건 · ACTIVE 32 · SUPERSEDED 0 · WITHDRAWN 0**

---

## 11. 다음 Decision 예정 영역

아래는 아직 Decision이 아니다. [open-items.md](../01-product/open-items.md)에서 관리되며, 확정 시 DEC-033부터 부여한다.

| 예정 영역 | 확정 PHASE |
|---|---|
| Entitlement feature 목록 최종 확정 | PHASE 03 |
| 환불 · 자동갱신 · 해지 · 결제주기 정책 | PHASE 03 (사업) |
| PG 사업자 선정 | PHASE 03 (사업) |
| Growth 5 시계열 표현 방식 (변화 서술 vs 단계 증감 표기) | PHASE 02~04 (교육) |
| 사진 anon 노출 방식 (service_role 확장 vs 별도 사본) | PHASE 05 (Architecture) |
| Child Portal 링크 만료 기간 | PHASE 05 |
| AI 원본 응답 저장 범위 | PHASE 04 |
| Part 계층 도입 여부 | PHASE 05 |
| Marketing↔DB 동기화 방식 (DB 직독 vs 빌드 검증) | PHASE 05 |
| 리포트 reopen 정책 | PHASE 03 |
| 원장에게 교사 초대·배정 권한 위임 여부 | PHASE 03 |
| 회귀테스트 도구 선정 | PHASE 05 |
| 16 · 24주 콘텐츠 제작 계획 | 콘텐츠 트랙 |
