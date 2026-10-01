"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  formatLessonOrder,
  formatSessionDate,
} from "@/lib/admin/class-session";
import type { ClassSessionItem } from "@/types/class-session";
import { rescheduleClassSessionAction } from "./class-session-actions";
import { fieldInput } from "@/components/ui/field";
import {
  CLASS_SESSION_FORM_INITIAL_STATE,
  type ClassSessionFormState,
} from "./class-session-state";

interface ClassSessionRescheduleDialogProps {
  organizationId: string;
  assignmentId: string;
  session: ClassSessionItem;
}

const inputClasses = fieldInput;

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
        className="inline-flex min-h-11 min-w-11 items-center justify-center text-caption font-semibold text-ink-muted transition-opacity hover:opacity-70"
      >
        일정 변경
      </button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="일정 변경"
        description={`${formatLessonOrder(session.weekNo, session.sessionNo)} · ${session.lessonTitle ?? "차시 정보 없음"}`}
        size="sm"
        busy={isPending}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input
            type="hidden"
            name="organizationId"
            value={organizationId}
          />
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <input type="hidden" name="sessionId" value={session.id} />

          <div className="rounded-lg border border-line bg-surface-soft px-4 py-3">
            <p className="text-micro font-semibold text-ink-muted">
              현재 예정일
            </p>
            <p className="mt-1 text-caption text-navy">
              {formatSessionDate(session.scheduled_date)}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-micro font-semibold text-ink-muted"
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
            <p className="text-micro text-ink-muted">
              비워두면 예정일이 미정으로 바뀝니다.
            </p>
          </div>

          {visibleMessage ? (
            <p
              role="alert"
              className={`rounded-lg border px-3 py-2 text-caption ${
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
            className="mt-1 h-11 rounded-lg bg-navy text-label font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "저장 중…" : "일정 변경 저장"}
          </button>
        </form>
      </Dialog>
    </>
  );
}
