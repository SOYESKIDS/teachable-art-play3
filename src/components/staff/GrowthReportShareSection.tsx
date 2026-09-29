"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeGrowthReportShareAction } from "@/lib/staff/growth-report-share-actions";
import {
  SHARE_DEFAULT_EXPIRY_DAYS,
  type GrowthReportShareMetadata,
} from "@/types/parent-share";

interface GrowthReportShareSectionProps {
  /** 서버가 읽어 온 가장 최근 공유. token은 들어 있지 않다(있을 수 없다). */
  share: GrowthReportShareMetadata | null;
}

/**
 * SERVICE-13 — 원장 학부모 공유 섹션 (이전 형식 리포트).
 *
 * ★ PHASE 10B (M5 앱 준비): 이전 형식 리포트의 공유 링크는 **새로 발급하지 않는다**.
 *   M5 는 legacy 공유 신규 발급(create_child_growth_report_share)을 회수하고,
 *   이미 발급된 링크의 열람 · 중지(revoke_child_growth_report_share)는 유지한다 (DEC-041).
 *   그래서 이 화면은 기존 링크의 상태 확인과 중지만 제공한다.
 *   학부모 공유는 아동별 공유(학부모 공유 화면)로 한다.
 *
 * ★ 교사는 이 컴포넌트를 렌더하지 않는다.
 *   원장 상세 화면에서만 import하고, Server Action도 requireDirector()로 시작하며,
 *   DB의 쓰기 Policy에도 교사 분기가 없다 — 세 겹이다.
 *
 * ★ 링크 원본은 표시할 수 없다 (DB에는 SHA-256만 있다).
 */
export function GrowthReportShareSection({ share }: GrowthReportShareSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const status = share?.status ?? "none";
  const hasActiveShare = status === "active";

  function handleRevoke() {
    if (isPending || !share) return;

    setMessage(null);

    startTransition(async () => {
      const result = await revokeGrowthReportShareAction({
        shareId: share.shareId,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-navy/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-bold text-navy">학부모 공유 (이전 형식)</h2>
        <StatusBadge status={status} />
      </div>

      <p className="mt-1 text-[12px] leading-relaxed text-navy/50">
        이전 형식 리포트는 새 공유 링크를 만들지 않습니다. 이미 전달한 링크는 기본{" "}
        {SHARE_DEFAULT_EXPIRY_DAYS}일 동안 열리며, 여기서 언제든 중지할 수 있습니다.
        새 기록의 학부모 공유는 학부모 공유 화면(아동별 링크)을 이용해 주세요.
      </p>

      {share ? (
        <dl className="mt-3 flex flex-col gap-1 text-[12px] text-navy/55">
          <MetaRow label="만든 날짜" value={formatDateTime(share.createdAt)} />
          <MetaRow label="유효기간" value={formatDateTime(share.expiresAt)} />
          {share.revokedAt ? (
            <MetaRow label="중지한 날짜" value={formatDateTime(share.revokedAt)} />
          ) : null}
        </dl>
      ) : null}

      {hasActiveShare ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-navy/8 pt-4">
          <button
            type="button"
            onClick={handleRevoke}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-navy/20 bg-white px-4 text-[14px] font-bold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "처리 중..." : "공유 중지"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p
          role="status"
          className="mt-3 rounded-lg border border-navy/15 bg-surface-soft px-3 py-2 text-[12px] leading-relaxed text-navy/70"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

function StatusBadge({ status }: { status: GrowthReportShareMetadata["status"] }) {
  const label =
    status === "active"
      ? "공유 중"
      : status === "expired"
        ? "만료됨"
        : status === "revoked"
          ? "공유 중지됨"
          : "공유 안 함";

  const className =
    status === "active"
      ? "border-soft-green/50 bg-soft-green/15 text-navy"
      : "border-navy/15 bg-white text-navy/55";

  return (
    <span
      className={`shrink-0 rounded-md border px-2.5 py-1 text-[12px] font-bold ${className}`}
    >
      {label}
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-navy/45">{label}</dt>
      <dd className="tabular-nums text-navy/65">{value}</dd>
    </div>
  );
}

/** timestamptz 문자열 앞 10자리만 쓴다. 시간대 변환을 하지 않는다. */
function formatDateTime(value: string): string {
  return value.slice(0, 10).replaceAll("-", ".");
}
