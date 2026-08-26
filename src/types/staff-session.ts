import type { AgeGroup, ClassStatus } from "./class-child";
import type { AssignmentStatus } from "./class-program";
import type { ClassSessionRow, ClassSessionStatus } from "./class-session";
import type { CurriculumStatus } from "./curriculum";

/**
 * 원장/교사 수업 운영 화면(SERVICE-06C-B) ViewModel.
 *
 * DB row(ClassSessionRow)와 화면용 모델을 분리한다.
 * 화면에 필요한 반·프로그램·차시 이름은 class_sessions에 없고
 * 옆 테이블에서 메모리 join으로 붙인다(질의는 목록당 고정 횟수).
 *
 * 각 name/status가 nullable인 이유
 *   부모가 나중에 보관되어도 RLS(20260827)가 이름을 계속 읽게 해 주지만,
 *   교사 배정이 해제되는 등으로 조회 범위를 벗어나면 null이 될 수 있다.
 *   그때도 화면이 깨지지 않도록 전부 nullable로 둔다.
 */
export interface StaffSessionItem extends ClassSessionRow {
  className: string | null;
  classAgeGroup: AgeGroup | null;
  classStatus: ClassStatus | null;
  programTitle: string | null;
  programCode: string | null;
  programStatus: CurriculumStatus | null;
  weekNo: number | null;
  sessionNo: number | null;
  lessonTitle: string | null;
  lessonStatus: CurriculumStatus | null;
  assignmentStatus: AssignmentStatus | null;
  /**
   * 배정·반·프로그램·차시가 지금도 전부 유효한가.
   *
   * true라야 "수업 시작"이 가능하다. false여도 완료/취소 정리는 언제나 가능하다.
   * (20260826의 enforce_class_session_update trigger와 같은 기준)
   */
  parentsActive: boolean;
}

/** 오늘의 수업 화면 KPI — 전부 "오늘" 기준이지만 진행 중만 날짜와 무관하다 */
export interface TodaySessionSummary {
  scheduledToday: number;
  inProgress: number;
  completedToday: number;
  cancelledToday: number;
}

/**
 * 오늘의 수업 화면에 필요한 묶음.
 *
 * 오늘 날짜의 수업만 보여주면 "어제 잡아 두고 아직 안 한 수업"과
 * "날짜를 아직 안 정한 수업"을 영영 놓친다. 그래서 세 갈래로 나눠 담는다.
 */
export interface TodaySessionBoard {
  today: string;
  summary: TodaySessionSummary;
  /** 오늘 날짜로 잡힌 수업 (상태 무관) */
  todaySessions: StaffSessionItem[];
  /** 오늘이 아닌데 아직 진행 중인 수업 — 마무리하지 않은 것들 */
  ongoingFromOtherDays: StaffSessionItem[];
  /** 예정일이 지났는데 아직 예정 상태인 수업 */
  overdueSessions: StaffSessionItem[];
  /** 예정일을 아직 정하지 않은 수업 */
  undatedSessions: StaffSessionItem[];
}

/** 수업 이력 화면 필터 */
export type SessionHistoryFilter = ClassSessionStatus | "all";

export interface SessionHistorySummary {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

/** 이력 화면의 반 필터 선택지 */
export interface ClassFilterOption {
  id: string;
  name: string;
  status: ClassStatus;
}
