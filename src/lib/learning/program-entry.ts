import { pricingPackages } from "@/data/packages";
import type { OrganizationEntitlementResult } from "@/lib/entitlement/queries";
import type { OrganizationRole } from "@/lib/auth/organization";
import { TEACHER_NAV } from "@/app/teacher/nav";
import { DIRECTOR_NAV } from "@/app/director/nav";

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
  if (isLearningEntry(entry)) return roles.includes("director") ? "/learning" : "/teacher";
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
  const nav = role === "director" ? DIRECTOR_NAV : TEACHER_NAV;
  return nav.map(item => ({ ...item, href: `${item.href}?org=${encodeURIComponent(organizationId)}` }));
}

/** UI only: being in the contract range does not establish publication or file readiness. */
export function programAccessSummary(result: OrganizationEntitlementResult, durationWeeks: number) {
  const weeks = Array.from({ length: durationWeeks }, (_, index) => index + 1)
    .filter(week => contractWeekAccess(result, week).allowed);
  const state = weeks.length === durationWeeks ? "included" : weeks.length > 0 ? "partial" : "unavailable";
  const readOnly = result.ok && result.entitlements.serviceMode === "read_only";
  return {
    state,
    readOnly,
    label: state === "included" ? (readOnly ? "기록 열람 과정" : "이용 범위 포함")
      : state === "partial" ? "일부 주차 이용 가능" : "과정 구성 미리보기",
    detail: weeks.length > 0
      ? `${weeks[0]}~${weeks[weeks.length - 1]}주${readOnly ? " 기록을 열람할 수 있습니다." : "가 이용 범위에 포함됩니다. 준비된 수업은 주차 안에서 확인하세요."}`
      : "주제와 활동 구성을 볼 수 있습니다. 수업 이용은 기관 담당자에게 확인해 주세요.",
    action: state === "included" ? (readOnly ? "주차별 기록 보기" : "주차별 수업 보기") : "과정 구성 보기",
  } as const;
}
