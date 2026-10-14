import { pricingPackages } from "@/data/packages";
import type { OrganizationEntitlementResult } from "@/lib/entitlement/queries";
import type { OrganizationRole } from "@/lib/auth/organization";

export const LEARNING_NAV = [{ href: "/learning", label: "수업하기" }] as const;

/** 경로를 입력받아 redirect 하지 않는다. 수업 입구라는 의도 하나만 허용한다. */
export function isLearningEntry(value: unknown): value is "learning" {
  return value === "learning";
}

/** DB로 확인한 역할만 전달한다. 입구 선택은 권한을 만들지 않는다. */
export function organizationLoginDestination(
  entry: unknown,
  roles: readonly OrganizationRole[],
  directorDashboard = false,
): string | null {
  if (!roles.includes("director") && !roles.includes("teacher")) return null;
  if (isLearningEntry(entry)) return "/learning";
  if (roles.includes("director")) return directorDashboard ? "/director" : "/director/sessions";
  return "/teacher";
}

export function learningProgram(slug: string) {
  return pricingPackages.find((program) => program.id === slug) ?? null;
}

export function contractWeekAccess(result: OrganizationEntitlementResult, weekNo: number): {
  allowed: boolean; label: string; detail: string;
} {
  if (!result.ok) return {
    allowed: false, label: "이용권 확인 필요",
    detail: "기관 이용권을 확인하지 못했습니다. 연결 환경과 계약 설정을 기관 담당자에게 확인해 주세요.",
  };
  const e = result.entitlements;
  if (e.serviceMode !== "active" && e.serviceMode !== "read_only") return {
    allowed: false, label: "이용권 확인 필요",
    detail: e.serviceMode === "before_start" ? "계약 이용 시작일 전입니다." : e.serviceMode === "org_suspended" ? "기관 이용이 중지됐습니다." : "유효한 수업 이용권이 없습니다.",
  };
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 24 ||
      e.weekFrom === null || e.weekTo === null ||
      !Number.isInteger(e.weekFrom) || !Number.isInteger(e.weekTo) ||
      e.weekFrom < 1 || e.weekTo > 24 || e.weekFrom > e.weekTo ||
      weekNo < e.weekFrom || weekNo > e.weekTo) return {
    allowed: false, label: "이용권 범위 밖",
    detail: "이 주차는 기관 계약의 이용 범위에 포함되지 않습니다.",
  };
  return {
    allowed: true, label: e.serviceMode === "read_only" ? "기록 열람" : "계약 범위 포함",
    detail: "본문은 검수·발행된 내용만 열립니다. 실제 수업은 배정된 반과 회차에서 진행합니다.",
  };
}

export function learningOperations(role: OrganizationRole, organizationId: string) {
  const org = `org=${encodeURIComponent(organizationId)}`;
  return role === "director"
    ? { label: "기관 관리", href: `/director/sessions?${org}`, observationBase: "/director/sessions", reportHref: `/director/reports?${org}` }
    : { label: "오늘의 수업", href: `/teacher?${org}`, observationBase: "/teacher/sessions", reportHref: `/teacher/growth-reports?${org}` };
}

export function learningNav(role: OrganizationRole, organizationId: string) {
  const operation = learningOperations(role, organizationId);
  return [{ href: `/learning?org=${encodeURIComponent(organizationId)}`, label: "수업하기" }, { href: operation.href, label: operation.label }];
}
