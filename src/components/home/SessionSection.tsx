import Image from "next/image";
import { cx } from "@/components/ui/cx";
import { HomeHeading, HomeSection } from "./HomeSection";
import { sessionNarrative as copy } from "@/data/home-narrative";
import { homeImages } from "@/data/home-images";

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
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <HomeHeading id="program-title" eyebrow={copy.eyebrow} headline={copy.headline} subCopy={copy.subCopy} />
        {/*
          단계와 장면을 짝지어 **세로로 쌓는다.**
          ★ 세 장은 비율이 서로 다르다 (16:9 교실 화면 · 4:3 마라카스 · 9:16 물감 놀이).
            가로로 나란히 두면 높이가 들쭉날쭉해 보이고, 한 비율로 맞추려면 잘라내야 한다.
            아이의 얼굴이나 활동의 핵심이 잘리면 보여 주려던 것이 사라지므로,
            너비만 고정하고 높이는 각자 실제 비율에 맡긴 뒤 세로로 쌓는다.
        */}
        <ul className="flex flex-col gap-3">
          {homeImages.sessionScenes.map((scene) => (
            <li
              key={scene.src}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface-soft p-3"
            >
              <div
                className="relative w-28 shrink-0 overflow-hidden rounded-xl bg-white"
                style={{ aspectRatio: `${scene.width} / ${scene.height}` }}
              >
                <Image
                  src={scene.src}
                  alt={scene.alt}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-label font-bold text-navy">{scene.step}</p>
                <p className="mt-1 text-caption leading-relaxed text-ink-muted">{scene.caption}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-caption leading-relaxed text-ink-muted">
        수업 장면 예시입니다. 주차별 활동과 자료 구성은 공식 수업가이드와 계약 구성을 기준으로 안내합니다.
      </p>

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
