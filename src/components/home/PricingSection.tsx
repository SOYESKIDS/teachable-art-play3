import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PricingCardGrid } from "./PricingCardGrid";
import { comparisonRows, priceDisclaimerLines, pricingPackages } from "@/data/packages";
import { packageScenarioCopy, packageScenarios, pricingCopy } from "@/data/site-copy";
import { PROGRAM_PRODUCTS, programPath } from "@/data/program-products";

/**
 * 값을 고르기 전에 무엇을 고르는지 한 번 보여 준다.
 *
 * ★ 여기에 8주 상세를 붙이지 않는다.
 *   보이는 것은 대표 프로그램의 이름과 여덟 주가 그리는 성장의 순서,
 *   그리고 대표 결과물 셋까지다. 주차별 활동 · 그림책 · 핵심 메시지는
 *   /programs/starter 에만 있다.
 *
 * ★ 값을 여기에 다시 적지 않는다.
 *   성장 지점도 결과물 이름도 PROGRAM_PRODUCTS 에서 그대로 읽어 온다 —
 *   상세 페이지와 홈페이지가 다른 말을 할 자리를 만들지 않는다.
 */
function StarterShowcase() {
  const starter = PROGRAM_PRODUCTS.starter;
  const weeks = starter.curriculum?.weeks ?? [];
  if (weeks.length === 0 || !starter.story) return null;

  // 대표 결과물 셋 — 처음 · 가운데 · 마지막에서 하나씩 뽑는다.
  const highlights = [weeks[0], weeks[3], weeks[weeks.length - 1]]
    .map((w) => w?.takeHome?.title)
    .filter((t): t is string => Boolean(t));

  return (
    <div className="mt-14 overflow-hidden rounded-[var(--radius-card)] border border-line bg-ivory">
      <div className="grid grid-cols-1 lg:grid-cols-[42fr_58fr]">
        {/* 실제 수업 장면 — 이 프로그램이 교실에서 어떻게 보이는가 */}
        <div className="relative aspect-[16/10] w-full lg:aspect-auto lg:min-h-[320px]">
          <Image
            src="/images/site/hero/hero-class-movement.webp"
            alt="유치원 교실에서 아이들이 교사와 함께 두 팔을 벌리는 실제 수업 장면"
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="px-6 py-8 sm:px-9 sm:py-10">
          <p className="eyebrow text-trust-blue">
            {`${starter.pkg.name} · ${starter.pkg.durationWeeks} WEEKS`}
          </p>

          <h3 className="mt-2.5 text-h3 font-bold text-navy">
            {starter.story.headline}
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed text-navy/60">
            {starter.story.subCopy}
          </p>

          {/* 여덟 주가 그리는 성장의 순서 */}
          <ol className="mt-6 flex flex-wrap items-center gap-x-1.5 gap-y-2">
            {weeks.map((entry, index) => (
              <li key={entry.week} className="flex items-center gap-1.5">
                <span className="break-keep rounded-md border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-navy/75">
                  {entry.growthPoint}
                </span>
                {index < weeks.length - 1 ? (
                  <span aria-hidden="true" className="text-navy/25">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

          {highlights.length > 0 ? (
            <p className="mt-5 text-[13px] leading-relaxed text-navy/55">
              <span className="font-bold text-navy/45">대표 결과물</span>
              <span className="mx-2 text-navy/20">|</span>
              {highlights.join(" · ")}
            </p>
          ) : null}

          <Link
            href={programPath("starter")}
            className="mt-6 inline-flex min-h-12 items-center gap-1.5 rounded-full border border-line-strong bg-white px-5 text-sm font-bold text-navy transition-colors hover:border-navy/40 hover:bg-navy/[0.04]"
          >
            {`${starter.pkg.durationWeeks}주 프로그램 자세히 보기`}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

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

        <StarterShowcase />

        {/*
          ── 우리 원 규모에 맞는 시작 방법 ────────────────────────────
          ★ 가격표보다 먼저 온다.
            세 상품을 나란히 놓고 비교하게 하면 원장은 대부분 가장 싼 것을
            고르거나 결정을 미룬다. 반 수와 목적으로 먼저 나누면
            "고르는 문제"가 "확인하는 문제"로 바뀐다.

          ★ 추천(B)을 과하게 표시하지 않는다.
            테두리 한 겹과 작은 배지까지다. 세 카드의 크기는 같다.
        */}
        <div className="mt-16">
          <p className="eyebrow text-trust-blue">{packageScenarioCopy.eyebrow}</p>
          <h3 className="mt-3 text-h3 font-bold text-navy">
            {packageScenarioCopy.headline}
          </h3>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {packageScenarios.map((scenario) => (
              <div
                key={scenario.code}
                className={`flex flex-col rounded-2xl border bg-white px-6 py-7 ${
                  scenario.isRecommended
                    ? "border-trust-blue/45 shadow-[var(--shadow-card)]"
                    : "border-line"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[13px] font-bold text-white">
                    {scenario.code}
                  </span>
                  {scenario.isRecommended ? (
                    <span className="rounded-full bg-trust-blue/10 px-2.5 py-1 text-[11px] font-bold text-trust-blue">
                      가장 많이 선택합니다
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-lg font-bold text-navy">{scenario.title}</p>

                <p className="mt-3 rounded-lg bg-ivory px-3 py-2 text-center text-sm font-bold text-navy">
                  {scenario.recommended}
                </p>

                <dl className="mt-5 flex flex-col gap-2.5 text-[13px] leading-relaxed">
                  <div>
                    <dt className="font-semibold text-navy/40">운영</dt>
                    <dd className="mt-0.5 break-keep text-navy/70">
                      {scenario.operation}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-navy/40">확인</dt>
                    <dd className="mt-0.5 break-keep text-navy/70">{scenario.purpose}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-navy/40">다음</dt>
                    <dd className="mt-0.5 break-keep text-navy/70">{scenario.next}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>

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
