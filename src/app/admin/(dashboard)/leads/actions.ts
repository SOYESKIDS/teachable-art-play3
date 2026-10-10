"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { LEAD_STATUSES } from "@/lib/admin/lead-filters";
import type { LeadStatus } from "@/types/lead";
import type { StatusUpdateState } from "./status-state";
import { STATUS_UPDATE_FAILURE, statusUpdateOutcome } from "./status-outcome";

/**
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 * 타입/상수는 ./status-state.ts에 있다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GENERIC_FAILURE = STATUS_UPDATE_FAILURE;

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
  // ★ 수정된 행(id · status)을 돌려받아, 정확히 1행이 요청대로 바뀌었는지 확인한다 (status-outcome.ts).
  //   RLS 가 막거나 id 가 없으면 PostgREST 는 오류 없이 0행을 돌려준다.
  const { data, error } = await supabase
    .from("lead_submissions")
    .update({ status: nextStatus as LeadStatus })
    .eq("id", leadId)
    .select("id, status");

  const outcome = statusUpdateOutcome({ data, error }, { id: leadId, status: nextStatus });
  if (outcome.phase === "error") {
    console.error("[admin/leads] status update not applied:", {
      reason: outcome.reason,
      rows: outcome.rows,
      code: error?.code ?? null,
    });
    // 실패해도 화면은 서버의 실제 값으로 다시 그린다 — 화면만 바뀐 상태를 남기지 않는다.
    refresh();
    return { phase: "error", message: outcome.message };
  }

  // 목록은 완전 동적 렌더이므로 Client Router만 갱신하면 된다 (Next.js 16 권장).
  refresh();

  return { phase: "success", message: null };
}
