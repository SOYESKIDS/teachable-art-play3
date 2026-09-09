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
  "ivory-yellow": "bg-yellow",
  "navy-yellow": "bg-yellow",
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
              className={`flex cursor-pointer flex-col gap-5 p-7 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] sm:p-8 ${
                pkg.isBest ? "border-yellow sm:-mt-4" : ""
              }`}
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
              <span
                aria-hidden="true"
                className={`block h-[3px] w-10 rounded-full ${TIER_RULE[pkg.accentColor]}`}
              />

              <div className="flex items-center justify-between">
                <span
                  className={`eyebrow rounded-full px-3 py-1.5 ${
                    isNavy ? "bg-white/10 text-white/80" : "bg-navy/5 text-navy/60"
                  }`}
                >
                  {pkg.label}
                </span>
                {pkg.isBest && (
                  <span className="eyebrow rounded-full bg-yellow px-3 py-1.5 text-navy">
                    BEST
                  </span>
                )}
              </div>

              <div>
                <h3
                  className={`text-h3 font-bold ${isNavy ? "text-white" : "text-navy"}`}
                >
                  {pkg.name}
                </h3>
                <p
                  className={`mt-1.5 text-[15px] font-medium ${
                    isNavy ? "text-white/60" : "text-navy/50"
                  }`}
                >
                  {pkg.subtitle}
                </p>
                <p
                  className={`mt-2 text-[15px] font-bold ${
                    isNavy ? "text-yellow" : "text-trust-blue"
                  }`}
                >
                  {pkg.tagline}
                </p>
              </div>

              <dl
                className={`grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:text-sm ${
                  isNavy ? "text-white/70" : "text-navy/60"
                }`}
              >
                <dt className="font-medium opacity-70">운영기간</dt>
                <dd className="text-right font-semibold">{pkg.durationWeeks}주</dd>
                <dt className="font-medium opacity-70">운영</dt>
                <dd className="text-right font-semibold">{pkg.frequency}</dd>
                <dt className="font-medium opacity-70">권장연령</dt>
                <dd className="text-right font-semibold">{pkg.recommendedAge}</dd>
                <dt className="font-medium opacity-70">기준</dt>
                <dd className="text-right font-semibold">{pkg.priceUnitNote}</dd>
              </dl>

              <div
                className={`border-t pt-5 ${
                  isNavy ? "border-line-inverse" : "border-line"
                }`}
              >
                <p
                  className={`text-[2rem] font-bold tabular-nums leading-none sm:text-[2.25rem] ${
                    isNavy ? "text-white" : "text-navy"
                  }`}
                >
                  {pkg.monthlyPriceKrw.toLocaleString("ko-KR")}
                  <span className="ml-1 text-base font-semibold opacity-60">
                    원 / 월
                  </span>
                </p>
                {/*
                  총액은 pricingPackages.totalPriceKrw를 그대로 읽는다.
                  월 금액 × 개월수를 여기서 계산하지 않는다 — 영업자료의
                  확정 총액과 어긋날 여지를 만들지 않기 위해서다.
                */}
                <p
                  className={`mt-2 text-sm font-semibold tabular-nums ${
                    isNavy ? "text-white/60" : "text-navy/55"
                  }`}
                >
                  {`${pkg.totalPriceNote} ${pkg.totalPriceKrw.toLocaleString("ko-KR")}원`}
                </p>
              </div>

              <ul
                className={`flex flex-col gap-2 text-sm ${
                  isNavy ? "text-white/80" : "text-navy/70"
                }`}
              >
                {pkg.contentItems.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckIcon
                      className={isNavy ? "text-yellow" : "text-trust-blue"}
                    />
                    {item}
                  </li>
                ))}
              </ul>

              {/*
                기존에는 "담당자 상담을 통해 안내드립니다"라는 안내문만 있었다.
                읽고 나서 할 수 있는 행동이 없어 카드가 거기서 끝났다.
                같은 자리에 홈페이지의 Primary conversion을 둔다.
              */}
              <div className="mt-auto">
                <LeadCtaButton
                  type="demo"
                  variant="primary"
                  dataCta={`demo-pricing-${pkg.id}`}
                  className="w-full px-5 py-3.5 text-[15px] font-bold"
                >
                  {ctaLabels.demo}
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
