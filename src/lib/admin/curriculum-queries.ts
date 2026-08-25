import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CurriculumLessonRow,
  CurriculumProgramRow,
  CurriculumStatus,
  CurriculumStatusSummary,
  LessonActivityRow,
  LessonListItem,
  ProgramListItem,
} from "@/types/curriculum";

/**
 * Admin 커리큘럼 조회.
 *
 * organization-queries.ts / class-child-queries.ts와 동일하게
 * **로그인한 SOYES 운영자 세션의 Client로만** 질의한다. Service Role은 쓰지 않는다.
 * 어떤 행이 보이는지는 RLS
 *   "curriculum programs readable by soyes admin and org members"
 *   "curriculum lessons readable by soyes admin and org members"
 *   "lesson activities readable by soyes admin and org members"
 * 가 결정한다. 운영자는 draft/published/archived를 모두 본다.
 *
 * ★ N+1 방지 원칙
 *   차시 수 / 활동 수는 행마다 count 질의를 날리지 않는다.
 *   부모 목록 1회 + 자식 키 목록 1회를 읽고 메모리에서 집계한다.
 */

const PROGRAM_COLUMNS = [
  "id",
  "code",
  "title",
  "summary",
  "age_group",
  "duration_weeks",
  "status",
  "created_at",
  "updated_at",
].join(", ");

const LESSON_COLUMNS = [
  "id",
  "program_id",
  "week_no",
  "session_no",
  "title",
  "objective",
  "duration_minutes",
  "status",
  "created_at",
  "updated_at",
].join(", ");

const ACTIVITY_COLUMNS = [
  "id",
  "lesson_id",
  "sequence_no",
  "title",
  "activity_type",
  "description",
  "duration_minutes",
  "materials",
  "created_at",
  "updated_at",
].join(", ");

/**
 * 콘텐츠 규모는 프로그램 수십 · 차시 수백 수준이라 페이지네이션 없이 한 번에 읽는다.
 * 예상 밖으로 커졌을 때를 대비해 상한만 둔다.
 */
const PROGRAM_FETCH_LIMIT = 500;
const LESSON_FETCH_LIMIT = 2000;
const ACTIVITY_FETCH_LIMIT = 2000;

export type ProgramListResult =
  | { ok: true; programs: CurriculumProgramRow[]; lessonCountByProgramId: Record<string, number> }
  | { ok: false };

export type ProgramDetailResult =
  | { ok: true; program: CurriculumProgramRow | null }
  | { ok: false };

export type LessonListResult =
  | { ok: true; lessons: CurriculumLessonRow[]; activityCountByLessonId: Record<string, number> }
  | { ok: false };

export type LessonDetailResult =
  | { ok: true; lesson: CurriculumLessonRow | null }
  | { ok: false };

export type ActivityListResult =
  | { ok: true; activities: LessonActivityRow[] }
  | { ok: false };

function logQueryFailure(scope: string, message: string) {
  console.error(`[admin/curriculum] ${scope} query failed: ${message}`);
}

/**
 * 프로그램 목록 + 프로그램별 차시 수.
 *
 * 차시 수를 위해 lessons에서 program_id 컬럼 하나만 전부 읽어 메모리에서 센다.
 * 프로그램마다 count 질의를 도는 것보다 질의 수가 N+1이 아니라 2로 고정된다.
 */
export async function fetchProgramList(
  supabase: SupabaseClient,
): Promise<ProgramListResult> {
  const [programResponse, lessonKeyResponse] = await Promise.all([
    supabase
      .from("curriculum_programs")
      .select(PROGRAM_COLUMNS)
      .order("code", { ascending: true })
      .limit(PROGRAM_FETCH_LIMIT),
    supabase
      .from("curriculum_lessons")
      .select("program_id")
      .limit(LESSON_FETCH_LIMIT),
  ]);

  if (programResponse.error) {
    logQueryFailure("programs", programResponse.error.message);
    return { ok: false };
  }

  if (lessonKeyResponse.error) {
    logQueryFailure("lesson keys", lessonKeyResponse.error.message);
    return { ok: false };
  }

  const lessonKeys = (lessonKeyResponse.data ?? []) as unknown as {
    program_id: string;
  }[];

  const lessonCountByProgramId: Record<string, number> = {};

  for (const key of lessonKeys) {
    lessonCountByProgramId[key.program_id] =
      (lessonCountByProgramId[key.program_id] ?? 0) + 1;
  }

  return {
    ok: true,
    programs: (programResponse.data ?? []) as unknown as CurriculumProgramRow[],
    lessonCountByProgramId,
  };
}

export async function fetchProgram(
  supabase: SupabaseClient,
  programId: string,
): Promise<ProgramDetailResult> {
  const { data, error } = await supabase
    .from("curriculum_programs")
    .select(PROGRAM_COLUMNS)
    .eq("id", programId)
    .maybeSingle();

  if (error) {
    logQueryFailure("program detail", error.message);
    return { ok: false };
  }

  return {
    ok: true,
    program: (data as unknown as CurriculumProgramRow | null) ?? null,
  };
}

/**
 * 한 프로그램의 차시 목록 + 차시별 활동 수.
 *
 * 정렬은 week_no ASC → session_no ASC.
 * 활동 수도 lesson_id 컬럼만 한 번 읽어 메모리에서 센다.
 */
export async function fetchProgramLessons(
  supabase: SupabaseClient,
  programId: string,
): Promise<LessonListResult> {
  const { data, error } = await supabase
    .from("curriculum_lessons")
    .select(LESSON_COLUMNS)
    .eq("program_id", programId)
    .order("week_no", { ascending: true })
    .order("session_no", { ascending: true })
    .limit(LESSON_FETCH_LIMIT);

  if (error) {
    logQueryFailure("lessons", error.message);
    return { ok: false };
  }

  const lessons = (data ?? []) as unknown as CurriculumLessonRow[];

  if (lessons.length === 0) {
    return { ok: true, lessons, activityCountByLessonId: {} };
  }

  const { data: activityKeys, error: activityError } = await supabase
    .from("lesson_activities")
    .select("lesson_id")
    .in(
      "lesson_id",
      lessons.map((lesson) => lesson.id),
    )
    .limit(ACTIVITY_FETCH_LIMIT);

  if (activityError) {
    logQueryFailure("activity keys", activityError.message);
    return { ok: false };
  }

  const activityCountByLessonId: Record<string, number> = {};

  for (const key of (activityKeys ?? []) as unknown as { lesson_id: string }[]) {
    activityCountByLessonId[key.lesson_id] =
      (activityCountByLessonId[key.lesson_id] ?? 0) + 1;
  }

  return { ok: true, lessons, activityCountByLessonId };
}

export async function fetchLesson(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<LessonDetailResult> {
  const { data, error } = await supabase
    .from("curriculum_lessons")
    .select(LESSON_COLUMNS)
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    logQueryFailure("lesson detail", error.message);
    return { ok: false };
  }

  return {
    ok: true,
    lesson: (data as unknown as CurriculumLessonRow | null) ?? null,
  };
}

/** 한 차시의 활동 목록. 화면 정렬 기준인 sequence_no ASC로 가져온다. */
export async function fetchLessonActivities(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<ActivityListResult> {
  const { data, error } = await supabase
    .from("lesson_activities")
    .select(ACTIVITY_COLUMNS)
    .eq("lesson_id", lessonId)
    .order("sequence_no", { ascending: true })
    .limit(ACTIVITY_FETCH_LIMIT);

  if (error) {
    logQueryFailure("activities", error.message);
    return { ok: false };
  }

  return { ok: true, activities: (data ?? []) as unknown as LessonActivityRow[] };
}

// =========================================================
// 메모리 집계 (질의 추가 0회)
// =========================================================

export function buildProgramListItems(
  programs: CurriculumProgramRow[],
  lessonCountByProgramId: Record<string, number>,
): ProgramListItem[] {
  return programs.map((program) => ({
    ...program,
    lessonCount: lessonCountByProgramId[program.id] ?? 0,
  }));
}

export function buildLessonListItems(
  lessons: CurriculumLessonRow[],
  activityCountByLessonId: Record<string, number>,
): LessonListItem[] {
  return lessons.map((lesson) => ({
    ...lesson,
    activityCount: activityCountByLessonId[lesson.id] ?? 0,
  }));
}

/** 프로그램·차시 모두 status 3종이 같아 하나의 집계 함수를 공유한다 */
export function buildStatusSummary(
  rows: { status: CurriculumStatus }[],
): CurriculumStatusSummary {
  const summary: CurriculumStatusSummary = {
    total: rows.length,
    draft: 0,
    published: 0,
    archived: 0,
  };

  for (const row of rows) {
    summary[row.status] += 1;
  }

  return summary;
}
