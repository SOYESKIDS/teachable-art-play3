import Image from "next/image";
import { HomeHeading, HomeSection } from "./HomeSection";
import { sessionNarrative as copy } from "@/data/home-narrative";

const TOTAL = copy.steps.reduce((sum, step) => sum + step.minutes, 0);

/**
 * 04 ONE SESSION — 한 번의 수업 (DEC-023 표준 수업 골격).
 *
 * ★ 예전 5단계(마음 열기 5 · 주제 이해 10 · 창의 표현 25 · 정리 5 · 나눔 5)는
 *   승인된 원본과 달랐다. 원본의 6단계 · 50분 · 워크북 별도 10분으로 고쳤다.
 * ★ 막대 길이는 실제 분(分) 비율이다 — 장식 차트가 아니다.
 */
export function SessionSection() {
  return (
    <HomeSection id="program" tone="white" labelledBy="program-title">
      <div className="grid items-end gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <HomeHeading id="program-title" eyebrow={copy.eyebrow} headline={copy.headline} subCopy={copy.subCopy} />
        <figure>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-line bg-surface-soft">
            <Image
              src="/images/site/classroom/classroom-teacher-activity.webp"
              alt="담임교사 한 명이 교실 앞에서 동작을 시범 보이고 아이들이 뒤에서 따라 하는 실제 수업 장면"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-2.5 text-caption text-ink-muted">실제 수업 현장 — 담임교사 한 명이 운영합니다</figcaption>
        </figure>
      </div>

      {/* 50분 타임라인 */}
      <div className="mt-14 rounded-3xl border border-line bg-ivory p-5 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-title font-bold text-navy">
            <span className="tabular-nums">{TOTAL}</span>분 · 6단계
          </p>
          <p className="text-caption text-ink-muted">{copy.workbookNote}</p>
        </div>

        <div aria-hidden="true" className="mt-5 hidden h-3 overflow-hidden rounded-full sm:flex">
          {copy.steps.map((step, index) => (
            <span
              key={step.title}
              style={{ flexGrow: step.minutes }}
              className={index === 3 ? "bg-navy" : index === 4 ? "bg-accent" : "bg-navy/20 even:bg-navy/30"}
            />
          ))}
        </div>

        <ol className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {copy.steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-caption font-bold text-ink-muted tabular-nums">0{index + 1}</span>
                <span className="text-label font-bold text-navy tabular-nums">{step.minutes}분</span>
              </p>
              <p className="mt-2 text-body font-bold text-navy">{step.title}</p>
              <p className="mt-1 text-caption text-ink-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* 교사 지원 — 수업 전 · 중 · 후 */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {copy.support.map((group) => (
          <div key={group.phase} className="rounded-2xl border border-line p-6">
            <h3 className="text-title-sm font-bold text-navy">{group.phase}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {group.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-label text-ink">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-[3px] shrink-0 text-secondary">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
