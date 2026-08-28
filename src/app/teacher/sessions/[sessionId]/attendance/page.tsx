import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth/organization";
import { fetchStaffAttendance } from "@/lib/staff/attendance-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { AttendanceEditor } from "@/components/staff/AttendanceEditor";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { TEACHER_NAV } from "../../../nav";

export const metadata: Metadata = {
  title: "출결 체크 | TeachAble Art Play",
  robots: {
    index: false,
    follow: false,
  },
};

interface TeacherAttendancePageProps {
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

export default async function TeacherAttendancePage({
  params,
  searchParams,
}: TeacherAttendancePageProps) {
  const {
    supabase,
    email,
    memberships,
  } = await requireTeacher();

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
        basePath={`/teacher/sessions/${sessionId}/attendance`}
        roleLabel="교사"
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
      roleLabel="교사"
      organizationName={
        membership.organizationName
      }
      navItems={TEACHER_NAV}
      currentHref="/teacher"
    >
      {!result.ok ? (
        <div>
          <h1 className="text-[22px] font-bold text-navy">
            출결 체크
          </h1>

          <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-10 text-center text-[14px] leading-relaxed text-navy/55">
            {result.reason ===
            "load_failed"
              ? "출결 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
              : "수업을 찾을 수 없거나 접근 권한이 없습니다."}
          </p>
        </div>
      ) : (
        <AttendanceEditor
          data={result.data}
          role="teacher"
          backHref={`/teacher?org=${encodeURIComponent(
            membership.organizationId,
          )}`}
        />
      )}
    </StaffShell>
  );
}
