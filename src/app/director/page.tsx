import type { Metadata } from "next";
import { requireDirector } from "@/lib/auth/organization";
import { todayInSeoul } from "@/lib/staff/class-session-queries";
import { fetchDirectorDashboard } from "@/lib/staff/director-dashboard-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { DirectorDashboard } from "@/components/staff/DirectorDashboard";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { DIRECTOR_NAV } from "./nav";

export const metadata: Metadata = {
  title: "원장 대시보드 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface DirectorPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * SERVICE-12 — 원장 운영 대시보드.
 *
 * ★ 권한
 *   requireDirector()가 로그인 · 활성 director membership · 활성 기관까지
 *   DB로 판정한다. 교사 계정은 이 게이트를 통과하지 못한다.
 *   URL의 ?org= 값은 resolveMembership()이 내 소속 목록 안에서만 인정하고,
 *   그것을 통과하더라도 모든 질의는 다시 RLS를 거친다(이중 방어).
 *
 * ★ 오늘 날짜
 *   todayInSeoul()로 서버에서 한 번만 정한다. Client가 다시 계산하지 않으므로
 *   서버/브라우저 시간대 차이로 hydration이 어긋나지 않는다.
 *
 * ★ 이 페이지에는 쓰기 경로가 없다.
 *   Server Action을 import하지 않고, 상태 변경 컴포넌트도 렌더하지 않는다.
 */
export default async function DirectorPage({ searchParams }: DirectorPageProps) {
  const { supabase, email, memberships } = await requireDirector();

  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath="/director"
        roleLabel="원장"
      />
    );
  }

  const today = todayInSeoul();
  const dashboard = await fetchDirectorDashboard(
    supabase,
    membership.organizationId,
    today,
  );

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={membership.organizationName}
      navItems={DIRECTOR_NAV}
      currentHref="/director"
    >
      <DirectorDashboard
        data={dashboard}
        organizationId={membership.organizationId}
      />
    </StaffShell>
  );
}
