"use client";

import { useActionState, useEffect, useState } from "react";
import {
  formatLessonOrder,
  formatSessionDate,
} from "@/lib/admin/class-session";
import type { ClassSessionItem } from "@/types/class-session";
import { rescheduleClassSessionAction } from "./class-session-actions";
import {
  CLASS_SESSION_FORM_INITIAL_STATE,
  type ClassSessionFormState,
} from "./class-session-state";

interface ClassSessionRescheduleDialogProps {
  organizationId: string;
  assignmentId: string;
  session: ClassSessionItem;
}

const inputClasses =
  "h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] text-navy transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

/**
 * 예정일 변경 Modal.
 *
 * 예정(scheduled) 상태이고 부모가 모두 유효한 수업에만 노출한다.
 * 수업이 시작된 뒤에는 "언제 하기로 했었는가"를 보존해야 해서 변경할 수 없다.
 *
 * 상태 변경과 분리한 이유는 ClassSessionManageDialog 주석에 적어 두었다.
 * 입력은 controlled — 서버가 오류를 돌려줘도 입력한 날짜가 유지되어야 한다.
 */
export function ClassSessionRescheduleDialog({
  organizationId,
  assignmentId,
  session,
}: ClassSessionRescheduleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(
    session.scheduled_date ?? "",
  );
  const [isMessageHidden, setIsMessageHidden] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (prevState: ClassSessionFormState, formData: FormData) => {
      setIsMessageHidden(false);

      const result = await rescheduleClassSessionAction(prevState, formData);
      if (result.phase === "success") setIsOpen(false);
      return result;
    },
    CLASS_SESSION_FORM_INITIAL_STATE,
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function openDialog() {
    setScheduledDate(session.scheduled_date ?? "");
    setIsMessageHidden(true);
    setIsOpen(true);
  }

  const visibleMessage = isMessageHidden ? null : state.message;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="text-[13px] font-semibold text-navy/60 transition-opacity hover:opacity-70"
      >
        일정 변경
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-navy/40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reschedule-session-title"
            className="relative max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="reschedule-session-title"
                  className="text-[17px] font-bold text-navy"
                >
                  일정 변경
                </h2>
                <p className="mt-0.5 truncate text-[12px] text-navy/50">
                  {formatLessonOrder(session.weekNo, session.sessionNo)} ·{" "}
                  {session.lessonTitle ?? "차시 정보 없음"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="일정 변경 닫기"
                className="shrink-0 rounded-lg border border-navy/15 px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
              >
                닫기
              </button>
            </header>

            <form action={formAction} className="flex flex-col gap-4 px-5 py-5">
              <input
                type="hidden"
                name="organizationId"
                value={organizationId}
              />
              <input type="hidden" name="assignmentId" value={assignmentId} />
              <input type="hidden" name="sessionId" value={session.id} />

              <div className="rounded-lg border border-navy/10 bg-surface-soft px-4 py-3">
                <p className="text-[11px] font-semibold text-navy/45">
                  현재 예정일
                </p>
                <p className="mt-1 text-[13px] text-navy">
                  {formatSessionDate(session.scheduled_date)}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="reschedule-date"
                >
                  새 예정일
                </label>
                <input
                  id="reschedule-date"
                  name="scheduled_date"
                  type="date"
                  disabled={isPending}
                  value={scheduledDate}
                  onChange={(event) => {
                    setScheduledDate(event.target.value);
                    setIsMessageHidden(true);
                  }}
                  className={inputClasses}
                />
                <p className="text-[12px] text-navy/45">
                  비워두면 예정일이 미정으로 바뀝니다.
                </p>
              </div>

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

              <button
                type="submit"
                disabled={isPending}
                className="mt-1 h-11 rounded-lg bg-navy text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "저장 중…" : "저장"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
