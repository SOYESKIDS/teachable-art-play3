import type { ReactNode } from "react";
import Link from "next/link";
import { AppMark } from "@/components/layout/AppMark";

interface StaffNavItem {
  href: string;
  label: string;
}

interface StaffShellProps {
  /** 헤더 우측에 표시할 로그인 계정 */
  email: string | null;
  /** "원장" / "교사" — 지금 어떤 자격으로 보고 있는지 명확히 한다 */
  roleLabel: string;
  organizationName: string;
  navItems: readonly StaffNavItem[];
  /** 현재 경로 — 활성 메뉴 표시용 */
  currentHref: string;
  children: ReactNode;
}

/**
 * 원장/교사 공용 화면 껍데기.
 *
 * Admin Layout과 분리한 이유
 *   Admin은 여러 기관을 오가는 관리 도구라 상단에 기관 선택·문의·프로그램 메뉴가 필요하다.
 *   교직원 화면은 "내 기관, 오늘 할 일" 하나에 집중해야 해서 메뉴를 2개까지만 둔다.
 *
 * 메뉴가 적어 모바일에서도 가로 스크롤 없이 한 줄에 들어간다
 * (Admin의 모바일 내비는 overflow-x-auto가 필요했다).
 */
export function StaffShell({
  email,
  roleLabel,
  organizationName,
  navItems,
  currentHref,
  children,
}: StaffShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <a href="#main" className="skip-link print:hidden">
        본문 바로가기
      </a>
      <header className="print:hidden sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-4 px-5 py-2.5 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <AppMark className="max-sm:[&>span:last-child]:hidden" />
            <span aria-hidden="true" className="hidden h-7 w-px bg-line sm:block" />
            <p className="flex min-w-0 items-center gap-2">
              <span className="truncate text-label font-bold text-navy">
                {organizationName}
              </span>
              <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-micro font-semibold text-navy">
                {roleLabel}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {email ? (
              <span className="hidden max-w-[220px] truncate text-caption text-ink-muted lg:inline">
                {email}
              </span>
            ) : null}
            {/* prefetch로 인한 의도치 않은 로그아웃을 막기 위해 Link가 아닌 form POST를 쓴다 */}
            <form method="post" action="/auth/logout">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-control-border/60 bg-white px-3 text-caption font-semibold text-ink transition-colors hover:border-ink-muted hover:bg-bg"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
                </svg>
                로그아웃
              </button>
            </form>
          </div>
        </div>

        <nav aria-label="교직원 메뉴" className="print:hidden">
          {/*
            ★ 좁은 화면에서 메뉴가 잘리지 않게 한다.
              좁은 화면에서만 항목 좌우 여백을 줄이고, 그보다 더 좁은 기기를 위해
              overflow-x-auto 를 안전망으로 둔다 — nav 안에서만 밀린다.
          */}
          <div className="mx-auto flex w-full max-w-[1100px] items-center gap-1 overflow-x-auto overflow-y-hidden px-3 lg:px-6">
            {navItems.map((item) => {
              const isCurrent = item.href === currentHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`relative inline-flex min-h-12 shrink-0 items-center px-2.5 text-label font-semibold transition-colors after:absolute after:inset-x-2.5 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition-colors sm:px-3 sm:after:inset-x-3 ${
                    isCurrent
                      ? "text-navy after:bg-accent"
                      : "text-ink-muted after:bg-transparent hover:text-navy hover:after:bg-line-strong"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-7 focus:outline-none lg:px-8 lg:py-10"
      >
        {children}
      </main>
    </div>
  );
}
