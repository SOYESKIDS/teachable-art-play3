import Image from "next/image";
import { HomeHeading, HomeSection } from "./HomeSection";
import { contentNarrative as copy } from "@/data/home-narrative";
import { STARTER_WEEKS, type StarterWeek } from "@/lib/content/starter-journey";

/** 예시 값은 canonical 주차 데이터에서 그대로 읽는다 — 지어내지 않는다 */
function exampleOf(week: StarterWeek, key: string): string {
  switch (key) {
    case "storybook":
      return week.storybook;
    case "physicalActivity":
      return week.physicalActivity.split(" (")[0];
    case "workbook":
      return week.workbook.split(" (")[0];
    case "artActivity":
      return week.artActivity;
    case "observationFocus":
      return week.observationFocus.slice(0, 3).join(" · ");
    default:
      return "";
  }
}

/**
 * 04 CONTENT ECOSYSTEM — 콘텐츠를 상품처럼 나열하지 않는다.
 *
 * ★ 마음동화 · EBOOK → VOD · 음원 → 워크북 → 창의활동 키트 → 관찰 기록.
 *   다섯 칸이 같은 주제(canonical W4 「소예의 씨앗」)로 묶여 있다는 것을 실제 수업 내용으로 보여 준다.
 * ★ 마지막 칸이 "관찰 기록"인 것이 이 서비스가 콘텐츠 묶음과 다른 지점이다.
 */
export function ContentStorySection() {
  const week = STARTER_WEEKS.find((w) => w.week === copy.exampleWeek);

  return (
    <HomeSection id="content" tone="sand" labelledBy="content-title">
      <HomeHeading id="content-title" eyebrow={copy.eyebrow} headline={copy.headline} subCopy={copy.subCopy} />

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
        <div>
          {week ? (
            <p className="mb-3 text-caption text-ink-muted">
              예시 · STARTER {week.week}주차 「{week.title}」 · 성장키워드 ‘{week.growthKeyword}’
            </p>
          ) : null}
          <ol className="flex flex-col gap-2.5">
            {copy.chain.map((link, index) => {
              const isRecord = index === copy.chain.length - 1;
              return (
                <li
                  key={link.name}
                  className={
                    isRecord
                      ? "grid grid-cols-[2.75rem_1fr] items-start gap-4 rounded-2xl bg-navy p-5 text-white"
                      : "grid grid-cols-[2.75rem_1fr] items-start gap-4 rounded-2xl border border-line bg-white p-5"
                  }
                  data-surface={isRecord ? "dark" : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={
                      isRecord
                        ? "flex h-11 w-11 items-center justify-center rounded-full bg-accent-on-dark text-label font-bold text-navy tabular-nums"
                        : "flex h-11 w-11 items-center justify-center rounded-full bg-navy text-label font-bold text-white tabular-nums"
                    }
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className={isRecord ? "text-body-lg font-bold text-white" : "text-body-lg font-bold text-navy"}>
                        {link.name}
                      </span>
                      <span className={isRecord ? "text-label text-white/70" : "text-label text-ink-muted"}>{link.role}</span>
                    </p>
                    {week ? (
                      <p className={isRecord ? "mt-1 text-label font-semibold text-accent-on-dark" : "mt-1 text-label font-semibold text-secondary-strong"}>
                        {exampleOf(week, link.example)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

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
            <li>· {copy.kitNote}</li>
          </ul>
        </div>
      </div>
    </HomeSection>
  );
}
