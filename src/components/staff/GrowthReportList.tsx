import Link from "next/link";
import {
  formatReportPeriod,
  GROWTH_REPORT_STATUS_LABELS,
  type GrowthReportListItem,
} from "@/types/staff-growth-report";

interface GrowthReportListProps {
  reports: GrowthReportListItem[];
  /** 상세 링크 기준 경로 (/teacher/growth-reports 또는 /director/growth-reports) */
  basePath: string;
  organizationId: string;
  /** 목록이 비었을 때의 안내 */
  emptyText: string;
  /** 원장 화면은 상태 배지 대신 완료일을 보여준다 */
  showStatus?: boolean;
}

/**
 * SERVICE-11A — 성장 리포트 목록 (교사·원장 공용).
 *
 * ★ 이 목록은 아동을 평가하지 않는다.
 *   점수·등급·순위 열이 없고, 근거 수는 "무엇을 근거로 썼는가"라는 사실 표시다.
 */
export function GrowthReportList({
  reports,
  basePath,
  organizationId,
  emptyText,
  showStatus = true,
}: GrowthReportListProps) {
  if (reports.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-line bg-white px-4 py-10 text-center text-label leading-relaxed text-ink-muted">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {reports.map((report) => (
        <li
          key={report.id}
          className="scroll-mt-28 rounded-xl border border-line bg-white p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words text-body-sm font-bold text-navy">
                {report.childName ?? "원아 이름 확인 불가"}
              </p>

              <p className="mt-0.5 text-micro text-ink-muted">
                {report.className ?? "반 정보 없음"}
                {report.classStatus === "archived" ? (
                  <span className="ml-1 text-ink-muted">(보관)</span>
                ) : null}
              </p>
            </div>

            {showStatus ? (
              <span
                className={`shrink-0 rounded-md border px-2.5 py-1 text-micro font-bold ${
                  report.status === "complete"
                    ? "border-soft-green/50 bg-soft-green/15 text-navy"
                    : "border-line-strong bg-white text-ink-muted"
                }`}
              >
                {GROWTH_REPORT_STATUS_LABELS[report.status]}
              </span>
            ) : report.completedAt ? (
              <span className="shrink-0 text-micro tabular-nums text-ink-muted">
                {report.completedAt.slice(0, 10).replaceAll("-", ".")} 완료
              </span>
            ) : null}
          </div>

          <p className="mt-2 break-words text-label font-semibold leading-snug text-navy">
            {report.title}
          </p>

          <p className="mt-1 text-micro tabular-nums text-ink-muted">
            {formatReportPeriod(report.periodStart, report.periodEnd)}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
            <p className="text-micro text-ink-muted">
              근거 기록{" "}
              <strong className="tabular-nums text-navy">
                {report.sourceCount.toLocaleString("ko-KR")}건
              </strong>
            </p>

            <Link
              href={`${basePath}/${report.id}?org=${encodeURIComponent(
                organizationId,
              )}`}
              className="inline-flex min-h-11 items-center rounded-lg border border-trust-blue/30 bg-white px-4 text-caption font-bold text-trust-blue transition-colors hover:border-trust-blue/50 hover:bg-trust-blue/5"
            >
              리포트 열기
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
