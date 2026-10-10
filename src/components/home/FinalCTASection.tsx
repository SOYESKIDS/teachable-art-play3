import { Container } from "@/components/ui/Container";
import { LeadCtaButton } from "@/components/forms/LeadCtaButton";
import { contactSectionCopy, ctaLabels } from "@/data/site-copy";
import { finalNarrative } from "@/data/home-narrative";

/**
 * 공개 홈페이지 마지막 결정 지점.
 *
 * ★ Primary conversion이 여기에도 있다 — 도입 상담 신청(consult).
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
      aria-labelledby="contact-title"
      /*
        ★ V4: Footer(navy-deep)와 한 덩어리로 붙지 않게, 섹션 바탕은 ivory 로 두고
          결정 지점만 navy 패널로 띄운다. 패널 아래 ivory 띠가 Footer 와의 경계가 된다.
      */
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-12 sm:py-16 lg:py-20"
    >
      <Container>
        <div
          data-surface="dark"
          className="grid gap-10 rounded-3xl bg-navy px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-14 lg:px-14 lg:py-16"
        >
          <div>
            <p className="text-label font-semibold text-accent-on-dark">{finalNarrative.kicker}</p>
            <h2 id="contact-title" className="mt-4 whitespace-pre-line text-h2 font-bold text-white">
              {finalNarrative.headline}
            </h2>
            <p className="measure mt-4 text-lead text-white/75">{finalNarrative.subCopy}</p>
            <div className="mt-8">
              <LeadCtaButton
                type="consult"
                variant="inverse"
                size="lg"
                dataCta="consult-final-cta"
                className="font-bold"
              >
                {ctaLabels.consultApply}
              </LeadCtaButton>
            </div>
          </div>

          {/* 전화 · 이메일은 상담 신청 옆 보조 경로 — mailto 없이 복사만 쉽게 */}
          <div>
            <dl className="grid gap-3">
              {contactSectionCopy.channels.map((channel) => (
                <div key={channel.label} className="rounded-2xl border border-line-inverse px-5 py-5">
                  <dt className="eyebrow text-white/65">{channel.label}</dt>
                  <dd className="mt-2 select-all break-all text-title-lg font-bold tabular-nums text-white">
                    {channel.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-caption text-white/70">{contactSectionCopy.note}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
