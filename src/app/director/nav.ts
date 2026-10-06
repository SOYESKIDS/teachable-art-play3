import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchOrganizationEntitlements, hasFeature } from "@/lib/entitlement/queries";

/**
 * 원장 메뉴 (DEC-097 · DEC-044 · DEC-056).
 *
 * STANDARD · PREMIUM · Pilot: 홈 · 수업 운영 · 수업 일정·이력 · 리포트 · 학부모 공유
 * STARTER: 홈(대시보드) 없음. 운영 기능은 모두 제공한다.
 * 메뉴는 안내일 뿐이고 대시보드 집계는 서버가 기능 권한을 다시 확인한다.
 */
const OPERATION_NAV = [
  { href: "/director/sessions", label: "수업 운영" },
  { href: "/director/sessions/history", label: "수업 일정·이력" },
  { href: "/director/growth-reports", label: "리포트" },
  { href: "/director/portal", label: "학부모 공유" },
] as const;

const HOME_NAV = { href: "/director", label: "홈" } as const;

/** 기능 권한을 모를 때(이전 호출부 호환)의 기본값: 홈 없이 운영 메뉴만 */
export const DIRECTOR_NAV: readonly { href: string; label: string }[] = OPERATION_NAV;

export async function directorNavFor(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<readonly { href: string; label: string }[]> {
  const entitlements = await fetchOrganizationEntitlements(supabase, organizationId);
  return hasFeature(entitlements, "director_dashboard") ? [HOME_NAV, ...OPERATION_NAV] : OPERATION_NAV;
}
