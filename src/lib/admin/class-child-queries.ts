import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChildListItem,
  ChildRow,
  ChildSummary,
  ClassListItem,
  ClassRow,
  ClassSummary,
} from "@/types/class-child";

/**
 * Admin 반 / 원아 조회.
 *
 * organization-queries.ts와 동일하게 **로그인한 SOYES 운영자 세션의 Client로만** 질의한다.
 * Service Role(Secret Key)은 쓰지 않는다.
 * 어떤 행이 보이는지는 RLS
 *   "classes readable by org staff and soyes admin"
 *   "children readable by org staff and soyes admin"
 * 가 결정한다.
 */

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

const CHILD_COLUMNS = [
  "id",
  "organization_id",
  "class_id",
  "name",
  "birth_year",
  "status",
  "created_at",
  "updated_at",
].join(", ");

/**
 * 기관당 반은 수십, 원아는 수백 규모라 페이지네이션 없이 한 번에 가져온다.
 * 다만 예상 밖으로 커졌을 때 응답이 무한정 커지지 않도록 상한을 둔다.
 * 상한에 도달하면 화면에서 안내하고, 그때 페이지네이션을 도입한다.
 */
const CLASS_FETCH_LIMIT = 500;
const CHILD_FETCH_LIMIT = 2000;

export type ClassListResult =
  | { ok: true; classes: ClassRow[]; reachedLimit: boolean }
  | { ok: false };

export type ChildListResult =
  | { ok: true; children: ChildRow[]; reachedLimit: boolean }
  | { ok: false };

/** Supabase 내부 에러는 서버 로그에만 남기고 화면에는 전달하지 않는다 */
function logQueryFailure(scope: string, message: string) {
  console.error(`[admin/class-child] ${scope} query failed: ${message}`);
}

/**
 * 반 목록.
 * 정렬: 운영 중(active) 먼저 → 학년도 최신순 → 이름 오름차순.
 * status는 'active' < 'archived' 사전순이라 오름차순 정렬이 곧 "활성 먼저"가 된다.
 */
export async function fetchOrganizationClasses(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ClassListResult> {
  const { data, error } = await supabase
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("organization_id", organizationId)
    .order("status", { ascending: true })
    .order("school_year", { ascending: false })
    .order("name", { ascending: true })
    .limit(CLASS_FETCH_LIMIT);

  if (error) {
    logQueryFailure("classes", error.message);
    return { ok: false };
  }

  const classes = (data ?? []) as unknown as ClassRow[];

  return {
    ok: true,
    classes,
    reachedLimit: classes.length >= CLASS_FETCH_LIMIT,
  };
}

/**
 * 원아 목록.
 * 정렬: 재원(active) 먼저 → 이름 오름차순.
 * status는 'active' < 'graduated' < 'inactive' 사전순이라 활성이 먼저 온다.
 */
export async function fetchOrganizationChildren(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ChildListResult> {
  const { data, error } = await supabase
    .from("children")
    .select(CHILD_COLUMNS)
    .eq("organization_id", organizationId)
    .order("status", { ascending: true })
    .order("name", { ascending: true })
    .limit(CHILD_FETCH_LIMIT);

  if (error) {
    logQueryFailure("children", error.message);
    return { ok: false };
  }

  const children = (data ?? []) as unknown as ChildRow[];

  return {
    ok: true,
    children,
    reachedLimit: children.length >= CHILD_FETCH_LIMIT,
  };
}

/**
 * 반별 현재 재원 원아 수를 이미 읽어온 children 배열에서 계산한다.
 *
 * 반마다 count 질의를 날리면 N+1이 된다. 원아 목록은 어차피 화면에 필요하므로
 * 그 배열을 한 번 순회해 Map으로 집계한다(질의 추가 0회).
 */
export function buildClassListItems(
  classes: ClassRow[],
  children: ChildRow[],
): ClassListItem[] {
  const activeCountByClassId = new Map<string, number>();

  for (const child of children) {
    if (child.class_id === null || child.status !== "active") continue;

    activeCountByClassId.set(
      child.class_id,
      (activeCountByClassId.get(child.class_id) ?? 0) + 1,
    );
  }

  return classes.map((classRow) => ({
    ...classRow,
    activeChildCount: activeCountByClassId.get(classRow.id) ?? 0,
  }));
}

/** 원아의 class_id를 사람이 읽을 수 있는 반 이름으로 풀어 준다 */
export function buildChildListItems(
  children: ChildRow[],
  classes: ClassRow[],
): ChildListItem[] {
  const classById = new Map(classes.map((classRow) => [classRow.id, classRow]));

  return children.map((child) => {
    const classRow = child.class_id ? classById.get(child.class_id) : undefined;

    return {
      ...child,
      className: classRow?.name ?? null,
      classStatus: classRow?.status ?? null,
    };
  });
}

export function buildClassSummary(classes: ClassRow[]): ClassSummary {
  let active = 0;

  for (const classRow of classes) {
    if (classRow.status === "active") active += 1;
  }

  return { total: classes.length, active, archived: classes.length - active };
}

export function buildChildSummary(children: ChildRow[]): ChildSummary {
  const summary: ChildSummary = {
    total: children.length,
    active: 0,
    inactive: 0,
    graduated: 0,
    unassigned: 0,
  };

  for (const child of children) {
    summary[child.status] += 1;
    if (child.class_id === null) summary.unassigned += 1;
  }

  return summary;
}
