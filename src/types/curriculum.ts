import type { AgeGroup } from "./class-child";

/**
 * public.curriculum_programs / curriculum_lessons / lesson_activities 대응 타입
 * (20260825_create_curriculum_foundation.sql)
 *
 * age_group은 classes와 허용값이 같아 @/types/class-child의 AgeGroup을 재사용한다.
 */

/** 프로그램·차시가 공유하는 콘텐츠 수명주기 */
export type CurriculumStatus = "draft" | "published" | "archived";

export type ActivityType =
  | "intro"
  | "warmup"
  | "activity"
  | "creative"
  | "reflection"
  | "closing";

export interface CurriculumProgramRow {
  id: string;
  code: string;
  title: string;
  summary: string | null;
  age_group: AgeGroup | null;
  duration_weeks: number;
  status: CurriculumStatus;
  created_at: string;
  updated_at: string;
}

export interface CurriculumLessonRow {
  id: string;
  program_id: string;
  week_no: number;
  session_no: number;
  title: string;
  objective: string | null;
  duration_minutes: number | null;
  status: CurriculumStatus;
  created_at: string;
  updated_at: string;
}

export interface LessonActivityRow {
  id: string;
  lesson_id: string;
  sequence_no: number;
  title: string;
  activity_type: ActivityType;
  description: string | null;
  duration_minutes: number | null;
  materials: string | null;
  created_at: string;
  updated_at: string;
}

/** 프로그램 목록 표시용 — 차시 수를 메모리 집계로 덧붙인다 */
export interface ProgramListItem extends CurriculumProgramRow {
  lessonCount: number;
}

/** 차시 목록 표시용 — 활동 수를 메모리 집계로 덧붙인다 */
export interface LessonListItem extends CurriculumLessonRow {
  activityCount: number;
}

/** 프로그램·차시 요약 KPI (status 기준 집계) */
export interface CurriculumStatusSummary {
  total: number;
  draft: number;
  published: number;
  archived: number;
}
