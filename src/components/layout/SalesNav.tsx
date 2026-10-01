"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/cx";

/**
 * HQ Sales 메뉴.
 *
 * ★ 지금 어느 화면에 있는지 보여 준다 (aria-current + 밑줄).
 *   예전 영업 메뉴에는 활성 표시가 없어 두 화면이 같은 화면처럼 보였다.
 */
export function SalesNav({
  items,
}: {
  items: readonly { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="영업 메뉴">
      <ul className="flex flex-wrap gap-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cx(
                  "inline-flex min-h-11 items-center rounded-lg px-3 text-label font-semibold transition-colors",
                  isActive
                    ? "bg-primary-soft text-navy"
                    : "text-ink-muted hover:bg-navy/5 hover:text-navy",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
