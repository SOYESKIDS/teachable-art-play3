import { Container } from "@/components/ui/Container";
import { contactSectionCopy } from "@/data/site-copy";

/**
 * 공개 홈페이지 하단 도입 상담 영역.
 *
 * ★ 신청 폼도 mailto 도 만들지 않는다.
 *   기존 정책 그대로다. 기관 담당자가 전화와 이메일 두 가지를 빠르게 찾고
 *   바로 복사할 수 있으면 그것으로 충분하다.
 *
 * ★ 두 창구의 무게를 다르게 둔다.
 *   전화가 먼저다 — B2B 도입 문의는 대부분 통화로 시작한다.
 *   이메일은 그 옆에 같은 크기로 두되 select-all 로 복사만 쉽게 한다.
 */
export function FinalCTASection() {
  return (
    <section
      id="contact"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-navy py-20 sm:py-24 lg:py-32"
    >
      <Container>
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="eyebrow text-yellow">{contactSectionCopy.eyebrow}</p>

          <h2 className="mt-5 text-h2 font-bold text-white">
            {contactSectionCopy.headline}
          </h2>

          <span
            aria-hidden="true"
            className="mt-7 block h-px w-16 bg-yellow/60"
          />

          <p className="measure mt-7 whitespace-pre-line text-lead text-white/70">
            {contactSectionCopy.description}
          </p>

          <dl className="mt-12 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {contactSectionCopy.channels.map((channel) => (
              <div
                key={channel.label}
                className="rounded-2xl border border-line-inverse bg-white/[0.04] px-6 py-8 text-left transition-colors hover:border-white/25"
              >
                <dt className="eyebrow text-white/45">{channel.label}</dt>
                <dd className="mt-3 select-all break-all text-[22px] font-bold tabular-nums text-white sm:text-[26px]">
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
