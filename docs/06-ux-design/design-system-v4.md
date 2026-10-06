# Design System V4 — Warm Atelier · Calm Operations

> PHASE DESIGN-FINAL · 2026-10-06 · branch `design-final-polish` · **visual source of truth**
> 선행: [design-system-v3.md](./design-system-v3.md)(토큰 도입) · [final-design-audit.md](./final-design-audit.md)(감사) · copy 는 [final-content-system.md](./final-content-system.md)
> 원본 코드: `src/app/globals.css` · `src/components/ui/*` · `src/components/home/HomeSection.tsx`

느낌: 따뜻함 · 신뢰 · 전문성 · 여백 · 질서. 피한다: AI 스타트업 · fintech 대시보드 · 무거운 CRM · 장난감 사이트 · 템플릿 랜딩.

## 1. Color

| 토큰 | 값 | 역할 |
|---|---|---|
| `navy` = `primary` | #142B4A | 구조 · primary CTA · 제목 |
| `secondary` | #2F8F6B | 성장 · 완료 · **기록**(콘텐츠 · 수업의 "관찰 기록" 단계) |
| `accent` | #F1644B | 강조선 · eyebrow · 진행 표시 (**오류 색 아님**) |
| `ivory` = `bg` | #F8F5EE | 브랜드 바탕 |
| `brand-mint` / `secondary-soft` | #EDF7F2 | 성장 · 결과 보조 면 |
| `brand-sky` / `info-soft` | #EDF5FA | 안내 · 준비 중 기능 보조 면 |
| `ink` | #263238 | 본문 |
| `border` / `hairline` | #E7E9EC | 선 |
| `danger` · `warning` · `success` · `info` (+ `-soft` · `-border` · `-text`) | | 상태 전용 |

규칙
- **Navy 면은 화면당 1~2곳**: 홈은 8주 "하나의 숲"(목적지) · Final CTA 패널 · Footer 뿐이다. 결론 문장 · AI 안내 · 데모 상자 · 상품 카드에는 navy 면을 쓰지 않는다.
- 성공/오류 메시지는 `success-*` · `danger-*` 만. V4 에서 예전 `soft-coral` · `soft-green` · `light-blue` 토큰을 **삭제**했다(41곳 교체).
- 금지: 보라 그라디언트 · neon · glassmorphism · 모든 카드에 색 · rainbow.

## 2. Type (Pretendard Variable)

| 토큰 | 크기 | 쓰임 |
|---|---|---|
| `text-display` | 34 → 56 / 1.16 | Hero H1 |
| `text-h1` | 30 → 44 | 상품 · 법적 고지 페이지 제목 |
| `text-h2` | 26 → 36 / 1.3 | 홈 섹션 제목 |
| `text-h3` | 20 → 24 | 카드 · 블록 제목 |
| `text-lead` | 17 → 19 / 1.72 | 섹션 설명 |
| `text-headline` · `-lg` | 24 · 28 | 앱 페이지 h1 · KPI 숫자 |
| `text-title-lg` · `title` · `title-sm` | 22 · 20 · 18 | 대화상자 · 카드 · 앱 h2 · **상품 가격** |
| `text-body-lg` · `body` · `body-sm` | 17 · 16 · 15 | 본문 · input |
| `text-label` · `caption` · `micro` | 14 · 13 · 12 | 라벨 · 보조 · 배지(최소) |
| `eyebrow` | 12 · 0.14em · 대문자 | **영문** 라벨 |
| `eyebrow-ko` | 13 · 자간 0 | **한글** 라벨 (한글은 자간을 벌리지 않는다) |

## 3. Spacing (4px 시스템)

4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96.
- 섹션: `py-16 sm:py-20 lg:py-24` (64/80/96) · 짧은 섹션 `py-12 sm:py-16 lg:py-20`.
- 섹션 머리 → 본문 `mt-12`(48) · 카드 패딩 20/24 · 폼 간격 16~20 · 버튼 간격 8~12.
- 임의 margin 은 아이콘 기준선 맞춤(`mt-[3px]` 등)에만.

## 4. Radius

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `rounded-md` | 8 | 배지 · 작은 칩 |
| `rounded-lg` | 10 | input · 앱 버튼 |
| `rounded-xl` | 12 | 작은 면 · 표 감싸기 · 상태 칸 |
| `rounded-2xl` / `--radius-card` | 16 | 카드 |
| `rounded-3xl` | 20 | 큰 면 · 섹션 패널 · 인증 카드 |
| `rounded-full` | — | 칩 · 마케팅 CTA |

운영 화면(교사 · 원장 · 본사 · 영업)은 카드 16 · 표 12 를 넘기지 않는다.

## 5. Shadow

| 토큰 | 쓰임 |
|---|---|
| `shadow-soft` | 버튼 한 겹 |
| `shadow-card` | 공개 화면 카드 hover · 인증 카드 |
| `shadow-elevated` | dialog · drawer · 떠 있는 수업안 카드 · 하단 고정 바 |
| `shadow-cta` | primary 버튼 hover |

**운영 화면 카드에는 그림자를 쓰지 않는다** — 테두리 · 바탕 · 여백으로 구분 (SessionCard · TodayFocusPanel 에서 제거).

## 6. Surface

| 면 | 쓰임 |
|---|---|
| ivory | 페이지 바탕 · 홈 섹션 1 |
| white | 카드 · 홈 섹션 2 |
| sand(`surface-soft`) | 홈 섹션 3 · 상태 칸 |
| info-soft · secondary-soft | 안내 · 결과 보조 면 |
| navy | 목적지 · 결정 지점 (1~2곳) |

홈 바탕 순서: ivory → white → ivory → sand → white → white → ivory → white → sand → white → ivory → white → ivory(CTA 패널) → navy-deep(Footer). Final CTA 는 ivory 섹션 안의 navy 패널이라 Footer 와 붙지 않는다.

## 7. Buttons

| 마케팅 `buttonClasses` | 앱 `appButton` |
|---|---|
| primary — navy 면 (화면당 1) | primary — navy 면 |
| secondary — **navy 테두리 · 흰 면** (V4) | secondary — control-border 테두리 · 흰 면 |
| tertiary — 옅은 테두리 | ghost — 면 없음 |
| inverse · inverse-outline — 어두운 면 위 | danger · danger-outline |

상태: hover 한 단계 진하게 · active 1px 눌림 · focus-visible 2px 링 · disabled 50~55% · loading = 문구("저장 중…") 또는 spinner(로그인).
CTA 위계: Header/Hero primary = 도입 상담 · 상품 카드 = secondary · 데모 = secondary · 파일럿 = tertiary.

## 8. Forms (`field.ts`)

높이 44(대화상자 · 필터) · 48(인증) · 테두리 `control-border`(3.08:1) · hover 진하게 · focus 파란 테두리 + 4px 옅은 링 · `aria-invalid` → danger · disabled = muted 면. 도움말 `fieldHint` · 오류 `fieldError` · 성공/오류 상자 = `success-*` / `danger-*`.

## 9. Tables (`table.ts`)

머리 12px 굵게 · 옅은 바탕 · 본문 14px · 행 hover `primary-soft/50` · 숫자 · 날짜 `tabular-nums` 오른쪽 정렬 · 상태 = 배지 · 행동 = 오른쪽 끝. 모바일: 같은 DOM 을 카드 행으로 재배치(인터랙티브 표) 또는 카드 목록 + md 이상 표(읽기 전용).

## 10. Badges

| 운영 상태 (`StatusPill` · `*_BADGE_CLASSES`) | Growth5 단계 |
|---|---|
| 둥근 칩 + 점 + 라벨 · 색 = 의미(done green · active navy · scheduled info · pending warning · cancelled danger · neutral) | **칩이 아니다** — 같은 크기 · 같은 색의 칸(라디오 · 정의 목록). 높낮이 · 색 단계 없음 |

`AvailabilityTag`(공개): 포함 green · 준비 중 warning · STANDARD 이상 / 계약 범위 info.

## 11. Navigation

- 공개 Header: sticky · 스크롤 시 높이 68→60(lg 76→64) · 면 밀도 증가 · xl 미만 접힘 메뉴(Esc · focus 복귀) · skip link.
- 교사 · 원장: 상단 탭 · 활성 = coral 밑줄 + `aria-current`.
- 본사: lg+ 사이드바 248 · 활성 = primary-soft + coral 막대.
- 영업: 상단 메뉴 · 활성 = primary-soft.
- 모바일 하단 고정 CTA: 390px 에서 Footer 마지막 링크 하단(683) < 바 상단(771) — 가리지 않음. Footer 하단 여백 `8rem + safe-area`.

## 12. Dashboard

STATUS → NEXT ACTION → PROGRESS → EXCEPTION. 교사 보드 섹션 머리에 색 막대: 오늘 navy · 진행 중(다른 날) info · 지난 예정 warning · 일정 미정 neutral (문구 추가 없음). "오늘 먼저 할 수업" 패널 = 왼쪽 4px navy 선(그림자 없음).

## 13. Empty states

`EmptyState`(아이콘 · 무엇이 없는지 · 왜 · 필요할 때만 행동). 본사 문의 · 기관 목록도 같은 컴포넌트로 통일. "0" 하나 · 큰 빈 상자만 두지 않는다.

## 14. Responsive

검증 폭: 390 · 430 · 768 · 1024 · 1280 · 1366 · 1440 · 1600. 공개 5페이지 × 8폭 = 가로 넘침 0 · 잘린 글자 0(sr-only 제외) · 콘솔 오류 0 · h1 1개 · heading 건너뜀 0.
- 8주 여정: lg+ 세 묶음 가로 + 사이 → 표시, 그보다 좁으면 세로 + ↓ 표시.
- 도입: xl+ 가로 타임라인, 그보다 좁으면 세로.

## 15. Accessibility (WCAG 2.2 AA 목표)

heading 순서 · 버튼/링크 구분 · focus-visible(어두운 면은 흰 링) · skip link · Dialog focus trap · Esc · 라벨 · `aria-invalid`/`aria-describedby` · 44px 목표 · 상태는 색 + 글자 · `prefers-reduced-motion` 에서 애니메이션 정지.

## 16. Motion

허용: fade-in · rise-in(대화상자) · sheet-in(모바일 시트) · hover 1px · 아코디언 · header 높이 200ms. 금지: 스크롤 트리거 · parallax · 떠다니는 요소 · 연속 움직임 · glow.
