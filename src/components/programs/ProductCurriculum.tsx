import type { ProgramProduct } from "@/data/program-products";

/**
 * 주차별 구성.
 *
 * ★ 이 컴포넌트는 데이터가 있을 때만 불린다.
 *   16주 · 24주는 아직 확정본이 없어 product.curriculum 이 undefined 이고,
 *   그러면 상세 화면에 이 단락 자체가 생기지 않는다.
 *   "준비 중입니다"라는 빈 상자를 크게 띄우는 것보다 낫다 —
 *   그 상자는 아무것도 알려 주지 않으면서 자리만 차지한다.
 *
 * ★ 주제 이름 말고는 아무것도 적지 않는다.
 *   활동 내용이나 학습 목표를 그럴듯하게 지어 넣지 않는다.
 *   확정된 것은 여덟 개의 주제뿐이고, 화면에는 그것만 있다.
 */
export function ProductCurriculum({ product }: { product: ProgramProduct }) {
  const { curriculum, theme } = product;
  if (!curriculum) return null;

  return (
    <section className="border-t border-navy/10 pt-10 sm:pt-12">
      <p
        className={`text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
      >
        {curriculum.eyebrow}
      </p>
      <h2 className="mt-2 text-[24px] font-bold leading-snug text-navy sm:text-[28px]">
        {curriculum.headline}
      </h2>
      <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-navy/60">
        {curriculum.subCopy}
      </p>

      <ol className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {curriculum.weeks.map((entry) => (
          <li
            key={entry.week}
            className={`flex h-full flex-col justify-between rounded-xl border p-4 ${
              entry.finale
                ? "border-navy bg-navy text-white sm:col-span-2 lg:col-span-2"
                : "border-navy/10 bg-white"
            }`}
          >
            <p
              className={`text-[11px] font-bold tabular-nums tracking-[0.14em] ${
                entry.finale ? "text-yellow" : theme.accentText
              }`}
            >
              {`WEEK ${String(entry.week).padStart(2, "0")}`}
            </p>

            <p
              className={`mt-3 break-keep text-[16px] font-bold leading-snug ${
                entry.finale ? "text-white" : "text-navy"
              }`}
            >
              {entry.theme}
            </p>

            {/*
              마지막 주차는 색만으로 구분하지 않는다.
              색을 보지 못해도 "마무리"라는 글자가 그 사실을 말한다.
            */}
            {entry.finale ? (
              <p className="mt-2 text-[12px] font-semibold text-white/70">
                마무리 — 여덟 주가 하나로 모입니다
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
