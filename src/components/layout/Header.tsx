"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ctaLabels, navigation } from "@/data/site-copy";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-ivory/95 shadow-[var(--shadow-soft)] backdrop-blur">
      <Container className="flex h-[72px] items-center justify-between lg:h-20">
        <Link
          href="/"
          className="flex flex-col items-start leading-none"
          onClick={() => setIsMenuOpen(false)}
        >
          {/*
            공식 SOYESKIDS 워드마크. 원본(01_logo_2.png)은 625x625 안에 잉크가 587x103만
            들어 있어 여백을 잘라낸 사본을 쓴다 — 그래야 지정한 높이가 곧 글자 높이가 된다.
            높이로만 제어하는 이유는 Header 높이(72/80px)를 넘기지 않기 위해서다.
            items-start가 없으면 flex column의 기본 stretch 때문에 로고가
            아래 "TeachAble Art Play" 폭(약 198px)까지 늘어난다 — w-auto로는 막지 못한다.
            (h-[19px] ≈ 109px, h-[23px] ≈ 131px 폭)
          */}
          <Image
            src="/images/site/brand/soyeskids-logo-primary.png"
            alt="SOYESKIDS"
            width={440}
            height={77}
            priority
            className="h-[19px] w-auto lg:h-[23px]"
          />
          <span className="mt-1.5 whitespace-nowrap font-serif text-xl font-semibold italic text-navy sm:text-2xl">
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
          {/*
            모바일(sm 미만)에서는 로고와 CTA가 나란히 들어가지 못해 Header가 가로로 넘치고 아래 섹션을 덮는다.
            같은 역할의 하단 고정 CTA가 이미 있으므로 sm 이상에서만 노출한다.
            (숨김 처리는 wrapper에 둔다 — ButtonLink의 base `inline-flex`와 `hidden`이 충돌하기 때문)
          */}
          <span className="hidden sm:block">
            <ButtonLink
              href="#contact"
              variant="primary"
              data-cta="contact-header"
              className="whitespace-nowrap px-6 py-3 text-sm font-semibold sm:text-[15px]"
            >
              {ctaLabels.contact}
            </ButtonLink>
          </span>

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
          </ul>
        </nav>
      )}
    </header>
  );
}
