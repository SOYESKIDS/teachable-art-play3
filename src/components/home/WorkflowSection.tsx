import type { ReactNode } from "react";
import { AvailabilityTag, HomeHeading, HomeSection } from "./HomeSection";
import { workflowNarrative as copy } from "@/data/home-narrative";

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ICONS: Record<string, ReactNode> = {
  book: (
    <svg {...iconProps}>
      <path d="M4 5.2C4 4.5 4.6 4 5.3 4H11v16H5.3A1.3 1.3 0 0 1 4 18.7V5.2Z" />
      <path d="M20 5.2c0-.7-.6-1.2-1.3-1.2H13v16h5.7c.7 0 1.3-.5 1.3-1.3V5.2Z" />
    </svg>
  ),
  eye: (
    <svg {...iconProps}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  pencil: (
    <svg {...iconProps}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M14 7l3 3" />
    </svg>
  ),
  check: (
    <svg {...iconProps}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </svg>
  ),
  grid: (
    <svg {...iconProps}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.3" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.3" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.3" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.3" />
    </svg>
  ),
};

/**
 * 03 HOW IT WORKS — 수업 → 관찰 → 기록 → 교사 확인 → 운영 확인.
 *
 * ★ 기능 나열(CoreSolution 6칸 + Value 3칸)을 하나의 흐름으로 바꿨다.
 *   각 단계는 번호 · 짧은 제목 · 한두 문장. 출시 전 기능에는 상태 배지를 단다.
 * ★ AI 는 여기 없다 — 흐름의 주인공은 교사의 관찰과 확인이다 (DEC-009 · DEC-071).
 */
export function WorkflowSection() {
  return (
    <HomeSection id="solution" tone="ivory" labelledBy="solution-title">
      <HomeHeading id="solution-title" eyebrow={copy.eyebrow} headline={copy.headline} />

      <ol className="relative mt-14 grid gap-4 md:grid-cols-5 md:gap-3">
        <span
          aria-hidden="true"
          className="absolute top-[38px] right-[10%] left-[10%] hidden h-px bg-line-strong md:block"
        />
        {copy.steps.map((step) => (
          <li
            key={step.no}
            className="relative flex gap-4 rounded-2xl border border-line bg-white p-5 md:flex-col md:gap-0 md:border-0 md:bg-transparent md:p-0"
          >
            <div className="flex shrink-0 flex-col items-center md:items-start">
              <span className="relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-line bg-white text-navy shadow-[var(--shadow-soft)] md:h-[76px] md:w-[76px]">
                {ICONS[step.icon]}
              </span>
            </div>
            <div className="min-w-0 md:mt-5 md:pr-2">
              <p className="flex items-center gap-2 text-caption font-bold text-accent-strong tabular-nums">
                {step.no}
                <span className="text-navy">{step.title}</span>
              </p>
              <h3 className="mt-1.5 text-body-lg font-bold text-navy">{step.lead}</h3>
              <p className="mt-1.5 text-label text-ink-muted">{step.body}</p>
              {"availability" in step && step.availability ? (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-micro text-ink-muted">
                  <AvailabilityTag value={step.availability} />
                  {step.availabilityNote}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </HomeSection>
  );
}
