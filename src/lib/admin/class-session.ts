import type {
  ClassSessionStatus,
  ClassSessionTransitionStatus,
} from "@/types/class-session";
import { parseAssignmentStartDate } from "./class-program";

/**
 * 수업 실행(class_sessions) 공용 라벨 · 표시 헬퍼 · 입력 검증.
 *
 * class-program.ts / curriculum.ts와 같은 역할이다.
 * Client / Server 공용이라 Supabase 의존성을 두지 않는다.
 *
 * 여기 있는 상태 규칙은 20260826 migration의
 * private.enforce_class_session_update() 와 반드시 같은 내용이어야 한다.
 * DB가 최종 방어선이고, 이 파일은 사용자에게 미리 알려 주기 위한 사본이다.
 */

export const CLASS_SESSION_STATUSES: readonly ClassSessionStatus[] = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];

export const CLASS_SESSION_STATUS_LABELS: Record<ClassSessionStatus, string> = {
  scheduled: "예정",
  in_progress: "진행 중",
  completed: "완료",
  cancelled: "취소",
};

export const CLASS_SESSION_STATUS_BADGE_CLASSES: Record<
  ClassSessionStatus,
  string
> = {
  scheduled: "bg-pale-yellow/40 text-navy border-yellow/50",
  in_progress: "bg-soft-green/20 text-navy border-soft-green/50",
  completed: "bg-light-blue/25 text-navy border-light-blue/60",
  cancelled: "bg-navy/5 text-navy/50 border-navy/15",
};

/** 완료·취소는 종착 상태다. 되돌리지 않고, 다시 하려면 새 수업을 만든다. */
export function isTerminalSessionStatus(status: ClassSessionStatus): boolean {
  return status === "completed" || status === "cancelled";
}

/**
 * 지금 상태에서 고를 수 있는 다음 상태.
 *
 *   scheduled   → 진행 중 / 완료 / 취소
 *   in_progress → 완료 / 취소
 *   terminal    → 없음
 *
 * scheduled로 되돌아가는 선택지는 어디에도 없다(DB도 막는다).
 * scheduled → completed를 열어 둔 것은 의도적이다 —
 * 수업을 마친 뒤 나중에 기록하는 운영이 실제로 있다.
 */
export function allowedSessionTransitions(
  status: ClassSessionStatus,
): readonly ClassSessionTransitionStatus[] {
  if (status === "scheduled") return ["in_progress", "completed", "cancelled"];
  if (status === "in_progress") return ["completed", "cancelled"];
  return [];
}

/**
 * "재개" 경로인가 — 부모(배정·반·프로그램·차시)가 지금도 유효해야 하는 동작인가.
 *
 * 수업을 진행 상태로 올리는 것과 예정일을 다시 잡는 것이 여기 해당한다.
 * 완료/취소로 정리하는 것은 부모 상태와 무관하게 언제나 가능해야 하므로 제외한다.
 * (20260826 migration의 v_needs_parent_check와 같은 구분이다.)
 */
export function requiresActiveParents(
  next: ClassSessionTransitionStatus,
): boolean {
  return next === "in_progress";
}

/**
 * 예정일 표시. date 컬럼이라 "YYYY-MM-DD" 문자열을 그대로 쪼갠다.
 * new Date()로 파싱하면 UTC로 해석돼 시간대에 따라 하루가 밀 수 있다.
 */
export function formatSessionDate(value: string | null): string {
  return value ? value.split("-").join(".") : "미정";
}

/** 차시 표기: 3주차 · 1차시 */
export function formatLessonOrder(
  weekNo: number | null,
  sessionNo: number | null,
): string {
  if (weekNo === null || sessionNo === null) return "—";

  return `${weekNo}주차 · ${sessionNo}차시`;
}

/** 차시 선택지 표기: 3주차 · 1차시 · 가을 나무 그리기 */
export function formatLessonOptionLabel(
  weekNo: number,
  sessionNo: number,
  title: string,
): string {
  return `${weekNo}주차 · ${sessionNo}차시 · ${title}`;
}

// =========================================================
// 입력 검증
// =========================================================

export function parseSessionTransitionStatus(
  raw: string,
): ClassSessionTransitionStatus | null {
  return raw === "in_progress" || raw === "completed" || raw === "cancelled"
    ? raw
    : null;
}

/**
 * 예정일(선택 입력) 검증.
 *
 * 규칙이 배정 시작일과 완전히 같다 — 비어 있으면 null, 값이 있으면
 * YYYY-MM-DD이면서 실제로 존재하는 날짜여야 한다(2026-02-31은 거부).
 * 보안에 민감한 검증을 두 벌 두면 언젠가 한쪽만 고쳐지므로 05C 파서를 그대로 쓴다.
 */
export const parseSessionScheduledDate = parseAssignmentStartDate;
