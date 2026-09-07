import type { ReactNode } from "react";

/**
 * 운영 화면(admin · director · teacher)의 공통 표면.
 *
 * ★ 마케팅 화면과 같은 재료, 다른 밀도.
 *   색 · 선 · 곡률은 홈페이지와 같은 토큰을 쓴다. 두 화면이 다른 제품처럼
 *   보이면 안 되기 때문이다. 다만 여백과 글자 크기는 더 조인다 —
 *   운영 콘솔은 한 화면에 많이 보여야 하고, 그 밀도는 의도된 것이다.
 *
 * ★ 상태를 색으로만 말하지 않는다.
 *   모든 배지는 색과 함께 한국어 라벨을 반드시 갖는다.
 *   빨강 계열은 실제로 되돌릴 수 없는 일(취소 · 오류)에만 쓴다 —
 *   "확인이 필요하다"까지 빨강으로 칠하면 진짜 위험이 묻힌다.
 */

/** 화면 상단 제목 영역. 우측에 액션을 둘 수 있다. */
export function PageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string;
  description?: string;
  /** 날짜·범위처럼 제목 아래 한 줄로 붙는 보조 정보 */
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line-soft pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-[24px] font-bold tracking-[-0.02em] text-navy sm:text-[26px]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-[68ch] text-[14px] leading-relaxed text-navy/55">
            {description}
          </p>
        ) : null}
        {meta ? (
          <p className="text-[13px] tabular-nums text-navy/45">{meta}</p>
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
      className={`rounded-xl border border-line bg-white p-4 sm:p-5 ${className}`}
    >
      {title || actions ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title ? (
            <h2 className="text-[15px] font-bold text-navy">{title}</h2>
          ) : null}
          {actions}
        </div>
      ) : null}

      {description ? (
        <p className="mt-1 text-[12px] leading-relaxed text-navy/50">
          {description}
        </p>
      ) : null}

      <div className={title || description ? "mt-3" : ""}>{children}</div>
    </section>
  );
}

/**
 * 숫자 카드.
 *
 * ★ 숫자가 주인공이다.
 *   라벨과 각주는 물러나고 값만 크게 남는다. 운영자가 이 카드에서 찾는 것은
 *   설명이 아니라 숫자 하나다.
 *
 * ★ value 가 null 이면 "—" 를 보여 준다.
 *   조회 실패나 집계 불가를 0 으로 위장하지 않는다 — 0 은 "없다"는 사실 주장이다.
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
    <div className="flex min-h-[108px] flex-col justify-between rounded-xl border border-line bg-white p-4">
      <p className="break-keep text-[12px] font-semibold text-navy/50">
        {label}
      </p>

      <p className="mt-2 text-navy">
        <span className="text-[28px] font-bold tabular-nums leading-none tracking-[-0.02em]">
          {value === null ? "—" : value.toLocaleString("ko-KR")}
        </span>
        {value === null ? null : (
          <span className="ml-1 text-[13px] font-semibold text-navy/55">
            {unit}
          </span>
        )}
      </p>

      <p className="mt-2 break-keep text-[11px] leading-relaxed text-navy/45">
        {value === null ? "확인할 수 없습니다" : (note ?? "")}
      </p>
    </div>
  );
}

/**
 * 상태 배지.
 *
 * tone 은 색만 정하고, 의미는 언제나 children 의 한국어 텍스트가 전한다.
 *
 * ★ 빨강을 아껴 쓴다.
 *   cancelled 만 붉은 계열이고, "확인 필요"는 노란 계열(pending)이다.
 *   아직 하지 않은 것과 잘못된 것은 다르다.
 */
export type StatusTone =
  | "done"
  | "active"
  | "scheduled"
  | "pending"
  | "cancelled"
  | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  done: "border-soft-green/50 bg-soft-green/15 text-navy",
  active: "border-trust-blue/35 bg-trust-blue/10 text-navy",
  scheduled: "border-light-blue/60 bg-light-blue/15 text-navy",
  pending: "border-yellow/50 bg-pale-yellow/40 text-navy",
  cancelled: "border-soft-coral/60 bg-soft-coral/15 text-navy",
  neutral: "border-line-strong bg-white text-navy/55",
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
      className={`inline-block shrink-0 break-keep rounded-md border px-2 py-0.5 text-[11px] font-bold ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * 데이터가 없을 때.
 *
 * ★ 빈 상자 하나로 두지 않는다.
 *   왜 비어 있는지와 다음에 무엇을 할 수 있는지를 함께 둔다.
 *   다만 운영 화면이므로 장식은 하지 않는다 — 얇은 선 하나가 전부다.
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
    <div className="rounded-xl border border-dashed border-line-strong bg-white px-4 py-12 text-center">
      <p className="text-[14px] font-semibold text-navy/60">{text}</p>
      {hint ? (
        <p className="mx-auto mt-1.5 max-w-[44ch] text-[13px] leading-relaxed text-navy/45">
          {hint}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** 조회 실패. 사용자에게 내부 오류를 보여 주지 않는다. */
export function ErrorState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-line-strong bg-white px-4 py-12 text-center">
      <p className="text-[14px] leading-relaxed text-navy/60">{text}</p>
    </div>
  );
}
