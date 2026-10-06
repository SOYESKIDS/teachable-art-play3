import type { Metadata } from "next";
import { FutureSessionNotice } from "@/components/staff/FutureSessionNotice";
import { isFutureSessionDate } from "@/lib/staff/session-dates";
import { requireDirector } from "@/lib/auth/organization";
import { fetchStaffAttendance } from "@/lib/staff/attendance-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { AttendanceEditor } from "@/components/staff/AttendanceEditor";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { directorNavFor } from "../../../nav";

export const metadata: Metadata = {
  title: "출결 관리 | TeachAble Art Play",
  robots: {
    index: false,
    follow: false,
  },
};

interface DirectorAttendancePageProps {
  params: Promise<{
    sessionId: string;
  }>;

  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}

export default async function DirectorAttendancePage({
  params,
  searchParams,
}: DirectorAttendancePageProps) {
  const {
    supabase,
    email,
    memberships,
  } = await requireDirector();

  const { sessionId } = await params;
  const query = await searchParams;

  const membership = resolveMembership(
    memberships,
    query.org,
  );

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/director/sessions/${sessionId}/attendance`}
        roleLabel="원장"
      />
    );
  }

  const result =
    await fetchStaffAttendance(
      supabase,
      membership.organizationId,
      sessionId,
    );

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={
        membership.organizationName
      }
      navItems={await directorNavFor(supabase, membership.organizationId)}
      currentHref="/director/sessions"
    >
      {!result.ok ? (
        <div>
          <h1 className="text-headline font-bold text-navy">
            출결 관리
          </h1>

          <p className="mt-4 rounded-xl border border-line bg-white px-4 py-10 text-center text-label leading-relaxed text-ink-muted">
            {result.reason ===
            "load_failed"
              ? "출결 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
              : "수업을 찾을 수 없거나 접근 권한이 없습니다."}
          </p>
        </div>
      ) : isFutureSessionDate(result.data.session.scheduledDate) ? (
        // 미래 수업: 출결은 수업일에 연다 (서버도 guardSessionWrite 로 거절)
        <FutureSessionNotice scheduledDate={result.data.session.scheduledDate} actionLabel="출결 저장" />
      ) : (
        <AttendanceEditor
          data={result.data}
          role="director"
          backHref={`/director/sessions?org=${encodeURIComponent(
            membership.organizationId,
          )}`}
        />
      )}
    </StaffShell>
  );
}
