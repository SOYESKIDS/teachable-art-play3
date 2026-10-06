"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ProgramDetailOverlay } from "@/components/programs/ProgramDetailOverlay";
import { detailLinkLabel, type ProgramSlug } from "@/data/program-products";
import { pricingPackages } from "@/data/packages";
import { LeadCtaButton } from "@/components/forms/LeadCtaButton";
import { ctaLabels } from "@/data/site-copy";
import type { PricingPackage } from "@/types/content";

/**
 * 홈페이지 가격 카드 3장.
 *
 * ★ 카드 디자인은 그대로다.
 *   기존 마크업을 그대로 옮겨 오고 아래에 상세 보기 버튼 한 줄만 더했다.
 *   비교하려고 온 화면이므로 카드가 커지거나 길어지면 안 된다.
 *
 * ★ 상세 내용은 이 파일에 없다.
 *   오버레이가 열릴 때 비로소 ProductDetail 이 그려지고, 그 데이터는
 *   client 번들에서 온다. 홈페이지의 DOM 과 서버 응답에는 8·16·24주
 *   상세가 들어가지 않는다 — 가격 비교 화면의 높이가 늘지 않아야 한다.
 *
 * ★ 카드 전체가 눌리지만 탭 정지점은 하나다.
 *   카드에 role="button"과 tabIndex 를 함께 주면 카드마다 탭 정지점이
 *   두 개(카드 + 안쪽 버튼)가 되어 키보드 사용자는 같은 곳을 두 번 지난다.
 *   그래서 진짜 버튼 하나만 초점을 받게 하고, 카드의 클릭은 마우스 편의로만
 *   둔다. 버튼에서 누른 Enter/Space 는 click 으로 올라와 같은 곳에 닿는다.
 */

const cardVariant: Record<
  PricingPackage["accentColor"],
  "basic" | "highlighted" | "premium"
> = {
  "light-blue": "basic",
  "ivory-yellow": "highlighted",
  "navy-yellow": "premium",
};

const CheckIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={`h-3.5 w-3.5 shrink-0 ${className}`}
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

/**
 * 티어별 상단 강조선.
 *
 * 세 장은 비교 대상이라 재질(흰 카드 · 같은 곡률 · 같은 테두리)은 같아야 하고,
 * 다른 것은 이 얇은 선 하나면 충분하다.
 *   STARTER  차분한 파랑  — 처음 도입하는 기관
 *   STANDARD 금색        — 한 학기 운영
 *   PREMIUM  금색(남색 면 위) — 가장 완성된 운영형
 */
const TIER_RULE: Record<PricingPackage["accentColor"], string> = {
  "light-blue": "bg-trust-blue/50",
  "ivory-yellow": "bg-accent",
  "navy-yellow": "bg-accent",
};

export function PricingCardGrid() {
  /*
    ★ 눌린 버튼을 ref 가 아니라 state 로 들고 있는다.
      ref.current 는 렌더 중에 읽으면 안 된다 — 값이 바뀌어도 다시 그리지
      않으므로, 오버레이가 열리는 그 렌더에서는 아직 비어 있을 수 있다.
      닫을 때 포커스를 돌려줄 대상이 없어지면 키보드 사용자는 목록의
      맨 앞으로 튕겨 나간다.
  */
  const [open, setOpen] = useState<{
    slug: ProgramSlug;
    trigger: HTMLElement | null;
  } | null>(null);

  /*
    ★ 닫기 콜백을 렌더마다 새로 만들지 않는다.
      오버레이는 이 함수를 effect 의존성으로 쓴다. 매번 새 함수가 가면
      그 effect 가 다시 돌아 history 에 같은 항목을 한 번 더 쌓는다.
  */
  const close = useCallback(() => setOpen(null), []);

  return (
    <>
      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-start">
        {pricingPackages.map((pkg) => {
          const isNavy = pkg.accentColor === "navy-yellow";

          return (
            <Card
              key={pkg.id}
              variant={cardVariant[pkg.accentColor]}
              /*
                ★ 강조를 그림자가 아니라 테두리와 자리로 만든다.
                  예전에는 추천 상품에만 노란 글로우(0 12px 32px …)를 달아 두어
                  카드 하나가 다른 재질처럼 보였다. 세 장은 비교 대상이므로
                  같은 재질이어야 하고, 다른 것은 테두리와 위치뿐이면 된다.
              */
              className="flex cursor-pointer flex-col gap-5 p-7 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] sm:p-8"
              onClick={(event) => {
                // 글자를 끌어 선택하던 중이라면 열지 않는다.
                if (window.getSelection()?.toString()) return;

                setOpen({
                  slug: pkg.id,
                  trigger: event.currentTarget.querySelector<HTMLElement>(
                    "[data-detail-trigger]",
                  ),
                });
              }}
            >
              {/*
                ★ 순서 = WHO → WHAT → HOW → OUTCOME → LIMIT → 비용 (final-content-system.md §5).
                  B2B 유치원 구매의 첫 질문은 "얼마인가"보다 "우리 원에 맞는가"다.
                ★ 근거 없는 추천 배지(BEST) · 위치 올림을 걷었다.
              */}
              <span
                aria-hidden="true"
                className={`block h-[3px] w-10 rounded-full ${TIER_RULE[pkg.accentColor]}`}
              />

              <div>
                <span
                  className={`eyebrow-ko inline-flex rounded-full px-3 py-1.5 ${
                    isNavy ? "bg-white/10 text-white/80" : "bg-navy/5 text-ink-muted"
                  }`}
                >
                  {pkg.label} · {pkg.durationWeeks}주
                </span>
                <h3 className={`mt-4 text-h3 font-bold ${isNavy ? "text-white" : "text-navy"}`}>
                  {pkg.name}
                  <span className={`ml-2 text-body-sm font-medium ${isNavy ? "text-white/60" : "text-ink-muted"}`}>
                    {pkg.subtitle}
                  </span>
                </h3>
                {pkg.definition ? (
                  <p className={`mt-2 text-body-sm font-semibold ${isNavy ? "text-white/90" : "text-navy"}`}>
                    {pkg.definition}
                  </p>
                ) : null}
              </div>

              <dl className={`flex flex-col gap-3 text-label ${isNavy ? "text-white/80" : "text-ink"}`}>
                {pkg.fit ? (
                  <div>
                    <dt className={`text-caption font-semibold ${isNavy ? "text-white/55" : "text-ink-muted"}`}>이런 원에 맞습니다</dt>
                    <dd className="mt-0.5">{pkg.fit}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className={`text-caption font-semibold ${isNavy ? "text-white/55" : "text-ink-muted"}`}>운영</dt>
                  <dd className="mt-0.5">
                    {pkg.durationWeeks}주 · {pkg.frequency} · {pkg.priceUnitNote}
                  </dd>
                </div>
              </dl>

              <div>
                <p className={`text-caption font-semibold ${isNavy ? "text-white/55" : "text-ink-muted"}`}>포함 내용</p>
                <ul className={`mt-2 flex flex-col gap-1.5 text-label ${isNavy ? "text-white/85" : "text-ink"}`}>
                  {(pkg.features ?? pkg.contentItems.map((label) => ({ label, availability: "포함" as const }))).map((feature) => (
                    <li key={feature.label} className="flex items-start justify-between gap-3">
                      <span className="flex items-start gap-2">
                        <CheckIcon className={isNavy ? "mt-0.5 text-accent-on-dark" : "mt-0.5 text-secondary"} />
                        {feature.label}
                      </span>
                      {feature.availability !== "포함" ? (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-micro font-semibold ${
                            isNavy ? "bg-white/10 text-white/80" : feature.availability === "준비 중" ? "bg-warning-soft text-warning-text" : "bg-info-soft text-info-text"
                          }`}
                        >
                          {feature.availability}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              {pkg.outcome ? (
                <div className={`rounded-xl px-4 py-3 ${isNavy ? "bg-white/10" : "bg-secondary-soft"}`}>
                  <p className={`text-caption font-semibold ${isNavy ? "text-white/60" : "text-secondary-strong"}`}>도입 후 남는 것</p>
                  <p className={`mt-0.5 text-label font-semibold ${isNavy ? "text-white" : "text-navy"}`}>{pkg.outcome}</p>
                </div>
              ) : null}

              {pkg.limits?.length ? (
                <div>
                  <p className={`text-caption font-semibold ${isNavy ? "text-white/55" : "text-ink-muted"}`}>지금 포함되지 않는 것</p>
                  <ul className={`mt-1.5 flex flex-col gap-1 text-caption ${isNavy ? "text-white/70" : "text-ink-muted"}`}>
                    {pkg.limits.map((limit) => (
                      <li key={limit}>· {limit}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className={`border-t pt-5 ${isNavy ? "border-line-inverse" : "border-line"}`}>
                {/*
                  총액은 pricingPackages.totalPriceKrw를 그대로 읽는다 — 월 금액 × 개월수를 계산하지 않는다.
                */}
                <p className={`text-headline-lg font-bold tabular-nums leading-none ${isNavy ? "text-white" : "text-navy"}`}>
                  {pkg.monthlyPriceKrw.toLocaleString("ko-KR")}
                  <span className="ml-1 text-body-sm font-semibold opacity-60">원 / 월</span>
                </p>
                <p className={`mt-2 text-caption font-semibold tabular-nums ${isNavy ? "text-white/60" : "text-ink-muted"}`}>
                  {`${pkg.totalPriceNote} ${pkg.totalPriceKrw.toLocaleString("ko-KR")}원 · VAT 별도`}
                </p>
              </div>

              {/*
                ★ 카드 전체가 상세 보기(onClick)를 연다. 이 버튼의 클릭이 카드까지
                  올라가면 상담 폼과 상세 오버레이가 동시에 열린다 — 여기서 멈춘다.
              */}
              <div className="mt-auto" onClick={(event) => event.stopPropagation()}>
                <LeadCtaButton
                  type="consult"
                  variant={isNavy ? "inverse" : "primary"}
                  dataCta={`consult-pricing-${pkg.id}`}
                  className="w-full font-bold"
                >
                  {ctaLabels.consultApply}
                </LeadCtaButton>
              </div>

              <button
                type="button"
                data-detail-trigger
                className={`inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-colors ${
                  isNavy
                    ? "border-white/25 text-white hover:border-white/45 hover:bg-white/[0.08]"
                    : "border-line-strong text-navy hover:border-navy/40 hover:bg-navy/[0.04]"
                }`}
              >
                {detailLinkLabel(pkg)}
                <span aria-hidden="true">→</span>
              </button>
            </Card>
          );
        })}
      </div>

      {open ? (
        <ProgramDetailOverlay
          slug={open.slug}
          onClose={close}
          returnFocusTo={open.trigger}
        />
      ) : null}
    </>
  );
}
