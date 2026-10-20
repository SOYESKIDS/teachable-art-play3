import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/**
 * 공개 체험 버튼.
 *
 * ★ 글자 대비 — 노랑 · 흰 바탕에는 pop-ink, 진한 핑크 · 잉크 바탕에는 흰 글자.
 *   밝은 핑크 · 민트 위 흰 글자는 4.5:1 을 넘지 못해 쓰지 않는다 (globals.css 측정값).
 * ★ 터치 목표 48px 이상 (size md), 교실 화면은 64px (size xl).
 */
const TONE = {
  yellow: "bg-pop-yellow text-pop-ink hover:bg-[#ffd650] active:translate-y-0.5",
  pink: "bg-pop-pink-deep text-white hover:bg-[#b0174f] active:translate-y-0.5",
  ink: "bg-pop-ink text-white hover:bg-[#28345f] active:translate-y-0.5",
  white: "bg-white text-pop-ink ring-2 ring-pop-ink/10 hover:ring-pop-ink/25 active:translate-y-0.5",
  ghost: "bg-transparent text-pop-ink ring-2 ring-pop-ink/15 hover:bg-white/70 active:translate-y-0.5",
} as const;

const SIZE = {
  md: "min-h-12 px-5 text-[15px] gap-2",
  lg: "min-h-14 px-7 text-[17px] gap-2.5",
  xl: "min-h-16 px-8 text-[19px] gap-3",
} as const;

export type PopTone = keyof typeof TONE;
export type PopSize = keyof typeof SIZE;

export function popButtonClass(tone: PopTone = "yellow", size: PopSize = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center rounded-full font-bold whitespace-nowrap shadow-pop",
    "transition-[background-color,transform,box-shadow] duration-150 focus-visible:outline-offset-4",
    "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
    TONE[tone],
    SIZE[size],
    extra,
  );
}

export function PopLink({
  tone,
  size,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { tone?: PopTone; size?: PopSize; children: ReactNode }) {
  return (
    <Link {...props} className={popButtonClass(tone, size, className)}>
      {children}
    </Link>
  );
}

export function ArrowRight({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function PlayIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}
