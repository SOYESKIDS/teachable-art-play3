import Image from "next/image";
import { Buddy } from "@/components/play/Doodles";
import Link from "next/link";
import { cx } from "@/components/ui/cx";
import { MEDIA } from "@/data/experience/media";
import { EXPERIENCE_PARTS, experienceWeek, FEATURED_WEEK_NO, weeksInPart } from "@/data/experience/weeks";
import { ArrowRight, PlayIcon, PopLink } from "../PopButton";
import { Sticker, type StickerKind } from "../Stickers";
import type { ExperienceImage } from "@/data/experience/types";
import { WeekArt } from "../WeekArt";

const TONE = {
  mint: { bg: "bg-pop-mint-soft", text: "text-pop-mint-deep", dot: "#22c3b5", solid: "bg-pop-mint" },
  sky: { bg: "bg-pop-sky-soft", text: "text-pop-sky-deep", dot: "#4da3ff", solid: "bg-pop-sky" },
  pink: { bg: "bg-pop-pink-soft", text: "text-pop-pink-deep", dot: "#ff4f8b", solid: "bg-pop-pink" },
} as const;

export function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
  align = "center",
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
  id: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cx("max-w-3xl", align === "center" ? "mx-auto text-center" : "")}>
      <p className="inline-flex rounded-full bg-pop-ink px-4 py-1.5 text-[13px] font-bold tracking-wide text-pop-yellow">{eyebrow}</p>
      <h2 id={id} className="mt-4 font-display text-[32px] leading-tight text-pop-ink sm:text-[44px]">
        {title}
      </h2>
      {lead ? <p className="mt-4 text-[17px] leading-relaxed text-pop-ink-muted sm:text-[19px]">{lead}</p> : null}
    </div>
  );
}

/* ── 2. 24주 탐험 지도 ───────────────────────────────────────── */
export function AdventureMap() {
  return (
    <section id="journey" aria-labelledby="journey-title" className="relative scroll-mt-24 bg-pop-cream py-20 sm:py-28">
      <div className="mx-auto max-w-[1320px] 2xl:max-w-[1520px] px-4 sm:px-6">
        <SectionHeading
          id="journey-title"
          eyebrow="24주 탐험 지도"
          title={<>씨앗에서 숲으로, 계절을 지나 <span className="text-pop-pink-deep">세계로</span></>}
          lead="세 개의 PART, 스물네 번의 모험. 아이들은 한 주에 하나씩 새로운 이야기 속으로 들어갑니다."
        />
        <ol className="mt-14 grid gap-6 lg:grid-cols-3">
          {EXPERIENCE_PARTS.map((part, i) => {
            const tone = TONE[part.tone];
            const weeks = weeksInPart(part.partNo);
            return (
              <li key={part.partNo} className={cx("group relative flex flex-col overflow-hidden rounded-[36px] shadow-pop", tone.bg)}>
                <Link href={`/experience/weeks#part-${part.partNo}`} className="flex flex-1 flex-col focus-visible:outline-offset-[-6px] md:max-lg:flex-row">
                  <div className="relative aspect-[16/11] overflow-hidden md:max-lg:aspect-auto md:max-lg:min-h-[320px] md:max-lg:w-[46%] md:max-lg:shrink-0">
                    <Image src={part.image.src} alt="" fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className={cx("absolute left-5 top-5 rounded-full px-4 py-1.5 font-display text-[18px] text-pop-ink sticker", "bg-pop-yellow")}>
                      PART {part.partNo}
                    </span>
                    <Buddy character={part.character} sizes="120px" className="absolute -bottom-2 right-3 w-[28%] max-w-[120px]" />
                  </div>
                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <p className={cx("text-[14px] font-bold", tone.text)}>
                      {part.weekFrom}~{part.weekTo}주 · {part.tagline}
                    </p>
                    <h3 className="mt-2 font-display text-[28px] leading-tight text-pop-ink">
                      {part.title}
                      {part.nameProvisional ? <span className="ml-2 align-middle text-[14px] font-sans font-bold text-pop-ink-muted">(가칭)</span> : null}
                    </h3>
                    <p className="mt-3 text-[16px] leading-relaxed text-pop-ink-muted">{part.description}</p>
                    <ul className="mt-5 flex flex-wrap gap-1" aria-label={`PART ${part.partNo} 주차`}>
                      {weeks.map((w) => (
                        <li key={w.weekNo} className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-1.5 text-[13px] font-bold text-pop-ink" title={w.title}>
                          {w.weekNo}
                        </li>
                      ))}
                    </ul>
                    <span className={cx("mt-6 inline-flex items-center gap-1.5 text-[16px] font-bold", tone.text)}>
                      PART {part.partNo} 둘러보기 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
                <Sticker kind={(["sprout", "flower", "star"] as StickerKind[])[i]} color={tone.dot} float delay={i * 400} className="absolute right-5 top-5 h-12 w-12" />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ── 3. 수업은 이렇게 진행됩니다 ─────────────────────────────── */
const FLOW = [
  { title: "그림책", body: "이야기 속 주인공을 만나며 오늘의 질문을 품어요.", color: "#4da3ff", soft: "bg-pop-sky-soft", icon: "book", image: null as ExperienceImage | null }, // 그림책 그림은 캐릭터 사용권 확인 전이라 아이콘으로 (media.ts CHARACTER_BEARING_MEDIA)
  { title: "움직임", body: "몸과 리듬으로 이야기를 표현하며 감각을 깨워요.", color: "#ff4f8b", soft: "bg-pop-pink-soft", icon: "move", image: null as ExperienceImage | null }, // 촬영 · 사용권 기록이 없는 사진은 빼고 아이콘으로 (media.ts EXCLUDED_PUBLIC_MEDIA)
  { title: "만들기", body: "재료를 탐색하고 나만의 작품으로 생각을 담아요.", color: "#ffc928", soft: "bg-pop-yellow-soft", icon: "make", image: MEDIA.artPlay as ExperienceImage | null },
  { title: "관찰", body: "선생님은 아이가 시도한 순간을 기록으로 남겨요.", color: "#22c3b5", soft: "bg-pop-mint-soft", icon: "eye", image: null as ExperienceImage | null },
];

function FlowIcon({ icon, color }: { icon: string; color: string }) {
  const common = { fill: "none", stroke: "#1b2547", strokeWidth: 3.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-12 w-12 shrink-0">
      <circle cx="32" cy="32" r="28" fill={color} />
      {icon === "book" && <g {...common}><path d="M14 20c6-2 12-2 18 2v24c-6-4-12-4-18-2z" fill="#fff" /><path d="M50 20c-6-2-12-2-18 2v24c6-4 12-4 18-2z" fill="#fff" /></g>}
      {icon === "move" && <g {...common}><circle cx="32" cy="16" r="5" fill="#fff" /><path d="M32 22v14M20 26l12 4 12-4M24 50l8-14 8 14" /></g>}
      {icon === "make" && <g {...common}><path d="M18 46l20-26 8 6-20 26-10 2z" fill="#fff" /><path d="M42 16l8 6" /></g>}
      {icon === "eye" && <g {...common}><path d="M10 32s8-12 22-12 22 12 22 12-8 12-22 12S10 32 10 32z" fill="#fff" /><circle cx="32" cy="32" r="6" fill="#1b2547" /></g>}
    </svg>
  );
}

/** 관찰 단계 그림 — 관찰 메모 카드 (사진 대신 · 실제 기록 아님) */
function ObserveArt() {
  return (
    <svg viewBox="0 0 220 150" className="h-[78%] w-auto drop-shadow-[0_8px_10px_rgba(27,37,71,0.14)]">
      <rect x="30" y="18" width="150" height="116" rx="16" fill="#fff" />
      <rect x="48" y="38" width="70" height="10" rx="5" fill="#22c3b5" />
      <rect x="48" y="60" width="112" height="8" rx="4" fill="#d9f6f2" />
      <rect x="48" y="76" width="96" height="8" rx="4" fill="#d9f6f2" />
      <rect x="48" y="92" width="104" height="8" rx="4" fill="#d9f6f2" />
      <circle cx="160" cy="44" r="12" fill="#ffc928" />
      <path d="M154 44l4 4 8-8" fill="none" stroke="#1b2547" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M150 118l40-46 10 8-38 46-14 4z" fill="#ff8a3d" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function ClassFlow() {
  return (
    <section id="program" aria-labelledby="program-title" className="relative scroll-mt-24 overflow-hidden bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-[1320px] 2xl:max-w-[1520px] px-4 sm:px-6">
        <SectionHeading
          id="program-title"
          eyebrow="한 번의 수업"
          title={<>수업은 이렇게 <span className="text-pop-mint-deep">흘러갑니다</span></>}
          lead="설명보다 경험이 먼저. 매주 같은 리듬이라 아이도 선생님도 금세 익숙해집니다."
        />
        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((step, i) => (
            <li key={step.title} className={cx("relative flex flex-col overflow-hidden rounded-[32px]", step.soft)}>
              <div className="relative aspect-[16/11] overflow-hidden">
                {step.image ? (
                  <Image src={step.image.src} alt={step.image.alt} fill sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 100vw" className="object-cover" />
                ) : (
                  <div aria-hidden="true" className="dots flex h-full items-center justify-center bg-pop-mint-soft">
                    <ObserveArt />
                  </div>
                )}
                <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white font-display text-[20px] text-pop-ink shadow-pop">{i + 1}</span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-3">
                  <FlowIcon icon={step.icon} color={step.color} />
                  <h3 className="font-display text-[26px] text-pop-ink">{step.title}</h3>
                </div>
                <p className="mt-3 text-[16px] leading-relaxed text-pop-ink-muted">{step.body}</p>
              </div>
              {i < FLOW.length - 1 ? (
                <span aria-hidden="true" className="absolute -right-4 top-[32%] z-10 hidden h-9 w-9 items-center justify-center rounded-full bg-white text-pop-ink shadow-pop lg:flex">
                  <ArrowRight className="h-4 w-4" />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── 4. 미리 체험해 보기 — 4주차 ─────────────────────────────── */
export function TryFeatured() {
  const week = experienceWeek(FEATURED_WEEK_NO);
  if (!week) return null;
  return (
    <section aria-labelledby="try-title" className="relative overflow-hidden bg-pop-mint py-20 sm:py-24">
      <div aria-hidden="true" className="dots absolute inset-0 opacity-40" />
      <div className="relative mx-auto grid max-w-[1320px] 2xl:max-w-[1520px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div className="relative order-2 lg:order-1">
          <WeekArt week={week} size="hero" className="aspect-[4/3] w-full rounded-[40px] shadow-pop-lg ring-8 ring-white/80" />
          <Sticker kind="seed" color="#ff8a3d" float className="absolute -left-4 -top-6 h-14 w-14" />
          <Sticker kind="sprout" color="#45c25a" float delay={500} className="absolute -bottom-6 right-10 h-16 w-16" />
        </div>
        <div className="order-1 lg:order-2">
          <p className="inline-flex rounded-full bg-white px-4 py-1.5 text-[13px] font-bold text-pop-mint-deep">미리 체험해 보기 · {week.weekNo}주차</p>
          <h2 id="try-title" className="mt-4 font-display text-[40px] leading-tight text-pop-ink sm:text-[56px]">《{week.title}》</h2>
          <p className="mt-4 max-w-[36ch] text-[19px] font-medium leading-relaxed text-pop-ink">{week.coreMessage}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {week.stages.map((s) => (
              <li key={s.key} className="rounded-full bg-white/90 px-4 py-2 text-[14px] font-bold text-pop-ink">{s.title}</li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PopLink href={`/experience/classroom/${week.weekNo}`} tone="ink" size="xl">
              <PlayIcon />
              체험 시작
            </PopLink>
            <PopLink href={`/experience/weeks/${week.weekNo}`} tone="white" size="xl">
              수업 자세히 보기
            </PopLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 5. 교사용 수업 화면 소개 — 태블릿 목업 ───────────────────── */
export function PlayerPreview() {
  const week = experienceWeek(FEATURED_WEEK_NO);
  if (!week) return null;
  const stage = week.stages[1];
  return (
    <section aria-labelledby="player-title" className="relative overflow-hidden bg-pop-cream py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1320px] 2xl:max-w-[1520px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <SectionHeading
            align="left"
            id="player-title"
            eyebrow="교실 플레이어"
            title={<>버튼 하나로 <span className="text-pop-lilac-deep">다음 장면</span>으로</>}
            lead="아이들은 큰 그림과 한 줄만 보고, 선생님은 발문 · 준비물 · 시간을 옆에서 봅니다. 전자칠판 · 프로젝터 · 태블릿 어디서든."
          />
          <ul className="mt-8 grid gap-3 text-[16px] font-semibold text-pop-ink">
            {["교실 화면 / 교사 화면 한 번에 전환", "단계 이동 · 진행률 · 전체 화면", "준비물 · 발문 · 안전 안내를 한 화면에"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-pop-yellow text-[14px]">✓</span>
                {t}
              </li>
            ))}
          </ul>
          <PopLink href={`/experience/classroom/${week.weekNo}`} tone="pink" size="lg" className="mt-9">
            <PlayIcon />
            교실 플레이어 열어 보기
          </PopLink>
        </div>

        <div className="relative" aria-hidden="true">
          <div className="rounded-[40px] bg-pop-ink p-3 shadow-pop-lg sm:p-4">
            <div className="overflow-hidden rounded-[28px] bg-pop-cream">
              <div className="flex items-center justify-between px-5 py-3 text-[13px] font-bold text-pop-ink-muted">
                <span>{week.weekNo}주차 · {stage.title}</span>
                <span className="rounded-full bg-white px-3 py-1">2 / 5</span>
              </div>
              <div className="h-2 bg-white"><div className="h-full w-2/5 rounded-r-full bg-pop-pink" /></div>
              <div className="relative grid min-h-[300px] place-items-center px-6 py-10 sm:min-h-[380px]" style={{ background: `radial-gradient(90% 80% at 50% 30%, ${week.themeColor}33, #fffaf0)` }}>
                <Buddy character={week.body.character} sizes="160px" className="absolute bottom-2 left-6 w-[20%] max-w-[140px]" />
                <p className="max-w-[16ch] text-center font-display text-[34px] leading-tight text-pop-ink sm:text-[46px]">{stage.childLine}</p>
              </div>
              <div className="flex items-center justify-between gap-3 bg-white px-5 py-4">
                <span className="rounded-full bg-pop-cream px-5 py-3 text-[14px] font-bold text-pop-ink">← 이전</span>
                <span className="hidden rounded-full bg-pop-sky-soft px-4 py-3 text-[14px] font-bold text-pop-sky-deep sm:inline">발문 · 준비물</span>
                <span className="rounded-full bg-pop-pink-deep px-6 py-3 text-[14px] font-bold text-white">다음 단계 →</span>
              </div>
            </div>
          </div>
          <Sticker kind="star" color="#ffc928" float className="absolute -right-4 -top-6 h-14 w-14" />
        </div>
      </div>
    </section>
  );
}
