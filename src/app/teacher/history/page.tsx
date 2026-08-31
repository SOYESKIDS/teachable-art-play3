import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth/organization";
import {
  buildClassFilterOptions,
  buildHistorySummary,
  fetchSessionHistory,
} from "@/lib/staff/class-session-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { StaffShell } from "@/components/staff/StaffShell";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { SessionHistoryBoard } from "@/components/staff/SessionHistoryBoard";
import { TEACHER_NAV } from "../nav";

export const metadata: Metadata = {
  title: "수업 이력 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface TeacherHistoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 교사 — 수업 이력.
 *
 * 완료·취소한 지난 수업을 확인하는 화면이다. 여기서는 상태를 바꾸지 않는다.
 * 반이 보관되거나 프로그램·차시가 archived된 뒤에도 이름이 계속 보인다
 * (20260827 staff historical read RLS).
 */
export default async function TeacherHistoryPage({
  searchParams,
}: TeacherHistoryPageProps) {
  const { supabase, email, memberships } = await requireTeacher();

  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath="/teacher/history"
        roleLabel="교사"
      />
    );
  }

  const result = await fetchSessionHistory(supabase, membership.organizationId);

  const sessions = result.ok ? result.sessions : [];
  const classes = result.ok ? result.classes : [];

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher/history"
    >
      <h1 className="text-[22px] font-bold text-navy">수업 이력</h1>
      <p className="mt-1 text-[14px] text-navy/55">
        담당 반에서 진행한 수업 기록입니다.
      </p>

      <div className="mt-5">
        <SessionHistoryBoard
          sessions={sessions}
          summary={buildHistorySummary(sessions)}
          classOptions={buildClassFilterOptions(classes, sessions)}
          hasError={!result.ok}
          attendanceBasePath="/teacher/sessions"
          observationBasePath="/teacher/sessions"
        />
      </div>
    </StaffShell>
  );
}
