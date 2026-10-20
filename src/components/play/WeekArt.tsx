import Image from "next/image";
import { cx } from "@/components/ui/cx";
import { characterImage } from "@/data/experience/characters";
import type { ExperienceWeek } from "@/data/experience/types";
import { Buddy } from "./Doodles";
import { Motif } from "./Motif";
import { Sticker } from "./Stickers";

/**
 * 주차 대표 그림.
 *
 * ★ 주차 전용 사진(media.ts)이 있으면 사진, 없으면 주차 색 · 주제 그림 · 캐릭터로
 *   그린 일러스트를 쓴다. 사진이 없다고 빈칸이나 깨진 이미지를 두지 않는다.
 * ★ 색은 공식 지도의 주차 색(themeColor)을 옅게 깐다 — 24장이 서로 구분된다.
 */
export function WeekArt({
  week,
  size = "card",
  priority = false,
  className,
}: {
  week: ExperienceWeek;
  size?: "card" | "hero";
  priority?: boolean;
  className?: string;
}) {
  const character = characterImage(week.body.character);
  const hero = size === "hero";

  if (week.image) {
    return (
      <div className={cx("relative overflow-hidden", className)} style={{ backgroundColor: `${week.themeColor}22` }}>
        <Image
          src={week.image.src}
          alt={week.image.alt}
          fill
          // 첫 화면 큰 그림(LCP) — 미리 받고 다른 그림보다 먼저 받는다 (Next 16: priority → preload)
          preload={priority}
          fetchPriority={priority ? "high" : undefined}
          sizes={hero ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 100vw"}
          className="object-cover"
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
      </div>
    );
  }

  // 캐릭터가 꺼져 있으면 주제 그림을 크게 — 카드는 구도 4가지를 주차 번호로 돌려 쓴다.
  // 한 줄(4장)에 서로 다른 구도가 오도록 weekNo % 4. 큰 그림(hero)은 가운데 구도 하나.
  if (!character) {
    const layout = hero ? 0 : week.weekNo % 4;
    const flip = !hero && week.weekNo % 2 === 0;
    const STICKERS = ["star", "flower", "sparkle", "heart", "sun", "sprout", "cloud"] as const;
    const s1 = STICKERS[week.weekNo % STICKERS.length];
    const s2 = STICKERS[(week.weekNo + 3) % STICKERS.length];
    const L = [
      // 0 가운데 원
      { halo: "left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 " + (hero ? "h-[64%]" : "h-[70%]"), motif: "left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 " + (hero ? "h-[50%]" : "h-[54%]"), a: "left-[12%] top-[14%]", b: "bottom-[14%] right-[9%]" },
      // 1 왼쪽 아래 — 큰 그림이 땅에서 솟는다
      { halo: "-left-[6%] bottom-[2%] h-[86%]", motif: "left-[10%] bottom-[16%] h-[60%] -rotate-6", a: "right-[12%] top-[16%]", b: "right-[26%] top-[42%]" },
      // 2 오른쪽 기울임
      { halo: "-right-[8%] -top-[10%] h-[90%]", motif: "right-[12%] top-[14%] h-[60%] rotate-[8deg]", a: "left-[12%] top-[18%]", b: "left-[28%] bottom-[20%]" },
      // 3 햇살 고리 — 흰 원 대신 점선 고리
      { halo: "left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 h-[72%] bg-transparent border-[6px] border-dashed border-white/80", motif: "left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 h-[50%]", a: "left-[10%] bottom-[22%]", b: "right-[10%] top-[12%]" },
    ][layout];
    return (
      <div
        className={cx("relative isolate overflow-hidden", className)}
        style={{ background: `radial-gradient(120% 90% at ${layout === 1 ? "25% 80%" : "70% 20%"}, ${week.themeColor}55 0%, ${week.themeColor}1f 50%, #fff7e8 100%)` }}
        role="img"
        aria-label={`${week.weekNo}주차 「${week.title}」 주제 그림`}
      >
        <div aria-hidden="true" className="dots absolute inset-0 opacity-60" />
        <svg aria-hidden="true" viewBox="0 0 400 120" preserveAspectRatio="none" className={cx("absolute inset-x-0 bottom-0 h-[30%] w-full", flip && "-scale-x-100")}>
          <path d="M0 40c60-30 120-30 180 0s140 30 220-6V120H0z" fill={week.themeColor} opacity="0.22" />
          <path d="M0 70c80-26 150-20 210 4s120 22 190-8V120H0z" fill={week.themeColor} opacity="0.32" />
        </svg>
        <div aria-hidden="true" className={cx("absolute aspect-square rounded-full", layout === 3 ? "" : "bg-white/75", L.halo)} />
        <Motif motif={week.body.motif} color={week.themeColor} className={cx("absolute w-auto drop-shadow-[0_6px_0_rgba(27,37,71,0.10)]", L.motif)} />
        {hero ? <Buddy character={week.body.character} className="absolute bottom-[6%] left-[5%] w-[24%] max-w-[200px]" /> : null}
        <Sticker kind={hero ? "sparkle" : s1} color="#ffc928" className={cx("absolute", L.a, hero ? "h-10 w-10" : "h-7 w-7")} />
        <Sticker kind={hero ? "star" : s2} color="#ff4f8b" tilt={-12} className={cx("absolute", L.b, hero ? "h-9 w-9" : "h-6 w-6")} />
      </div>
    );
  }

  return (
    <div
      className={cx("relative isolate overflow-hidden", className)}
      style={{ background: `radial-gradient(120% 90% at 70% 20%, ${week.themeColor}55 0%, ${week.themeColor}1f 50%, #fff7e8 100%)` }}
      role="img"
      aria-label={`${week.weekNo}주차 「${week.title}」 주제 그림`}
    >
      <div aria-hidden="true" className="dots absolute inset-0 opacity-60" />
      <div aria-hidden="true" className={cx("absolute rounded-full bg-white/75", hero ? "-right-10 -top-10 h-72 w-72" : "-right-6 -top-6 h-40 w-40")} />
      <Motif motif={week.body.motif} color={week.themeColor} className={cx("absolute drop-shadow-[0_6px_0_rgba(27,37,71,0.10)]", hero ? "right-[8%] top-[12%] h-[58%] w-auto" : "right-[7%] top-[10%] h-[62%] w-auto")} />
      <Image
        src={character.src}
        alt=""
        width={character.width}
        height={character.height}
        sizes={hero ? "240px" : "120px"}
        className={cx("absolute bottom-0 h-auto drop-shadow-[0_8px_10px_rgba(27,37,71,0.18)]", hero ? "left-[6%] w-[30%] max-w-[260px]" : "left-[5%] w-[34%] max-w-[130px]")}
      />
    </div>
  );
}
