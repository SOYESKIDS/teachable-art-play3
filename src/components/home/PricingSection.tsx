"use client";

import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { comparisonRows, priceDisclaimerLines, pricingPackages } from "@/data/packages";
import { ctaLabels, pricingCopy } from "@/data/site-copy";
import { useLeadForm } from "@/components/forms/LeadFormContext";
import type { PricingPackage } from "@/types/content";

const cardVariant: Record<PricingPackage["accentColor"], "basic" | "highlighted" | "premium"> = {
  "light-blue": "basic",
  "ivory-yellow": "highlighted",
  "navy-yellow": "premium",
};

const CheckIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={`h-3.5 w-3.5 shrink-0 ${className}`}
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M5 8.2l2 2 4-4.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function PricingSection() {
  const { openLeadForm } = useLeadForm();

  return (
    <section
      id="pricing"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-20 sm:py-24 lg:py-32"
    >
      <Container>
        <SectionHeader headline={pricingCopy.headline} subCopy={pricingCopy.subCopy} />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-start">
          {pricingPackages.map((pkg) => (
            <Card
              key={pkg.id}
              variant={cardVariant[pkg.accentColor]}
              className={`flex flex-col gap-5 p-7 sm:p-8 ${
                pkg.isBest ? "sm:-mt-4 border-2 border-yellow shadow-[0_12px_32px_rgba(243,186,24,0.18)]" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${
                    pkg.accentColor === "navy-yellow"
                      ? "bg-white/10 text-white"
                      : "bg-navy/[0.06] text-navy/60"
                  }`}
                >
                  {pkg.label}
                </span>
                {pkg.isBest && (
                  <span className="rounded-full bg-yellow px-3 py-1 text-[11px] font-bold text-navy">
                    BEST
                  </span>
                )}
              </div>

              <div>
                <h3
                  className={`text-2xl font-extrabold sm:text-3xl ${
                    pkg.accentColor === "navy-yellow" ? "text-white" : "text-navy"
                  }`}
                >
                  {pkg.name}
                </h3>
                <p
                  className={`mt-1 text-sm font-medium ${
                    pkg.accentColor === "navy-yellow" ? "text-white/60" : "text-navy/50"
                  }`}
                >
                  {pkg.subtitle}
                </p>
              </div>

              <dl
                className={`grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:text-sm ${
                  pkg.accentColor === "navy-yellow" ? "text-white/70" : "text-navy/60"
                }`}
              >
                <dt className="font-medium opacity-70">운영기간</dt>
                <dd className="text-right font-semibold">{pkg.durationWeeks}주</dd>
                <dt className="font-medium opacity-70">운영</dt>
                <dd className="text-right font-semibold">{pkg.frequency}</dd>
                <dt className="font-medium opacity-70">권장연령</dt>
                <dd className="text-right font-semibold">{pkg.recommendedAge}</dd>
                <dt className="font-medium opacity-70">기준</dt>
                <dd className="text-right font-semibold">{pkg.priceUnitNote}</dd>
              </dl>

              <div
                className={`border-t pt-4 ${
                  pkg.accentColor === "navy-yellow" ? "border-white/15" : "border-navy/10"
                }`}
              >
                <p
                  className={`text-3xl font-extrabold sm:text-4xl ${
                    pkg.accentColor === "navy-yellow" ? "text-white" : "text-navy"
                  }`}
                >
                  {pkg.monthlyPriceKrw.toLocaleString("ko-KR")}
                  <span className="ml-1 text-base font-semibold opacity-60">원 / 월</span>
                </p>
              </div>

              <ul
                className={`flex flex-col gap-2 text-sm ${
                  pkg.accentColor === "navy-yellow" ? "text-white/80" : "text-navy/70"
                }`}
              >
                {pkg.contentItems.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckIcon
                      className={
                        pkg.accentColor === "navy-yellow" ? "text-yellow" : "text-trust-blue"
                      }
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="primary"
                data-cta={`select-${pkg.id}`}
                onClick={() => openLeadForm("purchase_interest", pkg.id)}
                className="mt-auto w-full px-6 py-3.5 text-sm font-bold sm:text-base"
              >
                {ctaLabels.selectProduct}
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-6 text-center text-xs leading-relaxed text-navy/45">
          {priceDisclaimerLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        {/* 비교표 — Desktop: Table / Mobile: Card */}
        <div className="mt-16">
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse overflow-hidden rounded-2xl border border-navy/10 text-sm">
              <thead>
                <tr className="bg-ivory text-navy">
                  <th className="w-40 px-5 py-4 text-left font-semibold text-navy/50" />
                  {pricingPackages.map((pkg) => (
                    <th key={pkg.id} className="px-5 py-4 text-left font-bold">
                      {pkg.name}
                      {pkg.isBest && (
                        <span className="ml-2 rounded-full bg-yellow px-2 py-0.5 text-[10px] font-bold text-navy">
                          BEST
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, rowIndex) => (
                  <tr
                    key={row.label}
                    className={rowIndex % 2 === 1 ? "bg-ivory/50" : "bg-white"}
                  >
                    <th className="px-5 py-3.5 text-left font-semibold text-navy/50">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td key={index} className="px-5 py-3.5 text-navy/75">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 sm:hidden">
            {pricingPackages.map((pkg, pkgIndex) => (
              <div key={pkg.id} className="rounded-xl border border-navy/10 bg-white p-5">
                <p className="text-sm font-bold text-navy">
                  {pkg.name}
                  {pkg.isBest && (
                    <span className="ml-2 rounded-full bg-yellow px-2 py-0.5 text-[10px] font-bold text-navy">
                      BEST
                    </span>
                  )}
                </p>
                <dl className="mt-3 flex flex-col gap-2 text-xs">
                  {comparisonRows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-3">
                      <dt className="text-navy/45">{row.label}</dt>
                      <dd className="text-right font-medium text-navy/75">
                        {row.values[pkgIndex]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
