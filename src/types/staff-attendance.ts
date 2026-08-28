import type { ChildStatus, ClassStatus } from "./class-child";
import type { ClassSessionStatus } from "./class-session";

/**
 * public.class_session_attendance.attendance_status
 */
export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "left_early";

/**
 * public.class_session_attendance 대응 타입.
 *
 * organization_id / class_id는 Client가 정하지 않는다.
 * 저장 시 Server가 class_sessions에서 다시 읽어 결정한다.
 */
export interface ClassSessionAttendanceRow {
  id: string;
  organization_id: string;
  class_session_id: string;
  class_id: string;
  child_id: string;
  attendance_status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

/**
 * 출결 상세 화면 상단의 수업 정보.
 */
export interface StaffAttendanceSession {
  id: string;
  organizationId: string;
  classId: string;

  className: string | null;
  classStatus: ClassStatus | null;

  scheduledDate: string | null;
  status: ClassSessionStatus;

  programTitle: string | null;
  programCode: string | null;

  weekNo: number | null;
  sessionNo: number | null;
  lessonTitle: string | null;
}

/**
 * 출결 화면의 원아 한 명.
 *
 * currentClassId가 session.classId와 다르면서 기존 attendance가 있다면
 * 원아가 이후 다른 반으로 이동한 historical row다.
 *
 * childName을 nullable로 둔 이유:
 * RLS/데이터 이상이 생겨 children row를 읽지 못하더라도
 * 이미 존재하는 attendance 자체를 화면에서 조용히 누락시키지 않기 위해서다.
 */
export interface StaffAttendanceChild {
  childId: string;
  childName: string | null;
  childStatus: ChildStatus | null;
  currentClassId: string | null;

  attendanceId: string | null;
  attendanceStatus: AttendanceStatus | null;

  hasExistingAttendance: boolean;
  isCurrentClassMember: boolean;
}

/**
 * 출결 상세 페이지 전체 데이터.
 */
export interface StaffAttendancePageData {
  session: StaffAttendanceSession;
  children: StaffAttendanceChild[];
}

export type StaffAttendanceLoadResult =
  | {
      ok: true;
      data: StaffAttendancePageData;
    }
  | {
      ok: false;
      reason: "invalid_id" | "not_found" | "load_failed";
    };

/**
 * 한 수업 출결 화면이 다루는 원아 수 상한.
 *
 * 조회(roster)와 저장(entries)이 같은 값을 쓴다.
 * 유치원 한 반은 보통 20~30명이라 200이면 정상 운영을 막지 않으면서
 * 잘못된 대량 요청은 걸러낸다.
 */
export const MAX_ATTENDANCE_ROSTER = 200;

/**
 * Client → Server 저장 요청에서 허용하는 최소 데이터.
 */
export interface AttendanceEntryInput {
  childId: string;
  attendanceStatus: AttendanceStatus;
}

export interface AttendanceFormState {
  phase: "idle" | "success" | "error";
  message: string | null;
}

export const ATTENDANCE_FORM_INITIAL_STATE: AttendanceFormState = {
  phase: "idle",
  message: null,
};
