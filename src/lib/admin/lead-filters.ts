import type { SubmissionType } from "@/types/leadForm";
import type { LeadStatus } from "@/types/lead";

export const SUBMISSION_TYPES: readonly SubmissionType[] = [
  "pilot",
  "demo",
  "consult",
  "purchase_interest",
];

export const LEAD_STATUSES: readonly LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "closed",
];

export const LEAD_PERIODS = ["all", "today", "7d", "30d"] as const;
export type LeadPeriod = (typeof LEAD_PERIODS)[number];

export const LEAD_PERIOD_LABELS: Record<LeadPeriod, string> = {
  all: "전체",
  today: "오늘",
  "7d": "최근 7일",
  "30d": "최근 30일",
};

export const PAGE_SIZE = 20;

export interface LeadListFilters {
  q: string;
  type: SubmissionType | "all";
  status: LeadStatus | "all";
  period: LeadPeriod;
  page: number;
}

export const DEFAULT_LEAD_FILTERS: LeadListFilters = {
  q: "",
  type: "all",
  status: "all",
  period: "all",
  page: 1,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * 검색어 정제.
 *
 * PostgREST의 `or=(...)` 필터 문법은 `,` `(` `)` `.` `"` 등을 구분자로 쓰므로
 * 사용자 입력을 그대로 넣으면 필터 구조가 깨지거나 조작될 수 있다.
 * 구분자와 LIKE 와일드카드를 제거하고 길이도 제한한다.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .trim()
    .slice(0, 60)
    .replace(/[%_\\"(),*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** searchParams는 신뢰할 수 없는 입력이므로 허용된 값만 통과시킨다 */
export function parseLeadFilters(params: RawSearchParams): LeadListFilters {
  const rawType = firstValue(params.type);
  const rawStatus = firstValue(params.status);
  const rawPeriod = firstValue(params.period);
  const rawPage = Number.parseInt(firstValue(params.page), 10);

  return {
    q: sanitizeSearchTerm(firstValue(params.q)),
    type: SUBMISSION_TYPES.includes(rawType as SubmissionType)
      ? (rawType as SubmissionType)
      : "all",
    status: LEAD_STATUSES.includes(rawStatus as LeadStatus)
      ? (rawStatus as LeadStatus)
      : "all",
    period: LEAD_PERIODS.includes(rawPeriod as LeadPeriod)
      ? (rawPeriod as LeadPeriod)
      : "all",
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

/** 기본값은 URL에서 생략해 주소를 깔끔하게 유지한다 */
export function buildLeadsHref(
  filters: LeadListFilters,
  overrides: Partial<LeadListFilters> = {},
): string {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (next.q) params.set("q", next.q);
  if (next.type !== "all") params.set("type", next.type);
  if (next.status !== "all") params.set("status", next.status);
  if (next.period !== "all") params.set("period", next.period);
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `/admin/leads?${query}` : "/admin/leads";
}

export function hasActiveFilters(filters: LeadListFilters): boolean {
  return (
    filters.q !== "" ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.period !== "all"
  );
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 기준 오늘 00:00 (KST)을 UTC Date로 반환 */
function startOfTodayKst(now: Date): Date {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const kstMidnight = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate(),
  );
  return new Date(kstMidnight - KST_OFFSET_MS);
}

/**
 * 기간 필터의 시작 시각(ISO). 외부 Date Picker Library 없이 계산한다.
 * "최근 7일"은 오늘을 포함한 7일이다.
 */
export function periodStartIso(period: LeadPeriod, now: Date): string | null {
  if (period === "all") return null;

  const start = startOfTodayKst(now);
  const daysBack = period === "today" ? 0 : period === "7d" ? 6 : 29;

  start.setUTCDate(start.getUTCDate() - daysBack);
  return start.toISOString();
}
