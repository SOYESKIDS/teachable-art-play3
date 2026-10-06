import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { BrandMark } from "@/components/layout/BrandMark";
import { toHomeAnchor } from "@/components/layout/home-anchor";
import { brandMessage, contactInfo, legalLinks, navigation } from "@/data/site-copy";

/**
 * 사이트의 마지막 면 (V3).
 *
 * ★ 기능의 끝이 아니라 브랜드의 마감이다.
 *   이 서비스가 무엇을 남기는지 한 문장(coreMessage)을 크게 두고,
 *   그 아래를 세 칸(브랜드 · 바로가기 · 연락처)으로 정리한다.
 *
 * ★ 메뉴 링크는 "/#section" — 홈이 아닌 페이지에서도 홈의 해당 위치로 간다.
 *
 * ★ 모바일 하단 고정 CTA(약 79px + safe-area)에 가리지 않도록
 *   아래 여백은 Footer 안에서 확보한다. lg 이상은 고정 CTA 가 없다.
 */
export function Footer() {
  return (
    <footer
      data-surface="dark"
      className="bg-navy-deep pt-16 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] text-white/70 sm:pt-20 lg:pb-14"
    >
      <Container>
        <p className="max-w-[24ch] text-h3 font-bold text-white sm:max-w-[30ch]">
          {brandMessage.coreMessage}
        </p>

        <div className="mt-12 grid gap-10 border-t border-line-inverse pt-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.6fr_1fr] lg:gap-12">
          <div className="flex flex-col items-start gap-4">
            <BrandMark tone="inverse" layout="stacked" />
            <p className="max-w-[34ch] text-label text-white/60">
              누리과정 연계 미술 놀이 수업부터 관찰 기록 · 성장 리포트까지,
              유치원 수업 운영을 한 흐름으로 연결합니다.
            </p>
          </div>

          <nav aria-label="바닥글 바로가기">
            <p className="eyebrow-ko text-white/70">바로가기</p>
            <ul className="mt-3 grid max-w-[320px] grid-cols-2 gap-x-6 text-label">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={toHomeAnchor(item.href)}
                    className="inline-flex min-h-11 items-center transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/kindergarten"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-4 text-label font-semibold text-white/90 transition-colors hover:border-white/50 hover:bg-white/5 hover:text-white"
            >
              유치원 로그인
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </nav>

          <div>
            <p className="eyebrow-ko text-white/70">문의</p>
            <ul className="mt-3 flex flex-col text-label">
              <li>
                <a
                  href={`tel:${contactInfo.phone}`}
                  className="inline-flex min-h-11 items-center tabular-nums transition-colors hover:text-white"
                >
                  {contactInfo.phone}
                </a>
              </li>
              {/* 공개 버전: mailto 바로가기 없이 이메일 주소를 텍스트로만 표기한다. */}
              <li className="flex min-h-11 items-center">
                <span className="select-all">{contactInfo.email}</span>
              </li>
              <li>
                <a
                  href={`https://${contactInfo.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white"
                >
                  {contactInfo.website}
                  <span className="sr-only"> (새 창)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line-inverse pt-6 text-caption text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{contactInfo.copyright}</p>
          <div className="flex flex-wrap gap-x-5">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
