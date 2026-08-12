import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { threeNeeds, threeNeedsCopy } from "@/data/site-copy";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
  "aria-hidden": true,
};

/** threeNeeds(director/teacher/parent) 순서와 반드시 일치해야 하는 절제된 Line Icon */
const roleIcons: ReactNode[] = [
  // 원장 — 건물/브랜드
  <svg key="director" {...iconProps}>
    <path d="M4 21V6.5L12 3l8 3.5V21" />
    <path d="M9 21v-6h6v6" />
    <path d="M9 11h.01M15 11h.01M9 7.5h.01M15 7.5h.01" />
  </svg>,
  // 담임교사 — 클립보드
  <svg key="teacher" {...iconProps}>
    <rect x="5.5" y="4" width="13" height="16.5" rx="2" />
    <path d="M9 4V3.3A1.3 1.3 0 0 1 10.3 2h3.4A1.3 1.3 0 0 1 15 3.3V4" />
    <path d="M9 12h6M9 15.5h6" />
  </svg>,
  // 학부모 — 하트
  <svg key="parent" {...iconProps}>
    <path d="M12 20.5s-7.5-4.6-9.8-9.3C.7 8 2.1 4.8 5.3 4c2-.5 3.9.3 5 1.9 1.1-1.6 3-2.4 5-1.9 3.2.8 4.6 4 3.1 7.2C19.1 15.9 12 20.5 12 20.5Z" />
  </svg>,
];

export function NeedsSection() {
  return (
    <section
      id="needs"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader headline={threeNeedsCopy.headline} />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {threeNeeds.map((persona, index) => (
            <Card
              key={persona.role}
              variant="basic"
              className="flex flex-col gap-6 p-8 sm:p-9"
            >
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-navy/[0.06] px-3 py-1.5 text-xs font-semibold text-navy/70">
                <span className="text-navy/50">{roleIcons[index]}</span>
                {persona.label}
              </span>

              <h3 className="whitespace-pre-line text-2xl font-bold leading-[1.3] text-navy sm:text-3xl">
                {persona.question}
              </h3>

              <ul className="mt-auto flex flex-col gap-2 border-t border-navy/10 pt-4 text-sm text-navy/60">
                {persona.needs.map((need) => (
                  <li key={need} className="flex items-center gap-2">
                    <span
                      className="h-1 w-1 shrink-0 rounded-full bg-trust-blue"
                      aria-hidden="true"
                    />
                    {need}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
