import Link from "next/link";
import {
  ORGANIZATION_PAGE_SIZE,
  buildOrganizationsHref,
  type OrganizationListFilters,
} from "@/lib/admin/organization-filters";

interface OrganizationsPaginationProps {
  filters: OrganizationListFilters;
  page: number;
  pageCount: number;
  total: number;
}

const linkClasses =
  "flex h-11 min-w-11 items-center justify-center rounded-lg border border-line-strong bg-white px-3 text-caption font-semibold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5";

const disabledClasses =
  "flex h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-navy/[0.03] px-3 text-caption font-semibold text-navy/30";

function visiblePages(page: number, pageCount: number): number[] {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  const pages: number[] = [];

  for (let current = start; current <= end; current += 1) {
    pages.push(current);
  }

  return pages;
}

export function OrganizationsPagination({
  filters,
  page,
  pageCount,
  total,
}: OrganizationsPaginationProps) {
  const firstIndex = (page - 1) * ORGANIZATION_PAGE_SIZE + 1;
  const lastIndex = Math.min(page * ORGANIZATION_PAGE_SIZE, total);

  return (
    <nav
      aria-label="기관 목록 페이지"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-micro text-ink-muted tabular-nums">
        총 {total.toLocaleString("ko-KR")}곳 중{" "}
        {firstIndex.toLocaleString("ko-KR")}–{lastIndex.toLocaleString("ko-KR")}곳
      </p>

      {pageCount > 1 ? (
        <div className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link
              href={buildOrganizationsHref(filters, { page: page - 1 })}
              className={linkClasses}
              rel="prev"
            >
              이전
            </Link>
          ) : (
            <span className={disabledClasses}>이전</span>
          )}

          {visiblePages(page, pageCount).map((current) =>
            current === page ? (
              <span
                key={current}
                aria-current="page"
                className="flex h-11 min-w-11 items-center justify-center rounded-lg border border-navy bg-navy px-3 text-caption font-semibold text-white tabular-nums"
              >
                {current}
              </span>
            ) : (
              <Link
                key={current}
                href={buildOrganizationsHref(filters, { page: current })}
                className={`${linkClasses} tabular-nums`}
              >
                {current}
              </Link>
            ),
          )}

          {page < pageCount ? (
            <Link
              href={buildOrganizationsHref(filters, { page: page + 1 })}
              className={linkClasses}
              rel="next"
            >
              다음
            </Link>
          ) : (
            <span className={disabledClasses}>다음</span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
