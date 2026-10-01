import Image from "next/image";
import { HomeHeading, HomeSection } from "./HomeSection";
import { contentNarrative as copy } from "@/data/home-narrative";
import { STARTER_WEEKS } from "@/lib/content/starter-journey";

/**
 * 05 CONTENT — 하나의 주제가 이야기 · 몸 · 표현 · 기록으로.
 *
 * ★ 콘텐츠 아이콘 6개 나열 + 누리과정 섹션을 하나로 합쳤다.
 *   "많이 준다"가 아니라 "한 주제로 묶여 있다"를 실제 주차 하나(canonical W4)로 보여 준다.
 */
export function ContentStorySection() {
  const week = STARTER_WEEKS.find((w) => w.week === copy.exampleWeek);
  const example = week
    ? [week.storybook, week.physicalActivity, week.artActivity, week.observationFocus.slice(0, 3).join(" · ")]
    : [];

  return (
    <HomeSection id="content" tone="sand" labelledBy="content-title">
      <HomeHeading id="content-title" eyebrow={copy.eyebrow} headline={copy.headline} subCopy={copy.subCopy} />

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
        <ol className="flex flex-col gap-3">
          {copy.chain.map((link, index) => (
            <li
              key={link.verb}
              className="grid grid-cols-[2.75rem_1fr] items-start gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-[2.75rem_10rem_1fr]"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-label font-bold text-white tabular-nums"
              >
                {index + 1}
              </span>
              <div className="sm:contents">
                <p className="text-body-lg font-bold text-navy sm:self-center">{link.verb}</p>
                <div className="mt-1 sm:mt-0 sm:self-center">
                  <p className="text-label text-ink-muted">{link.materials}</p>
                  {week ? (
                    <p className="mt-1 text-label font-semibold text-secondary-strong">
                      {index === 0 ? "예: " : ""}
                      {example[index]}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
          {week ? (
            <li className="px-1 text-caption text-ink-muted">
              예시: STARTER {week.week}주차 「{week.title}」 · 성장키워드 ‘{week.growthKeyword}’
            </li>
          ) : null}
        </ol>

        <div className="grid grid-cols-2 gap-3 self-start">
          <figure className="relative col-span-2 aspect-[4/3] overflow-hidden rounded-2xl bg-white">
            <Image
              src="/images/site/classroom/classroom-workbook-play.webp"
              alt="아이가 워크북 활동지에 그림을 그리는 수업 장면"
              fill
              sizes="(min-width: 1024px) 480px, 100vw"
              className="object-cover"
            />
          </figure>
          <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
            <Image src="/images/site/content/vod-bukgeuki-ballet.webp" alt="수업에 쓰는 VOD 영상 장면" fill sizes="240px" className="object-cover" />
          </figure>
          <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
            <Image src="/images/site/classroom/classroom-vod-learning.webp" alt="아이들이 화면 속 영상을 보며 함께 움직이는 장면" fill sizes="240px" className="object-cover" />
          </figure>
          <ul className="col-span-2 mt-1 flex flex-col gap-1.5 text-caption text-ink-muted">
            <li>· {copy.mediaNote}</li>
            <li>· {copy.nuriNote}</li>
          </ul>
        </div>
      </div>
    </HomeSection>
  );
}
