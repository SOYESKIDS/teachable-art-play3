"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/lib/auth/organization";
import { UUID_PATTERN, logRpcFailure, toUserFacingError } from "@/lib/errors/rpc-errors";
import type { StaffSessionFormState } from "./session-state";

/**
 * 원장 · 교사 수업 상태 변경 (PHASE 07 · DEC-046 · DEC-047 · DEC-085 · DEC-098).
 *
 * ★ class_sessions.status 를 직접 UPDATE 하지 않는다.
 *   모든 전환은 RPC → class_session_transitions → DEFINER trigger 가 검증한다.
 *   · 수업 시작 · 수업 마치기: Class Mode (BEFORE · DURING) 화면에서만 (class-mode-actions.ts)
 *   · 복구 처리: Director · HQ Admin · in_progress 만 · 사유 필수 · audit
 *   · 취소: 현재 확정 범위 그대로 (확대 없음)
 *   · scheduled → completed: 어떤 경로도 없음
 *
 * Client 에서 organization_id · class_id 를 받지 않는다. sessionId 와 사유뿐이다.
 */

const FALLBACK = "수업 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.";

function error(message: string): StaffSessionFormState {
  return { phase: "error", message };
}

export async function cancelStaffSessionAction(
  _prevState: StaffSessionFormState,
  formData: FormData,
): Promise<StaffSessionFormState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!UUID_PATTERN.test(sessionId)) return error("요청 값을 확인할 수 없습니다.");
  if (reason.length > 500) return error("사유는 500자 이내로 입력해 주세요.");

  const { supabase } = await requireStaff();
  const { error: rpcError } = await supabase.rpc("cancel_class_session", {
    p_session_id: sessionId,
    p_reason: reason || null,
  });

  if (rpcError) {
    logRpcFailure("staff/session cancel", rpcError);
    return error(toUserFacingError(rpcError, FALLBACK).message);
  }

  refresh();
  return { phase: "success", message: "수업을 취소했습니다." };
}

export async function recoverStaffSessionAction(
  _prevState: StaffSessionFormState,
  formData: FormData,
): Promise<StaffSessionFormState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!UUID_PATTERN.test(sessionId)) return error("요청 값을 확인할 수 없습니다.");
  if (!reason) return error("복구 처리 사유를 입력해 주세요.");
  if (reason.length > 500) return error("사유는 500자 이내로 입력해 주세요.");

  const { supabase } = await requireStaff();
  const { error: rpcError } = await supabase.rpc("recover_complete_class_session", {
    p_session_id: sessionId,
    p_reason: reason,
  });

  if (rpcError) {
    logRpcFailure("staff/session recovery", rpcError);
    return error(toUserFacingError(rpcError, FALLBACK).message);
  }

  refresh();
  return { phase: "success", message: "복구 처리했습니다. 수업 종료 · 복구 처리로 기록되었습니다." };
}
