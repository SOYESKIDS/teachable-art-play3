import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/organization";
import { fetchProgramSummary } from "@/lib/staff/program-summary-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { ProgramSummaryView } from "@/components/staff/ProgramSummaryView";
import { StaffShell } from "@/components/staff/StaffShell";
import { TEACHER_NAV } from "../../../../nav";

export const metadata: Metadata = {
  title: "8주 기록 모아보기 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface TeacherSummaryPageProps {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** 8주 기록 모아보기 (DEC-069 · DEC-104) — 읽기 전용 derived view */
export default async function TeacherProgramSummaryPage({ params, searchParams }: TeacherSummaryPageProps) {
  const { supabase, email, memberships } = await requireTeacher();
  const { reportId } = await params;
  const query = await searchParams;
  const membership = resolveMembership(memberships, query.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/teacher/growth-reports/weekly/${reportId}/summary`}
        roleLabel="교사"
      />
    );
  }

  const result = await fetchProgramSummary(supabase, reportId, { includePhotos: true, organizationId: membership.organizationId });
  if (!result.ok) {
    if (result.reason === "load_failed") throw new Error("program summary load failed");
    notFound();
  }

  const orgQuery = `?org=${encodeURIComponent(membership.organizationId)}`;

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher/growth-reports"
    >
      <Link href={`/teacher/growth-reports/weekly/${reportId}${orgQuery}`} className="text-label font-semibold text-brand-navy underline print:hidden">
        ← 주간 리포트로
      </Link>
      <div className="mt-3">
        <ProgramSummaryView data={result.data} weeklyHrefBase="/teacher/growth-reports/weekly" orgQuery={orgQuery} />
      </div>
    </StaffShell>
  );
}
