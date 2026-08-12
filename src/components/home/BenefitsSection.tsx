import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { benefitItems, benefitsCopy } from "@/data/site-copy";

const accentBg: Record<string, string> = {
  "pale-yellow": "bg-pale-yellow/25",
  "light-blue": "bg-light-blue/20",
  "soft-coral": "bg-soft-coral/15",
  "soft-green": "bg-soft-green/15",
};

export function BenefitsSection() {
  return (
    <section
      id="benefits"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader headline={benefitsCopy.headline} subCopy={benefitsCopy.subCopy} />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {benefitItems.map((item) => (
            <div
              key={item.code}
              className={`rounded-[20px] p-8 sm:p-9 ${accentBg[item.accent]}`}
            >
              <p className="text-xs font-bold tracking-wide text-navy/50">{item.code}</p>
              <p className="mt-3 text-base font-semibold text-navy/70">{item.role}</p>
              <h3 className="mt-1.5 text-2xl font-extrabold text-navy sm:text-3xl">
                {item.tag}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-navy/65">
                {item.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-navy/60"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
