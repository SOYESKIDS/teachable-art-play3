import type { ActivityType, CurriculumStatus } from "@/types/curriculum";

/**
 * 커리큘럼 공용 상수 · 화면 라벨 · 입력 검증.
 *
 * class-child.ts와 같은 역할이다. 화이트리스트가 곧 검증 규칙이라
 * 라벨과 parser를 한 파일에 둔다(둘이 어긋나면 바로 버그가 된다).
 * Client / Server 공용이므로 Supabase 의존성을 두지 않는다.
 *
 * 모든 값과 범위는 20260825 migration의 CHECK constraint와 동일하게 유지한다.
 */

export const CURRICULUM_STATUSES: readonly CurriculumStatus[] = [
  "draft",
  "published",
  "archived",
];

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  "intro",
  "warmup",
  "activity",
  "creative",
  "reflection",
  "closing",
];

// DB CHECK constraint와 동일한 범위
export const DURATION_WEEKS_MIN = 1;
export const DURATION_WEEKS_MAX = 52;
export const WEEK_NO_MIN = 1;
export const WEEK_NO_MAX = 52;
export const SESSION_NO_MIN = 1;
export const SESSION_NO_MAX = 10;
export const SEQUENCE_NO_MIN = 1;
export const SEQUENCE_NO_MAX = 100;
export const LESSON_DURATION_MIN = 1;
export const LESSON_DURATION_MAX = 300;
export const ACTIVITY_DURATION_MIN = 1;
export const ACTIVITY_DURATION_MAX = 180;

export const PROGRAM_CODE_MAX = 50;
export const PROGRAM_TITLE_MAX = 100;
export const PROGRAM_SUMMARY_MAX = 500;
export const LESSON_TITLE_MAX = 150;
export const LESSON_OBJECTIVE_MAX = 1000;
export const ACTIVITY_TITLE_MAX = 150;
export const ACTIVITY_DESCRIPTION_MAX = 3000;
export const ACTIVITY_MATERIALS_MAX = 1000;

export const CURRICULUM_STATUS_LABELS: Record<CurriculumStatus, string> = {
  draft: "초안",
  published: "게시",
  archived: "보관",
};

export const CURRICULUM_STATUS_BADGE_CLASSES: Record<CurriculumStatus, string> =
  {
    draft: "bg-pale-yellow/40 text-navy border-yellow/50",
    published: "bg-soft-green/20 text-navy border-soft-green/50",
    archived: "bg-navy/5 text-navy/50 border-navy/15",
  };

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  intro: "도입",
  warmup: "준비활동",
  activity: "본활동",
  creative: "창의활동",
  reflection: "회고",
  closing: "마무리",
};

export function formatMinutes(minutes: number | null): string {
  return minutes === null ? "—" : `${minutes}분`;
}

export function formatOptionalText(value: string | null): string {
  return value === null || value.trim() === "" ? "—" : value;
}

// =========================================================
// 상태 전이 규칙 (DB가 강제하지 않는 운영 규칙)
// =========================================================

/**
 * archived는 종착 상태다. 어떤 상태로도 되돌리지 않는다.
 *
 * "운영 종료된 콘텐츠"라는 의미를 유지하기 위해서다.
 * 되살리고 싶으면 새 프로그램/차시를 만드는 편이 이력이 깨끗하다.
 * draft ↔ published 사이 이동은 제작 중 되돌리기가 필요해 열어 둔다.
 */
export function canTransitionStatus(
  current: CurriculumStatus,
  next: CurriculumStatus,
): boolean {
  if (current === next) return true;
  return current !== "archived";
}

// =========================================================
// 입력 검증 — Client가 보낸 값은 전부 여기를 통과해야 한다
// =========================================================

export function parseCurriculumStatus(raw: string): CurriculumStatus | null {
  return CURRICULUM_STATUSES.includes(raw as CurriculumStatus)
    ? (raw as CurriculumStatus)
    : null;
}

export function parseActivityType(raw: string): ActivityType | null {
  return ACTIVITY_TYPES.includes(raw as ActivityType)
    ? (raw as ActivityType)
    : null;
}

/**
 * 필수 텍스트. trim 후 1~max자.
 * 프로그램 코드도 이걸 쓴다 — 내부 형식(대문자/하이픈)은 강제하지 않는다.
 * 운영자가 코드 체계를 바꿀 여지를 남기는 편이 낫고, 유일성은 DB unique가 지킨다.
 */
export function parseRequiredText(
  raw: FormDataEntryValue | null,
  max: number,
): string | null {
  const value = String(raw ?? "").trim();
  return value.length >= 1 && value.length <= max ? value : null;
}

/**
 * 선택 텍스트. 비어 있으면 null, 길이를 넘으면 실패.
 * "미입력"과 "너무 김"을 구분해야 해서 단순 null 반환을 쓰지 않는다.
 */
export function parseOptionalLongText(
  raw: FormDataEntryValue | null,
  max: number,
): { ok: true; value: string | null } | { ok: false } {
  const value = String(raw ?? "").trim();

  if (value === "") return { ok: true, value: null };

  return value.length <= max ? { ok: true, value } : { ok: false };
}

/**
 * 필수 정수. 범위를 벗어나면 null을 돌려주고 호출부가 에러로 처리한다.
 *
 * ★ 어떤 경우에도 값을 "유효하게 보정"하지 않는다.
 *   - 범위를 넘는 숫자를 상한/하한으로 깎지 않는다 (9 → 8 금지)
 *   - 정수가 아닌 문자열도 잘라내지 않는다.
 *     Number.parseInt("8.9")는 8을 돌려주는데, 이것도 사용자가 입력하지 않은 값을
 *     저장하는 셈이라 조용한 보정이다. 그래서 정수 표기인지 먼저 확인한다.
 */
export function parseRequiredInt(
  raw: string,
  min: number,
  max: number,
): number | null {
  const trimmed = raw.trim();

  if (!/^-?\d+$/.test(trimmed)) return null;

  const value = Number.parseInt(trimmed, 10);

  if (!Number.isInteger(value) || value < min || value > max) return null;

  return value;
}

/** 선택 정수. 비어 있으면 null, 범위를 벗어나면 실패. */
export function parseOptionalInt(
  raw: string,
  min: number,
  max: number,
): { ok: true; value: number | null } | { ok: false } {
  if (raw.trim() === "") return { ok: true, value: null };

  const value = parseRequiredInt(raw, min, max);

  return value === null ? { ok: false } : { ok: true, value };
}
