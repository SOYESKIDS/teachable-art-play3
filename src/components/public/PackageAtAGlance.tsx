import Link from "next/link";
import { pricingPackages } from "@/data/packages";
import type { PricingPackage } from "@/types/content";

/**
 * 상품 한눈에 보기 — 원장이 세 상품을 **나란히** 놓고 고르는 화면.
 *
 * ── 무엇을 고치는가 ───────────────────────────────────────────────
 *
 * 상품 안내 페이지는 세 상품을 세로로 길게 쌓아 두었다. 그러면 「8주와 16주가
 * 뭐가 다른가」를 비교하려고 위아래로 스크롤하며 외워야 한다. 원장이 결정할 때
 * 가장 먼저 묻는 질문인데 화면이 답하지 않았다.
 *
 * ── 「준비 중」을 세어서 먼저 보여 준다 ───────────────────────────
 *
 * 구성 목록에 「준비 중」 배지가 흩어져 있으면 "이 상품은 아직 못 쓰는 건가?"
 * 로 읽힌다. 그래서 **지금 쓸 수 있는 것이 몇 개인지**를 먼저 세어 보여 준다.
 *
 * ★ 세는 값은 `features[].availability` 에서 그대로 집계한다. 여기서 판단하거나
 *   항목을 옮기지 않는다 — 숫자가 데이터와 갈라질 수 없다.
 * ★ 가격 · 기간 · 포함 여부를 이 파일이 만들지 않는다. 전부 packages.ts 가 출처다.
 */

/** 구성 항목을 제공 상태별로 센다 */
function countAvailability(pkg: PricingPackage) {
  const counts = { 포함: 0, "준비 중": 0, "계약 범위": 0 };
  // features 는 타입상 선택 항목이다. 없으면 0개로 센다 — 없는 것을 있다고 하지 않는다.
  for (const feature of pkg.features ?? []) {
    counts[feature.availability] += 1;
  }
  return counts;
}

export function PackageAtAGlance({ detailHrefPrefix = "#" }: { detailHrefPrefix?: string }) {
  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-3">
        {pricingPackages.map((pkg) => {
          const counts = countAvailability(pkg);
          return (
            <section
              key={pkg.id}
              aria-labelledby={`glance-${pkg.id}`}
              className="flex flex-col rounded-2xl border border-line bg-white p-6"
            >
              <p className="text-caption font-bold tracking-wide text-secondary-strong">
                {pkg.label}
              </p>
              <h3 id={`glance-${pkg.id}`} className="mt-2 text-title font-bold text-navy">
                {pkg.name}
                <span className="ml-2 text-body-lg font-bold text-ink-muted">
                  {pkg.durationWeeks}주
                </span>
              </h3>

              <p className="mt-3 text-body-sm leading-relaxed text-ink-muted">{pkg.fit}</p>

              <dl className="mt-5 flex flex-col gap-2.5 border-t border-line-soft pt-5 text-caption">
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 font-semibold text-ink-muted">운영</dt>
                  <dd className="text-navy">{pkg.operation}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 font-semibold text-ink-muted">남는 것</dt>
                  <dd className="text-navy">{pkg.outcome}</dd>
                </div>
              </dl>

              {/*
                ★ 「준비 중」이 섞인 목록을 그대로 보여 주기 전에, 지금 쓸 수 있는
                  것이 몇 개인지 먼저 말한다. 원장이 가장 먼저 묻는 것이다.
              */}
              <ul className="mt-5 flex flex-wrap gap-1.5" aria-label={`${pkg.name} 구성 제공 상태`}>
                <li className="rounded-full bg-success-soft px-2.5 py-1 text-caption font-semibold text-success-text">
                  지금 제공 {counts.포함}개
                </li>
                {counts["준비 중"] > 0 ? (
                  <li className="rounded-full bg-warning-soft px-2.5 py-1 text-caption font-semibold text-warning-text">
                    준비 중 {counts["준비 중"]}개
                  </li>
                ) : null}
                {counts["계약 범위"] > 0 ? (
                  <li className="rounded-full bg-ivory px-2.5 py-1 text-caption font-semibold text-ink-muted">
                    계약 범위 {counts["계약 범위"]}개
                  </li>
                ) : null}
              </ul>

              <p className="mt-5 border-t border-line-soft pt-5">
                <span className="text-h3 font-bold tabular-nums text-navy">
                  {pkg.monthlyPriceKrw.toLocaleString("ko-KR")}원
                </span>
                <span className="text-body-sm text-ink-muted"> / 월</span>
                <span className="mt-0.5 block text-caption tabular-nums text-ink-muted">
                  총 {pkg.totalPriceKrw.toLocaleString("ko-KR")}원 · {pkg.totalPriceNote}
                </span>
                <span className="mt-0.5 block text-caption text-ink-muted">
                  {pkg.priceUnitNote}
                </span>
              </p>

              <Link
                href={`${detailHrefPrefix}pkg-${pkg.id}`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-line-strong px-4 text-label font-semibold text-navy transition-colors hover:border-secondary-strong hover:text-secondary-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-strong"
              >
                {pkg.name} 구성 자세히 보기 ↓
              </Link>
            </section>
          );
        })}
      </div>

      {/*
        ★ 세 상품의 관계를 한 줄로 말한다. 「16주는 8주를 포함한다」는 구조를
          모르면 세 값이 그냥 다른 상품 세 개로 보인다.
      */}
      <p className="mt-5 rounded-xl border border-line bg-ivory px-5 py-4 text-body-sm leading-relaxed text-navy">
        세 상품은 <strong className="font-bold">같은 수업 화면과 같은 기록 방식</strong>을 씁니다.
        16주와 24주는 앞선 주차를 포함한 누적 과정이고, 달라지는 것은{" "}
        <strong className="font-bold">운영 기간과 리포트의 깊이</strong>입니다.
      </p>
    </div>
  );
}
