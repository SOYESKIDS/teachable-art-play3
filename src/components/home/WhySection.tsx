import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { problemStatements, whyCopy } from "@/data/site-copy";

export function WhySection() {
  return (
    <section
      id="why"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader
          eyebrow={whyCopy.eyebrow}
          headline={whyCopy.headline}
          subCopy={whyCopy.subCopy}
        />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {problemStatements.map((problem) => (
            <Card key={problem.order} variant="basic" className="p-8 sm:p-9">
              <span className="text-4xl font-bold text-navy/15 sm:text-[2.75rem]">
                {`0${problem.order}`}
              </span>
              <h3 className="mt-5 text-xl font-bold leading-snug text-navy sm:text-2xl">
                {problem.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-navy/60">
                {problem.description}
              </p>
            </Card>
          ))}
        </div>

        <Card
          variant="premium"
          className="mt-10 px-6 py-9 text-center sm:px-14"
        >
          <p className="text-xl font-semibold leading-relaxed sm:text-2xl">
            {whyCopy.insight}
          </p>
        </Card>
      </Container>
    </section>
  );
}
