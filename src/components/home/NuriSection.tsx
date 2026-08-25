import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { nuriCurriculum, nuriSectionCopy } from "@/data/site-copy";

export function NuriSection() {
  return (
    <section
      id="curriculum"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader
          headline={nuriSectionCopy.headline}
          subCopy={nuriSectionCopy.subCopy}
        />

        <div className="mt-16 flex flex-col items-center gap-8 sm:mt-20 sm:gap-9">
          <div className="rounded-2xl bg-navy px-9 py-5 text-center shadow-[var(--shadow-soft)] sm:px-10 sm:py-6">
            <p className="font-serif text-xl italic text-white sm:text-2xl">
              TeachAble Art Play
            </p>
          </div>

          <div aria-hidden="true" className="h-10 w-[2px] bg-navy/15" />

          <div className="flex flex-col items-center gap-4">
            <p className="text-xs font-bold tracking-wide text-trust-blue sm:text-sm">
              PRIMARY 연계 영역
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
              {nuriCurriculum.primary.map((area) => (
                <span
                  key={area}
                  className="rounded-full border-2 border-trust-blue/25 bg-trust-blue/[0.06] px-8 py-4 text-xl font-bold text-navy sm:px-10 sm:py-5 sm:text-2xl"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          <div aria-hidden="true" className="h-8 w-[2px] bg-navy/10" />

          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-bold tracking-wide text-navy/40 sm:text-sm">
              SECONDARY 연계 영역
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
              {nuriCurriculum.secondary.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-navy/15 bg-white px-5 py-2.5 text-sm font-semibold text-navy/55 sm:text-base"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/*
          교육과정 구조(위)가 이 섹션의 주인공이므로 사진은 그 아래에 보조로만 둔다.
          max-w-2xl로 묶어 화면 절반을 넘기지 않게 했다.
        */}
        <figure className="mx-auto mt-16 max-w-2xl">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-navy/10 bg-navy/5">
            <Image
              src="/images/site/classroom/classroom-vod-learning.webp"
              alt="유치원 유희실에서 아이들이 화면에 나오는 이야기 영상을 보며 움직임으로 표현하는 수업 장면"
              fill
              sizes="(min-width: 768px) 672px, 100vw"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-3 text-center text-xs font-medium text-navy/45">
            실제 수업 현장
          </figcaption>
        </figure>

        <p className="mx-auto mt-14 max-w-xl text-center text-sm leading-relaxed text-navy/50">
          {nuriSectionCopy.disclaimer}
        </p>
      </Container>
    </section>
  );
}
