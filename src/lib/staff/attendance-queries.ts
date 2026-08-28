import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChildStatus, ClassStatus } from "@/types/class-child";
import type { ClassSessionStatus } from "@/types/class-session";
import {
  MAX_ATTENDANCE_ROSTER,
  type AttendanceStatus,
  type ClassSessionAttendanceRow,
  type StaffAttendanceChild,
  type StaffAttendanceLoadResult,
} from "@/types/staff-attendance";

/**
 * SERVICE-07B — 원장/교사 출결 상세 조회.
 *
 * ★ 권한 범위는 RLS가 최종 결정한다.
 *   organizationId/sessionId를 URL에서 받더라도
 *   class_sessions SELECT가 허용되지 않으면 session 자체가 0건이다.
 *
 * ★ 출결 명단
 *
 *   A. 현재 session.class_id 소속 children
 *      UNION
 *   B. 이 session에 이미 attendance가 존재하는 children
 *
 * B가 필요한 이유:
 * 원아가 수업 후 다른 반으로 이동해도 과거 출결에서 이름이 사라지면 안 된다.
 *
 * ★ N+1 금지
 * session 1회 조회 후 필요한 metadata/children/attendance를 일괄 조회한다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 조회와 저장이 같은 상한을 쓴다 (types/staff-attendance.ts) */
const LOOKUP_LIMIT = MAX_ATTENDANCE_ROSTER;

interface SessionRow {
  id: string;
  organization_id: string;
  class_id: string;
  program_id: string;
  lesson_id: string;
  scheduled_date: string | null;
  status: ClassSessionStatus;
}

interface ClassLookupRow {
  id: string;
  name: string;
  status: ClassStatus;
}

interface ProgramLookupRow {
  id: string;
  code: string;
  title: string;
}

interface LessonLookupRow {
  id: string;
  week_no: number;
  session_no: number;
  title: string;
}

interface ChildLookupRow {
  id: string;
  class_id: string | null;
  name: string;
  status: ChildStatus;
}

type AttendanceLookupRow = Pick<
  ClassSessionAttendanceRow,
  "id" | "child_id" | "attendance_status"
>;

function logQueryFailure(scope: string, message: string) {
  console.error(`[staff/attendance] ${scope} query failed: ${message}`);
}

/**
 * 원장/교사가 출결 상세 화면을 열 때 필요한 데이터를 읽는다.
 *
 * 다른 기관/다른 반 sessionId를 넣어도 RLS 때문에 session 조회가 0건이므로
 * not_found로만 응답한다. 권한 존재 여부를 별도 정보로 노출하지 않는다.
 */
export async function fetchStaffAttendance(
  supabase: SupabaseClient,
  organizationId: string,
  sessionId: string,
): Promise<StaffAttendanceLoadResult> {
  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(sessionId)) {
    return { ok: false, reason: "invalid_id" };
  }

  // 1. 수업 자체를 먼저 확인한다.
  // RLS가 원장/교사가 볼 수 있는 session 범위를 결정한다.
  const { data: sessionData, error: sessionError } = await supabase
    .from("class_sessions")
    .select(
      "id, organization_id, class_id, program_id, lesson_id, scheduled_date, status",
    )
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (sessionError) {
    logQueryFailure("session", sessionError.message);
    return { ok: false, reason: "load_failed" };
  }

  if (!sessionData) {
    return { ok: false, reason: "not_found" };
  }

  const session = sessionData as unknown as SessionRow;

  // 2. 수업 context + 현재 반 원아 + 기존 출결을 고정 횟수로 조회한다.
  const [
    classResult,
    programResult,
    lessonResult,
    currentChildrenResult,
    attendanceResult,
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, status")
      .eq("id", session.class_id)
      .maybeSingle(),

    supabase
      .from("curriculum_programs")
      .select("id, code, title")
      .eq("id", session.program_id)
      .maybeSingle(),

    supabase
      .from("curriculum_lessons")
      .select("id, week_no, session_no, title")
      .eq("id", session.lesson_id)
      .maybeSingle(),

    supabase
      .from("children")
      .select("id, class_id, name, status")
      .eq("organization_id", organizationId)
      .eq("class_id", session.class_id)
      .order("name", { ascending: true })
      .limit(LOOKUP_LIMIT),

    supabase
      .from("class_session_attendance")
      .select("id, child_id, attendance_status")
      .eq("organization_id", organizationId)
      .eq("class_session_id", session.id)
      .limit(LOOKUP_LIMIT),
  ]);

  if (classResult.error) {
    logQueryFailure("class", classResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (programResult.error) {
    logQueryFailure("program", programResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (lessonResult.error) {
    logQueryFailure("lesson", lessonResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (currentChildrenResult.error) {
    logQueryFailure("current children", currentChildrenResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (attendanceResult.error) {
    logQueryFailure("attendance", attendanceResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  const classRow =
    (classResult.data as unknown as ClassLookupRow | null) ?? null;

  const programRow =
    (programResult.data as unknown as ProgramLookupRow | null) ?? null;

  const lessonRow =
    (lessonResult.data as unknown as LessonLookupRow | null) ?? null;

  const currentChildren =
    (currentChildrenResult.data ?? []) as unknown as ChildLookupRow[];

  const attendanceRows =
    (attendanceResult.data ?? []) as unknown as AttendanceLookupRow[];

  const currentChildById = new Map(
    currentChildren.map((child) => [child.id, child]),
  );

  /**
   * 기존 attendance에 있지만 현재 session 반 명단에는 없는 원아.
   *
   * 대표적인 경우:
   *   수업 당시 햇살반
   *   → 출결 기록
   *   → 이후 달빛반으로 이동
   *
   * 07A-1의 can_read_child_attendance_history()가 바로 이 이름 조회를 허용한다.
   */
  const historicalChildIds = [
    ...new Set(
      attendanceRows
        .map((row) => row.child_id)
        .filter((childId) => !currentChildById.has(childId)),
    ),
  ];

  let historicalChildren: ChildLookupRow[] = [];

  if (historicalChildIds.length > 0) {
    const { data, error } = await supabase
      .from("children")
      .select("id, class_id, name, status")
      .eq("organization_id", organizationId)
      .in("id", historicalChildIds)
      .limit(LOOKUP_LIMIT);

    if (error) {
      logQueryFailure("historical children", error.message);
      return { ok: false, reason: "load_failed" };
    }

    historicalChildren = (data ?? []) as unknown as ChildLookupRow[];
  }

  const childById = new Map<string, ChildLookupRow>();

  for (const child of currentChildren) {
    childById.set(child.id, child);
  }

  for (const child of historicalChildren) {
    childById.set(child.id, child);
  }

  const attendanceByChildId = new Map(
    attendanceRows.map((row) => [row.child_id, row]),
  );

  /**
   * 화면 roster:
   *
   * 현재 반 원아
   * UNION
   * 기존 attendance 원아
   */
  const rosterIds = [
    ...new Set([
      ...currentChildren.map((child) => child.id),
      ...attendanceRows.map((row) => row.child_id),
    ]),
  ];

  const children: StaffAttendanceChild[] = rosterIds
    .map((childId) => {
      const child = childById.get(childId) ?? null;
      const attendance = attendanceByChildId.get(childId) ?? null;

      return {
        childId,
        childName: child?.name ?? null,
        childStatus: child?.status ?? null,
        currentClassId: child?.class_id ?? null,

        attendanceId: attendance?.id ?? null,
        attendanceStatus:
          (attendance?.attendance_status as AttendanceStatus | undefined) ??
          null,

        hasExistingAttendance: attendance !== null,
        isCurrentClassMember: child?.class_id === session.class_id,
      };
    })
    .sort((a, b) => {
      const nameA = a.childName ?? "\uffff";
      const nameB = b.childName ?? "\uffff";

      const byName = nameA.localeCompare(nameB, "ko");
      if (byName !== 0) return byName;

      return a.childId.localeCompare(b.childId);
    });

  return {
    ok: true,
    data: {
      session: {
        id: session.id,
        organizationId: session.organization_id,
        classId: session.class_id,

        className: classRow?.name ?? null,
        classStatus: classRow?.status ?? null,

        scheduledDate: session.scheduled_date,
        status: session.status,

        programTitle: programRow?.title ?? null,
        programCode: programRow?.code ?? null,

        weekNo: lessonRow?.week_no ?? null,
        sessionNo: lessonRow?.session_no ?? null,
        lessonTitle: lessonRow?.title ?? null,
      },

      children,
    },
  };
}
