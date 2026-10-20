"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/layout/BrandMark";
import { cx } from "@/components/ui/cx";
import { popButtonClass } from "./PopButton";

/**
 * 2026 공개 체험 헤더.
 *
 * ★ 우선순위가 바뀌었다 — 2026년은 로그인 없이 보고 체험하는 해다.
 *   주 버튼 = 「수업 체험하기」. 유치원 로그인은 기존 고객용 조용한 링크로 남긴다.
 * ★ 메뉴 다섯 개 이하. 좁은 화면(lg 미만)은 메뉴 버튼으로 접고, 접힌 메뉴 안에도
 *   주 버튼과 로그인 입구가 항상 있다.
 * ★ Esc 로 닫고 메뉴 버튼으로 초점을 돌려준다. 넓어지면 자동으로 닫힌다.
 */
export const PLAY_NAV = [
  { label: "24주 수업", href: "/experience/weeks" },
  { label: "수업 체험", href: "/experience/classroom/4" },
  { label: "성장 리포트", href: "/experience/report" },
  { label: "도입 안내", href: "/#adoption" },
] as const;

export function PlayHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const isActive = (href: string) => {
    const path = href.split("#")[0];
    if (!path || path === "/") return false;
    if (path.startsWith("/experience/classroom")) return pathname.startsWith("/experience/classroom");
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <header
      className={cx(
        "sticky top-0 z-50 transition-[background-color,box-shadow] duration-200",
        scrolled || open ? "bg-pop-cream/95 shadow-[0_1px_0_rgba(27,37,71,0.08)] backdrop-blur-md" : "bg-pop-cream/80 backdrop-blur-sm",
      )}
    >
      <a href="#main" className="skip-link">본문 바로가기</a>
      <div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6 lg:h-[76px]">
        <Link href="/" aria-label="TeachAble Art Play 홈" onClick={() => setOpen(false)} className="flex min-h-11 shrink-0 items-center rounded-lg">
          <BrandMark priority compactOnMobile />
        </Link>

        <nav aria-label="주요 메뉴" className="hidden items-center gap-1 lg:flex">
          {PLAY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cx(
                "inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-bold transition-colors",
                isActive(item.href) ? "bg-pop-yellow-soft text-pop-ink" : "text-pop-ink-muted hover:bg-white hover:text-pop-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/kindergarten" className="hidden min-h-11 items-center rounded-full px-3 text-[14px] font-semibold text-pop-ink-muted hover:text-pop-ink xl:inline-flex">
            유치원 로그인
          </Link>
          <Link href="/experience" className={popButtonClass("pink", "md", "max-sm:hidden")}>
            수업 체험하기
          </Link>
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="play-mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-pop-ink shadow-pop lg:hidden"
          >
            <span className="sr-only">{open ? "메뉴 닫기" : "메뉴 열기"}</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h11" />}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav id="play-mobile-nav" aria-label="주요 메뉴" className="max-h-[calc(100dvh-68px)] overflow-y-auto border-t border-pop-ink/10 bg-pop-cream lg:hidden">
          <ul className="mx-auto grid max-w-[1320px] gap-2 px-4 py-4 sm:grid-cols-2 sm:px-6">
            {PLAY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="flex min-h-14 items-center justify-between rounded-2xl bg-white px-5 text-[17px] font-bold text-pop-ink shadow-[0_1px_0_rgba(27,37,71,0.06)]"
                >
                  {item.label}
                  <span aria-hidden="true" className="text-pop-pink-deep">→</span>
                </Link>
              </li>
            ))}
            <li className="grid gap-2 pt-2 sm:col-span-2 sm:grid-cols-2">
              <Link href="/experience" onClick={() => setOpen(false)} className={popButtonClass("pink", "lg", "w-full")}>
                수업 체험하기
              </Link>
              <Link href="/kindergarten" onClick={() => setOpen(false)} className={popButtonClass("ghost", "lg", "w-full")}>
                유치원 로그인
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
