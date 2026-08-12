"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ctaLabels, navigation } from "@/data/site-copy";
import { useLeadForm } from "@/components/forms/LeadFormContext";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { openLeadForm } = useLeadForm();

  return (
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-ivory/95 shadow-[var(--shadow-soft)] backdrop-blur">
      <Container className="flex h-[72px] items-center justify-between lg:h-20">
        <Link
          href="/"
          className="flex flex-col leading-none"
          onClick={() => setIsMenuOpen(false)}
        >
          <span className="text-[10px] font-semibold tracking-[0.14em] text-navy/45">
            SOYESKIDS
          </span>
          <span className="mt-1 font-serif text-xl font-semibold italic text-navy sm:text-2xl">
            TeachAble Art Play
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-[15px] font-medium text-navy/80 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-navy"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled
            title="로그인은 준비 중입니다"
            aria-disabled="true"
            className="hidden cursor-not-allowed items-center gap-1.5 text-sm font-normal text-navy/45 sm:flex"
          >
            로그인
            <span className="rounded-full bg-navy/5 px-1.5 py-0.5 text-[9px] font-medium text-navy/40">
              준비중
            </span>
          </button>
          <Button
            type="button"
            variant="primary"
            data-cta="pilot-header"
            onClick={() => openLeadForm("pilot")}
            className="px-6 py-3 text-sm font-semibold sm:text-[15px]"
          >
            {ctaLabels.primary}
          </Button>

          <button
            type="button"
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-navy hover:bg-navy/5 lg:hidden"
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
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </Container>

      {isMenuOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-navy/10 bg-ivory px-5 py-4 lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-lg px-2 py-3 text-base font-medium text-navy/85 hover:bg-navy/5"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                disabled
                title="로그인은 준비 중입니다"
                aria-disabled="true"
                className="flex w-full cursor-not-allowed items-center gap-1.5 px-2 py-3 text-left text-base font-normal text-navy/45"
              >
                로그인
                <span className="rounded-full bg-navy/5 px-1.5 py-0.5 text-[9px] font-medium text-navy/40">
                  준비중
                </span>
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
