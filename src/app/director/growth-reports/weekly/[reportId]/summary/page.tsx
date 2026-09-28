import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDirector } from "@/lib/auth/organization";
import { fetchProgramSummary } from "@/lib/staff/program-summary-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { ProgramSummaryView } from "@/components/staff/ProgramSummaryView";
import { StaffShell } from "@/components/staff/StaffShell";
import { directorNavFor } from "../../../../nav";

export const metadata: Metadata = {
  title: "8주 기록 모아보기 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface DirectorSummaryPageProps {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** 8주 기록 모아보기 (DEC-069 · DEC-104) — 읽기 전용 derived view */
export default async function DirectorProgramSummaryPage({ params, searchParams }: DirectorSummaryPageProps) {
  const { supabase, email, memberships } = await requireDirector();
  const { reportId } = await params;
  const query = await searchParams;
  const membership = resolveMembership(memberships, query.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/director/growth-reports/weekly/${reportId}/summary`}
        roleLabel="원장"
      />
    );
  }

  const result = await fetchProgramSummary(supabase, reportId, { includePhotos: true });
  if (!result.ok) {
    if (result.reason === "load_failed") throw new Error("program summary load failed");
    notFound();
  }

  const orgQuery = `?org=${encodeURIComponent(membership.organizationId)}`;

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={membership.organizationName}
      navItems={await directorNavFor(supabase, membership.organizationId)}
      currentHref="/director/growth-reports"
    >
      <Link href={`/director/growth-reports/weekly/${reportId}${orgQuery}`} className="text-[14px] font-semibold text-brand-navy underline print:hidden">
        ← 주간 리포트로
      </Link>
      <div className="mt-3">
        <ProgramSummaryView data={result.data} weeklyHrefBase="/director/growth-reports/weekly" orgQuery={orgQuery} />
      </div>
    </StaffShell>
  );
}
