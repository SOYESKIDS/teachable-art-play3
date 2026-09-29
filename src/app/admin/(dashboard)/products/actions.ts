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

/**
 * 기능 출시 · 미출시 (PHASE 10C). 출시 상태는 audit RPC 로만 바꾼다 — 직접 UPDATE 권한 없음.
 * HQ Admin · 사유 필수 · 동시 수정 검사 · 결정 대기(blocked_by) 기능 출시 거부는 DB 가 최종 판정한다 (CP001~CP004).
 */
export async function setCapabilityReleasedAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const code = String(formData.get("code") ?? "");
  const releasedValue = String(formData.get("released") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "");

  if (!isFeatureCode(code) || (releasedValue !== "true" && releasedValue !== "false") || !expectedUpdatedAt) {
    return { phase: "error", message: "요청 값을 확인할 수 없습니다." };
  }
  if (!reason) return { phase: "error", message: "출시 · 미출시 변경 사유를 입력해 주세요." };
  if (reason.length > 500) return { phase: "error", message: "사유는 500자 이내로 입력해 주세요." };

  const released = releasedValue === "true";
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("set_capability_release", {
    p_code: code,
    p_released: released,
    p_reason: reason,
    p_expected_updated_at: expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("capability release", error);
    return { phase: "error", message: toUserFacingError(error, FALLBACK).message };
  }

  refresh();
  return { phase: "success", message: released ? "기능을 출시 상태로 바꿨습니다." : "기능을 미출시 상태로 바꿨습니다." };
}
