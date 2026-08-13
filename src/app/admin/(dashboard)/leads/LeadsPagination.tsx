import Link from "next/link";
import {
  PAGE_SIZE,
  buildLeadsHref,
  type LeadListFilters,
} from "@/lib/admin/lead-filters";

interface LeadsPaginationProps {
  filters: LeadListFilters;
  page: number;
  pageCount: number;
  total: number;
}

const linkClasses =
  "flex h-9 min-w-9 items-center justify-center rounded-lg border border-navy/15 bg-white px-3 text-[13px] font-semibold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5";

const disabledClasses =
  "flex h-9 min-w-9 items-center justify-center rounded-lg border border-navy/10 bg-navy/[0.03] px-3 text-[13px] font-semibold text-navy/30";

/** 현재 페이지 주변만 노출하는 압축형 페이지 번호 */
function visiblePages(page: number, pageCount: number): number[] {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  const pages: number[] = [];

  for (let current = start; current <= end; current += 1) {
    pages.push(current);
  }

  return pages;
}

export function LeadsPagination({
  filters,
  page,
  pageCount,
  total,
}: LeadsPaginationProps) {
  const firstIndex = (page - 1) * PAGE_SIZE + 1;
  const lastIndex = Math.min(page * PAGE_SIZE, total);

  return (
    <nav
      aria-label="문의 목록 페이지"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-[12px] text-navy/50 tabular-nums">
        총 {total.toLocaleString("ko-KR")}건 중 {firstIndex.toLocaleString("ko-KR")}–
        {lastIndex.toLocaleString("ko-KR")}건
      </p>

      {pageCount > 1 ? (
        <div className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link
              href={buildLeadsHref(filters, { page: page - 1 })}
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
                className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-navy bg-navy px-3 text-[13px] font-semibold text-white tabular-nums"
              >
                {current}
              </span>
            ) : (
              <Link
                key={current}
                href={buildLeadsHref(filters, { page: current })}
                className={`${linkClasses} tabular-nums`}
              >
                {current}
              </Link>
            ),
          )}

          {page < pageCount ? (
            <Link
              href={buildLeadsHref(filters, { page: page + 1 })}
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
