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

          ★ 같은 크기 셋에서 하나를 크게 두는 구성으로 바꿨다.
            똑같은 카드 세 장은 "예시가 세 개 있다"까지만 말한다.
            수업 사진 한 장을 크게 세우면 "아이가 실제로 이렇게 한다"가 먼저 오고,
            영상 콘텐츠 두 장이 그 옆을 받친다.

          ★ 크기를 다르게 하되 VOD 스틸의 비율은 건드리지 않는다.
            영상 스틸은 좌·우상단에 타이틀 로고가 박혀 있어 4:3 을 벗어나면
            로고가 잘린다. 그래서 큰 자리를 받는 것은 로고가 없는 수업 사진이고,
            영상 두 장은 4:3 그대로 옆에 쌓는다.
            (넓은 화면에서 왼쪽 4:5 한 장과 오른쪽 4:3 두 장의 높이가 맞는다)
        */}
        <div className="mt-14">
          <p className="text-xs font-bold tracking-wide text-navy/45">
            실제 콘텐츠 예시
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-[1.2fr_1fr]">
            {/* 큰 자리 — 로고가 없는 수업 사진이라 비율을 바꿔도 안전하다 */}
            <li className="overflow-hidden rounded-2xl border border-line bg-white sm:row-span-2 lg:row-span-1">
              <div className="relative aspect-[4/3] w-full bg-navy/5 lg:aspect-[4/5]">
                <Image
                  src={contentExamples[2].src}
                  alt={contentExamples[2].alt}
                  fill
                  sizes="(min-width: 1024px) 55vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <p className="px-5 py-3.5 text-[14px] font-semibold text-navy/70">
                {contentExamples[2].label}
              </p>
            </li>

            {/* 영상 콘텐츠 두 장 — 4:3 고정 */}
            <li className="grid grid-cols-1 gap-5 sm:gap-6">
              {[contentExamples[0], contentExamples[1]].map((example) => (
                <figure
                  key={example.src}
                  className="overflow-hidden rounded-2xl border border-line bg-white"
                >
                  <div className="relative aspect-[4/3] w-full bg-navy/5">
                    <Image
                      src={example.src}
                      alt={example.alt}
                      fill
                      sizes="(min-width: 1024px) 45vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="px-5 py-3 text-[13px] font-medium text-navy/60">
                    {example.label}
                  </figcaption>
                </figure>
              ))}
            </li>
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
