import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDirector } from "@/lib/auth/organization";
import { fetchWeeklyComposer } from "@/lib/staff/weekly-report-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { formatDotDate } from "@/lib/entitlement/labels";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { PrintButton } from "@/components/staff/PrintButton";
import { ReportVisibilityControl } from "@/components/staff/ReportVisibilityControl";
import { StaffShell } from "@/components/staff/StaffShell";
import { noticeWarning } from "@/components/ui/app-button";
import { directorNavFor } from "../../../nav";

export const metadata: Metadata = {
  title: "주간 리포트 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface DirectorWeeklyPageProps {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const SECTIONS = [
  { key: "topic", label: "이번 주 활동 주제" },
  { key: "quote_choice", label: "아이의 말과 선택" },
  { key: "teacher_observation", label: "교사 관찰 기록" },
  { key: "family_conversation", label: "가정에서 나눌 이야기" },
  { key: "next_week_preview", label: "다음 주 예고" },
] as const;

/**
 * DR-07 원장 주간 리포트 상세 (DEC-102).
 * 최근 완료본만 · 숨김 중이면 인쇄 불가 · 숨기기 · 다시 공개 (사유 필수).
 */
export default async function DirectorWeeklyReportPage({ params, searchParams }: DirectorWeeklyPageProps) {
  const { supabase, email, memberships } = await requireDirector();
  const { reportId } = await params;
  const query = await searchParams;
  const membership = resolveMembership(memberships, query.org);

  if (!membership) {
    return (
      <OrganizationPicker memberships={memberships} basePath={`/director/growth-reports/weekly/${reportId}`} roleLabel="원장" />
    );
  }

  const result = await fetchWeeklyComposer(supabase, reportId, { includeDraft: false });

  if (!result.ok) {
    if (result.reason === "load_failed") throw new Error("director weekly load failed");
    notFound();
  }

  const { report, latestCompleted } = result.data;
  if (!latestCompleted) notFound();

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={membership.organizationName}
      navItems={await directorNavFor(supabase, membership.organizationId)}
      currentHref="/director/growth-reports"
    >
      <h1 className="text-[24px] font-bold text-ink">
        주간 리포트 · {report.childName ?? "이름 없음"}
      </h1>
      <p className="mt-1 text-[15px] text-ink-muted">
        {report.className ?? ""} · {report.weekNo}주 · 최근 완료본 {formatDotDate(latestCompleted.completedAt)}
        {latestCompleted.revisionNo > 1 ? " · 수정본" : ""}
      </p>

      {report.hidden ? (
        <p className={`mt-4 ${noticeWarning}`}>학부모 화면에서 숨긴 기록입니다. 사유: {report.hiddenReason ?? "—"}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <ReportVisibilityControl
          reportId={report.id}
          hidden={report.hidden}
          label={`${report.childName ?? ""} · ${report.weekNo}주`}
        />
        {/* 숨긴 리포트는 일반 인쇄 불가 (DEC-102 · UI-1) */}
        {!report.hidden ? <PrintButton /> : null}
        <Link
          href={`/director/growth-reports/weekly/${report.id}/summary?org=${encodeURIComponent(membership.organizationId)}`}
          className="inline-flex min-h-11 items-center px-2 text-[14px] font-semibold text-brand-navy underline"
        >
          8주 기록 모아보기
        </Link>
      </div>

      <article className="mt-6 flex flex-col gap-4 rounded-2xl border border-hairline bg-white p-6">
        {SECTIONS.map((section) =>
          latestCompleted.content[section.key] ? (
            <section key={section.key}>
              <h2 className="text-[16px] font-bold text-ink">{section.label}</h2>
              <p className="mt-1 whitespace-pre-line text-[16px] leading-relaxed text-ink">
                {latestCompleted.content[section.key]}
              </p>
            </section>
          ) : null,
        )}
      </article>
    </StaffShell>
  );
}
