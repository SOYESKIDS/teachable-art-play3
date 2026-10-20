import localFont from "next/font/local";

/**
 * 공개 체험 화면(홈 · /experience/*) 전용 글꼴 — 화면에 쓰인 글자만 담은 서브셋.
 *
 * ★ 왜 — 모바일 첫 화면이 Pretendard · Jua 글꼴 조각 32개(약 695KB)와 수백 개의
 *   @font-face 선언(렌더링을 막는 CSS)을 기다렸다 (2026-10-20 Lighthouse 측정).
 *   이제 파일 두 개(약 200KB), 선언 두 개다.
 * ★ 모양은 같다 — TAP Play Sans = Pretendard Variable 서브셋, TAP Play Display = Jua 서브셋.
 *   OFL 예약 이름 규칙에 따라 서브셋은 이름을 바꿨다 (라이선스: ./OFL-*.txt).
 * ★ 목록에 없는 글자는 globals.css `.play` 스택에서 원래 Pretendard 로 대체된다.
 *   만들기 · 검사: scripts/subset-play-fonts.py · tests/play-fonts.test.mjs
 */
export const playSans = localFont({
  src: "./tap-play-sans.woff2",
  // 굵기 축을 공개 체험이 쓰는 범위(400~800)로 좁혔다 — scripts/subset-play-fonts.py SANS_WEIGHT_RANGE
  weight: "400 800",
  variable: "--font-play-sans",
  display: "swap",
});

export const playDisplay = localFont({
  src: "./tap-play-display.woff2",
  weight: "400",
  variable: "--font-play-display",
  display: "swap",
});
