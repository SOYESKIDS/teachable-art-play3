import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { contactInfo, legalLinks, navigation } from "@/data/site-copy";

export function Footer() {
  // 모바일 하단 고정 CTA(약 72px)에 Footer 내용이 가리지 않도록 아래 여백은 Footer 안에서 확보한다.
  return (
    <footer className="border-t border-navy/10 bg-navy pt-14 pb-32 text-white/70 sm:pt-16 lg:pb-16">
      <Container>
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[0.14em] text-white/45">
              SOYESKIDS
            </span>
            <span className="font-serif text-xl italic text-white">TeachAble Art Play</span>
          </div>

          <nav aria-label="Footer 내비게이션" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
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
