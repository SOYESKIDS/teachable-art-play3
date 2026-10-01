import { cx } from "@/components/ui/cx";

/**
 * 운영 화면(교사 · 원장 · 본사 · 영업) 머리글의 작은 브랜드 표기.
 *
 * 공개 홈페이지의 BrandMark 는 로고 이미지 + 서비스명이라 운영 화면 머리글에는 크다.
 * 여기서는 Navy 사각 모노그램 하나와 영역 이름만 둔다 — 네 역할의 머리글이
 * 같은 표기로 시작하면 다른 역할 화면으로 옮겨 가도 같은 제품임을 바로 안다.
 */
export function AppMark({
  area,
  className = "",
}: {
  /** 모노그램 옆 작은 글자 — "본사 운영" · "영업" · 비우면 서비스명 */
  area?: string;
  className?: string;
}) {
  return (
    <span className={cx("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy text-[12px] font-extrabold tracking-[-0.04em] text-white"
      >
        TA
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-micro font-bold tracking-[0.08em] text-ink-muted">
          TEACHABLE ART PLAY
        </span>
        {area ? (
          <span className="text-label font-bold text-navy">{area}</span>
        ) : null}
      </span>
    </span>
  );
}
