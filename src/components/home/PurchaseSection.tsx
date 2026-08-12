"use client";

import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { purchaseCopy } from "@/data/site-copy";
import { pricingPackages } from "@/data/packages";
import { useLeadForm } from "@/components/forms/LeadFormContext";

export function PurchaseSection() {
  const { lastSelectedPackageCode, openLeadForm } = useLeadForm();
  const selectedPackage = pricingPackages.find((pkg) => pkg.id === lastSelectedPackageCode);

  return (
    <section
      id="purchase"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader headline={purchaseCopy.headline} />

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* A. 바로 도입 */}
          <Card variant="basic" className="flex flex-col gap-5 p-8 sm:p-9">
            {selectedPackage && (
              <span className="inline-flex w-fit items-center rounded-full bg-trust-blue/10 px-3 py-1 text-xs font-bold text-trust-blue">
                선택하신 상품 · {selectedPackage.name}
              </span>
            )}
            <h3 className="whitespace-pre-line text-2xl font-bold leading-[1.3] text-navy sm:text-3xl">
              {purchaseCopy.direct.title}
            </h3>
            <p className="text-base leading-relaxed text-navy/60">
              {purchaseCopy.direct.description}
            </p>

            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-navy/40">
              {purchaseCopy.direct.flow.map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  {step}
                  {index < purchaseCopy.direct.flow.length - 1 && (
                    <span aria-hidden="true">→</span>
                  )}
                </li>
              ))}
            </ol>

            <ButtonLink
              href="#pricing"
              variant="secondary"
              data-cta="purchase"
              className="mt-auto px-7 py-3.5 text-sm font-bold sm:text-base"
            >
              {purchaseCopy.direct.cta}
            </ButtonLink>
          </Card>

          {/* B. 상담 후 도입 */}
          <Card variant="basic" className="flex flex-col gap-5 p-8 sm:p-9">
            <h3 className="whitespace-pre-line text-2xl font-bold leading-[1.3] text-navy sm:text-3xl">
              {purchaseCopy.consult.title}
            </h3>
            <p className="text-base leading-relaxed text-navy/60">
              {purchaseCopy.consult.description}
            </p>

            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-navy/40">
              {purchaseCopy.consult.flow.map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  {step}
                  {index < purchaseCopy.consult.flow.length - 1 && (
                    <span aria-hidden="true">→</span>
                  )}
                </li>
              ))}
            </ol>

            <Button
              type="button"
              variant="tertiary"
              data-cta="consult"
              onClick={() => openLeadForm("consult")}
              className="mt-auto px-7 py-3.5 text-sm font-medium sm:text-base"
            >
              {purchaseCopy.consult.cta}
            </Button>
          </Card>
        </div>
      </Container>
    </section>
  );
}
