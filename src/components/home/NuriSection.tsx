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
          <div className="rounded-2xl bg-navy px-9 py-5 text-center shadow-[0_1px_2px_rgba(21,46,79,0.08)] sm:px-10 sm:py-6">
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

        <p className="mx-auto mt-14 max-w-xl text-center text-sm leading-relaxed text-navy/50">
          {nuriSectionCopy.disclaimer}
        </p>
      </Container>
    </section>
  );
}
