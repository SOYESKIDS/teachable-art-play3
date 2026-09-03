"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * ★ exact
 *   /admin 은 모든 관리 경로의 접두사라 startsWith 로 판정하면 언제나 Active 가
 *   된다. 운영 대시보드만 정확 일치로 본다.
 */
const NAV_ITEMS = [
  { href: "/admin", label: "운영 대시보드", exact: true },
  { href: "/admin/leads", label: "기관 문의 관리", exact: false },
  { href: "/admin/organizations", label: "기관 관리", exact: false },
  { href: "/admin/curriculum", label: "수업 프로그램", exact: false },
] as const;

interface AdminNavProps {
  /**
   * inline : 한 줄 배치 (데스크톱 헤더)
   * grid   : 2열 배치 (모바일 두 번째 줄)
   *
   * ★ 모바일에서 한 줄 배치가 안 되는 이유
   *   메뉴 4개의 실제 폭 합이 400px 안팎이라 360px 화면에서 들어가지 않는다.
   *   가로 스크롤로 넘기면 마지막 "수업 프로그램"이 화면 밖에 완전히 숨어
   *   사용자가 메뉴가 있다는 것 자체를 알기 어렵다.
   *   개수가 4개로 고정이라 2열이면 전부 한눈에 들어오고 터치 영역도 커진다.
   */
  layout?: "inline" | "grid";
}

/** 현재 Route가 속한 메뉴를 Active로 표시한다 */
export function AdminNav({ layout = "inline" }: AdminNavProps) {
  const pathname = usePathname();

  const isGrid = layout === "grid";

  return (
    <nav
      aria-label="관리 메뉴"
      className={
        isGrid ? "grid grid-cols-2 gap-1.5" : "flex items-center gap-1"
      }
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors ${
              // 그리드에서는 터치 목표를 44px 이상으로 잡고 가운데 정렬한다.
              isGrid
                ? "flex min-h-11 items-center justify-center px-3"
                : "px-3 py-2"
            } ${
              isActive
                ? "bg-navy text-white"
                : "text-navy/60 hover:bg-navy/5 hover:text-navy"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
