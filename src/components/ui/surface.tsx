import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * 운영 화면(admin · director · teacher · sales)의 공통 표면.
 *
 * ★ 마케팅 화면과 같은 재료, 다른 밀도.
 *   색 · 선 · 곡률은 홈페이지와 같은 토큰을 쓴다. 두 화면이 다른 제품처럼
 *   보이면 안 되기 때문이다. 다만 여백과 글자 크기는 더 조인다.
 *
 * ★ 상태를 색으로만 말하지 않는다.
 *   모든 배지는 색과 함께 한국어 라벨을 반드시 갖고, 앞에 작은 점(모양)을 둔다.
 *   빨강 계열은 실제로 되돌릴 수 없는 일(취소 · 오류)에만 쓴다.
 */

/** 화면 상단 제목 영역. 우측에 액션을 둘 수 있다. */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: {
  /** 제목 위 작은 라벨 (현재 영역 이름 등) */
  eyebrow?: string;
  title: string;
  description?: string;
  /** 날짜·범위처럼 제목 아래 한 줄로 붙는 보조 정보 */
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line-soft pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? (
          <p className="eyebrow text-accent-strong">{eyebrow}</p>
        ) : null}
        <h1 className="text-headline font-bold text-navy sm:text-headline-lg">
          {title}
        </h1>
        {description ? (
          <p className="max-w-[68ch] text-body-sm text-ink-muted">
            {description}
          </p>
        ) : null}
        {meta ? (
          <p className="text-caption tabular-nums text-ink-muted">{meta}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/** 흰 카드 한 장. 제목과 설명은 선택이다. */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-line bg-white p-5 sm:p-6",
        className,
      )}
    >
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {title ? (
            <h2 className="text-title-sm font-bold text-navy">{title}</h2>
          ) : null}
          {actions}
        </div>
      ) : null}

      {description ? (
        <p className="mt-1 text-caption text-ink-muted">{description}</p>
      ) : null}

      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

/**
 * 숫자 카드.
 *
 * ★ 숫자가 주인공이다. 라벨과 각주는 물러나고 값만 크게 남는다.
 * ★ value 가 null 이면 "—" 를 보여 준다 — 조회 실패를 0 으로 위장하지 않는다.
 */
export function MetricCard({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: number | null;
  unit: string;
  note?: string;
}) {
  return (
    <div className="flex min-h-[112px] flex-col justify-between rounded-2xl border border-line bg-white p-5">
      <p className="break-keep text-caption font-semibold text-ink-muted">
        {label}
      </p>

      <p className="mt-2 text-navy">
        <span className="text-headline-lg font-bold tabular-nums leading-none">
          {value === null ? "—" : value.toLocaleString("ko-KR")}
        </span>
        {value === null ? null : (
          <span className="ml-1 text-caption font-semibold text-ink-muted">
            {unit}
          </span>
        )}
      </p>

      <p className="mt-2 break-keep text-micro text-ink-muted">
        {value === null ? "확인할 수 없습니다" : (note ?? "")}
      </p>
    </div>
  );
}

/**
 * 상태 배지.
 *
 * tone 은 색만 정하고, 의미는 언제나 children 의 한국어 텍스트가 전한다.
 *   done      완료 · 긍정  (green)
 *   active    진행 중      (navy)
 *   scheduled 예정         (sky)
 *   pending   확인 필요    (warning)
 *   cancelled 취소 · 오류  (danger)
 *   neutral   기타
 */
export type StatusTone =
  | "done"
  | "active"
  | "scheduled"
  | "pending"
  | "cancelled"
  | "neutral";

export const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  done: "border-success-border bg-success-soft text-success-text",
  active: "border-line-strong bg-primary-soft text-navy",
  scheduled: "border-info-border bg-info-soft text-info-text",
  pending: "border-warning-border bg-warning-soft text-warning-text",
  cancelled: "border-danger-border bg-danger-soft text-danger",
  neutral: "border-border-strong bg-white text-ink-muted",
};

export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: StatusTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 break-keep rounded-full border px-2.5 py-0.5 text-micro font-semibold",
        STATUS_TONE_CLASSES[tone],
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

/**
 * 데이터가 없을 때.
 *
 * ★ 왜 비어 있는지와 다음에 무엇을 할 수 있는지를 함께 둔다.
 *   운영 화면이므로 장식은 작은 아이콘 하나가 전부다.
 */
export function EmptyState({
  text,
  hint,
  action,
}: {
  text: string;
  /** 왜 비어 있는지 한 줄. 없으면 그리지 않는다. */
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-white/70 px-5 py-12 text-center">
      <span
        aria-hidden="true"
        className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft text-ink-muted"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </span>
      <p className="text-body-sm font-semibold text-ink">{text}</p>
      {hint ? (
        <p className="mx-auto mt-1.5 max-w-[44ch] text-caption text-ink-muted">
          {hint}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** 조회 실패. 사용자에게 내부 오류를 보여 주지 않는다. */
export function ErrorState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-danger-border bg-danger-soft/50 px-5 py-12 text-center">
      <span
        aria-hidden="true"
        className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-danger"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" />
        </svg>
      </span>
      <p className="text-body-sm leading-relaxed text-ink">{text}</p>
    </div>
  );
}

/** 불러오는 중 — 자리 표시. 화면 읽기 프로그램에는 한 번만 알린다. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={cx("block skeleton", className)} />;
}

export function LoadingPanel({
  label = "불러오는 중입니다",
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[112px] rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}
