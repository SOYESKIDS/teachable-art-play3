"use client";

import { useActionState, useEffect, useState } from "react";
import { formatLessonOrder } from "@/lib/admin/class-session";
import { transitionStaffSessionAction } from "@/lib/staff/session-actions";
import {
  STAFF_SESSION_FORM_INITIAL_STATE,
  type StaffSessionFormState,
} from "@/lib/staff/session-state";
import type { StaffSessionItem } from "@/types/staff-session";

interface SessionActionsProps {
  session: StaffSessionItem;
}

type ConfirmTarget = "completed" | "cancelled";

const CONFIRM_COPY: Record<
  ConfirmTarget,
  { title: string; button: string; warning: string }
> = {
  completed: {
    title: "수업 완료 처리",
    button: "완료 처리",
    warning:
      "완료 처리하면 다시 진행 중으로 되돌릴 수 없습니다. 같은 차시를 다시 하려면 관리자에게 새 수업 등록을 요청하면 됩니다.",
  },
  cancelled: {
    title: "수업 취소 처리",
    button: "취소 처리",
    warning:
      "취소한 수업은 다시 진행할 수 없습니다. 기록은 이력에 그대로 남습니다.",
  },
};

/**
 * 수업 카드의 상태 변경 버튼.
 *
 * 교사가 수업 직전·직후에 현장에서 누르는 버튼이라 두 단계로 나눴다.
 *   수업 시작  → 되돌릴 여지가 있는 전이라(진행 중에서 완료/취소 모두 가능) 바로 제출한다.
 *   완료 / 취소 → 되돌릴 수 없는 종착 상태라 확인 모달을 한 번 거친다.
 *
 * 제출 중에는 모든 버튼을 disabled로 만들어 중복 클릭을 막는다.
 * 오류가 나면 모달을 닫지 않고 문구를 보여준다 — 무엇을 하려 했는지 잃지 않게 한다.
 */
export function SessionActions({ session }: SessionActionsProps) {
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [isMessageHidden, setIsMessageHidden] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (prevState: StaffSessionFormState, formData: FormData) => {
      setIsMessageHidden(false);

      const result = await transitionStaffSessionAction(prevState, formData);
      if (result.phase === "success") setConfirmTarget(null);
      return result;
    },
    STAFF_SESSION_FORM_INITIAL_STATE,
  );

  useEffect(() => {
    if (confirmTarget === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmTarget(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmTarget]);

  function openConfirm(target: ConfirmTarget) {
    setConfirmTarget(target);
    setIsMessageHidden(true);
  }

  const canStart = session.status === "scheduled" && session.parentsActive;
  const visibleMessage = isMessageHidden ? null : state.message;
  const copy = confirmTarget ? CONFIRM_COPY[confirmTarget] : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canStart ? (
          <form action={formAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="status" value="in_progress" />
            <button
              type="submit"
              disabled={isPending}
              className="h-11 rounded-lg bg-navy px-5 text-[14px] font-bold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "시작 중…" : "수업 시작"}
            </button>
          </form>
        ) : null}

        <button
          type="button"
          onClick={() => openConfirm("completed")}
          disabled={isPending}
          className="h-11 rounded-lg border border-navy/25 bg-white px-4 text-[14px] font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          수업 완료
        </button>

        <button
          type="button"
          onClick={() => openConfirm("cancelled")}
          disabled={isPending}
          className="h-11 rounded-lg border border-navy/15 bg-white px-4 text-[14px] font-medium text-navy/60 transition-colors hover:border-navy/30 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
        >
          수업 취소
        </button>
      </div>

      {/* 시작 버튼이 없는 이유를 알려 준다. 버튼만 사라지면 고장으로 오해한다. */}
      {session.status === "scheduled" && !session.parentsActive ? (
        <p className="mt-2 text-[12px] leading-relaxed text-navy/50">
          반 보관 또는 프로그램 배정 종료로 더 이상 시작할 수 없는 수업입니다.
          완료 또는 취소로 정리해주세요.
        </p>
      ) : null}

      {/* 시작 버튼 제출 오류는 모달 밖에서도 보여야 한다 */}
      {visibleMessage && confirmTarget === null ? (
        <p
          role="alert"
          className={`mt-2 rounded-lg border px-3 py-2 text-[13px] ${
            state.phase === "error"
              ? "border-soft-coral/50 bg-soft-coral/10 text-navy"
              : "border-soft-green/50 bg-soft-green/15 text-navy"
          }`}
        >
          {visibleMessage}
        </p>
      ) : null}

      {confirmTarget && copy ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setConfirmTarget(null)}
            className="absolute inset-0 h-full w-full cursor-default bg-navy/40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-confirm-title"
            className="relative max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="session-confirm-title"
                  className="text-[17px] font-bold text-navy"
                >
                  {copy.title}
                </h2>
                <p className="mt-0.5 break-words text-[12px] text-navy/50">
                  {session.className ?? "반 정보 없음"} ·{" "}
                  {formatLessonOrder(session.weekNo, session.sessionNo)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                aria-label={`${copy.title} 닫기`}
                className="shrink-0 rounded-lg border border-navy/15 px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
              >
                닫기
              </button>
            </header>

            <form action={formAction} className="flex flex-col gap-4 px-5 py-5">
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="status" value={confirmTarget} />

              <p className="break-words text-[14px] leading-relaxed text-navy">
                {session.lessonTitle ?? "차시 정보 없음"}
              </p>

              <p className="rounded-lg border border-yellow/50 bg-yellow-soft px-3 py-2 text-[13px] leading-relaxed text-navy">
                {copy.warning}
              </p>

              {visibleMessage ? (
                <p
                  role="alert"
                  className={`rounded-lg border px-3 py-2 text-[13px] ${
                    state.phase === "error"
                      ? "border-soft-coral/50 bg-soft-coral/10 text-navy"
                      : "border-soft-green/50 bg-soft-green/15 text-navy"
                  }`}
                >
                  {visibleMessage}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-11 flex-1 rounded-lg bg-navy text-[14px] font-bold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "처리 중…" : copy.button}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmTarget(null)}
                  disabled={isPending}
                  className="h-11 rounded-lg border border-navy/20 px-4 text-[14px] font-semibold text-navy transition-colors hover:bg-navy/5 disabled:opacity-60 sm:flex-1"
                >
                  돌아가기
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
