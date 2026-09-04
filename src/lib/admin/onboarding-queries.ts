import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgeGroup, ClassStatus } from "@/types/class-child";
import type { OrganizationStatus } from "@/types/organization";

/**
 * SERVICE-17 — 새 기관 도입 화면이 읽는 현재 상태.
 *
 * ★ 온보딩 전용 표를 만들지 않는다.
 *   "어디까지 했는가"는 별도 세션 상태가 아니라 **실제로 저장된 데이터**에서 계산한다.
 *   그래서 브라우저를 닫아도, 다른 화면에서 설정해도, 여기 들어오면 이어진다.
 *
 * ★ 권한은 서버가 다시 확인한다.
 *   URL 의 organization id 를 그대로 믿지 않는다 — requireAdmin() 통과 후
 *   이 함수가 기관 행을 직접 조회해 존재를 확인하고, 없으면 null 을 돌려준다.
 *
 * ★ N+1 금지
 *   카드마다 질의하지 않는다. 기관 하나에 대해 고정 횟수(7회)만 병렬로 읽고
 *   메모리에서 단계별 상태를 만든다.
 *
 * ★ 개인정보 최소화
 *   원아는 **세기만** 한다 — 이름을 select 하지 않는다.
 *   반 · 교사는 화면에서 배정에 써야 하므로 이름/이메일 대신 표시용 최소 필드만 읽는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function logQueryFailure(scope: string, message: string) {
  console.error(`[admin/onboarding] ${scope} query failed: ${message}`);
}

export interface OnboardingClass {
  id: string;
  name: string;
  status: ClassStatus;
  ageGroup: AgeGroup | null;
  schoolYear: number;
  /** 이 반에 배정된 교사 수 */
  teacherCount: number;
  /** 이 반의 운영 중 프로그램 배정 수 */
  programCount: number;
  /** 이 반의 재원 원아 수 */
  childCount: number;
}

export interface OnboardingMember {
  /** organization_members.id — 교사 배정 폼이 요구하는 값 */
  membershipId: string;
  userId: string;
  displayName: string;
  role: "director" | "teacher";
  /** 이 교사가 담당하는 반 id */
  classIds: string[];
}

export interface OnboardingProgram {
  id: string;
  code: string;
  title: string;
}

export interface OnboardingState {
  organization: {
    id: string;
    name: string;
    status: OrganizationStatus;
    institutionType: string | null;
  };

  directors: OnboardingMember[];
  teachers: OnboardingMember[];
  classes: OnboardingClass[];
  /** 재원 원아 수 (이름은 읽지 않는다) */
  childCount: number;
  /** 운영 중 프로그램 배정 수 (운영 중인 반에 걸린 것만) */
  assignmentCount: number;
  /** 배정에 고를 수 있는 게시된 프로그램 */
  programs: OnboardingProgram[];

  /** 조회가 온전했는가. false 면 화면이 숫자를 단정하지 않는다. */
  ok: boolean;
}

const LIMIT = 500;

/**
 * 기관 하나의 도입 상태.
 *
 * 기관이 없거나 id 형식이 틀리면 null — 화면은 "기관을 찾을 수 없습니다"로 끝낸다.
 */
export async function fetchOnboardingState(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OnboardingState | null> {
  if (!UUID_PATTERN.test(organizationId)) return null;

  // ★ URL 값을 믿지 않고 서버가 직접 확인한다.
  const { data: orgRow, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, status, institution_type")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgError) {
    logQueryFailure("organization", orgError.message);
    return null;
  }

  if (!orgRow) return null;

  const org = orgRow as unknown as {
    id: string;
    name: string;
    status: OrganizationStatus;
    institution_type: string | null;
  };

  const [
    memberResult,
    profileSourceResult,
    classResult,
    childResult,
    assignmentResult,
    classTeacherResult,
    programResult,
  ] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id, user_id, role, status")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .limit(LIMIT),

    supabase
      .from("organization_members")
      .select("user_id, profiles!inner(display_name)")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .limit(LIMIT),

    supabase
      .from("classes")
      .select("id, name, status, age_group, school_year")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true })
      .limit(LIMIT),

    // ★ 이름을 읽지 않는다. 세기만 한다.
    supabase
      .from("children")
      .select("id, class_id", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .limit(LIMIT),

    supabase
      .from("class_program_assignments")
      .select("id, class_id")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .limit(LIMIT),

    supabase
      .from("class_teachers")
      .select("class_id, organization_member_id")
      .eq("organization_id", organizationId)
      .limit(LIMIT),

    supabase
      .from("curriculum_programs")
      .select("id, code, title, status")
      .eq("status", "published")
      .order("code", { ascending: true })
      .limit(LIMIT),
  ]);

  const failed =
    memberResult.error ||
    classResult.error ||
    childResult.error ||
    assignmentResult.error ||
    classTeacherResult.error ||
    programResult.error;

  if (failed) {
    logQueryFailure("onboarding state", failed.message);
  }

  const memberRows = (memberResult.data ?? []) as unknown as {
    id: string;
    user_id: string;
    role: "director" | "teacher";
  }[];

  // display_name 은 별도 join 으로 받는다. 실패해도 화면을 막지 않는다.
  const nameByUserId = new Map<string, string>();

  if (!profileSourceResult.error) {
    for (const row of (profileSourceResult.data ?? []) as unknown as {
      user_id: string;
      profiles: { display_name: string | null } | { display_name: string | null }[];
    }[]) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

      if (profile?.display_name) nameByUserId.set(row.user_id, profile.display_name);
    }
  }

  const classRows = (classResult.data ?? []) as unknown as {
    id: string;
    name: string;
    status: ClassStatus;
    age_group: AgeGroup | null;
    school_year: number;
  }[];

  const childRows = (childResult.data ?? []) as unknown as {
    id: string;
    class_id: string | null;
  }[];

  const assignmentRows = (assignmentResult.data ?? []) as unknown as {
    id: string;
    class_id: string;
  }[];

  const classTeacherRows = (classTeacherResult.data ?? []) as unknown as {
    class_id: string;
    organization_member_id: string;
  }[];

  const programRows = (programResult.data ?? []) as unknown as {
    id: string;
    code: string;
    title: string;
  }[];

  const activeClassIds = new Set(
    classRows.filter((row) => row.status === "active").map((row) => row.id),
  );

  const countIn = <T,>(rows: T[], key: (row: T) => string | null) => {
    const map = new Map<string, number>();

    for (const row of rows) {
      const id = key(row);
      if (id === null) continue;
      map.set(id, (map.get(id) ?? 0) + 1);
    }

    return map;
  };

  const teacherByClass = countIn(classTeacherRows, (row) => row.class_id);
  const programByClass = countIn(assignmentRows, (row) => row.class_id);
  const childByClass = countIn(childRows, (row) => row.class_id);

  const classIdsByMember = new Map<string, string[]>();

  for (const row of classTeacherRows) {
    const list = classIdsByMember.get(row.organization_member_id) ?? [];
    list.push(row.class_id);
    classIdsByMember.set(row.organization_member_id, list);
  }

  const members: OnboardingMember[] = memberRows.map((row) => ({
    membershipId: row.id,
    userId: row.user_id,
    displayName: nameByUserId.get(row.user_id) ?? "이름 미등록",
    role: row.role,
    classIds: classIdsByMember.get(row.id) ?? [],
  }));

  return {
    organization: {
      id: org.id,
      name: org.name,
      status: org.status,
      institutionType: org.institution_type,
    },

    directors: members.filter((m) => m.role === "director"),
    teachers: members.filter((m) => m.role === "teacher"),

    classes: classRows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      ageGroup: row.age_group,
      schoolYear: row.school_year,
      teacherCount: teacherByClass.get(row.id) ?? 0,
      programCount: programByClass.get(row.id) ?? 0,
      childCount: childByClass.get(row.id) ?? 0,
    })),

    childCount: childResult.count ?? childRows.length,
    // ★ 운영 중인 반에 걸린 배정만 센다 (SERVICE-14 와 같은 기준).
    assignmentCount: assignmentRows.filter((row) =>
      activeClassIds.has(row.class_id),
    ).length,
    programs: programRows,

    ok: !failed,
  };
}
