import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { benefitItems, benefitsCopy } from "@/data/site-copy";

const accentBar: Record<string, string> = {
  "pale-yellow": "bg-pale-yellow",
  "light-blue": "bg-light-blue",
  "soft-coral": "bg-soft-coral",
  "soft-green": "bg-soft-green",
};

export function BenefitsSection() {
  return (
    <section
      id="benefits"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader headline={benefitsCopy.headline} subCopy={benefitsCopy.subCopy} />

        {/* Neutral Surface + Role Accent — Director/Teacher가 B2B 구매결정에 더 가까워 먼저 배치 */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {benefitItems.map((item) => (
            <div
              key={item.code}
              className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-[var(--shadow-soft)] sm:p-9"
            >
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 top-0 h-1.5 ${accentBar[item.accent]}`}
              />
              <p className="text-xs font-bold tracking-wide text-navy/45">{item.code}</p>
              <p className="mt-3 text-base font-semibold text-navy/70">{item.role}</p>
              <h3 className="mt-1.5 text-2xl font-bold text-navy sm:text-3xl">{item.tag}</h3>
              <p className="mt-3 text-base leading-relaxed text-navy/60">
                {item.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-navy/60"
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
