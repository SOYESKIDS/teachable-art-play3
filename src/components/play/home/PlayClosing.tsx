import Image from "next/image";
import Link from "next/link";
import { GROWTH_METRIC_LABEL } from "@/lib/curriculum/taxonomies";
import { characterImage } from "@/data/experience/characters";
import { DEMO_REPORT } from "@/data/experience/report";
import { ConsultButton } from "../ConsultButton";
import { ArrowRight, PlayIcon, PopLink } from "../PopButton";
import { Sticker } from "../Stickers";
import { SectionHeading } from "./PlaySections";

const METRIC_COLOR = ["bg-pop-pink-soft text-pop-pink-deep", "bg-pop-sky-soft text-pop-sky-deep", "bg-pop-yellow-soft text-pop-ink", "bg-pop-mint-soft text-pop-mint-deep", "bg-pop-lilac-soft text-pop-lilac-deep"];

/* ── 6. 성장 기록 — 가상 예시 ───────────────────────────────── */
export function GrowthPreview() {
  const moments = DEMO_REPORT.moments.slice(1, 3);
  return (
    <section id="growth-record" aria-labelledby="growth-title" className="relative scroll-mt-24 overflow-hidden bg-pop-lilac-soft py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            id="growth-title"
            eyebrow="성장 기록"
            title={<>점수가 아니라 <span className="text-pop-lilac-deep">순간</span>을 기록해요</>}
            lead="아이가 무엇을 시도했고 어떻게 설명했는지, 다섯 가지 관점으로 이야기처럼 남깁니다. 순위 · 등급 · 진단은 없습니다."
          />
          <ul className="mt-8 flex flex-wrap gap-2">
            {Object.values(GROWTH_METRIC_LABEL).map((label, i) => (
              <li key={label} className={`rounded-full px-4 py-2 text-[15px] font-bold ${METRIC_COLOR[i]}`}>{label}</li>
            ))}
          </ul>
          <PopLink href="/experience/report" tone="ink" size="lg" className="mt-9">
            가상 리포트 열어 보기
            <ArrowRight />
          </PopLink>
        </div>
        <div className="relative">
          <article className="rounded-[36px] bg-white p-6 shadow-pop-lg sm:p-8" aria-label="가상 성장 리포트 미리보기">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-[22px] text-pop-ink">{DEMO_REPORT.childLabel}</p>
              <span className="rounded-full bg-pop-orange-soft px-3 py-1 text-[13px] font-bold text-pop-orange-deep">가상 예시</span>
            </div>
            <p className="mt-1 text-[14px] font-semibold text-pop-ink-muted">{DEMO_REPORT.period}</p>
            <ul className="mt-6 grid gap-4">
              {moments.map((m) => (
                <li key={m.title} className="rounded-3xl bg-pop-cream p-5">
                  <p className="text-[13px] font-bold text-pop-lilac-deep">{m.week}주차 · {GROWTH_METRIC_LABEL[m.metric]}</p>
                  <p className="mt-1 text-[17px] font-bold text-pop-ink">{m.title}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-pop-ink-muted">{m.observed}</p>
                </li>
              ))}
            </ul>
          </article>
          <Sticker kind="heart" color="#ff4f8b" float className="absolute -left-4 -top-6 h-14 w-14" />
        </div>
      </div>
    </section>
  );
}

/* ── 7. 도입 안내 — 2026 공개 체험 · 2027 구독 전환 예정 ───────── */
export function AdoptionTimeline() {
  return (
    <section id="adoption" aria-labelledby="adoption-title" className="relative scroll-mt-24 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
        <SectionHeading
          id="adoption-title"
          eyebrow="도입 안내"
          title={<>2026년은 <span className="text-pop-pink-deep">누구나 체험</span>하는 해</>}
          lead="원장님과 선생님이 직접 보고, 눌러 보고, 결정하실 수 있도록 공개 체험으로 먼저 엽니다."
        />
        <ol className="mt-14 grid gap-6 md:grid-cols-2">
          <li className="relative rounded-[36px] bg-pop-yellow p-8 shadow-pop">
            <p className="font-display text-[44px] leading-none text-pop-ink">2026</p>
            <h3 className="mt-3 text-[22px] font-extrabold text-pop-ink">공개 체험 운영</h3>
            <ul className="mt-4 grid gap-2 text-[16px] font-medium leading-relaxed text-pop-ink">
              <li>· 로그인 없이 24주 교육과정 둘러보기</li>
              <li>· 교실 플레이어로 수업 직접 체험</li>
              <li>· 가상 성장 리포트 예시 보기</li>
              <li>· 체험 화면은 저장 · 개인정보 수집 없음</li>
            </ul>
            <Sticker kind="star" color="#ff4f8b" float className="absolute right-6 top-6 h-12 w-12" />
          </li>
          <li className="relative rounded-[36px] bg-pop-sky-soft p-8 shadow-pop">
            <p className="font-display text-[44px] leading-none text-pop-sky-deep">2027</p>
            <h3 className="mt-3 text-[22px] font-extrabold text-pop-ink">기관 구독형 서비스 전환 예정</h3>
            <ul className="mt-4 grid gap-2 text-[16px] font-medium leading-relaxed text-pop-ink">
              <li>· 기관 계정 · 반 관리 · 수업 기록</li>
              <li>· 관찰 기록과 성장 리포트 운영</li>
              <li>· 구독 조건과 이용 요금은 확정되면 안내드립니다</li>
            </ul>
            <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-[14px] font-semibold text-pop-ink-muted">
              현재 이용 중인 기관은 기존처럼 <Link href="/kindergarten" className="font-bold text-pop-sky-deep underline">유치원 로그인</Link>으로 들어가실 수 있습니다.
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}

/* ── 8. 마무리 ──────────────────────────────────────────────── */
export function PlayFinalCta() {
  const ubi = characterImage("ubi");
  const maru = characterImage("maru");
  return (
    <section id="contact" aria-labelledby="contact-title" className="relative scroll-mt-24 overflow-hidden bg-pop-pink-deep py-20 text-white sm:py-24">
      <div aria-hidden="true" className="dots absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-[1100px] px-4 text-center sm:px-6">
        <h2 id="contact-title" className="font-display text-[36px] leading-tight sm:text-[52px]">
          <span className="block">오늘, 우리 반의</span>
          <span className="block">첫 장면을 열어 볼까요?</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[40ch] text-[18px] font-medium leading-relaxed text-white/90">
          체험은 바로 시작됩니다. 우리 원에 맞는 도입이 궁금하시면 문의를 남겨 주세요.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <PopLink href="/experience" tone="yellow" size="xl">
            <PlayIcon />
            수업 체험하기
          </PopLink>
          <ConsultButton tone="white" size="xl">도입 문의하기</ConsultButton>
        </div>
      </div>
      {ubi ? <Image src={ubi.src} alt="" width={ubi.width} height={ubi.height} sizes="180px" className="absolute -bottom-6 left-2 hidden w-[150px] lg:block xl:left-12" /> : null}
      {maru ? <Image src={maru.src} alt="" width={maru.width} height={maru.height} sizes="160px" className="absolute -bottom-6 right-2 hidden w-[130px] lg:block xl:right-12" /> : null}
    </section>
  );
}
