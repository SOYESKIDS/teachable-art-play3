import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

/**
 * 앱 전체의 404 화면.
 *
 * 공개 홈페이지용이므로 로그인·관리자 링크는 노출하지 않는다.
 * 홈페이지 Header/Footer는 전부 홈 내부 앵커(#solution 등)로 연결되어 404에서는 동작하지 않으므로,
 * 브랜드만 유지한 최소 구성으로 둔다.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center bg-ivory py-20 sm:py-24">
      <Container>
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-navy/45">
            SOYESKIDS
          </span>
          <span className="mt-1 font-serif text-2xl font-semibold italic text-navy sm:text-3xl">
            TeachAble Art Play
          </span>

          <p className="mt-10 text-5xl font-extrabold tracking-tight text-navy/15 sm:text-6xl">
            404
          </p>

          <h1 className="mt-4 text-2xl font-bold leading-[1.3] text-navy sm:text-3xl">
            페이지를 찾을 수 없습니다
          </h1>

          <p className="mt-4 text-base leading-relaxed text-navy/60">
            요청하신 페이지가 삭제되었거나 주소가 변경되었을 수 있습니다.
          </p>

          <Link
            href="/"
            className="mt-10 inline-flex min-h-12 items-center justify-center rounded-full border border-transparent bg-yellow px-8 py-3.5 text-base font-bold text-navy shadow-[var(--shadow-cta)] transition-colors duration-200 hover:bg-yellow/90 active:scale-[0.98]"
          >
            홈페이지로 돌아가기
          </Link>
        </div>
      </Container>
    </main>
  );
}
