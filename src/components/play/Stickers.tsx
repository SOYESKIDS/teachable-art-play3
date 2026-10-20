import type { CSSProperties } from "react";
import { cx } from "@/components/ui/cx";

/**
 * 손그림 느낌 스티커 — 별 · 꽃 · 구름 · 해 · 하트 · 새싹 · 색연필 · 씨앗 · 물결선.
 *
 * ★ 모두 장식이다 (aria-hidden). 의미를 담지 않는다.
 * ★ 흰 외곽선(stroke #fff)을 둘러 어떤 바탕 위에서도 스티커처럼 떠 보인다.
 * ★ float 애니메이션은 prefers-reduced-motion 에서 꺼진다 (globals.css).
 */
export type StickerKind = "star" | "flower" | "cloud" | "sun" | "heart" | "sprout" | "crayon" | "seed" | "squiggle" | "sparkle";

const PATHS: Record<StickerKind, (c: string) => React.ReactNode> = {
  star: (c) => (
    <path d="M32 5l7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 43.8l-15.2 8 2.9-16.9-12.3-12 17-2.5z" fill={c} stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
  ),
  sparkle: (c) => <path d="M32 6c2 14 6 18 20 26-14 8-18 12-20 26-2-14-6-18-20-26 14-8 18-12 20-26z" fill={c} stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" />,
  flower: (c) => (
    <g stroke="#fff" strokeWidth="3.5">
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="32" cy="17" rx="10" ry="13" fill={c} transform={`rotate(${r} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="9" fill="#ffc928" />
    </g>
  ),
  cloud: (c) => (
    <path d="M18 46h30a11 11 0 0 0 1-22 15 15 0 0 0-28-3 12 12 0 0 0-3 25z" fill={c} stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
  ),
  sun: (c) => (
    <g stroke="#fff" strokeWidth="3.5" strokeLinecap="round">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
        <path key={r} d="M32 4v8" stroke={c} strokeWidth="5" transform={`rotate(${r} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="15" fill={c} />
    </g>
  ),
  heart: (c) => (
    <path d="M32 54S8 40 8 23a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 17-24 31-24 31z" fill={c} stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
  ),
  sprout: (c) => (
    <g stroke="#fff" strokeWidth="3.5" strokeLinejoin="round">
      <path d="M32 58V30" stroke={c} strokeWidth="6" strokeLinecap="round" />
      <path d="M32 32C30 18 18 12 8 14c0 12 10 20 24 18z" fill={c} />
      <path d="M32 28c2-12 12-18 24-16 0 12-10 18-24 16z" fill={c} />
    </g>
  ),
  crayon: (c) => (
    <g stroke="#fff" strokeWidth="3.5" strokeLinejoin="round">
      <path d="M14 46L40 12l12 9-26 34-14 4z" fill={c} />
      <path d="M14 46l12 9-14 4z" fill="#1b2547" />
    </g>
  ),
  seed: (c) => <path d="M32 6c14 10 18 30 6 46-4 5-8 5-12 0C14 36 18 16 32 6z" fill={c} stroke="#fff" strokeWidth="4" strokeLinejoin="round" />,
  squiggle: (c) => (
    <path d="M4 36c8-14 14-14 20 0s12 14 20 0 12-14 18-2" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" />
  ),
};

export function Sticker({
  kind,
  color,
  className,
  float = false,
  tilt = 0,
  delay = 0,
}: {
  kind: StickerKind;
  color: string;
  className?: string;
  float?: boolean;
  tilt?: number;
  delay?: number;
}) {
  const style = { "--tilt": `${tilt}deg`, animationDelay: `${delay}ms`, rotate: float ? undefined : `${tilt}deg` } as CSSProperties;
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cx("pointer-events-none select-none drop-shadow-[0_3px_0_rgba(27,37,71,0.12)]", float && "animate-float", className)}
      style={style}
    >
      {PATHS[kind](color)}
    </svg>
  );
}

/** 섹션 경계 물결 — 위 섹션 색으로 채운 곡선 */
export function Wave({ fill, flip = false, className }: { fill: string; flip?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 90"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cx("block h-[42px] w-full sm:h-[70px]", flip && "rotate-180", className)}
    >
      <path d="M0 0h1440v38c-120 30-260 46-420 30S700 18 540 30 220 86 0 60z" fill={fill} />
    </svg>
  );
}
