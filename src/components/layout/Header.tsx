"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/PublicButton";
import { Container } from "@/components/ui/Container";
import { cx } from "@/components/ui/cx";
import { LeadCtaButton } from "@/components/forms/LeadCtaButton";
import { BrandMark } from "@/components/layout/BrandMark";
import { toHomeAnchor } from "@/components/layout/home-anchor";
import { ctaLabels, navigation } from "@/data/site-copy";

/**
 * 공개 홈페이지 상단 Header (V3).
 *
 * ★ CTA 두 개의 위계를 섞지 않는다.
 *   도입 문의     = primary(Navy 면) — 이 사이트가 방문자에게 바라는 단 하나의 행동
 *   유치원 로그인 = tertiary(테두리)  — 이미 고객인 사람이 쓰는 조용한 입구
 *
 * ★ 본사 관리자 로그인(/admin/login)은 여기에 넣지 않는다.
 *
 * ★ 메뉴 링크는 "/#section" 으로 쓴다.
 *   예전 "#section" 은 /programs · /privacy · /terms 에서 아무 데도 가지 않았다.
 *   "/#section" 은 홈에서는 같은 페이지 안 이동, 다른 페이지에서는 홈의 해당 위치로 간다.
 *
 * ★ 스크롤하면 바탕이 불투명해지고 선이 진해진다 — 본문 위에 떠 있다는 신호를
 *   그림자 대신 면의 밀도로 준다.
 *
 * ★ nav 를 xl 부터 펼친다. 메뉴 7개 + CTA 2개는 1024px 폭을 넘는다.
 *   그보다 좁으면 메뉴 버튼 안으로 접고, 접힌 메뉴에는 CTA 도 함께 들어간다.
 *
 * ★ 헤더 버튼은 `hidden sm:inline-flex` 가 아니라 `max-sm:hidden` 을 쓴다.
 *   Button 의 base 에 inline-flex 가 있어, variant 없는 hidden 은 CSS 순서에 따라 진다.
 */

const KINDERGARTEN_LOGIN_LABEL = "유치원 로그인";
const KINDERGARTEN_LOGIN_HREF = "/kindergarten";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 펼친 메뉴: Esc 로 닫고 메뉴 버튼으로 초점을 돌려준다 · 넓은 화면이 되면 닫는다.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 1280px)");
    const onWide = () => wide.matches && setIsMenuOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [isMenuOpen]);

  return (
    <header
      className={cx(
        "sticky top-0 z-50 border-b transition-[background-color,border-color] duration-200",
        isScrolled || isMenuOpen
          ? "border-line bg-ivory/95 backdrop-blur-md"
          : "border-transparent bg-ivory/80 backdrop-blur-sm",
      )}
    >
      <a href="#main" className="skip-link">
        본문 바로가기
      </a>

      <Container
        className={cx(
          "flex items-center justify-between gap-4 transition-[height] duration-200",
          isScrolled ? "h-[60px] lg:h-16" : "h-[68px] lg:h-[76px]",
        )}
      >
        <Link
          href="/"
          aria-label="TeachAble Art Play 홈"
          className="flex min-h-11 shrink-0 items-center rounded-lg"
          onClick={closeMenu}
        >
          <BrandMark priority />
        </Link>

        <nav
          aria-label="주요 메뉴"
          className="hidden items-center text-body-sm font-medium text-ink-muted xl:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={toHomeAnchor(item.href)}
              className="relative inline-flex min-h-11 items-center rounded-lg px-3 transition-colors duration-[var(--motion-fast)] after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-200 hover:text-navy hover:after:scale-x-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <ButtonLink
            href={KINDERGARTEN_LOGIN_HREF}
            variant="tertiary"
            className="min-h-11 whitespace-nowrap px-4 text-label max-md:hidden"
          >
            {KINDERGARTEN_LOGIN_LABEL}
          </ButtonLink>

          <LeadCtaButton
            type="consult"
            variant="primary"
            dataCta="consult-header"
            className="min-h-11 whitespace-nowrap px-5 text-label max-sm:hidden"
          >
            {ctaLabels.consultApply}
          </LeadCtaButton>

          <button
            ref={toggleRef}
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-navy transition-colors hover:bg-navy/5 xl:hidden"
          >
            <span className="sr-only">{isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}</span>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {isMenuOpen ? (
                <path d="M6 6l12 12M18 6l-12 12" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h10" />
              )}
            </svg>
          </button>
        </div>
      </Container>

      {isMenuOpen && (
        <nav
          id="mobile-nav"
          aria-label="주요 메뉴"
          className="max-h-[calc(100dvh-68px)] animate-fade-in overflow-y-auto border-t border-line bg-ivory xl:hidden"
        >
          <Container className="py-4">
            <ul className="grid gap-1 sm:grid-cols-2">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={toHomeAnchor(item.href)}
                    onClick={closeMenu}
                    className="flex min-h-12 items-center justify-between rounded-xl px-3 text-body font-semibold text-navy transition-colors hover:bg-white"
                  >
                    {item.label}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-subtle">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>

            {/*
              ★ 접힌 메뉴 안에서는 CTA 가 반드시 보인다 — 어떤 폭에서도
                로그인 입구 · 상담 버튼이 사라지는 구간이 없다.
            */}
            <div className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
              <ButtonLink
                href={KINDERGARTEN_LOGIN_HREF}
                variant="tertiary"
                onClick={closeMenu}
                className="w-full"
              >
                {KINDERGARTEN_LOGIN_LABEL}
              </ButtonLink>
              <LeadCtaButton
                type="consult"
                variant="primary"
                dataCta="consult-mobile-menu"
                onBeforeOpen={closeMenu}
                className="w-full font-bold"
              >
                {ctaLabels.consultApply}
              </LeadCtaButton>
            </div>
          </Container>
        </nav>
      )}
    </header>
  );
}
