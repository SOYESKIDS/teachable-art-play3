import { AvailabilityTag, HomeHeading, HomeSection } from "./HomeSection";
import { growthNarrative as copy } from "@/data/home-narrative";

/**
 * 07 GROWTH RECORD — 관찰과 성장기록.
 *
 * ★ 예전 AI 원칙 · 성장 비교(BEFORE/AFTER) · 학부모 리포트 세 섹션을 하나로 합쳤다.
 * ★ 성장 지표는 점수 · 등급 · 발달 수준이 아니다 (DEC-065).
 *   단계 셋은 같은 크기 · 같은 색으로 그린다 — 높낮이 · 진행 막대 · 별점 금지.
 * ★ 기록 가이드 예시는 canonical 1주차 §12 의 실제 문장이다.
 */
export function GrowthRecordSection() {
  return (
    <HomeSection id="growth-record" tone="ivory" labelledBy="growth-title">
      <HomeHeading id="growth-title" eyebrow={copy.eyebrow} headline={copy.headline} subCopy={copy.subCopy} />

      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          <h3 className="text-title-sm font-bold text-navy">성장 지표 5가지</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {copy.metrics.map((metric) => (
              <li key={metric} className="rounded-full border border-line bg-ivory px-3.5 py-1.5 text-label font-semibold text-navy">
                {metric}
              </li>
            ))}
          </ul>

          <h3 className="mt-8 text-title-sm font-bold text-navy">관찰 단계</h3>
          <p className="mt-1 text-caption text-ink-muted">그 활동에서 어떤 도움이 필요했는지를 고릅니다.</p>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            {copy.stages.map((stage) => (
              <div key={stage.label} className="rounded-2xl border border-line p-3 text-center">
                <dt className="text-body font-bold text-navy">{stage.label}</dt>
                <dd className="mt-1 text-micro text-ink-muted">{stage.meaning}</dd>
              </div>
            ))}
          </dl>

          <ul className="mt-6 flex flex-col gap-2 border-t border-line-soft pt-5">
            {copy.rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-label text-ink">
                <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-5">
          <figure className="rounded-3xl border border-line bg-white p-6 sm:p-8">
            <p className="eyebrow-ko text-ink-muted">STARTER {copy.guideExample.week}주차 수업안 · 관찰 및 기록 가이드</p>
            <p className="mt-3 inline-flex rounded-full bg-secondary-soft px-3 py-1 text-label font-bold text-secondary-strong">
              {copy.guideExample.focus}
            </p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-caption font-semibold text-ink-muted">관찰할 행동</dt>
                <dd className="mt-1 text-body font-semibold text-navy">{copy.guideExample.look}</dd>
              </div>
              <div>
                <dt className="text-caption font-semibold text-ink-muted">기록 문장에 담을 것</dt>
                <dd className="mt-1 text-body font-semibold text-navy">{copy.guideExample.write}</dd>
              </div>
            </dl>
            <figcaption className="mt-5 border-t border-line-soft pt-4 text-caption text-ink-muted">
              교사는 무엇을 볼지 알고 수업에 들어가고, 본 것을 짧게 남깁니다.
            </figcaption>
          </figure>

          <div className="rounded-3xl bg-navy p-6 text-white sm:p-8" data-surface="dark">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-title-sm font-bold">{copy.ai.title}</h3>
              <AvailabilityTag value={copy.ai.availability} />
            </div>
            <p className="mt-3 text-label text-white/80">{copy.ai.body}</p>
          </div>
        </div>
      </div>
    </HomeSection>
  );
}
