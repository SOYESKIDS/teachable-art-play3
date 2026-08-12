import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DemoBadge } from "@/components/ui/DemoBadge";
import {
  dashboardCallouts,
  dashboardCopy,
  dashboardKpis,
  dashboardRecentReports,
  dashboardRecentReportsLabel,
  dashboardSidebarItems,
  dashboardTeacherValue,
  dashboardWeeklyUsage,
  dashboardWeeklyUsageLabel,
} from "@/data/site-copy";

const kpiIconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
  "aria-hidden": true,
};

const kpiIcons: Record<string, ReactNode> = {
  "반별 수업 진행": (
    <svg {...kpiIconProps}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </svg>
  ),
  "작품·기록 업로드": (
    <svg {...kpiIconProps}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20 15l-4.7-4.7a1.4 1.4 0 0 0-2 0L4.5 19" />
    </svg>
  ),
  "리포트 발송": (
    <svg {...kpiIconProps}>
      <path d="M4 5.5 20 12 4 18.5 6.5 12 4 5.5Z" />
    </svg>
  ),
  "검토 대기": (
    <svg {...kpiIconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
};

export function DirectorDashboardSection() {
  return (
    <section
      id="dashboard"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader headline={dashboardCopy.headline} subCopy={dashboardCopy.subCopy} />

        {/* Desktop Browser App Mockup */}
        <div className="mt-14 overflow-hidden rounded-[22px] border border-navy/10 bg-white shadow-[0_24px_48px_rgba(21,46,79,0.12)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-navy/10 bg-navy px-5 py-4 text-white sm:px-7">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-base italic text-white/70">
                TeachAble Art Play
              </span>
              <span className="text-base font-bold sm:text-lg">원장 대시보드</span>
              <span className="text-xs text-white/40">2026 · DEMO</span>
            </div>
            <DemoBadge
              label="DEMO SCREEN · 예시 데이터"
              className="ml-auto bg-white/10 text-white"
            />
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Sidebar (Demo — 실제 동작하지 않음) */}
            <aside className="hidden shrink-0 flex-col gap-1 border-r border-navy/10 bg-ivory p-4 lg:flex lg:w-56">
              {dashboardSidebarItems.map((item, index) => (
                <span
                  key={item}
                  className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                    index === 0
                      ? "bg-navy text-white"
                      : "text-navy/55"
                  }`}
                >
                  {item}
                </span>
              ))}
            </aside>

            {/* Main */}
            <div className="flex-1 p-6 sm:p-8">
              {/* KPI */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {dashboardKpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-xl border border-navy/10 bg-ivory p-5"
                  >
                    <span className="text-navy/35">{kpiIcons[kpi.label]}</span>
                    <p className="mt-3 text-2xl font-extrabold text-navy sm:text-3xl">
                      {kpi.value}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-navy/50 sm:text-sm">
                      {kpi.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* 이용현황 + 최근 리포트 */}
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-navy/10 bg-ivory p-5 sm:p-6">
                  <p className="text-sm font-bold text-navy/70">
                    {dashboardWeeklyUsageLabel}
                  </p>
                  <div className="mt-5 flex h-28 items-end gap-2">
                    {dashboardWeeklyUsage.map((value, index) => (
                      <div
                        key={index}
                        className="flex flex-1 flex-col items-center gap-1.5"
                      >
                        <div
                          style={{ height: `${value}%` }}
                          className="w-full rounded-t-md bg-trust-blue/70"
                        />
                        <span className="text-[10px] font-medium text-navy/35">
                          {`W${index + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-navy/10 bg-ivory p-5 sm:p-6">
                  <p className="text-sm font-bold text-navy/70">
                    {dashboardRecentReportsLabel}
                  </p>
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {dashboardRecentReports.map((report) => (
                      <li
                        key={report.label}
                        className="flex items-center justify-between rounded-lg bg-white px-4 py-3"
                      >
                        <span className="text-sm font-semibold text-navy/80">
                          {report.label}
                        </span>
                        <span
                          className={`flex items-center gap-1.5 text-xs font-bold ${
                            report.status === "완료" ? "text-navy/50" : "text-yellow"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${
                              report.status === "완료" ? "bg-navy/30" : "bg-yellow"
                            }`}
                          />
                          {report.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Callout — Dashboard보다 작게, 최대 3개 */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {dashboardCallouts.map((callout) => (
            <div
              key={callout.order}
              className="flex items-start gap-3 rounded-xl border border-navy/10 bg-white px-4 py-3.5"
            >
              <span className="text-sm font-bold text-navy/25">{`0${callout.order}`}</span>
              <p className="text-sm text-navy/65">{callout.text}</p>
            </div>
          ))}
        </div>

        {/* Teacher Value 보조 */}
        <p className="mt-8 text-center text-sm text-navy/50">
          원장 · {dashboardTeacherValue.director}{" "}
          <span className="mx-2 text-navy/20">|</span> 교사 ·{" "}
          {dashboardTeacherValue.teacher}
        </p>
      </Container>
    </section>
  );
}
