import type { ReactNode } from "react";
import Image from "next/image";
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

          {/*
            모바일 기본 크기만 40px → 36px 로 줄인다.
            360px 에서 40px 이면 "성장 이야기로 기록합니다."가 세 줄로 접혀
            제목만 네 줄이 되고 본문이 첫 화면 밖으로 밀린다.
            sm 이상 값은 건드리지 않았으므로 desktop typography 는 그대로다.
            (SectionHeader 의 h2 도 같은 이유로 이미 2rem 로 내려와 있다)
          */}
          <h1 className="text-[2.25rem] font-bold leading-[1.15] text-navy sm:text-[3rem] lg:text-[3.75rem] xl:text-[4.25rem]">
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

          {/*
            한 줄이 너무 길면 다음 줄 첫 글자를 찾는 데 눈이 걸린다.
            34rem 이면 본문 20px 기준 한 줄이 대략 40자 안팎이 된다.
          */}
          <p className="max-w-[34rem] text-lg leading-[1.7] text-navy/75 sm:text-xl">
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
            {/*
              가로 스크롤 영역(xl 미만). 실측 390px에서 내용 648px / 표시 350px이라
              세 번째 카드가 절반쯤 걸쳐 보이는 peek이 이미 만들어진다.
              여기에 오른쪽 끝 fade를 더해 "더 있다"는 신호를 남기고 스크롤바만 감춘다.

              tabIndex={0}은 장식이 아니다 — 스크롤바를 감추면 마우스 사용자의 단서가
              사라지므로, 키보드로도 이 영역에 들어와 좌우 키로 넘길 수 있어야 한다
              (WCAG 2.1.1). aria-label이 이미 있어 포커스 시 이름도 함께 읽힌다.
              xl 이상은 overflow-visible이라 fade와 스크롤 처리를 모두 되돌린다.
            */}
            <ol
              aria-label="TeachAble Art Play 5대 핵심 흐름"
              tabIndex={0}
              className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] xl:flex-nowrap xl:gap-1.5 xl:overflow-visible xl:pb-0 xl:[mask-image:none]"
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

          {/*
            모바일(lg 미만)에서는 하단 고정 CTA(MobileStickyCta)가 같은 "도입 상담 문의"를
            항상 띄우고 있다. 첫 화면에서 같은 행동을 두 번 권하지 않도록 hero의 상담 CTA는
            max-lg:hidden으로 감추고, 탐색 CTA("서비스 한눈에 보기")만 남긴다.
            고정 CTA는 lg:hidden이라 lg 이상에서는 반대로 이 버튼이 유일한 상담 진입점이 된다
            — 두 규칙이 정확히 맞물려 어느 폭에서도 상담 CTA가 사라지지 않는다.
          */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <ButtonLink
              href="#contact"
              variant="primary"
              data-cta="contact-hero"
              className="px-8 py-4 text-base font-bold max-lg:hidden sm:text-lg"
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

        {/* 우측: 실제 수업 현장 사진 + Floating UI */}
        <div className="relative mb-14 lg:mb-0">
          {/*
            비율을 breakpoint별로 나누지 않고 5:4 하나로 통일했다.
            사진 파일 자체를 5:4로 내보냈기 때문에, 어느 화면에서도 추가 crop이 일어나지 않는다
            (= 아이가 잘리거나 구도가 바뀌는 일이 없다). 세로 4:5였던 이전 비율은
            가로 구도의 교실 사진을 좌우로 크게 잘라내서 쓰지 않았다.
          */}
          <div className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl border border-navy/10 bg-navy">
            <Image
              src="/images/site/hero/hero-kindergarten-class.webp"
              alt="유치원 강당에서 아이들이 화면 속 TeachAble Art Play 영상을 보며 동작을 따라 하는 실제 수업 장면"
              fill
              priority
              sizes="(min-width: 1024px) 47vw, 100vw"
              className="object-cover"
            />

            {/* 보조 Floating Layer — 플랫폼 연동 느낌 */}
            {/* 사진 위로 올라오므로 반투명 흰색 대신 Navy 배경을 써서 대비를 확보한다. */}
            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/20 bg-navy/70 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm sm:right-5 sm:top-5">
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
