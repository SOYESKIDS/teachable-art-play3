import type { Metadata } from "next";
import { requireDirector } from "@/lib/auth/organization";
import { fetchGrowthReports } from "@/lib/staff/growth-report-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { GrowthReportList } from "@/components/staff/GrowthReportList";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { DIRECTOR_NAV } from "../nav";

export const metadata: Metadata = {
  title: "성장 리포트 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface DirectorGrowthReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * SERVICE-11A — 원장 성장 리포트 목록 (조회 전용).
 *
 * ★ 원장에게는 작성 완료된 리포트만 돌아온다.
 *   그 경계는 화면이 아니라 SELECT Policy가 만든다 —
 *   20260901160000의 정책이 원장 분기에 status = 'complete' 를 함께 요구한다.
 *   작성 중인 리포트는 교사가 아직 다듬는 문서라, 원장 화면에 뜨면
 *   미완성 문장이 기관의 공식 기록처럼 읽힌다.
 *
 * ★ 이 페이지에는 생성·수정 경로가 없다.
 *   growth-report-actions를 import하지 않고, 쓰기 컴포넌트도 렌더하지 않는다.
 */
export default async function DirectorGrowthReportsPage({
  searchParams,
}: DirectorGrowthReportsPageProps) {
  const { supabase, email, memberships } = await requireDirector();

  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath="/director/growth-reports"
        roleLabel="원장"
      />
    );
  }

  const result = await fetchGrowthReports(
    supabase,
    membership.organizationId,
  );

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={membership.organizationName}
      navItems={DIRECTOR_NAV}
      currentHref="/director/growth-reports"
    >
      <h1 className="text-[22px] font-bold text-navy">성장 리포트</h1>
      <p className="mt-1 text-[14px] leading-relaxed text-navy/55">
        교사가 작성 완료한 리포트입니다. 작성 중인 리포트는 표시되지 않습니다.
      </p>

      {!result.ok ? (
        <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-10 text-center text-[14px] leading-relaxed text-navy/55">
          성장 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      ) : (
        <GrowthReportList
          reports={result.reports}
          basePath="/director/growth-reports"
          organizationId={membership.organizationId}
          emptyText="작성 완료된 성장 리포트가 아직 없습니다."
          showStatus={false}
        />
      )}
    </StaffShell>
  );
}
