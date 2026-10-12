import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/PublicButton";
import { LeadCtaButton } from "@/components/forms/LeadCtaButton";
import { ctaLabels } from "@/data/site-copy";
import { heroNarrative as copy } from "@/data/home-narrative";
import { STARTER_WEEKS } from "@/lib/content/starter-journey";

/**
 * 01 HERO — 3초 안에: 누구를 위한 것인지 · 무엇을 해결하는지 · 무엇이 다른지.
 *
 *   EYEBROW     유치원을 위한 통합예술 교육 운영 시스템   (누구 · 무엇)
 *   H1          아이의 놀이를, 성장 이야기로 기록합니다.  (승인된 브랜드 문장 · 페이지에서 한 번)
 *   DESCRIPTION 수업 준비 → 관찰 → 성장기록 → 원 운영     (무엇이 다른지)
 *   PROOF       원본 근거가 있는 사실 네 가지만
 *   CTA         도입 상담 신청 · 8주 프로그램 보기 · (작은 링크) 20분 데모 · 4주 파일럿
 *
 * ★ V2 의 5단계 미니 흐름 · "활동은 남습니다…" 보조 문장을 걷었다 — 바로 아래
 *   WHY · HOW 섹션이 같은 말을 더 정확하게 한다. 첫 화면은 덜어 낸 만큼 빨리 읽힌다.
 * ★ 떠 있는 카드는 지어낸 리포트가 아니라 STARTER 1주차 수업안(canonical)의 실제 내용이다.
 * ★ 모바일(lg 미만)에서는 하단 고정 CTA 가 도입 상담을 맡아, 첫 화면의 상담 버튼은 lg 이상에서만 보인다.
 */
export function HeroSection() {
  const week1 = STARTER_WEEKS[0];

  return (
    <section
      id="hero"
      className="relative isolate scroll-mt-[calc(var(--header-height)_+_16px)] overflow-hidden bg-ivory"
    >
      {/* 바탕의 아주 옅은 색면 두 개 — 장식은 여기까지 (DEC-109) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 right-[-10%] -z-10 h-[560px] w-[560px] rounded-full bg-accent-soft opacity-80 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-20%] left-[-12%] -z-10 h-[520px] w-[520px] rounded-full bg-brand-mint opacity-90 blur-3xl"
      />

      <Container className="grid grid-cols-1 items-center gap-14 py-12 sm:py-16 lg:grid-cols-[46fr_54fr] lg:gap-16 lg:py-20 xl:py-24">
        <div className="flex flex-col items-start gap-6">
          <p className="eyebrow-ko inline-flex items-center gap-2.5 text-accent-strong sm:text-label">
            <span aria-hidden="true" className="h-px w-6 bg-accent" />
            {copy.eyebrow}
          </p>

          <h1 className="text-display font-bold text-navy">
            아이의 <span className="text-secondary-strong">놀이</span>를,
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">성장 이야기</span>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-[0.08em] z-0 h-[0.22em] rounded-full bg-accent/30"
              />
            </span>
            로 기록합니다.
          </h1>

          <p className="measure whitespace-pre-line text-lead text-ink">{copy.description}</p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <LeadCtaButton type="consult" variant="primary" size="lg" dataCta="consult-hero" className="font-bold max-lg:hidden">
              {ctaLabels.consultApply}
            </LeadCtaButton>
            <Link
              href={copy.ctaSecondary.href}
              className={buttonClasses({
                variant: "tertiary",
                size: "lg",
                className: "px-7 font-semibold max-lg:min-h-12 max-lg:px-6 max-lg:text-body-sm",
              })}
            >
              {copy.ctaSecondary.label}
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <a
            href={copy.ctaTertiary.href}
            className="-mt-2 inline-flex min-h-11 items-center gap-1.5 text-label font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-navy hover:underline"
          >
            {copy.ctaTertiary.label}
            <span aria-hidden="true">↓</span>
          </a>

          {/* Proof bar — 원본 근거가 있는 사실만 */}
          <ul className="mt-2 grid w-full grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-6 sm:grid-cols-4 sm:gap-x-4">
            {copy.proof.map((item) => (
              <li key={item} className="flex items-start gap-2 text-caption font-semibold text-ink sm:text-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-[3px] shrink-0 text-secondary">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* 실제 수업 현장 사진 + STARTER 1주차 수업안 카드 */}
        <div className="relative mb-16 lg:mb-0">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl border border-white/60 bg-navy shadow-[var(--shadow-elevated)] ring-1 ring-line">
            <Image
              src="/images/site/hero/hero-class-movement.webp"
              alt="유치원 교실에서 아이들이 화면 속 TeachAble Art Play 영상을 보며 교사와 함께 두 팔을 벌리는 실제 수업 장면"
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/20 bg-navy/75 px-3 py-1.5 text-micro font-medium text-white backdrop-blur-sm sm:right-5 sm:top-5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              실제 수업 현장
            </div>
          </div>

          {week1 ? (
            <div className="absolute -bottom-12 left-5 right-5 rounded-2xl border border-line bg-white/95 p-5 shadow-[var(--shadow-elevated)] backdrop-blur-sm sm:left-6 sm:right-auto sm:w-[22rem]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-caption font-bold text-ink-muted">STARTER {week1.week}주차 수업안</p>
                <span className="shrink-0 rounded-full bg-secondary-soft px-2.5 py-0.5 text-micro font-bold text-secondary-strong">
                  성장키워드 · {week1.growthKeyword}
                </span>
              </div>
              <p className="mt-1.5 text-body-lg font-bold text-navy">{week1.title}</p>
              <dl className="mt-3 space-y-1.5 text-caption">
                <div className="flex gap-2.5">
                  <dt className="w-14 shrink-0 font-semibold text-ink-muted">신체 활동</dt>
                  <dd className="text-ink">{week1.physicalActivity.split(" (")[0]}</dd>
                </div>
                <div className="flex gap-2.5">
                  <dt className="w-14 shrink-0 font-semibold text-ink-muted">미술</dt>
                  <dd className="text-ink">{week1.artActivity}</dd>
                </div>
                <div className="flex gap-2.5">
                  <dt className="w-14 shrink-0 font-semibold text-ink-muted">관찰</dt>
                  <dd className="text-ink">{week1.observationFocus.slice(0, 3).join(" · ")}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
