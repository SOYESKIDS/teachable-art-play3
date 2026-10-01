import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppMark } from "@/components/layout/AppMark";
import { SalesNav } from "@/components/layout/SalesNav";
import { requireHqSales } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: "영업 | SOYE KIDS 본사",
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: "/sales/leads", label: "문의 관리" },
  { href: "/sales/organizations", label: "기관 영업 현황" },
] as const;

/**
 * HQ Sales 전용 Shell (DEC-097 · DEC-108).
 *
 * Admin Shell 에서 메뉴를 숨긴 것이 아니라 별도 Shell 이다.
 * 아동 단위 화면으로 가는 경로가 없다. 데이터 경계는 DB (DEC-079) 가 판정한다.
 */
export default async function SalesLayout({ children }: { children: ReactNode }) {
  const { email } = await requireHqSales();

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <a href="#sales-main" className="skip-link">
        본문 바로가기
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-2.5 lg:px-8">
          <div className="flex items-center gap-6">
            <AppMark area="본사 · 영업" />
            <span aria-hidden="true" className="hidden h-7 w-px bg-line md:block" />
            <div className="hidden md:block">
              <SalesNav items={NAV_ITEMS} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {email ? (
              <span className="hidden max-w-[220px] truncate text-caption text-ink-muted sm:inline">{email}</span>
            ) : null}
            {/* prefetch로 인한 의도치 않은 로그아웃을 막기 위해 Link가 아닌 form POST를 쓴다 */}
            <form method="post" action="/admin/logout">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-lg border border-control-border/60 bg-white px-3 text-caption font-semibold text-ink transition-colors hover:border-ink-muted hover:bg-bg"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
        <div className="border-t border-line-soft px-5 py-1.5 md:hidden">
          <SalesNav items={NAV_ITEMS} />
        </div>
      </header>

      <main id="sales-main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
    </div>
  );
}
