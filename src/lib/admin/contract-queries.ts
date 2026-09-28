import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContractStatus } from "@/lib/entitlement/labels";

/**
 * HQ 계약 · 이용권 조회 (DEC-081 · DEC-082 · DEC-095 · DEC-106).
 * Readiness 는 서버 RPC 결과를 그대로 보여 준다 (최종 판정은 서버).
 */

export interface ReadinessItem {
  code: string;
  ok: boolean;
  reason: string | null;
  detail: Record<string, unknown> | null;
}

export interface ContractView {
  id: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  statusReason: string | null;
  updatedAt: string;
  productName: string | null;
  versionLabel: string | null;
  offerType: "regular" | "pilot" | null;
  childrenPerClass: number | null;
  weekFrom: number | null;
  weekTo: number | null;
  maxClasses: number | null;
  features: { code: string; aiCapabilities: string[] | null }[];
  classes: { contractClassId: string; classId: string; className: string; activeChildren: number }[];
  readiness: { ready: boolean; items: ReadinessItem[] } | null;
}

export interface PublishedVersionOption {
  id: string;
  label: string;
}

function log(scope: string, code: string | undefined) {
  console.error(`[admin/contract] ${scope} failed: code=${code ?? "unknown"}`);
}

export async function fetchOrganizationContracts(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<{ ok: true; contracts: ContractView[]; versions: PublishedVersionOption[] } | { ok: false }> {
  const [contractResult, versionResult, classResult, childResult] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, status, start_date, end_date, status_reason, updated_at, product_version_id")
      .eq("organization_id", organizationId)
      .order("start_date", { ascending: false })
      .limit(50),
    supabase
      .from("product_versions")
      .select(
        "id, version_label, lifecycle, children_per_class, week_from, week_to, max_classes, product_id, products(display_name, offer_type), product_version_features(feature_code, ai_capabilities)",
      )
      .limit(100),
    supabase.from("classes").select("id, name").eq("organization_id", organizationId),
    supabase.from("children").select("class_id").eq("organization_id", organizationId).eq("status", "active").limit(2000),
  ]);

  const firstError = [contractResult, versionResult, classResult, childResult].find((result) => result.error);
  if (firstError?.error) {
    log("load", firstError.error.code);
    return { ok: false };
  }

  type VersionRow = {
    id: string;
    version_label: string;
    lifecycle: string;
    children_per_class: number;
    week_from: number;
    week_to: number;
    max_classes: number | null;
    product_version_features: { feature_code: string; ai_capabilities: string[] | null }[] | null;
    products: { display_name: string; offer_type: "regular" | "pilot" } | { display_name: string; offer_type: "regular" | "pilot" }[] | null;
  };

  const versions = (versionResult.data ?? []) as unknown as VersionRow[];
  const productOf = (row: VersionRow) => (Array.isArray(row.products) ? row.products[0] : row.products) ?? null;
  const versionById = new Map(versions.map((row) => [row.id, row]));
  const className = new Map(((classResult.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
  const childCount = new Map<string, number>();
  for (const row of (childResult.data ?? []) as { class_id: string | null }[]) {
    if (row.class_id) childCount.set(row.class_id, (childCount.get(row.class_id) ?? 0) + 1);
  }

  const contracts = (contractResult.data ?? []) as {
    id: string;
    status: ContractStatus;
    start_date: string;
    end_date: string;
    status_reason: string | null;
    updated_at: string;
    product_version_id: string;
  }[];

  let scopeRows: { id: string; contract_id: string; class_id: string }[] = [];
  if (contracts.length > 0) {
    const { data, error } = await supabase
      .from("contract_classes")
      .select("id, contract_id, class_id")
      .in(
        "contract_id",
        contracts.map((row) => row.id),
      );
    if (error) {
      log("scope", error.code);
      return { ok: false };
    }
    scopeRows = (data ?? []) as typeof scopeRows;
  }

  const readinessById = new Map<string, { ready: boolean; items: ReadinessItem[] }>();
  await Promise.all(
    contracts
      .filter((row) => row.status === "draft" || row.status === "active")
      .map(async (row) => {
        const { data, error } = await supabase.rpc("contract_readiness", { p_contract_id: row.id });
        if (error) {
          log("readiness", error.code);
          return;
        }
        const payload = (data ?? {}) as { ready?: boolean; items?: unknown[] };
        readinessById.set(row.id, {
          ready: payload.ready === true,
          items: (payload.items ?? []).map((item) => {
            const value = item as Record<string, unknown>;
            return {
              code: String(value.code ?? ""),
              ok: value.ok === true,
              reason: typeof value.reason === "string" ? value.reason : null,
              detail: typeof value.detail === "object" && value.detail !== null ? (value.detail as Record<string, unknown>) : null,
            };
          }),
        });
      }),
  );

  return {
    ok: true,
    versions: versions
      .filter((row) => row.lifecycle === "published")
      .map((row) => ({ id: row.id, label: `${productOf(row)?.display_name ?? "상품"} (${row.version_label})` })),
    contracts: contracts.map((row) => {
      const version = versionById.get(row.product_version_id) ?? null;
      const product = version ? productOf(version) : null;
      return {
        id: row.id,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        statusReason: row.status_reason,
        updatedAt: row.updated_at,
        productName: product?.display_name ?? null,
        versionLabel: version?.version_label ?? null,
        offerType: product?.offer_type ?? null,
        childrenPerClass: version?.children_per_class ?? null,
        weekFrom: version?.week_from ?? null,
        weekTo: version?.week_to ?? null,
        maxClasses: version?.max_classes ?? null,
        features: (version?.product_version_features ?? []).map((feature) => ({
          code: feature.feature_code,
          aiCapabilities: feature.ai_capabilities,
        })),
        classes: scopeRows
          .filter((scope) => scope.contract_id === row.id)
          .map((scope) => ({
            contractClassId: scope.id,
            classId: scope.class_id,
            className: className.get(scope.class_id) ?? "반 정보 없음",
            activeChildren: childCount.get(scope.class_id) ?? 0,
          })),
        readiness: readinessById.get(row.id) ?? null,
      };
    }),
  };
}
