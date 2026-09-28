import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth/organization";
import { fetchStaffObservations } from "@/lib/staff/observation-queries";
import { fetchClassEntitlements } from "@/lib/entitlement/queries";
import { resolveMembership } from "@/lib/staff/membership";
import { ClassObservationWorkspace } from "@/components/staff/ClassObservationWorkspace";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { TEACHER_NAV } from "../../../nav";
import { LegacyTeacherObservationPage } from "./LegacyTeacherObservationPage";
import { staffAppRouting } from "@/lib/rollout/staff-app-routing";

export const metadata: Metadata = {
  title: "관찰 기록 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface TeacherObservationPageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type AttendanceStatus = "present" | "absent" | "late" | "left_early";

/**
 * TC-05 AFTER ② 관찰 (Observation 2.0 · DEC-086 · DEC-099 · DEC-100).
 *
 * 실패 문구는 "찾을 수 없거나 접근 권한이 없습니다" 하나로 합친다 (존재 여부 무구분).
 * 쓰기 가능 여부 = 반 기능 권한 ∧ 서비스 모드 ∧ 진행 중/종료 수업 (최종 판정은 RPC).
 */
export default async function TeacherObservationPage({ params, searchParams }: TeacherObservationPageProps) {
  // G-2 rollout: Production 기본은 legacy 관찰 화면 (계약 없이도 기존 운영 경로 유지 · 권한은 DB 판정)
  if (staffAppRouting() === "legacy") {
    return <LegacyTeacherObservationPage params={params} searchParams={searchParams} />;
  }

  const { supabase, email, memberships } = await requireTeacher();
  const { sessionId } = await params;
  const query = await searchParams;
  const membership = resolveMembership(memberships, query.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/teacher/sessions/${sessionId}/observations`}
        roleLabel="교사"
      />
    );
  }

  const orgQuery = `?org=${encodeURIComponent(membership.organizationId)}`;
  const result = await fetchStaffObservations(supabase, membership.organizationId, sessionId);

  let attendance: Record<string, AttendanceStatus> = {};
  let canWrite = false;
  let blockedReason: string | null = null;

  if (result.ok) {
    const [attendanceResult, entitlements] = await Promise.all([
      supabase
        .from("class_session_attendance")
        .select("child_id, attendance_status")
        .eq("class_session_id", sessionId)
        .limit(200),
      fetchClassEntitlements(supabase, result.data.session.classId),
    ]);

    if (!attendanceResult.error) {
      attendance = Object.fromEntries(
        ((attendanceResult.data ?? []) as { child_id: string; attendance_status: AttendanceStatus }[]).map((row) => [
          row.child_id,
          row.attendance_status,
        ]),
      );
    }

    const sessionOpen = result.data.session.status === "in_progress" || result.data.session.status === "completed";
    canWrite = entitlements.classModeWrite && sessionOpen;
    blockedReason = !sessionOpen
      ? result.data.session.status === "scheduled"
        ? "수업을 시작한 뒤에 관찰을 기록할 수 있습니다."
        : "취소된 수업입니다. 이미 남아 있는 기록은 확인만 할 수 있습니다."
      : !entitlements.classModeWrite
        ? "현재 읽기 전용 상태이거나 이용 상품에 포함되지 않아 새 기록을 작성할 수 없습니다. 원장님께 문의해 주세요."
        : null;
  }

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher"
    >
      <h1 className="text-[24px] font-bold text-ink">관찰 기록</h1>
      {result.ok ? (
        <p className="mt-1 text-[15px] text-ink-muted">
          {result.data.session.className ?? ""} · {result.data.session.lessonTitle ?? ""}
        </p>
      ) : null}

      <div className="mt-5">
        {!result.ok ? (
          <p className="rounded-xl border border-hairline bg-white px-4 py-10 text-center text-[15px] text-ink">
            {result.reason === "load_failed"
              ? "관찰 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
              : "찾을 수 없거나 접근 권한이 없습니다."}
          </p>
        ) : (
          <ClassObservationWorkspace
            data={result.data}
            attendance={attendance}
            canWrite={canWrite}
            blockedReason={blockedReason}
            backHref={`/teacher${orgQuery}`}
            weeklyQueueHref={`/teacher/growth-reports${orgQuery}${
              result.data.session.weekNo ? `&week=${result.data.session.weekNo}` : ""
            }`}
          />
        )}
      </div>
    </StaffShell>
  );
}
