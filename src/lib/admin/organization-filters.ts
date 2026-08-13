import type {
  InstitutionType,
  OrganizationStatus,
} from "@/types/organization";
import { firstSearchParam, sanitizeSearchTerm } from "./search-term";

export const INSTITUTION_TYPES: readonly InstitutionType[] = [
  "kindergarten",
  "daycare",
  "academy",
  "other",
];

export const ORGANIZATION_STATUSES: readonly OrganizationStatus[] = [
  "active",
  "suspended",
];

export const ORGANIZATION_PAGE_SIZE = 20;

export interface OrganizationListFilters {
  q: string;
  status: OrganizationStatus | "all";
  page: number;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

/** searchParams는 신뢰할 수 없는 입력이므로 허용된 값만 통과시킨다 */
export function parseOrganizationFilters(
  params: RawSearchParams,
): OrganizationListFilters {
  const rawStatus = firstSearchParam(params.status);
  const rawPage = Number.parseInt(firstSearchParam(params.page), 10);

  return {
    q: sanitizeSearchTerm(firstSearchParam(params.q)),
    status: ORGANIZATION_STATUSES.includes(rawStatus as OrganizationStatus)
      ? (rawStatus as OrganizationStatus)
      : "all",
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

/** 기본값은 URL에서 생략해 주소를 깔끔하게 유지한다 */
export function buildOrganizationsHref(
  filters: OrganizationListFilters,
  overrides: Partial<OrganizationListFilters> = {},
): string {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (next.q) params.set("q", next.q);
  if (next.status !== "all") params.set("status", next.status);
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `/admin/organizations?${query}` : "/admin/organizations";
}

export function hasActiveOrganizationFilters(
  filters: OrganizationListFilters,
): boolean {
  return filters.q !== "" || filters.status !== "all";
}

/** 기관 유형 입력값 검증 — DB check constraint와 동일한 화이트리스트 */
export function parseInstitutionType(raw: string): InstitutionType | null {
  return INSTITUTION_TYPES.includes(raw as InstitutionType)
    ? (raw as InstitutionType)
    : null;
}
