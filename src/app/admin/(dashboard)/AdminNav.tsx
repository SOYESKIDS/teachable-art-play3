"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/leads", label: "기관 문의 관리" },
  { href: "/admin/organizations", label: "기관 관리" },
  { href: "/admin/curriculum", label: "수업 프로그램" },
] as const;

/** 현재 Route가 속한 메뉴를 Active로 표시한다 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="관리 메뉴" className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${
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
