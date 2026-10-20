# 24주 체험 본문 — 공식 가이드 대조 기록 (2026-10-20)

- 대상: `src/data/experience/demo-lessons.ts` (공개 체험 본문 · 코드 안 데이터)
- 근거: 공식 교사용 가이드 전사본 `src/lib/weeks/content/week-XX.ts` (본사 검수 전 · `publication: "draft"`)
- **공식 원본과 Supabase 교안 데이터는 고치지 않았다.** 체험 본문만 고쳤다.

## 결과

- 24주 모두 `demo_draft` → `adapted` (가이드의 핵심 활동 · 준비물 · 안전 · 발문 · 마무리 질문 · 가정연계를 근거로 짧게 다시 씀).
  화면 표시는 「공식 가이드 기반 체험 구성 · 검수 전」. `official` 로 표시하지 않는다.
- 우선 점검 주차
  - **2주차**: 콩주머니 나르기 · 선 따라 걷기(가이드에 없음) → 공식 핵심 활동 「젓가락 → 집게 → 협동 릴레이」. 마무리를 '해낸 일'에서 '다시 해본 순간'으로.
  - **17주차**: '노랑과 파랑이 만나면 무슨 색?'(정답 예측형) 삭제 → 보이는 대로 관찰하는 발문으로.
- 수업 시간(durationLabel)은 가이드와 week-index 가 같아 고칠 것이 없었다.
- 캐릭터 값: 가이드 등장인물에 맞춰 7주 `bukgeuki`, 21주 `pupu` 로 바꿨다 (캐릭터 표시는 사용권 확인 전이라 꺼져 있음).

## 가이드에 있어도 공개 체험에 싣지 않은 것

- 보호자를 찍는 척하며 아이를 촬영하는 방식(9주 가정연계), 특정 앱 이름, 성별을 고정한 가족 표현,
  아이 영상 · 사진의 가정 발송 요청 — 체험 문구에서는 '기록' · '이야기' 수준으로 바꿨다.
  `tests/experience-content.test.mjs` 금지어 검사가 막는다.
- 가이드가 「미정」인 곳(19주 가정연계)은 미정이라고만 쓴다.

## 본사 확인이 필요한 것

- 17~24주 음원: 사용 시점표가 없어 음원 문장을 일반적으로 썼다.
- 5주 음원 목록이 4주와 같다(전사 오류 가능성).
- 8주 결과물 범위: 가이드 미술 '4~7주 완성품' vs 공식 지도 outcome '1~7주 결과물 모음'.
- 3주: 가이드에 엘라가 나오지 않음 (캐릭터 값은 그대로 둠).

## 주차별 바꾼 점과 근거

### 1주차

**바꾼 점**
- movement: ‘살금살금·쿵쿵 걸음’ 탐험은 가이드에 없음 → 탐험 약속(멈추기·천천히 걷기)을 지키는 공간 탐험으로 교체
- music: ‘인사 노래로 친구 이름 부르기’ → 공식 음원 사용 시점(안녕! 친구야·우리 반을 소개해요)으로 교체
- explore: ‘마음에 드는 곳 가리키기’ → 탐험 미션 카드(사물함 찾기·좋아하는 놀이 고르기)
- art: 이름표를 목걸이로 거는 구성 → 가이드대로 자리·사물함에 붙이는 이름표; 준비물 ‘목걸이 끈’ 삭제, 관련 안전 문구 교체
- homeConnection: ‘마음에 든 곳 소개’ → 공식 가정연계 ‘입학 기념 액자 만들기’
- nuriAreas: 2개 → 가이드 목표표 5개 영역
- teacherQuestions·observationPoints를 가이드 발문·관찰표 기준으로 정리

**근거 (src/lib/weeks/content)**
- week-01.ts:63-88 objectives — 5개 영역(사회관계·의사소통·자연탐구·신체운동·건강·예술경험)
- week-01.ts:91-101 preparation.materials — 그림책, 탐험 미션 카드, 이름표 도안·이름 인쇄물, 스티커·색연필·사인펜
- week-01.ts:113-117 preparation.safety — 뛰지 않고 신호에 멈추기, 손잡기 강제 안 함, 인원 확인
- week-01.ts:174-180 lessonSteps STEP 2 — 《유치원 가는 날》 설렘·두려움, '처음 가는 곳에 가면 어떤 마음'
- week-01.ts:190-196 STEP 3 탐험 약속 — 멈추기·천천히 걷기
- week-01.ts:204-240 coreActivity — 교실·놀이실·화장실·놀이터, 탐험 미션 카드(사물함 찾기·좋아하는 놀이 찾기)
- week-01.ts:301-304 mediaOrWatch — '안녕! 친구야'(친구 만나기), '우리 반을 소개해요'(공간 탐험)
- week-01.ts:274-289 art — 이름표 꾸며 자리·사물함에 붙이기, '어떤 색을 넣고 싶어?'
- week-01.ts:313-318 closing.questions — '오늘 처음 알게 된 곳은 어디였어?'
- week-01.ts:328-333 observationGuide — 환경 적응, 사회관계, 생활자립
- week-01.ts:343-352 homeConnection — 입학 기념 액자 만들기

### 2주차

**바꾼 점**
- movement: ‘콩주머니 나르기·선 따라 걷기’는 가이드에 없음 → 공식 핵심활동 ‘젓가락 → 집게 → 협동 릴레이’로 교체 (선 따라 그리기는 워크북 활동)
- explore: ‘쉬운/어려운 미션 이야기’ → 집게 종류·잡는 힘 비교(MISSION 2 발문)
- music: ‘할 수 있어! 구호 외치기’ → 공식 음원 사용 시점으로 교체
- materials: 금색 색종이·리본·유아용 가위 → 메추리알 모형·젓가락·집게·나무 그릇·트레이·메달 도안
- safety: 미션 구역 간격·가위 → 도구 끝 확인·작은 부품·릴레이 차례 전달
- nuriAreas: 의사소통 추가(가이드 목표표). 정서·자기조절은 누리 영역이 아니므로 soyeCoreExperiences 유지
- childLines.share·closingQuestion: ‘끝까지 해냈어요/해낸 일’(결과 중심) → ‘다시 해본 순간/달라진 점’(가이드 핵심: 잘하게 X · 다시 해보게 O)

**근거 (src/lib/weeks/content)**
- week-02.ts:46-52 atAGlance.coreActivities — '마루의 도전 미션(젓가락·집게·협동 릴레이)'
- week-02.ts:58-79 objectives — 신체운동·건강(젓가락·집게 조절)·사회관계·의사소통 + 정서·자기조절(→ soyeCoreExperiences)
- week-02.ts:82-91 preparation.materials — 메추리알 모형 6개, 젓가락, 집게 2종, 도전 미션 카드, 나무 그릇, 보관 트레이, 용기 메달 도안
- week-02.ts:99-104 preparation.safety — 젓가락·집게 끝, 작은 부품 입에 넣지 않기, 릴레이는 차례대로, 메달 끈 길이
- week-02.ts:158-164 STEP 2 그림책 — '잘해서일까, 다시 해봐서일까?'
- week-02.ts:188-227 coreActivity MISSION 1~3 — 젓가락으로 옮기기, 집게로 옮기기('어떤 게 네 손에는 더 편했어?'), 협동 릴레이
- week-02.ts:295-298 mediaOrWatch — '할 수 있어!'(미션 전/후), '우리 함께'(협동 릴레이·마무리)
- week-02.ts:268-283 art — 끝까지 해본 용기 메달, '다시 할 때 무엇을 바꿔봤어?'
- week-02.ts:308 closing.questions — '처음에는 어려웠는데 나중에는 조금 달라진 게 있었어?'
- week-02.ts:322-326 observationGuide — 도전 태도·소근육·사회관계
- week-02.ts:338-346 homeConnection — 우리 가족 ‘도전 OO’ 미션, 시도한 날에 스티커
- week-02.ts:259 workbook — ‘선 따라 그리기’는 워크북 활동(신체 미션 아님)

### 3주차

**바꾼 점**
- movement: ‘기쁨·슬픔·놀람 몸 표현 놀이’ → 공식 핵심활동 ‘마음배달’(마음다리 건너 하트카드로 마음 전하기)
- music: ‘마음 노래에 맞춰 감정 카드 들기’ → 공식 음원 사용 시점
- materials: 감정 카드·마음 편지지 → 표정·상황카드, 마음다리·하트카드·마음배달함, 팔찌 끈·큰 구슬
- story: ‘엘라의 이야기’ — 가이드 그림책 설명에 엘라가 주인공으로 나오지 않아 인물 이름을 빼고 그림책 제목으로 서술 (character 값은 유지)
- teacherQuestions: ‘오늘 내 마음은 어떤 색’ → 가이드 발문(표정 읽기·말로 바꾸기)
- homeConnection: ‘기분을 색으로 이야기’ → 공식 ‘마음배달 우체통’
- nuriAreas: 예술경험·신체운동·건강 추가. soyeCoreExperiences: 가이드 목표표에 정서·자기조절이 없어 비움

**근거 (src/lib/weeks/content)**
- week-03.ts:46-52 atAGlance.coreActivities — 마음배달, 친구의 마음을 찾아주세요(워크북), 마음을 전하는 팔찌
- week-03.ts:64-83 objectives — 의사소통·사회관계·예술경험·신체운동·건강 (정서·자기조절 항목 없음)
- week-03.ts:88-99 preparation.materials — 마음다리(링·훌라후프), 하트카드, 우체통/마음배달함, 팔찌 끈·큰 구슬, 표정·상황카드
- week-03.ts:112-116 preparation.safety — 링 미끄럼, 구슬 입·코·귀, 팔찌 끈 조임, 천천히 이동
- week-03.ts:173-179 STEP 2 그림책 — '표정을 보니 어떤 마음 같아?', '행동 대신 말로 한다면'
- week-03.ts:203-221 coreActivity 마음배달 — 하트카드 들고 마음다리 건너 친구에게 말로 전달
- week-03.ts:301-303 mediaOrWatch — 마음 친구 송(마음배달 전후), 고마운 마음 송(팔찌 전달)
- week-03.ts:274-289 art — 팔찌 만들고 한 문장으로 전달, '누구에게 어떤 말을 전하고 싶어?'
- week-03.ts:316 closing.questions — '마음을 말하기 전과 말한 뒤에 달라진 게 있었어?'
- week-03.ts:328-330 observationGuide — 자기표현·감정이해·공감
- week-03.ts:342-351 homeConnection — 우리 가족 ‘마음배달 우체통’

### 4주차

**바꾼 점**
- 이미 adapted. 세부 사실만 가이드에 맞춤
- movement: ‘웅크린 씨앗에서 새싹 되기’는 핵심활동 표기에 없음 → MISSION 2 연주회 동작(톡톡·살랑살랑)으로 교체
- music: ‘비 소리·바람 소리 연주’는 가이드에 없음 → 살살/세게 흔들기·음악 멈추면 쉬기
- materials: ‘투명 페트병’·‘돋보기’ → 투명 마라카스 통·관찰 용기/투명 트레이
- homeConnection: ‘마라카스 흔들며 이야기’ → 공식 ‘씨앗 성장 이야기’(처음·지금 사진 비교). 초음파 사진은 선택 자료라 공개 문장에서는 ‘처음 사진’으로만 표기
- nuriAreas: 의사소통 추가
- teacherQuestions: ‘씨앗이 자라려면 무엇이 필요할까요?’ 유지 대신 그림책 기다림 장면 발문으로 교체(정답 유도 줄임)

**근거 (src/lib/weeks/content)**
- week-04.ts:57-77 objectives — 자연탐구·예술경험·신체운동·건강·의사소통
- week-04.ts:82-95 preparation.materials — 씨앗 6종, 관찰 용기/투명 트레이, 투명 마라카스 통, 스티커
- week-04.ts:112-116 preparation.safety — 입·코·귀, 떨어진 씨앗 즉시 치우기, 뚜껑 잠금
- week-04.ts:172-178 STEP 2 그림책 — 돌봄·기다림 장면, '물을 줬는데 바로 새싹이 나왔을까?'
- week-04.ts:207-218 coreActivity MISSION 1 — 크기·모양·색 비교, 용기 흔들어 소리 비교
- week-04.ts:223-230 MISSION 2 씨앗 마라카스 연주회 — 살살/세게, 머리 위 톡톡·무릎 옆 살랑살랑, 음악 멈추면 쉬기
- week-04.ts:265-281 art — 씨앗 종류·양 선택, 소리 실험, '조금/많이 넣었을 때'
- week-04.ts:309 closing.questions — '우리도 아기였을 때보다 지금 달라진 게 있을까?'
- week-04.ts:320-322 observationGuide — 자연탐구·성장 이해·예술·신체
- week-04.ts:334-343 homeConnection — 씨앗 성장 이야기(시작 사진·지금 사진)

### 5주차

**바꾼 점**
- movement: ‘동글게 동글게 노래에 맞춰 꽃 피기’ → 공식 꽃놀이(색 신호에 맞춰 꽃판으로 모이기)
- music: ‘친구 이름 넣은 꽃 노래’는 가이드에 없음 → 활동 TIP의 웅크리기-펼치기 신체표현. (가이드 음원 목록이 4주차와 같은 곡이라 곡명은 넣지 않음)
- explore: ‘거울로 내 얼굴 살펴보기’ → 꽃의 같고 다른 점 관찰
- materials: 한지·색종이·빨대/막대 → 꽃판·꽃 도안 세트; 안전 문구 ‘막대 끝’ → 꽃판 고정·사진 기준
- nuriAreas: 2개 → 5개 영역
- homeConnection: 비교 없이 구체적 모습으로 칭찬한다는 가이드 핵심 문장 반영

**근거 (src/lib/weeks/content)**
- week-05.ts:55-79 objectives — 사회관계·자연탐구·예술경험·의사소통·신체운동·건강
- week-05.ts:84-96 preparation.materials — 대형 꽃판/바닥표식, 꽃·꽃잎·줄기·잎 도안, 스티커·색연필·사인펜·풀
- week-05.ts:110-114 preparation.safety — 꽃판 고정, 인원 분산, 사진 활용 기준
- week-05.ts:137-143 STEP 1 — 꽃의 같고 다른 점 찾기
- week-05.ts:171-177 STEP 2 그림책 — '이 꽃과 저 꽃은 무엇이 다를까?'
- week-05.ts:201-239 coreActivity 동글게 동글게 꽃놀이 — 분홍꽃·노란꽃 신호, '어떤 움직임을 해볼래?', 웅크리기-크게 펴기 확장
- week-05.ts:274-290 art — 나만의 꽃, 얼굴 사진 또는 직접 그리기, '왜 이 색과 모양을 골랐어?'
- week-05.ts:317 closing.questions — '친구 꽃을 보니 어떤 멋진 점을 발견했어?'
- week-05.ts:329-332 observationGuide — 자기인식·사회관계·예술표현
- week-05.ts:343-356 homeConnection — 우리 가족 꽃 이야기, 비교형 칭찬 대신 구체적 모습

### 6주차

**바꾼 점**
- materials: 큰 상자·보자기·천 → 공식 KIT 대형 입체 종이집과 장식 재료
- movement: ‘손발로 리듬 만들기’ → 친구에게 비·햇살을 전하는 공식 신체활동
- music: ‘비 소리·햇살 소리 악기 연주’ → 공식 음원에 맞춘 동작
- explore: ‘튼튼한 기지 조건 생각하기’ → 워크북의 비·바람·햇살 연결
- homeConnection: ‘이불·쿠션 가족 기지’ → 공식 ‘나와 함께 자라는 우리 가족’
- safety: 상자 모서리 → 신체 접촉 약속·종이집 올라타기 금지
- nuriAreas: 3개 → 5개 영역

**근거 (src/lib/weeks/content)**
- week-06.ts:59-83 objectives — 사회관계·자연탐구·예술경험·의사소통·신체운동·건강
- week-06.ts:88-106 preparation.materials — 대형 입체 종이집, 나뭇잎·꽃·가랜드·깃발, 색연필·사인펜·풀/테이프
- week-06.ts:115-119 preparation.safety — 머리·얼굴 제외 가볍게 터치, 접촉 원치 않으면 자기 몸, 종이집 올라타기 금지
- week-06.ts:177-183 STEP 2 그림책 — 우비와 친구들, '누구 한 명의 기지일까, 우리 모두의 기지일까?'
- week-06.ts:207-254 coreActivity — 내 몸에 비 톡톡 → 친구에게 비 → 햇살 전달, '친구가 와주니 어땠어?'
- week-06.ts:316-317 mediaOrWatch — 톡톡! 비가 와요, 따뜻한 햇살
- week-06.ts:397 quickGuide 4 워크북 — 날씨를 관찰·연결
- week-06.ts:288-304 art — 장식 골라 자리 의논·부착, 정해진 인원 들어가 놀이, '누구에게 어떤 도움을 부탁할까?'
- week-06.ts:331 closing.questions — '혼자 하기 어려울 때 누가 도와줬어?'
- week-06.ts:344-348 observationGuide — 협력·의사소통·공동성취
- week-06.ts:358-367 homeConnection — 나와 함께 자라는 우리 가족(가족사진 도안)

### 7주차

**바꾼 점**
- movement: ‘나비처럼 팔랑, 벌처럼 윙윙 날기’ → 공식 나비놀이(꽃밭 역할이 꽃가루를 붙여 주고 역할 바꾸기). 벌놀이는 교사 선택
- music: ‘음악 멈추면 꽃 위에 앉는 멈춤 놀이’ → 타이틀송·역할 전환 신호
- explore: ‘대칭 무늬 관찰’(미술 단계와 중복) → 나비·벌 특징 관찰(워크북)
- materials: 붓·스펀지·모루 → 포스트잇 꽃가루·데칼코마니 도안
- homeConnection: ‘가족과 기다리는 일 하기’ → 공식 ‘나비·벌로 선생님 이야기’
- story: 가이드 그림책 주인공은 북극이(character 값 pupu는 지시대로 유지 — 불일치 확인 필요). 본문에서는 인물 이름을 쓰지 않음
- nuriAreas: 2개 → 5개. soyeCoreExperiences: 목표표에 정서·자기조절이 없어 비움(관찰표에는 ‘기다림·자기조절’ 영역 있음)

**근거 (src/lib/weeks/content)**
- week-07.ts:62-86 objectives — 자연탐구·신체운동·건강·사회관계·의사소통·예술경험
- week-07.ts:91-105 preparation.materials — 포스트잇/종이 꽃가루, 데칼코마니용 나비 도안, 물감, 꾸미기 재료
- week-07.ts:122-126 preparation.safety — 날갯짓 간격, 포스트잇 얼굴·머리카락 금지, 팔랑팔랑 걷기
- week-07.ts:149-155 STEP 1 — '나비를 잡으려고 막 뛰어가면 나비는 어떻게 할까?'
- week-07.ts:182-188 STEP 2 그림책 — 쫓을수록 멀어지고 기다리자 가까이 오는 나비
- week-07.ts:212-254 coreActivity — A 나비놀이(꽃밭이 꽃가루 붙여주기, 역할 바꾸기), B 벌놀이(교사 선택/병행)
- week-07.ts:314-315 mediaOrWatch — 7주차 타이틀송, 나비/벌 활동 음원(역할 전환 신호)
- week-07.ts:288-302 art — 데칼코마니 나비, 접고 잠시 기다렸다 펼치기
- week-07.ts:327-329 closing.questions — '친구가 나비일 때 기다리면서 무엇을 봤어?', '조금 기다린 뒤에 만난 즐거운 순간'
- week-07.ts:340-343 observationGuide — 기다림·자기조절, 사회관계, 의사소통
- week-07.ts:354-364 homeConnection — 나비·벌로 선생님 이야기

### 8주차

**바꾼 점**
- movement: ‘손잡고 원 넓히기’ → 공식 핵심활동(조각을 들고 이동해 붙이는 것 자체가 신체활동)
- music: ‘그동안 부른 노래 이어 부르기’ → 공식 음원 ‘숲으로 가요’·‘우리의 숲’ 사용 시점
- explore: ‘지난 작품 보며 기억나는 수업’ → 처음 숲과 완성 숲 비교(closing·그림책 발문)
- materials: 큰 현수막 천·나무·잎 도안 → SOYE KIDS 대형 숲 현수막·자연 요소 완성품·부착재
- safety: ‘선생님이 높이 맞춰 걸기’ → 손 닿는 높이 고정·올라가지 않기·2~3명씩
- homeConnection: ‘현수막 사진 보며 이야기’ → 공식은 완성 과정 영상. 공개 문장에서는 ‘완성 과정 기록’으로 표기
- 주의: 가이드 미술은 ‘4~7주 완성품’이라 적고 공식 지도 outcome은 ‘1~7주 결과물 모음’ — 공식 메타는 바꾸지 않고 본문은 자연 요소 조각으로 서술

**근거 (src/lib/weeks/content)**
- week-08.ts:62-86 objectives — 5개 영역
- week-08.ts:91-104 preparation.materials — 대형 숲 현수막, 지난 활동 완성품/도안, 양면테이프
- week-08.ts:120-123 preparation.safety — 손 닿는 범위 설치·올라가지 않기, 2~3명씩 순환, 부착재 정리
- week-08.ts:181-188 STEP 2 그림책 — '꽃만 가득하면 숲이 될까?'
- week-08.ts:212-275 coreActivity — 씨앗→새싹→꽃→날씨→나비·벌 순서로 들고 이동해 붙이기, 위치는 아이가 선택
- week-08.ts:335-338 mediaOrWatch — 숲으로 가요(이동·붙이기), 우리의 숲(완성·마무리)
- week-08.ts:309-326 art — 공동작품(핵심활동과 동일), 4~7주 완성품 활용
- week-08.ts:419 quickGuide — '네 조각은 어디에서 함께 살고 싶어?'
- week-08.ts:352 closing.questions — '우리 반 친구들이 하나씩 모이니까 어떤 숲이 되었어?'
- week-08.ts:363-367 observationGuide — 공동체·기억·공동성취
- week-08.ts:378-388 homeConnection — 우리 반 숲을 이야기해요(완성 과정 영상)

### 9주차

**바꾼 점**
- goal·story: ‘봄의 마지막을 즐기며 꽃과 웃음 나누기’ → 가이드 핵심(꽃비 놀이 + 초록으로 변한 숲을 스스로 발견)
- movement: ‘꽃잎 흩날리며 춤’ → 공식 대형 천 꽃비(단계별 흔들기·함께 올리기)
- music: ‘웃음소리 크게·작게’는 가이드에 없음 → 음원 사용 시점
- explore: ‘봄꽃과 색 찾기’ → 꽃잎 바람 실험(PLAY 2)
- teacherQuestions: ‘꽃다발을 누구에게 주고 싶나요?’ 삭제 — 가이드가 미술 시간에 받을 사람을 미리 정하지 말라고 주의함(week-09.ts:320)
- homeConnection: 공식 가정연계의 보호자를 찍는 척하며 실제로는 아이 얼굴을 영상으로 담는 방법(week-09.ts:378)과 특정 보호자 호칭(어머니 한정) 표현은 교사 검토 지적에 따라 싣지 않음 → ‘가족에게 꽃다발 건네고 이야기 나누기’로만 서술
- materials: 꽃잎 모양 종이·포장지 → 대형 천·꽃잎·바구니 추가
- safety: 바닥 꽃잎 미끄럼은 유지, 대형 천 약속 추가

**근거 (src/lib/weeks/content)**
- week-09.ts:61-86 objectives — 5개 영역(늦봄 변화 관찰, 대형 천 놀이 등)
- week-09.ts:90-103 preparation.materials — 대형 천, 종이꽃잎·조화 꽃잎, 바구니, 꽃 도안·포장재·리본·스티커
- week-09.ts:116-119 preparation.safety — 작은 조각 금지, 천 세게 당기지 않기·같이 올리고 내리기, 꽃잎 정리
- week-09.ts:175-182 STEP 2 그림책 — '같은 숲인데 아까와 무엇이 달라졌지?'
- week-09.ts:206-261 coreActivity — PLAY1 꽃잎 모으기, PLAY2 바람아 불어라('약한 바람일 때랑 센 바람일 때'), PLAY3 대형 천 꽃비, PLAY4 꽃비 속 놀이
- week-09.ts:329-331 mediaOrWatch — 활동 연계 음원(꽃잎 모으기·대형 천), 잔잔한 음원(꽃다발)
- week-09.ts:299-315 art — 나만의 꽃다발, '네 꽃다발에는 어떤 봄이 들어 있는 것 같아?'
- week-09.ts:345 closing.questions — '오늘 봄에서 가장 기억하고 싶은 건 뭐야?'
- week-09.ts:356-360 observationGuide — 자연관찰·사회관계·예술표현
- week-09.ts:370-386 homeConnection — 꽃다발 전달(공개 불가 요소 포함, 아래 changes 참고)

### 10주차

**바꾼 점**
- art: ‘색 점토로 곤충 만들어 자석으로 붙이기’ → 가이드는 별도 제작 활동 없음. 여름 곤충 자석은 가정연계 연결물이라 ‘고르기’로 수정
- materials: 곤충 그림 카드·자석 판·색 점토 → 곤충 모형·채집통·관찰 트레이·돋보기·단서 카드
- movement: ‘잠자리처럼 날기·개미처럼 기기’ → 소리 따라가기·숨은 곤충 찾기
- music: ‘매미·귀뚜라미 소리 흉내’ → 여름 숲 소리 듣고 위치 상상(귀뚜라미는 가이드에 없음)
- explore: ‘다리·날개 수 세기’ → 비슷한 곤충 짝 비교(장수풍뎅이↔사슴벌레, 여치↔메뚜기)
- teacherQuestions: ‘다리가 몇 개일까요?’(정답형) → 근거를 묻는 발문
- safety: ‘살아 있는 곤충은 눈으로만’ → 살아 있는 곤충 자체를 쓰지 않음(모형·사진)
- nuriAreas: 2개 → 5개 영역

**근거 (src/lib/weeks/content)**
- week-10.ts:61-86 objectives — 5개 영역
- week-10.ts:91-107 preparation.materials — 곤충 모형·채집통·관찰 트레이·돋보기·단서 카드, 비교 자료, 여름 숲 소리
- week-10.ts:119-121 preparation.safety — 살아 있는 곤충 쓰지 않음, 모형 부품 확인, 들고 뛰지 않기
- week-10.ts:179-186 STEP 2 그림책 — 그늘·바람, '맴맴 소리는 어디에서 들릴까?'
- week-10.ts:210-251 coreActivity — PLAY1 소리 따라가기, PLAY2 숨은 곤충 찾기('무엇을 보고 이 친구를 찾았어?'), PLAY3 장수풍뎅이↔사슴벌레·여치↔메뚜기 비교
- week-10.ts:294-302 art — ‘별도 제작 활동 없음’, 곤충 자석은 가정 연결물
- week-10.ts:325 closing.questions — '비슷해 보였는데 자세히 보니 달랐던 친구가 있었어?'
- week-10.ts:338-342 observationGuide — 탐색 태도·자연관찰·사회관계
- week-10.ts:352-365 homeConnection — 여름 곤충 자석, 이름 퀴즈보다 직접 본 특징

### 11주차

**바꾼 점**
- music: ‘우쿨렐레 음악에 엉덩이 흔들기’ → 공식 훌라댄스 음원과 PLAY 3 동작
- materials: 비행기 표 도안·비닐 띠 → 여권·탑승권·선글라스, 체크인 표식·좌석, 훌라치마 꾸미기 재료
- story: ‘따뜻한 섬’ 단정 대신 가이드처럼 ‘새로운 곳’(가이드는 처음부터 하와이라고 말하지 말라고 안내)
- homeConnection: ‘가 보고 싶은 곳 그림’ → 공식 ‘여권·탑승권 보여 주며 여행 이야기’
- safety: 의자 사이 천천히 → 좌석 위 올라서지 않기·차례대로 이동 보강
- nuriAreas: 의사소통·자연탐구 추가(5개)

**근거 (src/lib/weeks/content)**
- week-11.ts:60-85 objectives — 5개 영역
- week-11.ts:90-107 preparation.materials — 여권·탑승권·선글라스, 체크인·탑승구 표식·좌석 의자, 꽃목걸이·훌라치마 재료
- week-11.ts:122-125 preparation.safety — 끈 길이, 좌석 위 올라서지 않기, 차례대로 이동, 잡아당기지 않기
- week-11.ts:182-189 STEP 2 그림책 — 여행 준비·탑승권·'구름을 지나면 무엇이 보일까?'
- week-11.ts:213-254 coreActivity — PLAY1 여행 준비(가방·탑승권 표시), PLAY2 체크인→탑승→출발 표, PLAY3 훌라댄스(손 흔들기·파도처럼 낮췄다 펴기)
- week-11.ts:321 mediaOrWatch — 훌라댄스 음원(도착 후 신체활동)
- week-11.ts:291-306 art — 꽃목걸이 & 훌라치마, 착용해 움직임 확인, '이 소품을 하고 어떤 춤을 추고 싶어?'
- week-11.ts:332-335 closing.questions — '비행기에 올라갈 때 어떤 기분이었어?', '다음에 또 떠난다면 어디에'
- week-11.ts:346-348 observationGuide — 새로운 경험·신체표현·사회관계
- week-11.ts:360-369 homeConnection — 여권·탑승권·선글라스로 여행 이야기

### 12주차

**바꾼 점**
- movement: ‘낙엽처럼 빙글빙글 돌기’는 가이드에 없음 → 핵심활동 촉감 탐색(상자에 손 넣기)
- music: ‘바스락 낙엽 소리 리듬’ → 탐색·미술 연계 음원 사용 시점
- explore: ‘상자 속 맞히기’(정답 게임) → 가이드는 퀴즈가 아니라고 명시, 확인한 산물 분류·비교로 교체
- art: ‘가을 산물로 허수아비 꾸미기’ → 가을 산물 모양 ‘도장’ 공동작업으로 구체화
- materials: 사진 카드·낙엽·천·짚 모형 → 촉감 상자·가을 산물 6종·허수아비 도안·도장
- teacherQuestions: ‘허수아비는 무엇을 지켜 줄까요?’(가이드에 없음) → 그림책 발문
- homeConnection: ‘시장·마트에서 가을 열매 찾기’ → 공식 ‘가을 산물 한 가지 준비해 가져오기’
- nuriAreas: 2개 → 5개 영역

**근거 (src/lib/weeks/content)**
- week-12.ts:59-84 objectives — 5개 영역
- week-12.ts:89-102 preparation.materials — 촉감 상자, 사과·배·고구마·옥수수·호박·감 실물/모형, 관찰 트레이·바구니, 대형 허수아비 도안·도장·물감·앞치마
- week-12.ts:115-119 preparation.safety — 찌르는 재료 금지, 먹기 활동 연결 금지, 물감 바닥 닦기, 소그룹
- week-12.ts:175-182 STEP 2 그림책 — 색 따라가기, '저 친구는 누구지? 왜 꼼짝하지 않을까?'
- week-12.ts:206-248 coreActivity — PLAY1 손끝으로 만나기, PLAY2 추측('왜 그렇게 생각했어?'), PLAY3 바구니로 모으기(색·모양 분류)
- week-12.ts:314-315 mediaOrWatch — 탐색 연계 음원(촉감 상자), 미술 연계 음원(도장)
- week-12.ts:285-300 art — 우리 반 알록달록 허수아비(가을 산물 모양 도장 공동작업)
- week-12.ts:326 closing.questions — '상자 속에서 가장 기억나는 촉감은 뭐였어?'
- week-12.ts:340-344 observationGuide — 감각탐색·의사소통·예술표현
- week-12.ts:354-363 homeConnection — 가을 산물 준비

### 13주차

**바꾼 점**
- music: ‘전통 장단 손뼉·발 구르기’는 가이드에 없음 → 달빛 음원에 맞춘 원형 걷기·멈추기
- explore: ‘날마다 달 모양 변화 그림 보기’(지식형) → 달 따라 걷기·위치 살피기(가이드는 원리 설명보다 호기심)
- teacherQuestions: ‘달 모양은 왜 달라질까요?’ → 그림책의 ‘또 따라왔어! 왜 그런 것 같아?’
- materials: 한지·끈 → 주머니 재료·복 글자 도안·달 장식·바닥 원형 표시
- childLines.share: ‘내 소원은 비밀이에요’ → 주머니에 담은 마음(가이드는 원하면 한마디로 나눔)
- homeConnection: ‘밤하늘 달 모양 보기’ → 공식 ‘복(福)름달주머니 전하기’
- nuriAreas: 3개 → 5개 영역

**근거 (src/lib/weeks/content)**
- week-13.ts:58-83 objectives — 5개 영역
- week-13.ts:88-104 preparation.materials — 보름달 원판/원형 천·바닥 원형 표시·달 신호 카드, 주머니 재료·복 글자 도안·둥근 달 장식·스티커·리본
- week-13.ts:117-120 preparation.safety — 손은 가볍게, 끈·리본 목에 걸지 않기
- week-13.ts:179-186 STEP 2 그림책 — '어? 또 따라왔어! 왜 그런 것 같아?'
- week-13.ts:210-252 coreActivity — PLAY1 달 따라 걷기('멈춰! 지금 달은 어디에 있어?'), PLAY2 달빛 강강술래, PLAY3 달아 커져라(한 걸음씩 뒤로)
- week-13.ts:319 mediaOrWatch — 달빛 연계 음원(달 따라 걷기·강강술래)
- week-13.ts:289-309 art — 복(福)름달주머니, 소원 카드, 어른이 기대하는 소원 유도 금지
- week-13.ts:332-334 closing.questions — '작았다가 커질 때 무엇이 달라졌어?', '주머니 안에는 어떤 마음'
- week-13.ts:345-349 observationGuide — 신체조절·의사소통·예술표현
- week-13.ts:359-368 homeConnection — 복(福)름달주머니 전하기(아이가 대상 선택)

### 14주차

**바꾼 점**
- explore: ‘손 씻기·기침 예절 등 감기 예방법 찾기’ → 가이드는 감기를 놀이 소재로 삼지 않고 치료·예방을 단정하지 않음. 표정 관찰(PLAY 1)로 교체
- teacherQuestions: ‘감기에 걸리지 않으려면?’ 삭제 → 단서를 묻는 발문
- movement: ‘동작 보고 맞히기’ → 가이드는 퀴즈가 아니라고 명시, 짝이 확인하는 방식으로 수정
- music: ‘소리 줄이며 표정으로 노래’ → 리듬 음원을 전환 신호로
- materials: 마스크 도안 삭제 → 동작 카드·돌봄 상징 도안
- coreExperiences: ‘건강 습관’ 삭제
- story: ‘목이 아파 말을 못 하게 된 친구’ → 감기 뒤 목소리가 잘 안 나오는 우비(가이드 원문 인물, character ubi와 일치)
- nuriAreas: 2개 → 5개. soyeCoreExperiences: 목표표에 정서·자기조절이 없어 비움

**근거 (src/lib/weeks/content)**
- week-14.ts:58-83 objectives — 의사소통·사회관계·신체운동·건강·예술경험·자연탐구
- week-14.ts:87-103 preparation.materials — 몸짓 상황카드·표정카드, 동작 카드, 「감기야 사라져라! 얍!」 도안·우비 도안·돌봄 상징 도안
- week-14.ts:116-120 preparation.safety — 자기 자리 범위, 눕거나 구르는 동작 제외, 기침·재채기 흉내 금지, 아픈 아이 참여 요구 금지
- week-14.ts:177-184 STEP 2 그림책 — 우비, '무엇을 하고 싶은 것 같아? 어디를 보고 알았어?'
- week-14.ts:208-248 coreActivity — PLAY1 얼굴이 먼저 말해요, PLAY2 말 없이 부탁해요(카드 표), PLAY3 짝과 확인하기
- week-14.ts:315 mediaOrWatch — 리듬 연계 음원(말 없이 움직임 바꾸는 신호)
- week-14.ts:285-305 art — 감기야 사라져라! 얍!(돌봄 상징 응원 그림, 치료 효과 단정 금지)
- week-14.ts:328 closing.questions — '말로 했을 때와 몸으로 표현했을 때 무엇이 달랐어?'
- week-14.ts:341-344 observationGuide — 의사소통·사회관계·정서이해
- week-14.ts:355-364 homeConnection — 우리 가족 몸으로 말해요 카드

### 15주차

**바꾼 점**
- movement: ‘방울 소리 들리면 친구에게 손 흔들기’ → 도움 장면 찾기 + 원 안의 어른에게 마음벨 전달(PLAY 1·3)
- explore: ‘어떤 물건이 맑은 소리를 낼까’ → 벨 흔드는 세기 비교(PLAY 2)
- materials: 종이컵·리본 → 마음벨 몸체 도안·도움 상황카드
- teacherQuestions: ‘누군가에게 고마웠던 적이 있나요?’ → 장면부터 떠올리는 발문(가이드: 감사 인사를 시키지 않음)
- childLines.share: ‘고마워요, 사랑해요’ → 감사 문장 강요를 피하는 표현
- homeConnection: ‘가족에게 고마운 마음 전하기’ → 공식 ‘어른에게 마음 전하기’(장면 회상 후 편한 방식)
- nuriAreas: 2개 → 5개 영역

**근거 (src/lib/weeks/content)**
- week-15.ts:61-86 objectives — 5개 영역(자연탐구: 흔드는 방법에 따른 소리 비교)
- week-15.ts:91-107 preparation.materials — 도움 상황카드·하트카드, 마음벨 몸체 도안·안전한 방울·스티커
- week-15.ts:123-126 preparation.safety — 방울 연결, 목걸이형 끈 지양, 교사와 함께 이동, 귀 가까이 울리지 않기
- week-15.ts:184-191 STEP 2 그림책 — 문 잡아주기·장갑 주워주기, '말하지 않아도 어떤 마음이 전해졌을까?'
- week-15.ts:215-258 coreActivity — PLAY1 따뜻한 장면 찾기, PLAY2 벨 세기 비교('네 마음은 어떤 소리로'), PLAY3 원 안의 어른 찾아가기
- week-15.ts:326 mediaOrWatch — 벨·리듬 연계 음원(울림 크기·속도 탐색)
- week-15.ts:295-316 art — 딸랑딸랑 마음벨, '그 사람은 평소에 너에게 어떤 도움을 주었지?', 감사 강요 금지
- week-15.ts:339 closing.questions — '마음벨을 건넸을 때 그 어른의 표정은 어땠어?'
- week-15.ts:352-354 observationGuide — 사회관계·의사소통·신체조절
- week-15.ts:366-375 homeConnection — 어른에게 마음 전하기

### 16주차

**바꾼 점**
- art: ‘영상편지 카드 만들기’ → 가이드는 별도 제작 활동 없음. 영상편지는 아이가 만드는 것이 아니라 보호자·교사가 미리 준비해 수업에서 아이에게 도착
- teacherQuestions: ‘영상편지로 누구에게 무슨 말을 하고 싶나요?’ 삭제 → 사진 회상·변화 발견 발문
- movement: ‘봄꽃·파도·낙엽·눈 몸 표현’ → 사진을 들고 이동해 계절 표식에 놓기(quickGuide 4 신체)
- music: ‘사계절 노래 이어 부르기’ → 계절별·잔잔한 연계 음원 사용 시점
- materials: 편지지·색연필·영상편지 카드 → 활동사진·계절 표식·영상편지 재생 기기·워크북 (5개)
- homeConnection: ‘가족과 영상편지 함께 보기’ → 공식 ‘1분 비밀 영상편지’(수업 전 보호자 준비)
- safety: 사진·영상 활용 동의·내부 한정 보강

**근거 (src/lib/weeks/content)**
- week-16.ts:62-88 objectives — 5개 영역
- week-16.ts:93-114 preparation.materials — 9~15주 활동사진·계절 표식, 1분 비밀 영상편지·재생 기기, 워크북 「나의 사계절」
- week-16.ts:126-130 preparation.safety — 사진·영상 활용 사전 확인, 내부 수업 한정, 감정이 벅찬 아이 쉬게 하기
- week-16.ts:186-193 STEP 2 그림책 — '따로 있던 사진이 모이니까 무엇처럼 보이니?'
- week-16.ts:217-259 coreActivity — PLAY1 사계절 모으기(사진 골라 계절 표식에 놓기), PLAY2 예전과 지금 나란히 보기, PLAY3 비밀 영상편지(반응 촬영·유도 금지)
- week-16.ts:320-321 mediaOrWatch — 계절별 연계 음원(사진 회상), 잔잔한 음원(워크북)
- week-16.ts:302-310 art — ‘별도 제작 활동 없음’, 사진·영상·워크북이 기록물
- week-16.ts:331 closing.questions — '다시 가보고 싶은 장면은 어디야?'
- week-16.ts:346-350 observationGuide — 회상·사회관계·자기인식
- week-16.ts:360-370 homeConnection — 1분 비밀 영상편지(수업 전 보호자 준비)

### 17주차

**바꾼 점**
- teacherQuestions: ‘노랑과 파랑이 만나면 무슨 색이 될까요?’(정답 유도) 삭제 → 관찰한 변화를 묻는 발문(가이드 질문 원칙 week-17.ts:34)
- explore: ‘두 색이 섞이면 무슨 색이 될지 예상하고 확인’ → 겹친 곳·흔적·모양을 자유롭게 말하기(PLAY 3)
- observationPoints: ‘색 변화를 예측하는 말’ → 퍼지고 겹치는 변화를 살피는 모습
- childLines.explore: ‘무슨 색이 될까?’ → ‘색이 어디로 갔을까?’
- movement·materials: 스펀지 공 → 비닐 아래 물감을 소프트 뿅망치로 두드리기, 두꺼운 PE 비닐·롤지
- music: ‘북 리듬에 맞춰 색 찍기’는 가이드에 없음 → 타이틀송·연계 음원(사용 시점표 없음)
- art: ‘섞인 색으로 색친구 그리기’ → 번진 모양에 눈·입 등을 더해 완성
- homeConnection: ‘음식·옷에서 섞인 색 찾기’ → 공식 ‘가족 손바닥 색도장’
- coreExperiences: ‘색 혼합·과정 미술’ → ‘색의 만남과 흔적·번진 모양 상상’; nuriAreas 2개 → 5개

**근거 (src/lib/weeks/content)**
- week-17.ts:34 beforeStart.teacherRoles — '“이 색과 저 색을 섞으면 무슨 색이 될까?”의 정답보다 아이가 실제로 보고 느낀 변화와 모양을 말하게 합니다.'
- week-17.ts:65-89 objectives — 예술경험·사회관계·신체운동·건강·의사소통·자연탐구
- week-17.ts:94-107 preparation.materials — 큰 흰 종이/롤지, 씻어지는 물감, 두꺼운 투명 PE 비닐, 소프트 뿅망치, 입체 눈알·스티커
- week-17.ts:121-125 preparation.safety — 두꺼운 비닐, 물감 농도, 망치 상태, 비닐은 교사가 걷기
- week-17.ts:147-154 STEP 1 그림책 — '색이 만났는데도 원래 색이 보이니?'
- week-17.ts:194-234 coreActivity — PLAY1 색 찾아가기, PLAY2 톡톡 두드리고 퍼지는 방향 관찰, PLAY3 만난 색 찾기('새로운 색 이름을 맞히게 하기보다'), PLAY4 모두의 흔적
- week-17.ts:408 quickGuide 3 — '색이 어디로 움직였어?'
- week-17.ts:253-271 art — 내가 만든 색친구(번진 모양에 눈·입·팔다리), '이 모양은 무엇처럼 보여?'
- week-17.ts:313 closing.questions — '처음 종이와 지금 종이는 어떻게 달라졌어?'
- week-17.ts:327-345 observationGuide — 존중·탐색·예술표현
- week-17.ts:359-369 homeConnection — 우리 가족 손바닥 색도장
- week-17.ts:56-61 linkedContents — 타이틀송·연계 음원(음원 사용 시점표는 없음)

### 18주차

**바꾼 점**
- explore: ‘뜨는 것·가라앉는 것 실험’은 가이드에 없음 → 물방울 카드·빈 컵 건네며 마음 전하기(PLAY 4)
- teacherQuestions: ‘어떤 물건이 물에 뜰까요?’ 삭제 → 그림책·신체활동 발문
- music: ‘물방울 소리 손가락 리듬’ → 물결 스카프로 작은·큰 물결 만들기(PLAY 3). 가이드에 음원 사용 시점표는 없음
- materials: 비누 베이스 키트·향 없는 색소 → 비누클레이·몰드·압인 장식, 파란 천·물결 스카프 추가
- safety: ‘비누 베이스 온도 확인’ → 가이드는 뜨거운 베이스를 아이가 다루지 않게 하고 성형 재료를 권장
- homeConnection: ‘비누로 가족과 손 씻기’ → 공식 ‘서로 발 씻어 주며 칭찬·감사 한마디’
- nuriAreas: 3개 → 5개 영역

**근거 (src/lib/weeks/content)**
- week-18.ts:59-83 objectives — 사회관계·신체운동·건강·의사소통·예술경험·자연탐구
- week-18.ts:88-101 preparation.materials — 파란 천, 징검다리 발판, 물결 리본/스카프, 물방울/마음 카드, 비누클레이·실리콘 몰드·압인 장식
- week-18.ts:116-119 preparation.safety — 실제 물 최소화, 발판 고정, ‘앞 친구가 도착하면 출발’
- week-18.ts:145-151 STEP 1 그림책 — '풍덩! 빠졌을 때 어떤 마음이 들었을까?'
- week-18.ts:187-227 coreActivity — PLAY1 조심조심 출발, PLAY2 풍덩 물길, PLAY3 물결 만들기, PLAY4 물을 건네며 마음 전하기
- week-18.ts:385 quickGuide 3 — '친구에게 어떤 말을 건네고 싶어?'
- week-18.ts:244-261 art — 마음을 담은 비누, '어떤 모양이면 마음이 잘 전해질까?', 뜨거운 비누 베이스 직접 다루지 않기
- week-18.ts:302 closing.questions — '친구가 해줘서 좋았던 건 뭐였어?'
- week-18.ts:314-320 observationGuide — 표현·관계·신체조절
- week-18.ts:337-346 homeConnection — 물을 건네며 마음도 전해요(서로 발 씻어주기)

### 19주차

**바꾼 점**
- homeConnection: ‘냄비·상자로 가족 리듬 놀이’ → 가이드가 가족 연주 과제를 안내하지 말라고 명시(week-19.ts:335). 가정연계 미정 상태를 그대로 표시
- art·materials: 원통 상자·풍선/천으로 북 ‘만들기’ → 제공되는 북·스틱 세트를 ‘꾸미기’ (17~24주 대표 교구)
- story: ‘숲 속 동물들의 연주회’ → 가이드 설명은 숲 곳곳의 소리(동물 언급 없음)
- explore: 보지 않고 소리 찾기(PLAY 1) 추가, 세기 비교는 자연탐구 목표로 유지
- music: ‘메아리 연주’ → PLAY 3 ‘소리로 대답해요’와 기다리기
- nuriAreas: 신체운동·건강·자연탐구 추가(5개)
- 주의: 가정연계 정보가 공식 가이드에 없음(미정) — 다른 필드는 adapted

**근거 (src/lib/weeks/content)**
- week-19.ts:60-84 objectives — 예술경험·의사소통·사회관계·신체운동·건강·자연탐구
- week-19.ts:89-103 preparation.materials — 북·마라카스·우드블록, 아이별 북+스틱 세트, 스티커·도형 테이프·이름 스티커, 가정연계 ‘미정’
- week-19.ts:112-115 preparation.safety — ‘북만 톡톡’, 소리 민감 아이 대체 참여
- week-19.ts:141-147 STEP 1 그림책 — '지금 어디에서 소리가 들리는 것 같아?'
- week-19.ts:186-223 coreActivity — PLAY1 소리 찾기(보지 않고), PLAY2 소리를 몸으로(북=점프, 마라카스=흔들기), PLAY3 소리로 대답, PLAY4 작은 연주회
- week-19.ts:84 objectives 자연탐구 — 치는 방법에 따라 소리가 달라짐
- week-19.ts:240-257 art — 나만의 북과 스틱 ‘꾸미기’(제공 세트), 완성 후 소리 듣고 연주회
- week-19.ts:298-299 closing.questions — 친구 소리 기다림, 혼자/같이 칠 때
- week-19.ts:310-313 observationGuide — 경청·표현·협력
- week-19.ts:325-337 homeConnection — 제목 ‘미정’, status undecided, ‘임의의 음악 숙제나 가족 연주 과제를 안내하지 않습니다’

### 20주차

**바꾼 점**
- movement: ‘공을 손에서 손으로 차례 전달’ → 공식 ‘토마토 길을 이어줘!’(레일 연결·이동)
- art: ‘반쪽 토마토를 친구와 맞춰 하나로 완성’ → 가이드는 반쪽 도안의 나머지를 각자 관찰·상상해 완성
- teacherQuestions: ‘내 반쪽과 꼭 맞는 친구는?’·‘반으로 나누면 좋은 점’ 삭제 → 그림책·레일·미술 발문
- music: ‘주렁주렁 노래에 손 마주치기’는 가이드에 없음 → 연계 음원과 주고받기 신호
- materials: 빨강 색지·초록 꼭지 도안 → 레일·토마토 공·도착 바구니·단면 사진
- homeConnection: ‘간식 반으로 나누기’ → 공식 ‘가족과 토마토 요리’
- safety: ‘손에서 손으로 전달’ → 레일 높이·실제 토마토 던지지 않기
- nuriAreas: 2개 → 5개 영역

**근거 (src/lib/weeks/content)**
- week-20.ts:60-84 objectives — 사회관계·신체운동·건강·자연탐구·의사소통·예술경험
- week-20.ts:89-102 preparation.materials — U자형 레일 6~8개, 부드러운 토마토 공, 도착 바구니, 토마토 사진·단면 사진, 반쪽 토마토 도안
- week-20.ts:111-114 preparation.safety — 레일 허리 아래, 실제 토마토 던지지 않기, 멈춤 신호, 시식은 기관 기준
- week-20.ts:136-142 STEP 1 그림책 — '왜 ‘준비됐어?’라고 물었을까?'
- week-20.ts:178-215 coreActivity — PLAY1 연결, PLAY2 높이·방향 맞추기, PLAY3 길이 움직여요(뒤 레일 앞으로), PLAY4 바구니 도착
- week-20.ts:357 quickGuide 3 — '어디를 맞추면 계속 갈까?'
- week-20.ts:232-249 art — 반쪽 토마토를 완성해요(나머지 반쪽 자유 완성, 대칭 강요 금지)
- week-20.ts:285 closing.questions — '누가 너를 기다려줘서 좋았어?'
- week-20.ts:298-308 observationGuide — 배려·협력·예술표현
- week-20.ts:321-330 homeConnection — 가족과 함께 토마토 요리 만들기(칼·불은 보호자)
- week-20.ts:50-56 linkedContents — 타이틀송·연계 음원(사용 시점표 없음)

### 21주차

**바꾼 점**
- movement: ‘부채 바람으로 비닐 열기구 띄우기’ → 공식 종이컵·풍선 미니 열기구(빠져나오는 공기로 움직임)
- materials: 비닐봉지·부채·종이 풍선 틀·색 테이프 → 종이컵·풍선·대형 망·지지구조·포토존
- art: ‘모두의 꿈을 그려 붙인 열기구’ → 풍선을 대형 망에 하나씩 넣는 공동작품
- teacherQuestions: ‘열기구는 어떻게 하늘로 올라갈까요?’(원리 설명형) → 가이드는 원리보다 시도를 살리라고 안내, 발문 교체
- music: ‘음악 높낮이에 까치발·쪼그려 앉기’는 가이드에 없음 → 연계 음원·차례 기다리기
- explore: ‘바람 세기 실험’ → 컵 방향 바꿔 다시 시도(PLAY 3)
- safety: 비닐·부채 관련 문구 → 풍선 조각 수거·인원 제한·망 매달리기 금지
- homeConnection: ‘비눗방울·풍선 바람 놀이’ → 공식 ‘우리 집 미니 열기구’
- 주의: 가이드 그림책 인물은 소예·푸푸(character bukgeuki는 지시대로 유지 — 확인 필요)

**근거 (src/lib/weeks/content)**
- week-21.ts:61-85 objectives — 자연탐구·신체운동·건강·예술경험·사회관계·의사소통
- week-21.ts:90-103 preparation.materials — 종이컵·여러 색 풍선(교사가 구멍/슬릿 제작), 대형 망·지지구조·바구니 포토존, 열기구 사진
- week-21.ts:112-115 preparation.safety — 풍선 불기 교사 보조·조각 수거, 출발 방향·대기선, 망에 매달리지 않기
- week-21.ts:107 spaceSetup — 한 번에 3~4명
- week-21.ts:137-143 STEP 1 그림책 — '안 닿으면 다른 방법을 어떻게 찾아볼 수 있을까?'
- week-21.ts:173-210 coreActivity — PLAY1 준비, PLAY2 하나·둘·셋 놓기, PLAY3 컵 방향 바꿔 다시 시도, PLAY4 큰 열기구로
- week-21.ts:357 quickGuide 4 — '무엇을 바꿔볼까?'
- week-21.ts:227-244 art — 우리들의 큰 열기구(풍선을 대형 망에 넣는 공동 미술)
- week-21.ts:281 closing.questions — '잘 안 됐을 때 어떻게 다시 해봤어?'
- week-21.ts:293-307 observationGuide — 호기심·도전·공동표현
- week-21.ts:320-329 homeConnection — 우리 집 미니 열기구

### 22주차

**바꾼 점**
- explore: ‘여러 나라 가을 축제 사진 비교’는 가이드 활동이 아님(유래는 워크북에서 간단히) → 호박등 장면 관찰
- teacherQuestions: ‘다른 나라 축제에서 신기한 점은?’ 삭제 → 그림책·신호·미술 발문
- music: ‘유령처럼·고양이처럼 걷기’ → 가이드는 귀신 흉내보다 자유 표정·동작을 권장, 신호 놀이로 교체
- movement: ‘교실을 돌며 모으기’ → Treat 찾기 / Trick 멈춤 포즈(개인 소유 아닌 공동 바구니)
- homeConnection: ‘다른 나라 축제 이야기 찾기’ → 공식 ‘우리 집 할로윈 간식통’
- materials: 주황·보라 색지·사탕 모형 → 대형 호박 바구니·소프트 사탕·신호 카드·바구니 베이스
- safety: 공포 연출 금지 항목 추가
- nuriAreas: 3개 → 5개 영역

**근거 (src/lib/weeks/content)**
- week-22.ts:61-85 objectives — 예술경험·사회관계·신체운동·건강·의사소통·자연탐구(호박등 빛·모양)
- week-22.ts:90-106 preparation.materials — 대형 호박 바구니, 소프트 사탕 소품, Trick/Treat 신호 카드, 배터리식 호박등, 바구니 베이스·장식
- week-22.ts:115-118 preparation.safety — 소프트 소품, 공포음·큰 소리·깜박임 금지, Trick 때 밀거나 놀래키지 않기
- week-22.ts:140-146 STEP 1 그림책 — '깜짝 놀랐을 때 친구들은 어떻게 했어?', '오늘 밤 숲은 평소와 뭐가 달라졌어?'
- week-22.ts:182-219 coreActivity — Treat 사탕 찾기, Trick 멈춤 포즈('귀신 흉내보다 표정·동작'), 신호 바꾸기, 모두의 바구니
- week-22.ts:366 quickGuide 3 — '지금은 Trick일까 Treat일까?'
- week-22.ts:236-253 art — 나만의 할로윈 바구니(집에서 간식통), '네 바구니는 어떤 표정이야?'
- week-22.ts:295 closing.questions — '다음엔 뭐가 나올지 기다렸던 순간이 있었어?'
- week-22.ts:306-314 observationGuide — 유연함·감정표현·신체조절
- week-22.ts:326-335 homeConnection — 우리 집 할로윈 간식통

### 23주차

**바꾼 점**
- explore: ‘선물상자 흔들어 내용물 추측’은 가이드에 없음 → 선물탑 다시 쌓기·안정적인 순서 생각(PLAY 4)
- art: ‘친구에게 주고 싶은 마음을 그린 선물 상자’ → 가이드는 아이가 받고 싶은 것·함께 하고 싶은 경험을 담는 펼침형 작품
- music: ‘방울 소리에 맞춰 썰매 속도 바꾸기’는 가이드에 없음 → 연계 음원·멈추고 기다리기
- teacherQuestions: ‘받을 때와 줄 때 기분’·‘상자 안에는?’ → 그림책·이동·미술 발문
- materials: 포장지 → 가벼운 선물상자·트리 표식·펼침형 도안
- safety: ‘리본 끈 목에 감지 않기’ → 쌓기 높이·손잡이 길이
- homeConnection: ‘이웃에게 나눔 실천’ → 공식 ‘작품을 함께 열어봐요’
- nuriAreas: 3개 → 5개 영역

**근거 (src/lib/weeks/content)**
- week-23.ts:61-85 objectives — 사회관계·신체운동·건강·예술경험·의사소통·자연탐구
- week-23.ts:90-101 preparation.materials — 가벼운 썰매/판·손잡이, 가벼운 선물상자, 트리 도착 표식, 펼침형 선물상자 도안·색지·스티커·리본
- week-23.ts:112-115 preparation.safety — 썰매에 올라타지 않기, 손잡이 길이, 가벼운 상자, 어깨보다 낮게 쌓기
- week-23.ts:137-143 STEP 1 그림책 — 이름 없는 선물상자, '친구에게 골라준 선물은 왜 그 친구에게 어울렸을까?'
- week-23.ts:182-216 coreActivity — PLAY1 싣기, PLAY2 천천히 끌기(앞 친구 있으면 멈춤), PLAY3 친구 자리 남기며 쌓기, PLAY4 와르르 다시(안정적인 순서)
- week-23.ts:373 quickGuide 2 — '어떻게 옮기면 떨어지지 않을까?'
- week-23.ts:233-250 art — 선물 안에는 무엇이 있을까?(받고 싶은 것·하고 싶은 경험), '물건 말고 같이 하고 싶은 것도 선물이 될까?'
- week-23.ts:292 closing.questions — '선물을 나누니까 어떤 기분이었을까?'
- week-23.ts:303-314 observationGuide — 나눔·협력·신체조절·예술표현
- week-23.ts:326-335 homeConnection — 작품을 함께 열어봐요(사주기 약속 아님)

### 24주차

**바꾼 점**
- movement: ‘여러 나라 인사 동작 따라 하기’ → 공식 ‘지구촌 사진 붙이기’(사진 들고 이동)
- childLines.move: ‘안녕! 니하오! 헬로!’ → ‘사진 들고 지구촌으로!’
- teacherQuestions·childLines.explore: ‘다르지만 같은 점은?’ → 가이드는 ‘다르지만 같다’가 아니라 ‘닮은 즐거움’으로 표현하라고 명시
- teacherQuestions: ‘24주 동안 가장 즐거웠던 수업’ → 사진 연결 발문
- music: ‘여러 나라 동요 리듬 손뼉’은 가이드에 없음 → 연계 음원·한 팀씩 출발
- materials: 세계 어린이 그림 카드·지구 모양 큰 종이 → 대형 지구촌 판·17~23주 활동사진·국가 표식·벨크로
- safety: ‘실제 사진 대신 그림 카드’ → 가이드는 실제 활동사진을 씀. 안전 항목을 부착 방식·이동으로 교체
- homeConnection: ‘세계 지도 보며 가고 싶은 나라’ → 공식 ‘우리도 이렇게 놀아요!’
- closingQuestion: ‘24주 동안 새로 할 수 있게 된 것’ → 가이드 마무리 발문
- nuriAreas: 3개 → 5개 영역

**근거 (src/lib/weeks/content)**
- week-24.ts:29-31 beforeStart.teacherRoles — ‘우리가 그 나라에 다녀왔다’로 표현 금지, “다르지만 같다”가 아니라 “닮은 즐거움”
- week-24.ts:63-87 objectives — 예술경험·사회관계·의사소통·자연탐구·신체운동·건강
- week-24.ts:92-108 preparation.materials — 대형 지구촌 판, 17~23주 활동사진, 국가/문화 표식, 벨크로, 태극기 기본 도안·빨강·파랑 재료
- week-24.ts:121-124 preparation.safety — 고정, 핀·압정 금지, 한 팀씩 출발
- week-24.ts:154-160 STEP 1 그림책 — '사는 곳이 달라도 닮은 즐거움이 있을까?'
- week-24.ts:199-236 coreActivity — 사진 들고 이동해 붙이기, '무엇이 닮았고 무엇이 다를까?', 대한민국 영역에 주말 놀이사진
- week-24.ts:390 quickGuide 3 — '어느 장면과 닮았을까?'
- week-24.ts:256-273 art — 나만의 태극기(기본 구조 존중, 표현은 자유), '친구 작품과 무엇이 달라?'
- week-24.ts:312 closing.questions — '우리 사진까지 붙이니 지구촌 판이 어떻게 달라졌어?'
- week-24.ts:322-337 observationGuide — 친구·연결·문화적 존중
- week-24.ts:350-359 homeConnection — 우리도 이렇게 놀아요!(주말 놀이사진 한 장)
