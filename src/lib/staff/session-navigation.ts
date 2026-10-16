import type { StaffSessionItem, TodaySessionBoard } from "@/types/staff-session";

/** Navigation only. Destination pages and RPCs still enforce role, dates and entitlement. */
export function teacherSessionLinks(session: StaffSessionItem) {
  const org = `org=${encodeURIComponent(session.organization_id)}`;
  const base = `/teacher/sessions/${encodeURIComponent(session.id)}`;
  const preparation = session.status === "in_progress"
    ? { href: `${base}/during?${org}`, label: "수업 이어서" }
    : session.status === "scheduled" && session.parentsActive
      ? { href: `${base}/before?${org}`, label: "수업 준비" }
      : null;
  return {
    preparation,
    report: session.status === "completed" ? `${base}/report?${org}` : null,
  };
}

/** Use only sessions already returned for this teacher. Never manufacture a session/date. */
export function teacherPrioritySession(board: TodaySessionBoard): StaffSessionItem | null {
  const todayInProgress = board.todaySessions.find(s => s.status === "in_progress");
  const ongoing = board.ongoingFromOtherDays.find(s => s.status === "in_progress");
  const todayScheduled = board.todaySessions.find(s => s.status === "scheduled" && s.parentsActive && s.scheduled_date === board.today);
  const overdue = board.overdueSessions.find(s => s.status === "scheduled" && s.parentsActive && s.scheduled_date !== null && s.scheduled_date < board.today);
  const undated = board.undatedSessions.find(s => s.status === "scheduled" && s.parentsActive && s.scheduled_date === null);
  return todayInProgress ?? ongoing ?? todayScheduled ?? overdue ?? undated ?? null;
}
