/**
 * Entitlement · 계약 · 서비스 모드 표시 문구 (DEC-106 · copy-terminology §3).
 * 계약 상태와 이용 기간 상태를 한 배지로 섞지 않는다.
 */

export type ServiceMode = "active" | "read_only" | "before_start" | "org_suspended" | "no_contract";

export const SERVICE_MODE_LABELS: Record<ServiceMode, string> = {
  active: "이용 중",
  read_only: "읽기 전용",
  before_start: "이용 시작 전",
  org_suspended: "이용 중지",
  no_contract: "계약 없음",
};

export type ContractStatus = "draft" | "active" | "suspended" | "ended";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "초안",
  active: "유효",
  suspended: "일시 정지",
  ended: "종료",
};

export type ProductVersionLifecycle = "draft" | "published" | "retired";

export const PRODUCT_VERSION_LIFECYCLE_LABELS: Record<ProductVersionLifecycle, string> = {
  draft: "초안",
  published: "발행됨",
  retired: "신규 계약 중지",
};

export type FeatureCode =
  | "class_mode"
  | "weekly_report"
  | "monthly_report"
  | "semester_report"
  | "director_dashboard"
  | "parent_portal"
  | "bulk_print"
  | "content_playback"
  | "ai_assist"
  | "branding";

export const FEATURE_LABELS: Record<FeatureCode, string> = {
  class_mode: "Class Mode",
  weekly_report: "주간 리포트",
  monthly_report: "월간 요약 · 4주 단위",
  semester_report: "학기 리포트",
  director_dashboard: "원장 대시보드",
  parent_portal: "학부모 공유",
  bulk_print: "일괄 인쇄",
  content_playback: "콘텐츠 인앱 재생",
  ai_assist: "AI 작성 보조",
  branding: "시스템 브랜딩",
};

export function isServiceMode(value: unknown): value is ServiceMode {
  return (
    value === "active" ||
    value === "read_only" ||
    value === "before_start" ||
    value === "org_suspended" ||
    value === "no_contract"
  );
}

export function isContractStatus(value: unknown): value is ContractStatus {
  return value === "draft" || value === "active" || value === "suspended" || value === "ended";
}

/** 날짜 파생 이용 기간 상태 (저장값 아님 · DEC-050) */
export function contractPeriodLabel(startDate: string | null, endDate: string | null, today: string): string {
  if (!startDate || !endDate) return "—";
  if (today < startDate) return "시작 전";
  if (today > endDate) return "기간 만료";
  return "이용 중";
}

/** Asia/Seoul 기준 오늘 (YYYY-MM-DD) */
export function seoulToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * 날짜 표시 (YYYY.MM.DD · Asia/Seoul).
 * 날짜만 있는 값(YYYY-MM-DD)은 그대로, 시각이 있는 값(timestamptz ISO)은 서울 날짜로 바꾼다
 * — ISO 문자열 앞 10자리를 자르면 UTC 날짜가 되어 한국 00~09시에는 하루 전으로 보인다.
 */
export function formatDotDate(value: string | null): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replaceAll("-", ".");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10).replaceAll("-", ".");
  return seoulToday(date).replaceAll("-", ".");
}
