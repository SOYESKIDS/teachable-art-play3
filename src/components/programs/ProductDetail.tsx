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
            주차 목록을 가진 상품은 아래 GROWTH JOURNEY 와 아코디언이
            그 순서를 이미 보여 준다. 여기서 같은 목록을 한 번 더 늘어놓지 않는다.
          */}
          {product.story.beats?.length ? (
            <ol className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-3">
              {product.story.beats.map((beat, index) => (
                <li key={beat} className="flex items-center gap-2">
                  <span
                    className={`inline-flex min-h-10 items-center rounded-full border border-navy/12 px-4 text-[13px] font-semibold text-navy ${theme.softSurface}`}
                  >
                    {beat}
                  </span>
                  {index < (product.story?.beats?.length ?? 0) - 1 ? (
                    <span aria-hidden="true" className="text-navy/25">
                      →
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}

      {/* ─────────────────────────────── C2. Growth Journey */}
      {/*
        여덟 주가 이야기의 흐름(씨앗 → 숲)이라면, 이것은 아이 쪽의 흐름이다.
        같은 8주를 두 번 말하는 것이 아니라, 주제 옆에 그 주에 자라는
        지점을 나란히 두어 "왜 이 순서인가"가 보이게 한다.
        여기 적힌 것은 전부 확정된 값이고, 설명을 붙이지 않았다.
      */}
      {product.curriculum ? (
        <section className="border-t border-navy/10 pt-10 sm:pt-12">
          <p
            className={`text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
          >
            GROWTH JOURNEY
          </p>
          <h2 className="mt-2 text-[24px] font-bold leading-snug text-navy sm:text-[28px]">
            8주 동안 자라는 것
          </h2>

          <ol className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {product.curriculum.weeks.map((entry) => (
              <li
                key={entry.week}
                className={`rounded-xl border p-3 text-center ${
                  entry.finale
                    ? "border-navy bg-navy"
                    : "border-navy/10 bg-white"
                }`}
              >
                <p
                  className={`text-[10px] font-bold tabular-nums tracking-[0.1em] ${
                    entry.finale ? "text-yellow" : "text-navy/35"
                  }`}
                >
                  {`W${String(entry.week).padStart(2, "0")}`}
                </p>
                <p
                  className={`mt-1.5 break-keep text-[15px] font-bold leading-snug ${
                    entry.finale ? "text-white" : "text-navy"
                  }`}
                >
                  {entry.growthPoint}
                </p>
                <p
                  className={`mt-1 break-keep text-[11px] leading-snug ${
                    entry.finale ? "text-white/60" : "text-navy/45"
                  }`}
                >
                  {entry.topic}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* ───────────────────────────────────── D. Curriculum */}
      {/* 확정본이 없는 상품에서는 이 단락이 통째로 나타나지 않는다. */}
      <ProductCurriculum product={product} />

      {/* ────────────────────────────── D2. 대표 수업 한 회차 */}
      {/*
        ★ 여기에 오는 것은 진행 구성과 시간 배분까지다.
          교사 발문 · 교사 언어 · 개별 지원 지침 · 관찰지표 · 준비물 ·
          안전 운영 방법은 공개 화면에 담지 않는다.
          그것들은 도입한 기관의 교사에게 가는 자료이지 상품 소개가 아니다.
      */}
      {product.featuredLesson ? (
        <section className="border-t border-navy/10 pt-10 sm:pt-12">
          <p
            className={`text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
          >
            {`WEEK ${String(product.featuredLesson.week).padStart(2, "0")} · SAMPLE LESSON`}
          </p>
          <h2 className="mt-2 break-keep text-[24px] font-bold leading-snug text-navy sm:text-[28px]">
            {`${product.featuredLesson.week}주차 「${product.featuredLesson.storyTitle}」`}
          </h2>
          <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-navy/60">
            {`한 회차가 여섯 단계로 진행됩니다. 전체 ${lessonMinutes(product.featuredLesson.blocks)}분입니다.`}
          </p>

          <ol className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {product.featuredLesson.blocks.map((block) => (
              <li
                key={block.code}
                className={`h-full rounded-xl border border-navy/10 border-l-[3px] bg-white p-3 ${theme.markerBorder}`}
              >
                <p
                  className={`break-keep text-[10px] font-bold tracking-[0.1em] ${theme.accentText}`}
                >
                  {block.code}
                </p>
                <p className="mt-1.5 break-keep text-[14px] font-bold text-navy">
                  {block.label}
                </p>
                <p className="mt-1 text-[12px] font-semibold tabular-nums text-navy/45">
                  {`${block.minutes}분`}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-4 rounded-xl border border-navy/10 bg-surface-soft px-5 py-4">
            <p className="text-[11px] font-bold tracking-[0.14em] text-navy/45">
              이 회차의 핵심경험
            </p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {product.featuredLesson.coreExperiences.map((item) => (
                <li
                  key={item}
                  className="break-keep rounded-full border border-navy/12 bg-white px-3 py-1.5 text-[13px] font-semibold text-navy/75"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

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

      {/* ────────────────────────────────── E2. 누리과정 연계 */}
      {/*
        영역 이름까지만 적는다. 영역별 목표나 성취 기준을 지어내지 않는다.
        이 서비스는 누리과정을 평가하는 도구가 아니라 활동을 연결하는 도구다.
      */}
      {product.nuriAreas?.length ? (
        <section className="border-t border-navy/10 pt-10 sm:pt-12">
          <p
            className={`text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
          >
            NURI CURRICULUM
          </p>
          <h2 className="mt-2 text-[24px] font-bold leading-snug text-navy sm:text-[28px]">
            누리과정 5개 영역과 이어집니다
          </h2>

          <ul className="mt-6 flex flex-wrap gap-2">
            {product.nuriAreas.map((entry) => (
              <li
                key={entry.area}
                className={`break-keep rounded-full border px-4 py-2 text-[14px] font-semibold ${
                  entry.emphasis === "primary"
                    ? "border-trust-blue/30 bg-trust-blue/[0.06] text-navy"
                    : "border-navy/15 bg-white text-navy/55"
                }`}
              >
                {entry.area}
                <span className="ml-1.5 text-[11px] font-bold text-navy/35">
                  {entry.emphasis === "primary" ? "중심" : "연계"}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[13px] leading-relaxed text-navy/50">
            AI는 누리과정을 평가하거나 아이를 진단하지 않습니다.
          </p>
        </section>
      ) : null}

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

      {/* ───────────────────────────── F2. 콘텐츠 경험 영역 */}
      {/*
        위 목록이 "무엇을 받는가"라면 여기는 "어떻게 만나는가"다.
        각 갈래의 설명은 이 상품에서 확정된 수량 그대로이고,
        새 구성품이나 새 수량을 만들어 붙이지 않았다.
      */}
      {product.contentAreas?.length ? (
        <section className="border-t border-navy/10 pt-10 sm:pt-12">
          <p
            className={`text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
          >
            CONTENT EXPERIENCE
          </p>
          <h2 className="mt-2 text-[24px] font-bold leading-snug text-navy sm:text-[28px]">
            여섯 가지 방식으로 만납니다
          </h2>

          <dl className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {product.contentAreas.map((area) => (
              <div
                key={area.code}
                className="h-full rounded-xl border border-navy/10 bg-white p-4"
              >
                <p
                  className={`break-keep text-[10px] font-bold tracking-[0.12em] ${theme.accentText}`}
                >
                  {area.code}
                </p>
                <dt className="mt-1.5 break-keep text-[15px] font-bold text-navy">
                  {area.label}
                </dt>
                <dd className="mt-1 break-keep text-[13px] leading-relaxed text-navy/60">
                  {area.detail}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

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

/**
 * 대표 수업의 전체 시간.
 *
 * 숫자를 따로 적어 두지 않고 블록에서 더한다 —
 * 블록 하나의 분을 고쳤는데 합계만 옛 값으로 남는 일이 없어야 한다.
 */
function lessonMinutes(blocks: { minutes: number }[]): number {
  return blocks.reduce((sum, block) => sum + block.minutes, 0);
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
