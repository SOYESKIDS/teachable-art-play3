import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { contentCopy, contentItems } from "@/data/site-copy";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/**
 * contentItems 순서(마음동화·VOD·워크북·음원·키트·가이드)와 반드시 일치해야 하는 아이콘.
 * 실제 제품 이미지가 준비되면 이 아이콘 Placeholder 대신
 * <Image src={item.imagePath} .../> 로 교체하면 됩니다.
 */
const contentIcons: ReactNode[] = [
  <svg key="storybook" {...iconProps} className="h-10 w-10">
    <path d="M4 5.2C4 4.5 4.6 4 5.3 4H11v16H5.3A1.3 1.3 0 0 1 4 18.7V5.2Z" />
    <path d="M20 5.2c0-.7-.6-1.2-1.3-1.2H13v16h5.7c.7 0 1.3-.5 1.3-1.3V5.2Z" />
  </svg>,
  <svg key="vod" {...iconProps} className="h-10 w-10">
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.3v7.4l6-3.7Z" />
  </svg>,
  <svg key="workbook" {...iconProps} className="h-10 w-10">
    <rect x="4.5" y="3" width="15" height="18" rx="2" />
    <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
  </svg>,
  <svg key="audio" {...iconProps} className="h-7 w-7">
    <path d="M9 18V5l10-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="16" cy="16" r="3" />
  </svg>,
  <svg key="kit" {...iconProps} className="h-7 w-7">
    <path d="M21 7.5 12 3 3 7.5 12 12l9-4.5Z" />
    <path d="M3 7.5v9L12 21l9-4.5v-9" />
    <path d="M12 12v9" />
  </svg>,
  <svg key="guide" {...iconProps} className="h-7 w-7">
    <rect x="5.5" y="4" width="13" height="16.5" rx="2" />
    <path d="M9 4V3.3A1.3 1.3 0 0 1 10.3 2h3.4A1.3 1.3 0 0 1 15 3.3V4" />
    <path d="M9 11h6M9 14.5h6M9 7.7h3" />
  </svg>,
];

export function ContentSection() {
  const largeItems = contentItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.size === "large");
  const smallItems = contentItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.size === "small");

  return (
    <section
      id="content"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader headline={contentCopy.headline} subCopy={contentCopy.subCopy} />

        {/* 상단: 마음동화 · VOD · 워크북 — Product Showcase (크게) */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-7">
          {largeItems.map(({ item, index }) => (
            <div
              key={item.label}
              className="flex flex-col overflow-hidden rounded-[20px] border border-navy/10 bg-white"
            >
              <div
                aria-hidden="true"
                className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-navy/[0.05] to-trust-blue/[0.09]"
              >
                <div className="flex flex-col items-center gap-3 px-6 text-center text-navy/35">
                  {contentIcons[index]}
                  <span className="text-sm font-semibold text-navy/40">
                    {item.placeholderCaption}
                  </span>
                </div>
              </div>
              <div className="p-6 sm:p-7">
                <h3 className="text-xl font-bold text-navy sm:text-2xl">{item.label}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* 하단: 음원 · 창의키트 · 교사가이드 (작게, 그러나 여전히 제품 카드 형태) */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {smallItems.map(({ item, index }) => (
            <div
              key={item.label}
              className="flex flex-col overflow-hidden rounded-[18px] border border-navy/10 bg-white"
            >
              <div
                aria-hidden="true"
                className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-navy/[0.05] to-trust-blue/[0.09]"
              >
                <div className="flex flex-col items-center gap-2 px-4 text-center text-navy/35">
                  {contentIcons[index]}
                  <span className="text-xs font-semibold text-navy/40">
                    {item.placeholderCaption}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-navy sm:text-lg">{item.label}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* 하단: Platform 연결 Bridge Message — Navy Banner로 강하게 */}
        <Card variant="premium" className="mx-auto mt-14 max-w-3xl px-8 py-10 text-center sm:px-14">
          <p className="whitespace-pre-line text-2xl font-bold leading-relaxed sm:text-3xl">
            {contentCopy.bridgeMessage}
          </p>
        </Card>
      </Container>
    </section>
  );
}
