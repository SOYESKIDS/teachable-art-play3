import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/organization";
import { fetchWeeklyComposer } from "@/lib/staff/weekly-report-queries";
import { fetchClassEntitlements } from "@/lib/entitlement/queries";
import { resolveMembership } from "@/lib/staff/membership";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { WeeklyComposer } from "@/components/staff/WeeklyComposer";
import { TEACHER_NAV } from "../../../nav";

export const metadata: Metadata = {
  title: "주간 리포트 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface WeeklyReportPageProps {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** TC-08 주간 리포트 작성 · 검토 (DEC-101 · DEC-102) */
export default async function TeacherWeeklyReportPage({ params, searchParams }: WeeklyReportPageProps) {
  const { supabase, email, memberships } = await requireTeacher();
  const { reportId } = await params;
  const query = await searchParams;
  const membership = resolveMembership(memberships, query.org);

  if (!membership) {
    return (
      <OrganizationPicker memberships={memberships} basePath={`/teacher/growth-reports/weekly/${reportId}`} roleLabel="교사" />
    );
  }

  const result = await fetchWeeklyComposer(supabase, reportId, { includeDraft: true });

  if (!result.ok) {
    if (result.reason === "load_failed") throw new Error("weekly composer load failed");
    notFound();
  }

  const entitlements = await fetchClassEntitlements(supabase, result.data.report.classId);

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher/growth-reports"
    >
      <h1 className="text-headline font-bold text-navy">
        주간 리포트 · {result.data.report.childName ?? "이름 없음"}
      </h1>
      <p className="mt-1 text-body-sm text-ink-muted">
        {result.data.report.className ?? ""} · {result.data.report.weekNo}주
      </p>
      <Link
        href={`/teacher/growth-reports/weekly/${reportId}/summary?org=${encodeURIComponent(membership.organizationId)}`}
        className="mt-2 inline-flex min-h-11 items-center text-label font-semibold text-brand-navy underline print:hidden"
      >
        8주 기록 모아보기
      </Link>
      <div className="mt-5">
        <WeeklyComposer key={result.data.draft?.id ?? "no-draft"} data={result.data} canWrite={entitlements.weeklyReportWrite} />
      </div>
    </StaffShell>
  );
}
