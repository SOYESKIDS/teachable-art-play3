"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { LeadCtaButton } from "@/components/forms/LeadCtaButton";
import { ctaLabels, navigation } from "@/data/site-copy";

/**
 * 공개 홈페이지 상단 Header.
 *
 * ★ CTA 두 개의 위계를 섞지 않는다.
 *   도입 문의   = primary(노랑)  — 이 사이트가 방문자에게 바라는 단 하나의 행동
 *   유치원 로그인 = tertiary(흰 배경 + 테두리) — 이미 고객인 사람이 쓰는 조용한 입구
 *   둘 다 눈에 띄게 만들면 처음 온 사람이 어디를 눌러야 할지 알 수 없게 된다.
 *
 * ★ 본사 관리자 로그인(/admin/login)은 여기에 넣지 않는다.
 *   공개 홈페이지에서 본사 운영 화면으로 가는 길을 만들지 않는다.
 *
 * ★ nav 를 xl 부터 펼치는 이유
 *   메뉴 7개에 CTA 2개가 더해지면 lg(1024px) 폭에서 실측 합이 컨테이너를 넘어
 *   로고나 CTA 가 잘린다. 글자 크기를 억지로 줄여 맞추는 대신
 *   1280px 미만에서는 메뉴 버튼 안으로 접는다 — 접힌 메뉴에는 CTA 도 함께 들어간다.
 */

const KINDERGARTEN_LOGIN_LABEL = "유치원 로그인";
const KINDERGARTEN_LOGIN_HREF = "/kindergarten";

/*
 * ★ 헤더의 두 버튼은 `hidden ... sm:inline-flex`가 아니라 `max-sm:hidden`을 쓴다.
 *
 *   Button/ButtonLink의 baseClasses에 이미 `inline-flex`가 들어 있다.
 *   `hidden`과 `inline-flex`는 둘 다 variant 없는 display 유틸리티라
 *   승자는 클래스 문자열 순서가 아니라 **생성된 CSS의 등장 순서**로 정해진다.
 *   실측 결과 `.inline-flex{`가 `.hidden{`보다 뒤에 있어 `hidden`이 무효였고,
 *   360px에서 헤더가 528px로 벌어지며 문서 전체에 가로 스크롤이 생겼다.
 *
 *   `max-sm:hidden`은 variant라 base 유틸리티를 확실히 이긴다.
 *   sm 이상에서는 baseClasses의 inline-flex가 그대로 살아난다.
 */
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    /*
      ★ 그림자를 걷고 선 하나로 띄운다.
        머리띠에 그림자를 얹으면 본문 위로 떠 보여 화면이 무거워진다.
        얇은 선과 반투명 배경이면 스크롤될 때 경계가 충분히 읽힌다 —
        유리처럼 흐리게 만드는 효과는 여기까지만 쓴다.
    */
    <header className="sticky top-0 z-50 border-b border-line-soft bg-ivory/90 backdrop-blur-md">
      <Container className="flex h-[72px] items-center justify-between gap-4 lg:h-20">
        <Link
          href="/"
          className="flex shrink-0 flex-col items-start leading-none"
          onClick={closeMenu}
        >
          {/*
            공식 SOYESKIDS 워드마크. 원본(01_logo_2.png)은 625x625 안에 잉크가 587x103만
            들어 있어 여백을 잘라낸 사본을 쓴다 — 그래야 지정한 높이가 곧 글자 높이가 된다.
            높이로만 제어하는 이유는 Header 높이(72/80px)를 넘기지 않기 위해서다.
            items-start가 없으면 flex column의 기본 stretch 때문에 로고가
            아래 "TeachAble Art Play" 폭(약 198px)까지 늘어난다 — w-auto로는 막지 못한다.
          */}
          <Image
            src="/images/site/brand/soyeskids-logo-primary.png"
            alt="SOYESKIDS"
            width={440}
            height={77}
            priority
            className="h-[20px] w-auto lg:h-[24px]"
          />
          <span className="mt-1.5 whitespace-nowrap font-serif text-xl font-semibold italic text-navy sm:text-2xl">
            TeachAble Art Play
          </span>
        </Link>

        {/*
          ★ 클릭 영역을 글자 크기와 분리한다.
            글자는 15px 그대로 두고 상하 여백으로 44px 높이를 만든다.
            -mx 로 좌우 여백만큼 되돌려, 넓어진 것이 눌리는 범위이지
            메뉴 사이 간격이 아니게 한다.
        */}
        <nav className="hidden items-center text-[15px] font-medium text-navy/70 xl:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-lg px-3 transition-colors duration-[var(--motion-fast)] hover:bg-navy/[0.04] hover:text-navy"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ButtonLink
            href={KINDERGARTEN_LOGIN_HREF}
            variant="tertiary"
            className="whitespace-nowrap px-4 text-sm font-semibold max-md:hidden"
          >
            {KINDERGARTEN_LOGIN_LABEL}
          </ButtonLink>

          <LeadCtaButton
            type="demo"
            variant="primary"
            dataCta="demo-header"
            className="whitespace-nowrap px-5 text-sm font-semibold max-sm:hidden"
          >
            {ctaLabels.demo}
          </LeadCtaButton>

          <button
            type="button"
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-navy hover:bg-navy/5 xl:hidden"
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
          className="border-t border-navy/10 bg-ivory px-5 py-4 xl:hidden"
        >
          <ul className="flex flex-col gap-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMenu}
                  className="flex min-h-11 items-center rounded-lg px-2 text-base font-medium text-navy/85 hover:bg-navy/5"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/*
            ★ 접힌 메뉴 안에서는 CTA 가 반드시 보인다.
              좁은 화면에서 헤더 밖으로 숨긴 두 버튼이 여기서 다시 나타나므로,
              어떤 폭에서도 로그인 입구가 사라지는 구간이 없다.
          */}
          <div className="mt-4 flex flex-col gap-2 border-t border-navy/10 pt-4">
            <ButtonLink
              href={KINDERGARTEN_LOGIN_HREF}
              variant="tertiary"
              onClick={closeMenu}
              className="w-full px-5 text-[15px] font-semibold"
            >
              {KINDERGARTEN_LOGIN_LABEL}
            </ButtonLink>
            <LeadCtaButton
              type="demo"
              variant="primary"
              dataCta="demo-mobile-menu"
              onBeforeOpen={closeMenu}
              className="w-full px-5 text-[15px] font-bold"
            >
              {ctaLabels.demo}
            </LeadCtaButton>
          </div>
        </nav>
      )}
    </header>
  );
}
