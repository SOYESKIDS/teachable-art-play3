import type { Metadata } from "next";
import Link from "next/link";
import { requireDirector } from "@/lib/auth/organization";
import { fetchGrowthReportDetail } from "@/lib/staff/growth-report-queries";
import { fetchGrowthReportShare } from "@/lib/staff/growth-report-share-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { GrowthReportAttendanceSummary } from "@/components/staff/GrowthReportAttendanceSummary";
import { GrowthReportEvidenceTimeline } from "@/components/staff/GrowthReportEvidenceTimeline";
import { GrowthReportReadOnlyContent } from "@/components/staff/GrowthReportReadOnlyContent";
import { GrowthReportShareSection } from "@/components/staff/GrowthReportShareSection";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { formatReportPeriod } from "@/types/staff-growth-report";
import { directorNavFor } from "../../nav";

export const metadata: Metadata = {
  title: "성장 리포트 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface DirectorGrowthReportDetailPageProps {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * SERVICE-11A — 원장 성장 리포트 상세 (조회 전용).
 *
 * ★ 이 파일은 growth-report-actions를 import하지 않는다.
 *   편집기·저장 버튼·근거 새로고침 컴포넌트를 렌더하지도 않는다.
 *   작성 중인 리포트는 SELECT Policy 때문에 애초에 조회되지 않아
 *   여기서는 not_found로 끝난다.
 */
export default async function DirectorGrowthReportDetailPage({
  params,
  searchParams,
}: DirectorGrowthReportDetailPageProps) {
  const { supabase, email, memberships } = await requireDirector();

  const { reportId } = await params;
  const query = await searchParams;
  const membership = resolveMembership(memberships, query.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/director/growth-reports/${reportId}`}
        roleLabel="원장"
      />
    );
  }

  const result = await fetchGrowthReportDetail(
    supabase,
    membership.organizationId,
    reportId,
  );

  // ★ 공유 metadata 는 리포트를 실제로 읽을 수 있었을 때만 조회한다.
  //   token 은 들어 있지 않다 — token_hash 는 SELECT GRANT 에 없다.
  const share = result.ok
    ? await fetchGrowthReportShare(supabase, reportId)
    : null;

  const backHref = `/director/growth-reports?org=${encodeURIComponent(
    membership.organizationId,
  )}`;

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={membership.organizationName}
      navItems={await directorNavFor(supabase, membership.organizationId)}
      currentHref="/director/growth-reports"
    >
      {!result.ok ? (
        <div>
          <h1 className="text-headline font-bold text-navy">성장 리포트</h1>

          <p className="mt-4 rounded-xl border border-line bg-white px-4 py-10 text-center text-label leading-relaxed text-ink-muted">
            {result.reason === "load_failed"
              ? "성장 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
              : "리포트를 찾을 수 없거나 접근 권한이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="isolate">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={backHref}
              className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-white px-3 text-caption font-semibold text-navy transition-colors hover:bg-navy/5"
            >
              ← 리포트 목록
            </Link>

            <span className="rounded-md border border-soft-green/50 bg-soft-green/15 px-2.5 py-1 text-micro font-bold text-navy">
              교사 작성 완료
            </span>
          </div>

          <section className="mt-4 scroll-mt-28 rounded-xl border border-line bg-white p-4 sm:p-5">
            <p className="text-caption font-bold text-navy">
              {result.report.className ?? "반 정보 없음"}
              {result.report.classStatus === "archived" ? (
                <span className="ml-1 font-normal text-ink-muted">(보관)</span>
              ) : null}
            </p>

            <h1 className="mt-1 break-words text-title font-bold leading-snug text-navy">
              {result.report.childName ?? "원아 이름 확인 불가"}
            </h1>

            <p className="mt-1.5 text-caption tabular-nums text-ink-muted">
              {formatReportPeriod(
                result.report.periodStart,
                result.report.periodEnd,
              )}
            </p>

            <p className="mt-2 break-words text-caption text-ink-muted">
              {result.report.title}
            </p>

            {result.report.completedAt ? (
              <p className="mt-1 text-micro tabular-nums text-ink-muted">
                작성 완료{" "}
                {result.report.completedAt
                  .slice(0, 10)
                  .replaceAll("-", ".")}
              </p>
            ) : null}
          </section>

          <GrowthReportAttendanceSummary
            attendance={result.report.attendance}
          />

          <GrowthReportReadOnlyContent
            growthChanges={result.report.growthChanges}
            observationSummary={result.report.observationSummary}
            nextSupport={result.report.nextSupport}
          />

          <GrowthReportShareSection share={share} />

          <GrowthReportEvidenceTimeline sources={result.report.sources} />
        </div>
      )}
    </StaffShell>
  );
}
