import Image from "next/image";
import Link from "next/link";
import { DemoNotice } from "@/components/play/Badges";
import { ArrowRight, PlayIcon, PopLink } from "@/components/play/PopButton";
import { Sticker } from "@/components/play/Stickers";
import { WeekArt } from "@/components/play/WeekArt";
import { characterGroupImage } from "@/data/experience/characters";
import { EXPERIENCE_WEEKS, experienceWeek, FEATURED_WEEK_NO } from "@/data/experience/weeks";

export const metadata = {
  title: "수업 체험하기 | TeachAble Art Play",
  alternates: { canonical: "/experience" },
};

/** 공개 체험 입구 — 무엇을 해 볼 수 있는지 세 갈래로 고른다. */
export default function ExperienceHome() {
  const featured = experienceWeek(FEATURED_WEEK_NO)!;
  const friends = characterGroupImage();
  const picks = [1, 4, 11, 17, 21, 24].map((n) => experienceWeek(n)!).filter(Boolean);

  return (
    <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
      <section aria-labelledby="exp-title" className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#d9f6f2_0%,#fffaf0_80%)]">
        <div aria-hidden="true" className="dots absolute inset-0 -z-10 opacity-50" />
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div className="animate-rise">
            <DemoNotice />
            <h1 id="exp-title" className="mt-6 font-display text-[42px] leading-[1.15] text-pop-ink sm:text-[60px]">
              로그인 없이,
              <br />
              <span className="text-pop-mint-deep">지금 바로</span> 수업 체험
            </h1>
            <p className="mt-5 max-w-[36ch] text-[19px] font-medium leading-relaxed text-pop-ink-muted">
              24주 교육과정을 둘러보고, 교실 플레이어로 한 번의 수업을 처음부터 끝까지 진행해 보세요.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PopLink href={`/experience/classroom/${featured.weekNo}`} tone="pink" size="xl">
                <PlayIcon />
                {featured.weekNo}주차 수업 시작
              </PopLink>
              <PopLink href="/experience/weeks" tone="white" size="xl">
                24주 둘러보기
              </PopLink>
            </div>
          </div>
          <div className="relative">
            <WeekArt week={featured} size="hero" priority className="aspect-[4/3] w-full rounded-[44px] shadow-pop-lg ring-8 ring-white" />
            {friends ? (
              <Image src={friends.src} alt="" width={friends.width} height={friends.height} sizes="300px" className="absolute -bottom-8 -right-2 w-[44%] max-w-[300px] drop-shadow-[0_12px_14px_rgba(27,37,71,0.25)]" />
            ) : null}
            <Sticker kind="star" color="#ffc928" float className="absolute -left-4 -top-6 h-14 w-14" />
          </div>
        </div>
      </section>

      <section aria-labelledby="choose-title" className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6 sm:py-20">
        <h2 id="choose-title" className="text-center font-display text-[32px] text-pop-ink sm:text-[42px]">무엇부터 해 볼까요?</h2>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { href: "/experience/weeks", title: "24주 둘러보기", body: "PART 3개 · 24번의 모험을 큰 카드로 탐색해요.", tone: "bg-pop-yellow", kind: "star" as const, color: "#ff4f8b" },
            { href: `/experience/classroom/${featured.weekNo}`, title: "교실 플레이어", body: "단계별로 넘기며 교실 화면과 교사 화면을 체험해요.", tone: "bg-pop-pink-soft", kind: "heart" as const, color: "#ff4f8b" },
            { href: "/experience/report", title: "성장 리포트 예시", body: "가상 원아의 관찰 기록으로 리포트를 살펴봐요.", tone: "bg-pop-lilac-soft", kind: "sparkle" as const, color: "#9b7bff" },
          ].map((c) => (
            <li key={c.href}>
              <Link href={c.href} className={`group relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-[36px] p-8 shadow-pop transition-transform duration-200 hover:-translate-y-1.5 ${c.tone}`}>
                <Sticker kind={c.kind} color={c.color} className="absolute right-6 top-6 h-14 w-14 transition-transform duration-300 group-hover:rotate-12" />
                <h3 className="font-display text-[30px] text-pop-ink">{c.title}</h3>
                <div>
                  <p className="mt-3 max-w-[26ch] text-[16px] leading-relaxed text-pop-ink-muted">{c.body}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[16px] font-bold text-pop-ink">
                    시작하기 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="picks-title" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="picks-title" className="font-display text-[30px] text-pop-ink sm:text-[38px]">바로 체험할 수 있는 수업</h2>
            <Link href="/experience/weeks" className="inline-flex min-h-11 items-center gap-1.5 text-[16px] font-bold text-pop-pink-deep">
              24주 전체 보기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((w) => (
              <li key={w.weekNo}>
                <Link href={`/experience/classroom/${w.weekNo}`} className="group flex items-center gap-4 rounded-[28px] bg-pop-cream p-3 pr-5 transition-colors hover:bg-pop-yellow-soft">
                  <WeekArt week={w} className="aspect-square w-24 shrink-0 rounded-[22px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-pop-ink-muted">{w.weekNo}주차 · #{w.growthKeyword}</span>
                    <span className="mt-0.5 block truncate font-display text-[20px] text-pop-ink">{w.title}</span>
                  </span>
                  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pop-pink-deep text-white transition-transform group-hover:scale-110">
                    <PlayIcon className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center text-[14px] text-pop-ink-muted">총 {EXPERIENCE_WEEKS.length}주 모두 체험할 수 있어요.</p>
        </div>
      </section>

      <section aria-labelledby="safe-title" className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6">
        <div className="rounded-[36px] bg-pop-ink p-8 text-white sm:p-10">
          <h2 id="safe-title" className="font-display text-[26px] sm:text-[30px]">체험 화면은 이렇게 다릅니다</h2>
          <ul className="mt-5 grid gap-3 text-[16px] leading-relaxed text-white/90 sm:grid-cols-2">
            <li>· 실제 기관 · 원아 · 보호자 정보와 연결되지 않습니다.</li>
            <li>· 진행 상태는 이 브라우저 탭에만 잠시 남고 서버에 저장되지 않습니다.</li>
            <li>· 리포트의 아이 이름과 관찰 내용은 지어낸 가상 예시입니다.</li>
            <li>· 수업 문장은 「체험용 구성 · 정식 교안 확정 전」으로 표시됩니다.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
