import type { ReactNode } from "react";
import Link from "next/link";

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
    <div className="flex min-h-screen flex-col bg-surface-soft">
      <header className="sticky top-0 z-30 border-b border-navy/10 bg-white">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] font-bold tracking-[0.16em] text-navy/45">
              TEACHABLE ART PLAY
            </p>
            <p className="truncate text-[14px] font-semibold text-navy">
              {organizationName}
              <span className="ml-1.5 text-[12px] font-medium text-navy/45">
                {roleLabel}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {email ? (
              <span className="hidden max-w-[200px] truncate text-[13px] text-navy/55 lg:inline">
                {email}
              </span>
            ) : null}
            {/* prefetch로 인한 의도치 않은 로그아웃을 막기 위해 Link가 아닌 form POST를 쓴다 */}
            <form method="post" action="/auth/logout">
              <button
                type="submit"
                className="rounded-lg border border-navy/20 px-3 py-2 text-[13px] font-semibold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>

        <nav
          aria-label="교직원 메뉴"
          className="border-t border-navy/8 bg-white"
        >
          <div className="mx-auto flex w-full max-w-[1100px] items-center gap-1 px-5 lg:px-8">
            {navItems.map((item) => {
              const isCurrent = item.href === currentHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`-mb-px border-b-2 px-3 py-3 text-[14px] font-semibold transition-colors ${
                    isCurrent
                      ? "border-navy text-navy"
                      : "border-transparent text-navy/45 hover:text-navy/70"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
