import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
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
    <div className="flex min-h-screen flex-col bg-brand-ivory">
      <a
        href="#sales-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-ink"
      >
        본문으로 건너뛰기
      </a>
      <header className="sticky top-0 z-30 border-b border-hairline bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <div className="leading-tight">
            <p className="text-[12px] font-semibold text-ink-muted">SOYE KIDS 본사 · 영업</p>
            <p className="text-[15px] font-bold text-ink">TeachAble Art Play</p>
          </div>

          <nav aria-label="영업 메뉴">
            <ul className="flex flex-wrap gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-[14px] font-semibold text-ink hover:bg-brand-ivory"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            {email ? (
              <span className="hidden max-w-[220px] truncate text-[13px] text-ink-muted sm:inline">{email}</span>
            ) : null}
            <form method="post" action="/admin/logout">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-lg border border-control-border px-3 text-[13px] font-semibold text-ink hover:bg-brand-ivory"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="sales-main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
