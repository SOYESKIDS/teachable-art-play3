"use server";

import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/organization";
import { UUID_PATTERN, logRpcFailure, toUserFacingError } from "@/lib/errors/rpc-errors";

/**
 * Class Mode 서버 행동 (DEC-036 · DEC-046 · DEC-085 · DEC-098 · DEC-099).
 *
 * · 수업 시작 = BEFORE 필수 확인 기록 → start RPC (담당 교사만 · 서버가 최종 판정)
 * · 수업 마치기 = finish RPC (in_progress 만) → AFTER ① 출결로 이동
 * · 빠른 메모 = server autosave · author only · 동시성 토큰
 * status 를 직접 UPDATE 하지 않는다.
 */

export interface ClassModeActionState {
  phase: "idle" | "error";
  message: string | null;
}

const FALLBACK = "처리하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.";

function orgQuery(organizationId: string) {
  return `?org=${encodeURIComponent(organizationId)}`;
}

export async function startClassSessionFromBeforeAction(
  _prev: ClassModeActionState,
  formData: FormData,
): Promise<ClassModeActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const safety = formData.get("safetyConfirmed") === "on";
  const privacy = formData.get("privacyConfirmed") === "on";

  if (!UUID_PATTERN.test(sessionId) || !UUID_PATTERN.test(organizationId)) {
    return { phase: "error", message: "요청 값을 확인할 수 없습니다." };
  }

  if (!safety || !privacy) {
    return { phase: "error", message: "안전 확인과 사진·개인정보 확인을 모두 완료해 주세요." };
  }

  const { supabase } = await requireTeacher();

  const confirm = await supabase.rpc("confirm_session_before", {
    p_session_id: sessionId,
    p_safety_confirmed: true,
    p_privacy_confirmed: true,
  });

  if (confirm.error) {
    logRpcFailure("class-mode before", confirm.error);
    return { phase: "error", message: toUserFacingError(confirm.error, FALLBACK).message };
  }

  const start = await supabase.rpc("start_class_session", { p_session_id: sessionId });

  if (start.error) {
    logRpcFailure("class-mode start", start.error);
    return { phase: "error", message: toUserFacingError(start.error, FALLBACK).message };
  }

  redirect(`/teacher/sessions/${sessionId}/during${orgQuery(organizationId)}`);
}

export async function finishClassSessionAction(
  _prev: ClassModeActionState,
  formData: FormData,
): Promise<ClassModeActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");

  if (!UUID_PATTERN.test(sessionId) || !UUID_PATTERN.test(organizationId)) {
    return { phase: "error", message: "요청 값을 확인할 수 없습니다." };
  }

  const { supabase } = await requireTeacher();
  const { error } = await supabase.rpc("finish_class_session", { p_session_id: sessionId });

  if (error) {
    logRpcFailure("class-mode finish", error);
    return { phase: "error", message: toUserFacingError(error, FALLBACK).message };
  }

  // AFTER ① 출결 (class-mode-flow §6)
  redirect(`/teacher/sessions/${sessionId}/attendance${orgQuery(organizationId)}&after=1`);
}

export interface QuickMemoSaveResult {
  ok: boolean;
  updatedAt: string | null;
  message: string | null;
  conflict: boolean;
}

export async function saveQuickMemoAction(input: {
  sessionId: string;
  body: string;
  expectedUpdatedAt: string | null;
}): Promise<QuickMemoSaveResult> {
  if (!UUID_PATTERN.test(input.sessionId) || typeof input.body !== "string" || input.body.length > 2000) {
    return { ok: false, updatedAt: null, message: "메모는 2,000자 이내로 입력해 주세요.", conflict: false };
  }

  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.rpc("save_quick_memo", {
    p_session_id: input.sessionId,
    p_body: input.body,
    p_expected_updated_at: input.expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("class-mode memo", error);
    const mapped = toUserFacingError(error, "저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.");
    return { ok: false, updatedAt: null, message: mapped.message, conflict: mapped.kind === "conflict" };
  }

  const row = (data ?? {}) as { updated_at?: string | null };
  return { ok: true, updatedAt: row.updated_at ?? null, message: null, conflict: false };
}
