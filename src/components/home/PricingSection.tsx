import { Container } from "@/components/ui/Container";
import { HomeHeading } from "./HomeSection";
import { PricingCardGrid } from "./PricingCardGrid";
import { priceDisclaimerLines, pricingPackages } from "@/data/packages";
import { PackageComparison } from "@/components/public/PackageComparison";
import { pricingNarrative } from "@/data/home-narrative";

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
      aria-labelledby="pricing-title"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <HomeHeading
          id="pricing-title"
          eyebrow={pricingNarrative.eyebrow}
          headline={pricingNarrative.headline}
          subCopy={pricingNarrative.subCopy}
        />

        {/*
          ── 어떤 원에 맞나요? ──────────────────────────────────────
          ★ 가격표보다 먼저 온다 — "얼마인가"보다 "우리 원에 맞는가"가 B2B 구매의 첫 질문이다.
          ★ 예전 시나리오(A/B/C)의 "STANDARD 전 학급 확대" · "포트폴리오 · 월간 리포트 확인"은
            한 번에 계약 하나(DEC-049) · 미구현 기능이라 걷었다.
        */}
        <div className="mt-12">
          <h3 className="text-title-sm font-bold text-navy">{pricingNarrative.fitEyebrow}</h3>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {pricingNarrative.fits.map((fit) => {
              const pkg = pricingPackages.find((item) => item.id === fit.packageId);
              return (
                <li key={fit.packageId} className="flex flex-col rounded-2xl border border-line bg-ivory p-5">
                  <p className="text-body-lg font-bold text-navy">{fit.situation}</p>
                  <p className="mt-1.5 text-label text-ink-muted">{fit.detail}</p>
                  <p className="mt-auto flex items-center gap-2 pt-4 text-label font-bold text-navy">
                    <span aria-hidden="true" className="text-accent-strong">→</span>
                    {pkg ? `${pkg.name} · ${pkg.durationWeeks}주` : fit.packageId}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        <PricingCardGrid />

        <div className="mt-6 text-center text-caption leading-relaxed text-ink-muted">
          {priceDisclaimerLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        {/*
          비교표는 공개 상품 안내(/pricing)와 **같은 컴포넌트**를 쓴다.
          같은 표를 두 곳에서 따로 그리면 한쪽만 고쳐져 값이 갈라진다.
        */}
        <PackageComparison className="mt-16" />

      </Container>
    </section>
  );
}
