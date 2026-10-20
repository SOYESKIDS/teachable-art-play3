import Image from "next/image";
import { Buddy } from "@/components/play/Doodles";
import { DemoNotice } from "@/components/play/Badges";
import { Sticker } from "@/components/play/Stickers";
import { WeekExplorer } from "@/components/play/WeekExplorer";
import { MEDIA } from "@/data/experience/media";
import { EXPERIENCE_PARTS, EXPERIENCE_WEEKS } from "@/data/experience/weeks";

export const metadata = {
  title: "24주 수업 둘러보기 | TeachAble Art Play",
  description: "씨앗과 숲 · 우리 그리고 모두의 사계절 · 세계의 축제 — 24주 통합예술교육 수업을 큰 카드로 둘러보세요.",
  alternates: { canonical: "/experience/weeks" },
};

export default function ExperienceWeeksPage() {
  return (
    <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
      <section aria-labelledby="weeks-title" className="relative isolate overflow-hidden">
        <div className="relative h-[300px] sm:h-[380px] lg:h-[440px]">
          <Image src={MEDIA.classroom.src} alt={MEDIA.classroom.alt} fill preload fetchPriority="high" sizes="100vw" className="object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(27,37,71,0.78)_0%,rgba(27,37,71,0.35)_55%,rgba(27,37,71,0)_100%)]" />
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-[1320px] 2xl:max-w-[1520px] flex-col justify-center px-4 sm:px-6">
              <DemoNotice tone="light" className="w-fit" />
              <h1 id="weeks-title" className="mt-5 font-display text-[40px] leading-tight text-white sm:text-[58px]">
                24주, 아이들의
                <br />
                <span className="text-pop-yellow">큰 모험</span>
              </h1>
              <p className="mt-3 max-w-[34ch] text-[17px] font-medium text-white/90 sm:text-[19px]">PART를 골라 주차를 둘러보고, 마음에 드는 수업을 바로 체험해 보세요.</p>
            </div>
          </div>
          <Buddy character="ella" sizes="220px" className="absolute -bottom-2 right-4 hidden w-[190px] md:block lg:right-16" />
          <Sticker kind="star" color="#ffc928" float className="absolute right-[28%] top-10 hidden h-12 w-12 md:block" />
        </div>
      </section>
      <div className="mx-auto max-w-[1320px] 2xl:max-w-[1520px] px-4 pb-20 pt-6 sm:px-6">
        <WeekExplorer parts={EXPERIENCE_PARTS} weeks={EXPERIENCE_WEEKS} />
      </div>
    </main>
  );
}
