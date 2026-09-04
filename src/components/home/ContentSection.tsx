import type { ReactNode } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { contentCopy, contentExamples, contentItems } from "@/data/site-copy";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  // 6개 카드가 같은 무게로 보이도록 아이콘 크기를 한 곳에서 통일한다.
  className: "h-6 w-6",
  "aria-hidden": true,
};

/**
 * contentItems 순서(마음동화·VOD·워크북·음원·키트·가이드)와 반드시 일치해야 하는 아이콘.
 */
const contentIcons: ReactNode[] = [
  <svg key="storybook" {...iconProps}>
    <path d="M4 5.2C4 4.5 4.6 4 5.3 4H11v16H5.3A1.3 1.3 0 0 1 4 18.7V5.2Z" />
    <path d="M20 5.2c0-.7-.6-1.2-1.3-1.2H13v16h5.7c.7 0 1.3-.5 1.3-1.3V5.2Z" />
  </svg>,
  <svg key="vod" {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.3v7.4l6-3.7Z" />
  </svg>,
  <svg key="workbook" {...iconProps}>
    <rect x="4.5" y="3" width="15" height="18" rx="2" />
    <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
  </svg>,
  <svg key="audio" {...iconProps}>
    <path d="M9 18V5l10-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="16" cy="16" r="3" />
  </svg>,
  <svg key="kit" {...iconProps}>
    <path d="M21 7.5 12 3 3 7.5 12 12l9-4.5Z" />
    <path d="M3 7.5v9L12 21l9-4.5v-9" />
    <path d="M12 12v9" />
  </svg>,
  <svg key="guide" {...iconProps}>
    <rect x="5.5" y="4" width="13" height="16.5" rx="2" />
    <path d="M9 4V3.3A1.3 1.3 0 0 1 10.3 2h3.4A1.3 1.3 0 0 1 15 3.3V4" />
    <path d="M9 11h6M9 14.5h6M9 7.7h3" />
  </svg>,
];

export function ContentSection() {
  return (
    <section
      id="content"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader headline={contentCopy.headline} subCopy={contentCopy.subCopy} />

        {/*
          콘텐츠 구성 6종 — 카드 6개는 크기·여백·아이콘 크기를 모두 동일하게 둔다.
          일부 카드에만 사진을 넣으면 나머지가 "아직 준비 중"으로 읽히기 때문에,
          여기서는 목록의 역할만 하고 실제 사진은 아래 예시 스트립에서 보여준다.
          핵심 콘텐츠(large)는 카드 크기가 아니라 아이콘 배경색으로만 구분한다.
        */}
        <ul className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-6">
          {contentItems.map((item, index) => (
            <li
              key={item.label}
              className="flex flex-col gap-3.5 rounded-2xl border border-navy/10 bg-white p-5 sm:flex-row sm:items-center sm:gap-4 sm:p-6"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  item.size === "large"
                    ? "bg-yellow/25 text-navy"
                    : "bg-navy/[0.06] text-navy/55"
                }`}
              >
                {contentIcons[index]}
              </span>
              <h3 className="text-base font-bold leading-snug text-navy sm:text-lg">
                {item.label}
              </h3>
            </li>
          ))}
        </ul>

        {/*
          실제 콘텐츠 예시 — "이런 걸 제공합니다"가 아니라 "이미 만들어져 있습니다"를
          보여주는 영역이라 이미지가 주인공이다. 설명문/CTA는 두지 않는다.
          이미지 파일을 4:3으로 내보냈으므로 표시도 4:3으로 맞춘다 —
          더 넓은 비율로 두면 상하가 잘려 VOD 타이틀 로고(좌·우상단)가 사라진다.
        */}
        <div className="mt-14">
          <p className="text-center text-xs font-bold tracking-wide text-navy/45">
            실제 콘텐츠 예시
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
            {contentExamples.map((example) => (
              <li
                key={example.src}
                className="overflow-hidden rounded-2xl border border-navy/10 bg-white"
              >
                <div className="relative aspect-[4/3] w-full bg-navy/5">
                  <Image
                    src={example.src}
                    alt={example.alt}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <p className="px-5 py-3 text-[13px] font-medium text-navy/60">
                  {example.label}
                </p>
              </li>
            ))}
          </ul>
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
