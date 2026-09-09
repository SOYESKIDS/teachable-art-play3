import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  benefitItems,
  benefitsCopy,
  differentiatorColumns,
  differentiatorCopy,
  differentiatorRows,
  operationMetrics,
  operationMetricsCopy,
} from "@/data/site-copy";

const accentBar: Record<string, string> = {
  "pale-yellow": "bg-pale-yellow",
  "light-blue": "bg-light-blue",
  "soft-coral": "bg-soft-coral",
  "soft-green": "bg-soft-green",
};

export function BenefitsSection() {
  return (
    <section
      id="benefits"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader headline={benefitsCopy.headline} subCopy={benefitsCopy.subCopy} />

        {/* Neutral Surface + Role Accent — Director/Teacher가 B2B 구매결정에 더 가까워 먼저 배치 */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {benefitItems.map((item) => (
            <div
              key={item.code}
              className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-[var(--shadow-soft)] sm:p-9"
            >
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 top-0 h-1.5 ${accentBar[item.accent]}`}
              />
              <p className="text-xs font-bold tracking-wide text-navy/45">{item.code}</p>
              <p className="mt-3 text-base font-semibold text-navy/70">{item.role}</p>
              <h3 className="mt-1.5 text-2xl font-bold text-navy sm:text-3xl">{item.tag}</h3>
              <p className="mt-3 text-base leading-relaxed text-navy/60">
                {item.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-navy/60"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/*
          ── WHAT WE MEASURE ────────────────────────────────────────────
          ★ 이 블록이 이 페이지에서 가장 조심스러운 부분이다.
            "창의성 +37%", "만족도 98%" 같은 수치는 만들지 않는다.
            대신 분자와 분모가 분명해 기관이 대시보드에서 직접 셀 수 있는
            운영지표 넷만 말한다. 과장하지 않는 것이 신뢰 전략이다.

          ★ Section을 새로 만들지 않고 여기에 흡수했다.
            top-level section 수를 늘리지 않기 위해서다.
        */}
        <div className="mt-20 border-t border-line pt-16">
          <p className="eyebrow text-trust-blue">{operationMetricsCopy.eyebrow}</p>
          <h3 className="mt-3 max-w-3xl whitespace-pre-line text-h3 font-bold text-navy">
            {operationMetricsCopy.headline}
          </h3>
          <p className="measure mt-3 text-[15px] leading-relaxed text-navy/60">
            {operationMetricsCopy.subCopy}
          </p>

          <dl className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {operationMetrics.map((metric) => (
              <div
                key={metric.order}
                className="rounded-2xl border border-line bg-ivory px-6 py-7"
              >
                <p className="text-xs font-bold tracking-wide text-navy/40">
                  {metric.order}
                </p>
                <dt className="mt-2.5 text-lg font-bold text-navy">{metric.title}</dt>
                <p className="mt-2 break-keep rounded-md bg-white px-2.5 py-1.5 text-center text-[13px] font-semibold tabular-nums text-trust-blue">
                  {metric.formula}
                </p>
                <dd className="mt-3 break-keep text-[13px] leading-relaxed text-navy/55">
                  {metric.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/*
          ── WHY DIFFERENT ──────────────────────────────────────────────
          ★ 경쟁사 실명을 쓰지 않는다. 비교 대상은 서비스가 아니라 운영유형이다.
            우리 열만 분명하게 만들고, 다른 열을 비방하지 않는다.
            360px에서는 표가 성립하지 않으므로 가로 스크롤 대신
            아래 카드 목록으로 완전히 다른 구조를 쓴다.
        */}
        <div className="mt-20 border-t border-line pt-16">
          <p className="eyebrow text-trust-blue">{differentiatorCopy.eyebrow}</p>
          <h3 className="mt-3 max-w-3xl whitespace-pre-line text-h3 font-bold text-navy">
            {differentiatorCopy.headline}
          </h3>

          {/* Desktop / Tablet — 표 */}
          <div className="mt-10 hidden sm:block">
            <table className="w-full border-collapse overflow-hidden rounded-2xl border border-line text-sm">
              <thead>
                <tr className="bg-ivory">
                  <th className="w-44 px-5 py-4 text-left font-semibold text-navy/45" />
                  {differentiatorColumns.map((column, index) => (
                    <th
                      key={column}
                      className={`px-5 py-4 text-left font-bold ${
                        index === differentiatorColumns.length - 1
                          ? "bg-navy text-white"
                          : "text-navy/60"
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {differentiatorRows.map((row, rowIndex) => (
                  <tr
                    key={row.label}
                    className={rowIndex % 2 === 1 ? "bg-ivory/50" : "bg-white"}
                  >
                    <th className="px-5 py-3.5 text-left font-semibold text-navy/60">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => {
                      const isOurs = index === row.values.length - 1;
                      return (
                        <td
                          key={index}
                          className={`px-5 py-3.5 ${isOurs ? "bg-navy/[0.04]" : ""}`}
                        >
                          <MarkIcon supported={value} emphasized={isOurs} />
                          <span className="sr-only">
                            {value ? "제공" : "제공하지 않음"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile — 우리 열만 목록으로. 360px에서 가로 스크롤을 만들지 않는다 */}
          <ul className="mt-8 flex flex-col gap-2 sm:hidden">
            {differentiatorRows.map((row) => (
              <li
                key={row.label}
                className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3"
              >
                <MarkIcon supported={row.values[2]} emphasized />
                <span className="text-[15px] font-semibold text-navy">{row.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] leading-relaxed text-navy/45 sm:hidden">
            {`${differentiatorColumns[2]} 기준입니다.`}
          </p>

          <p className="mt-6 text-xs leading-relaxed text-navy/45">
            {differentiatorCopy.note}
          </p>
        </div>
      </Container>
    </section>
  );
}

/** 제공 여부 표시 — 색만으로 구분하지 않도록 모양 자체를 다르게 둔다 */
function MarkIcon({
  supported,
  emphasized,
}: {
  supported: boolean;
  emphasized?: boolean;
}) {
  if (!supported) {
    return (
      <svg
        viewBox="0 0 20 20"
        className="h-5 w-5 shrink-0 text-navy/20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M5 10h10" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-5 w-5 shrink-0 ${emphasized ? "text-trust-blue" : "text-navy/35"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 10.5 8.5 14.5 15.5 6" />
    </svg>
  );
}
