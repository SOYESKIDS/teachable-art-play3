import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { safeOperationCopy, safeOperationPrinciples } from "@/data/site-copy";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-6 w-6",
  "aria-hidden": true,
};

/** safeOperationPrinciples 순서와 반드시 일치해야 하는 아이콘 */
const principleIcons: ReactNode[] = [
  <svg key="no-diagnose" {...iconProps}>
    <path d="M12 3.5 4.5 6.7v5.1c0 4.6 3.2 7.7 7.5 8.7 4.3-1 7.5-4.1 7.5-8.7V6.7L12 3.5Z" />
    <path d="M9.5 12.5 8 11M9.5 12.5 12 10M14.5 12.5 16 11M14.5 12.5 12 10" />
  </svg>,
  <svg key="review" {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.3 12.3 2.3 2.3 5-5.4" />
  </svg>,
  <svg key="access" {...iconProps}>
    <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>,
  <svg key="approved" {...iconProps}>
    <path d="M20.5 12a8 8 0 0 1-11.9 6.9L4 20l1.2-4.4A8 8 0 1 1 20.5 12Z" />
    <path d="m9.5 12 1.8 1.8L14.5 10" />
  </svg>,
];

export function SafeOperationSection() {
  return (
    <section
      id="safe-operation"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader
          headline={safeOperationCopy.headline}
          subCopy={safeOperationCopy.subCopy}
        />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {safeOperationPrinciples.map((principle, index) => (
            <div
              key={principle.order}
              className="flex flex-col items-start gap-4 rounded-2xl border border-navy/10 bg-white p-6 shadow-[var(--shadow-soft)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy/[0.06] text-navy">
                {principleIcons[index]}
              </span>
              <p className="text-base font-bold leading-snug text-navy sm:text-lg">
                {principle.text}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-sm font-medium text-navy/45">
          {safeOperationCopy.reconnect}
        </p>
      </Container>
    </section>
  );
}
