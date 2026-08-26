import type { ActiveMembership } from "@/lib/auth/organization";

/**
 * URL의 ?org= 값을 "내 소속 목록 안에서만" 유효한 기관으로 바꾼다.
 *
 * ★ URL 값을 그대로 권한 판정에 쓰지 않는다.
 *   memberships는 requireDirector()/requireTeacher()가 DB에서 읽어 온 것이고,
 *   그 안에 없는 org id는 무시하고 null을 돌려준다.
 *   (설령 통과하더라도 모든 질의는 RLS를 다시 거친다 — 이중 방어)
 *
 * 소속이 하나뿐이면 굳이 고르게 하지 않고 그것을 쓴다.
 */
export function resolveMembership(
  memberships: ActiveMembership[],
  requestedOrgId: string | string[] | undefined,
): ActiveMembership | null {
  const requested = Array.isArray(requestedOrgId)
    ? requestedOrgId[0]
    : requestedOrgId;

  const matched = memberships.find(
    (membership) => membership.organizationId === requested,
  );

  if (matched) return matched;

  return memberships.length === 1 ? memberships[0] : null;
}
