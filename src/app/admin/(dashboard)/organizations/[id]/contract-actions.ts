"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { UUID_PATTERN, logRpcFailure, toUserFacingError } from "@/lib/errors/rpc-errors";

/**
 * HQ 계약 · 이용권 (DEC-050 · DEC-081 · DEC-082 · DEC-106).
 *
 * · 계약은 초안으로만 만들고, 활성화는 서버 Readiness 가 모두 통과해야 한다 (결제 무관)
 * · 동시 유효 계약 1개 (Pilot 포함) — 서버가 판정
 * · 정지 · 재개 · 종료 · 활성 계약 기간 변경은 사유 필수
 * · 가짜 계약 자동 생성 없음 (DB-7)
 */

export interface ContractActionState {
  phase: "idle" | "success" | "error";
  message: string | null;
}

const FALLBACK = "계약 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function fail(message: string): ContractActionState {
  return { phase: "error", message };
}

export async function createContractAction(_prev: ContractActionState, formData: FormData): Promise<ContractActionState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const productVersionId = String(formData.get("productVersionId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(productVersionId)) return fail("상품 버전을 선택해 주세요.");
  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate) || endDate < startDate) {
    return fail("이용 기간을 올바르게 입력해 주세요.");
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("contracts").insert({
    organization_id: organizationId,
    product_version_id: productVersionId,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    logRpcFailure("contract create", error);
    return fail(toUserFacingError(error, FALLBACK).message);
  }

  refresh();
  return { phase: "success", message: "계약 초안을 만들었습니다." };
}

export async function addContractClassAction(_prev: ContractActionState, formData: FormData): Promise<ContractActionState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const contractId = String(formData.get("contractId") ?? "");
  const classId = String(formData.get("classId") ?? "");

  if (![organizationId, contractId, classId].every((value) => UUID_PATTERN.test(value))) return fail("반을 선택해 주세요.");

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("contract_classes")
    .insert({ organization_id: organizationId, contract_id: contractId, class_id: classId });

  if (error) {
    logRpcFailure("contract class add", error);
    return fail(error.code === "23505" ? "이미 계약 범위에 있는 반입니다." : toUserFacingError(error, FALLBACK).message);
  }

  refresh();
  return { phase: "success", message: "계약 반 범위에 추가했습니다." };
}

export async function removeContractClassAction(formData: FormData): Promise<void> {
  const contractClassId = String(formData.get("contractClassId") ?? "");
  if (!UUID_PATTERN.test(contractClassId)) return;

  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("contract_classes").delete().eq("id", contractClassId);
  if (error) logRpcFailure("contract class remove", error);
  refresh();
}

export async function activateContractAction(_prev: ContractActionState, formData: FormData): Promise<ContractActionState> {
  const contractId = String(formData.get("contractId") ?? "");
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "");

  if (!UUID_PATTERN.test(contractId) || !expectedUpdatedAt) return fail("요청 값을 확인할 수 없습니다.");

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("activate_contract", {
    p_contract_id: contractId,
    p_expected_updated_at: expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("contract activate", error);
    return fail(toUserFacingError(error, FALLBACK).message);
  }

  refresh();
  return { phase: "success", message: "계약을 활성화했습니다." };
}

export async function changeContractStatusAction(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const contractId = String(formData.get("contractId") ?? "");
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "");

  if (!UUID_PATTERN.test(contractId) || !["suspended", "active", "ended"].includes(status) || !expectedUpdatedAt) {
    return fail("요청 값을 확인할 수 없습니다.");
  }
  if (!reason) return fail("사유를 입력해 주세요.");
  if (reason.length > 500) return fail("사유는 500자 이내로 입력해 주세요.");

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("change_contract_status", {
    p_contract_id: contractId,
    p_status: status,
    p_reason: reason,
    p_expected_updated_at: expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("contract status", error);
    return fail(toUserFacingError(error, FALLBACK).message);
  }

  refresh();
  return { phase: "success", message: "계약 상태를 변경했습니다." };
}
