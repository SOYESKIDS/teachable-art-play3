import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth/organization";
import {
  fetchGrowthReportClassOptions,
  fetchGrowthReports,
} from "@/lib/staff/growth-report-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { GrowthReportCreateForm } from "@/components/staff/GrowthReportCreateForm";
import { GrowthReportList } from "@/components/staff/GrowthReportList";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { TEACHER_NAV } from "../nav";

export const metadata: Metadata = {
  title: "성장 리포트 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface TeacherGrowthReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * SERVICE-11A — 교사 성장 리포트 목록.
 *
 * 07B/08B와 같은 골격이다: requireTeacher() → 소속 확인 → 조회 → StaffShell.
 *
 * ★ 여기서 보이는 리포트 범위는 RLS가 정한다(배정된 반).
 *   화면 조건으로 좁히지 않는다.
 */
export default async function TeacherGrowthReportsPage({
  searchParams,
}: TeacherGrowthReportsPageProps) {
  const { supabase, email, memberships } = await requireTeacher();

  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath="/teacher/growth-reports"
        roleLabel="교사"
      />
    );
  }

  const [result, options] = await Promise.all([
    fetchGrowthReports(supabase, membership.organizationId),
    fetchGrowthReportClassOptions(supabase, membership.organizationId),
  ]);

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher/growth-reports"
    >
      <h1 className="text-[22px] font-bold text-navy">성장 리포트</h1>
      <p className="mt-1 text-[14px] leading-relaxed text-navy/55">
        검토 완료한 관찰기록을 근거로 기간별 성장 리포트를 작성합니다.
      </p>

      <GrowthReportCreateForm
        options={options}
        organizationId={membership.organizationId}
      />

      {!result.ok ? (
        <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-10 text-center text-[14px] leading-relaxed text-navy/55">
          성장 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      ) : (
        <GrowthReportList
          reports={result.reports}
          basePath="/teacher/growth-reports"
          organizationId={membership.organizationId}
          emptyText="아직 작성한 성장 리포트가 없습니다."
        />
      )}
    </StaffShell>
  );
}
