import type { Metadata } from "next";
import Link from "next/link";
import { requireDirector } from "@/lib/auth/organization";
import { fetchGrowthReportDetail } from "@/lib/staff/growth-report-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { GrowthReportAttendanceSummary } from "@/components/staff/GrowthReportAttendanceSummary";
import { GrowthReportEvidenceTimeline } from "@/components/staff/GrowthReportEvidenceTimeline";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { formatReportPeriod } from "@/types/staff-growth-report";
import { DIRECTOR_NAV } from "../../nav";

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

  const backHref = `/director/growth-reports?org=${encodeURIComponent(
    membership.organizationId,
  )}`;

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={membership.organizationName}
      navItems={DIRECTOR_NAV}
      currentHref="/director/growth-reports"
    >
      {!result.ok ? (
        <div>
          <h1 className="text-[22px] font-bold text-navy">성장 리포트</h1>

          <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-10 text-center text-[14px] leading-relaxed text-navy/55">
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
              className="inline-flex min-h-11 items-center rounded-lg border border-navy/15 bg-white px-3 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
            >
              ← 리포트 목록
            </Link>

            <span className="rounded-md border border-soft-green/50 bg-soft-green/15 px-2.5 py-1 text-[12px] font-bold text-navy">
              교사 작성 완료
            </span>
          </div>

          <section className="mt-4 scroll-mt-28 rounded-xl border border-navy/10 bg-white p-4 sm:p-5">
            <p className="text-[13px] font-bold text-navy">
              {result.report.className ?? "반 정보 없음"}
              {result.report.classStatus === "archived" ? (
                <span className="ml-1 font-normal text-navy/45">(보관)</span>
              ) : null}
            </p>

            <h1 className="mt-1 break-words text-[20px] font-bold leading-snug text-navy">
              {result.report.childName ?? "원아 이름 확인 불가"}
            </h1>

            <p className="mt-1.5 text-[13px] tabular-nums text-navy/55">
              {formatReportPeriod(
                result.report.periodStart,
                result.report.periodEnd,
              )}
            </p>

            <p className="mt-2 break-words text-[13px] text-navy/60">
              {result.report.title}
            </p>

            {result.report.completedAt ? (
              <p className="mt-1 text-[12px] tabular-nums text-navy/45">
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

          <section className="mt-6 scroll-mt-28">
            <h2 className="text-[15px] font-bold text-navy">리포트 내용</h2>

            <div className="mt-3 flex flex-col gap-4">
              <ReadOnlyBlock
                label="성장 변화"
                value={result.report.growthChanges}
              />
              <ReadOnlyBlock
                label="관찰 요약"
                value={result.report.observationSummary}
              />
              <ReadOnlyBlock
                label="다음 지원 방향"
                value={result.report.nextSupport}
              />
            </div>
          </section>

          <GrowthReportEvidenceTimeline sources={result.report.sources} />
        </div>
      )}
    </StaffShell>
  );
}

function ReadOnlyBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold text-navy/55">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-navy/10 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-navy">
        {value ?? "작성된 내용이 없습니다."}
      </p>
    </div>
  );
}
