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
                <span className="ml-1.5 text-[12px] font-medium text-navy/45">
                  운영 관리자
                </span>
              </p>
            </div>
          </div>

          {/*
            ★ lg 부터 한 줄 배치.
              메뉴가 6개가 되면서 md(768px) 에서는 한 줄이 헤더 우측 영역과 부딪힌다.
              태블릿도 아래 3열 배치를 쓰게 해 잘림을 원천 차단한다.
          */}
          <div className="hidden lg:block">
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

        {/*
          Mobile: 메뉴를 두 번째 줄에 2열로 편다.

          ★ overflow-x-auto 를 걷어냈다.
            가로 스크롤이 있으면 마지막 메뉴가 화면 밖에 숨고, 브라우저 기본
            스크롤바까지 노출된다. 2열이면 4개가 전부 보이고 넘칠 것이 없다.
        */}
        <div className="border-t border-navy/8 px-5 py-2 lg:hidden">
          <AdminNav layout="grid" />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
