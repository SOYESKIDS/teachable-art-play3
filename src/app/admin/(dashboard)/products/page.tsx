import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import {
  FEATURE_LABELS,
  PRODUCT_VERSION_LIFECYCLE_LABELS,
  type FeatureCode,
  type ProductVersionLifecycle,
} from "@/lib/entitlement/labels";
import { CapabilityToggle, PublishVersionButton } from "./ProductControls";

export const metadata: Metadata = {
  title: "상품 · 기능 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

interface VersionRow {
  id: string;
  product_id: string;
  version_label: string;
  lifecycle: ProductVersionLifecycle;
  week_from: number;
  week_to: number;
  children_per_class: number;
  max_classes: number | null;
  updated_at: string;
  product_version_features: { feature_code: FeatureCode; ai_capabilities: string[] | null }[] | null;
}

function featureText(feature: { feature_code: FeatureCode; ai_capabilities: string[] | null }): string {
  const label = FEATURE_LABELS[feature.feature_code] ?? feature.feature_code;
  return feature.ai_capabilities && feature.ai_capabilities.length > 0 ? `${label} (${feature.ai_capabilities.join(" · ")})` : label;
}

/**
 * HQ 상품 버전 · 플랫폼 기능 (DEC-081 · DEC-082 · DEC-095).
 * 가격 · 결제 정보는 없다. 발행된 버전은 수정할 수 없고, 변경은 새 버전으로 한다.
 */
export default async function ProductsPage() {
  const { supabase } = await requireAdmin();

  const [productResult, versionResult, capabilityResult] = await Promise.all([
    supabase.from("products").select("id, code, offer_type, display_name").order("code"),
    supabase
      .from("product_versions")
      .select(
        "id, product_id, version_label, lifecycle, week_from, week_to, children_per_class, max_classes, updated_at, product_version_features(feature_code, ai_capabilities)",
      )
      .order("version_label", { ascending: false }),
    supabase.from("platform_capabilities").select("code, is_released, blocked_by, note").order("code"),
  ]);

  const failed = productResult.error || versionResult.error || capabilityResult.error;
  if (failed) {
    console.error(`[admin/products] load failed: code=${failed.code ?? "unknown"}`);
  }

  const products = (productResult.data ?? []) as { id: string; code: string; offer_type: string; display_name: string }[];
  const versions = (versionResult.data ?? []) as unknown as VersionRow[];
  const capabilities = (capabilityResult.data ?? []) as {
    code: FeatureCode;
    is_released: boolean;
    blocked_by: string[];
    note: string | null;
  }[];

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 py-8 lg:px-8">
      <h1 className="text-[22px] font-bold text-navy">상품 · 기능</h1>
      <p className="mt-1 text-[13px] text-ink-muted">
        계약은 발행된 상품 버전으로만 만들 수 있습니다. 발행한 버전은 수정할 수 없으며, 변경이 필요하면 새 버전을 만듭니다.
      </p>

      {failed ? (
        <p className="mt-6 rounded-lg border border-danger/20 bg-danger-soft px-4 py-6 text-center text-[14px] text-danger">
          상품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : (
        <>
          <section className="mt-6 flex flex-col gap-4" aria-label="상품 버전">
            {products.map((product) => {
              const productVersions = versions.filter((version) => version.product_id === product.id);
              return (
                <article key={product.id} className="rounded-xl border border-navy/10 bg-white p-5">
                  <h2 className="text-[16px] font-bold text-ink">
                    {product.display_name}
                    <span className="ml-2 text-[12px] font-medium text-ink-muted">
                      {product.offer_type === "pilot" ? "Pilot" : "정규"}
                    </span>
                  </h2>
                  {productVersions.length === 0 ? (
                    <p className="mt-2 text-[13px] text-ink-muted">등록된 버전이 없습니다.</p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-3">
                      {productVersions.map((version) => (
                        <li key={version.id} className="rounded-lg border border-navy/10 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[14px] font-semibold text-ink">
                              {version.version_label}
                              <span className="ml-2 rounded-md border border-navy/15 bg-surface-soft px-2 py-0.5 text-[12px] font-semibold text-ink">
                                {PRODUCT_VERSION_LIFECYCLE_LABELS[version.lifecycle]}
                              </span>
                            </p>
                            {version.lifecycle === "draft" ? (
                              <PublishVersionButton
                                versionId={version.id}
                                versionLabel={version.version_label}
                                productName={product.display_name}
                                expectedUpdatedAt={version.updated_at}
                              />
                            ) : null}
                          </div>
                          <dl className="mt-2 grid gap-1 text-[13px] text-ink sm:grid-cols-3">
                            <div>
                              <dt className="inline text-ink-muted">약속 week </dt>
                              <dd className="inline">
                                {version.week_from}~{version.week_to}
                              </dd>
                            </div>
                            <div>
                              <dt className="inline text-ink-muted">반당 기준 인원 </dt>
                              <dd className="inline">{version.children_per_class}명</dd>
                            </div>
                            <div>
                              <dt className="inline text-ink-muted">최대 반 수 </dt>
                              <dd className="inline">{version.max_classes ?? "제한 없음"}</dd>
                            </div>
                          </dl>
                          <p className="mt-2 text-[13px] leading-relaxed text-ink">
                            <span className="text-ink-muted">포함 기능 </span>
                            {(version.product_version_features ?? []).map(featureText).join(" · ") || "없음"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </section>

          <section className="mt-8 rounded-xl border border-navy/10 bg-white p-5" aria-labelledby="capability-title">
            <h2 id="capability-title" className="text-[16px] font-bold text-ink">
              플랫폼 기능 출시 상태
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              계약 활성화는 상품에 포함된 기능이 모두 출시된 경우에만 가능합니다(활성화 시점 판정). 정책 결정 대기 기능은 이 화면에서 출시할 수 없습니다.
            </p>
            <ul className="mt-3 flex flex-col divide-y divide-navy/8">
              {capabilities.map((capability) => (
                <li key={capability.code} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink">{FEATURE_LABELS[capability.code] ?? capability.code}</p>
                    <p className="text-[12px] text-ink-muted">
                      {capability.blocked_by.length > 0
                        ? `결정 대기: ${capability.blocked_by.join(", ")}`
                        : capability.is_released
                          ? "출시됨"
                          : "미출시"}
                    </p>
                  </div>
                  <CapabilityToggle
                    code={capability.code}
                    released={capability.is_released}
                    blocked={capability.blocked_by.length > 0}
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
