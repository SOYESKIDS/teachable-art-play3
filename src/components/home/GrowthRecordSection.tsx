import { AvailabilityTag, HomeHeading, HomeSection } from "./HomeSection";
import { growthNarrative as copy } from "@/data/home-narrative";
import { GROWTH_STAGE_OPTIONS } from "@/components/home/growth-stages";

/**
 * 07 GROWTH RECORD — 관찰과 성장기록.
 *
 * ★ 예전 AI 원칙 · 성장 비교(BEFORE/AFTER) · 학부모 리포트 세 섹션을 하나로 합쳤다.
 * ★ 지금 제공하는 관찰 기록(관찰 영역 · 아이의 말 · 교사 관찰)과
 *   출시 준비 중인 성장 지표 · 관찰 단계를 나눠 그린다 — 없는 기능을 제공 중처럼 보이지 않게.
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
          {/* 지금 제공 — 공개 후보 앱의 실제 관찰 입력 항목 */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-title-sm font-bold text-navy">{copy.current.title}</h3>
            <AvailabilityTag value={copy.current.availability} />
          </div>
          <p className="mt-3 text-caption font-semibold text-ink-muted">관찰 영역 5가지</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {copy.current.domains.map((domain) => (
              <li key={domain} className="rounded-full border border-line bg-ivory px-3.5 py-1.5 text-label font-semibold text-navy">
                {domain}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-caption font-semibold text-ink-muted">교사가 남기는 것</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {copy.current.fields.map((field) => (
              <li key={field} className="flex items-center gap-2 text-label text-ink">
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                {field}
              </li>
            ))}
          </ul>

          {/* 출시 준비 중 — 공개 후보 앱에 아직 없는 기능. 지금 제공처럼 보이지 않게 따로 묶는다 */}
          <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-title-sm font-bold text-navy">{copy.upcoming.title}</h3>
              <AvailabilityTag value={copy.upcoming.availability} />
            </div>
            <p className="mt-2 text-label text-ink">{copy.upcoming.body}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {copy.upcoming.metrics.map((metric) => (
                <li key={metric} className="rounded-full border border-line px-3 py-1 text-caption font-semibold text-navy">
                  {metric}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-caption text-ink-muted">{copy.upcoming.stageNote}</p>
            {/* 단계 이름 · 설명은 개발 중인 교사 화면과 같은 원본(GROWTH_STAGE_OPTIONS)을 쓴다 */}
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {/* 기록 없음 = 실패 · 비활성이 아니다 — 다른 단계와 같은 재질 · 같은 글자색 */}
              <div className="rounded-2xl border border-line bg-ivory p-3">
                <dt className="text-body font-bold text-navy">{copy.upcoming.noRecord.label}</dt>
                <dd className="mt-1 text-caption text-ink-muted">{copy.upcoming.noRecord.help}</dd>
              </div>
              {GROWTH_STAGE_OPTIONS.map((stage) => (
                <div key={stage.value} className="rounded-2xl border border-line p-3">
                  <dt className="text-body font-bold text-navy">{stage.label}</dt>
                  <dd className="mt-1 text-caption text-ink-muted">{stage.help}</dd>
                </div>
              ))}
            </dl>
          </div>

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

          <div className="rounded-3xl border border-info-border bg-info-soft p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-title-sm font-bold text-navy">{copy.ai.title}</h3>
              <AvailabilityTag value={copy.ai.availability} />
            </div>
            <p className="mt-3 text-label text-ink">{copy.ai.body}</p>
          </div>
        </div>
      </div>
    </HomeSection>
  );
}
