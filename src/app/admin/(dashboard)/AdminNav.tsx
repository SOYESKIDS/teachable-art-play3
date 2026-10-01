"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * ★ exact
 *   /admin 은 모든 관리 경로의 접두사라 startsWith 로 판정하면 언제나 Active 가
 *   된다. 운영 대시보드만 정확 일치로 본다.
 *
 * ★ shortLabel
 *   메뉴가 6개가 되면서 360px 에서 2열로는 헤더가 세 줄이 된다.
 *   3열이면 두 줄로 끝나지만 셀 폭이 약 102px 라 긴 이름이 들어가지 않는다.
 *   그래서 좁은 화면에서만 짧은 이름을 쓴다 — 뜻이 흐려지지 않는 선까지만 줄인다.
 *
 * ★ 순서
 *   본사 운영자가 실제로 자주 여는 순서다.
 *   현황 파악(대시보드) → 오픈 준비 → 새 기관 도입 → 관리 기능들.
 */
const NAV_ITEMS = [
  { href: "/admin", label: "운영 대시보드", shortLabel: "대시보드", exact: true },
  { href: "/admin/readiness", label: "서비스 오픈 준비", shortLabel: "오픈 준비", exact: false },
  { href: "/admin/onboarding", label: "새 기관 도입", shortLabel: "기관 도입", exact: false },
  { href: "/admin/organizations", label: "기관 관리", shortLabel: "기관 관리", exact: false },
  { href: "/admin/curriculum", label: "수업 프로그램", shortLabel: "프로그램", exact: false },
  { href: "/admin/products", label: "상품 · 기능", shortLabel: "상품", exact: false },
  { href: "/admin/leads", label: "기관 문의 관리", shortLabel: "문의 관리", exact: false },
] as const;

/** 메뉴 아이콘 — 사이드바에서만 그린다. 글자가 의미를 전하고 아이콘은 훑어보기를 돕는다. */
const NAV_ICONS: Record<(typeof NAV_ITEMS)[number]["href"], string> = {
  "/admin": "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  "/admin/readiness": "M9 12.5l2 2 4-4.5M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3Z",
  "/admin/onboarding": "M12 5v14M5 12h14",
  "/admin/organizations": "M4 20V8l8-4 8 4v12M9 20v-6h6v6M4 20h16",
  "/admin/curriculum": "M5 4.5h9.5L19 9v10.5H5V4.5ZM14 4.5V9h5M8.5 13h7M8.5 16.5h5",
  "/admin/products": "M4 8l8-4 8 4-8 4-8-4Zm0 0v8l8 4 8-4V8M12 12v8",
  "/admin/leads": "M4 6h16v10H8l-4 4V6Zm4 4h8M8 13h5",
};

interface AdminNavProps {
  /**
   * inline  : 한 줄 배치
   * grid    : 3열 배치 (좁은 화면 두 번째 줄)
   * sidebar : 세로 배치 + 아이콘 (lg 이상 왼쪽 사이드바)
   *
   * ★ 좁은 화면에서 한 줄 배치가 안 되는 이유
   *   메뉴 7개의 실제 폭 합이 600px 을 넘어 360px 화면에 들어가지 않는다.
   *   3열이면 세 줄로 전부 보이고 터치 영역도 44px 이상 유지된다.
   */
  layout?: "inline" | "grid" | "sidebar";
}

/** 현재 Route가 속한 메뉴를 Active로 표시한다 */
export function AdminNav({ layout = "inline" }: AdminNavProps) {
  const pathname = usePathname();

  const isGrid = layout === "grid";
  const isSidebar = layout === "sidebar";

  return (
    <nav
      aria-label="관리 메뉴"
      className={
        isGrid
          ? "grid grid-cols-3 gap-1.5"
          : isSidebar
            ? "flex flex-col gap-0.5"
            : "flex items-center gap-1"
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
            className={`relative rounded-lg font-semibold whitespace-nowrap transition-colors ${isSidebar ? "text-label" : "text-caption"} ${
              // 터치 목표 44px 이상 (그리드 · 가로 · 세로 메뉴 모두).
              isGrid
                ? "flex min-h-11 items-center justify-center px-3"
                : isSidebar
                  ? "flex min-h-11 items-center gap-3 px-3"
                  : "inline-flex min-h-11 items-center px-3"
            } ${
              isActive
                ? isSidebar
                  ? "bg-primary-soft text-navy before:absolute before:inset-y-2.5 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-accent"
                  : "bg-navy text-white"
                : "text-ink-muted hover:bg-navy/5 hover:text-navy"
            }`}
          >
            {isSidebar ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={isActive ? "text-navy" : "text-ink-subtle"}
              >
                <path d={NAV_ICONS[item.href]} />
              </svg>
            ) : null}
            {isGrid ? item.shortLabel : item.label}
          </Link>
        );
      })}
    </nav>
  );
}
