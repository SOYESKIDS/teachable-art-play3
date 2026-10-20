import type { Metadata } from "next";
import { Jua, Noto_Serif_KR } from "next/font/google";
import { searchVerification, seoCopy, siteUrl } from "@/lib/seo/site";
/*
 * 본문 글꼴 Pretendard — dynamic subset (글자 묶음 92조각, unicode-range).
 *
 * ★ 예전에는 한글 전체가 든 가변 글꼴 한 파일(약 2MB)을 next/font/local 로 미리 받았다.
 *   느린 모바일에서는 그 2MB 가 첫 화면 그림보다 먼저 대역폭을 차지해
 *   Lighthouse 모바일 LCP 가 14~17초까지 늘었다 (2026-10-20 측정).
 * ★ 이제 페이지에 실제로 쓰인 글자의 조각만 받는다. 글꼴 이름 · 굵기 범위 · swap 은 같다.
 *   --font-pretendard 변수 이름도 그대로라 화면 스타일은 바뀌지 않는다 (globals.css).
 */
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

/**
 * 제목·이야기용 명조.
 *
 * ★ 왜 추가하는가 — `font-serif` 는 Tailwind 기본값이 라틴 세리프 스택
 *   (ui-serif, Georgia, Times …)이라 **한글에는 아무 글꼴도 지정하지 않는
 *   것과 같다.** 기기 기본 명조(Windows 바탕 · macOS 애플명조)로 떨어져
 *   화면마다 다르게 보인다. 그래서 글꼴을 직접 싣는다.
 *
 * ★ 굵기 2종만 — 제목 700, 큰 인용 500. 본문에는 쓰지 않으므로 더 받지 않는다.
 * ★ 본문은 Pretendard 그대로라 이 글꼴이 늦게 와도 본문 읽기는 영향이 없다.
 *   그래서 preload 를 끄고 display: swap 으로 둔다.
 */
const serifKr = Noto_Serif_KR({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-serif-kr",
  display: "swap",
  preload: false,
  fallback: ["Noto Serif KR", "Nanum Myeongjo", "Batang", "AppleMyungjo", "serif"],
});

/**
 * 공개 체험 · 홈 제목용 둥근 글꼴 (PLAYFUL PREMIUM EDUCATION).
 *
 * ★ 큰 제목 · 배지에만 쓴다 (font-display). 본문 · 업무 화면은 Pretendard 그대로다.
 * ★ 늦게 와도 제목이 Pretendard 로 먼저 보이도록 swap · preload 끔.
 */
const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-jua",
  display: "swap",
  preload: false,
  fallback: ["Pretendard Variable", "sans-serif"],
});

/**
 * 사이트 공통 메타데이터.
 *
 * title은 template을 쓰지 않는다 — /login, /admin 등 하위 페이지가 이미
 * "... | TeachAble Art Play" 형태의 완성된 title을 각자 갖고 있어 브랜드명이 중복되기 때문이다.
 * 하위 관리/인증 페이지의 robots: { index: false }도 각 페이지에 그대로 유지된다.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: seoCopy.title,
  description: seoCopy.description,
  keywords: [...seoCopy.keywords],
  applicationName: seoCopy.siteName,
  authors: [{ name: "SOYESKIDS" }],
  creator: "SOYESKIDS",
  publisher: "SOYESKIDS",
  // 전화번호가 링크로 자동 변환되며 레이아웃이 흔들리는 것을 막는다.
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // 검색엔진 소유 확인 — 환경변수가 있을 때만 meta 가 생긴다 (lib/seo/site.ts)
  verification: searchVerification(),
  openGraph: {
    type: "website",
    siteName: seoCopy.siteName,
    locale: "ko_KR",
    url: siteUrl,
    title: seoCopy.openGraph.title,
    description: seoCopy.openGraph.description,
  },
  // opengraph-image(src/app/opengraph-image.tsx) 하나로 og:image와 twitter:image가 함께 생성된다.
  // twitter-image 파일을 따로 두면 같은 이미지를 두 번 만들게 되므로 만들지 않는다.
  twitter: {
    card: "summary_large_image",
    title: seoCopy.openGraph.title,
    description: seoCopy.openGraph.description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${serifKr.variable} ${jua.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
