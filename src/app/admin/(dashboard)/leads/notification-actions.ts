"use server";

import { guardWrite } from "@/lib/env/write-guard";
import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { runLeadNotificationDelivery } from "@/lib/admin/lead-notification-delivery";
import type { NotificationRunState } from "./notification-run-state";

/**
 * 상담 알림 전달 처리 실행 — 사용자 지시 항목 6.
 *
 * ★ 사람이 누른다. 스케줄을 등록하지 않는다.
 * ★ 실제 메일을 보내지 않는다 — adapter 가 비활성이다.
 *   그래서 "보냈다"가 아니라 "집어서 결과를 기록했다"를 돌려준다.
 * ★ HQ Admin 전용. claim RPC 가 DB 에서도 다시 확인한다 (LN401).
 *
 * ★ 이 파일의 런타임 export 는 async Server Action 하나뿐이다.
 *   타입·상수는 ./notification-run-state.ts 에 있다.
 */

export async function runNotificationDeliveryAction(): Promise<NotificationRunState> {
  guardWrite("app/admin/leads/notification-actions:runNotificationDeliveryAction");

  const { supabase } = await requireAdmin();

  const summary = await runLeadNotificationDelivery(supabase);

  if (summary.notInstalled) {
    return {
      phase: "error",
      message:
        "알림 전달 경로가 아직 적용되지 않았습니다. migration 적용 후 다시 시도해 주세요.",
      summary: null,
    };
  }

  if (!summary.ok) {
    return {
      phase: "error",
      message: "전달 처리 중 일부가 실패했습니다. 실패 목록을 확인해 주세요.",
      summary,
    };
  }

  refresh();

  if (summary.claimed === 0) {
    return {
      phase: "done",
      message:
        summary.reclaimed > 0
          ? `보낼 알림이 없습니다. 멈춰 있던 ${summary.reclaimed}건을 대기로 되돌렸습니다.`
          : "보낼 알림이 없습니다. 채널이 비활성이면 집어가지 않습니다.",
      summary,
    };
  }

  if (summary.adapterNotConfigured) {
    return {
      phase: "done",
      message: `${summary.claimed}건을 집었으나 메일 provider 가 설정되지 않아 보내지 못했습니다. 대기로 되돌렸습니다.`,
      summary,
    };
  }

  return {
    phase: "done",
    message: `전달 ${summary.sent}건 · 재시도 ${summary.retried}건 · 실패 ${summary.failed}건`,
    summary,
  };
}
