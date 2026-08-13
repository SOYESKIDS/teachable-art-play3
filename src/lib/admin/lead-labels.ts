import type { PackageCode, SubmissionType } from "@/types/leadForm";
import type { LeadStatus } from "@/types/lead";

/**
 * DB 값 → 화면 표기 매핑.
 * DB에 저장된 값 자체는 절대 바꾸지 않는다. 표기만 한국어로 변환한다.
 * Client / Server 양쪽에서 쓰이므로 이 파일에는 Supabase 의존성을 두지 않는다.
 */

export const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  pilot: "4주 파일럿",
  demo: "대시보드 데모",
  consult: "기관 상담",
  purchase_interest: "상품 관심",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "신규",
  contacted: "연락완료",
  qualified: "상담진행",
  converted: "도입확정",
  closed: "종료",
};

export const PACKAGE_LABELS: Record<PackageCode, string> = {
  starter: "STARTER",
  standard: "STANDARD",
  premium: "PREMIUM",
  undecided: "미정",
};

/** 상태 Badge — 업무용이므로 채도를 낮추고 대비만 확보한다 */
export const LEAD_STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
  new: "bg-yellow/15 text-navy border-yellow/40",
  contacted: "bg-trust-blue/10 text-trust-blue border-trust-blue/25",
  qualified: "bg-navy/8 text-navy border-navy/25",
  converted: "bg-soft-green/20 text-navy border-soft-green/50",
  closed: "bg-navy/5 text-navy/50 border-navy/15",
};

export function formatPackage(code: PackageCode | null): string {
  return code ? PACKAGE_LABELS[code] : "—";
}

export function formatCount(value: number | null, unit: string): string {
  return typeof value === "number" ? `${value.toLocaleString("ko-KR")}${unit}` : "—";
}

/**
 * 접수일 표기.
 * 서버/클라이언트 모두 Asia/Seoul로 고정해 Hydration 불일치를 막는다.
 */
export function formatLeadDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatLeadDateTime(iso: string): string {
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

/** tel: 링크용 — 숫자와 +만 남긴다 */
export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
