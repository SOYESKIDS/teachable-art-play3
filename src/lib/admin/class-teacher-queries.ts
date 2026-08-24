import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassRow } from "@/types/class-child";
import type {
  AssignedClass,
  ClassTeacherAssignment,
  TeacherAssignmentSummary,
  TeacherAssignmentViewModel,
  TeacherMemberStatus,
} from "@/types/class-teacher";

/**
 * Admin 담당 교사 배정 조회.
 *
 * organization-queries.ts / class-child-queries.ts와 동일하게
 * **로그인한 SOYES 운영자 세션의 Client로만** 질의한다. Service Role은 쓰지 않는다.
 * 어떤 행이 보이는지는 RLS
 *   "members readable by self director and soyes admin"
 *   "class teachers readable by self director and soyes admin"
 * 가 결정한다.
 *
 * N+1 방지: 교사 목록 1회 + 배정 목록 1회, 총 2회만 질의하고
 * 반 정보는 페이지가 이미 읽어 온 배열을 재사용해 메모리에서 join한다.
 */

/** 한 기관의 교사/배정 규모는 작지만, 응답이 무한정 커지지 않도록 상한을 둔다 */
const TEACHER_FETCH_LIMIT = 500;
const ASSIGNMENT_FETCH_LIMIT = 2000;

export interface TeacherMemberRow {
  membershipId: string;
  userId: string;
  displayName: string;
  status: TeacherMemberStatus;
  createdAt: string;
}

export type TeacherMemberListResult =
  | { ok: true; teachers: TeacherMemberRow[] }
  | { ok: false };

export type ClassTeacherListResult =
  | { ok: true; assignments: ClassTeacherAssignment[] }
  | { ok: false };

function logQueryFailure(scope: string, message: string) {
  console.error(`[admin/class-teacher] ${scope} query failed: ${message}`);
}

/**
 * 기관의 교사 구성원 목록.
 *
 * organization_members에는 이름이 없어 profiles를 inner join한다.
 * (fetchOrganizationDirectors와 동일한 방식 — profiles RLS가 SOYES 운영자에게 열려 있다.)
 *
 * 이메일은 auth.users에만 있고 일반 세션으로는 읽을 수 없다.
 * 교사 목록을 위해 Auth Admin(Secret Key)을 새로 끌어들이지 않고 display_name만 쓴다.
 */
export async function fetchOrganizationTeachers(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<TeacherMemberListResult> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, status, created_at, profiles!inner(display_name)")
    .eq("organization_id", organizationId)
    .eq("role", "teacher")
    .order("created_at", { ascending: true })
    .limit(TEACHER_FETCH_LIMIT);

  if (error) {
    logQueryFailure("teachers", error.message);
    return { ok: false };
  }

  type Row = {
    id: string;
    user_id: string;
    status: TeacherMemberStatus;
    created_at: string;
    profiles: { display_name: string } | { display_name: string }[] | null;
  };

  const teachers = ((data ?? []) as unknown as Row[]).map((row) => {
    // PostgREST는 관계를 객체 또는 배열로 돌려줄 수 있어 둘 다 받는다.
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    return {
      membershipId: row.id,
      userId: row.user_id,
      displayName: profile?.display_name ?? "이름 미설정",
      status: row.status,
      createdAt: row.created_at,
    };
  });

  return { ok: true, teachers };
}

/** 기관의 반-교사 배정 전체 */
export async function fetchOrganizationClassTeachers(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ClassTeacherListResult> {
  const { data, error } = await supabase
    .from("class_teachers")
    .select("id, organization_id, class_id, organization_member_id, created_at")
    .eq("organization_id", organizationId)
    .limit(ASSIGNMENT_FETCH_LIMIT);

  if (error) {
    logQueryFailure("assignments", error.message);
    return { ok: false };
  }

  return {
    ok: true,
    assignments: (data ?? []) as unknown as ClassTeacherAssignment[],
  };
}

/**
 * 교사 목록 + 배정 + 반 정보를 메모리에서 join한다.
 *
 * 정렬: 활성 교사 먼저 → 이름 오름차순.
 * (status는 'active' < 'disabled' < 'invited' 사전순이라 그대로 쓰면 순서가 어색해
 *  활성 여부를 우선 키로 명시한다.)
 */
export function buildTeacherAssignments(
  teachers: TeacherMemberRow[],
  assignments: ClassTeacherAssignment[],
  classes: ClassRow[],
): TeacherAssignmentViewModel[] {
  const classById = new Map(classes.map((classRow) => [classRow.id, classRow]));

  const assignedByMembershipId = new Map<string, AssignedClass[]>();

  for (const assignment of assignments) {
    const classRow = classById.get(assignment.class_id);

    // 반 목록 상한을 넘어 반 정보를 못 찾은 경우는 건너뛴다(화면에 빈 이름을 만들지 않는다).
    if (!classRow) continue;

    const list = assignedByMembershipId.get(assignment.organization_member_id);
    const assignedClass: AssignedClass = {
      classId: classRow.id,
      className: classRow.name,
      schoolYear: classRow.school_year,
      classStatus: classRow.status,
    };

    if (list) {
      list.push(assignedClass);
    } else {
      assignedByMembershipId.set(assignment.organization_member_id, [
        assignedClass,
      ]);
    }
  }

  // 담당 반은 운영 중 먼저, 그다음 학년도 최신순으로 보여준다.
  for (const list of assignedByMembershipId.values()) {
    list.sort((a, b) => {
      if (a.classStatus !== b.classStatus) {
        return a.classStatus === "active" ? -1 : 1;
      }
      if (a.schoolYear !== b.schoolYear) return b.schoolYear - a.schoolYear;
      return a.className.localeCompare(b.className, "ko");
    });
  }

  return teachers
    .map((teacher) => ({
      membershipId: teacher.membershipId,
      userId: teacher.userId,
      displayName: teacher.displayName,
      membershipStatus: teacher.status,
      assignedClasses: assignedByMembershipId.get(teacher.membershipId) ?? [],
    }))
    .sort((a, b) => {
      const aActive = a.membershipStatus === "active";
      const bActive = b.membershipStatus === "active";

      if (aActive !== bActive) return aActive ? -1 : 1;

      return a.displayName.localeCompare(b.displayName, "ko");
    });
}

export function buildTeacherSummary(
  viewModels: TeacherAssignmentViewModel[],
): TeacherAssignmentSummary {
  let active = 0;
  let assigned = 0;

  for (const teacher of viewModels) {
    if (teacher.membershipStatus !== "active") continue;

    active += 1;
    if (teacher.assignedClasses.length > 0) assigned += 1;
  }

  return {
    total: viewModels.length,
    active,
    assigned,
    unassigned: active - assigned,
  };
}

/**
 * 반 목록에 담당 교사를 함께 보여주기 위한 역방향 색인.
 * 반마다 질의하지 않고 이미 읽어 온 두 배열로 만든다.
 */
export function buildTeacherNamesByClassId(
  assignments: ClassTeacherAssignment[],
  teachers: TeacherMemberRow[],
): Record<string, string[]> {
  const nameByMembershipId = new Map(
    teachers.map((teacher) => [teacher.membershipId, teacher.displayName]),
  );

  const namesByClassId: Record<string, string[]> = {};

  for (const assignment of assignments) {
    const name = nameByMembershipId.get(assignment.organization_member_id);

    if (!name) continue;

    (namesByClassId[assignment.class_id] ??= []).push(name);
  }

  for (const names of Object.values(namesByClassId)) {
    names.sort((a, b) => a.localeCompare(b, "ko"));
  }

  return namesByClassId;
}
