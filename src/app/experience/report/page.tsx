import { Buddy } from "@/components/play/Doodles";
import Link from "next/link";
import { DemoNotice } from "@/components/play/Badges";
import { PlayIcon, PopLink } from "@/components/play/PopButton";
import { Sticker } from "@/components/play/Stickers";
import { DEMO_REPORT } from "@/data/experience/report";
import { experienceWeek } from "@/data/experience/weeks";
import { GROWTH_METRIC_GUIDE, GROWTH_METRIC_LABEL } from "@/lib/curriculum/taxonomies";

export const metadata = {
  title: "성장 리포트 예시 (가상) | TeachAble Art Play",
  description: "가상의 원아 관찰 사례로 만든 성장 리포트 예시입니다. 점수 · 순위 · 진단 없이 아이의 시도와 변화를 이야기로 기록합니다.",
  alternates: { canonical: "/experience/report" },
};

const TONES = [
  { soft: "bg-pop-pink-soft", text: "text-pop-pink-deep", color: "#ff4f8b" },
  { soft: "bg-pop-sky-soft", text: "text-pop-sky-deep", color: "#4da3ff" },
  { soft: "bg-pop-yellow-soft", text: "text-pop-ink", color: "#ffc928" },
  { soft: "bg-pop-mint-soft", text: "text-pop-mint-deep", color: "#22c3b5" },
  { soft: "bg-pop-lilac-soft", text: "text-pop-lilac-deep", color: "#9b7bff" },
];

/**
 * 가상 성장 리포트 — 실제 원아 · 기관 데이터와 연결되지 않는다 (src/data/experience/report.ts).
 * ★ 점수 · 그래프 · 순위를 그리지 않는다. 관찰 관점별 한 장면을 문장으로 보여 준다.
 */
export default function ExperienceReportPage() {
  return (
    <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
      <section aria-labelledby="report-title" className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#eee8ff_0%,#fffaf0_85%)]">
        <div aria-hidden="true" className="dots absolute inset-0 -z-10 opacity-50" />
        <div className="mx-auto max-w-[1100px] px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
          {/* 모바일은 항상 두 줄 — 글꼴이 늦게 와도 줄 수가 바뀌지 않아 아래가 밀리지 않는다 (CLS) */}
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <span className="rounded-full bg-pop-orange px-4 py-2 text-[15px] font-extrabold text-pop-ink">가상 예시</span>
            <DemoNotice />
          </div>
          {/* 두 줄 고정 — 제목 글꼴(Jua)이 늦게 와도 줄 수가 같아 아래 리포트가 밀리지 않는다 (CLS) */}
          <h1 id="report-title" className="mt-6 font-display text-[40px] leading-[1.2] text-pop-ink sm:text-[56px]">
            <span className="block">성장 리포트</span>
            <span className="block text-pop-lilac-deep">미리 보기</span>
          </h1>
          <p className="mt-4 max-w-[46ch] text-[18px] font-medium leading-relaxed text-pop-ink-muted">
            실제 아이가 아닌 지어낸 사례입니다. 점수나 순위 대신, 아이가 시도한 순간과 스스로 한 말을 다섯 가지 관점으로 기록합니다.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-4 pb-20 sm:px-6">
        <article aria-label="가상 성장 리포트" className="relative -mt-2 overflow-hidden rounded-[40px] bg-white shadow-pop-lg">
          <header className="relative flex flex-wrap items-end justify-between gap-4 bg-pop-ink px-6 py-8 text-white sm:px-10">
            <div>
              <p className="text-[14px] font-bold text-pop-yellow">{DEMO_REPORT.classLabel} · {DEMO_REPORT.period}</p>
              <p className="mt-2 font-display text-[32px] sm:text-[40px]">{DEMO_REPORT.childLabel}</p>
            </div>
            <Buddy character="pupu" sizes="140px" className="-mb-6 w-[100px] sm:w-[120px]" />
          </header>

          <div className="grid gap-8 p-6 sm:p-10">
            <section aria-labelledby="summary-title" className="rounded-[28px] bg-pop-yellow-soft p-6">
              <h2 id="summary-title" className="font-display text-[22px] text-pop-ink">이번 기간의 하늘이</h2>
              <p className="mt-2 text-[17px] leading-relaxed text-pop-ink">{DEMO_REPORT.summary}</p>
            </section>

            <section aria-labelledby="moments-title">
              <h2 id="moments-title" className="font-display text-[26px] text-pop-ink">다섯 가지 관점으로 본 장면</h2>
              <ol className="mt-5 grid gap-4">
                {DEMO_REPORT.moments.map((m, i) => {
                  const tone = TONES[i % TONES.length];
                  const week = experienceWeek(m.week);
                  return (
                    <li key={m.title} className={`relative rounded-[28px] p-6 ${tone.soft}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full bg-white px-3 py-1 text-[14px] font-extrabold ${tone.text}`}>{GROWTH_METRIC_LABEL[m.metric]}</span>
                        {week ? (
                          <Link href={`/experience/weeks/${week.weekNo}`} className="inline-flex min-h-11 items-center rounded-full bg-white/70 px-4 text-[13px] font-bold text-pop-ink hover:bg-white">
                            {week.weekNo}주차 《{week.title}》
                          </Link>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-[19px] font-extrabold text-pop-ink">{m.title}</h3>
                      <p className="mt-2 text-[16px] leading-relaxed text-pop-ink">{m.observed}</p>
                      {m.childVoice ? (
                        <p className="mt-3 inline-block rounded-2xl bg-white px-4 py-2 text-[15px] font-bold text-pop-ink">💬 “{m.childVoice}”</p>
                      ) : null}
                      <p className="mt-3 text-[13px] text-pop-ink-muted">관점 설명 · {GROWTH_METRIC_GUIDE[m.metric]}</p>
                      <Sticker kind="star" color={tone.color} className="absolute right-5 top-5 h-8 w-8" />
                    </li>
                  );
                })}
              </ol>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <section aria-labelledby="next-title" className="rounded-[28px] bg-pop-mint-soft p-6">
                <h2 id="next-title" className="font-display text-[22px] text-pop-ink">다음에 이렇게 도울게요</h2>
                <p className="mt-2 text-[16px] leading-relaxed text-pop-ink">{DEMO_REPORT.nextSupport}</p>
              </section>
              <section aria-labelledby="home-title" className="rounded-[28px] bg-pop-pink-soft p-6">
                <h2 id="home-title" className="font-display text-[22px] text-pop-ink">가정에서 함께해요</h2>
                <p className="mt-2 text-[16px] leading-relaxed text-pop-ink">{DEMO_REPORT.homeTip}</p>
              </section>
            </div>

            <p className="rounded-2xl bg-pop-cream px-5 py-4 text-[14px] leading-relaxed text-pop-ink-muted">
              이 리포트는 체험을 위한 가상 예시입니다. 실제 서비스의 리포트는 담당 선생님이 작성하고 원장님이 확인한 뒤, 보호자 동의 범위 안에서만 공유됩니다.
            </p>
          </div>
        </article>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <PopLink href="/experience/classroom/4" tone="pink" size="xl">
            <PlayIcon />
            수업 체험하기
          </PopLink>
          <PopLink href="/experience/weeks" tone="white" size="xl">24주 둘러보기</PopLink>
        </div>
      </div>
    </main>
  );
}
