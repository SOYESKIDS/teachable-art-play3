interface SectionHeaderProps {
  eyebrow?: string;
  headline: string;
  subCopy?: string;
  align?: "left" | "center";
  className?: string;
}

/** WHY NOW / THREE NEEDS / CORE SOLUTION / CLASS 등 모든 Section 상단에서 공용으로 사용하는 제목 블록 */
export function SectionHeader({
  eyebrow,
  headline,
  subCopy,
  align = "center",
  className = "",
}: SectionHeaderProps) {
  const isCenter = align === "center";

  return (
    <div
      className={`flex flex-col gap-3 ${isCenter ? "mx-auto items-center text-center" : "items-start text-left"} ${className}`}
    >
      {eyebrow && (
        <p className="text-xs font-semibold tracking-[0.06em] text-trust-blue sm:text-sm">
          {eyebrow}
        </p>
      )}
      <h2 className="max-w-3xl whitespace-pre-line text-4xl font-bold leading-[1.2] text-navy sm:text-[2.75rem] lg:text-[3.25rem] xl:text-[3.5rem]">
        {headline}
      </h2>
      {subCopy && (
        <p className="max-w-2xl whitespace-pre-line text-lg leading-[1.65] text-navy/65 sm:text-xl">
          {subCopy}
        </p>
      )}
    </div>
  );
}
