import { GROWTH_FLOW, type ProgramProduct } from "@/data/program-products";

/**
 * 수업이 성장 기록으로 이어지는 흐름.
 *
 * ★ 여기 적힌 다섯 단계는 실제로 구현되어 돌아가는 것들이다.
 *   교사가 수업 중 관찰을 남기고(observations), 교사가 검토해 주간 리포트로
 *   정리한다(weekly report). 학부모 포털은 아직 열려 있지 않다 (CO-12).
 *   화면에 없는 기능을 상품 소개에 적지 않는다.
 *
 * ★ AI 를 성과로 말하지 않는다.
 *   AI 기록 정리 보조는 아직 열려 있지 않다 (AR-8) — aiNote 가 "준비 중"이라고 적는다.
 *   진단 · 평가 · 발달 단계 같은 말은 이 서비스 어디에도 없다.
 */
export function ProductGrowthFlow({ product }: { product: ProgramProduct }) {
  const { theme } = product;

  return (
    <section className="border-t border-line pt-10 sm:pt-12">
      <p
        className={`eyebrow ${theme.accentText}`}
      >
        {GROWTH_FLOW.eyebrow}
      </p>
      <h2 className="mt-2 whitespace-pre-line text-h3 font-bold text-navy">
        {GROWTH_FLOW.headline}
      </h2>

      {/*
        ★ 이 한 줄이 기록 기능의 설계 이유다.
          잘 그렸는가가 아니라 무엇을 하려 했는가를 남긴다.
          그래서 이 서비스에는 점수도 등급도 발달단계도 없다.
      */}
      <p
        className={`mt-5 border-l-[3px] pl-4 text-body-lg font-bold leading-snug text-navy sm:text-title-sm ${theme.markerBorder}`}
      >
        {GROWTH_FLOW.philosophy}
      </p>

      <ol className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-3">
        {GROWTH_FLOW.steps.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-4 text-caption font-semibold text-navy sm:text-label">
              {step}
            </span>
            {index < GROWTH_FLOW.steps.length - 1 ? (
              <span aria-hidden="true" className="text-navy/25">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <p className="mt-5 rounded-xl border border-line bg-surface-soft px-5 py-4 text-caption leading-relaxed text-ink-muted">
        {GROWTH_FLOW.aiNote}
      </p>
    </section>
  );
}
