"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createGrowthReportShareAction,
  revokeGrowthReportShareAction,
} from "@/lib/staff/growth-report-share-actions";
import {
  SHARE_DEFAULT_EXPIRY_DAYS,
  SHARE_PATH_PREFIX,
  type GrowthReportShareMetadata,
} from "@/types/parent-share";

interface GrowthReportShareSectionProps {
  reportId: string;
  /** 서버가 읽어 온 가장 최근 공유. token은 들어 있지 않다(있을 수 없다). */
  share: GrowthReportShareMetadata | null;
}

/**
 * SERVICE-13 — 원장 학부모 공유 섹션.
 *
 * ★ 링크 원본은 방금 만든 것만 보여 준다.
 *   DB에는 SHA-256만 있어 기존 링크를 복원할 방법이 없다. 그래서
 *   새로고침 후에는 "다시 표시할 수 없다"고 정직하게 말하고,
 *   [공유 중지] / [새 링크 발급]만 제공한다.
 *   이것은 불편이 아니라 설계다 — 링크를 복원할 수 있으면 DB 유출이
 *   곧 모든 리포트의 유출이 된다.
 *
 * ★ 교사는 이 컴포넌트를 렌더하지 않는다.
 *   원장 상세 화면에서만 import하고, Server Action도 requireDirector()로 시작하며,
 *   DB의 쓰기 Policy에도 교사 분기가 없다 — 세 겹이다.
 *
 * ★ 링크를 화면 텍스트로 남기지 않는다.
 *   readonly input에 담아 선택/복사만 가능하게 하고, 복사 후에도
 *   페이지를 벗어나면 사라진다.
 */
export function GrowthReportShareSection({
  reportId,
  share,
}: GrowthReportShareSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 방금 만든 링크. 서버에서 다시 받아 올 수 없는 값이라 여기서만 산다.
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const [issuedExpiresAt, setIssuedExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const status = share?.status ?? "none";
  const hasActiveShare = status === "active";

  function handleCreate() {
    if (isPending) return;

    setMessage(null);
    setCopied(false);

    startTransition(async () => {
      const result = await createGrowthReportShareAction({ reportId });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      // 주소는 이 브라우저가 보고 있는 origin을 그대로 쓴다.
      // 비밀값은 #뒤에 붙어 서버로 전송되지 않는다.
      setIssuedUrl(
        `${window.location.origin}${SHARE_PATH_PREFIX}/${result.shareId}#${result.token}`,
      );
      setIssuedExpiresAt(result.expiresAt);
      router.refresh();
    });
  }

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

      // 중지했으면 방금 만든 링크도 더 이상 유효하지 않다. 화면에서 지운다.
      setIssuedUrl(null);
      setIssuedExpiresAt(null);
      setCopied(false);
      router.refresh();
    });
  }

  async function handleCopy() {
    if (!issuedUrl) return;

    try {
      await navigator.clipboard.writeText(issuedUrl);
      setCopied(true);
    } catch {
      // 클립보드 권한이 없는 브라우저도 있다. 그때는 직접 선택해 복사하면 된다.
      setMessage("자동 복사가 막혀 있습니다. 링크를 길게 눌러 복사해주세요.");
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-navy/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-bold text-navy">학부모 공유</h2>
        <StatusBadge status={status} />
      </div>

      <p className="mt-1 text-[12px] leading-relaxed text-navy/50">
        작성 완료된 리포트를 보호자에게 링크로 전달합니다. 링크는 기본{" "}
        {SHARE_DEFAULT_EXPIRY_DAYS}일 동안 유효하며, 언제든 중지할 수 있습니다.
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

      {/* 방금 만든 링크 — 이 화면을 벗어나면 다시 볼 수 없다 */}
      {issuedUrl ? (
        <div className="mt-4 rounded-lg border border-trust-blue/30 bg-trust-blue/5 p-3">
          <p className="text-[12px] font-bold text-navy">
            새 링크가 만들어졌습니다. 지금 복사해 보호자에게 전달해주세요.
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-navy/55">
            보안을 위해 이 주소는 지금만 확인할 수 있습니다. 화면을 벗어나면
            다시 표시할 수 없습니다.
            {issuedExpiresAt
              ? ` (유효기간 ${formatDateTime(issuedExpiresAt)})`
              : ""}
          </p>

          <input
            type="text"
            readOnly
            value={issuedUrl}
            aria-label="학부모 공유 링크"
            onFocus={(event) => event.currentTarget.select()}
            className="mt-2 w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-[12px] text-navy"
          />

          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-trust-blue/40 bg-white px-4 text-[13px] font-bold text-trust-blue transition-colors hover:bg-trust-blue/10"
          >
            {copied ? "복사했습니다" : "링크 복사"}
          </button>
        </div>
      ) : null}

      {/* 활성 공유가 있는데 링크를 방금 만든 게 아닐 때 */}
      {hasActiveShare && !issuedUrl ? (
        <p className="mt-4 rounded-lg border border-navy/10 bg-surface-soft px-3 py-2.5 text-[12px] leading-relaxed text-navy/60">
          현재 활성화된 학부모 공유 링크가 있습니다. 보안을 위해 기존 링크
          주소는 다시 표시할 수 없습니다. 링크를 분실했다면 새 링크를
          발급해주세요.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-navy/8 pt-4">
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-trust-blue/30 bg-white px-4 text-[14px] font-bold text-trust-blue transition-colors hover:border-trust-blue/50 hover:bg-trust-blue/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "처리 중..."
            : hasActiveShare
              ? "새 링크 발급"
              : "학부모 공유 링크 만들기"}
        </button>

        {hasActiveShare ? (
          <button
            type="button"
            onClick={handleRevoke}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-navy/20 bg-white px-4 text-[14px] font-bold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            공유 중지
          </button>
        ) : null}
      </div>

      {hasActiveShare ? (
        <p className="mt-2 text-[11px] leading-relaxed text-navy/45">
          새 링크를 발급하면 기존 링크는 즉시 사용할 수 없게 됩니다.
        </p>
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
