import { Container } from "@/components/ui/Container";
import { contactSectionCopy } from "@/data/site-copy";

/**
 * 공개 홈페이지 하단 CONTACT Section.
 * 공개 신청/구매 폼과 mailto 바로가기 없이, 담당자 연락처를 텍스트로만 안내한다.
 */
export function FinalCTASection() {
  return (
    <section
      id="contact"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-navy py-20 sm:py-24 lg:py-28"
    >
      <Container>
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-yellow sm:text-sm">
            {contactSectionCopy.eyebrow}
          </p>

          <h2 className="mt-5 text-3xl font-bold leading-[1.25] text-white sm:text-4xl lg:text-[2.75rem]">
            {contactSectionCopy.headline}
          </h2>

          <span
            aria-hidden="true"
            className="mt-7 block h-px w-16 bg-white/20"
          />

          <p className="mt-7 whitespace-pre-line text-base leading-[1.85] text-white/70 sm:text-lg">
            {contactSectionCopy.description}
          </p>

          <dl className="mt-12 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {contactSectionCopy.channels.map((channel) => (
              <div
                key={channel.label}
                className="rounded-2xl border border-white/12 bg-white/[0.04] px-6 py-7 text-center"
              >
                <dt className="text-[11px] font-semibold tracking-[0.2em] text-white/45">
                  {channel.label}
                </dt>
                <dd className="mt-3 select-all break-all text-xl font-semibold text-white sm:text-2xl">
                  {channel.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-10 whitespace-pre-line text-sm leading-relaxed text-white/45 sm:text-[15px]">
            {contactSectionCopy.note}
          </p>
        </div>
      </Container>
    </section>
  );
}
