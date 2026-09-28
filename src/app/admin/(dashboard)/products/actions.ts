"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { UUID_PATTERN, logRpcFailure, toUserFacingError } from "@/lib/errors/rpc-errors";
import { FEATURE_LABELS, type FeatureCode } from "@/lib/entitlement/labels";

/**
 * 상품 버전 발행 · 기능 출시 (DEC-081 · DEC-082 · DEC-095).
 *
 * · 발행된 버전은 수정할 수 없다 (서버 trigger 가 최종 판정)
 * · 결정 대기(blocked_by)가 있는 기능은 여기서 출시할 수 없다 — blocked_by 해제는
 *   OPEN 항목(CO-12 · AR-8 · CO-8 등) 결정 이후 별도 절차로만 한다
 */

export interface ProductActionState {
  phase: "idle" | "success" | "error";
  message: string | null;
}

const FALLBACK = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export async function publishProductVersionAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const versionId = String(formData.get("versionId") ?? "");
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "");
  const expectedLabel = String(formData.get("expectedLabel") ?? "");
  const typedLabel = String(formData.get("confirmLabel") ?? "").trim();

  if (!UUID_PATTERN.test(versionId) || !expectedUpdatedAt) return { phase: "error", message: "요청 값을 확인할 수 없습니다." };
  if (typedLabel === "" || typedLabel !== expectedLabel) {
    return { phase: "error", message: "확인을 위해 버전 이름을 정확히 입력해 주세요." };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("publish_product_version", {
    p_product_version_id: versionId,
    p_expected_updated_at: expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("product version publish", error);
    return { phase: "error", message: toUserFacingError(error, FALLBACK).message };
  }

  refresh();
  return { phase: "success", message: "상품 버전을 발행했습니다." };
}

function isFeatureCode(value: string): value is FeatureCode {
  return Object.prototype.hasOwnProperty.call(FEATURE_LABELS, value);
}

export async function setCapabilityReleasedAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const code = String(formData.get("code") ?? "");
  const released = String(formData.get("released") ?? "") === "true";

  if (!isFeatureCode(code)) return { phase: "error", message: "요청 값을 확인할 수 없습니다." };

  const { supabase } = await requireAdmin();

  // 결정 대기 기능은 출시하지 않는다 (서버 판정 capability_released 도 blocked_by 를 본다)
  const { data: current, error: readError } = await supabase
    .from("platform_capabilities")
    .select("blocked_by")
    .eq("code", code)
    .maybeSingle();

  if (readError || !current) {
    if (readError) logRpcFailure("capability read", readError);
    return { phase: "error", message: FALLBACK };
  }
  if (released && Array.isArray(current.blocked_by) && current.blocked_by.length > 0) {
    return { phase: "error", message: "정책 결정 대기 중인 기능은 출시할 수 없습니다." };
  }

  const { data, error } = await supabase
    .from("platform_capabilities")
    .update({ is_released: released })
    .eq("code", code)
    .select("code");

  if (error || !data || data.length === 0) {
    if (error) logRpcFailure("capability update", error);
    return { phase: "error", message: error ? toUserFacingError(error, FALLBACK).message : "권한이 없습니다." };
  }

  refresh();
  return { phase: "success", message: released ? "기능을 출시 상태로 바꿨습니다." : "기능을 미출시 상태로 바꿨습니다." };
}
