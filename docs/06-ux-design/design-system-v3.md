# Design System V3 — "Warm Atelier"

> 상태: **IMPLEMENTED (branch `ui-brand-renewal`) · 리뷰 대기** · 2026-10-01
> 근거 결정: DEC-109 (Warm Premium · Target palette · Yellow 제외 · Pretendard · serif 제거) · DEC-110 (반응형 · WCAG 2.2 AA baseline) · DEC-097 (역할별 App Shell) · DEC-111/112 (상태 · 문구)
> 토큰 원본: [`src/app/globals.css`](../../src/app/globals.css) · 컴포넌트: [`src/components/ui/`](../../src/components/ui/)

V3 는 DEC-109 의 결정을 **코드 전체에 실제로 적용**한 버전이다. V2 까지는 결정은 있었지만 코드에 두 팔레트(마케팅 navy/yellow · 운영 brand-navy)가 공존했고, 글자 크기 1,196곳이 임의 px 였다.

---

## 1. 진단 요약 (V2 기준)

| 영역 | 문제 | 수치 |
|---|---|---|
| 색 | 팔레트 두 벌 공존 · 거의 같은 navy 2개 · ivory 3개 · Yellow 잔존(DEC-109 위반) | `navy` 1,833회 vs DEC-109 `brand-navy` 21회 |
| 대비 | 흰 바탕 위 yellow eyebrow 1.9:1 · `text-navy/40~60` 보조 글자 3.1~4.1:1 | 535곳 AA 미달 |
| 타이포 | 임의 px 글자 크기 · 11px 이하 글자 · serif italic(OS마다 다른 글꼴) | `text-[NNpx]` 1,196곳 · serif 8곳 |
| 선 | navy 투명도 25단계 | `border-navy/*` 325곳 |
| 컴포넌트 | 버튼 클래스 22갈래 · 직접 만든 모달 15개(focus trap 없음) · 상태 색 지도 8벌 · 표 셀 클래스 3벌 | — |
| 구조 | 공개 메뉴가 홈 밖에서 동작 안 함(`#anchor`) · skip link 없음 · loading/error 경계 없음(admin · sales) | — |
| 홈 | 19개 섹션 · 같은 ivory 바탕 연속 · 세로 여백 3종 · "사진 Placeholder" 노출 · 요금 카드 CTA 가 오버레이 2개를 동시에 엶 | — |

## 2. 방향 — 세 가지 안과 선택

| | A. Warm Atelier ★ | B. Clear Classroom | C. Gallery Editorial |
|---|---|---|---|
| 키워드 | 따뜻함 · 신뢰 · 정돈 · 작업실 | 명료 · 밝음 · 효율 | 전시 · 작품 · 여백 |
| 무드 | 아이보리 종이 위 Navy 잉크, Coral 한 점 | 흰 바탕 · 하늘색 · 시원한 회색 | 큰 사진 · 극단적 여백 · 세리프 제목 |
| 색 | Navy · Green · Coral · Ivory (DEC-109 그대로) | Blue · Sky · Gray | 흑백 + Coral |
| 타입 | Pretendard 단일 · 제목 -0.03em | Pretendard · 가벼운 굵기 | 세리프 제목 + 산세리프 본문 |
| 컴포넌트 | 둥근 모서리 10~18 · 선 중심 카드 · 그림자 최소 | 각진 카드 · 그림자 | 테두리 없는 이미지 블록 |
| UX 감각 | 차분 · 안정 · 운영 도구와 마케팅이 한 제품 | 병원 · 공공 서비스처럼 중립 | 브랜드 사이트로는 강하나 운영 화면엔 부적합 |

**선택: A.** 이미 승인된 DEC-109 와 충돌이 없고(B 는 Coral/Green 을, C 는 serif 금지를 어긴다), 원장 · 교사 · 본사 운영 화면까지 같은 재료로 확장할 수 있는 유일한 안이다. "아동 교육이지만 유치하지 않은 프리미엄"이라는 목표에 따뜻한 바탕 + 깊은 Navy 조합이 가장 직접적으로 답한다.

## 3. 토큰

### 3-1. 색 (Tailwind 유틸리티 이름)

| 역할 | 토큰 | 값 | 쓰임 |
|---|---|---|---|
| primary | `primary` · `primary-hover` · `primary-active` · `primary-soft` | #142B4A · #1D3A60 · #0E2039 · #E9EEF5 | 주 버튼 · 활성 메뉴 · 제목 |
| secondary | `secondary` · `secondary-strong` · `secondary-soft` | #2F8F6B · #257A5A · #EDF7F2 | 긍정 · 완료 · 아이콘 강조 |
| accent | `accent` · `accent-strong` · `accent-soft` · `accent-on-dark` | #F1644B · #C2412B · #FDEFEA · #FFAB98 | eyebrow · 활성 표시선 · BEST · 하이라이트 (오류 색 아님) |
| neutral | `ink` · `ink-muted` · `ink-subtle` | #263238 · #5B6770 · #77818A | 본문 · 보조 글자(5.8:1) · 비활성(18px 이상만) |
| bg / surface | `bg`(=`ivory`) · `surface` · `surface-soft` · `surface-warm` · `muted` | #F8F5EE · #FFF · #F2EEE5 · #FBF9F4 · #F3F4F6 | 페이지 · 카드 · 섹션 리듬 · 표 머리 · 비활성 |
| border | `border` · `border-strong` · `control-border` · `line` · `line-soft` · `line-strong` | #E7E9EC · #D3D8DE · #8A949E · navy 12% · 7% · 22% | 카드 · 구분선 · 입력칸 경계(3.08:1) |
| success | `success` · `success-text` · `success-soft` · `success-border` | #2F8F6B · #257A5A · #EDF7F2 · #B8DFCB | |
| warning | `warning` · `warning-text` · `warning-soft` · `warning-border` | #B26B00 · #8A5300 · #FFF6E5 · #F0D4A2 | 확인 필요 · 초안 |
| error | `danger` · `danger-hover` · `danger-soft` · `danger-border` | #B42318 · #8F1C13 · #FDECEA · #F4C4BF | 되돌릴 수 없는 일 · 오류 |
| info | `info` · `info-text` · `info-soft` · `info-border` | #245C99 · #1D5487 · #EDF5FA · #C3D9EC | 예정 · 안내 · 링크(`trust-blue`) |

기존 이름(`navy` · `ivory` · `trust-blue` …)은 **값만 DEC-109 로 바꿔 유지**했다 — 1,800곳을 한 번에 같은 색으로 만들고, 새 코드는 의미 토큰을 쓴다. Yellow 토큰은 삭제했다.

### 3-2. 타이포그래피 (Pretendard Variable 단일)

| 토큰 | 크기 / 행간 | 쓰임 |
|---|---|---|
| `text-display` | 34→60px / 1.16 · -0.035em | Hero 한 곳 |
| `text-h1` · `text-h2` · `text-h3` | 30→44 · 28→42 · 19→24px | 마케팅 페이지 제목 · 섹션 제목 · 블록 제목 |
| `text-lead` | 17→19px / 1.72 | 제목 아래 안내문 |
| `text-headline-lg` · `text-headline` | 28 · 24px | KPI 숫자 · **앱 페이지 h1(24px)** |
| `text-title-lg` · `text-title` · `text-title-sm` | 22 · 20 · 18px | 대화상자 · 카드 제목 · 앱 섹션 h2 |
| `text-body-lg` · `text-body` · `text-body-sm` | 17 · 16 · 15px / 1.66~1.72 | 본문 · 앱 본문 · **input** |
| `text-label` | 14px / 1.55 | 라벨 · 버튼 · 표 본문 |
| `text-caption` | 13px / 1.55 | 보조 설명 · 메타 |
| `text-micro` | 12px / 1.5 | 배지 · 표 머리 — **최소 크기** |

한글 규칙: `word-break: keep-all` · 본문 자간 -0.011em · 제목 -0.025em · `text-wrap: balance`(제목) · `pretty`(문단). 굵기는 본문 400 · 라벨 600 · 제목 700.

### 3-3. 간격 · 곡률 · 그림자 · 컨테이너

- **간격**: Tailwind 4px 그리드. 섹션 세로 여백 `py-20 sm:py-24 lg:py-28`(마케팅 표준) · `py-16 sm:py-20 lg:py-24`(짧은 섹션). 앱 본문 `py-7 lg:py-10`.
- **곡률**: `sm` 6 · `md` 8 · `lg` 10(입력칸 · 앱 버튼) · `xl` 14 · `2xl` 18(카드) · `3xl` 24(시트 · 인증 카드) · `full`(칩 · 마케팅 CTA).
- **그림자**: `shadow-soft`(버튼 한 겹) · `shadow-card`(hover 시 카드 · 인증 카드) · `shadow-elevated`(dialog · popover · 떠 있는 카드) · `shadow-cta`(주 버튼 hover). 카드는 기본적으로 **선**으로 구분한다.
- **컨테이너**: 마케팅 1280(본문 1200) · 교사/원장 1100 · 본사 사이드바 248 + 본문 최대 1440 · 인증 488 / 1120 · 학부모 640.
- **모션**: 120 · 200 · 320ms · `ease-standard` / `ease-out-soft` · `animate-fade-in` · `animate-rise-in` · `animate-sheet-in` · `skeleton`. `prefers-reduced-motion` 에서 전부 정지.

## 4. 컴포넌트 규칙

| 컴포넌트 | 파일 | 규칙 |
|---|---|---|
| Button (마케팅) | `ui/Button.tsx` | `primary`(Navy) · `secondary` · `tertiary`(테두리) · `inverse`(어두운 섹션 위 흰 면) · `inverse-outline` × `md` 48 / `lg` 56px. 한 화면 primary 하나. |
| Button (앱) | `ui/app-button.ts` | `appButton({tone, size})` — primary · secondary · ghost · danger · danger-outline × sm 36 · md 44 · lg 48 · class 56px. 상태: hover 한 단계 진하게 · active 1px 눌림 · disabled 50% + pointer-events 없음 · focus 전역 2px 링. |
| Input · Select · Textarea | `ui/field.ts` | 44px(인증 48) · `control-border` 3.08:1 · hover 진하게 · focus 파란 테두리 + 4px 옅은 링 · `aria-invalid` → danger 테두리 · 15px 글자. `fieldHint` · `fieldError` 로 도움말/오류. |
| Card | `ui/Card.tsx` · `surface.tsx SectionCard` | 흰 면 · `border-line` · `rounded-2xl` · 패딩 20/24 · hover 시에만 그림자. |
| Modal | `ui/Dialog.tsx` | 하나만 쓴다. focus trap · 초기 focus · 복귀 · Esc · 스크롤 잠금 · 모바일 bottom sheet · `size` sm 480 / md 560 / lg 720 · 열릴 때 rise-in. |
| Table | `ui/table.ts` | `tableHeadCell`(12px 굵게 · 옅은 바탕) · `tableCell`(14px) · `tableRow`(hover primary-soft). 좁은 화면은 카드 목록으로 바꾸거나 표 영역 안에서만 가로 스크롤. |
| Badge | `surface.tsx StatusPill` · `lib/admin/*_BADGE_CLASSES` | 둥근 칩 + 앞 점 + 한국어 라벨. done=success · active=navy · scheduled=info · pending=warning · cancelled=danger · neutral. 색만으로 의미를 전하지 않는다. |
| Tabs / Nav | `StaffShell` · `AdminNav` · `SalesNav` | 현재 위치 `aria-current="page"` + 시각 표시(Coral 밑줄 / 왼쪽 막대 / 옅은 면). 44px 이상. |
| Navbar · Sidebar | `layout/Header` · `AppMark` · admin layout | 공개: sticky · 스크롤 시 면 밀도 · xl 미만 접힘 메뉴(Esc · focus 복귀). 앱: 교사/원장 상단 탭 · 본사 lg+ 사이드바 · 영업 상단 메뉴. 모든 셸에 skip link. |
| Section header | `ui/SectionHeader.tsx` | eyebrow(Coral 선 + 대문자 12px) · `text-h2` · `text-lead`. |
| Empty state | `surface.tsx EmptyState` | 아이콘 + 무엇이 없는지 + 왜 + 다음 행동. 점선 테두리. |
| Loading | `surface.tsx Skeleton · LoadingPanel` · `staff/RouteLoading` | 화면 뼈대 skeleton · `role="status"`. 모든 운영 경로에 `loading.tsx`. |
| Error | `surface.tsx ErrorState` · `staff/StaffRouteError` | 내부 오류 문구를 보여 주지 않는다 · 다시 시도 + 이전 화면. admin · sales · teacher · director `error.tsx`. |
| Alert | `app-button.ts notice*` | 색 + 왼쪽 4px 선 + 문구. role 은 쓰는 곳에서(status · alert · note). |
| CTA | `forms/LeadCtaButton` | 어두운 섹션 위에서는 `inverse` · 카드 안에서는 클릭 전파를 막는다. 비홈 페이지 fallback `/#contact`. |

## 5. 바꾸지 않은 것 (계약)

E2E · 소스 정규식 테스트가 의존하는 것은 그대로다: 로그인 폼 `name="email"/"password"` · 첫 `form button[type="submit"]` · `id={errorId} role="alert"` · `aria-invalid/aria-describedby` 각 2회 · 교사 h1 "오늘의 수업" · 카드당 `/before` 링크 1개 · `section[aria-labelledby="capability-title"]` · `textarea name="reason" required maxLength={500}` · hidden `expectedUpdatedAt` · 원장 nav 에 "홈" 없음 · `/` 번들의 Supabase client(LeadForm) · 모든 문구. 기능 · 라우팅 · 인증 · 데이터 · Supabase 연동 변경 0.

`phase09c/qa_fixes.test.mjs` 는 글자 크기 토큰 이름(`text-micro` · `text-caption`)도 받도록 정규식만 넓혔다 — 검사하는 규칙(44px 목표)은 같다.

## 6. 다음 단계

PR 리뷰 → Staging Preview 에서 4개 역할 시각 확인 → `ui_audit.mjs` 기준선 재측정 → DEC 기록(V3 채택) 순서로 닫는다.
