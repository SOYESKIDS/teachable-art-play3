import {
  consultLabel,
  type ProgramProduct,
  type StarterWeekDetail,
} from "@/data/program-products";
import { priceDisclaimerLines } from "@/data/packages";
import { publicNotice } from "@/data/site-copy";
import { LeadCtaButton } from "@/components/forms/LeadCtaButton";
import { ProductCurriculum, StatusBadge } from "./ProductCurriculum";
import { ProductGrowthFlow } from "./ProductGrowthFlow";

/**
 * 상품 상세 본문.
 *
 * ★ 이 컴포넌트 하나를 두 곳이 함께 쓴다.
 *   홈페이지 카드에서 열리는 오버레이와 /programs/[slug] 직접 주소가 같은 것을 그린다.
 *   다른 점: variant="page" 는 자기 제목(h1)과 하단 상담 단락을 갖고,
 *   서버에서 읽은 주차 상세(weekDetails)를 받아 주차 카드를 펼칠 수 있다.
 *
 * ★ 단락 순서는 원장이 결정하는 순서다 (B2B 결정 순서).
 *   1 어떤 원에 적합 → 2 무엇을 운영 → 3 기간 · 운영 방식 → 4 포함 내용 → 5 비용.
 *
 * ★ 가격 · 기간 · 포함 항목 상태는 전부 product.pkg 에서 온다.
 *   홈페이지 가격 카드가 쓰는 바로 그 객체다.
 */
export function ProductDetail({
  product,
  variant,
  weekDetails,
}: {
  product: ProgramProduct;
  variant: "page" | "overlay";
  /** 주차 상세 — 서버 페이지에서만 넘긴다 (STARTER_WEEKS) */
  weekDetails?: StarterWeekDetail[];
}) {
  const { pkg, theme } = product;
  const Heading = variant === "page" ? "h1" : "h2";

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      {/* ─────────────────────────────────────────── Hero */}
      <section>
        <span aria-hidden="true" className={`block h-[3px] w-12 rounded-full ${theme.rule}`} />
        <p className={`eyebrow mt-5 ${theme.accentText}`}>{product.hero.eyebrow}</p>
        <Heading className="mt-3 whitespace-pre-line break-keep text-h1 font-bold text-navy">
          {product.hero.headline}
        </Heading>
        <p className="measure mt-5 text-lead text-navy/65">{product.hero.subCopy}</p>
      </section>

      {/*
        ── 한눈에 보기 (PHASE CONTENT-FINAL) ─────────────────────────
        ★ 첫 화면에서 30초 안에: 누구 · 몇 주 · 교사가 받는 것 · 아이가 경험하는 것 ·
          남는 기록 · 원장이 확인하는 것 · 도입 방법. 아래 섹션은 이 일곱 줄의 자세한 설명이다.
        ★ 값은 상품 데이터(packages.ts)와 승인된 수업 구조에서만 온다.
      */}
      <section aria-labelledby={`glance-${pkg.id}`} className="rounded-3xl border border-line bg-white p-5 sm:p-7">
        <h2 id={`glance-${pkg.id}`} className="text-title-sm font-bold text-navy">
          {pkg.name} 한눈에 보기
        </h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {glanceRows(pkg).map((row) => (
            <div key={row.label} className="border-t border-line-soft pt-3">
              <dt className="text-caption font-semibold text-ink-muted">{row.label}</dt>
              <dd className="mt-1 text-label font-semibold text-navy">{row.value}</dd>
            </div>
          ))}
        </dl>
        {pkg.limits?.length ? (
          <p className="mt-5 rounded-xl bg-warning-soft px-4 py-3 text-caption text-warning-text">
            <span className="font-bold">지금 포함되지 않는 것 · </span>
            {pkg.limits.join(" · ")}
          </p>
        ) : null}
      </section>

      {/* ──────────────────────────────── 1. 어떤 원에 적합 */}
      <section className="border-t border-line pt-10 sm:pt-12">
        <p className={`eyebrow ${theme.accentText}`}>RECOMMENDED FOR</p>
        <h2 className="mt-2 text-h3 font-bold text-navy">이런 원에 맞습니다</h2>
        {pkg.fit ? (
          <p
            className={`mt-5 border-l-[3px] pl-4 break-keep text-body-lg font-bold leading-snug text-navy ${theme.markerBorder}`}
          >
            {pkg.fit}
          </p>
        ) : null}
        <ul className="mt-5 flex flex-col gap-2">
          {product.recommendations.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-body-sm leading-relaxed text-navy/70"
            >
              <span aria-hidden="true" className="mt-[10px] h-1 w-1 shrink-0 rounded-full bg-navy/35" />
              <span className="break-keep">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ──────────────────────────────── 2. 무엇을 운영 */}
      {product.story ? (
        <section className="border-t border-line pt-10 sm:pt-12">
          <p className={`eyebrow ${theme.accentText}`}>{product.story.eyebrow}</p>
          <h2 className="mt-2 text-h3 font-bold text-navy">{product.story.headline}</h2>
          <p className="mt-2 max-w-[54ch] break-keep text-body-sm leading-relaxed text-ink-muted">
            {product.story.subCopy}
          </p>
        </section>
      ) : null}

      <ProductCurriculum product={product} details={weekDetails} />

      {/* ──────────────────────────────── 3. 기간 · 운영 방식 */}
      <section className="border-t border-line pt-10 sm:pt-12">
        <p className={`eyebrow ${theme.accentText}`}>HOW IT RUNS</p>
        <h2 className="mt-2 text-h3 font-bold text-navy">기간과 운영 방식</h2>

        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Fact label="운영기간" value={`${pkg.durationWeeks}주`} />
          <Fact label="수업" value={pkg.frequency} />
          <Fact label="대상 연령" value={pkg.recommendedAge} />
          <Fact label="기준" value={pkg.priceUnitNote} />
        </dl>

        {/* 한 회차 흐름 — 순서만 (분 배분은 회차마다 다름 · 시간 표준은 pkg.frequency) */}
        {product.featuredLesson ? (
          <div className="mt-8">
            <h3 className="text-title-sm font-bold text-navy">
              수업 한 회차의 흐름
            </h3>
            <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {product.featuredLesson.blocks.map((block, index) => (
                <li
                  key={block.code}
                  className={`h-full rounded-xl border border-line border-l-[3px] bg-white px-3 py-3 ${theme.markerBorder}`}
                >
                  <p className="text-micro font-bold tabular-nums text-ink-muted">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1 break-keep text-label font-bold text-navy">{block.label}</p>
                </li>
              ))}
            </ol>
            {product.featuredLesson.notes?.length ? (
              <ul className="mt-3 flex flex-col gap-1">
                {product.featuredLesson.notes.map((note) => (
                  <li key={note} className="break-keep text-micro leading-relaxed text-ink-muted">
                    {note}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* 수업에서 기록까지 */}
      <section className="border-t border-line pt-10 sm:pt-12">
        <p className={`eyebrow ${theme.accentText}`}>CLASS TO RECORD</p>
        <h2 className="mt-2 text-h3 font-bold text-navy">수업에서 기록까지</h2>
        <ol className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {product.experience.map((step) => (
            <li
              key={step.order}
              className={`h-full rounded-xl border border-line border-l-[3px] bg-white p-4 ${theme.markerBorder}`}
            >
              <p className={`text-micro font-bold tabular-nums tracking-[0.12em] ${theme.accentText}`}>
                {step.order}
              </p>
              <p className="mt-2 break-keep text-body-sm font-bold text-navy">{step.title}</p>
              <p className="mt-1.5 break-keep text-caption leading-relaxed text-ink-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ──────────────────────────────── 4. 포함 내용 */}
      <section className="border-t border-line pt-10 sm:pt-12">
        <p className={`eyebrow ${theme.accentText}`}>WHAT&apos;S INCLUDED</p>
        <h2 className="mt-2 text-h3 font-bold text-navy">포함 내용</h2>
        <p className="mt-2 max-w-[54ch] break-keep text-caption leading-relaxed text-ink-muted">
          지금 제공되는 것과 준비 중인 것을 나누어 적었습니다. EBOOK · VOD · 음원은 수업
          자료로 제공되며, 플랫폼 안 재생은 준비 중입니다.
        </p>

        <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(pkg.features ?? pkg.contentItems.map((label) => ({ label, availability: "포함" as const, note: undefined }))).map(
            (feature) => (
              <li
                key={feature.label}
                className="flex items-start justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block break-keep text-label text-navy/85">{feature.label}</span>
                  {feature.note ? (
                    <span className="mt-0.5 block break-keep text-micro text-ink-muted">
                      {feature.note}
                    </span>
                  ) : null}
                </span>
                <StatusBadge label={feature.availability} />
              </li>
            ),
          )}
        </ul>

        {product.contentAreas?.length ? (
          <dl className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {product.contentAreas.map((area) => (
              <div key={area.code} className="h-full rounded-xl border border-line bg-surface-warm p-4">
                <p className={`eyebrow ${theme.accentText}`}>{area.code}</p>
                <dt className="mt-1.5 break-keep text-body-sm font-bold text-navy">{area.label}</dt>
                <dd className="mt-1 break-keep text-caption leading-relaxed text-ink-muted">
                  {area.detail}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {product.nuriAreas?.length ? (
          <div className="mt-8">
            <h3 className="text-title-sm font-bold text-navy">누리과정 5개 영역과 이어집니다</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.nuriAreas.map((entry) => (
                <li
                  key={entry.area}
                  className={`rounded-full border px-3 py-1.5 text-caption font-semibold ${
                    entry.emphasis === "primary"
                      ? "border-trust-blue/25 bg-trust-blue/[0.05] text-navy"
                      : "border-line bg-white text-navy/70"
                  }`}
                >
                  <span className="mr-1.5 text-micro font-bold text-ink-muted">
                    {entry.emphasis === "primary" ? "중심" : "연계"}
                  </span>
                  {entry.area}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-caption leading-relaxed text-ink-muted">
              누리과정을 평가하거나 아이를 진단하지 않습니다.
            </p>
          </div>
        ) : null}
      </section>

      <ProductGrowthFlow product={product} />

      {/* ──────────────────────────────── 5. 비용 */}
      <section className="border-t border-line pt-10 sm:pt-12">
        <p className={`eyebrow ${theme.accentText}`}>PRICE</p>
        <h2 className="mt-2 text-h3 font-bold text-navy">비용</h2>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 rounded-xl border border-line bg-white px-5 py-4">
          <div>
            <p className="text-headline-lg font-extrabold tabular-nums leading-none text-navy sm:text-[32px]">
              {pkg.monthlyPriceKrw.toLocaleString("ko-KR")}
              <span className="ml-1 align-baseline text-body-sm font-semibold text-ink-muted">원 / 월</span>
            </p>
            <p className="mt-2 text-caption font-semibold tabular-nums text-ink-muted">
              {`${pkg.totalPriceNote} ${pkg.totalPriceKrw.toLocaleString("ko-KR")}원 · ${pkg.priceUnitNote}`}
            </p>
          </div>
          <p className="text-micro leading-relaxed text-ink-muted">{publicNotice.pricing}</p>
        </div>

        <div className="mt-4 text-micro leading-relaxed text-ink-muted">
          {priceDisclaimerLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────── 마지막 CTA (페이지에서만) */}
      {variant === "page" ? (
        <section className="border-t border-line pt-10 sm:pt-12">
          <div className="rounded-2xl border border-line bg-navy px-6 py-9 text-center sm:px-10 sm:py-11">
            <p className="eyebrow text-accent-on-dark">CONSULTING</p>
            <h2 className="mt-4 break-keep text-headline font-bold leading-snug text-white sm:text-headline-lg">
              도입 조건은 기관마다 다릅니다
            </h2>
            <p className="mx-auto mt-3 max-w-[44ch] break-keep text-label leading-relaxed text-white/65">
              반 수와 운영 방식에 맞춰 담당자가 직접 안내드립니다.
            </p>
            {/* 공개 페이지(PublicShell)에서는 상담 폼이 바로 열린다 — Provider 가 없으면 /#contact 로 대체 */}
            <LeadCtaButton
              type="consult"
              variant="inverse"
              dataCta={`consult-program-${product.slug}`}
              className="mt-7 px-7 font-bold"
            >
              {consultLabel(product)}
            </LeadCtaButton>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** 블록에서 더한다 — 블록 하나를 고쳤는데 합계만 옛 값으로 남지 않게. */
function glanceRows(pkg: ProgramProduct["pkg"]): { label: string; value: string }[] {
  return [
    { label: "누구를 위한 상품인가요?", value: pkg.fit ?? pkg.label },
    { label: "몇 주 프로그램인가요?", value: `${pkg.durationWeeks}주 · ${pkg.frequency}` },
    { label: "교사는 무엇을 받나요?", value: "회차별 수업안 · 발문 예시 · 준비물 안내 · 관찰 포인트 · 기록 문장 예시" },
    { label: "아이들은 무엇을 경험하나요?", value: "매 회차 이야기 열기 → 몸으로 느끼기 → 나답게 표현하기 → 친구와 나누기" },
    { label: "어떤 기록이 남나요?", value: pkg.outcome ?? "교사의 관찰 기록" },
    {
      label: "원장은 무엇을 확인하나요?",
      value:
        pkg.id === "starter"
          ? "반별 수업 운영 · 수업 이력 (원장 대시보드는 STANDARD 이상)"
          : "반별 수업 운영 · 수업 이력 · 원장 대시보드(빠진 출결 · 관찰 기록)",
    },
    { label: "도입하려면 무엇을 하나요?", value: "도입 상담 → 운영 방식 확인 → 기관 · 반 설정 → 교사 온보딩 → 첫 수업" },
  ];
}


function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <dt className="text-micro font-semibold text-ink-muted">{label}</dt>
      <dd className="mt-1 break-keep text-label font-bold text-navy">{value}</dd>
    </div>
  );
}
