import { formatDotDate, seoulToday } from "@/lib/entitlement/labels";

/**
 * 서비스 날짜 공통 도구 (PHASE UAT-STABILIZATION) — 서버 · 브라우저 공용.
 *
 * ★ 원본은 src/lib/entitlement/labels.ts 의 seoulToday · formatDotDate 다 (한국 시간 · YYYY.MM.DD).
 *   여기서는 수업 화면에서 쓰는 이름으로 묶어 둔다 — 날짜 규칙을 새로 만들지 않는다.
 */
export { seoulToday };

/** 예정일이 오늘(한국 시간)보다 뒤인가. 예정일이 없으면 false. */
export function isFutureSessionDate(scheduledDate: string | null | undefined, today: string = seoulToday()): boolean {
  return Boolean(scheduledDate && scheduledDate > today);
}

/** date · timestamptz → "YYYY.MM.DD" (한국 시간). 값이 없으면 empty. */
export function formatServiceDate(value: string | null | undefined, empty = "미정"): string {
  return value ? formatDotDate(value) : empty;
}
