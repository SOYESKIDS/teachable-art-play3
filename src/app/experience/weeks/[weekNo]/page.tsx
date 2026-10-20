import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentStatusBadge, DemoNotice } from "@/components/play/Badges";
import { ArrowRight, PlayIcon, PopLink } from "@/components/play/PopButton";
import { Sticker } from "@/components/play/Stickers";
import { WeekArt } from "@/components/play/WeekArt";
import { cx } from "@/components/ui/cx";
import { EXPERIENCE_WEEKS, experiencePart, experienceWeek } from "@/data/experience/weeks";

/**
 * 공개 체험 · 주차 상세 (1~24주, 빌드 때 모두 생성).
 *
 * ★ 공식 값과 체험용 구성을 화면에서 나눠 보인다.
 *   위쪽 「공식 교육과정」 = week-index.ts (주차명 · 키워드 · 메시지 · 시간 · 활동 · 결과물)
 *   아래 본문 = 체험용 구성 — 상태 배지와 안내 문장을 항상 함께 둔다.
 * ★ 누리과정 5개 영역과 SOYE KIDS 핵심경험은 다른 묶음으로 보인다 (섞어 쓰지 않는다).
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return EXPERIENCE_WEEKS.map((w) => ({ weekNo: String(w.weekNo) }));
}

export async function generateMetadata({ params }: PageProps<"/experience/weeks/[weekNo]">): Promise<Metadata> {
  const { weekNo } = await params;
  const week = experienceWeek(Number(weekNo));
  if (!week) return {};
  return {
    title: `${week.weekNo}주차 「${week.title}」 | 수업 체험 | TeachAble Art Play`,
    description: `${week.coreMessage} — 성장 키워드 「${week.growthKeyword}」 · ${week.durationLabel}`,
    alternates: { canonical: `/experience/weeks/${week.weekNo}` },
  };
}

function Block({ title, tone, children, className }: { title: string; tone: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-[32px] p-6 sm:p-7", tone, className)}>
      <h2 className="font-display text-[22px] text-pop-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function ExperienceWeekPage({ params }: PageProps<"/experience/weeks/[weekNo]">) {
  const { weekNo } = await params;
  const week = experienceWeek(Number(weekNo));
  if (!week) notFound();
  const part = experiencePart(week.partNo)!;
  const prev = experienceWeek(week.weekNo - 1);
  const next = experienceWeek(week.weekNo + 1);
  const b = week.body;

  return (
    <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-[1320px] px-4 pt-6 sm:px-6">
        <nav aria-label="현재 위치" className="text-[14px] font-semibold text-pop-ink-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/experience" className="inline-flex min-h-11 items-center hover:text-pop-ink">수업 체험</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href={`/experience/weeks#part-${part.partNo}`} className="inline-flex min-h-11 items-center hover:text-pop-ink">PART {part.partNo} {part.title}</Link></li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="text-pop-ink">{week.weekNo}주차</li>
          </ol>
        </nav>
      </div>

      <section aria-labelledby="week-title" className="mx-auto grid max-w-[1320px] items-center gap-8 px-4 pb-10 pt-6 sm:px-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-12">
        <div className="relative">
          <WeekArt week={week} size="hero" priority className="aspect-[4/3] w-full rounded-[40px] shadow-pop-lg ring-8 ring-white" />
          <span className="absolute -left-2 -top-4 inline-flex h-16 min-w-16 items-center justify-center rounded-3xl px-3 font-display text-[30px] text-white sticker" style={{ backgroundColor: week.themeColor }}>
            {week.weekNo}<span className="ml-0.5 text-[16px]">주</span>
          </span>
          <Sticker kind="sparkle" color="#ffc928" float className="absolute -bottom-5 right-8 h-12 w-12" />
        </div>
        <div className="animate-rise">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-pop-leaf-soft px-3 py-1 text-[12px] font-bold text-pop-leaf-deep">공식 교육과정</span>
            <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-pop-ink ring-1 ring-pop-ink/10">PART {part.partNo} · {part.title}{part.nameProvisional ? " (가칭)" : ""}</span>
          </div>
          <h1 id="week-title" className="mt-4 font-display text-[40px] leading-tight text-pop-ink sm:text-[54px]">《{week.title}》</h1>
          <p className="mt-4 text-[19px] font-medium leading-relaxed text-pop-ink">{week.coreMessage}</p>
          <dl className="mt-6 grid grid-cols-2 gap-3">
            {[
              ["성장 키워드", `#${week.growthKeyword}`],
              ["수업 시간", week.durationLabel],
              ["대표 활동", week.activitySummary],
              ["결과물", week.outcome ?? "공식 결과물 정리 중"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-3xl bg-white p-4 ring-1 ring-pop-ink/5">
                <dt className="text-[13px] font-bold text-pop-ink-muted">{k}</dt>
                <dd className="mt-1 text-[16px] font-bold leading-snug text-pop-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <PopLink href={`/experience/classroom/${week.weekNo}`} tone="pink" size="xl">
              <PlayIcon />
              체험 시작
            </PopLink>
            <PopLink href="/experience/weeks" tone="white" size="xl">24주 목록</PopLink>
          </div>
        </div>
      </section>

      <div className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 rounded-[28px] bg-pop-orange-soft px-5 py-4">
            <ContentStatusBadge status={b.status} className="bg-white" />
            <p className="text-[15px] font-semibold text-pop-ink">
              아래 수업 구성은 체험을 위한 예시입니다. 정식 교안은 본사 검수 후 기관 서비스에서 제공됩니다.
            </p>
            <DemoNotice compact className="ml-auto max-sm:ml-0" />
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <Block title="수업 목표" tone="bg-pop-yellow-soft" className="lg:col-span-2">
              <p className="text-[18px] font-semibold leading-relaxed text-pop-ink">{b.goal}</p>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="핵심 경험">
                {b.coreExperiences.map((c) => <li key={c} className="rounded-full bg-white px-3 py-1.5 text-[14px] font-bold text-pop-ink">{c}</li>)}
              </ul>
            </Block>
            <Block title="교육과정 연계" tone="bg-pop-cream ring-1 ring-pop-ink/5">
              <p className="text-[13px] font-bold text-pop-leaf-deep">누리과정 영역</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {b.nuriAreas.map((a) => <li key={a} className="rounded-full bg-pop-leaf-soft px-3 py-1 text-[14px] font-bold text-pop-leaf-deep">{a}</li>)}
              </ul>
              {b.soyeCoreExperiences.length > 0 ? (
                <>
                  <p className="mt-4 text-[13px] font-bold text-pop-lilac-deep">SOYE KIDS 핵심경험</p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {b.soyeCoreExperiences.map((a) => <li key={a} className="rounded-full bg-pop-lilac-soft px-3 py-1 text-[14px] font-bold text-pop-lilac-deep">{a}</li>)}
                  </ul>
                </>
              ) : null}
            </Block>
          </div>

          <h2 className="mt-14 font-display text-[30px] text-pop-ink sm:text-[36px]">수업 흐름</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {week.stages.map((s, i) => (
              <li key={s.key} className={cx("flex flex-col rounded-[28px] p-5", ["bg-pop-sky-soft", "bg-pop-pink-soft", "bg-pop-mint-soft", "bg-pop-yellow-soft", "bg-pop-lilac-soft"][i])}>
                <p className="text-[13px] font-bold text-pop-ink-muted">{i + 1}단계 · 약 {s.minutes}분</p>
                <h3 className="mt-1 font-display text-[21px] text-pop-ink">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-pop-ink">{s.guide}</p>
                <p className="mt-auto pt-4 text-[14px] font-semibold leading-relaxed text-pop-ink-muted">“{s.teacherQuestion}”</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <Block title="준비물" tone="bg-pop-cream ring-1 ring-pop-ink/5">
              <ul className="grid gap-2 text-[16px] text-pop-ink">{b.materials.map((m) => <li key={m}>· {m}</li>)}</ul>
            </Block>
            <Block title="그림책 · 몸 · 소리" tone="bg-pop-cream ring-1 ring-pop-ink/5">
              <dl className="grid gap-3 text-[15px] leading-relaxed text-pop-ink">
                <div><dt className="font-bold text-pop-sky-deep">그림책 활동</dt><dd>{b.story}</dd></div>
                <div><dt className="font-bold text-pop-pink-deep">신체표현</dt><dd>{b.movement}</dd></div>
                <div><dt className="font-bold text-pop-lilac-deep">음악 · 리듬</dt><dd>{b.music}</dd></div>
              </dl>
            </Block>
            <Block title="만들기 · 결과물" tone="bg-pop-cream ring-1 ring-pop-ink/5">
              <p className="text-[15px] leading-relaxed text-pop-ink">{b.art}</p>
              <p className="mt-3 text-[14px] font-bold text-pop-ink-muted">공식 결과물 · {week.outcome ?? "정리 중"}</p>
            </Block>
            <Block title="교사 발문" tone="bg-pop-sky-soft">
              <ul className="grid gap-2 text-[16px] font-semibold leading-relaxed text-pop-ink">{[...b.teacherQuestions, b.closingQuestion].map((q) => <li key={q}>“{q}”</li>)}</ul>
            </Block>
            <Block title="관찰 포인트" tone="bg-pop-mint-soft">
              <ul className="grid gap-2 text-[16px] leading-relaxed text-pop-ink">{b.observationPoints.map((o) => <li key={o}>· {o}</li>)}</ul>
            </Block>
            <Block title="가정연계 · 안전" tone="bg-pop-pink-soft">
              <p className="text-[16px] leading-relaxed text-pop-ink">{b.homeConnection}</p>
              <ul className="mt-3 grid gap-1.5 text-[15px] leading-relaxed text-pop-ink">{b.safety.map((s) => <li key={s}>· {s}</li>)}</ul>
            </Block>
          </div>
        </div>
      </div>

      <nav aria-label="다른 주차" className="mx-auto grid max-w-[1320px] gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6">
        {prev ? (
          <Link href={`/experience/weeks/${prev.weekNo}`} className="group flex min-h-20 items-center gap-4 rounded-[28px] bg-white p-5 shadow-pop">
            <span aria-hidden="true" className="text-[22px] text-pop-ink-muted transition-transform group-hover:-translate-x-1">←</span>
            <span><span className="block text-[13px] font-bold text-pop-ink-muted">이전 · {prev.weekNo}주차</span><span className="font-display text-[20px] text-pop-ink">{prev.title}</span></span>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/experience/weeks/${next.weekNo}`} className="group flex min-h-20 items-center justify-end gap-4 rounded-[28px] bg-white p-5 text-right shadow-pop">
            <span><span className="block text-[13px] font-bold text-pop-ink-muted">다음 · {next.weekNo}주차</span><span className="font-display text-[20px] text-pop-ink">{next.title}</span></span>
            <ArrowRight className="h-6 w-6 text-pop-ink-muted transition-transform group-hover:translate-x-1" />
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
