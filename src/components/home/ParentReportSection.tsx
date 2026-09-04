import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DemoBadge } from "@/components/ui/DemoBadge";
import {
  parentReportCopy,
  parentReportDemo,
  parentReportInfoItems,
  reportCadence,
} from "@/data/site-copy";

export function ParentReportSection() {
  return (
    <section
      id="parent-report"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader
          headline={parentReportCopy.headline}
          subCopy={parentReportCopy.subCopy}
        />

        <div className="mt-16 grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-16">
          {/* 스마트폰 Mockup — 화면의 주인공 */}
          <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-4xl border-[7px] border-navy bg-white shadow-[var(--shadow-elevated)]">
            <div className="flex items-center justify-between border-b border-navy/10 bg-ivory px-6 py-4">
              <span className="rounded-full bg-navy/[0.06] px-2.5 py-1 text-[11px] font-bold text-navy/50">
                {parentReportDemo.weekLabel}
              </span>
              <DemoBadge />
            </div>

            <div className="p-6">
              <p className="text-xs font-bold text-navy/40">{parentReportDemo.headerLabel}</p>
              <h3 className="mt-1 text-xl font-bold text-navy sm:text-2xl">
                {parentReportDemo.activityTitle}
              </h3>

              <div
                aria-hidden="true"
                className="mt-5 flex aspect-[4/3] items-center justify-center rounded-xl bg-gradient-to-br from-navy/[0.05] to-trust-blue/[0.09]"
              >
                <span className="text-xs font-medium text-navy/35">대표 작품 이미지</span>
              </div>

              <div className="mt-5 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-bold text-navy/40">아이의 설명</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy/85">
                    &ldquo;{parentReportDemo.childQuote}&rdquo;
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-trust-blue">교사 코멘트</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy/85">
                    {parentReportDemo.teacherComment}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-navy/40">변화 기록</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy/85">
                    {parentReportDemo.changeNote}
                  </p>
                </div>
                <div className="rounded-xl bg-yellow/10 p-4">
                  <p className="text-xs font-bold text-navy/50">HOME TIP</p>
                  <p className="mt-1.5 text-sm font-medium leading-relaxed text-navy">
                    {parentReportDemo.homeTip}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 보조 Content */}
          <div className="flex flex-col gap-10">
            <ol className="flex flex-col gap-5">
              {parentReportInfoItems.map((item) => (
                <li key={item.order} className="flex items-baseline gap-4">
                  <span className="text-xl font-bold text-navy/20 sm:text-2xl">
                    {`0${item.order}`}
                  </span>
                  <span className="text-lg font-bold text-navy sm:text-xl">
                    {item.label}
                  </span>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap gap-3 border-t border-navy/10 pt-8">
              {reportCadence.map((cadence) => (
                <div
                  key={cadence.id}
                  className="rounded-xl border border-navy/10 bg-ivory px-4 py-3"
                >
                  <p className="text-[10px] font-bold tracking-wide text-trust-blue">
                    {cadence.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-navy">{cadence.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
