import Link from "next/link";
import type { ServiceMode } from "@/lib/entitlement/labels";

/**
 * 상태 화면 · 배너 (DEC-106 · DEC-111 · navigation-screen-system §5).
 *
 * SY-01 은 app/not-found (존재 여부 무구분).
 * SY-02 (상품 미포함 · 기간 외 · 준비 안 됨)은 404 가 아니다.
 * 교사에게는 판매 CTA 를 보여 주지 않는다.
 */

type Audience = "teacher" | "director";

export function NotEntitledState({
  audience,
  title = "현재 이용 상품에 포함되지 않은 기능입니다.",
  backHref,
  backLabel = "돌아가기",
}: {
  audience: Audience;
  title?: string;
  backHref: string;
  backLabel?: string;
}) {
  return (
    <section
      aria-labelledby="not-entitled-title"
      className="rounded-2xl border border-hairline bg-white px-6 py-12 text-center"
    >
      <h1 id="not-entitled-title" className="text-[20px] font-bold text-ink">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-[460px] text-[15px] leading-relaxed text-ink-muted">
        {audience === "teacher"
          ? "원장님께 문의해 주세요."
          : "이용 상품 · 포함 기능 관련 문의는 본사 담당자에게 연락해 주세요."}
      </p>
      <Link
        href={backHref}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-control-border bg-white px-4 text-[14px] font-semibold text-ink hover:bg-brand-ivory"
      >
        {backLabel}
      </Link>
    </section>
  );
}

/** 읽기 전용 · 기간 외 · 계약 없음 안내 (사유 · CO-1 기간 비노출) */
export function ServiceModeBanner({ mode, audience }: { mode: ServiceMode; audience: Audience }) {
  if (mode === "active") return null;

  const message =
    mode === "before_start"
      ? "이용 기간이 아닙니다. 이용 시작일부터 수업과 기록을 진행할 수 있습니다."
      : mode === "no_contract"
        ? "현재 이용 계약이 확인되지 않아 새 기록을 작성할 수 없습니다."
        : "현재 읽기 전용 상태입니다. 기존 기록은 확인할 수 있지만 새 기록은 작성할 수 없습니다.";

  return (
    <div role="status" className="rounded-lg border border-warning-soft bg-warning-soft px-4 py-3 text-[14px] leading-relaxed text-warning-text">
      {message} {audience === "teacher" ? "원장님께 문의해 주세요." : "본사 담당자에게 문의해 주세요."}
    </div>
  );
}

export function ContentNotReadyState({ backHref }: { backHref: string }) {
  return (
    <section className="rounded-2xl border border-hairline bg-white px-6 py-12 text-center">
      <h1 className="text-[20px] font-bold text-ink">수업 내용이 아직 준비되지 않았습니다.</h1>
      <p className="mt-2 text-[15px] text-ink-muted">원장님께 문의해 주세요.</p>
      <Link
        href={backHref}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-control-border bg-white px-4 text-[14px] font-semibold text-ink hover:bg-brand-ivory"
      >
        오늘의 수업으로
      </Link>
    </section>
  );
}
