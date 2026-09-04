import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PricingCardGrid } from "./PricingCardGrid";
import { comparisonRows, priceDisclaimerLines, pricingPackages } from "@/data/packages";
import { pricingCopy } from "@/data/site-copy";

/**
 * 상품 비교 화면.
 *
 * ★ 여기는 "고르는 곳"이지 "읽는 곳"이 아니다.
 *   8·16·24주 상세를 이 아래에 이어 붙이지 않는다. 비교하러 온 사람에게
 *   세 상품의 설명을 전부 펼쳐 보이면 비교 자체가 불가능해진다.
 *   상세는 카드에서 열리는 오버레이와 /programs/<slug> 로만 간다.
 *
 * ★ 카드만 client 다.
 *   비교표는 상호작용이 없으므로 서버 컴포넌트로 남긴다.
 */
export function PricingSection() {
  return (
    <section
      id="pricing"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-20 sm:py-24 lg:py-32"
    >
      <Container>
        <SectionHeader headline={pricingCopy.headline} subCopy={pricingCopy.subCopy} />

        <PricingCardGrid />

        <div className="mt-6 text-center text-xs leading-relaxed text-navy/45">
          {priceDisclaimerLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        {/* 비교표 — Desktop: Table / Mobile: Card */}
        <div className="mt-16">
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse overflow-hidden rounded-2xl border border-navy/10 text-sm">
              <thead>
                <tr className="bg-ivory text-navy">
                  <th className="w-40 px-5 py-4 text-left font-semibold text-navy/50" />
                  {pricingPackages.map((pkg) => (
                    <th key={pkg.id} className="px-5 py-4 text-left font-bold">
                      {pkg.name}
                      {pkg.isBest && (
                        <span className="ml-2 rounded-full bg-yellow px-2 py-0.5 text-[10px] font-bold text-navy">
                          BEST
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, rowIndex) => (
                  <tr
                    key={row.label}
                    className={rowIndex % 2 === 1 ? "bg-ivory/50" : "bg-white"}
                  >
                    <th className="px-5 py-3.5 text-left font-semibold text-navy/50">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td key={index} className="px-5 py-3.5 text-navy/75">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 sm:hidden">
            {pricingPackages.map((pkg, pkgIndex) => (
              <div key={pkg.id} className="rounded-xl border border-navy/10 bg-white p-5">
                <p className="text-sm font-bold text-navy">
                  {pkg.name}
                  {pkg.isBest && (
                    <span className="ml-2 rounded-full bg-yellow px-2 py-0.5 text-[10px] font-bold text-navy">
                      BEST
                    </span>
                  )}
                </p>
                <dl className="mt-3 flex flex-col gap-2 text-xs">
                  {comparisonRows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-3">
                      <dt className="text-navy/45">{row.label}</dt>
                      <dd className="text-right font-medium text-navy/75">
                        {row.values[pkgIndex]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
