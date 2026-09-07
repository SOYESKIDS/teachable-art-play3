import type { ReactNode } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aiFlowSteps, aiPrincipleCopy, aiPrincipleItems } from "@/data/site-copy";
import type { AIFlowStep } from "@/types/content";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[22px] w-[22px]",
  "aria-hidden": true,
};

/** aiFlowSteps 순서(교사입력·AI정리·교사검토·전달)와 반드시 일치해야 하는 아이콘 */
const stepIcons: ReactNode[] = [
  <svg key="input" {...iconProps}>
    <rect x="5.5" y="4" width="13" height="16.5" rx="2" />
    <path d="M9 4V3.3A1.3 1.3 0 0 1 10.3 2h3.4A1.3 1.3 0 0 1 15 3.3V4" />
    <path d="M9 11h6M9 14.5h6" />
  </svg>,
  <svg key="ai" {...iconProps}>
    <path d="M4 20V5" />
    <path d="M4 20h16" />
    <path d="m7 15.5 3-3.2 2.8 2 4.2-5.3" />
  </svg>,
  <svg key="review" {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.3 12.3 2.3 2.3 5-5.4" />
  </svg>,
  <svg key="deliver" {...iconProps}>
    <path d="M20.5 12a8 8 0 0 1-11.9 6.9L4 20l1.2-4.4A8 8 0 1 1 20.5 12Z" />
  </svg>,
];

const accentCircle: Record<AIFlowStep["accent"], string> = {
  neutral: "bg-white border-2 border-navy/15 text-navy/45",
  ai: "bg-trust-blue text-white",
  review: "bg-yellow text-navy",
};

const accentRole: Record<AIFlowStep["accent"], string> = {
  neutral: "text-navy/40",
  ai: "text-trust-blue",
  review: "text-navy",
};

export function AIPrincipleSection() {
  return (
    <section
      id="growth-record"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader
          eyebrow={aiPrincipleCopy.eyebrow}
          headline={aiPrincipleCopy.headline}
          subCopy={aiPrincipleCopy.subCopy}
        />

        {/* 교사 → AI → 교사 → 전달 : Human-Machine-Human Flow */}
        <div className="mt-16 rounded-3xl border border-trust-blue/10 bg-trust-blue/[0.03] p-8 sm:p-12 lg:p-16">
          <ol className="relative flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-0">
            {aiFlowSteps.map((step, index) => (
              <li
                key={step.step}
                className="relative flex items-start gap-5 lg:flex-1 lg:flex-col lg:items-center lg:gap-4 lg:px-2 lg:text-center"
              >
                {index < aiFlowSteps.length - 1 && (
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

                <div
                  className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${accentCircle[step.accent]}`}
                >
                  {stepIcons[index]}
                </div>

                <div>
                  <p className={`text-xs font-bold tracking-wide sm:text-sm ${accentRole[step.accent]}`}>
                    {`STEP 0${step.step}`} · {step.role}
                  </p>
                  <h3 className="mt-1.5 text-lg font-bold text-navy sm:text-xl">
                    {step.title}
                  </h3>
                  <ul className="mt-2 flex flex-col gap-1 lg:items-center">
                    {step.items.map((item) => (
                      <li key={item} className="text-sm text-navy/60 sm:text-base">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/*
          ★ 실제 서비스 화면을 증거로 둔다.
            위의 4단계는 "이렇게 흘러갑니다"라는 설명이고, 이 화면은
            "그래서 실제로 이렇게 생겼습니다"라는 증거다. 설명 다음에 증거가
            오는 순서가 자연스럽다.

          ★ 원본보다 크게 늘리지 않는다.
            이 스크린샷의 실제 폭은 1080px 이다. 컨테이너를 다 쓰면
            1200px 로 늘어나 글자가 뭉개진다. 오른쪽 58% 자리에 두면
            약 700px 로 줄어들어 선명하게 남으면서도 UI 를 읽을 수 있다.

          ★ 테스트 기관 데이터다.
            아이 이름도 기관 이름도 나오지 않고, 공유 링크 주소는 화면 자체가
            다시 보여 주지 않는다(그것이 이 기능의 설계다).
        */}
        <div className="mt-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-[42fr_58fr] lg:gap-14">
          <div>
            <p className="eyebrow text-trust-blue">ACTUAL SCREEN</p>
            <h3 className="mt-2.5 text-h3 font-bold text-navy">
              교사가 검토한 기록이
              <br />
              근거와 함께 남습니다
            </h3>

            <ul className="mt-6 flex flex-col gap-3">
              {[
                "리포트마다 근거가 된 관찰기록이 함께 보관됩니다.",
                "학부모 공유 링크는 기본 30일 동안 유효하고, 언제든 중지할 수 있습니다.",
                "보안을 위해 이미 발급한 링크 주소는 다시 표시되지 않습니다.",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2.5 text-[15px] leading-relaxed text-navy/70"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[10px] h-1 w-1 shrink-0 rounded-full bg-trust-blue"
                  />
                  <span className="break-keep">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <figure>
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]">
              <Image
                src="/images/site/platform/director-growth-report-evidence.webp"
                alt="원장 화면의 성장 리포트 관리 — 학부모 공유 링크 상태와 근거가 된 관찰기록이 함께 표시된다"
                width={1080}
                height={745}
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="h-auto w-full"
              />
            </div>
            <figcaption className="mt-3 text-[12px] font-medium text-navy/45">
              실제 서비스 화면 예시 · 테스트 기관 데이터
            </figcaption>
          </figure>
        </div>

        {/* AI 기록 4가지 원칙 */}
        <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
          {aiPrincipleItems.map((principle) => (
            <div key={principle.order} className="flex gap-4">
              <span className="text-2xl font-bold text-navy/15 sm:text-3xl">
                {`0${principle.order}`}
              </span>
              <div>
                <h3 className="text-base font-bold text-navy sm:text-lg">
                  {principle.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-navy/60 sm:text-base">
                  {principle.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-14 max-w-2xl whitespace-pre-line text-center text-2xl font-bold leading-relaxed text-navy sm:text-3xl">
          {aiPrincipleCopy.highlight}
        </p>
      </Container>
    </section>
  );
}
