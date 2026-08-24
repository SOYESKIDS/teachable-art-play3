import type { ClassStatus } from "./class-child";

/** public.class_teachers 대응 타입 (20260824_create_class_child_foundation.sql) */

/** organization_members.status — role='teacher'인 구성원 기준 */
export type TeacherMemberStatus = "active" | "invited" | "disabled";

export interface ClassTeacherAssignment {
  id: string;
  organization_id: string;
  class_id: string;
  organization_member_id: string;
  created_at: string;
}

/** 교사가 담당 중인 반 (화면 표시용으로 반 정보를 풀어 둔다) */
export interface AssignedClass {
  classId: string;
  className: string;
  schoolYear: number;
  classStatus: ClassStatus;
}

/**
 * 담당 교사 목록 한 줄.
 *
 * membershipId는 organization_members.id다.
 * class_teachers가 user_id가 아니라 이 id를 참조하므로 배정 API의 키도 이 값이다.
 */
export interface TeacherAssignmentViewModel {
  membershipId: string;
  userId: string;
  displayName: string;
  membershipStatus: TeacherMemberStatus;
  assignedClasses: AssignedClass[];
}

export interface TeacherAssignmentSummary {
  /** role='teacher' 전체 */
  total: number;
  /** role='teacher' AND status='active' */
  active: number;
  /** active 교사 중 배정이 1개 이상 */
  assigned: number;
  /** active 교사 중 배정 0개 */
  unassigned: number;
}
