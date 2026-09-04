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
  { href: "/admin/leads", label: "기관 문의 관리", shortLabel: "문의 관리", exact: false },
] as const;

interface AdminNavProps {
  /**
   * inline : 한 줄 배치 (데스크톱 헤더)
   * grid   : 3열 배치 (좁은 화면 두 번째 줄)
   *
   * ★ 좁은 화면에서 한 줄 배치가 안 되는 이유
   *   메뉴 6개의 실제 폭 합이 600px 을 넘어 360px 화면에 들어가지 않는다.
   *   가로 스크롤로 넘기면 뒤쪽 메뉴가 화면 밖에 완전히 숨어
   *   사용자가 메뉴가 있다는 것 자체를 알기 어렵다.
   *   3열이면 두 줄로 여섯 개가 전부 보이고 터치 영역도 44px 이상 유지된다.
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
        isGrid ? "grid grid-cols-3 gap-1.5" : "flex items-center gap-1"
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
            {isGrid ? item.shortLabel : item.label}
          </Link>
        );
      })}
    </nav>
  );
}
