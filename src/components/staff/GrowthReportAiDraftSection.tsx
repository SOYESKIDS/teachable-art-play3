"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  applyGrowthReportAiDraftAction,
  generateGrowthReportAiDraftAction,
} from "@/lib/staff/growth-report-ai-actions";
import type { GrowthReportAiDraft } from "@/types/staff-growth-report-ai";

interface GrowthReportAiDraftSectionProps {
  reportId: string;
  /** 리포트의 현재 동시성 토큰. 적용 시 그대로 넘긴다. */
  reportUpdatedAt: string;
  /** 근거 관찰기록 수. 0이면 초안을 만들 수 없다. */
  sourceCount: number;
  /** 환경변수가 설정되어 있는가 (서버가 판정해 내려준다) */
  aiEnabled: boolean;
  draft: GrowthReportAiDraft | null;
}

/**
 * SERVICE-11B — 성장 리포트 AI 초안 (교사 전용).
 *
 * ★ AI는 리포트를 완성하지 않는다.
 *   이 컴포넌트가 할 수 있는 최대치는 리포트 본문 세 칸에 초안을 넣는 것이고,
 *   확정은 아래 편집기의 "작성완료" 버튼이 한다. 두 단계 모두 사람이 누른다.
 *
 * ★ 완료된 리포트에는 이 영역이 아예 렌더되지 않는다(부모 페이지가 판단).
 *   눌러도 안 되는 버튼을 남기지 않는다.
 *
 * ★ 내부 지표를 화면에 내보내지 않는다.
 *   provider · model · prompt version · source revision · 요청 id 를 표시하지 않는다.
 *   교사에게 필요한 것은 "이게 AI 초안이다"와 "다시 만들어야 하는가"뿐이다.
 */
export function GrowthReportAiDraftSection({
  reportId,
  reportUpdatedAt,
  sourceCount,
  aiEnabled,
  draft,
}: GrowthReportAiDraftSectionProps) {
  const router = useRouter();

  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const hasSource = sourceCount > 0;
  const stale = draft?.isSourceStale ?? false;

  async function handleGenerate() {
    if (isPending) return;

    setIsPending(true);
    setMessage(null);
    setIsError(false);

    try {
      const result = await generateGrowthReportAiDraftAction({ reportId });

      if (!result.ok) {
        setIsError(true);
        setMessage(result.message);
        return;
      }

      setIsError(false);
      setMessage(
        "AI 초안을 만들었습니다. 내용을 확인한 뒤 리포트에 적용해주세요.",
      );
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function handleApply() {
    if (isPending || !draft || stale) return;

    setIsPending(true);
    setMessage(null);
    setIsError(false);

    try {
      const result = await applyGrowthReportAiDraftAction({
        reportId,
        // ★ 서버가 준 문자열 그대로. 가공하면 영구 stale이 된다.
        expectedUpdatedAt: reportUpdatedAt,
      });

      if (!result.ok) {
        setIsError(true);
        setMessage(result.message);
        return;
      }

      setIsError(false);
      setMessage(
        "AI 초안을 리포트에 적용했습니다. 내용을 확인하고 필요하면 수정한 뒤 작성완료해주세요.",
      );
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="mt-6 scroll-mt-28 rounded-xl border border-navy/10 bg-white/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold text-navy">
          AI 성장 리포트 초안
        </h2>

        {draft ? (
          <span className="text-[11px] text-navy/45">
            {stale
              ? "다시 만들기 필요"
              : draft.appliedAt
                ? "리포트에 적용함"
                : "검토 전"}
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-[12px] leading-relaxed text-navy/50">
        근거 관찰기록을 바탕으로 세 칸의 초안을 만듭니다. AI 초안은 보조
        자료이며, 최종 문장과 작성완료는 교사가 결정합니다.
      </p>

      {/* 근거가 없으면 만들 수 없다 */}
      {!hasSource ? (
        <p className="mt-3 text-[13px] leading-relaxed text-navy/45">
          근거 관찰기록이 없어 AI 초안을 만들 수 없습니다. 먼저 근거를
          모아주세요.
        </p>
      ) : null}

      {/* 환경변수 미설정 — 화면은 죽지 않고 안내만 한다 */}
      {hasSource && !aiEnabled ? (
        <p className="mt-3 text-[13px] leading-relaxed text-navy/45">
          AI 기능 설정이 필요합니다. 기관 관리자에게 문의해주세요.
        </p>
      ) : null}

      {/* 근거가 바뀌어 stale */}
      {draft && stale ? (
        <p className="mt-3 rounded-lg border border-yellow/50 bg-yellow-soft px-3 py-2.5 text-[13px] leading-relaxed text-navy">
          리포트 근거가 변경되었습니다. AI 초안을 다시 생성한 뒤 사용해주세요.
        </p>
      ) : null}

      {/* 생성된 초안 */}
      {draft ? (
        <div className="mt-3">
          {!stale ? (
            <p className="mb-2 text-[12px] leading-relaxed text-navy/55">
              AI가 정리한 초안입니다. 내용을 확인한 뒤 리포트에 적용해주세요.
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            <DraftBlock label="성장 변화" value={draft.growthChanges} />
            <DraftBlock
              label="관찰 요약"
              value={draft.observationSummary}
            />
            <DraftBlock label="다음 지원 방향" value={draft.nextSupport} />
          </div>
        </div>
      ) : hasSource && aiEnabled ? (
        <p className="mt-3 text-[13px] leading-relaxed text-navy/45">
          아직 AI 초안이 없습니다.
        </p>
      ) : null}

      {message ? (
        <p
          role={isError ? "alert" : "status"}
          aria-live="polite"
          className={`mt-3 rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed ${
            isError
              ? "border-soft-coral/50 bg-soft-coral/10 text-navy"
              : "border-soft-green/50 bg-soft-green/15 text-navy"
          }`}
        >
          {message}
        </p>
      ) : null}

      {hasSource && aiEnabled ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="min-h-12 rounded-lg border border-navy/20 bg-white px-5 text-[14px] font-bold text-navy transition-colors hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isPending
              ? "처리 중..."
              : draft
                ? "AI 다시 만들기"
                : "AI 초안 만들기"}
          </button>

          {draft ? (
            <button
              type="button"
              onClick={handleApply}
              disabled={isPending || stale}
              title={
                stale
                  ? "리포트 근거가 변경되어 적용할 수 없습니다. 다시 만들어주세요."
                  : undefined
              }
              className="min-h-12 rounded-lg bg-navy px-5 text-[14px] font-bold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isPending ? "처리 중..." : "초안 적용"}
            </button>
          ) : null}
        </div>
      ) : null}

      {draft && !stale ? (
        <p className="mt-2 text-[11px] leading-relaxed text-navy/45">
          적용하면 위 내용이 리포트 본문에 들어갑니다. 적용 후에도 자유롭게
          수정할 수 있고, 작성완료를 눌러야 확정됩니다.
        </p>
      ) : null}
    </section>
  );
}

function DraftBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold text-navy/55">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-navy/10 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-navy">
        {value}
      </p>
    </div>
  );
}
