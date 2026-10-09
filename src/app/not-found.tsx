import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/PublicButton";
import { Container } from "@/components/ui/Container";
import { BrandMark } from "@/components/layout/BrandMark";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

/**
 * 앱 전체의 404 화면.
 *
 * 공개 홈페이지용이므로 로그인·관리자 링크는 노출하지 않는다.
 * 브랜드 표기와 홈으로 돌아가는 길 하나만 둔 최소 구성이다.
 */
export default function NotFound() {
  return (
    // release/public-site: V4 디자인 값 범위 (globals.css .public-v4)
    <main className="public-v4 flex flex-1 items-center bg-ivory py-20 sm:py-24">
      <Container>
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <Link href="/" aria-label="TeachAble Art Play 홈" className="flex min-h-11 items-center rounded-lg">
            <BrandMark />
          </Link>

          <p aria-hidden="true" className="mt-12 text-[5rem] font-extrabold leading-none tracking-[-0.05em] text-accent/25 tabular-nums sm:text-[6.5rem]">
            404
          </p>

          <h1 className="mt-6 text-h2 font-bold text-navy">
            페이지를 찾을 수 없습니다
          </h1>

          <p className="mt-4 text-lead text-ink-muted">
            요청하신 페이지가 삭제되었거나 주소가 변경되었을 수 있습니다.
          </p>

          <Link
            href="/"
            className={buttonClasses({ variant: "primary", size: "lg", className: "mt-10" })}
          >
            홈페이지로 돌아가기
          </Link>
        </div>
      </Container>
    </main>
  );
}
