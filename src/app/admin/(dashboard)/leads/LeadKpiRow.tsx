import Link from "next/link";
import type { LeadKpis } from "@/lib/admin/lead-queries";
import {
  DEFAULT_LEAD_FILTERS,
  buildLeadsHref,
  type LeadListFilters,
} from "@/lib/admin/lead-filters";
import type { SubmissionType } from "@/types/leadForm";

interface LeadKpiRowProps {
  kpis: LeadKpis;
  /** 지금 보고 있는 필터 — 선택된 항목을 표시한다 */
  filters?: LeadListFilters;
  /** 목록 경로 (Admin: /admin/leads · Sales: /sales/leads) */
  basePath?: string;
}

/**
 * 문의 화면 상단 — 오늘 할 일 → 문의 유형.
 *
 * ★ 모든 숫자는 실제 DB 집계 결과다 (fetchLeadKpis). 새 질의 없음.
 * ★ 숫자를 누르면 같은 화면의 필터(status · type)로 목록을 좁힌다.
 *   필터 값은 LeadFilterBar 와 같은 URL 규칙(buildLeadsHref)을 쓴다.
 */
export function LeadKpiRow({
  kpis,
  filters = DEFAULT_LEAD_FILTERS,
  basePath = "/admin/leads",
}: LeadKpiRowProps) {
  const newHref = buildLeadsHref(
    DEFAULT_LEAD_FILTERS,
    { status: "new" },
    basePath,
  );
  const showingNew = filters.status === "new";

  const types: { type: SubmissionType; label: string; value: number }[] = [
    { type: "pilot", label: "4주 파일럿", value: kpis.pilot },
    { type: "demo", label: "대시보드 데모", value: kpis.demo },
    { type: "consult", label: "기관 상담", value: kpis.consult },
    { type: "purchase_interest", label: "상품 관심", value: kpis.purchaseInterest },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ── 오늘 할 일 */}
      <section
        aria-labelledby="lead-todo-title"
        className={`flex flex-col justify-between gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center ${
          kpis.newCount > 0 ? "border-accent/40" : "border-line"
        }`}
      >
        <div className="min-w-0">
          <h2 id="lead-todo-title" className="text-micro font-semibold text-ink-muted">
            오늘 할 일
          </h2>
          {kpis.newCount > 0 ? (
            <p className="mt-1 text-body-sm font-semibold text-navy">
              아직 연락하지 않은 신규 문의{" "}
              <span className="text-headline font-bold tabular-nums">
                {kpis.newCount.toLocaleString("ko-KR")}
              </span>
              건
            </p>
          ) : (
            <p className="mt-1 text-body-sm font-semibold text-navy">
              새로 확인할 신규 문의가 없습니다.
            </p>
          )}
          <p className="mt-0.5 text-caption text-ink-muted">
            전체 문의 {kpis.total.toLocaleString("ko-KR")}건
          </p>
        </div>
        {kpis.newCount > 0 ? (
          <Link
            href={newHref}
            aria-current={showingNew ? "page" : undefined}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-label font-semibold text-on-primary transition-colors hover:bg-primary-hover aria-[current=page]:bg-primary-active"
          >
            {showingNew ? "신규 문의만 보는 중" : "신규 문의 보기"}
          </Link>
        ) : null}
      </section>

      {/* ── 문의 유형 */}
      <section
        aria-labelledby="lead-type-title"
        className="rounded-xl border border-line bg-white p-4"
      >
        <h2 id="lead-type-title" className="text-micro font-semibold text-ink-muted">
          문의 유형
        </h2>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {types.map((item) => {
            const active = filters.type === item.type;
            return (
              <li key={item.type}>
                <Link
                  href={buildLeadsHref(
                    DEFAULT_LEAD_FILTERS,
                    { type: item.type },
                    basePath,
                  )}
                  aria-current={active ? "page" : undefined}
                  className="flex min-h-11 flex-col justify-center rounded-lg border border-line-soft px-3 py-2 transition-colors hover:border-line-strong hover:bg-primary-soft/50 aria-[current=page]:border-navy aria-[current=page]:bg-primary-soft"
                >
                  <span className="text-micro font-semibold text-ink-muted">
                    {item.label}
                  </span>
                  <span className="text-title font-bold tabular-nums leading-tight text-navy">
                    {item.value.toLocaleString("ko-KR")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
