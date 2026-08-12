"use client";

import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { pilotOffer } from "@/data/packages";
import { ctaLabels } from "@/data/site-copy";
import { useLeadForm } from "@/components/forms/LeadFormContext";

export function PilotSection() {
  const { openLeadForm } = useLeadForm();

  return (
    <section
      id="pilot"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-16 sm:py-20 lg:py-28"
    >
      <Container>
        <div className="overflow-hidden rounded-3xl bg-navy px-6 py-12 text-center sm:px-14 sm:py-16">
          <p className="text-xs font-bold tracking-[0.14em] text-yellow sm:text-sm">
            {pilotOffer.eyebrow}
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-3xl font-bold leading-[1.3] text-white sm:text-4xl lg:text-[2.75rem]">
            {pilotOffer.headline}
          </h2>
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

          <div className="mt-10">
            <Button
              type="button"
              variant="primary"
              data-cta="pilot-section"
              onClick={() => openLeadForm("pilot")}
              className="px-9 py-4 text-base font-bold sm:text-lg"
            >
              {ctaLabels.primary}
            </Button>
          </div>

          <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-white/40">
            {pilotOffer.note}
          </p>
        </div>
      </Container>
    </section>
  );
}
