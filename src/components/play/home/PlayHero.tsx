import Image from "next/image";
import { Buddy } from "@/components/play/Doodles";
import { MEDIA } from "@/data/experience/media";
import { ArrowRight, PlayIcon, PopLink } from "../PopButton";
import { Sticker } from "../Stickers";

/**
 * 홈 첫 화면 — 큰 그림이 먼저 보인다.
 *
 * ★ 데스크톱: 글 40% · 그림 60%. 그림은 둥근 면에 담아 화면 폭을 크게 쓴다.
 * ★ 모바일: 글 → 그림 순서로 쌓는다. 글과 그림이 겹치지 않는다.
 * ★ 등장 효과는 opacity 0.4 에서 시작한다 — 효과가 멈춰도 글이 숨지 않는다.
 * ★ 수치는 공식 지도의 사실만 쓴다 (24주 · PART 3 · 그림책 · 신체표현 · 미술).
 * ★ 넓은 화면(lg~): 첫 화면 높이를 채우고 가운데 정렬. 2xl(1536~)은 폭 1520 · 제목 78px 로 키운다.
 * ★ 제목 크기는 첫 줄 「놀이가 예술이 되고,」(7.27em)가 글 칸에 한 줄로 들어가는 최대값이다 (2026-10-20 실측).
 */
export function PlayHero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#fff1c2_0%,#fffaf0_72%)]">
      <div aria-hidden="true" className="absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-pop-pink/20 blur-2xl" />
      <div aria-hidden="true" className="absolute -right-20 -top-16 -z-10 h-96 w-96 rounded-full bg-pop-mint/25 blur-2xl" />
      <div aria-hidden="true" className="dots absolute inset-0 -z-10 opacity-50" />

      <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:min-h-[min(880px,calc(100svh-76px))] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10 lg:pb-20 lg:pt-10 2xl:max-w-[1520px] 2xl:gap-16">
        <div className="relative animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-bold text-pop-ink shadow-pop">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-pop-pink" />
            2026 공개 체험 · 로그인 없이 바로
          </p>
          <h1 id="hero-title" className="mt-6 font-display text-[40px] leading-[1.18] text-pop-ink sm:text-[54px] lg:text-[52px] xl:text-[64px] 2xl:text-[78px]">
            놀이가 <span className="whitespace-nowrap bg-[linear-gradient(transparent_64%,rgba(255,201,40,0.55)_64%,rgba(255,201,40,0.55)_92%,transparent_92%)] text-pop-pink-deep">예술</span>이 되고,
            <br />
            예술이 <span className="text-pop-sky-deep">성장</span>으로
            <br className="sm:hidden" /> 이어집니다.
          </h1>
          <p className="mt-6 max-w-[36ch] text-[18px] font-medium leading-relaxed text-pop-ink-muted sm:text-[20px] 2xl:text-[22px]">
            그림책 · 신체표현 · 미술활동으로 만나는 <strong className="whitespace-nowrap font-bold text-pop-ink">24주 통합예술교육</strong>.
            외부 강사 없이 <strong className="whitespace-nowrap font-bold text-pop-ink">담임선생님이</strong> 교실 플레이어로 진행해요.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PopLink href="/experience/weeks" tone="yellow" size="xl">
              24주 수업 만나기
              <ArrowRight />
            </PopLink>
            <PopLink href="/experience/classroom/4" tone="pink" size="xl">
              <PlayIcon />
              수업 직접 체험하기
            </PopLink>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[44px] bg-pop-sky-soft shadow-pop-lg ring-8 ring-white lg:rotate-[1.5deg]">
            <Image
              src={MEDIA.heroMusic.src}
              alt={MEDIA.heroMusic.alt}
              fill
              preload
              fetchPriority="high"
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
          </div>
          <Buddy group character="pupu" sizes="(min-width: 1024px) 320px, 46vw" className="absolute -bottom-10 -left-3 w-[42%] max-w-[300px] sm:-left-6 lg:-bottom-12 lg:-left-14" />
          <Buddy character="cat" sizes="140px" className="absolute -right-2 -top-10 hidden w-[110px] animate-float-slow sm:block lg:-right-6" />
          <Sticker kind="star" color="#ffc928" float tilt={-10} className="absolute -top-6 left-[18%] h-14 w-14" />
          <Sticker kind="flower" color="#ff4f8b" float delay={600} className="absolute bottom-[18%] -right-4 h-16 w-16 sm:-right-8" />
          <Sticker kind="cloud" color="#e1efff" float delay={1200} className="absolute right-[30%] -top-8 hidden h-16 w-24 sm:block" />
          <Sticker kind="sprout" color="#45c25a" float delay={300} tilt={8} className="absolute -bottom-6 right-[22%] h-14 w-14" />
        </div>
      </div>
    </section>
  );
}
