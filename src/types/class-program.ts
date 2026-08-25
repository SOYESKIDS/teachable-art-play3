import type { AgeGroup, ClassStatus } from "./class-child";
import type { CurriculumStatus } from "./curriculum";

/** public.class_program_assignments 대응 타입 (20260825_create_curriculum_foundation.sql) */

/**
 * active    : 운영 중
 * completed : 정상 종료 (terminal)
 * cancelled : 중도 취소 (terminal)
 */
export type AssignmentStatus = "active" | "completed" | "cancelled";

/**
 * 배정 생성 이후 바꿀 수 있는 유일한 값.
 *
 * 신규 배정은 항상 active로 시작하고, 그 뒤에 허용되는 전이는
 * active -> completed / active -> cancelled 둘뿐이다.
 * active를 다시 지정하는 것(= 사실상 수정)도 허용하지 않는다.
 */
export type AssignmentCloseStatus = Extract<
  AssignmentStatus,
  "completed" | "cancelled"
>;

export interface ClassProgramAssignmentRow {
  id: string;
  organization_id: string;
  class_id: string;
  program_id: string;
  /** date 컬럼. "YYYY-MM-DD" 문자열 그대로 다룬다(시간대 변환 없음). */
  start_date: string | null;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
}

/**
 * 운영 현황 목록 한 줄.
 *
 * 반/프로그램 정보를 메모리 join으로 풀어 둔다.
 * 배정 당시 published였던 프로그램이 나중에 archived될 수 있으므로
 * programStatus는 "지금" 상태이고, 이력 표시를 막는 근거로 쓰지 않는다.
 */
export interface ClassProgramAssignmentItem extends ClassProgramAssignmentRow {
  className: string | null;
  classStatus: ClassStatus | null;
  programCode: string | null;
  programTitle: string | null;
  programStatus: CurriculumStatus | null;
}

/** 배정 Dialog의 반 후보 (운영 중인 반만) */
export interface AssignableClassOption {
  id: string;
  name: string;
  ageGroup: AgeGroup | null;
  schoolYear: number;
  /** 이 반에서 이미 운영 중인 프로그램 id — 후보에서 제외하는 데 쓴다 */
  activeProgramIds: string[];
}

/** 배정 Dialog의 프로그램 후보 (게시된 프로그램만) */
export interface AssignableProgramOption {
  id: string;
  code: string;
  title: string;
  durationWeeks: number;
  ageGroup: AgeGroup | null;
}

export interface ClassProgramSummary {
  /** status='active' 배정 수 (반 수가 아니라 배정 건수) */
  active: number;
  completed: number;
  cancelled: number;
  /** 운영 중인 반 가운데 active 배정이 하나도 없는 반 수 (보관 반 제외) */
  unassignedActiveClasses: number;
}
