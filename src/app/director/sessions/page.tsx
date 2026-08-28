import type { Metadata } from "next";
import { requireDirector } from "@/lib/auth/organization";
import {
  fetchTodayBoard,
  todayInSeoul,
} from "@/lib/staff/class-session-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { StaffShell } from "@/components/staff/StaffShell";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { TodaySessionBoardView } from "@/components/staff/TodaySessionBoard";
import { DIRECTOR_NAV } from "../nav";

export const metadata: Metadata = {
  title: "수업 운영 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface DirectorSessionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatToday(today: string): string {
  const [year, month, day] = today.split("-");
  return `${year}.${month}.${day}`;
}

/**
 * 원장 — 수업 운영 (오늘).
 *
 * 교사 화면과 데이터 구조는 같지만 관점이 다르다.
 *   교사: "내 반에서 지금 할 수업"
 *   원장: "우리 기관 전체가 오늘 어떻게 돌아가는가"
 * 그래서 반 이름을 항상 노출하고 문구도 기관 관점으로 쓴다.
 *
 * 원장도 수업을 시작/완료/취소할 수 있다 —
 * 20260826의 class_sessions UPDATE Policy가 has_org_role(org, director)를
 * 허용하고 있어 RLS 우회 없이 그대로 가능하다.
 */
export default async function DirectorSessionsPage({
  searchParams,
}: DirectorSessionsPageProps) {
  const { supabase, email, memberships } = await requireDirector();

  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath="/director/sessions"
        roleLabel="원장"
      />
    );
  }

  const today = todayInSeoul();
  const result = await fetchTodayBoard(
    supabase,
    membership.organizationId,
    today,
  );

  const board = result.ok
    ? result.board
    : {
        today,
        summary: {
          scheduledToday: 0,
          inProgress: 0,
          completedToday: 0,
          cancelledToday: 0,
        },
        todaySessions: [],
        ongoingFromOtherDays: [],
        overdueSessions: [],
        undatedSessions: [],
      };

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={membership.organizationName}
      navItems={DIRECTOR_NAV}
      currentHref="/director/sessions"
    >
      <h1 className="text-[22px] font-bold text-navy">수업 운영</h1>
      <p className="mt-1 text-[14px] tabular-nums text-navy/55">
        {formatToday(today)} · 기관 전체
      </p>

      <div className="mt-5">
        <TodaySessionBoardView
          board={board}
          showClassName
          hasError={!result.ok}
          attendanceBasePath="/director/sessions"
        />
      </div>
    </StaffShell>
  );
}
