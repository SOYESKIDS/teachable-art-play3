# 2026 공개 체험 개편 (feat/classroom-redesign-20261020)

기준: `5619914` · 보존 브랜치 `backup/platform-before-redesign-20261020`

## 무엇이 바뀌었나

| 영역 | 경로 | 데이터 |
|---|---|---|
| 새 홈 (PLAYFUL PREMIUM EDUCATION) | `/` | 정적 · 서버 데이터 없음 |
| 체험 입구 | `/experience` | `src/data/experience` |
| 24주 탐색 | `/experience/weeks` | 〃 |
| 주차 상세 (1~24) | `/experience/weeks/[weekNo]` | 〃 · 빌드 때 24장 생성 |
| 교실 플레이어 (1~24) | `/experience/classroom/[weekNo]` | 〃 · 진행 상태는 브라우저 탭(sessionStorage)에만 |
| 가상 성장 리포트 | `/experience/report` | `src/data/experience/report.ts` |

로그인 기반 실제 기능(`/teacher` · `/director` · `/admin` · `/sales` · `/learning` · `/class` · 보호자 공유)은 바꾸지 않았다.

## 콘텐츠 출처 구분

- **official** — 주차명 · 성장 키워드 · 핵심 메시지 · 수업 시간 · 대표 활동 · 결과물 · 주차 색 (`src/lib/weeks/week-index.ts`, 읽기만 한다)
- **adapted** — 4주차. 공식 가이드의 수업 흐름을 체험용으로 짧게 재구성 (본사 검수 전)
- **demo_draft** — 나머지 23주의 본문. 체험용으로 새로 쓴 임시 구성 → 화면에 「체험용 구성 · 정식 교안 확정 전」 표시

공식 교안 전사본(`src/lib/weeks/content`)은 본사 검수 전(draft)이라 공개 화면에 싣지 않는다 (기존 원칙 유지).
임시 본문은 `src/data/experience/demo-lessons.ts` 한 파일에만 있고 DB 교안 테이블에 쓰지 않는다.

## 이미지

- 사진 · 그림: 이미 사이트에서 쓰던 `public/images/site/**` 만 사용
- 캐릭터: **꺼져 있다** (`src/data/experience/characters.ts` · `CHARACTERS_ENABLED = false`, 2026-10-20 사용자 지시).
  - 사용권 확인 전이라 공개 Preview · 저장소(공개 GitHub)에 캐릭터 그림을 싣지 않는다. 배경을 지운 파일은
    git 에서 제외된 `design-references/characters-cutout/` 에만 있고, `public/` 에는 없다 (테스트로 고정).
  - 자리마다 자체 제작 소품 일러스트(`src/components/play/Doodles.tsx` — 물감 팔레트 · 무지개 · 크레용 ·
    새싹 화분 · 별 연 · 작은 북 · 풍선 행렬)가 대신 들어간다. 캐릭터 모양을 흉내 내지 않는다.
  - 사용권이 확인되면: `node scripts/cutout-characters.mjs <참고폴더> public/images/characters` → 플래그 true.
  - 캐릭터가 들어갈 자리

    | 화면 | 자리 | 캐릭터 키 | 대체 그림 |
    |---|---|---|---|
    | 홈 히어로 | 큰 그림 왼쪽 아래 (단체) | 전체 | 풍선 행렬 |
    | 홈 히어로 | 큰 그림 오른쪽 위 | cat | 새싹 화분 |
    | 홈 24주 지도 | PART 1 · 2 · 3 카드 사진 오른쪽 아래 | pupu · bukgeuki · ella | 팔레트 · 연 · 무지개 |
    | 홈 교실 플레이어 미리보기 | 화면 왼쪽 아래 | cat | 새싹 화분 |
    | 홈 마무리 | 왼쪽 · 오른쪽 아래 | ubi · maru | 북 · 크레용 |
    | 체험 입구 | 대표 그림 오른쪽 아래 (단체) | 전체 | 풍선 행렬 |
    | 24주 탐색 | 상단 사진 오른쪽 아래 | ella | 무지개 |
    | 주차 표지(큰 그림) | 왼쪽 아래 | 주차별 (demo-lessons.ts) | 주차별 소품 |
    | 주차 카드(작은 그림) | 왼쪽 아래 | 주차별 | 없음 — 주제 그림을 가운데 크게 |
    | 교실 플레이어 | 교실 화면 왼쪽 아래 | 주차별 | 주차별 소품 + 주제 그림 |
    | 가상 리포트 | 머리 오른쪽 | pupu | 팔레트 |
- 주차 전용 사진이 없는 21주는 주차 색 + 자체 SVG 주제 그림(`src/components/play/Motif.tsx`) + 캐릭터로 표지를 그린다.
- 참고 폴더의 VOD 장면 캡처(제목 로고가 박힌 화면)는 사이트에 넣지 않았다.

### 새로 만들면 좋은 이미지 (생성 도구가 연결되지 않아 만들지 않음)

모두 WebP · 4:3 · 1600×1200 이상 · 실제 아이 얼굴 대신 일러스트 권장. 저장 후 `src/data/experience/media.ts` 의 `WEEK_MEDIA` 에 한 줄 추가.

| 파일 | 프롬프트 (요약) |
|---|---|
| `public/images/activities/week-02-medal.webp` | 밝은 유치원 교실, 아이들이 콩주머니 미션 후 금색 종이 메달을 목에 걸고 웃는 장면, 파스텔 3D 일러스트 |
| `public/images/activities/week-03-bracelet.webp` | 아이들이 색 구슬로 마음 팔찌를 만들어 친구에게 건네는 장면, 따뜻한 조명 |
| `public/images/activities/week-05-flower.webp` | 색종이 꽃잎으로 각자 다른 꽃을 만들어 꽃밭처럼 모아 둔 탁자 |
| `public/images/activities/week-06-base.webp` | 큰 상자와 천으로 만든 비밀기지 안팎에서 노는 아이들 |
| `public/images/activities/week-07-butterfly.webp` | 데칼코마니 나비 작품이 창가에 줄지어 붙어 있는 교실 |
| `public/images/activities/week-08-forest.webp` | 아이들 작품을 모아 만든 큰 숲 현수막 앞 단체 장면(뒷모습) |
| `public/images/activities/week-09-bouquet.webp` | 꽃잎이 흩날리는 봄 교실, 종이 꽃다발 |
| `public/images/activities/week-10-bugs.webp` | 돋보기로 곤충 그림 카드를 보는 아이들, 여름 색감 |
| `public/images/activities/week-11-hula.webp` | 꽃목걸이와 비닐 훌라치마를 입고 춤추는 상상 여행 장면 |
| `public/images/activities/week-12-scarecrow.webp` | 가을 산물로 꾸민 알록달록 허수아비 공동 작품 |
| `public/images/activities/week-13-moon.webp` | 보름달 아래 복주머니를 든 아이들, 전통 색감 |
| `public/images/activities/week-15-bell.webp` | 종이컵 방울 마음벨을 흔드는 손 클로즈업 |
| `public/images/activities/week-19-drum.webp` | 원통 상자 북과 나무 스틱으로 함께 연주하는 아이들 |
| `public/images/activities/week-21-balloon.webp` | 큰 종이 열기구 공동 작품을 올려다보는 아이들 |
| `public/images/activities/week-24-globe.webp` | 지구 모양 큰 종이에 세계 어린이 그림 카드를 붙이는 장면 |
| `public/images/hero/hero-play-wide.webp` (2400×1200) | 그림책 · 몸짓 · 미술이 한 화면에 이어지는 넓은 교실 일러스트 (캐릭터 없이 — 사용권 확인 후 별도 합성) |
| `public/images/hero/hero-play-mobile.webp` (1200×1500) | 위 장면의 세로 구도 — 모바일 히어로용, 아이들 손과 재료가 화면 아래 절반에 |

## 되돌리기

- 홈만: `git restore --source backup/platform-before-redesign-20261020 -- src/app/page.tsx` (이전 홈 섹션 컴포넌트는 `src/components/home` 에 그대로 있다)
- 전부: 이 브랜치를 쓰지 않고 `feat/platform-finish-20261012` 에서 계속한다.

## Preview 배포 순서 (Production DB 차단)

이 브랜치에는 Vercel 브랜치 전용 Preview 환경변수가 없어, 그대로 push 하면 **공통 Preview 값
(Production Supabase `vpppx…` · 공통 비밀키)** 으로 빌드된다. 그리고 Vercel 은 GitHub 에 아직 없는
브랜치에는 전용 환경변수를 만들 수 없다 (`branch_not_found`).

1. `vercel.json` 에 `git.deploymentEnabled: { "feat/classroom-redesign-20261020": false }` 를 넣은 커밋으로
   첫 push → 브랜치만 생기고 배포는 일어나지 않는다.
2. 브랜치 전용 Preview 환경변수 등록 (Production · 공통 Preview · 다른 브랜치는 그대로):
   `NEXT_PUBLIC_SUPABASE_URL`(Staging) · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(Staging) · `CONTENT_SOURCE=database` ·
   `SUPABASE_PRODUCTION_PROJECT_REF=vpppxuhodwauaclhybtg` · `BLOCK_WRITES_ON_PRODUCTION_DATA=1` ·
   `PORTAL_THROTTLE_SALT`(새 값) · 상속 차단용 빈 값 `SUPABASE_SECRET_KEY` · `OPENAI_API_KEY`
3. `vercel env pull --git-branch` 로 URL 이 Staging 인지 확인 → 배포를 켜는 커밋 push → Preview 번들의 Supabase ref 확인.
