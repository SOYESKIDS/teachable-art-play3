import Image from "next/image";
import { HomeHeading, HomeSection } from "./HomeSection";
import { contentNarrative as copy } from "@/data/home-narrative";
import { STARTER_WEEKS, type StarterWeek } from "@/lib/content/starter-journey";
import { homeImages } from "@/data/home-images";

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
                      ? "grid grid-cols-[2.75rem_1fr] items-start gap-4 rounded-2xl border border-success-border bg-secondary-soft p-5"
                      : "grid grid-cols-[2.75rem_1fr] items-start gap-4 rounded-2xl border border-line bg-white p-5"
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      isRecord
                        ? "flex h-11 w-11 items-center justify-center rounded-full bg-secondary-strong text-label font-bold text-white tabular-nums"
                        : "flex h-11 w-11 items-center justify-center rounded-full bg-navy text-label font-bold text-white tabular-nums"
                    }
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-body-lg font-bold text-navy">
                        {link.name}
                      </span>
                      <span className="text-label text-ink-muted">{link.role}</span>
                    </p>
                    {week ? (
                      <p className={isRecord ? "mt-1 text-label font-semibold text-secondary-strong" : "mt-1 text-label font-semibold text-ink"}>
                        {exampleOf(week, link.example)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="self-start">
          <p className="mb-3 text-caption font-semibold text-ink-muted">그림책부터 활동 키트까지 · 구성 예시</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {homeImages.materials.map((material) => (
              <figure key={material.src} className="overflow-hidden rounded-2xl border border-line bg-white">
                <a
                  href={material.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${material.title} 이미지 크게 보기 (새 탭)`}
                  className="relative block aspect-[16/9] bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-strong"
                >
                  <Image
                    src={material.src}
                    alt={material.alt}
                    fill
                    sizes="(min-width: 1024px) 240px, (min-width: 640px) 45vw, 100vw"
                    className="object-contain"
                  />
                </a>
                <figcaption className="border-t border-line px-4 py-3">
                  <p className="text-body-sm font-bold text-navy">{material.title}</p>
                  <p className="mt-1 text-caption leading-relaxed text-ink-muted">{material.description}</p>
                  <p className="mt-2 text-caption font-semibold text-secondary-strong">이미지를 눌러 크게 보기 ↗</p>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-3 text-caption leading-relaxed text-ink-muted">
            이미지는 콘텐츠 구성 예시입니다. 주차별 제목·음원·키트는 공식 수업가이드와 계약 구성을 기준으로 안내합니다.
          </p>
          <ul className="mt-4 flex flex-col gap-1.5 text-caption text-ink-muted">
            <li>· {copy.mediaNote}</li>
            <li>· {copy.kitNote}</li>
          </ul>
        </div>
      </div>
    </HomeSection>
  );
}
