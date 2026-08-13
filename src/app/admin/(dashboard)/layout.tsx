import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminNav } from "./AdminNav";

/**
 * Admin Dashboard Layout.
 *
 * Route Group `(dashboard)`이므로 URL에는 영향을 주지 않고,
 * /admin/login 은 이 Layout을 쓰지 않는다(로그인 화면은 독립 유지).
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { email } = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-surface-soft">
      <header className="sticky top-0 z-30 border-b border-navy/10 bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-[13px] font-bold text-yellow"
            >
              S
            </span>
            <div className="leading-tight">
              <p className="text-[10px] font-bold tracking-[0.16em] text-navy/45">
                SOYESKIDS ADMIN
              </p>
              <p className="text-[14px] font-semibold text-navy">
                TeachAble Art Play
              </p>
            </div>
          </div>

          <div className="hidden md:block">
            <AdminNav />
          </div>

          <div className="flex items-center gap-3">
            {email ? (
              <span className="hidden max-w-[220px] truncate text-[13px] text-navy/55 sm:inline">
                {email}
              </span>
            ) : null}
            {/* prefetch로 인한 의도치 않은 로그아웃을 막기 위해 Link가 아닌 form POST를 쓴다 */}
            <form method="post" action="/admin/logout">
              <button
                type="submit"
                className="rounded-lg border border-navy/20 px-3 py-2 text-[13px] font-semibold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>

        {/* Mobile: 메뉴를 두 번째 줄로 내린다 */}
        <div className="overflow-x-auto border-t border-navy/8 px-5 py-2 md:hidden">
          <AdminNav />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
