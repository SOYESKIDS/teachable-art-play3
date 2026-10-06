import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { cx } from "@/components/ui/cx";
import type { Availability } from "@/data/home-narrative";

/**
 * 홈 섹션 공통 틀 — 앵커 여백 · 세로 리듬 · 바탕 한 곳에서 정한다.
 * 바탕은 ivory → white → sand(surface-soft) 를 번갈아 써서 섹션 경계가 보이게 한다.
 */
const TONES = {
  ivory: "bg-ivory",
  white: "bg-white",
  sand: "bg-surface-soft",
  sky: "bg-brand-sky/70",
  navy: "bg-navy-deep text-white",
} as const;

export function HomeSection({
  id,
  tone = "white",
  compact = false,
  labelledBy,
  children,
  className = "",
}: {
  id: string;
  tone?: keyof typeof TONES;
  compact?: boolean;
  labelledBy?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-surface={tone === "navy" ? "dark" : undefined}
      className={cx(
        "scroll-mt-[calc(var(--header-height)_+_16px)]",
        compact ? "py-12 sm:py-16 lg:py-20" : "py-16 sm:py-20 lg:py-24",
        TONES[tone],
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

/** 섹션 머리 — 왼쪽 정렬 기본 (편집 지면 리듬). 가운데 정렬은 꼭 필요할 때만. */
export function HomeHeading({
  id,
  eyebrow,
  headline,
  subCopy,
  align = "left",
  inverse = false,
  className = "",
}: {
  id?: string;
  eyebrow: string;
  headline: string;
  subCopy?: string;
  align?: "left" | "center";
  inverse?: boolean;
  className?: string;
}) {
  const center = align === "center";
  return (
    <div className={cx("flex flex-col gap-4", center && "mx-auto items-center text-center", className)}>
      <p
        className={cx(
          "eyebrow inline-flex items-center gap-2.5",
          inverse ? "text-accent-on-dark" : "text-accent-strong",
        )}
      >
        <span aria-hidden="true" className={cx("h-px w-6", inverse ? "bg-accent-on-dark" : "bg-accent")} />
        {eyebrow}
      </p>
      <h2
        id={id}
        className={cx("max-w-3xl whitespace-pre-line text-h2 font-bold", inverse ? "text-white" : "text-navy")}
      >
        {headline}
      </h2>
      {subCopy ? (
        <p className={cx("measure text-lead", inverse ? "text-white/70" : "text-ink-muted")}>{subCopy}</p>
      ) : null}
    </div>
  );
}

/**
 * 제공 상태 배지 — 기존 의미 토큰만 쓴다 (새 색 없음 · Growth5 단계와 무관).
 *   포함          success  — 상품에 들어 있음
 *   준비 중       warning  — 아직 출시 · 구현 전
 *   STANDARD 이상 info     — 상품 등급(플랜)에 따라 열림
 *   계약 범위     neutral  — 흰 면 + 점선 테두리: 계약 조건으로 정해짐 (등급 · 출시 상태가 아님)
 */
const TAG_TONES: Record<Availability, string> = {
  포함: "border-success-border bg-success-soft text-success-text",
  "준비 중": "border-warning-border bg-warning-soft text-warning-text",
  "STANDARD 이상": "border-info-border bg-info-soft text-info-text",
  "계약 범위": "border-dashed border-control-border bg-white text-ink",
};

/** 기능 제공 상태 배지 — 출시되지 않은 것을 쓸 수 있는 것처럼 보이지 않게 한다 */
export function AvailabilityTag({ value, className = "" }: { value: Availability; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-micro font-semibold",
        TAG_TONES[value],
        className,
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {value}
    </span>
  );
}
