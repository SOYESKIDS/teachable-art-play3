import type { Metadata } from "next";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth/organization";
import { fetchGrowthReportDetail } from "@/lib/staff/growth-report-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { GrowthReportAttendanceSummary } from "@/components/staff/GrowthReportAttendanceSummary";
import { GrowthReportEvidenceTimeline } from "@/components/staff/GrowthReportEvidenceTimeline";
import { GrowthReportReadOnlyContent } from "@/components/staff/GrowthReportReadOnlyContent";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import {
  formatReportPeriod,
  GROWTH_REPORT_STATUS_LABELS,
} from "@/types/staff-growth-report";
import { TEACHER_NAV } from "../../nav";

export const metadata: Metadata = {
  title: "성장 리포트 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface TeacherGrowthReportDetailPageProps {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * SERVICE-11A — 교사 성장 리포트 상세.
 *
 * ★ 실패 문구는 "찾을 수 없거나 접근 권한이 없습니다" 하나로 합친다.
 *   존재 여부와 권한 여부를 구분해 보여주면 reportId를 바꿔가며
 *   다른 기관의 리포트 존재를 확인할 수 있다.
 */
export default async function TeacherGrowthReportDetailPage({
  params,
  searchParams,
}: TeacherGrowthReportDetailPageProps) {
  const { supabase, email, memberships } = await requireTeacher();

  const { reportId } = await params;
  const query = await searchParams;
  const membership = resolveMembership(memberships, query.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/teacher/growth-reports/${reportId}`}
        roleLabel="교사"
      />
    );
  }

  const result = await fetchGrowthReportDetail(
    supabase,
    membership.organizationId,
    reportId,
  );

  const backHref = `/teacher/growth-reports?org=${encodeURIComponent(
    membership.organizationId,
  )}`;

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher/growth-reports"
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

            <span
              className={`rounded-md border px-2.5 py-1 text-micro font-bold ${
                result.report.status === "complete"
                  ? "border-success-border bg-success-soft text-success-text"
                  : "border-line-strong bg-white text-ink-muted"
              }`}
            >
              {GROWTH_REPORT_STATUS_LABELS[result.report.status]}
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
          </section>

          <GrowthReportAttendanceSummary
            attendance={result.report.attendance}
          />

          {/*
            PHASE 10B (M5 앱 준비): 이전 형식(기간형) 리포트는 조회만 한다.
            작성 · 저장 · AI 초안 경로는 M5 가 회수하므로 화면에서도 없앤다 (DEC-041 · DEC-091).
            새 기록은 주간(Weekly) 리포트로 쓴다.
          */}
          <p className="mt-4 rounded-xl border border-line bg-navy/5 px-4 py-3 text-caption leading-relaxed text-navy">
            이전 형식의 리포트입니다. 내용은 확인만 할 수 있습니다. 새 기록은 주간 리포트로 작성해 주세요.
          </p>

          <GrowthReportReadOnlyContent
            growthChanges={result.report.growthChanges}
            observationSummary={result.report.observationSummary}
            nextSupport={result.report.nextSupport}
          />

          <GrowthReportEvidenceTimeline sources={result.report.sources} />
        </div>
      )}
    </StaffShell>
  );
}
