import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** organization_members.role — parent는 아직 없다 */
export type OrganizationRole = "director" | "teacher";

export interface ActiveMembership {
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
}

/**
 * 현재 로그인 사용자의 "실제로 쓸 수 있는" 소속을 DB에서 조회한다.
 *
 * Client가 보낸 role 문자열은 절대 믿지 않는다. 두 단계 모두 DB가 판정한다.
 *
 *   1. organization_members: 내 행만 보이는 RLS를 이용해 status='active' 소속을 읽는다.
 *   2. organizations:        RLS("organizations readable by members and soyes admin")가
 *      private.is_org_member()를 호출하고, 이 helper는 organizations.status='active'까지
 *      확인한다. 따라서 **정지(suspended)된 기관은 여기서 조회되지 않는다.**
 *
 * 두 결과를 교집합하므로 membership이 살아 있어도 기관이 정지되면 접근이 사라진다.
 */
export async function fetchActiveMemberships(
  supabase: SupabaseClient,
  userId: string,
  roles: readonly OrganizationRole[],
): Promise<ActiveMembership[]> {
  const { data: memberRows, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", roles as unknown as string[]);

  if (memberError) {
    console.error("[auth/organization] membership query failed:", memberError.message);
    return [];
  }

  const rows = (memberRows ?? []) as { organization_id: string; role: OrganizationRole }[];

  if (rows.length === 0) return [];

  const organizationIds = [...new Set(rows.map((row) => row.organization_id))];

  // 정지된 기관은 RLS에서 걸러져 이 목록에 나오지 않는다.
  const { data: orgRows, error: orgError } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", organizationIds)
    .order("name", { ascending: true });

  if (orgError) {
    console.error("[auth/organization] organization query failed:", orgError.message);
    return [];
  }

  const nameById = new Map(
    ((orgRows ?? []) as { id: string; name: string }[]).map((org) => [
      org.id,
      org.name,
    ]),
  );

  return rows
    .filter((row) => nameById.has(row.organization_id))
    .map((row) => ({
      organizationId: row.organization_id,
      organizationName: nameById.get(row.organization_id) as string,
      role: row.role,
    }));
}

export interface OrganizationSession {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  memberships: ActiveMembership[];
}

/**
 * 기관 사용자 영역 진입 게이트.
 *
 * requireAdmin()과 계통을 분리한다 — SOYES 운영자 권한으로는 이 게이트를 통과할 수 없다.
 * roles를 인자로 받으므로 향후 teacher 영역에서 그대로 재사용한다.
 */
export async function requireOrganizationRole(
  roles: readonly OrganizationRole[],
): Promise<OrganizationSession> {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  const memberships = await fetchActiveMemberships(supabase, claims.sub, roles);

  if (memberships.length === 0) {
    redirect("/login?error=no_access");
  }

  return {
    supabase,
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    memberships,
  };
}

/** 원장 전용 게이트 */
export async function requireDirector(): Promise<OrganizationSession> {
  return requireOrganizationRole(["director"]);
}
