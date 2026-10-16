import { comparisonRows, pricingPackages } from "@/data/packages";

/**
 * 세 상품 비교 — 넓은 화면은 표, 좁은 화면은 상품별 카드.
 *
 * ── 왜 따로 떼어 냈나 ─────────────────────────────────────────────
 *
 * 같은 표가 홈 상품 섹션에만 있었고 공개 상품 안내(/pricing)에는 없었다.
 * 원장이 가격 페이지를 열면 세 상품이 **세로로 길게 쌓여** 있어 8주와 16주를
 * 나란히 비교할 수 없었다 — 아래로 스크롤하며 외워야 했다.
 *
 * 그래서 한 곳에서 만들어 두 화면이 같이 쓴다. 표가 갈라질 수 없다.
 *
 * ★ 값은 전부 `src/data/packages.ts` 에서 읽는다. 이 파일은 숫자를 만들지 않는다.
 * ★ 「준비 중」을 숨기지 않는다. 칸 안에 글자로 그대로 적는다 — 체크 표시만
 *   달면 아직 제공하지 않는 것을 판매 확정으로 읽게 된다.
 */
export function PackageComparison({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      {/* 넓은 화면 — 가로로 나란히 둬야 비교가 된다 */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse overflow-hidden rounded-2xl border border-line text-sm">
          <caption className="sr-only">
            STARTER · STANDARD · PREMIUM 세 상품의 적합한 원, 운영 내용, 기간, 수업, 구성, 비용 비교
          </caption>
          <thead>
            <tr className="bg-ivory text-navy">
              <th scope="col" className="w-40 px-5 py-4 text-left font-semibold text-ink-muted">
                <span className="sr-only">구분</span>
              </th>
              {pricingPackages.map((pkg) => (
                <th key={pkg.id} scope="col" className="px-5 py-4 text-left font-bold">
                  {pkg.name}
                  <span className="ml-1.5 text-caption font-semibold text-ink-muted">
                    {pkg.durationWeeks}주
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row, rowIndex) => (
              <tr key={row.label} className={rowIndex % 2 === 1 ? "bg-ivory/50" : "bg-white"}>
                <th scope="row" className="px-5 py-3.5 text-left font-semibold text-ink-muted">
                  {row.label}
                </th>
                {row.values.map((value, index) => (
                  <td key={index} className="px-5 py-3.5 align-top text-navy/75">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 좁은 화면 — 표를 옆으로 밀어 보게 하지 않는다 */}
      <div className="flex flex-col gap-4 sm:hidden">
        {pricingPackages.map((pkg, pkgIndex) => (
          <div key={pkg.id} className="rounded-xl border border-line bg-white p-5">
            <p className="text-sm font-bold text-navy">
              {pkg.name}
              <span className="ml-1.5 text-caption font-semibold text-ink-muted">
                {pkg.durationWeeks}주
              </span>
            </p>
            <dl className="mt-3 flex flex-col gap-2 text-caption">
              {comparisonRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-ink-muted">{row.label}</dt>
                  <dd className="text-right font-medium text-navy/75">{row.values[pkgIndex]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
