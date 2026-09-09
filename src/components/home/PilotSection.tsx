import { Container } from "@/components/ui/Container";
import { LeadCtaButton } from "@/components/forms/LeadCtaButton";
import { pilotOffer } from "@/data/packages";
import { ctaLabels, demoOffer } from "@/data/site-copy";

/**
 * 도입 전 두 단계를 한 Section에 담는다 — 20분 데모, 그리고 4주 파일럿.
 *
 * ★ 순서가 곧 메시지다.
 *   위가 데모, 아래가 파일럿이다. 방문자가 오늘 할 수 있는 행동은 데모이고
 *   파일럿은 그다음이다. 두 카드를 나란히 놓으면 무게가 같아 보여서
 *   "무엇부터 해야 하는가"가 흐려진다. 그래서 데모를 밝은 면에 크게 두고,
 *   파일럿은 아래 남색 블록으로 한 단계 낮춘다.
 *
 * ★ Section을 새로 만들지 않았다.
 *   기존 PilotSection 안에 데모를 흡수했다. 홈페이지 top-level section 수는
 *   그대로 19개다.
 */
export function PilotSection() {
  return (
    <section
      id="pilot"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-12 sm:py-16 lg:py-20"
    >
      <Container>
        {/* ── 20분 데모 — 홈페이지의 Primary conversion ───────────────── */}
        <div className="overflow-hidden rounded-3xl border border-line bg-white px-6 py-12 sm:px-14 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow text-trust-blue">{demoOffer.eyebrow}</p>

            <h2 className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-h2 font-bold text-navy">
              {demoOffer.headline}
            </h2>

            <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              {demoOffer.items.map((item) => (
                <li
                  key={item}
                  className="break-keep rounded-full border border-line bg-ivory px-4 py-2 text-[13px] font-semibold text-navy/75 sm:text-sm"
                >
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex justify-center">
              <LeadCtaButton
                type="demo"
                variant="primary"
                dataCta="demo-pilot-section"
                className="px-8 py-4 text-base font-bold sm:text-lg"
              >
                {ctaLabels.demo}
              </LeadCtaButton>
            </div>
          </div>
        </div>

        {/* ── 4주 파일럿 — 데모 다음 단계 ─────────────────────────────── */}
        <div className="mt-6 overflow-hidden rounded-3xl bg-navy px-6 py-12 text-center sm:px-14 sm:py-14">
          <p className="text-xs font-bold tracking-[0.14em] text-yellow sm:text-sm">
            {pilotOffer.eyebrow}
          </p>
          <h3 className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-3xl font-bold leading-[1.3] text-white sm:text-4xl">
            {pilotOffer.headline}
          </h3>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            {pilotOffer.subCopy}
          </p>

          {/* Pilot → 정규 도입 Flow */}
          <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-2 sm:gap-3">
            {pilotOffer.flow.map((step, index) => (
              <div key={step} className="flex items-center gap-2 sm:gap-3">
                <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white sm:text-sm">
                  {step}
                </span>
                {index < pilotOffer.flow.length - 1 && (
                  <span aria-hidden="true" className="text-white/30">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <LeadCtaButton
              type="pilot"
              variant="secondary"
              dataCta="pilot-inquiry"
              className="border border-white/25 bg-white/[0.08] px-7 py-3.5 text-sm font-bold text-white hover:bg-white/[0.14] sm:text-base"
            >
              {ctaLabels.pilot}
            </LeadCtaButton>
          </div>

          <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-white/40">
            {pilotOffer.note}
          </p>
        </div>
      </Container>
    </section>
  );
}
