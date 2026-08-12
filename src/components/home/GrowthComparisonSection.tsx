import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  growthAfter,
  growthBefore,
  growthCopy,
  growthExample,
  growthExampleDemoNote,
  growthObservationItems,
} from "@/data/site-copy";

const arrowIconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function GrowthComparisonSection() {
  return (
    <section
      id="growth"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-16 sm:py-20 lg:py-28"
    >
      <Container>
        <SectionHeader headline={growthCopy.headline} subCopy={growthCopy.subCopy} />

        {/* BEFORE / AFTER 비교 */}
        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[45fr_auto_55fr] lg:items-stretch lg:gap-6">
          {/* BEFORE — 의도적으로 단순하고 약하게 */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
            <span className="inline-block rounded-full bg-gray-200 px-3 py-1 text-xs font-bold tracking-wide text-gray-500">
              {growthBefore.label}
            </span>
            <p className="mt-2 text-xs text-gray-400">{growthBefore.sublabel}</p>

            <div
              aria-hidden="true"
              className="mt-5 flex aspect-[4/3] items-center justify-center rounded-xl bg-gray-200/70"
            >
              <span className="text-xs text-gray-400">사진 Placeholder</span>
            </div>

            <p className="mt-4 text-sm text-gray-500">&ldquo;{growthBefore.caption}&rdquo;</p>

            <ul className="mt-5 flex flex-col gap-1.5 border-t border-gray-200 pt-4">
              {growthBefore.problems.map((problem) => (
                <li key={problem} className="text-xs text-gray-400">
                  · {problem}
                </li>
              ))}
            </ul>
          </div>

          {/* Transition */}
          <div className="flex items-center justify-center gap-2 lg:flex-col lg:gap-3">
            <svg
              {...arrowIconProps}
              className="h-6 w-6 rotate-90 text-navy/30 lg:h-7 lg:w-7 lg:rotate-0"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            <p className="max-w-[110px] text-center text-[11px] font-medium leading-snug text-navy/40">
              {growthCopy.transitionCaption}
            </p>
          </div>

          {/* AFTER — Premium UI */}
          <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
            <span className="inline-block rounded-full bg-yellow/20 px-3 py-1 text-xs font-bold tracking-wide text-navy">
              {growthAfter.label}
            </span>
            <p className="mt-2 text-xs font-medium text-navy/40">{growthAfter.sublabel}</p>

            <div
              aria-hidden="true"
              className="mt-5 flex aspect-[4/3] items-center justify-center rounded-xl bg-gradient-to-br from-navy/[0.05] to-trust-blue/[0.09]"
            >
              <span className="text-xs font-medium text-navy/35">
                {growthAfter.artworkCaption}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3.5">
              <div>
                <p className="text-xs font-bold text-navy/40">아이의 말</p>
                <p className="mt-1 text-sm leading-relaxed text-navy/85">
                  &ldquo;{growthAfter.childQuote}&rdquo;
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-trust-blue">교사 관찰</p>
                <p className="mt-1 text-sm leading-relaxed text-navy/85">
                  {growthAfter.teacherComment}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 성장관찰 변화 예시 */}
        <div className="mt-16">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
            <div className="w-full rounded-2xl border border-navy/10 bg-white px-6 py-5 text-center sm:w-64">
              <p className="text-xs font-bold text-navy/40">{growthExample.before.label}</p>
              <p className="mt-2 text-base font-semibold leading-snug text-navy sm:text-lg">
                {growthExample.before.text}
              </p>
            </div>

            <svg
              {...arrowIconProps}
              className="h-6 w-6 rotate-90 text-navy/30 sm:rotate-0"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>

            <div className="w-full rounded-2xl border-2 border-trust-blue/25 bg-trust-blue/[0.06] px-6 py-5 text-center sm:w-64">
              <p className="text-xs font-bold text-trust-blue">{growthExample.after.label}</p>
              <p className="mt-2 text-base font-semibold leading-snug text-navy sm:text-lg">
                {growthExample.after.text}
              </p>
            </div>
          </div>

          <p className="mt-4 text-center text-xs font-medium text-navy/40">
            {growthExampleDemoNote}
          </p>

          {/* 성장관찰 5개 기준 — 보조 정보 */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy/35">
              성장관찰 기준 · 누리과정과 별개의 기록 기준
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {growthObservationItems.map((item) => (
                <span
                  key={item.label}
                  className="rounded-full border border-navy/10 bg-white px-3.5 py-1.5 text-xs font-medium text-navy/55"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
