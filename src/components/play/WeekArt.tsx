import Image from "next/image";
import { cx } from "@/components/ui/cx";
import { characterImage } from "@/data/experience/characters";
import type { ExperienceWeek } from "@/data/experience/types";
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
          priority={priority}
          sizes={hero ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 100vw"}
          className="object-cover"
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={cx("relative isolate overflow-hidden", className)}
      style={{ background: `radial-gradient(120% 90% at 85% 15%, ${week.themeColor}55 0%, ${week.themeColor}22 45%, #fff7e8 100%)` }}
      role="img"
      aria-label={`${week.weekNo}주차 「${week.title}」 주제 그림`}
    >
      <div aria-hidden="true" className="dots absolute inset-0 opacity-60" />
      <div
        aria-hidden="true"
        className={cx("absolute rounded-full bg-white/70", hero ? "-right-10 -top-10 h-72 w-72" : "-right-6 -top-6 h-40 w-40")}
      />
      <Motif
        motif={week.body.motif}
        color={week.themeColor}
        className={cx(
          "absolute drop-shadow-[0_6px_0_rgba(27,37,71,0.10)]",
          hero ? "right-[8%] top-[12%] h-[58%] w-auto" : "right-[7%] top-[10%] h-[62%] w-auto",
        )}
      />
      {character ? (
        <Image
          src={character.src}
          alt=""
          width={character.width}
          height={character.height}
          sizes={hero ? "240px" : "120px"}
          className={cx("absolute bottom-0 h-auto drop-shadow-[0_8px_10px_rgba(27,37,71,0.18)]", hero ? "left-[6%] w-[30%] max-w-[260px]" : "left-[5%] w-[34%] max-w-[130px]")}
        />
      ) : null}
      <Sticker kind="sparkle" color="#ffc928" className={cx("absolute", hero ? "left-[42%] top-[14%] h-10 w-10" : "left-[46%] top-[12%] h-6 w-6")} />
      <Sticker kind="star" color="#ff4f8b" tilt={-12} className={cx("absolute", hero ? "bottom-[14%] right-[10%] h-9 w-9" : "bottom-[12%] right-[8%] h-6 w-6")} />
    </div>
  );
}
