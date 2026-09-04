import type { ReactNode } from "react";

/**
 * 공통 표면(surface) 요소.
 *
 * ★ 기존 화면을 뜯어고치지 않는다.
 *   이 파일은 **새로 만드는 화면**(서비스 오픈 준비 · 새 기관 도입)이
 *   같은 모양을 갖게 하려고 둔다. 이미 안정적으로 도는 수천 줄의 기존 화면을
 *   여기에 맞춰 일괄 교체하지 않는다 — 기능 안정성이 코드 정리보다 앞선다.
 *
 * ★ 디자인 언어: Warm Premium EdTech
 *   아이보리 배경 · 흰 카드 · 남색 텍스트 · 절제된 강조색 · 부드러운 테두리.
 *   과한 그라데이션과 애니메이션을 쓰지 않는다.
 *
 * ★ 상태를 색으로만 말하지 않는다.
 *   모든 배지는 색과 함께 한국어 라벨을 반드시 갖는다(색각 이상 접근성).
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[22px] font-bold text-navy">{title}</h1>
        {description ? (
          <p className="text-[14px] leading-relaxed text-navy/55">
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
      className={`rounded-xl border border-navy/10 bg-white p-4 sm:p-5 ${className}`}
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
    <div className="flex min-h-[104px] flex-col justify-between rounded-xl border border-navy/10 bg-white p-4">
      <p className="break-keep text-[12px] font-semibold text-navy/50">
        {label}
      </p>

      <p className="mt-2 text-navy">
        <span className="text-[24px] font-bold tabular-nums leading-none">
          {value === null ? "—" : value.toLocaleString("ko-KR")}
        </span>
        {value === null ? null : (
          <span className="ml-1 text-[13px] font-semibold text-navy/60">
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
 */
export type StatusTone = "done" | "pending" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  done: "border-soft-green/50 bg-soft-green/15 text-navy",
  pending: "border-yellow/50 bg-pale-yellow/40 text-navy",
  neutral: "border-navy/15 bg-white text-navy/55",
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

/** 데이터가 없을 때. 오류처럼 보이지 않게 한다. */
export function EmptyState({
  text,
  action,
}: {
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white px-4 py-10 text-center">
      <p className="text-[14px] leading-relaxed text-navy/50">{text}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** 조회 실패. 사용자에게 내부 오류를 보여 주지 않는다. */
export function ErrorState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-navy/15 bg-white px-4 py-10 text-center">
      <p className="text-[14px] leading-relaxed text-navy/60">{text}</p>
    </div>
  );
}
