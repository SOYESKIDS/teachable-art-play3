import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchOrganizationEntitlements, hasFeature } from "@/lib/entitlement/queries";

/**
 * 원장 리포트 · 학부모 공유 조회 (DEC-074 · DEC-092 · DEC-102 · DEC-103).
 *
 * 원장은 완료된 revision 만 본다 (RLS). "학부모 화면에 표시 중"은 저장값이 아니라
 * 최근 완료본 ∧ 숨김 아님 ∧ 아동 공유 링크 활성 ∧ 계약 기능(parent_portal) 으로 계산한다.
 */

export interface DirectorWeeklyRow {
  reportId: string;
  childId: string;
  childName: string;
  className: string | null;
  weekNo: number;
  hidden: boolean;
  completedAt: string | null;
  updated: boolean;
  visibleToParent: boolean;
}

function log(scope: string, code: string | undefined) {
  console.error(`[director reports] ${scope} failed: code=${code ?? "unknown"}`);
}

export async function fetchDirectorWeeklyReports(
  supabase: SupabaseClient,
  organizationId: string,
  page: number,
): Promise<{ ok: true; rows: DirectorWeeklyRow[]; hasMore: boolean } | { ok: false }> {
  const pageSize = 50;
  const from = Math.max(0, (page - 1) * pageSize);

  const { data, error } = await supabase
    .from("reports")
    .select("id, child_id, class_id, week_no, hidden_at, latest_completed_revision_id")
    .eq("organization_id", organizationId)
    .eq("report_type", "weekly")
    .not("latest_completed_revision_id", "is", null)
    .order("week_no", { ascending: false })
    .order("id", { ascending: true })
    .range(from, from + pageSize);

  if (error) {
    log("list", error.code);
    return { ok: false };
  }

  const rows = (data ?? []) as {
    id: string;
    child_id: string;
    class_id: string;
    week_no: number;
    hidden_at: string | null;
    latest_completed_revision_id: string;
  }[];
  const hasMore = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize);

  if (pageRows.length === 0) return { ok: true, rows: [], hasMore: false };

  const [childResult, classResult, revisionResult, portalResult, entitlements] = await Promise.all([
    supabase.from("children").select("id, name").in("id", [...new Set(pageRows.map((row) => row.child_id))]),
    supabase.from("classes").select("id, name").in("id", [...new Set(pageRows.map((row) => row.class_id))]),
    supabase
      .from("report_revisions")
      .select("id, revision_no, completed_at")
      .in(
        "id",
        pageRows.map((row) => row.latest_completed_revision_id),
      ),
    supabase
      .from("child_portals")
      .select("child_id")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    fetchOrganizationEntitlements(supabase, organizationId),
  ]);

  const firstError = [childResult, classResult, revisionResult, portalResult].find((result) => result.error);
  if (firstError?.error) {
    log("list context", firstError.error.code);
    return { ok: false };
  }

  const childName = new Map(((childResult.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
  const className = new Map(((classResult.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
  const revision = new Map(
    ((revisionResult.data ?? []) as { id: string; revision_no: number; completed_at: string | null }[]).map((row) => [row.id, row]),
  );
  const activePortal = new Set(((portalResult.data ?? []) as { child_id: string }[]).map((row) => row.child_id));
  const portalFeature = hasFeature(entitlements, "parent_portal");

  return {
    ok: true,
    hasMore,
    rows: pageRows.map((row) => {
      const latest = revision.get(row.latest_completed_revision_id);
      const hidden = row.hidden_at !== null;
      return {
        reportId: row.id,
        childId: row.child_id,
        childName: childName.get(row.child_id) ?? "이름 없음",
        className: className.get(row.class_id) ?? null,
        weekNo: row.week_no,
        hidden,
        completedAt: latest?.completed_at ?? null,
        updated: (latest?.revision_no ?? 1) > 1,
        visibleToParent: !hidden && portalFeature && activePortal.has(row.child_id),
      };
    }),
  };
}

export interface PortalChildRow {
  childId: string;
  childName: string;
  className: string | null;
  portalId: string | null;
  issuedAt: string | null;
  consentStatus: "unknown" | "consented" | "declined";
}

export async function fetchDirectorPortalRows(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<{ ok: true; rows: PortalChildRow[] } | { ok: false }> {
  const [childResult, classResult, portalResult, consentResult] = await Promise.all([
    supabase
      .from("children")
      .select("id, name, class_id")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("name", { ascending: true })
      .limit(500),
    supabase.from("classes").select("id, name").eq("organization_id", organizationId),
    supabase
      .from("child_portals")
      .select("id, child_id, issued_at")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase.from("child_media_consents").select("child_id, status").eq("organization_id", organizationId),
  ]);

  const firstError = [childResult, classResult, portalResult, consentResult].find((result) => result.error);
  if (firstError?.error) {
    log("portal rows", firstError.error.code);
    return { ok: false };
  }

  const className = new Map(((classResult.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
  const portalByChild = new Map(
    ((portalResult.data ?? []) as { id: string; child_id: string; issued_at: string }[]).map((row) => [row.child_id, row]),
  );
  const consentByChild = new Map(
    ((consentResult.data ?? []) as { child_id: string; status: PortalChildRow["consentStatus"] }[]).map((row) => [
      row.child_id,
      row.status,
    ]),
  );

  return {
    ok: true,
    rows: ((childResult.data ?? []) as { id: string; name: string; class_id: string | null }[]).map((child) => {
      const portal = portalByChild.get(child.id) ?? null;
      return {
        childId: child.id,
        childName: child.name,
        className: child.class_id ? (className.get(child.class_id) ?? null) : null,
        portalId: portal?.id ?? null,
        issuedAt: portal?.issued_at ?? null,
        consentStatus: consentByChild.get(child.id) ?? "unknown",
      };
    }),
  };
}
