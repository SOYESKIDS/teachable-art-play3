import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationRow } from "@/types/organization";
import {
  ORGANIZATION_PAGE_SIZE,
  type OrganizationListFilters,
} from "./organization-filters";

/**
 * Admin Organization 조회.
 *
 * 로그인한 SOYES 운영자 세션의 Client로만 질의한다. Service Role은 쓰지 않는다.
 * 어떤 행이 보이는지는 RLS("organizations readable by members and soyes admin")가 결정한다.
 */

const ORGANIZATION_TABLE = "organizations";

const ORGANIZATION_COLUMNS = [
  "id",
  "name",
  "institution_type",
  "status",
  "created_at",
  "updated_at",
].join(", ");

/**
 * 필터 체인에 필요한 메서드만 구조적으로 기술한다.
 * postgrest-js Builder 제네릭을 직접 다루면 타입 인스턴스화가 너무 깊어진다(TS2589).
 */
interface FilterableQuery {
  eq(column: string, value: string): FilterableQuery;
  ilike(column: string, pattern: string): FilterableQuery;
}

export interface OrganizationKpis {
  total: number;
  active: number;
  suspended: number;
}

export type OrganizationListResult =
  | {
      ok: true;
      rows: OrganizationRow[];
      total: number;
      page: number;
      pageCount: number;
    }
  | { ok: false };

export type OrganizationKpiResult =
  | { ok: true; kpis: OrganizationKpis }
  | { ok: false };

export type OrganizationDetailResult =
  | { ok: true; organization: OrganizationRow | null }
  | { ok: false };

/** Supabase 내부 에러는 서버 로그에만 남기고 화면에는 전달하지 않는다 */
function logQueryFailure(scope: string, message: string) {
  console.error(`[admin/organizations] ${scope} query failed: ${message}`);
}

function applyFilters<Q>(query: Q, filters: OrganizationListFilters): Q {
  let next = query as unknown as FilterableQuery;

  if (filters.status !== "all") {
    next = next.eq("status", filters.status);
  }

  if (filters.q) {
    // 단일 컬럼 검색이라 or() 없이 ilike만 쓴다. 값은 parse 단계에서 이미 정제되어 있다.
    next = next.ilike("name", `%${filters.q}%`);
  }

  return next as unknown as Q;
}

export async function fetchOrganizationList(
  supabase: SupabaseClient,
  filters: OrganizationListFilters,
): Promise<OrganizationListResult> {
  const { count, error: countError } = await applyFilters(
    supabase.from(ORGANIZATION_TABLE).select("id", { count: "exact", head: true }),
    filters,
  );

  if (countError) {
    logQueryFailure("count", countError.message);
    return { ok: false };
  }

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / ORGANIZATION_PAGE_SIZE));
  const page = Math.min(Math.max(filters.page, 1), pageCount);

  if (total === 0) {
    return { ok: true, rows: [], total, page: 1, pageCount: 1 };
  }

  const from = (page - 1) * ORGANIZATION_PAGE_SIZE;

  const { data, error } = await applyFilters(
    supabase.from(ORGANIZATION_TABLE).select(ORGANIZATION_COLUMNS),
    filters,
  )
    .order("created_at", { ascending: false })
    .range(from, from + ORGANIZATION_PAGE_SIZE - 1);

  if (error) {
    logQueryFailure("list", error.message);
    return { ok: false };
  }

  return {
    ok: true,
    rows: (data ?? []) as unknown as OrganizationRow[],
    total,
    page,
    pageCount,
  };
}

async function countBy(
  supabase: SupabaseClient,
  status?: string,
): Promise<number | null> {
  let query = supabase
    .from(ORGANIZATION_TABLE)
    .select("id", { count: "exact", head: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;

  if (error) {
    logQueryFailure(`kpi:${status ?? "total"}`, error.message);
    return null;
  }

  return count ?? 0;
}

/** KPI는 필터와 무관한 전체 기준 실제 DB 집계다 */
export async function fetchOrganizationKpis(
  supabase: SupabaseClient,
): Promise<OrganizationKpiResult> {
  const [total, active, suspended] = await Promise.all([
    countBy(supabase),
    countBy(supabase, "active"),
    countBy(supabase, "suspended"),
  ]);

  if (total === null || active === null || suspended === null) {
    return { ok: false };
  }

  return { ok: true, kpis: { total, active, suspended } };
}

export interface OrganizationMemberSummary {
  userId: string;
  displayName: string;
  role: "director" | "teacher";
  status: "active" | "invited" | "disabled";
  createdAt: string;
}

export type OrganizationMemberListResult =
  | { ok: true; members: OrganizationMemberSummary[] }
  | { ok: false };

/**
 * 기관의 원장 목록.
 *
 * SOYES 운영자 세션의 Client로 조회하며, RLS
 * ("members readable by self director and soyes admin")가 접근을 판정한다.
 * 이메일은 auth.users에만 있으므로 여기서는 다루지 않는다(호출부에서 Auth Admin으로 보강).
 */
export async function fetchOrganizationDirectors(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationMemberListResult> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, role, status, created_at, profiles!inner(display_name)")
    .eq("organization_id", organizationId)
    .eq("role", "director")
    .order("created_at", { ascending: true });

  if (error) {
    logQueryFailure("directors", error.message);
    return { ok: false };
  }

  type Row = {
    user_id: string;
    role: "director" | "teacher";
    status: "active" | "invited" | "disabled";
    created_at: string;
    profiles: { display_name: string } | { display_name: string }[] | null;
  };

  const members = ((data ?? []) as unknown as Row[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    return {
      userId: row.user_id,
      displayName: profile?.display_name ?? "이름 미설정",
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
    };
  });

  return { ok: true, members };
}

export async function fetchOrganization(
  supabase: SupabaseClient,
  id: string,
): Promise<OrganizationDetailResult> {
  const { data, error } = await supabase
    .from(ORGANIZATION_TABLE)
    .select(ORGANIZATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logQueryFailure("detail", error.message);
    return { ok: false };
  }

  return {
    ok: true,
    organization: (data as unknown as OrganizationRow | null) ?? null,
  };
}
