import type { AgeGroup } from "@/types/class-child";
import type {
  AssignmentCloseStatus,
  AssignmentStatus,
} from "@/types/class-program";
import { AGE_GROUP_LABELS } from "./class-child";

/**
 * 반-프로그램 배정 공용 라벨 · 표시 헬퍼 · 입력 검증.
 *
 * class-child.ts / class-teacher.ts / curriculum.ts와 같은 역할이다.
 * Client / Server 공용이라 Supabase 의존성을 두지 않는다.
 */

export const ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = [
  "active",
  "completed",
  "cancelled",
];

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  active: "운영 중",
  completed: "완료",
  cancelled: "취소",
};

export const ASSIGNMENT_STATUS_BADGE_CLASSES: Record<AssignmentStatus, string> =
  {
    active: "bg-soft-green/20 text-navy border-soft-green/50",
    completed: "bg-light-blue/25 text-navy border-light-blue/60",
    cancelled: "bg-navy/5 text-navy/50 border-navy/15",
  };

/**
 * 완료·취소는 종착 상태다.
 *
 * 과거 운영 이력을 다시 운영 중으로 되돌리지 않는다.
 * 같은 프로그램을 다시 운영하려면 새 배정 행을 만든다
 * (partial unique가 active만 대상으로 하므로 재배정이 가능하다).
 */
export function isTerminalAssignmentStatus(status: AssignmentStatus): boolean {
  return status !== "active";
}

/**
 * start_date는 DB에서 date 타입이라 "YYYY-MM-DD" 문자열로 들어온다.
 *
 * new Date()로 파싱하면 UTC로 해석되어 시간대에 따라 하루가 밀 수 있다.
 * 날짜에는 시각 개념이 없으므로 문자열을 그대로 쪼개 표시한다.
 */
export function formatAssignmentDate(value: string | null): string {
  if (!value) return "—";

  const [year, month, day] = value.split("-");

  return year && month && day ? `${year}.${month}.${day}` : value;
}

/** 반 선택지 표기: 햇살반 · 만 5세 · 2026 (연령 미설정이면 그 조각을 넣지 않는다) */
export function formatClassOptionLabel(
  name: string,
  ageGroup: AgeGroup | null,
  schoolYear: number,
): string {
  const parts = [name];

  if (ageGroup) parts.push(AGE_GROUP_LABELS[ageGroup]);

  parts.push(`${schoolYear}`);

  return parts.join(" · ");
}

/** 프로그램 선택지 표기: TEST-TAP-R2 · 테스트 프로그램 · 8주 · 만 5세 */
export function formatProgramOptionLabel(
  code: string,
  title: string,
  durationWeeks: number,
  ageGroup: AgeGroup | null,
): string {
  const parts = [code, title, `${durationWeeks}주`];

  if (ageGroup) parts.push(AGE_GROUP_LABELS[ageGroup]);

  return parts.join(" · ");
}

/**
 * 반 연령과 프로그램 권장 연령이 어긋나는지.
 *
 * 둘 다 값이 있고 서로 다를 때만 true다.
 * DB는 이 조합을 막지 않고(혼합연령 프로그램을 특정 연령 반에 쓰는 운영이 실제로 있다)
 * 저장도 허용한다. 화면에서 주의만 환기하는 용도다.
 */
export function hasAgeGroupMismatch(
  classAgeGroup: AgeGroup | null,
  programAgeGroup: AgeGroup | null,
): boolean {
  return (
    classAgeGroup !== null &&
    programAgeGroup !== null &&
    classAgeGroup !== programAgeGroup
  );
}

// =========================================================
// 입력 검증
// =========================================================

/**
 * 운영 종료 요청의 목표 상태.
 *
 * completed / cancelled만 통과시킨다. active는 의도적으로 제외한다 —
 * 배정 생성 후에는 start_date를 포함해 어떤 값도 수정하지 않고,
 * 상태를 "종료"하는 것만 허용하는 정책이기 때문이다.
 */
export function parseAssignmentCloseStatus(
  raw: string,
): AssignmentCloseStatus | null {
  return raw === "completed" || raw === "cancelled" ? raw : null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 시작일(선택 입력) 검증.
 *   - 빈 값        → { ok: true, value: null }
 *   - YYYY-MM-DD가 아니거나 존재하지 않는 날짜 → { ok: false }
 *
 * 2026-02-30처럼 형식은 맞지만 없는 날짜를 걸러내기 위해
 * UTC로 재구성해 각 자리수가 그대로 돌아오는지 확인한다.
 * (UTC를 쓰는 것은 시간대 보정을 피하기 위해서다. 저장 값은 입력 문자열 그대로다.)
 */
export function parseAssignmentStartDate(
  raw: string,
): { ok: true; value: string | null } | { ok: false } {
  const value = raw.trim();

  if (value === "") return { ok: true, value: null };

  if (!DATE_PATTERN.test(value)) return { ok: false };

  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day;

  return isRealDate ? { ok: true, value } : { ok: false };
}
