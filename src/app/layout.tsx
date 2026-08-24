import type { Metadata } from "next";
import localFont from "next/font/local";
import { seoCopy, siteUrl } from "@/lib/seo/site";
import "./globals.css";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
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
  openGraph: {
    type: "website",
    siteName: seoCopy.siteName,
    locale: "ko_KR",
    url: siteUrl,
    title: seoCopy.openGraph.title,
    description: seoCopy.openGraph.description,
  },
  twitter: {
    card: "summary",
    title: seoCopy.openGraph.title,
    description: seoCopy.openGraph.description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
