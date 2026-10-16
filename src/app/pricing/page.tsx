import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";
import { InfoPageShell } from "@/components/public/InfoPageShell";
import { priceDisclaimerLines, pricingPackages } from "@/data/packages";
import { PackageAtAGlance } from "@/components/public/PackageAtAGlance";
import { PackageComparison } from "@/components/public/PackageComparison";

export const metadata: Metadata = {
  title: "상품 안내 | TeachAble Art Play",
  description:
    "STARTER 8주 · STANDARD 16주 · PREMIUM 24주. 원의 일정에 맞춰 세 가지로 시작할 수 있습니다.",
};

/**
 * 공개 상품 안내 — 세 상품 비교.
 *
 * ── 값을 여기서 만들지 않는다 ────────────────────────────────────
 *
 * ★ 가격 · 구성 · 포함 여부는 전부 `src/data/packages.ts` 에서 읽는다. 그
 *   파일이 상품소개서 v4 를 기준으로 만들어진 단일 출처다. 이 페이지가 숫자를
 *   따로 적으면 홈 화면의 상품 섹션과 어긋난다.
 *
 * ── 준비 중을 포함으로 보이게 하지 않는다 ───────────────────────
 *
 * ★ 각 구성 항목은 `availability` 를 들고 있다 — 포함 · 준비 중 · 계약 범위.
 *   세 가지를 한 목록에 섞어 체크 표시만 달면 아직 제공하지 않는 것을 판매
 *   확정으로 읽게 된다. 그래서 상태를 글자로 함께 적는다.
 */
export default function PricingPage() {
  return (
    <PublicShell>
      <InfoPageShell
        eyebrow="상품 안내"
        headline={"원의 일정에 맞춰\n한 권부터"}
        subCopy="세 상품 모두 같은 수업 화면과 같은 기록 방식을 씁니다. 다른 것은 기간과 리포트의 깊이입니다."
      >
        {/*
          ★ 비교를 먼저 둔다. 이 페이지는 세 상품을 **세로로 길게 쌓아** 두어
            「8주와 16주가 뭐가 다른가」를 알려면 위아래로 스크롤하며 외워야 했다.
            원장이 가장 먼저 묻는 질문이므로 화면 맨 앞에서 답한다.
          ★ 아래의 자세한 구성은 그대로 둔다 — 요약이 원문을 대신하지 않는다.
        */}
        <section aria-labelledby="glance-title">
          <h2 id="glance-title" className="text-title-lg font-bold text-navy">
            한눈에 보기
          </h2>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-muted">
            우리 원에 맞는 기간을 먼저 고르고, 아래에서 구성을 자세히 확인하세요.
          </p>
          <div className="mt-6">
            <PackageAtAGlance />
          </div>
        </section>

        <section aria-labelledby="compare-title" className="mt-14">
          <h2 id="compare-title" className="text-title-lg font-bold text-navy">
            항목별 비교
          </h2>
          <PackageComparison className="mt-6" />
        </section>

        <h2 id="detail-title" className="mt-14 text-title-lg font-bold text-navy">
          상품별 자세한 구성
        </h2>
        <p className="mt-2 text-body-sm leading-relaxed text-ink-muted">
          구성 항목마다 지금 제공하는지(포함), 아직 만들고 있는지(준비 중),
          계약 조건에 따르는지(계약 범위)를 함께 적었습니다.
        </p>

        <div className="mt-6 flex flex-col gap-6">
          {pricingPackages.map((pkg) => (
            <section
              key={pkg.id}
              id={`pkg-${pkg.id}`}
              aria-labelledby={`pkg-${pkg.id}-title`}
              className="scroll-mt-[calc(var(--header-height)_+_16px)] rounded-xl border border-line bg-white px-6 py-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 id={`pkg-${pkg.id}-title`} className="text-h3 font-bold text-navy">
                    {pkg.name} · {pkg.durationWeeks}주
                  </h3>
                  <p className="mt-1 text-body-sm text-ink-muted">{pkg.label}</p>
                </div>
                <p className="text-right">
                  <span className="text-h3 font-bold tabular-nums text-navy">
                    {pkg.monthlyPriceKrw.toLocaleString("ko-KR")}원
                  </span>
                  <span className="text-body-sm text-ink-muted"> / 월</span>
                  <span className="block text-caption tabular-nums text-ink-muted">
                    총 {pkg.totalPriceKrw.toLocaleString("ko-KR")}원 · {pkg.totalPriceNote}
                  </span>
                </p>
              </div>

              <p className="mt-3 text-body-sm leading-relaxed text-ink">{pkg.definition}</p>
              <p className="mt-1 text-caption text-ink-muted">
                {pkg.priceUnitNote} · {pkg.frequency}
              </p>

              <h4 className="mt-5 text-label font-bold text-navy">구성</h4>
              <ul className="mt-2 flex flex-col gap-1.5">
                {/* features 는 선택 항목이다 — 없으면 목록을 그리지 않는다 */}
                {(pkg.features ?? []).map((f) => (
                  <li
                    key={f.label}
                    className="flex flex-wrap items-baseline gap-x-2 text-body-sm text-ink"
                  >
                    <span>{f.label}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-micro font-semibold ${
                        f.availability === "포함"
                          ? "bg-brand-mint text-success-text"
                          : f.availability === "준비 중"
                            ? "bg-warning-soft text-warning-text"
                            : "bg-surface-soft text-ink-muted"
                      }`}
                    >
                      {f.availability}
                      {f.note ? ` · ${f.note}` : ""}
                    </span>
                  </li>
                ))}
              </ul>

              {pkg.excludedItems && pkg.excludedItems.length > 0 ? (
                <p className="mt-3 text-caption text-ink-muted">
                  포함되지 않음 · {pkg.excludedItems.join(" · ")}
                </p>
              ) : null}
            </section>
          ))}
        </div>

        <section aria-labelledby="price-terms" className="mt-10 border-t border-line pt-8">
          <h2 id="price-terms" className="text-label font-bold text-navy">
            가격 조건
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {priceDisclaimerLines.map((line) => (
              <li key={line} className="text-body-sm leading-relaxed text-ink-muted">
                {line}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/curriculum"
            className="inline-flex min-h-12 items-center rounded-lg border border-navy/20 px-5 text-label font-semibold text-navy"
          >
            24주 수업 보기
          </Link>
          <Link
            href="/#contact"
            className="inline-flex min-h-12 items-center rounded-lg bg-navy px-5 text-label font-semibold text-white"
          >
            도입 상담 신청
          </Link>
        </div>
      </InfoPageShell>
    </PublicShell>
  );
}
