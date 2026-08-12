"use client";

import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ctaLabels, finalCtaCopy } from "@/data/site-copy";
import { useLeadForm } from "@/components/forms/LeadFormContext";

export function FinalCTASection() {
  const { openLeadForm } = useLeadForm();

  return (
    <section
      id="start"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-navy py-20 sm:py-28 lg:py-32"
    >
      <Container className="flex flex-col items-center text-center">
        <h2 className="max-w-2xl whitespace-pre-line text-3xl font-bold leading-[1.25] text-white sm:text-4xl lg:text-[3rem]">
          {finalCtaCopy.headline}
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
          {finalCtaCopy.subCopy}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button
            type="button"
            variant="primary"
            data-cta="pilot-final"
            onClick={() => openLeadForm("pilot")}
            className="px-9 py-4 text-base font-bold sm:text-lg"
          >
            {ctaLabels.primary}
          </Button>
          <button
            type="button"
            data-cta="demo-final"
            onClick={() => openLeadForm("demo")}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-transparent px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:border-white/40 hover:bg-white/10 active:scale-[0.98] sm:text-base"
          >
            {ctaLabels.secondary}
          </button>
        </div>

        <button
          type="button"
          data-cta="consult"
          onClick={() => openLeadForm("consult")}
          className="mt-6 text-sm font-medium text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          {ctaLabels.tertiary}
        </button>
      </Container>
    </section>
  );
}
