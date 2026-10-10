/**
 * 공개 홈 원장 화면 예시(DirectorDashboardSection) 전용 상태 배지 색.
 *
 * ★ release/public-site: 업무 화면이 쓰는 components/ui/surface.tsx 를 바꾸지 않으려고
 *   V4 상태 색만 여기에 따로 둔다 (design-final-polish 의 surface.tsx STATUS_TONE_CLASSES 와 같은 값).
 */
export type StatusTone =
  | "done"
  | "active"
  | "scheduled"
  | "pending"
  | "cancelled"
  | "neutral";

export const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  done: "border-success-border bg-success-soft text-success-text",
  active: "border-line-strong bg-primary-soft text-navy",
  scheduled: "border-info-border bg-info-soft text-info-text",
  pending: "border-warning-border bg-warning-soft text-warning-text",
  cancelled: "border-danger-border bg-danger-soft text-danger",
  neutral: "border-border-strong bg-white text-ink-muted",
};
