import type { SupabaseClient } from "@supabase/supabase-js";
import { isServiceMode, type FeatureCode, type ServiceMode } from "./labels";

/**
 * 화면 분기용 entitlement 조회 (DEC-083 · DEC-106).
 *
 * ★ 이 결과는 메뉴 · 버튼 · 상태 화면을 정하는 데만 쓴다.
 *   실제 권한은 RPC · trigger · RLS 가 매번 다시 판정한다.
 * ★ 실패하면 "아무 기능도 없음"으로 닫는다 (fail closed).
 */

export interface OrganizationEntitlements {
  serviceMode: ServiceMode;
  productCode: string | null;
  offerType: "regular" | "pilot" | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  weekFrom: number | null;
  weekTo: number | null;
  childrenPerClass: number | null;
  features: FeatureCode[];
}

export interface ClassEntitlements {
  serviceMode: ServiceMode;
  inContractScope: boolean;
  classModeWrite: boolean;
  weeklyReportWrite: boolean;
  /** 계약 ∧ 출시. 출시 전에는 계약에 있어도 false 다 (P1) */
  monthlyReportWrite: boolean;
  /** 계약 ∧ 출시 (P2) */
  semesterReportWrite: boolean;
  /** 계약 ∧ 출시. 반별 일괄 인쇄 (P1) */
  bulkPrint: boolean;
  aiC1: boolean;
}

const CLOSED_ORG: OrganizationEntitlements = {
  serviceMode: "no_contract",
  productCode: null,
  offerType: null,
  contractStartDate: null,
  contractEndDate: null,
  weekFrom: null,
  weekTo: null,
  childrenPerClass: null,
  features: [],
};

const CLOSED_CLASS: ClassEntitlements = {
  serviceMode: "no_contract",
  inContractScope: false,
  classModeWrite: false,
  weeklyReportWrite: false,
  monthlyReportWrite: false,
  semesterReportWrite: false,
  bulkPrint: false,
  aiC1: false,
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

export type OrganizationEntitlementResult =
  | { ok: true; entitlements: OrganizationEntitlements }
  | { ok: false; reason: "query_failed" | "invalid_response" };

/** 새 수업 입구는 조회 실패를 계약 없음으로 표시하지 않는다. */
export async function queryOrganizationEntitlements(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationEntitlementResult> {
  const { data, error } = await supabase.rpc("organization_entitlements", {
    p_organization_id: organizationId,
  });

  if (error || !data || typeof data !== "object") {
    if (error) console.error(`[entitlement] organization failed: code=${error.code ?? "unknown"}`);
    return { ok: false, reason: error ? "query_failed" : "invalid_response" };
  }

  const row = data as Record<string, unknown>;
  const offer = asString(row.offer_type);
  if (!isServiceMode(row.service_mode)) return { ok: false, reason: "invalid_response" };

  return { ok: true, entitlements: {
    serviceMode: row.service_mode,
    productCode: asString(row.product_code),
    offerType: offer === "regular" || offer === "pilot" ? offer : null,
    contractStartDate: asString(row.contract_start_date),
    contractEndDate: asString(row.contract_end_date),
    weekFrom: asNumber(row.week_from),
    weekTo: asNumber(row.week_to),
    childrenPerClass: asNumber(row.children_per_class),
    features: Array.isArray(row.features) ? (row.features.filter((f) => typeof f === "string") as FeatureCode[]) : [],
  } };
}

/** 기존 업무 화면은 이전과 같이 실패 시 닫힌 권한을 받는다. */
export async function fetchOrganizationEntitlements(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationEntitlements> {
  const result = await queryOrganizationEntitlements(supabase, organizationId);
  return result.ok ? result.entitlements : CLOSED_ORG;
}

export async function fetchClassEntitlements(supabase: SupabaseClient, classId: string): Promise<ClassEntitlements> {
  const { data, error } = await supabase.rpc("class_entitlements", { p_class_id: classId });

  if (error || !data || typeof data !== "object") {
    if (error) console.error(`[entitlement] class failed: code=${error.code ?? "unknown"}`);
    return CLOSED_CLASS;
  }

  const row = data as Record<string, unknown>;

  return {
    serviceMode: isServiceMode(row.service_mode) ? row.service_mode : "no_contract",
    inContractScope: row.in_contract_scope === true,
    classModeWrite: row.class_mode_write === true,
    weeklyReportWrite: row.weekly_report_write === true,
    // ★ 없는 key 는 false 다. 구 RPC 가 아직 적용된 환경에서 월간·학기·일괄
    //   인쇄를 열어 주지 않는다 (fail closed).
    monthlyReportWrite: row.monthly_report_write === true,
    semesterReportWrite: row.semester_report_write === true,
    bulkPrint: row.bulk_print === true,
    aiC1: row.ai_c1 === true,
  };
}

export function hasFeature(entitlements: OrganizationEntitlements, feature: FeatureCode): boolean {
  return entitlements.features.includes(feature);
}
