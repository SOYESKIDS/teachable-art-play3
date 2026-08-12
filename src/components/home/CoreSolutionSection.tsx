import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { coreSolutionCopy, coreSolutionFlow } from "@/data/site-copy";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[22px] w-[22px]",
  "aria-hidden": true,
};

/** coreSolutionFlow(6-STEP) 순서와 반드시 일치해야 하는 아이콘 */
const stepIcons: ReactNode[] = [
  // STEP 01 INPUT — 책
  <svg key="input" {...iconProps}>
    <path d="M4 5.2C4 4.5 4.6 4 5.3 4H11v16H5.3A1.3 1.3 0 0 1 4 18.7V5.2Z" />
    <path d="M20 5.2c0-.7-.6-1.2-1.3-1.2H13v16h5.7c.7 0 1.3-.5 1.3-1.3V5.2Z" />
  </svg>,
  // STEP 02 CREATE — 연필
  <svg key="create" {...iconProps}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>,
  // STEP 03 RECORD — 카메라
  <svg key="record" {...iconProps}>
    <rect x="3" y="7" width="18" height="13" rx="2.2" />
    <path d="M8 7l1.3-2.3h5.4L16 7" />
    <circle cx="12" cy="13.5" r="3.2" />
  </svg>,
  // STEP 04 AI ORGANIZE — 라인 차트
  <svg key="ai" {...iconProps}>
    <path d="M4 20V5" />
    <path d="M4 20h16" />
    <path d="m7 15.5 3-3.2 2.8 2 4.2-5.3" />
  </svg>,
  // STEP 05 TEACHER REVIEW — 체크
  <svg key="review" {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.3 12.3 2.3 2.3 5-5.4" />
  </svg>,
  // STEP 06 DELIVER — 대시보드 그리드
  <svg key="deliver" {...iconProps}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.3" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.3" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="1.3" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.3" />
  </svg>,
];

export function CoreSolutionSection() {
  return (
    <section
      id="solution"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-20 sm:py-24 lg:py-32"
    >
      <Container>
        <SectionHeader
          headline={coreSolutionCopy.headline}
          subCopy={coreSolutionCopy.subCopy}
        />

        <div className="mt-14 rounded-3xl border border-trust-blue/10 bg-trust-blue/[0.04] p-8 sm:p-12 lg:p-16">
          <ol className="relative flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-0">
            {coreSolutionFlow.map((step, index) => (
              <li
                key={step.order}
                className="relative flex items-start gap-5 lg:flex-1 lg:flex-col lg:items-center lg:gap-4 lg:px-2 lg:text-center"
              >
                {index < coreSolutionFlow.length - 1 && (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-10 left-[28px] top-14 w-[2px] bg-navy/15 lg:hidden"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute left-1/2 top-[28px] hidden h-[2px] w-full bg-navy/15 lg:block"
                    />
                  </>
                )}

                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                  {stepIcons[index]}
                </div>

                <div>
                  <p className="text-xs font-bold tracking-wide text-trust-blue sm:text-sm">
                    {step.code} · {step.label}
                  </p>
                  <h3 className="mt-1.5 text-lg font-bold text-navy sm:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy/60 sm:text-base lg:mx-auto lg:max-w-[180px]">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="mx-auto mt-14 max-w-3xl text-center text-xl font-semibold leading-relaxed text-navy sm:text-2xl">
          {coreSolutionCopy.highlight}
        </p>

        <div className="mt-8 text-center">
          <a
            href="#pricing"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy transition-colors hover:text-trust-blue"
          >
            {coreSolutionCopy.viewProgramLink}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </Container>
    </section>
  );
}
