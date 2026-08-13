"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { LEAD_STATUSES } from "@/lib/admin/lead-filters";
import type { LeadStatus } from "@/types/lead";
import type { StatusUpdateState } from "./status-state";

/**
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 * 타입/상수는 ./status-state.ts에 있다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GENERIC_FAILURE = "상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.";

export async function updateLeadStatusAction(
  _prevState: StatusUpdateState,
  formData: FormData,
): Promise<StatusUpdateState> {
  const leadId = String(formData.get("leadId") ?? "");
  const nextStatus = String(formData.get("status") ?? "");

  if (
    !UUID_PATTERN.test(leadId) ||
    !LEAD_STATUSES.includes(nextStatus as LeadStatus)
  ) {
    return { phase: "error", message: GENERIC_FAILURE };
  }

  // Server Action은 Proxy 게이트와 무관하게 독립적으로 권한을 재확인한다.
  const { supabase } = await requireAdmin();

  // status 단일 컬럼만 UPDATE한다.
  // DB에서도 grant update (status)로 다른 컬럼 변경이 차단되어 있다.
  const { error } = await supabase
    .from("lead_submissions")
    .update({ status: nextStatus as LeadStatus })
    .eq("id", leadId);

  if (error) {
    console.error("[admin/leads] status update failed:", error.message);
    return { phase: "error", message: GENERIC_FAILURE };
  }

  // 목록은 완전 동적 렌더이므로 Client Router만 갱신하면 된다 (Next.js 16 권장).
  refresh();

  return { phase: "success", message: null };
}
