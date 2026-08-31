import type { Metadata } from "next";
import { requireDirector } from "@/lib/auth/organization";
import {
  buildClassFilterOptions,
  buildHistorySummary,
  fetchSessionHistory,
} from "@/lib/staff/class-session-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { StaffShell } from "@/components/staff/StaffShell";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { SessionHistoryBoard } from "@/components/staff/SessionHistoryBoard";
import { DIRECTOR_NAV } from "../../nav";

export const metadata: Metadata = {
  title: "수업 이력 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface DirectorHistoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 원장 — 수업 이력 (기관 전체).
 *
 * 반 필터를 제공한다. 원장은 여러 반을 한 화면에서 보기 때문에
 * 반별로 좁혀 보는 요구가 교사보다 크다.
 *
 * 보관된 반·종료된 배정·archived 프로그램/차시의 이름도 계속 보인다
 * (20260827 staff historical read RLS).
 */
export default async function DirectorHistoryPage({
  searchParams,
}: DirectorHistoryPageProps) {
  const { supabase, email, memberships } = await requireDirector();

  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath="/director/sessions/history"
        roleLabel="원장"
      />
    );
  }

  const result = await fetchSessionHistory(supabase, membership.organizationId);

  const sessions = result.ok ? result.sessions : [];
  const classes = result.ok ? result.classes : [];

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={membership.organizationName}
      navItems={DIRECTOR_NAV}
      currentHref="/director/sessions/history"
    >
      <h1 className="text-[22px] font-bold text-navy">수업 이력</h1>
      <p className="mt-1 text-[14px] text-navy/55">
        기관 전체 수업 기록입니다.
      </p>

      <div className="mt-5">
        <SessionHistoryBoard
          sessions={sessions}
          summary={buildHistorySummary(sessions)}
          classOptions={buildClassFilterOptions(classes, sessions)}
          hasError={!result.ok}
          attendanceBasePath="/director/sessions"
          observationBasePath="/director/sessions"
        />
      </div>
    </StaffShell>
  );
}
