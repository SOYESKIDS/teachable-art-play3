"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cx } from "@/components/ui/cx";
import type { ExperiencePart, ExperienceWeek } from "@/data/experience/types";
import { Motif } from "./Motif";
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

  const BAND = {
    mint: { bg: "bg-pop-mint-soft", text: "text-pop-mint-deep", chip: "bg-pop-mint" },
    sky: { bg: "bg-pop-sky-soft", text: "text-pop-sky-deep", chip: "bg-pop-sky" },
    pink: { bg: "bg-pop-pink-soft", text: "text-pop-pink-deep", chip: "bg-pop-pink" },
  } as const;

  return (
    <div>
      {/* 24주 한눈에 — 번호를 누르면 바로 그 주차로 */}
      <nav aria-labelledby="map-title" className="rounded-[32px] bg-white p-5 shadow-pop sm:p-7">
        <h2 id="map-title" className="font-display text-[22px] text-pop-ink sm:text-[26px]">24주 한눈에</h2>
        <ol className="mt-4 grid gap-4 lg:grid-cols-3">
          {parts.map((p) => (
            <li key={p.partNo} className={cx("rounded-3xl p-4", BAND[p.tone].bg)}>
              <p className={cx("text-[14px] font-extrabold", BAND[p.tone].text)}>
                PART {p.partNo} · {p.title}{p.nameProvisional ? " (가칭)" : ""}
              </p>
              <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-4">
                {weeks.filter((w) => w.partNo === p.partNo).map((w) => (
                  <li key={w.weekNo}>
                    <Link
                      href={`/experience/weeks/${w.weekNo}`}
                      prefetch={false}
                      title={`${w.weekNo}주차 ${w.title}`}
                      aria-label={`${w.weekNo}주차 ${w.title}`}
                      className="flex h-11 min-w-11 w-full items-center justify-center rounded-full font-display text-[17px] text-white transition-transform hover:scale-105 focus-visible:scale-105"
                      style={{ backgroundColor: w.themeColor }}
                    >
                      {w.weekNo}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </nav>

      <div role="group" aria-label="PART 선택" className="sticky top-[68px] z-30 -mx-4 mt-8 flex gap-2 overflow-x-auto bg-pop-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-wrap sm:justify-center sm:rounded-full sm:px-3 lg:top-[76px]">
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
          <section key={p.partNo} id={`part-${p.partNo}`} aria-labelledby={`part-${p.partNo}-title`} hidden={hidden} className={cx("mt-10 scroll-mt-40 rounded-[40px] p-5 sm:p-8", BAND[p.tone].bg)}>
            <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
              <div className="flex items-center gap-4">
                <span className={cx("flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-3xl text-pop-ink sticker", BAND[p.tone].chip)}>
                  <span className="text-[11px] font-extrabold leading-none">PART</span>
                  <span className="font-display text-[30px] leading-none">{p.partNo}</span>
                </span>
                <div>
                  <p className={cx("text-[14px] font-bold", BAND[p.tone].text)}>{p.weekFrom}~{p.weekTo}주 · {p.tagline}</p>
                  <h2 id={`part-${p.partNo}-title`} className="mt-0.5 font-display text-[28px] text-pop-ink sm:text-[36px]">
                    {p.title}
                    {p.nameProvisional ? <span className="ml-2 align-middle font-sans text-[14px] font-bold text-pop-ink-muted">(가칭)</span> : null}
                  </h2>
                </div>
              </div>
              <p className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-pop-ink-muted">{p.description}</p>
              </div>
              {/* PART 포스터 — 이 PART 여덟 주의 주제 그림. 장식이다 (아래 카드가 같은 내용을 글로 준다) */}
              <div aria-hidden="true" className="grid grid-cols-8 gap-1.5 rounded-[32px] bg-white/70 p-3 shadow-pop sm:gap-3 sm:p-5 lg:grid-cols-4">
                {list.map((w, i) => (
                  <div
                    key={w.weekNo}
                    className={cx("relative flex aspect-square items-center justify-center rounded-full ring-2 ring-white", i % 2 ? "lg:translate-y-3" : "lg:-translate-y-1")}
                    style={{ background: `radial-gradient(circle at 35% 30%, #fff 0%, ${w.themeColor}33 70%)` }}
                  >
                    <Motif motif={w.body.motif} color={w.themeColor} className="h-[62%] w-auto" />
                    <span className="absolute -bottom-1 right-0 hidden rounded-full px-1.5 text-[11px] font-extrabold text-white sm:block" style={{ backgroundColor: w.themeColor }}>
                      {w.weekNo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((w, i) => (
                <li key={w.weekNo} className="animate-rise" style={{ animationDelay: `${Math.min(i, 7) * 40}ms` }}>
                  <WeekCard week={w} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
