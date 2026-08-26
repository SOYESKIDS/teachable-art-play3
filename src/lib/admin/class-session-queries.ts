import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassRow } from "@/types/class-child";
import type { ClassProgramAssignmentRow } from "@/types/class-program";
import type {
  ClassSessionItem,
  ClassSessionRow,
  ClassSessionSummary,
  SchedulableLessonOption,
} from "@/types/class-session";
import type { CurriculumLessonRow } from "@/types/curriculum";

/**
 * Admin 수업 실행(class_sessions) 조회.
 *
 * 기존 admin query 모듈과 동일하게 **로그인한 SOYES 운영자 세션의 Client로만** 질의한다.
 * Service Role은 쓰지 않는다. 어떤 행이 보이는지는 RLS
 *   "class sessions readable by org staff and soyes admin"
 * 가 결정한다.
 *
 * ★ N+1 방지
 *   수업 목록 1회 + 그 프로그램의 차시 전체 1회만 읽고 나머지는 메모리에서 join한다.
 *   수업 행마다 차시를 개별 조회하지 않는다.
 *
 * ★ 이력용 차시와 후보용 차시를 한 질의로 처리한다
 *   차시를 status='published'로 걸러서 읽으면 draft/archived 차시에 붙은 과거 수업의
 *   차시명이 사라진다. 그래서 프로그램의 차시를 전부 읽고
 *   "후보"만 메모리에서 published로 좁힌다. (수업의 차시는 복합 FK 때문에
 *    반드시 이 프로그램의 차시라 이 한 질의로 전부 덮인다.)
 */

const SESSION_COLUMNS = [
  "id",
  "organization_id",
  "class_id",
  "class_program_assignment_id",
  "program_id",
  "lesson_id",
  "scheduled_date",
  "status",
  "created_at",
  "updated_at",
].join(", ");

const ASSIGNMENT_COLUMNS = [
  "id",
  "organization_id",
  "class_id",
  "program_id",
  "start_date",
  "status",
  "created_at",
  "updated_at",
].join(", ");

const CLASS_COLUMNS = [
  "id",
  "organization_id",
  "name",
  "age_group",
  "school_year",
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

const SESSION_FETCH_LIMIT = 2000;
const LESSON_FETCH_LIMIT = 2000;

export type ClassProgramAssignmentDetailResult =
  | { ok: true; assignment: ClassProgramAssignmentRow | null }
  | { ok: false };

export type ClassDetailResult =
  | { ok: true; classRow: ClassRow | null }
  | { ok: false };

export type ClassSessionListResult =
  | { ok: true; sessions: ClassSessionRow[] }
  | { ok: false };

export type ProgramLessonListResult =
  | { ok: true; lessons: CurriculumLessonRow[] }
  | { ok: false };

function logQueryFailure(scope: string, message: string) {
  console.error(`[admin/class-session] ${scope} query failed: ${message}`);
}

/** 배정 1건. 기관 일치 확인은 호출부(page/Action)가 한다. */
export async function fetchClassProgramAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<ClassProgramAssignmentDetailResult> {
  const { data, error } = await supabase
    .from("class_program_assignments")
    .select(ASSIGNMENT_COLUMNS)
    .eq("id", assignmentId)
    .maybeSingle();

  if (error) {
    logQueryFailure("assignment detail", error.message);
    return { ok: false };
  }

  return {
    ok: true,
    assignment: (data as unknown as ClassProgramAssignmentRow | null) ?? null,
  };
}

/** 반 1건. 배정이 가리키는 반의 이름·상태를 Header와 검증에 쓴다. */
export async function fetchClassById(
  supabase: SupabaseClient,
  classId: string,
): Promise<ClassDetailResult> {
  const { data, error } = await supabase
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    logQueryFailure("class detail", error.message);
    return { ok: false };
  }

  return { ok: true, classRow: (data as unknown as ClassRow | null) ?? null };
}

/** 이 배정의 수업 전체(예정 + 진행 중 + 완료 + 취소). 과거 이력을 숨기지 않는다. */
export async function fetchAssignmentClassSessions(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<ClassSessionListResult> {
  const { data, error } = await supabase
    .from("class_sessions")
    .select(SESSION_COLUMNS)
    .eq("class_program_assignment_id", assignmentId)
    .order("created_at", { ascending: false })
    .limit(SESSION_FETCH_LIMIT);

  if (error) {
    logQueryFailure("sessions", error.message);
    return { ok: false };
  }

  return {
    ok: true,
    sessions: (data ?? []) as unknown as ClassSessionRow[],
  };
}

/**
 * 이 프로그램의 차시 전체.
 *
 * status로 거르지 않는다. 두 용도를 한 질의로 처리하기 위해서다.
 *   1. 기존 수업의 주차/차시/차시명 표시 — 지금은 draft/archived일 수 있다.
 *   2. 신규 일정 등록 후보 — 이 배열에서 published만 걸러 쓴다.
 */
export async function fetchProgramLessonsForSessions(
  supabase: SupabaseClient,
  programId: string,
): Promise<ProgramLessonListResult> {
  const { data, error } = await supabase
    .from("curriculum_lessons")
    .select(LESSON_COLUMNS)
    .eq("program_id", programId)
    .order("week_no", { ascending: true })
    .order("session_no", { ascending: true })
    .limit(LESSON_FETCH_LIMIT);

  if (error) {
    logQueryFailure("program lessons", error.message);
    return { ok: false };
  }

  return {
    ok: true,
    lessons: (data ?? []) as unknown as CurriculumLessonRow[],
  };
}

// =========================================================
// 메모리 집계 (질의 추가 0회)
// =========================================================

const STATUS_RANK: Record<string, number> = {
  scheduled: 0,
  in_progress: 1,
  completed: 2,
  cancelled: 3,
};

/**
 * 수업 + 차시를 메모리에서 join한다.
 * 정렬: 예정 → 진행 중 → 완료 → 취소, 그 안에서는 주차·차시 순.
 */
export function buildClassSessionItems(
  sessions: ClassSessionRow[],
  lessons: CurriculumLessonRow[],
): ClassSessionItem[] {
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));

  return sessions
    .map((session) => {
      const lesson = lessonById.get(session.lesson_id);

      return {
        ...session,
        weekNo: lesson?.week_no ?? null,
        sessionNo: lesson?.session_no ?? null,
        lessonTitle: lesson?.title ?? null,
        lessonStatus: lesson?.status ?? null,
      };
    })
    .sort((a, b) => {
      const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (rank !== 0) return rank;

      const week = (a.weekNo ?? 0) - (b.weekNo ?? 0);
      if (week !== 0) return week;

      const order = (a.sessionNo ?? 0) - (b.sessionNo ?? 0);
      if (order !== 0) return order;

      // created_at은 ISO 문자열이라 사전순 비교가 곧 시간순 비교다.
      return b.created_at.localeCompare(a.created_at);
    });
}

export function buildClassSessionSummary(
  sessions: ClassSessionRow[],
): ClassSessionSummary {
  const summary: ClassSessionSummary = {
    total: sessions.length,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const session of sessions) {
    if (session.status === "scheduled") summary.scheduled += 1;
    else if (session.status === "in_progress") summary.inProgress += 1;
    else if (session.status === "completed") summary.completed += 1;
    else summary.cancelled += 1;
  }

  return summary;
}

/**
 * 신규 일정 등록 후보 차시.
 *
 * published 차시 중, 이 배정에서 이미 열려 있는(예정·진행 중) 차시를 뺀다.
 * 완료·취소 이력만 있는 차시는 다시 후보에 나온다 — 보충수업을 위해서다.
 * (Client 필터는 편의일 뿐이고, 중복 판정은 Server Action과 partial unique가 한다.)
 */
export function buildSchedulableLessons(
  lessons: CurriculumLessonRow[],
  sessions: ClassSessionRow[],
): SchedulableLessonOption[] {
  const openLessonIds = new Set(
    sessions
      .filter(
        (session) =>
          session.status === "scheduled" || session.status === "in_progress",
      )
      .map((session) => session.lesson_id),
  );

  return lessons
    .filter(
      (lesson) => lesson.status === "published" && !openLessonIds.has(lesson.id),
    )
    .map((lesson) => ({
      id: lesson.id,
      weekNo: lesson.week_no,
      sessionNo: lesson.session_no,
      title: lesson.title,
    }));
}

/** 이 프로그램에 게시된 차시가 하나라도 있는가 (Empty state 문구 분기용) */
export function hasPublishedLesson(lessons: CurriculumLessonRow[]): boolean {
  return lessons.some((lesson) => lesson.status === "published");
}
