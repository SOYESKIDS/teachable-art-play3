import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { ctaLabels, heroCopy, heroFlowSteps, heroMicroProof } from "@/data/site-copy";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="h-3.5 w-3.5 shrink-0 text-trust-blue"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5 8.2l2 2 4-4.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-navy/25 xl:h-3 xl:w-3"
      aria-hidden="true"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[18px] w-[18px]",
  "aria-hidden": true,
};

/** heroFlowSteps(coreSolutions 5개)와 순서가 반드시 일치해야 하는 아이콘 세트 */
const flowIcons: ReactNode[] = [
  // 01 수업 콘텐츠 — 책
  <svg key="content" {...iconProps}>
    <path d="M4 5.2C4 4.5 4.6 4 5.3 4H11v16H5.3A1.3 1.3 0 0 1 4 18.7V5.2Z" />
    <path d="M20 5.2c0-.7-.6-1.2-1.3-1.2H13v16h5.7c.7 0 1.3-.5 1.3-1.3V5.2Z" />
  </svg>,
  // 02 교사 운영 — 클립보드 체크
  <svg key="teacher" {...iconProps}>
    <rect x="5.5" y="4" width="13" height="16.5" rx="2" />
    <path d="M9 4V3.3A1.3 1.3 0 0 1 10.3 2h3.4A1.3 1.3 0 0 1 15 3.3V4" />
    <path d="m9.2 12.5 2 2 3.6-4" />
  </svg>,
  // 03 AI 성장기록 — 라인 차트
  <svg key="ai" {...iconProps}>
    <path d="M4 20V5" />
    <path d="M4 20h16" />
    <path d="m7 15.5 3-3.2 2.8 2 4.2-5.3" />
  </svg>,
  // 04 학부모 리포트 — 말풍선
  <svg key="report" {...iconProps}>
    <path d="M20.5 12a8 8 0 0 1-11.9 6.9L4 20l1.2-4.4A8 8 0 1 1 20.5 12Z" />
  </svg>,
  // 05 원장 대시보드 — 대시보드 그리드
  <svg key="dashboard" {...iconProps}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.3" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.3" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="1.3" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.3" />
  </svg>,
];

/**
 * 헤드라인/서브카피 문구는 data/site-copy.ts의 heroCopy와 동일해야 합니다.
 * 강조 span(놀이/성장 이야기)은 스타일 처리를 위해 JSX에 직접 작성했습니다 — 카피 문구를 바꿀 때는 두 곳을 함께 맞춰주세요.
 */
export function HeroSection() {
  return (
    <section
      id="hero"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory"
    >
      <Container className="grid grid-cols-1 items-center gap-14 py-10 sm:py-14 lg:grid-cols-[53fr_47fr] lg:gap-14 lg:py-16 xl:py-20">
        {/* 좌측: 카피 + Micro Proof + Mini Flow + CTA */}
        <div className="flex flex-col gap-5 lg:gap-6">
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold tracking-wide text-trust-blue sm:text-sm">
              {heroCopy.eyebrow}
            </p>
            <p className="font-serif text-lg italic text-navy/60 sm:text-xl">
              {heroCopy.brandName}
            </p>
          </div>

          <h1 className="text-[2.5rem] font-bold leading-[1.15] text-navy sm:text-[3rem] lg:text-[3.75rem] xl:text-[4.25rem]">
            아이의 <span className="text-trust-blue">놀이</span>를,
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">성장 이야기</span>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-[0.08em] z-0 h-[0.22em] rounded-full bg-yellow/70"
              />
            </span>
            로 기록합니다.
          </h1>

          <p className="max-w-[38rem] text-lg leading-[1.7] text-navy/75 sm:text-xl">
            {heroCopy.subCopy}
          </p>

          <p className="text-sm italic text-navy/50 sm:text-base">
            {heroCopy.supportingMessage}
          </p>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-navy/65 sm:text-sm">
            {heroMicroProof.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <CheckIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="pt-1">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy/35">
              하나로 연결된 5단계 플랫폼
            </p>
            <ol
              aria-label="TeachAble Art Play 5대 핵심 흐름"
              className="flex items-center gap-2 overflow-x-auto pb-1 xl:flex-nowrap xl:gap-1.5 xl:overflow-visible xl:pb-0"
            >
              {heroFlowSteps.map((step, index) => (
                <li
                  key={step.order}
                  className="flex shrink-0 items-center gap-2 xl:gap-1.5"
                >
                  <div className="flex min-w-[104px] flex-col items-center gap-1.5 rounded-2xl border border-navy/10 bg-white px-4 py-3 text-center shadow-[var(--shadow-soft)] xl:min-w-[88px] xl:gap-1 xl:px-2.5 xl:py-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy/[0.06] text-navy xl:h-7 xl:w-7">
                      {flowIcons[index]}
                    </span>
                    <span className="text-xs font-semibold leading-tight text-navy sm:text-[13px] xl:text-xs">
                      {step.title}
                    </span>
                  </div>
                  {index < heroFlowSteps.length - 1 && <ChevronIcon />}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <ButtonLink
              href="#contact"
              variant="primary"
              data-cta="contact-hero"
              className="px-8 py-4 text-base font-bold sm:text-lg"
            >
              {ctaLabels.contact}
            </ButtonLink>
            <ButtonLink
              href="#solution"
              variant="tertiary"
              className="px-6 py-3.5 text-sm font-medium sm:text-base"
            >
              {heroCopy.ctaSecondary}
            </ButtonLink>
          </div>
        </div>

        {/* 우측: Visual (실제 이미지 준비 전 Premium Placeholder) + Floating UI */}
        <div className="relative mb-14 lg:mb-0">
          <div className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl border border-navy/10 bg-navy sm:aspect-[4/3] lg:aspect-[4/5]">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-navy via-navy/95 to-trust-blue/70"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-yellow"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2.5" />
                  <circle cx="9" cy="10" r="1.75" />
                  <path d="M21 16.5l-5.2-5.2a1.5 1.5 0 0 0-2.12 0L3 21" />
                </svg>
              </div>
              <p className="text-base font-semibold text-white">
                {heroCopy.visualHeading}
              </p>
              <p className="text-xs font-medium text-white/50">
                {heroCopy.visualPlaceholderNote}
              </p>
            </div>

            {/* 보조 Floating Layer — 플랫폼 연동 느낌 */}
            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm sm:right-5 sm:top-5">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow" aria-hidden="true" />
              {heroCopy.visualBadge}
            </div>
          </div>

          {/* 메인 Floating DEMO 카드 — 성장기록 */}
          <div className="absolute -bottom-10 left-5 right-5 rounded-2xl border border-navy/10 bg-white p-5 shadow-[var(--shadow-elevated)] sm:left-6 sm:right-auto sm:w-80">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-navy">
                {heroCopy.demoCard.title}
              </span>
              <span className="shrink-0 rounded-full bg-navy/[0.06] px-2.5 py-1 text-[10px] font-semibold text-navy/55">
                {heroCopy.demoCard.badge}
              </span>
            </div>
            <dl className="space-y-2">
              {heroCopy.demoCard.items.map((item) => (
                <div key={item.label} className="flex items-baseline gap-2.5 text-sm">
                  <dt className="w-[4.5rem] shrink-0 whitespace-nowrap font-medium text-navy/45">
                    {item.label}
                  </dt>
                  <dd className="text-navy/85">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
