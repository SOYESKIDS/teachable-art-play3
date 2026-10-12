import Image from "next/image";
import { cx } from "@/components/ui/cx";
import { HomeHeading, HomeSection } from "./HomeSection";
import { sessionNarrative as copy } from "@/data/home-narrative";

/**
 * 05 ONE SESSION — 한 번의 수업을 장면으로.
 *
 *   이야기 열기 → 몸으로 느끼기 → 나답게 표현하기 → 친구와 나누기 → 교사 관찰 기록
 *
 * ★ 수업 시간 표준(2026-10-09): CORE 50분(워크북 포함) + 선택 연계활동 10~15분.
 *   단계별 분 배분은 회차마다 달라 막대 · 분 숫자를 그리지 않는다 (예전 DEC-023 배분은 워크북 제외 값이었다).
 * ★ 다섯 번째 단계(교사 관찰 기록)는 수업 중 · 후에 걸쳐 짧게 남기는 일이다.
 */
export function SessionSection() {
  return (
    <HomeSection id="program" tone="white" labelledBy="program-title">
      <div className="grid items-end gap-10 lg:grid-cols-2 lg:gap-16">
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

      <div className="mt-14 rounded-3xl border border-line bg-ivory p-5 sm:p-8">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {copy.steps.map((step, index) => {
            const isRecord = !step.inClass;
            return (
              <li
                key={step.title}
                className={cx("flex flex-col rounded-2xl p-4", isRecord ? "bg-secondary-soft ring-1 ring-success-border" : "bg-white ring-1 ring-line")}
              >
                <p className="flex items-baseline justify-between gap-2">
                  <span className={cx("text-caption font-bold tabular-nums", isRecord ? "text-secondary-strong" : "text-ink-muted")}>
                    0{index + 1}
                  </span>
                  <span className={cx("text-caption font-bold tabular-nums", isRecord ? "text-secondary-strong" : "text-navy")}>
                    {step.time}
                  </span>
                </p>
                <p className={cx("mt-2 text-body-lg font-bold", "text-navy")}>{step.title}</p>
                <p className={cx("mt-1 text-caption", "text-ink-muted")}>{step.detail}</p>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-caption text-ink-muted">{copy.timeNote}</p>
      </div>

      <div className="mt-10 grid divide-y divide-line rounded-2xl border border-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {copy.support.map((group) => (
          <div key={group.phase} className="p-6">
            <h3 className="text-title-sm font-bold text-navy">교사 지원 · {group.phase}</h3>
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
