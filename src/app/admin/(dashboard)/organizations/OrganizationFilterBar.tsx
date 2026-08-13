"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ORGANIZATION_STATUSES,
  buildOrganizationsHref,
  hasActiveOrganizationFilters,
  type OrganizationListFilters,
} from "@/lib/admin/organization-filters";
import { ORGANIZATION_STATUS_LABELS } from "@/lib/admin/organization-labels";
import type { OrganizationStatus } from "@/types/organization";

interface OrganizationFilterBarProps {
  filters: OrganizationListFilters;
}

/** 모든 필터 상태는 URL searchParams에 있다. 새로고침·뒤로가기에도 유지된다. */
export function OrganizationFilterBar({ filters }: OrganizationFilterBarProps) {
  const router = useRouter();

  function navigate(overrides: Partial<OrganizationListFilters>) {
    router.push(buildOrganizationsHref(filters, { page: 1, ...overrides }));
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    navigate({ q: typeof value === "string" ? value : "" });
  }

  return (
    <div className="rounded-xl border border-navy/10 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-col gap-1.5">
          <label
            className="text-[11px] font-semibold text-navy/45"
            htmlFor="organization-search"
          >
            검색
          </label>
          <div className="flex gap-2">
            {/* key를 URL 검색어에 묶어 뒤로가기·초기화 시 입력창도 함께 되돌린다 */}
            <input
              key={filters.q}
              id="organization-search"
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="기관명"
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

        <div className="flex flex-col gap-1.5">
          <label
            className="text-[11px] font-semibold text-navy/45"
            htmlFor="organization-status"
          >
            상태
          </label>
          <select
            id="organization-status"
            value={filters.status}
            onChange={(event) =>
              navigate({
                status: event.target.value as OrganizationStatus | "all",
              })
            }
            className="h-10 w-full rounded-lg border border-navy/15 bg-white px-3 text-[13px] font-medium text-navy transition-colors focus:border-trust-blue focus:outline-none sm:w-[160px]"
          >
            <option value="all">전체</option>
            {ORGANIZATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORGANIZATION_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveOrganizationFilters(filters) ? (
        <div className="mt-3 border-t border-navy/8 pt-3">
          <button
            type="button"
            onClick={() => router.push("/admin/organizations")}
            className="text-[12px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
          >
            필터 초기화
          </button>
        </div>
      ) : null}
    </div>
  );
}
