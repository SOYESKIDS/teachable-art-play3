"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  generateObservationAiDraftAction,
  reviewObservationAiDraftAction,
} from "@/lib/staff/observation-ai-actions";
import {
  MAX_AI_DRAFT_TEXT,
  type ObservationAiDraft,
} from "@/types/staff-observation-ai";
import type { ObservationRecordStatus } from "@/types/staff-observation";

type StaffRole = "director" | "teacher";

interface ObservationAiDraftSectionProps {
  sessionId: string;
  childId: string;
  role: StaffRole;
  /** 환경변수가 설정되어 있는가 (서버가 판정해 내려준다) */
  aiEnabled: boolean;
  /** 교사 + 취소되지 않은 수업 */
  canWrite: boolean;
  /** 반이 운영 중인가 — 신규 생성·재생성 조건 */
  classActive: boolean;
  hasObservation: boolean;
  recordStatus: ObservationRecordStatus | null;
  draft: ObservationAiDraft | null;
}

/**
 * SERVICE-10A — 원아 한 명의 AI 기록정리.
 *
 * ★ AI 초안은 공식 기록이 아니다.
 *   "AI 초안"이라는 표시를 절대 숨기지 않고, 교사가 검토 완료해야만
 *   확정 기록이 된다. 원장 화면에는 확정된 문장만 보인다.
 *
 * ★ 이 화면은 아동을 평가하지 않는다.
 *   점수·등급·발달단계·위험도 표시가 없고, AI에게도 그런 문장을 만들지 않도록
 *   서버 지침이 걸려 있다.
 *
 * ★ 자동 호출이 없다.
 *   렌더 시점에 provider를 부르지 않는다. 교사가 버튼을 눌러야만 생성된다.
 *
 * 교사 화면 상태
 *   A 관찰기록 미완료 → 사용 불가 안내
 *   B AI 미생성       → [AI 기록 정리하기]
 *   C generated       → AI 초안 표시 + 편집 textarea + [검토 완료]
 *   D accepted        → 검토 완료 문장 표시 + [다시 수정]
 *   E source stale    → 경고 + [AI 다시 정리하기] (검토 완료 불가)
 */
export function ObservationAiDraftSection({
  sessionId,
  childId,
  role,
  aiEnabled,
  canWrite,
  classActive,
  hasObservation,
  recordStatus,
  draft,
}: ObservationAiDraftSectionProps) {
  const router = useRouter();

  const [text, setText] = useState(
    () => draft?.reviewedText ?? draft?.generatedText ?? "",
  );
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, setIsPending] = useState(false);

  /**
   * 서버가 새 값을 내려주면 편집 중이 아닐 때만 맞춘다.
   * (렌더 중 setState는 React가 권장하는 prop 동기화 패턴 — 이 프로젝트의 기존 방식)
   */
  const serverSignature = JSON.stringify([
    draft?.id ?? null,
    draft?.updatedAt ?? null,
    draft?.reviewStatus ?? null,
    draft?.reviewedText ?? null,
    draft?.generatedText ?? null,
  ]);

  const [syncedSignature, setSyncedSignature] = useState(serverSignature);

  if (syncedSignature !== serverSignature && !editing && !isPending) {
    setSyncedSignature(serverSignature);
    setText(draft?.reviewedText ?? draft?.generatedText ?? "");
  }

  const fieldId = `observation-ai-${childId}`;

  // ── 원장: 검토 완료된 문장만 보여준다 ─────────────────────────────
  if (role === "director") {
    return (
      <section className="mt-4 border-t border-navy/8 pt-4">
        <h3 className="text-[11px] font-bold text-navy/55">
          기록 정리 (교사 검토 완료)
        </h3>

        {/*
          ★ 원장에게 generated 상태의 초안 원문을 보여주지 않는다.
            교사가 아직 읽지 않은 문장을 공식 관찰기록으로 오해하면 안 된다.
        */}
        {draft &&
        draft.reviewStatus === "accepted" &&
        draft.reviewedText &&
        !draft.isSourceStale ? (
          <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-navy/10 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-navy">
            {draft.reviewedText}
          </p>
        ) : (
          <p className="mt-2 text-[13px] leading-relaxed text-navy/45">
            {draft ? "교사 검토 대기 중입니다." : "정리된 기록이 없습니다."}
          </p>
        )}
      </section>
    );
  }

  // ── 교사 ────────────────────────────────────────────────────────
  const observationComplete =
    hasObservation && recordStatus === "complete";

  const canGenerate =
    canWrite && classActive && observationComplete && aiEnabled;

  const canReview =
    canWrite && observationComplete && draft !== null && !draft.isSourceStale;

  const charCount = [...text].length;

  async function handleGenerate() {
    if (isPending) return;

    setIsPending(true);
    setMessage(null);
    setIsError(false);

    try {
      const result = await generateObservationAiDraftAction({
        sessionId,
        childId,
      });

      if (!result.ok) {
        setIsError(true);
        setMessage(result.message);
        return;
      }

      // 새 초안이 오면 편집 상태를 풀어 서버 값으로 다시 맞춘다.
      setEditing(false);
      setIsError(false);
      setMessage(
        "AI 초안을 만들었습니다. 내용을 확인한 뒤 검토 완료해주세요.",
      );
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function handleReview() {
    if (isPending || !draft) return;

    setIsPending(true);
    setMessage(null);
    setIsError(false);

    try {
      const result = await reviewObservationAiDraftAction({
        sessionId,
        childId,
        reviewedText: text,
        // ★ 서버가 준 문자열 그대로. 가공하면 영구 stale이 된다.
        expectedUpdatedAt: draft.updatedAt,
      });

      if (!result.ok) {
        setIsError(true);
        setMessage(result.message);
        return;
      }

      setEditing(false);
      setIsError(false);
      setMessage("검토 완료로 저장했습니다.");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  const notice = (
    <>
      {message ? (
        <p
          role={isError ? "alert" : "status"}
          aria-live="polite"
          className={`mt-2 rounded-lg border px-3 py-2 text-[13px] leading-relaxed ${
            isError
              ? "border-soft-coral/50 bg-soft-coral/10 text-navy"
              : "border-soft-green/50 bg-soft-green/15 text-navy"
          }`}
        >
          {message}
        </p>
      ) : null}
    </>
  );

  return (
    <section className="mt-4 border-t border-navy/8 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-bold text-navy/55">AI 기록정리</h3>

        {draft ? (
          <span className="text-[11px] text-navy/45">
            {draft.isSourceStale
              ? "다시 정리 필요"
              : draft.reviewStatus === "accepted"
                ? "교사 검토 완료"
                : "AI 초안 · 검토 전"}
          </span>
        ) : null}
      </div>

      {/* A. 관찰기록이 없거나 아직 작성 중 */}
      {!observationComplete ? (
        <p className="mt-2 text-[13px] leading-relaxed text-navy/45">
          관찰기록을 작성 완료한 뒤 AI 정리를 사용할 수 있습니다.
        </p>
      ) : (
        <>
          {/* E. 원본이 바뀌어 stale */}
          {draft?.isSourceStale ? (
            <p className="mt-2 rounded-lg border border-yellow/50 bg-yellow-soft px-3 py-2.5 text-[13px] leading-relaxed text-navy">
              원본 관찰기록이 변경되었습니다. AI 정리를 다시 생성한 뒤
              검토해주세요.
            </p>
          ) : null}

          {/* B. 아직 생성하지 않음 */}
          {!draft ? (
            <p className="mt-2 text-[13px] leading-relaxed text-navy/45">
              아직 AI 정리가 없습니다. 교사가 작성한 관찰기록을 바탕으로
              초안을 만들 수 있습니다.
            </p>
          ) : null}

          {/* C·D. 초안 또는 확정 문장 */}
          {draft ? (
            <div className="mt-2">
              {/*
                ★ "AI 초안"이라는 표시를 숨기지 않는다.
                  교사가 무엇을 읽고 있는지 항상 분명해야 한다.
              */}
              {draft.reviewStatus === "accepted" && !editing ? (
                <>
                  <p className="whitespace-pre-wrap break-words rounded-lg border border-soft-green/40 bg-soft-green/10 px-3 py-2.5 text-[13px] leading-relaxed text-navy">
                    {draft.reviewedText}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-navy/45">
                    교사가 확인한 최종 기록입니다. AI 초안 원문도 함께 보관됩니다.
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-2 text-[12px] leading-relaxed text-navy/55">
                    AI가 정리한 초안입니다. 반드시 내용을 확인한 뒤 검토
                    완료해주세요.
                  </p>

                  <div className="flex items-baseline justify-between gap-2">
                    <label
                      htmlFor={fieldId}
                      className="text-[11px] font-bold text-navy/55"
                    >
                      정리 내용
                    </label>
                    <span
                      className="text-[11px] tabular-nums text-navy/45"
                      aria-hidden="true"
                    >
                      {charCount.toLocaleString("ko-KR")} /{" "}
                      {MAX_AI_DRAFT_TEXT.toLocaleString("ko-KR")}
                    </span>
                  </div>

                  <textarea
                    id={fieldId}
                    value={text}
                    onChange={(event) => {
                      const value = event.target.value;
                      setEditing(true);
                      setText(value);
                    }}
                    readOnly={isPending}
                    maxLength={MAX_AI_DRAFT_TEXT}
                    rows={5}
                    className="mt-1.5 min-h-32 w-full scroll-mt-28 rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-[14px] leading-relaxed text-navy read-only:cursor-not-allowed read-only:opacity-60 focus:border-trust-blue/60 focus:outline-none"
                  />
                </>
              )}
            </div>
          ) : null}

          {notice}

          <div className="mt-2 flex flex-wrap gap-2">
            {canGenerate ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
                className="min-h-12 flex-1 rounded-lg border border-navy/20 bg-white px-4 text-[14px] font-bold text-navy transition-colors hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
              >
                {isPending
                  ? "정리하는 중..."
                  : draft
                    ? "AI 다시 정리하기"
                    : "AI 기록 정리하기"}
              </button>
            ) : null}

            {draft && draft.reviewStatus === "accepted" && !editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={isPending || !canReview}
                className="min-h-12 flex-1 rounded-lg border border-navy/20 bg-white px-4 text-[14px] font-bold text-navy transition-colors hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
              >
                다시 수정
              </button>
            ) : null}

            {draft &&
            (draft.reviewStatus === "generated" || editing) ? (
              <button
                type="button"
                onClick={handleReview}
                disabled={
                  isPending || !canReview || text.trim() === ""
                }
                title={
                  draft.isSourceStale
                    ? "원본 관찰기록이 변경되어 검토 완료할 수 없습니다."
                    : undefined
                }
                className="min-h-12 flex-1 rounded-lg bg-navy px-4 text-[14px] font-bold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
              >
                {isPending ? "저장 중..." : "검토 완료"}
              </button>
            ) : null}
          </div>

          {/* 생성이 막힌 이유를 조용히 감추지 않는다 */}
          {!canGenerate && canWrite ? (
            <p className="mt-2 text-[12px] leading-relaxed text-navy/45">
              {!aiEnabled
                ? "AI 기능 설정이 필요합니다. 기관 관리자에게 문의해주세요."
                : !classActive
                  ? "보관된 반에는 새 AI 정리를 만들 수 없습니다."
                  : null}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
