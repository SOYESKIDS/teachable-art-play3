import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TeachAble Art Play | 유치원 교육 운영 플랫폼",
  description:
    "누리과정 연계 수업 콘텐츠부터 교사 운영, AI 성장기록, 학부모 리포트, 원장 대시보드까지 하나로 연결한 SOYESKIDS 유치원 교육 운영 플랫폼.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
