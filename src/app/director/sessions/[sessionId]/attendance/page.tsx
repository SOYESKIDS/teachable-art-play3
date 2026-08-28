import type { Metadata } from "next";
import { requireDirector } from "@/lib/auth/organization";
import { fetchStaffAttendance } from "@/lib/staff/attendance-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { AttendanceEditor } from "@/components/staff/AttendanceEditor";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { DIRECTOR_NAV } from "../../../nav";

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
      navItems={DIRECTOR_NAV}
      currentHref="/director/sessions"
    >
      {!result.ok ? (
        <div>
          <h1 className="text-[22px] font-bold text-navy">
            출결 관리
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
          role="director"
          backHref={`/director/sessions?org=${encodeURIComponent(
            membership.organizationId,
          )}`}
        />
      )}
    </StaffShell>
  );
}
