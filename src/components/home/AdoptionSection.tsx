import { LeadCtaButton } from "@/components/forms/LeadCtaButton";
import { ctaLabels } from "@/data/site-copy";
import { HomeHeading, HomeSection } from "./HomeSection";
import { adoptionNarrative as copy } from "@/data/home-narrative";

/**
 * 11 ONBOARDING — 실제 도입 절차.
 *
 * ★ 예전 절차(상담 → 데모 → 4주 파일럿 → 운영 리뷰 → 정규 도입)는 파일럿을 필수 단계로 그렸다.
 *   승인 문서는 상담 · 데모 → 견적 · 계약 → 본사 설정 → 활성화 → 온보딩 순서이고,
 *   파일럿은 별도 선택지다 (DEC-054 · DEC-061 · 03-commerce/admin-flow.md).
 * ★ 예전 Pilot 섹션(데모 상자 + 파일럿 상자)을 이 섹션 안으로 합쳤다.
 *   "온라인 · 방문 모두 가능"은 근거 문서가 없어 뺐다.
 */
export function AdoptionSection() {
  return (
    <HomeSection id="adoption" tone="ivory" labelledBy="adoption-title">
      <HomeHeading id="adoption-title" eyebrow={copy.eyebrow} headline={copy.headline} />

      {/*
        ★ V4: 여섯 상자 대신 한 줄 타임라인 — 절차가 복잡해 보이지 않게.
          xl 이상 가로 · 그보다 좁으면 세로.
      */}
      <ol className="relative mt-12 grid gap-6 xl:grid-cols-6 xl:gap-4">
        <span aria-hidden="true" className="absolute top-2 bottom-2 left-[7px] w-px bg-line-strong xl:top-[7px] xl:right-8 xl:bottom-auto xl:left-2 xl:h-px xl:w-auto" />
        {copy.steps.map((step) => (
          <li key={step.no} className="relative grid grid-cols-[1rem_1fr] gap-x-4 xl:block">
            <span aria-hidden="true" className="relative z-10 mt-1 h-[15px] w-[15px] rounded-full border-2 border-accent bg-ivory xl:mt-0 xl:block" />
            <div className="xl:mt-4">
              <p className="text-caption font-bold text-accent-strong tabular-nums">{step.no}</p>
              <h3 className="mt-1 text-body-lg font-bold text-navy">{step.title}</h3>
              <p className="mt-1 text-label text-ink-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col justify-between gap-6 rounded-3xl border border-line bg-white p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h3 className="text-title font-bold text-navy">{copy.demo.title}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {copy.demo.items.map((item) => (
                <li key={item} className="rounded-full border border-line bg-ivory px-3 py-1 text-caption text-ink">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <LeadCtaButton type="demo" variant="secondary" dataCta="demo-pilot-section" className="shrink-0 font-bold">
            {ctaLabels.demo}
          </LeadCtaButton>
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-3xl border border-line bg-white p-6 sm:p-8">
          <div>
            <h3 className="text-title-sm font-bold text-navy">{copy.pilot.title}</h3>
            <p className="mt-2 text-label text-ink-muted">{copy.pilot.body}</p>
          </div>
          <LeadCtaButton type="pilot" variant="tertiary" dataCta="pilot-inquiry" className="self-start">
            {ctaLabels.pilot}
          </LeadCtaButton>
        </div>
      </div>
    </HomeSection>
  );
}
