"use client";

import { useState, type ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { platformCopy, platformTabs, publicNotice } from "@/data/site-copy";
import type { PlatformTab } from "@/types/content";

const arrowIconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const reportIconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[18px] w-[18px]",
  "aria-hidden": true,
};

const metricIconProps = {
  ...reportIconProps,
  className: "h-5 w-5",
};

const metricIcons: Record<string, ReactNode> = {
  "반별 진행": (
    <svg {...metricIconProps}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </svg>
  ),
  "작품·기록 업로드": (
    <svg {...metricIconProps}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20 15l-4.7-4.7a1.4 1.4 0 0 0-2 0L4.5 19" />
    </svg>
  ),
  "리포트 발송": (
    <svg {...metricIconProps}>
      <path d="M4 5.5 20 12 4 18.5 6.5 12 4 5.5Z" />
    </svg>
  ),
  "검토 대기": (
    <svg {...metricIconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
};

function AIPreview({ tab }: { tab: PlatformTab }) {
  return (
    <div className="mx-auto w-full max-w-4xl rounded-3xl border border-navy/10 bg-white p-8 sm:p-14">
      {tab.demoLabel && (
        <div className="mb-8 flex justify-center">
          <span className="rounded-full bg-navy/[0.06] px-3.5 py-1.5 text-xs font-semibold text-navy/50">
            {tab.demoLabel}
          </span>
        </div>
      )}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-bold tracking-wide text-navy/40">입력 기록</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {tab.input?.map((label) => (
              <span
                key={label}
                className="rounded-full border border-navy/15 bg-ivory px-5 py-2.5 text-sm font-semibold text-navy sm:text-base"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <svg {...arrowIconProps} className="h-7 w-7 rotate-90 text-navy/25 sm:rotate-0">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>

        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-bold tracking-wide text-trust-blue">AI 정리</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {tab.output?.map((label) => (
              <span
                key={label}
                className="rounded-full bg-trust-blue/10 px-5 py-2.5 text-sm font-semibold text-trust-blue sm:text-base"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ParentPreview({ tab }: { tab: PlatformTab }) {
  return (
    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-4xl border-[6px] border-navy bg-white shadow-[var(--shadow-elevated)]">
      <div className="flex items-center justify-between border-b border-navy/10 bg-ivory px-6 py-4">
        <p className="text-sm font-bold text-navy">{tab.headerLabel}</p>
        <DemoBadge />
      </div>

      <div className="p-6">
        <h3 className="text-lg font-bold text-navy sm:text-xl">{tab.activityTitle}</h3>

        <div
          aria-hidden="true"
          className="mt-4 flex aspect-[4/3] items-center justify-center rounded-xl bg-gradient-to-br from-navy/[0.05] to-trust-blue/[0.09]"
        >
          <span className="text-xs font-medium text-navy/35">대표 작품 이미지</span>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-navy/40">아이의 설명</p>
            <p className="mt-1.5 text-sm leading-relaxed text-navy/85">
              &ldquo;{tab.childQuote}&rdquo;
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-trust-blue">교사 코멘트</p>
            <p className="mt-1.5 text-sm leading-relaxed text-navy/85">
              {tab.teacherComment}
            </p>
          </div>
          <div className="rounded-xl bg-yellow/10 p-3.5">
            <p className="text-xs font-bold text-navy/50">가정연계 Tip</p>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-navy">
              {tab.homeTip}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tab.badges?.map((label) => (
            <span
              key={label}
              className="rounded-full bg-navy/[0.06] px-3 py-1.5 text-xs font-semibold text-navy/60"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DirectorPreview({ tab }: { tab: PlatformTab }) {
  return (
    <div className="mx-auto w-full overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-[var(--shadow-elevated)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-navy/10 bg-ivory px-5 py-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-navy/15" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-navy/15" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-navy/15" aria-hidden="true" />
        <span className="ml-3 text-sm font-semibold text-navy">
          TeachAble Art Play 원장 대시보드
        </span>
        <DemoBadge label="DEMO SCREEN · 예시 데이터" className="ml-auto" />
      </div>

      <div className="p-6 sm:p-8">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tab.kpis?.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-navy/10 bg-ivory p-5">
              <span className="text-navy/35">{metricIcons[kpi.label]}</span>
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
            <p className="text-sm font-bold text-navy/70">{tab.weeklyUsageLabel}</p>
            <div className="mt-5 flex h-28 items-end gap-2.5">
              {tab.weeklyUsage?.map((value, index) => (
                <div
                  key={index}
                  style={{ height: `${value}%` }}
                  className="flex-1 rounded-t-md bg-trust-blue/70"
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-navy/10 bg-ivory p-5 sm:p-6">
            <p className="text-sm font-bold text-navy/70">{tab.recentReportsLabel}</p>
            <ul className="mt-4 flex flex-col gap-3">
              {tab.recentReports?.map((label) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-lg bg-white px-3.5 py-2.5 text-sm font-medium text-navy/75"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 반별 진행상태 */}
        <div className="mt-4 rounded-xl border border-navy/10 bg-ivory p-5 sm:p-6">
          <p className="text-sm font-bold text-navy/70">{tab.classProgressLabel}</p>
          <div className="mt-5 flex flex-col gap-3.5">
            {tab.classProgress?.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm font-semibold text-navy/70 sm:w-20">
                  {item.label}
                </span>
                <div className="h-2.5 flex-1 rounded-full bg-navy/10">
                  <div
                    style={{ width: `${item.percent}%` }}
                    className="h-2.5 rounded-full bg-yellow"
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs font-semibold text-navy/50">
                  {item.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlatformPreviewSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = platformTabs[activeIndex];

  return (
    <section
      id="platform"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-trust-blue/[0.03] py-20 sm:py-24 lg:py-32"
    >
      <Container>
        <SectionHeader headline={platformCopy.headline} subCopy={platformCopy.subCopy} />

        <div
          role="tablist"
          aria-label="플랫폼 미리보기 선택"
          className="mt-12 flex justify-center overflow-x-auto"
        >
          <div className="inline-flex gap-1 rounded-full border border-navy/10 bg-white p-1.5">
            {platformTabs.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeIndex === index}
                onClick={() => setActiveIndex(index)}
                className={`shrink-0 rounded-full px-5 py-3 text-sm font-semibold transition-colors sm:px-7 sm:text-base ${
                  activeIndex === index
                    ? "bg-navy text-white"
                    : "text-navy/55 hover:text-navy"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 sm:mt-12">
          <div className="mb-7 flex flex-wrap items-center justify-center gap-3">
            <DemoBadge />
            <p className="text-lg font-semibold text-navy sm:text-xl">
              {activeTab.tagline}
            </p>
          </div>

          {activeTab.id === "ai" && <AIPreview tab={activeTab} />}
          {activeTab.id === "parent" && <ParentPreview tab={activeTab} />}
          {activeTab.id === "director" && <DirectorPreview tab={activeTab} />}
        </div>

        <div className="mt-14 text-center">
          <p className="mx-auto max-w-xl rounded-2xl border border-navy/10 bg-ivory px-6 py-4 text-sm leading-relaxed text-navy/60 sm:text-base">
            {publicNotice.demo}
          </p>
        </div>
      </Container>
    </section>
  );
}
