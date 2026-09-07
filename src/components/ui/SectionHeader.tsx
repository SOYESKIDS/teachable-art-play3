interface SectionHeaderProps {
  eyebrow?: string;
  headline: string;
  subCopy?: string;
  align?: "left" | "center";
  className?: string;
}

/**
 * 모든 섹션 상단의 제목 블록.
 *
 * ★ 크기를 이 파일에서 정하지 않는다.
 *   text-h2 · text-lead 는 globals.css 의 타입 스케일이고, 그 스케일은
 *   clamp 로 화면 폭을 따라 이어진다. 예전에는 여기에
 *   text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem] xl:text-[3.5rem] 처럼
 *   네 단계가 박혀 있어서, 그 사이 폭(예: 700px)에서는 제목만 갑자기
 *   작아 보였다. clamp 는 그 계단을 없앤다 — 양 끝 값은 그대로다.
 *
 * ★ eyebrow 는 자간까지 포함해 한 곳에서 정한다.
 *   사이트 전체에 tracking 값이 10가지 흩어져 있었다. 같은 역할의 라벨이
 *   자리마다 다른 자간을 갖는 것은 디자인이 아니라 흔들림이다.
 */
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
      {eyebrow && <p className="eyebrow text-trust-blue">{eyebrow}</p>}

      <h2 className="max-w-3xl whitespace-pre-line text-h2 font-bold text-navy">
        {headline}
      </h2>

      {subCopy && (
        <p className="measure whitespace-pre-line text-lead text-navy/65">
          {subCopy}
        </p>
      )}
    </div>
  );
}
