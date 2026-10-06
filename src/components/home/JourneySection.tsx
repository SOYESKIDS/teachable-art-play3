import Link from "next/link";
import { HomeHeading, HomeSection } from "./HomeSection";
import { buttonClasses } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { journeyNarrative as copy } from "@/data/home-narrative";
import { STARTER_JOURNEY_GROUPS, STARTER_WEEKS, feedsFinalForest } from "@/lib/content/starter-journey";

/**
 * 06 8-WEEK JOURNEY — STARTER 8주를 하나의 이야기로.
 *
 * ★ 주차 제목 · 성장키워드 · 한 줄은 canonical manifest 에서 읽는다.
 * ★ 4~7주 카드의 "8주 숲 현수막으로 이어짐" 표시는 원본 cross_week (W8 현수막 요소) 근거다.
 * ★ 목록은 이해용이다. 준비물 · 진행 등 실행 정보는 /programs/starter 상세에서 펼친다.
 */
export function JourneySection() {
  return (
    <HomeSection id="journey" tone="white" labelledBy="journey-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <HomeHeading id="journey-title" eyebrow={copy.eyebrow} headline={copy.headline} subCopy={copy.subCopy} />
        <Link href={copy.cta.href} className={buttonClasses({ variant: "tertiary", className: "shrink-0" })}>
          {copy.cta.label}
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <ol className="mt-12 grid gap-5 lg:grid-cols-[3fr_4fr_1.7fr]">
        {STARTER_JOURNEY_GROUPS.map((group, groupIndex) => {
          const weeks = STARTER_WEEKS.filter((w) => (group.weeks as readonly number[]).includes(w.week));
          const isForest = group.key === "forest";
          return (
            <li
              key={group.key}
              className={cx(
                "relative flex flex-col rounded-3xl p-5 sm:p-6",
                isForest ? "bg-navy text-white" : "border border-line bg-ivory",
              )}
            >
              {/* 단계가 이어진다는 표시 — lg 이상 가로(→), 그보다 좁으면 세로(↓) */}
              {groupIndex < STARTER_JOURNEY_GROUPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-[18px] left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-white text-caption font-bold text-accent-strong lg:top-8 lg:-right-[18px] lg:bottom-auto lg:left-auto lg:translate-x-0"
                >
                  <span className="lg:hidden">↓</span>
                  <span className="hidden lg:inline">→</span>
                </span>
              ) : null}
              <p className={cx("eyebrow-ko", isForest ? "text-accent-on-dark" : "text-accent-strong")}>
                {String(groupIndex + 1).padStart(2, "0")} · {group.label}
              </p>
              <p className={cx("mt-2 text-label", isForest ? "text-white/75" : "text-ink-muted")}>{group.summary}</p>

              <ol
                className={cx(
                  "mt-5 grid flex-1 gap-2.5",
                  group.key === "open" && "sm:grid-cols-3 lg:grid-cols-1",
                  group.key === "grow" && "sm:grid-cols-2",
                )}
              >
                {weeks.map((week) => (
                  <li
                    key={week.week}
                    className={cx("flex flex-col rounded-2xl p-4", isForest ? "bg-white/10" : "bg-white ring-1 ring-line")}
                  >
                    <p className="flex items-center justify-between gap-2">
                      <span className={cx("text-caption font-bold tabular-nums", isForest ? "text-white/70" : "text-ink-muted")}>
                        {week.week}주차
                      </span>
                      <span
                        className={cx(
                          "rounded-full px-2 py-0.5 text-micro font-bold",
                          isForest ? "bg-accent-on-dark text-navy" : "bg-secondary-soft text-secondary-strong",
                        )}
                      >
                        {week.growthKeyword}
                      </span>
                    </p>
                    <p className={cx("mt-2 text-body font-bold", isForest ? "text-white" : "text-navy")}>{week.title}</p>
                    <p className={cx("mt-1 text-caption", isForest ? "text-white/75" : "text-ink-muted")}>{week.coreMessage}</p>
                    {isForest ? (
                      <ul className="mt-4 flex flex-col gap-1.5 border-t border-white/15 pt-3">
                        {STARTER_WEEKS.filter(feedsFinalForest).map((piece) => (
                          <li key={piece.week} className="flex gap-2 text-caption text-white/80">
                            <span className="shrink-0 font-bold tabular-nums text-accent-on-dark">{piece.week}주</span>
                            {piece.artActivity.split(" (")[0]}
                          </li>
                        ))}
                        <li className="pt-1 text-caption font-bold text-white">→ 하나의 숲 현수막</li>
                      </ul>
                    ) : null}
                    {!isForest && feedsFinalForest(week) ? (
                      <p className="mt-auto flex items-center gap-1 pt-2 text-micro font-semibold text-accent-strong">
                        <span aria-hidden="true">↳</span> 8주 숲 현수막으로 이어짐
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ol>
    </HomeSection>
  );
}
