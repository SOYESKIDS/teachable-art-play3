import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth/organization";
import { fetchStaffObservations } from "@/lib/staff/observation-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { ObservationBoard } from "@/components/staff/ObservationBoard";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { TEACHER_NAV } from "../../../nav";

export const metadata: Metadata = {
  title: "관찰기록 | TeachAble Art Play",
  robots: {
    index: false,
    follow: false,
  },
};

interface TeacherObservationPageProps {
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

/**
 * SERVICE-08B-1 — 교사 관찰기록 페이지 (읽기 전용).
 *
 * 07B 출결 페이지와 같은 골격을 쓴다.
 *   requireTeacher() → 소속 확인 → fetchStaffObservations() → StaffShell
 *
 * ★ 실패 문구는 "찾을 수 없거나 접근 권한이 없습니다" 하나로 합친다.
 *   존재하지 않는 수업과 권한 없는 수업을 구분해 보여주면
 *   sessionId를 바꿔가며 다른 기관의 수업 존재 여부를 확인할 수 있다.
 */
export default async function TeacherObservationPage({
  params,
  searchParams,
}: TeacherObservationPageProps) {
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
        basePath={`/teacher/sessions/${sessionId}/observations`}
        roleLabel="교사"
      />
    );
  }

  const result =
    await fetchStaffObservations(
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
            관찰기록
          </h1>

          <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-10 text-center text-[14px] leading-relaxed text-navy/55">
            {result.reason ===
            "load_failed"
              ? "관찰기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
              : "수업을 찾을 수 없거나 접근 권한이 없습니다."}
          </p>
        </div>
      ) : (
        <ObservationBoard
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
