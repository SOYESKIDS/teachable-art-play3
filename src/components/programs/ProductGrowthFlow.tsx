import { GROWTH_FLOW, type ProgramProduct } from "@/data/program-products";

/**
 * 수업이 성장 기록으로 이어지는 흐름.
 *
 * ★ 여기 적힌 다섯 단계는 실제로 구현되어 돌아가는 것들이다.
 *   교사가 수업 중 관찰을 남기고(observations), 그것이 성장 리포트가 되고
 *   (growth reports), 원장이 만든 링크로 학부모에게 전달된다(parent share).
 *   화면에 없는 기능을 상품 소개에 적지 않는다.
 *
 * ★ AI 를 성과로 말하지 않는다.
 *   "AI가 아이를 분석한다"가 아니라 "기록 정리를 보조하고 교사가 검토한다"이다.
 *   실제 구현도 그렇다 — 교사가 검토하고 작성 완료해야 학부모에게 나간다.
 *   진단 · 평가 · 발달 단계 같은 말은 이 서비스 어디에도 없다.
 */
export function ProductGrowthFlow({ product }: { product: ProgramProduct }) {
  const { theme } = product;

  return (
    <section className="border-t border-navy/10 pt-10 sm:pt-12">
      <p
        className={`text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
      >
        {GROWTH_FLOW.eyebrow}
      </p>
      <h2 className="mt-2 whitespace-pre-line text-[24px] font-bold leading-snug text-navy sm:text-[28px]">
        {GROWTH_FLOW.headline}
      </h2>

      <ol className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-3">
        {GROWTH_FLOW.steps.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span className="inline-flex min-h-10 items-center rounded-full border border-navy/12 bg-white px-4 text-[13px] font-semibold text-navy sm:text-[14px]">
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

      <p className="mt-5 rounded-xl border border-navy/10 bg-surface-soft px-5 py-4 text-[13px] leading-relaxed text-navy/60">
        {GROWTH_FLOW.aiNote}
      </p>
    </section>
  );
}
