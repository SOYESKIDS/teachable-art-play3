import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { adoptionCopy, adoptionSteps } from "@/data/site-copy";

export function AdoptionSection() {
  return (
    <section
      id="adoption"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader headline={adoptionCopy.headline} subCopy={adoptionCopy.subCopy} />

        <ol className="relative mt-16 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-0">
          {adoptionSteps.map((step, index) => (
            <li
              key={step.order}
              className="relative flex items-start gap-5 lg:flex-1 lg:flex-col lg:items-center lg:gap-4 lg:px-2 lg:text-center"
            >
              {index < adoptionSteps.length - 1 && (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-10 left-[28px] top-14 w-[2px] bg-navy/15 lg:hidden"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-[28px] hidden h-[2px] w-full bg-navy/15 lg:block"
                  />
                </>
              )}

              <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy text-lg font-bold text-white">
                {step.order}
              </div>

              <div>
                <h3 className="text-lg font-bold text-navy sm:text-xl">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy/60 sm:text-base">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
