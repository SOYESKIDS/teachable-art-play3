import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { contactInfo, legalLinks, navigation } from "@/data/site-copy";

export function Footer() {
  // 모바일 하단 고정 CTA(실측 79px + safe-area)에 Footer 내용이 가리지 않도록
  // 아래 여백은 Footer 안에서 확보한다. lg 이상은 고정 CTA가 없어 pb-16이면 충분하다.
  return (
    <footer className="border-t border-navy/10 bg-navy pt-14 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] text-white/70 sm:pt-16 lg:pb-16">
      <Container>
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-start gap-2.5">
            {/*
              워드마크에 흰색 외곽선이 들어가 있어 Navy 배경에서도 대비가 확보된다.
              (Ivory Header보다 오히려 또렷하다 — 별도 배경 카드를 두지 않는 이유다)
            */}
            <Image
              src="/images/site/brand/soyeskids-logo-primary.png"
              alt="SOYESKIDS"
              width={440}
              height={77}
              className="h-[22px] w-auto"
            />
            <span className="font-serif text-xl italic text-white">TeachAble Art Play</span>
          </div>

          {/*
            ★ 링크마다 44px 높이를 만든다.
              글자 크기는 그대로 두고 상하 여백으로만 넓힌다 — 손가락으로 누르는
              대상은 글자가 아니라 링크 영역이다.

            ★ 유치원 로그인을 여기에도 둔다.
              공개 홈페이지는 모바일에서 매우 길다. 끝까지 내려온 사람에게
              다시 맨 위로 올라가라고 하지 않는다.
              도입 문의(상업 CTA)와 섞이지 않도록 구분선 뒤에 조용히 놓는다.
          */}
          <nav
            aria-label="Footer 내비게이션"
            className="flex flex-wrap items-center gap-x-5 gap-y-0 text-sm"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center hover:text-white"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/kindergarten"
              className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-4 font-semibold text-white/85 transition-colors hover:border-white/45 hover:text-white"
            >
              유치원 로그인
            </Link>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-1.5 border-t border-white/10 pt-8 text-sm">
          <a href={`tel:${contactInfo.phone}`} className="w-fit hover:text-white">
            {contactInfo.phone}
          </a>
          {/* 공개 버전: mailto 바로가기 없이 이메일 주소를 텍스트로만 표기한다. */}
          <span className="w-fit select-all">{contactInfo.email}</span>
          <a
            href={`https://${contactInfo.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit hover:text-white"
          >
            {contactInfo.website}
          </a>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>{contactInfo.copyright}</p>
          <div className="flex gap-4">
            {legalLinks.map((label) => (
              <span key={label} className="cursor-not-allowed" title="준비 중입니다">
                {label}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
