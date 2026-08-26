import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassRow } from "@/types/class-child";
import type { ClassProgramAssignmentRow } from "@/types/class-program";
import type { ClassSessionRow } from "@/types/class-session";
import type { CurriculumLessonRow, CurriculumProgramRow } from "@/types/curriculum";
import type {
  ClassFilterOption,
  SessionHistorySummary,
  StaffSessionItem,
  TodaySessionBoard,
  TodaySessionSummary,
} from "@/types/staff-session";

/**
 * 원장/교사 수업 운영 조회 (SERVICE-06C-B).
 *
 * ★ 권한 범위를 코드가 아니라 RLS가 정한다.
 *   organization_id로만 좁혀 질의하면
 *     - 원장은 그 기관의 모든 반/수업
 *     - 교사는 자기가 배정된 반의 수업만
 *   이 자동으로 걸러진다(20260826 class_sessions SELECT Policy).
 *   "교사가 담당한 반 id 목록"을 따로 계산해 where에 넣지 않는 이유가 이것이다.
 *   애플리케이션이 범위를 다시 계산하면 RLS와 어긋날 여지가 생긴다.
 *
 * ★ N+1 방지
 *   수업 1회 → 필요한 반/배정/프로그램/차시를 각각 1회씩 일괄 조회 → 메모리 join.
 *   수업이 몇 건이든 질의 횟수는 고정 5회다.
 *
 * ★ 이력 표시는 status로 거르지 않는다.
 *   보관된 반·종료된 배정·archived 프로그램/차시의 이름도 그대로 보여야 한다.
 *   20260827이 그 SELECT를 열어 두었으므로 여기서는 id로만 조회한다.
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

const SESSION_FETCH_LIMIT = 2000;
const LOOKUP_FETCH_LIMIT = 2000;

export type StaffSessionListResult =
  | { ok: true; sessions: StaffSessionItem[]; classes: ClassRow[] }
  | { ok: false };

function logQueryFailure(scope: string, message: string) {
  console.error(`[staff/class-session] ${scope} query failed: ${message}`);
}

/** "오늘"을 한국 시간 기준 YYYY-MM-DD로 만든다. date 컬럼과 같은 형식이다. */
export function todayInSeoul(): string {
  // en-CA 로케일이 YYYY-MM-DD를 그대로 준다. new Date()를 문자열로 자르면
  // 서버 시간대(UTC)로 계산돼 한국 자정 직후 하루가 밀린다.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

/**
 * 수업 행에 반·배정·프로그램·차시 이름을 붙인다.
 * 질의 4회(각 테이블 1회)만 추가로 사용한다.
 */
async function attachMetadata(
  supabase: SupabaseClient,
  sessions: ClassSessionRow[],
  classes: ClassRow[],
): Promise<StaffSessionItem[] | null> {
  if (sessions.length === 0) return [];

  const assignmentIds = unique(sessions.map((s) => s.class_program_assignment_id));
  const programIds = unique(sessions.map((s) => s.program_id));
  const lessonIds = unique(sessions.map((s) => s.lesson_id));

  const [assignmentResult, programResult, lessonResult] = await Promise.all([
    supabase
      .from("class_program_assignments")
      .select("id, status")
      .in("id", assignmentIds)
      .limit(LOOKUP_FETCH_LIMIT),
    supabase
      .from("curriculum_programs")
      .select("id, code, title, status")
      .in("id", programIds)
      .limit(LOOKUP_FETCH_LIMIT),
    supabase
      .from("curriculum_lessons")
      .select("id, week_no, session_no, title, status")
      .in("id", lessonIds)
      .limit(LOOKUP_FETCH_LIMIT),
  ]);

  if (assignmentResult.error) {
    logQueryFailure("assignments", assignmentResult.error.message);
    return null;
  }
  if (programResult.error) {
    logQueryFailure("programs", programResult.error.message);
    return null;
  }
  if (lessonResult.error) {
    logQueryFailure("lessons", lessonResult.error.message);
    return null;
  }

  const classById = new Map(classes.map((row) => [row.id, row]));
  const assignmentById = new Map(
    ((assignmentResult.data ?? []) as unknown as Pick<
      ClassProgramAssignmentRow,
      "id" | "status"
    >[]).map((row) => [row.id, row]),
  );
  const programById = new Map(
    ((programResult.data ?? []) as unknown as Pick<
      CurriculumProgramRow,
      "id" | "code" | "title" | "status"
    >[]).map((row) => [row.id, row]),
  );
  const lessonById = new Map(
    ((lessonResult.data ?? []) as unknown as Pick<
      CurriculumLessonRow,
      "id" | "week_no" | "session_no" | "title" | "status"
    >[]).map((row) => [row.id, row]),
  );

  return sessions.map((session) => {
    const classRow = classById.get(session.class_id);
    const assignment = assignmentById.get(session.class_program_assignment_id);
    const program = programById.get(session.program_id);
    const lesson = lessonById.get(session.lesson_id);

    return {
      ...session,
      className: classRow?.name ?? null,
      classAgeGroup: classRow?.age_group ?? null,
      classStatus: classRow?.status ?? null,
      programTitle: program?.title ?? null,
      programCode: program?.code ?? null,
      programStatus: program?.status ?? null,
      weekNo: lesson?.week_no ?? null,
      sessionNo: lesson?.session_no ?? null,
      lessonTitle: lesson?.title ?? null,
      lessonStatus: lesson?.status ?? null,
      assignmentStatus: assignment?.status ?? null,
      // 20260826의 enforce_class_session_update와 같은 기준.
      // 하나라도 어긋나면 "수업 시작"은 막고 완료/취소만 남긴다.
      parentsActive:
        assignment?.status === "active" &&
        classRow?.status === "active" &&
        program?.status === "published" &&
        lesson?.status === "published",
    };
  });
}

/** 이 기관에서 내가 볼 수 있는 반 (원장=전체 / 교사=배정된 반. RLS가 결정한다) */
async function fetchVisibleClasses(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ClassRow[] | null> {
  const { data, error } = await supabase
    .from("classes")
    .select("id, organization_id, name, age_group, school_year, status, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })
    .limit(LOOKUP_FETCH_LIMIT);

  if (error) {
    logQueryFailure("classes", error.message);
    return null;
  }

  return (data ?? []) as unknown as ClassRow[];
}

/**
 * 오늘의 운영 화면에 필요한 수업.
 *
 * 오늘 날짜 수업만 가져오면 "어제 잡고 아직 안 한 수업"과 "진행 중인데 날짜가 다른 수업"을
 * 놓친다. 그래서 아직 끝나지 않은 수업(scheduled/in_progress) 전체와
 * 오늘 날짜 수업을 함께 가져와 메모리에서 갈래를 나눈다.
 * 아직 끝나지 않은 수업은 반당 프로그램 차시 수 규모라 양이 작다.
 */
export async function fetchTodayBoard(
  supabase: SupabaseClient,
  organizationId: string,
  today: string,
): Promise<{ ok: true; board: TodaySessionBoard } | { ok: false }> {
  const classes = await fetchVisibleClasses(supabase, organizationId);

  if (classes === null) return { ok: false };

  const { data, error } = await supabase
    .from("class_sessions")
    .select(SESSION_COLUMNS)
    .eq("organization_id", organizationId)
    .or(`scheduled_date.eq.${today},status.in.(scheduled,in_progress)`)
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .limit(SESSION_FETCH_LIMIT);

  if (error) {
    logQueryFailure("today sessions", error.message);
    return { ok: false };
  }

  const rows = (data ?? []) as unknown as ClassSessionRow[];
  const items = await attachMetadata(supabase, rows, classes);

  if (items === null) return { ok: false };

  const summary: TodaySessionSummary = {
    scheduledToday: 0,
    inProgress: 0,
    completedToday: 0,
    cancelledToday: 0,
  };

  const todaySessions: StaffSessionItem[] = [];
  const ongoingFromOtherDays: StaffSessionItem[] = [];
  const overdueSessions: StaffSessionItem[] = [];
  const undatedSessions: StaffSessionItem[] = [];

  for (const item of items) {
    const isToday = item.scheduled_date === today;

    if (item.status === "in_progress") summary.inProgress += 1;
    if (isToday && item.status === "scheduled") summary.scheduledToday += 1;
    if (isToday && item.status === "completed") summary.completedToday += 1;
    if (isToday && item.status === "cancelled") summary.cancelledToday += 1;

    if (isToday) {
      todaySessions.push(item);
    } else if (item.status === "in_progress") {
      ongoingFromOtherDays.push(item);
    } else if (item.status === "scheduled" && item.scheduled_date === null) {
      undatedSessions.push(item);
    } else if (item.status === "scheduled" && (item.scheduled_date ?? "") < today) {
      overdueSessions.push(item);
    }
    // 미래 예정 수업은 오늘 화면에 넣지 않는다. 이력 화면에서 본다.
  }

  return {
    ok: true,
    board: {
      today,
      summary,
      todaySessions: sortForBoard(todaySessions),
      ongoingFromOtherDays: sortForBoard(ongoingFromOtherDays),
      overdueSessions: sortForBoard(overdueSessions),
      undatedSessions: sortForBoard(undatedSessions),
    },
  };
}

const BOARD_STATUS_RANK: Record<string, number> = {
  in_progress: 0,
  scheduled: 1,
  completed: 2,
  cancelled: 3,
};

/** 진행 중 → 예정 → 완료 → 취소, 그 안에서는 반 이름·주차 순 */
function sortForBoard(items: StaffSessionItem[]): StaffSessionItem[] {
  return [...items].sort((a, b) => {
    const rank = BOARD_STATUS_RANK[a.status] - BOARD_STATUS_RANK[b.status];
    if (rank !== 0) return rank;

    const name = (a.className ?? "").localeCompare(b.className ?? "", "ko");
    if (name !== 0) return name;

    return (a.weekNo ?? 0) - (b.weekNo ?? 0) || (a.sessionNo ?? 0) - (b.sessionNo ?? 0);
  });
}

/** 수업 이력 — 이 기관에서 내가 볼 수 있는 모든 수업 */
export async function fetchSessionHistory(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<StaffSessionListResult> {
  const classes = await fetchVisibleClasses(supabase, organizationId);

  if (classes === null) return { ok: false };

  const { data, error } = await supabase
    .from("class_sessions")
    .select(SESSION_COLUMNS)
    .eq("organization_id", organizationId)
    .order("scheduled_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(SESSION_FETCH_LIMIT);

  if (error) {
    logQueryFailure("history sessions", error.message);
    return { ok: false };
  }

  const rows = (data ?? []) as unknown as ClassSessionRow[];
  const sessions = await attachMetadata(supabase, rows, classes);

  if (sessions === null) return { ok: false };

  return { ok: true, sessions, classes };
}

export function buildHistorySummary(
  sessions: StaffSessionItem[],
): SessionHistorySummary {
  const summary: SessionHistorySummary = {
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

/** 이력 화면의 반 필터 선택지 — 수업이 하나라도 있는 반만 (추가 질의 없음) */
export function buildClassFilterOptions(
  classes: ClassRow[],
  sessions: StaffSessionItem[],
): ClassFilterOption[] {
  const usedClassIds = new Set(sessions.map((session) => session.class_id));

  return classes
    .filter((classRow) => usedClassIds.has(classRow.id))
    .map((classRow) => ({
      id: classRow.id,
      name: classRow.name,
      status: classRow.status,
    }));
}
