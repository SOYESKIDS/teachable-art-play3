import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";
import { InfoPageShell } from "@/components/public/InfoPageShell";
import { priceDisclaimerLines, pricingPackages } from "@/data/packages";

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
        <div className="flex flex-col gap-6">
          {pricingPackages.map((pkg) => (
            <section
              key={pkg.id}
              aria-labelledby={`pkg-${pkg.id}`}
              className="rounded-xl border border-line bg-white px-6 py-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 id={`pkg-${pkg.id}`} className="text-h3 font-bold text-navy">
                    {pkg.name} · {pkg.durationWeeks}주
                  </h2>
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

              <h3 className="mt-5 text-label font-bold text-navy">구성</h3>
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
