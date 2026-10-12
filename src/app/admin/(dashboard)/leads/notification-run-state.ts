import type { DeliveryRunSummary } from "@/lib/admin/lead-notification-delivery";

/**
 * 알림 전달 실행 상태 타입·상수.
 *
 * ★ `notification-actions.ts` 는 `"use server"` 파일이라 런타임 export 가
 *   async Server Action 함수뿐이어야 한다. 타입과 상수는 이 파일에 둔다
 *   (`status-state.ts` 와 같은 관례).
 */

export interface NotificationRunState {
  phase: "idle" | "done" | "error";
  message: string | null;
  summary: DeliveryRunSummary | null;
}

export const NOTIFICATION_RUN_INITIAL: NotificationRunState = {
  phase: "idle",
  message: null,
  summary: null,
};
