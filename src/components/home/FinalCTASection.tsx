import { Container } from "@/components/ui/Container";
import { LeadCtaButton } from "@/components/forms/LeadCtaButton";
import { contactSectionCopy, ctaLabels } from "@/data/site-copy";

/**
 * 공개 홈페이지 마지막 결정 지점.
 *
 * ★ Primary conversion이 여기에도 있다 — 20분 데모 신청.
 *   여기까지 읽고 내려온 사람에게 다시 "전화하세요"라고만 하면
 *   행동이 오늘 밤으로 미뤄진다. 지금 누를 수 있는 버튼을 먼저 둔다.
 *
 * ★ 전화·이메일은 그 아래 secondary channel로 남긴다.
 *   mailto 는 여전히 만들지 않는다 — 기관 담당자는 대부분 번호를 복사해
 *   내부 결재 후 연락한다. select-all 로 복사만 쉽게 한다.
 */
export function FinalCTASection() {
  return (
    <section
      id="contact"
      /*
        ★ Footer 와 같은 남색이라 둘이 한 덩어리로 붙어 보였다.
          이 구간이 페이지의 마지막 결정 지점이므로 여기를 가장 어둡게 두고
          (navy-deep) Footer 를 한 단계 밝게 남긴다. 선을 하나 더 긋는 것보다
          면의 밝기 차이가 자연스럽다.
      */
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-navy-deep py-20 sm:py-24 lg:py-32"
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

          <div className="mt-11 flex justify-center">
            <LeadCtaButton
              type="demo"
              variant="primary"
              dataCta="demo-final-cta"
              className="px-8 py-4 text-base font-bold sm:text-lg"
            >
              {ctaLabels.demo}
            </LeadCtaButton>
          </div>

          {/* 전화·이메일은 데모 신청 아래 secondary channel로 둔다 */}
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
