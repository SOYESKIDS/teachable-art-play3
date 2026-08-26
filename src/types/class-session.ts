import type { AgeGroup, ClassStatus } from "./class-child";
import type { AssignmentStatus } from "./class-program";
import type { CurriculumStatus } from "./curriculum";

/** public.class_sessions 대응 타입 (20260826_create_class_sessions_foundation.sql) */

/**
 * scheduled   : 예정
 * in_progress : 진행 중
 * completed   : 완료   (terminal)
 * cancelled   : 취소   (terminal)
 */
export type ClassSessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

/** 생성 후 상태를 바꿀 때 고를 수 있는 값. 'scheduled'로는 되돌릴 수 없다. */
export type ClassSessionTransitionStatus = Exclude<
  ClassSessionStatus,
  "scheduled"
>;

export interface ClassSessionRow {
  id: string;
  organization_id: string;
  class_id: string;
  class_program_assignment_id: string;
  program_id: string;
  lesson_id: string;
  /** date 컬럼. "YYYY-MM-DD" 문자열 그대로 다룬다(시간대 변환 없음). */
  scheduled_date: string | null;
  status: ClassSessionStatus;
  created_at: string;
  updated_at: string;
}

/**
 * 수업 이력 한 줄.
 *
 * 주차/차시/차시명은 class_sessions에 저장하지 않고 curriculum_lessons에서 풀어 온다.
 * lessonStatus는 "지금" 상태다 — 수업 당시 published였어도 나중에 archived될 수 있고,
 * 그 경우에도 이력 표시를 막지 않는다.
 */
export interface ClassSessionItem extends ClassSessionRow {
  weekNo: number | null;
  sessionNo: number | null;
  lessonTitle: string | null;
  lessonStatus: CurriculumStatus | null;
}

/** 수업 일정 등록 Dialog의 차시 후보 (게시된 차시만) */
export interface SchedulableLessonOption {
  id: string;
  weekNo: number;
  sessionNo: number;
  title: string;
}

export interface ClassSessionSummary {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

/**
 * 배정 상세 페이지 Header에 필요한 맥락.
 *
 * 배정이 completed/cancelled여도 이 페이지는 이력 조회용으로 계속 열려야 하므로
 * status를 그대로 담아 두고, 화면에서 "종료된 배정" 안내를 띄우는 데 쓴다.
 */
export interface AssignmentContext {
  assignmentId: string;
  organizationId: string;
  organizationName: string;
  classId: string;
  className: string;
  classAgeGroup: AgeGroup | null;
  classSchoolYear: number;
  classStatus: ClassStatus;
  programId: string;
  programCode: string;
  programTitle: string;
  programStatus: CurriculumStatus;
  assignmentStatus: AssignmentStatus;
  assignmentStartDate: string | null;
}
