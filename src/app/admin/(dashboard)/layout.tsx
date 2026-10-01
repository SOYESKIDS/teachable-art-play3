import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { AppMark } from "@/components/layout/AppMark";
import { AdminNav } from "./AdminNav";

/**
 * Admin Dashboard Layout.
 *
 * Route Group `(dashboard)`이므로 URL에는 영향을 주지 않고,
 * /admin/login 은 이 Layout을 쓰지 않는다(로그인 화면은 독립 유지).
 *
 * ★ V3: lg 이상은 왼쪽 사이드바, 그보다 좁으면 상단 머리글 + 3열 메뉴.
 *   메뉴 7개를 머리글 한 줄에 넣으면 1024~1280px 에서 서로 밀렸다.
 *   본사 화면은 데스크톱이 주 사용 환경(DEC-110)이라 세로 메뉴가 가장 여유 있다.
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { email } = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-ivory">
      <a href="#main" className="skip-link">
        본문 바로가기
      </a>

      {/* ── 데스크톱 사이드바 ─────────────────────────────── */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-line-soft px-5">
          <AppMark area="본사 운영" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="eyebrow mb-2 px-3 text-ink-subtle">MENU</p>
          <AdminNav layout="sidebar" />
        </div>
        <div className="border-t border-line-soft p-4">
          {email ? (
            <p className="mb-3 flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-soft text-caption font-bold uppercase text-secondary-strong"
              >
                {email.slice(0, 1)}
              </span>
              <span className="truncate text-caption text-ink-muted">{email}</span>
            </p>
          ) : null}
          {/* prefetch로 인한 의도치 않은 로그아웃을 막기 위해 Link가 아닌 form POST를 쓴다 */}
          <form method="post" action="/admin/logout">
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-control-border/60 bg-white px-3 text-caption font-semibold text-ink transition-colors hover:border-ink-muted hover:bg-bg"
            >
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── 모바일 · 태블릿 머리글 ─────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-2.5">
            <AppMark area="본사 운영" />
            <form method="post" action="/admin/logout">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-control-border/60 bg-white px-3 text-caption font-semibold text-ink transition-colors hover:border-ink-muted hover:bg-bg"
              >
                로그아웃
              </button>
            </form>
          </div>
          <div className="border-t border-line-soft px-5 py-2">
            <AdminNav layout="grid" />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
