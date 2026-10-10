import { HomeHeading, HomeSection } from "./HomeSection";
import { problemNarrative as copy } from "@/data/home-narrative";

/**
 * 02 WHY — 유치원 운영의 실제 문제 다섯 가지 (A~E).
 *
 * ★ 예전 Why(3문제) + Needs(원장·교사·학부모 3카드)를 하나로 합쳤다.
 *   같은 문제를 두 번 다른 말로 하던 것을, 하루의 순서(수업 전 → 중 → 후 → 학부모 → 원)로
 *   한 번만 말한다. 다음 섹션(흐름)이 이 다섯 칸에 그대로 답한다.
 */
export function ProblemSection() {
  return (
    <HomeSection id="why" tone="white" labelledBy="why-title">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--header-height)+40px)] lg:self-start">
          <HomeHeading id="why-title" eyebrow={copy.eyebrow} headline={copy.headline} subCopy={copy.subCopy} />
        </div>

        <div>
          <ol className="divide-y divide-line border-y border-line">
            {copy.items.map((item) => (
              <li key={item.code} className="grid grid-cols-[2.5rem_1fr] gap-x-4 py-6 sm:grid-cols-[3.5rem_1fr] sm:py-7">
                <span aria-hidden="true" className="pt-0.5 text-label font-bold text-accent-strong tabular-nums">
                  {item.code}
                </span>
                <div>
                  <p className="eyebrow-ko text-ink-muted">{item.moment}</p>
                  <h3 className="mt-1 text-title-sm font-bold text-navy sm:text-title">{item.title}</h3>
                  <p className="mt-1.5 text-body-sm text-ink-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-8 border-l-2 border-accent pl-4 text-body-lg font-bold text-navy">{copy.answer}</p>
        </div>
      </div>
    </HomeSection>
  );
}
