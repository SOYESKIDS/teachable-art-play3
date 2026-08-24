import type {
  AgeGroup,
  ChildStatus,
  ClassStatus,
} from "@/types/class-child";

/**
 * 반 / 원아 공용 상수 · 화면 라벨 · 입력 검증.
 *
 * organization-labels.ts와 같은 역할이지만, 여기서는 화이트리스트가 곧 검증 규칙이라
 * 라벨과 parser를 한 파일에 둔다(둘이 어긋나면 바로 버그가 된다).
 * Client / Server 공용이므로 Supabase 의존성을 두지 않는다.
 *
 * 모든 값과 범위는 20260824 migration의 CHECK constraint와 동일하게 유지한다.
 */

export const AGE_GROUPS: readonly AgeGroup[] = ["age3", "age4", "age5", "mixed"];

export const CLASS_STATUSES: readonly ClassStatus[] = ["active", "archived"];

export const CHILD_STATUSES: readonly ChildStatus[] = [
  "active",
  "inactive",
  "graduated",
];

/** DB: check (school_year between 2000 and 2100) */
export const SCHOOL_YEAR_MIN = 2000;
export const SCHOOL_YEAR_MAX = 2100;

/** DB: check (birth_year between 2000 and 2100) */
export const BIRTH_YEAR_MIN = 2000;
export const BIRTH_YEAR_MAX = 2100;

/** DB: check (char_length(btrim(name)) between 1 and 50) — classes / children 공통 */
export const NAME_MAX_LENGTH = 50;

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  age3: "만 3세",
  age4: "만 4세",
  age5: "만 5세",
  mixed: "혼합연령",
};

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  active: "운영 중",
  archived: "보관",
};

export const CHILD_STATUS_LABELS: Record<ChildStatus, string> = {
  active: "재원",
  inactive: "비활성",
  graduated: "졸업",
};

export const CLASS_STATUS_BADGE_CLASSES: Record<ClassStatus, string> = {
  active: "bg-soft-green/20 text-navy border-soft-green/50",
  archived: "bg-navy/5 text-navy/50 border-navy/15",
};

export const CHILD_STATUS_BADGE_CLASSES: Record<ChildStatus, string> = {
  active: "bg-soft-green/20 text-navy border-soft-green/50",
  inactive: "bg-navy/5 text-navy/50 border-navy/15",
  graduated: "bg-light-blue/25 text-navy border-light-blue/60",
};

export function formatAgeGroup(ageGroup: AgeGroup | null): string {
  return ageGroup ? AGE_GROUP_LABELS[ageGroup] : "미설정";
}

export function formatBirthYear(birthYear: number | null): string {
  return birthYear === null ? "미입력" : `${birthYear}년`;
}

/** 반 미배정 원아는 화면에서 "미배정"으로 통일해 표기한다 */
export function formatClassName(className: string | null): string {
  return className ?? "미배정";
}

// =========================================================
// 입력 검증 — Client가 보낸 값은 전부 여기를 통과해야 한다
// =========================================================

/** 화이트리스트를 통과하지 못하면 null(미지정)로 떨어진다 */
export function parseAgeGroup(raw: string): AgeGroup | null {
  return AGE_GROUPS.includes(raw as AgeGroup) ? (raw as AgeGroup) : null;
}

export function parseClassStatus(raw: string): ClassStatus | null {
  return CLASS_STATUSES.includes(raw as ClassStatus)
    ? (raw as ClassStatus)
    : null;
}

export function parseChildStatus(raw: string): ChildStatus | null {
  return CHILD_STATUSES.includes(raw as ChildStatus)
    ? (raw as ChildStatus)
    : null;
}

/** DB check constraint와 동일하게 1~50자로 검증한다(공백만 입력한 경우 거부) */
export function parseEntityName(raw: FormDataEntryValue | null): string | null {
  const name = String(raw ?? "").trim();
  return name.length >= 1 && name.length <= NAME_MAX_LENGTH ? name : null;
}

function parseYearInRange(raw: string, min: number, max: number): number | null {
  const year = Number.parseInt(raw.trim(), 10);

  if (!Number.isInteger(year) || year < min || year > max) {
    return null;
  }

  return year;
}

/** 학년도는 필수값이다. 범위를 벗어나면 null을 돌려주고 호출부가 에러 처리한다. */
export function parseSchoolYear(raw: string): number | null {
  return parseYearInRange(raw, SCHOOL_YEAR_MIN, SCHOOL_YEAR_MAX);
}

/**
 * 출생연도는 선택값이다.
 *   - 빈 문자열 → { ok: true, value: null }  (미입력)
 *   - 범위 밖   → { ok: false }              (오타로 보고 에러)
 * "미입력"과 "잘못 입력"을 구분해야 해서 단순 null 반환을 쓰지 않는다.
 */
export function parseBirthYear(
  raw: string,
): { ok: true; value: number | null } | { ok: false } {
  if (raw.trim() === "") {
    return { ok: true, value: null };
  }

  const year = parseYearInRange(raw, BIRTH_YEAR_MIN, BIRTH_YEAR_MAX);

  return year === null ? { ok: false } : { ok: true, value: year };
}
