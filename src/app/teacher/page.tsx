import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth/organization";
import {
  fetchTodayBoard,
  todayInSeoul,
} from "@/lib/staff/class-session-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { StaffShell } from "@/components/staff/StaffShell";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { TodaySessionBoardView } from "@/components/staff/TodaySessionBoard";
import { TEACHER_NAV } from "./nav";

export const metadata: Metadata = {
  title: "오늘의 수업 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface TeacherPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatToday(today: string): string {
  const [year, month, day] = today.split("-");
  return `${year}.${month}.${day}`;
}

/**
 * 교사 — 오늘의 수업.
 *
 * 로그인 후 첫 화면이다. "지금 무엇을 해야 하는가"만 보이게 한다.
 * Admin의 관리 표와 달리 카드 + 큰 버튼 중심이다 — 교실에서 태블릿으로 쓴다.
 *
 * 볼 수 있는 범위는 코드가 아니라 RLS가 정한다.
 * organization_id로만 좁혀 질의하면 교사에게는 자기가 배정된 반의 수업만 돌아온다.
 */
export default async function TeacherTodayPage({
  searchParams,
}: TeacherPageProps) {
  // 로그인 + 활성 teacher membership + 활성 기관까지 DB가 판정한다.
  const { supabase, email, memberships } = await requireTeacher();

  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath="/teacher"
        roleLabel="교사"
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

  // 담당 반이 아예 없으면 "수업이 없다"가 아니라 "담당 반이 없다"고 알려야 한다.
  const hasNoSession =
    result.ok &&
    board.todaySessions.length === 0 &&
    board.ongoingFromOtherDays.length === 0 &&
    board.overdueSessions.length === 0 &&
    board.undatedSessions.length === 0;

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher"
    >
      <h1 className="text-[22px] font-bold text-navy">오늘의 수업</h1>
      <p className="mt-1 text-[14px] tabular-nums text-navy/55">
        {formatToday(today)}
      </p>

      <div className="mt-5">
        <TodaySessionBoardView
          board={board}
          showClassName
          hasError={!result.ok}
        />

        {hasNoSession ? (
          <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-8 text-center text-[13px] leading-relaxed text-navy/50">
            담당 반에 등록된 수업이 없습니다. 수업 일정은 기관 관리자가
            등록합니다.
          </p>
        ) : null}
      </div>
    </StaffShell>
  );
}
