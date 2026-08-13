"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  LEAD_PERIODS,
  LEAD_PERIOD_LABELS,
  LEAD_STATUSES,
  SUBMISSION_TYPES,
  buildLeadsHref,
  hasActiveFilters,
  type LeadListFilters,
  type LeadPeriod,
} from "@/lib/admin/lead-filters";
import {
  LEAD_STATUS_LABELS,
  SUBMISSION_TYPE_LABELS,
} from "@/lib/admin/lead-labels";
import type { LeadStatus } from "@/types/lead";
import type { SubmissionType } from "@/types/leadForm";

const selectClasses =
  "h-10 w-full rounded-lg border border-navy/15 bg-white px-3 text-[13px] font-medium text-navy transition-colors focus:border-trust-blue focus:outline-none sm:w-auto";

const labelClasses = "text-[11px] font-semibold text-navy/45";

interface LeadFilterBarProps {
  filters: LeadListFilters;
}

/**
 * 모든 필터 상태는 URL searchParams에 있다.
 * 새로고침·뒤로가기·링크 공유 시에도 조건이 그대로 유지된다.
 */
export function LeadFilterBar({ filters }: LeadFilterBarProps) {
  const router = useRouter();

  // 필터를 바꾸면 항상 1page로 돌아간다
  function navigate(overrides: Partial<LeadListFilters>) {
    router.push(buildLeadsHref(filters, { page: 1, ...overrides }));
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    navigate({ q: typeof value === "string" ? value : "" });
  }

  return (
    <div className="rounded-xl border border-navy/10 bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form onSubmit={handleSearch} className="flex flex-col gap-1.5">
          <label className={labelClasses} htmlFor="lead-search">
            검색
          </label>
          <div className="flex gap-2">
            {/* key를 URL 검색어에 묶어 뒤로가기·필터 초기화 시 입력창도 함께 되돌린다 */}
            <input
              key={filters.q}
              id="lead-search"
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="기관명 · 담당자 · 연락처"
              className="h-10 w-full rounded-lg border border-navy/15 bg-white px-3 text-[13px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none sm:w-[260px]"
            />
            <button
              type="submit"
              className="h-10 shrink-0 rounded-lg bg-navy px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep"
            >
              검색
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClasses} htmlFor="lead-type">
              신청 유형
            </label>
            <select
              id="lead-type"
              value={filters.type}
              onChange={(event) =>
                navigate({
                  type: event.target.value as SubmissionType | "all",
                })
              }
              className={selectClasses}
            >
              <option value="all">전체</option>
              {SUBMISSION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SUBMISSION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClasses} htmlFor="lead-status">
              상태
            </label>
            <select
              id="lead-status"
              value={filters.status}
              onChange={(event) =>
                navigate({ status: event.target.value as LeadStatus | "all" })
              }
              className={selectClasses}
            >
              <option value="all">전체</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClasses} htmlFor="lead-period">
              기간
            </label>
            <select
              id="lead-period"
              value={filters.period}
              onChange={(event) =>
                navigate({ period: event.target.value as LeadPeriod })
              }
              className={selectClasses}
            >
              {LEAD_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {LEAD_PERIOD_LABELS[period]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {hasActiveFilters(filters) ? (
        <div className="mt-3 border-t border-navy/8 pt-3">
          <button
            type="button"
            onClick={() => router.push("/admin/leads")}
            className="text-[12px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
          >
            필터 초기화
          </button>
        </div>
      ) : null}
    </div>
  );
}
