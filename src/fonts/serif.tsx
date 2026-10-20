import type { ReactNode } from "react";
import { Noto_Serif_KR } from "next/font/google";

/**
 * 제목·이야기용 명조 (Noto Serif KR).
 *
 * ★ 왜 추가하는가 — `font-serif` 는 Tailwind 기본값이 라틴 세리프 스택
 *   (ui-serif, Georgia, Times …)이라 **한글에는 아무 글꼴도 지정하지 않는
 *   것과 같다.** 기기 기본 명조(Windows 바탕 · macOS 애플명조)로 떨어져
 *   화면마다 다르게 보인다. 그래서 글꼴을 직접 싣는다.
 * ★ 굵기 2종만 — 제목 700, 큰 인용 500. 본문에는 쓰지 않으므로 더 받지 않는다.
 *   늦게 와도 본문 읽기는 영향이 없어 preload 를 끄고 display: swap 으로 둔다.
 *
 * ★ 명조를 쓰는 구역에서만 싣는다 (2026-10-20 이동).
 *   예전에는 루트 layout 이 모든 페이지에 실어, 명조를 한 글자도 쓰지 않는 공개 체험
 *   화면도 한글 조각 선언 248개(렌더링을 막는 CSS 약 35KB)를 먼저 받아야 했다.
 *   이제 아래 구역 layout 이 `SerifFontScope` 로 감싼다 — 화면 모양은 같다.
 *   admin · class · curriculum · director · kindergarten · learning · sample · share · teacher
 *   (font-serif 를 쓰는 화면을 새 구역에 만들면 그 구역 layout 에도 감싼다)
 */
export const serifKr = Noto_Serif_KR({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-serif-kr",
  display: "swap",
  preload: false,
  fallback: ["Noto Serif KR", "Nanum Myeongjo", "Batang", "AppleMyungjo", "serif"],
});

/** `display: contents` — 감싸도 배치(body 의 flex 흐름)는 바뀌지 않는다. */
export function SerifFontScope({ children }: { children: ReactNode }) {
  return <div className={`${serifKr.variable} serif-scope contents`}>{children}</div>;
}
