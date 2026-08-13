import type {
  InstitutionType,
  OrganizationStatus,
} from "@/types/organization";

/**
 * DB 값 → 화면 표기 매핑.
 * DB 값 자체는 바꾸지 않는다. Client / Server 공용이므로 Supabase 의존성을 두지 않는다.
 */

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  kindergarten: "유치원",
  daycare: "어린이집",
  academy: "학원",
  other: "기타",
};

export const ORGANIZATION_STATUS_LABELS: Record<OrganizationStatus, string> = {
  active: "운영중",
  suspended: "이용중지",
};

export const ORGANIZATION_STATUS_BADGE_CLASSES: Record<
  OrganizationStatus,
  string
> = {
  active: "bg-soft-green/20 text-navy border-soft-green/50",
  suspended: "bg-navy/5 text-navy/50 border-navy/15",
};

export function formatInstitutionType(type: InstitutionType | null): string {
  return type ? INSTITUTION_TYPE_LABELS[type] : "미지정";
}

/** 서버/클라이언트 모두 Asia/Seoul로 고정해 Hydration 불일치를 막는다 */
export function formatOrganizationDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatOrganizationDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
