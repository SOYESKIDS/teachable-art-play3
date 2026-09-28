"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  appButtonSecondary,
  classModeButtonPrimary,
  classModeButtonSecondary,
  noticeDanger,
  noticeWarning,
} from "@/components/ui/app-button";
import { finishClassSessionAction, type ClassModeActionState } from "@/lib/staff/class-mode-actions";
import type { ClassModeStep } from "@/lib/staff/class-mode-queries";
import { QuickMemoPanel } from "./QuickMemoPanel";
import { useOnlineStatus } from "./useOnlineStatus";

interface DuringViewProps {
  sessionId: string;
  organizationId: string;
  steps: ClassModeStep[];
  fallbackObjective: string | null;
  memo: { body: string; updatedAt: string } | null;
  /** 새 기록 작성이 막힌 이유 (계약 없음 · 읽기 전용 · 범위 밖). 있으면 빠른 메모를 숨긴다 — 수업 마치기는 가능 */
  writeBlockedReason?: string | null;
}

const INITIAL: ClassModeActionState = { phase: "idle", message: null };

/**
 * DURING (DEC-098 · class-mode-flow §5).
 *
 * · 한 화면 한 단계 · 큰 글자 · 큰 버튼 · 하단 고정 action bar
 * · 재생 UI 없음 (DEC-029) — 자료 이름만 글자로 안내
 * · 마지막 단계에서 [수업 마치기] · 그 전에는 "지금 수업 마치기" + 확인 1회
 * · 오프라인이면 [수업 마치기] 를 하지 않는다
 * · 현재 단계는 이 화면 메모리에만 둔다 (비민감 navigation state)
 */
export function DuringView({ sessionId, organizationId, steps, fallbackObjective, memo, writeBlockedReason = null }: DuringViewProps) {
  const online = useOnlineStatus();
  const effectiveSteps: ClassModeStep[] =
    steps.length > 0
      ? steps
      : [{ sequenceNo: 1, title: "수업 진행", description: fallbackObjective, durationMinutes: null, materials: null }];

  const [index, setIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showMemo, setShowMemo] = useState(false);
  const [state, formAction, pending] = useActionState(finishClassSessionAction, INITIAL);

  const step = effectiveSteps[index];
  const isLast = index === effectiveSteps.length - 1;

  return (
    <div className="flex flex-1 flex-col gap-5">
      {!online ? (
        <p role="status" className={noticeWarning}>
          인터넷 연결이 끊겼습니다. 연결되면 다시 시도해 주세요.
        </p>
      ) : null}

      <section aria-labelledby="step-title" className="rounded-2xl border border-hairline bg-white p-6">
        <p className="text-[16px] font-semibold text-ink-muted">
          단계 {index + 1}/{effectiveSteps.length}
          {step.durationMinutes ? ` · 권장 ${step.durationMinutes}분` : ""}
        </p>
        <h2 id="step-title" className="mt-1 text-[28px] font-bold leading-snug">
          {step.title}
        </h2>
        {step.description ? (
          <p className="mt-4 whitespace-pre-line text-[19px] leading-relaxed">{step.description}</p>
        ) : null}
        {step.materials ? (
          <p className="mt-4 rounded-xl bg-brand-sky px-4 py-3 text-[17px] text-info-text">
            이 단계 자료: {step.materials}
          </p>
        ) : null}
      </section>

      {writeBlockedReason ? (
        <p role="status" className={noticeWarning}>
          {writeBlockedReason}
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setShowMemo((value) => !value)} className={classModeButtonSecondary}>
            {showMemo ? "빠른 메모 닫기" : "빠른 메모"}
          </button>
        </div>
      )}

      {showMemo && !writeBlockedReason ? (
        <QuickMemoPanel sessionId={sessionId} initialBody={memo?.body ?? ""} initialUpdatedAt={memo?.updatedAt ?? null} />
      ) : null}

      {state.phase === "error" && state.message ? (
        <p role="alert" className={noticeDanger}>
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-5 mt-auto border-t border-hairline bg-white/95 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className={classModeButtonSecondary}
          >
            ◀ 이전
          </button>

          <div className="flex items-center gap-3">
            {!isLast ? (
              <button type="button" onClick={() => setConfirmOpen(true)} className={`${appButtonSecondary} min-h-14`}>
                지금 수업 마치기
              </button>
            ) : null}

            {isLast ? (
              <form action={formAction}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="organizationId" value={organizationId} />
                <button type="submit" disabled={pending || !online} className={classModeButtonPrimary}>
                  {pending ? "마치는 중…" : "수업 마치기"}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((value) => Math.min(effectiveSteps.length - 1, value + 1))}
                className={classModeButtonPrimary}
              >
                다음 ▶
              </button>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="수업을 마칠까요?"
        description={`남은 단계 ${effectiveSteps.length - index - 1}개`}
        busy={pending}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="organizationId" value={organizationId} />
          <p className="text-[16px] leading-relaxed">마친 뒤에는 다시 진행 중으로 돌아갈 수 없습니다.</p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="submit" disabled={pending || !online} className={`${classModeButtonPrimary} sm:flex-1`}>
              {pending ? "마치는 중…" : "수업 마치기"}
            </button>
            <button type="button" onClick={() => setConfirmOpen(false)} className={`${classModeButtonSecondary} sm:flex-1`}>
              계속 진행
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
