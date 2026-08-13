import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadRow } from "@/types/lead";
import {
  PAGE_SIZE,
  periodStartIso,
  type LeadListFilters,
} from "./lead-filters";

/**
 * Admin Lead 조회.
 *
 * 항상 로그인 관리자 세션의 Supabase Client로만 질의한다.
 * Service Role Key는 쓰지 않으며, 어떤 행이 보이는지는 RLS
 * ("admin can select lead submissions")가 결정한다.
 */

/** 필요한 컬럼만 명시적으로 가져온다 */
const LEAD_COLUMNS = [
  "id",
  "submission_type",
  "institution_name",
  "contact_name",
  "position",
  "phone",
  "email",
  "child_count",
  "class_count",
  "package_code",
  "message",
  "privacy_agreed",
  "marketing_agreed",
  "status",
  "created_at",
].join(", ");

const TABLE = "lead_submissions";

/**
 * 필터 체인에 필요한 메서드만 구조적으로 기술한다.
 *
 * postgrest-js의 Builder 제네릭을 직접 다루면 타입 인스턴스화가 너무 깊어져(TS2589)
 * 타입체크가 실패한다. 호출부의 실제 Builder 타입은 그대로 보존하고,
 * 내부에서만 이 최소 인터페이스로 좁혀 사용한다.
 */
interface FilterableQuery {
  eq(column: string, value: string): FilterableQuery;
  gte(column: string, value: string): FilterableQuery;
  or(filters: string): FilterableQuery;
}

export interface LeadKpis {
  total: number;
  newCount: number;
  pilot: number;
  demo: number;
  consult: number;
  purchaseInterest: number;
}

export type LeadListResult =
  | { ok: true; rows: LeadRow[]; total: number; page: number; pageCount: number }
  | { ok: false };

export type LeadKpiResult = { ok: true; kpis: LeadKpis } | { ok: false };

/** Supabase 내부 에러는 서버 로그에만 남기고 화면에는 전달하지 않는다 */
function logQueryFailure(scope: string, message: string) {
  console.error(`[admin/leads] ${scope} query failed: ${message}`);
}

function applyFilters<Q>(query: Q, filters: LeadListFilters, now: Date): Q {
  let next = query as unknown as FilterableQuery;

  if (filters.type !== "all") {
    next = next.eq("submission_type", filters.type);
  }

  if (filters.status !== "all") {
    next = next.eq("status", filters.status);
  }

  const since = periodStartIso(filters.period, now);
  if (since) {
    next = next.gte("created_at", since);
  }

  if (filters.q) {
    // 값은 큰따옴표로 감싸고, parseLeadFilters에서 구분자를 이미 제거했다.
    const term = `"%${filters.q}%"`;
    next = next.or(
      [
        `institution_name.ilike.${term}`,
        `contact_name.ilike.${term}`,
        `phone.ilike.${term}`,
      ].join(","),
    );
  }

  return next as unknown as Q;
}

export async function fetchLeadList(
  supabase: SupabaseClient,
  filters: LeadListFilters,
  now: Date,
): Promise<LeadListResult> {
  // 1) 조건에 맞는 전체 건수 (page 범위 보정에 필요)
  const countQuery = applyFilters(
    supabase.from(TABLE).select("id", { count: "exact", head: true }),
    filters,
    now,
  );

  const { count, error: countError } = await countQuery;

  if (countError) {
    logQueryFailure("count", countError.message);
    return { ok: false };
  }

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(filters.page, 1), pageCount);

  if (total === 0) {
    return { ok: true, rows: [], total, page: 1, pageCount: 1 };
  }

  // 2) 해당 page 구간만 조회
  const from = (page - 1) * PAGE_SIZE;
  const listQuery = applyFilters(
    supabase.from(TABLE).select(LEAD_COLUMNS),
    filters,
    now,
  )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const { data, error } = await listQuery;

  if (error) {
    logQueryFailure("list", error.message);
    return { ok: false };
  }

  return {
    ok: true,
    rows: (data ?? []) as unknown as LeadRow[],
    total,
    page,
    pageCount,
  };
}

async function countBy(
  supabase: SupabaseClient,
  column?: "status" | "submission_type",
  value?: string,
): Promise<number | null> {
  let query = supabase.from(TABLE).select("id", { count: "exact", head: true });

  if (column && value) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;

  if (error) {
    logQueryFailure(`kpi:${column ?? "total"}`, error.message);
    return null;
  }

  return count ?? 0;
}

/** KPI는 필터와 무관한 전체 기준 실제 DB 집계다. 숫자를 하드코딩하지 않는다. */
export async function fetchLeadKpis(
  supabase: SupabaseClient,
): Promise<LeadKpiResult> {
  const [total, newCount, pilot, demo, consult, purchaseInterest] =
    await Promise.all([
      countBy(supabase),
      countBy(supabase, "status", "new"),
      countBy(supabase, "submission_type", "pilot"),
      countBy(supabase, "submission_type", "demo"),
      countBy(supabase, "submission_type", "consult"),
      countBy(supabase, "submission_type", "purchase_interest"),
    ]);

  if (
    total === null ||
    newCount === null ||
    pilot === null ||
    demo === null ||
    consult === null ||
    purchaseInterest === null
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    kpis: { total, newCount, pilot, demo, consult, purchaseInterest },
  };
}
