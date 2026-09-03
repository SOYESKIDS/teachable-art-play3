import type { Metadata } from "next";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth/organization";
import { fetchGrowthReportDetail } from "@/lib/staff/growth-report-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { isGrowthReportAiConfigured } from "@/lib/ai/growth-report-draft-provider";
import { GrowthReportAiDraftSection } from "@/components/staff/GrowthReportAiDraftSection";
import { GrowthReportAttendanceSummary } from "@/components/staff/GrowthReportAttendanceSummary";
import { GrowthReportEditor } from "@/components/staff/GrowthReportEditor";
import { GrowthReportEvidenceTimeline } from "@/components/staff/GrowthReportEvidenceTimeline";
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

            <span
              className={`rounded-md border px-2.5 py-1 text-[12px] font-bold ${
                result.report.status === "complete"
                  ? "border-soft-green/50 bg-soft-green/15 text-navy"
                  : "border-navy/15 bg-white text-navy/60"
              }`}
            >
              {GROWTH_REPORT_STATUS_LABELS[result.report.status]}
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
          </section>

          <GrowthReportAttendanceSummary
            attendance={result.report.attendance}
          />

          {/*
            SERVICE-11B — AI 초안은 작성 중인 리포트에서만 보인다.
            완료된 리포트에는 생성·적용 버튼을 아예 렌더하지 않는다.
            AI 는 리포트를 완성하지 않는다 — 확정은 아래 편집기의 "작성완료"다.
          */}
          {result.report.status === "draft" ? (
            <GrowthReportAiDraftSection
              reportId={result.report.id}
              reportUpdatedAt={result.report.updatedAt}
              sourceCount={result.report.sources.length}
              aiEnabled={isGrowthReportAiConfigured()}
              draft={result.report.aiDraft}
            />
          ) : null}

          <GrowthReportEditor report={result.report} />

          <GrowthReportEvidenceTimeline sources={result.report.sources} />
        </div>
      )}
    </StaffShell>
  );
}
