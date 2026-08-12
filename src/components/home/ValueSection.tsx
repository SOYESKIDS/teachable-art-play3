import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { valueCopy, valueItems } from "@/data/site-copy";

const accentDot: Record<string, string> = {
  "soft-green": "bg-soft-green",
  "light-blue": "bg-light-blue",
  navy: "bg-navy",
};

export function ValueSection() {
  return (
    <section
      id="value"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-16 sm:py-20 lg:py-28"
    >
      <Container>
        <SectionHeader headline={valueCopy.headline} subCopy={valueCopy.subCopy} />

        <div className="mt-16 flex flex-col items-center sm:mt-20">
          <div className="inline-flex items-center rounded-full bg-navy px-7 py-3.5 text-base font-bold text-white sm:px-8 sm:py-4 sm:text-lg">
            {valueCopy.hub}
          </div>
          <div aria-hidden="true" className="h-10 w-[2px] bg-navy/15 sm:h-12" />
          <div
            aria-hidden="true"
            className="mx-auto hidden h-[2px] w-3/4 bg-navy/15 sm:block"
          />

          <div className="grid w-full grid-cols-1 gap-14 sm:grid-cols-3 sm:gap-8 lg:gap-10">
            {valueItems.map((item) => (
              <div key={item.code} className="flex flex-col items-center text-center">
                <div aria-hidden="true" className="hidden h-10 w-[2px] bg-navy/15 sm:block" />
                <div className="mt-2 flex flex-col items-center gap-3 sm:mt-4">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${accentDot[item.accent]}`}
                    />
                    <span className="text-xs font-bold tracking-wide text-navy/45 sm:text-sm">
                      {item.code} · {item.role}
                    </span>
                  </div>

                  <p className="text-3xl font-extrabold leading-[1.15] text-navy sm:text-4xl lg:text-[2.75rem]">
                    {item.keyword}
                  </p>

                  <p className="max-w-[240px] text-sm leading-relaxed text-navy/55 sm:text-base">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
