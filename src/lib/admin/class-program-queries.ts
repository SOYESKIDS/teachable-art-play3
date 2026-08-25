import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassRow } from "@/types/class-child";
import type {
  AssignableClassOption,
  AssignableProgramOption,
  ClassProgramAssignmentItem,
  ClassProgramAssignmentRow,
  ClassProgramSummary,
} from "@/types/class-program";
import type { CurriculumProgramRow } from "@/types/curriculum";

/**
 * Admin 반-프로그램 배정 조회.
 *
 * 기존 admin query 모듈과 동일하게 **로그인한 SOYES 운영자 세션의 Client로만** 질의한다.
 * Service Role은 쓰지 않는다. 어떤 행이 보이는지는 RLS
 *   "class program assignments readable by org staff and soyes admin"
 *   "curriculum programs readable by soyes admin and org members"
 * 가 결정한다.
 *
 * ★ N+1 방지
 *   배정 목록 1회 + 프로그램 목록 1회만 읽고 나머지는 메모리에서 join한다.
 *   반 정보는 페이지가 이미 읽어 온 배열을 재사용한다(추가 질의 0회).
 */

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

const ASSIGNMENT_FETCH_LIMIT = 2000;
const PROGRAM_FETCH_LIMIT = 500;

export type ClassProgramAssignmentListResult =
  | { ok: true; assignments: ClassProgramAssignmentRow[] }
  | { ok: false };

export type CurriculumProgramLookupResult =
  | { ok: true; programs: CurriculumProgramRow[] }
  | { ok: false };

function logQueryFailure(scope: string, message: string) {
  console.error(`[admin/class-program] ${scope} query failed: ${message}`);
}

/** 이 기관의 배정 전체(운영 중 + 완료 + 취소). 과거 이력을 숨기지 않는다. */
export async function fetchClassProgramAssignments(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ClassProgramAssignmentListResult> {
  const { data, error } = await supabase
    .from("class_program_assignments")
    .select(ASSIGNMENT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(ASSIGNMENT_FETCH_LIMIT);

  if (error) {
    logQueryFailure("assignments", error.message);
    return { ok: false };
  }

  return {
    ok: true,
    assignments: (data ?? []) as unknown as ClassProgramAssignmentRow[],
  };
}

/**
 * 커리큘럼 프로그램 전체.
 *
 * status로 거르지 않고 전부 읽는다. 두 가지 용도를 한 질의로 처리하기 위해서다.
 *   1. 기존 배정의 프로그램명/코드 표시 — 배정 당시 published였어도 지금은 archived일 수 있다.
 *   2. 신규 배정 후보 — 이 배열에서 published만 걸러 쓴다.
 * SOYES 운영자는 RLS상 draft/archived도 볼 수 있어 이 방식이 가능하다.
 */
export async function fetchAllCurriculumPrograms(
  supabase: SupabaseClient,
): Promise<CurriculumProgramLookupResult> {
  const { data, error } = await supabase
    .from("curriculum_programs")
    .select(PROGRAM_COLUMNS)
    .order("code", { ascending: true })
    .limit(PROGRAM_FETCH_LIMIT);

  if (error) {
    logQueryFailure("programs", error.message);
    return { ok: false };
  }

  return {
    ok: true,
    programs: (data ?? []) as unknown as CurriculumProgramRow[],
  };
}

// =========================================================
// 메모리 집계 (질의 추가 0회)
// =========================================================

const STATUS_RANK: Record<string, number> = {
  active: 0,
  completed: 1,
  cancelled: 2,
};

/**
 * 배정 + 반 + 프로그램을 메모리에서 join한다.
 * 정렬: 운영 중 먼저 → 그 안에서 최근 등록순.
 */
export function buildAssignmentItems(
  assignments: ClassProgramAssignmentRow[],
  classes: ClassRow[],
  programs: CurriculumProgramRow[],
): ClassProgramAssignmentItem[] {
  const classById = new Map(classes.map((row) => [row.id, row]));
  const programById = new Map(programs.map((row) => [row.id, row]));

  return assignments
    .map((assignment) => {
      const classRow = classById.get(assignment.class_id);
      const program = programById.get(assignment.program_id);

      return {
        ...assignment,
        className: classRow?.name ?? null,
        classStatus: classRow?.status ?? null,
        programCode: program?.code ?? null,
        programTitle: program?.title ?? null,
        programStatus: program?.status ?? null,
      };
    })
    .sort((a, b) => {
      const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (rank !== 0) return rank;

      // created_at은 ISO 문자열이라 사전순 비교가 곧 시간순 비교다.
      return b.created_at.localeCompare(a.created_at);
    });
}

export function buildAssignmentSummary(
  assignments: ClassProgramAssignmentRow[],
  classes: ClassRow[],
): ClassProgramSummary {
  const summary: ClassProgramSummary = {
    active: 0,
    completed: 0,
    cancelled: 0,
    unassignedActiveClasses: 0,
  };

  const classIdsWithActive = new Set<string>();

  for (const assignment of assignments) {
    summary[assignment.status] += 1;

    if (assignment.status === "active") {
      classIdsWithActive.add(assignment.class_id);
    }
  }

  // 미배정 반은 "운영 중인 반" 기준이다. 보관된 반은 애초에 배정 대상이 아니라 세지 않는다.
  for (const classRow of classes) {
    if (classRow.status !== "active") continue;
    if (!classIdsWithActive.has(classRow.id)) {
      summary.unassignedActiveClasses += 1;
    }
  }

  return summary;
}

/**
 * 배정 Dialog의 반 후보.
 * 운영 중인 반만 포함하고, 각 반이 이미 운영 중인 프로그램 id를 함께 담는다
 * (Dialog에서 중복 후보를 걸러내는 데 쓴다).
 */
export function buildAssignableClasses(
  classes: ClassRow[],
  assignments: ClassProgramAssignmentRow[],
): AssignableClassOption[] {
  const activeProgramsByClassId = new Map<string, string[]>();

  for (const assignment of assignments) {
    if (assignment.status !== "active") continue;

    const list = activeProgramsByClassId.get(assignment.class_id);

    if (list) list.push(assignment.program_id);
    else activeProgramsByClassId.set(assignment.class_id, [assignment.program_id]);
  }

  return classes
    .filter((classRow) => classRow.status === "active")
    .map((classRow) => ({
      id: classRow.id,
      name: classRow.name,
      ageGroup: classRow.age_group,
      schoolYear: classRow.school_year,
      activeProgramIds: activeProgramsByClassId.get(classRow.id) ?? [],
    }));
}

/** 배정 Dialog의 프로그램 후보 — 게시된 프로그램만 */
export function buildAssignablePrograms(
  programs: CurriculumProgramRow[],
): AssignableProgramOption[] {
  return programs
    .filter((program) => program.status === "published")
    .map((program) => ({
      id: program.id,
      code: program.code,
      title: program.title,
      durationWeeks: program.duration_weeks,
      ageGroup: program.age_group,
    }));
}

/** 반 관리 표에 곁들일 "반별 운영 중 프로그램 수" — 추가 질의 없이 계산한다 */
export function buildActiveProgramCountByClassId(
  assignments: ClassProgramAssignmentRow[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const assignment of assignments) {
    if (assignment.status !== "active") continue;

    counts[assignment.class_id] = (counts[assignment.class_id] ?? 0) + 1;
  }

  return counts;
}
