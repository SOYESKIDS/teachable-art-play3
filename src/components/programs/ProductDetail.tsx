import Link from "next/link";
import { consultLabel, type ProgramProduct } from "@/data/program-products";
import { priceDisclaimerLines } from "@/data/packages";
import { publicNotice } from "@/data/site-copy";
import { ProductCurriculum } from "./ProductCurriculum";
import { ProductGrowthFlow } from "./ProductGrowthFlow";

/**
 * 상품 상세 본문.
 *
 * ★ 이 컴포넌트 하나를 두 곳이 함께 쓴다.
 *   홈페이지 카드에서 열리는 오버레이와 /programs/[slug] 직접 주소가
 *   같은 것을 그린다. 상세 내용을 두 벌 만들면 한쪽만 고쳐지는 날이 온다.
 *
 * ★ 다른 점은 바깥 껍데기뿐이다.
 *   variant="page" 는 자기 제목(h1)과 하단 상담 단락을 갖는 독립 페이지고,
 *   variant="overlay" 는 오버레이가 이미 제목 줄과 아래 고정 CTA 를 갖고
 *   있으므로 그 둘을 그리지 않는다.
 *
 * ★ 가격 · 기간 · 콘텐츠 수량은 전부 product.pkg 에서 온다.
 *   홈페이지 가격 카드가 쓰는 바로 그 객체다. 숫자가 갈라질 자리가 없다.
 */

export function ProductDetail({
  product,
  variant,
}: {
  product: ProgramProduct;
  variant: "page" | "overlay";
}) {
  const { pkg, theme } = product;
  const Heading = variant === "page" ? "h1" : "h2";

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      {/* ─────────────────────────────────────────── A. Hero */}
      <section>
        <span
          aria-hidden="true"
          className={`block h-[3px] w-12 rounded-full ${theme.rule}`}
        />

        <p
          className={`mt-5 text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
        >
          {product.hero.eyebrow}
        </p>

        <Heading className="mt-3 whitespace-pre-line break-keep text-[28px] font-bold leading-[1.3] text-navy sm:text-[36px]">
          {product.hero.headline}
        </Heading>

        <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-navy/65 sm:text-[16px]">
          {product.hero.subCopy}
        </p>
      </section>

      {/* ────────────────────────────────────── B. Quick facts */}
      <section>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Fact label="운영기간" value={`${pkg.durationWeeks}주`} />
          <Fact label="운영" value={pkg.frequency} />
          <Fact label="권장연령" value={pkg.recommendedAge} />
          <Fact label="기준" value={pkg.priceUnitNote} />
        </dl>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 rounded-xl border border-navy/10 bg-white px-5 py-4">
          <p className="text-[28px] font-extrabold tabular-nums leading-none text-navy sm:text-[32px]">
            {pkg.monthlyPriceKrw.toLocaleString("ko-KR")}
            <span className="ml-1 align-baseline text-[15px] font-semibold text-navy/55">
              원 / 월
            </span>
          </p>
          <p className="text-[12px] leading-relaxed text-navy/50">
            {publicNotice.pricing}
          </p>
        </div>
      </section>

      {/* ────────────────────────────────────────── C. Story */}
      {product.story ? (
        <section className="border-t border-navy/10 pt-10 sm:pt-12">
          <p
            className={`text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
          >
            {product.story.eyebrow}
          </p>
          <h2 className="mt-2 text-[24px] font-bold leading-snug text-navy sm:text-[28px]">
            {product.story.headline}
          </h2>
          <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-navy/60">
            {product.story.subCopy}
          </p>

          {/*
            흐름을 그림이 아니라 순서로 보여 준다.
            각 마디는 확정된 주제어 그대로이고, 설명을 지어 붙이지 않았다.
          */}
          <ol className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-3">
            {product.story.beats.map((beat, index) => (
              <li key={beat} className="flex items-center gap-2">
                <span
                  className={`inline-flex min-h-10 items-center rounded-full border border-navy/12 px-4 text-[13px] font-semibold text-navy ${theme.softSurface}`}
                >
                  {beat}
                </span>
                {index < product.story!.beats.length - 1 ? (
                  <span aria-hidden="true" className="text-navy/25">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* ───────────────────────────────────── D. Curriculum */}
      {/* 확정본이 없는 상품에서는 이 단락이 통째로 나타나지 않는다. */}
      <ProductCurriculum product={product} />

      {/* ──────────────────────────────────── E. 수업 경험 흐름 */}
      <section className="border-t border-navy/10 pt-10 sm:pt-12">
        <p
          className={`text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
        >
          CLASS FLOW
        </p>
        <h2 className="mt-2 text-[24px] font-bold leading-snug text-navy sm:text-[28px]">
          수업 한 회차는 이렇게 흘러갑니다
        </h2>

        <ol className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {product.experience.map((step) => (
            <li
              key={step.order}
              className={`h-full rounded-xl border border-navy/10 border-l-[3px] bg-white p-4 ${theme.markerBorder}`}
            >
              <p
                className={`text-[11px] font-bold tabular-nums tracking-[0.12em] ${theme.accentText}`}
              >
                {step.order}
              </p>
              <p className="mt-2 break-keep text-[15px] font-bold text-navy">
                {step.title}
              </p>
              <p className="mt-1.5 break-keep text-[13px] leading-relaxed text-navy/60">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────────────────────────────────── F. 제공 콘텐츠 */}
      <section className="border-t border-navy/10 pt-10 sm:pt-12">
        <p
          className={`text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
        >
          WHAT&apos;S INCLUDED
        </p>
        <h2 className="mt-2 text-[24px] font-bold leading-snug text-navy sm:text-[28px]">
          제공 콘텐츠
        </h2>

        <ul className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pkg.contentItems.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 rounded-lg border border-navy/10 bg-white px-4 py-3 text-[14px] text-navy/80"
            >
              <CheckIcon className={theme.accentText} />
              <span className="break-keep">{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 text-[12px] leading-relaxed text-navy/45">
          {priceDisclaimerLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────── G. 성장 기록 연결 */}
      <ProductGrowthFlow product={product} />

      {/* ────────────────────────────────────── H. 추천 기관 */}
      <section className="border-t border-navy/10 pt-10 sm:pt-12">
        <p
          className={`text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
        >
          RECOMMENDED FOR
        </p>
        <h2 className="mt-2 text-[24px] font-bold leading-snug text-navy sm:text-[28px]">
          이런 기관에 맞습니다
        </h2>

        <ul className="mt-6 flex flex-col gap-2">
          {product.recommendations.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-[15px] leading-relaxed text-navy/70"
            >
              <span
                aria-hidden="true"
                className="mt-[10px] h-1 w-1 shrink-0 rounded-full bg-navy/35"
              />
              <span className="break-keep">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ──────────────────────────────────────── I. 마지막 CTA */}
      {/*
        오버레이에는 아래에 고정된 상담 버튼이 이미 있다.
        같은 행동을 두 번 권하면 어느 쪽을 눌러야 하는지 되묻게 된다.
      */}
      {variant === "page" ? (
        <section className="border-t border-navy/10 pt-10 sm:pt-12">
          <div className="rounded-2xl border border-navy/10 bg-navy px-6 py-9 text-center sm:px-10 sm:py-11">
            <p className="text-[11px] font-bold tracking-[0.18em] text-yellow">
              CONSULTING
            </p>
            <h2 className="mt-4 break-keep text-[24px] font-bold leading-snug text-white sm:text-[28px]">
              도입 조건은 기관마다 다릅니다
            </h2>
            <p className="mx-auto mt-3 max-w-[44ch] break-keep text-[14px] leading-relaxed text-white/65">
              반 수와 운영 방식에 맞춰 담당자가 직접 안내드립니다.
            </p>

            {/*
              상담으로만 이어진다 — 결제도 mailto 도 없다.
              공개 홈페이지에 이미 있는 상담 단락(#contact)을 그대로 쓴다.
            */}
            <Link
              href="/#contact"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-yellow px-7 text-[15px] font-bold text-navy transition-colors hover:bg-yellow/90"
            >
              {consultLabel(product)}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white px-4 py-3">
      <dt className="text-[11px] font-semibold text-navy/45">{label}</dt>
      <dd className="mt-1 break-keep text-[14px] font-bold text-navy">
        {value}
      </dd>
    </div>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={`mt-[3px] h-4 w-4 shrink-0 ${className}`}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M5 8.2l2 2 4-4.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
