"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui/cx";
import type { ExperiencePart, ExperienceWeek } from "@/data/experience/types";
import { WeekCard } from "./WeekCard";

/**
 * 24주 탐색 — PART 선택 + 주차 카드.
 *
 * ★ 24장 모두 서버에서 HTML 로 그려 둔다. 선택은 보이는 범위만 바꾼다 —
 *   스크립트가 늦거나 꺼져도 24주 전체가 보인다.
 * ★ 선택은 주소의 #part-N 과 맞춘다 (홈 지도에서 바로 들어올 수 있다).
 */
export function WeekExplorer({ parts, weeks }: { parts: ExperiencePart[]; weeks: ExperienceWeek[] }) {
  const [part, setPart] = useState(0);

  useEffect(() => {
    const read = () => {
      const m = window.location.hash.match(/^#part-([123])$/);
      setPart(m ? Number(m[1]) : 0);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const choose = (n: number) => {
    setPart(n);
    const url = n ? `#part-${n}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  };

  const tabs = [{ n: 0, label: "전체 24주", sub: "1~24주" }, ...parts.map((p) => ({ n: p.partNo, label: `PART ${p.partNo}`, sub: p.title }))];

  return (
    <div>
      <div role="group" aria-label="PART 선택" className="sticky top-[68px] z-30 -mx-4 flex gap-2 overflow-x-auto bg-pop-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-wrap sm:justify-center sm:rounded-full sm:px-3 lg:top-[76px]">
        {tabs.map((t) => (
          <button
            key={t.n}
            type="button"
            aria-pressed={part === t.n}
            onClick={() => choose(t.n)}
            className={cx(
              "flex min-h-14 shrink-0 flex-col items-start justify-center rounded-full px-5 text-left transition-colors",
              part === t.n ? "bg-pop-ink text-white shadow-pop" : "bg-white text-pop-ink ring-1 ring-pop-ink/10 hover:ring-pop-ink/25",
            )}
          >
            <span className="text-[15px] font-extrabold leading-tight">{t.label}</span>
            <span className={cx("text-[12px] font-semibold leading-tight", part === t.n ? "text-white/80" : "text-pop-ink-muted")}>{t.sub}</span>
          </button>
        ))}
      </div>

      {parts.map((p) => {
        const list = weeks.filter((w) => w.partNo === p.partNo);
        const hidden = part !== 0 && part !== p.partNo;
        return (
          <section key={p.partNo} id={`part-${p.partNo}`} aria-labelledby={`part-${p.partNo}-title`} hidden={hidden} className="scroll-mt-40 pt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold text-pop-pink-deep">PART {p.partNo} · {p.weekFrom}~{p.weekTo}주</p>
                <h2 id={`part-${p.partNo}-title`} className="mt-1 font-display text-[30px] text-pop-ink sm:text-[36px]">
                  {p.title}
                  {p.nameProvisional ? <span className="ml-2 align-middle font-sans text-[14px] font-bold text-pop-ink-muted">(가칭)</span> : null}
                </h2>
              </div>
              <p className="max-w-[44ch] text-[15px] text-pop-ink-muted">{p.description}</p>
            </div>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((w, i) => (
                <li key={w.weekNo} className="animate-rise" style={{ animationDelay: `${Math.min(i, 7) * 40}ms` }}>
                  <WeekCard week={w} priority={p.partNo === 1 && i < 2} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
