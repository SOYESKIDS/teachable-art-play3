"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  appButtonDangerOutline,
  appButtonPrimary,
  appButtonSecondary,
  noticeDanger,
  noticeSuccess,
  noticeWarning,
} from "@/components/ui/app-button";
import { fieldLabel, fieldTextarea } from "@/components/ui/field";
import {
  CLASS_SESSION_STATUS_LABELS,
  formatLessonOrder,
  formatSessionDate,
} from "@/lib/admin/class-session";
import type { ClassSessionItem } from "@/types/class-session";
import { transitionClassSessionAction } from "./class-session-actions";
import {
  CLASS_SESSION_FORM_INITIAL_STATE,
  type ClassSessionFormState,
} from "./class-session-state";

interface ClassSessionManageDialogProps {
  organizationId: string;
  assignmentId: string;
  session: ClassSessionItem;
  /** 이전 API 호환 (더 이상 "수업 시작"을 제공하지 않으므로 쓰지 않는다) */
  parentsActive?: boolean;
}

type ManageAction = "cancel" | "recovery";

/**
 * HQ 수업 관리 (PHASE 07 · DEC-085 · DEC-098).
 *
 * HQ 는 수업을 시작하거나 일반 완료하지 않는다 (교사 Class Mode 전용).
 *   예정   → 취소
 *   진행 중 → 복구 처리 (정상 종료가 아닌 예외 · 사유 필수 · audit) · 취소
 * scheduled → completed 는 어디에도 없다.
 */
export function ClassSessionManageDialog({
  organizationId,
  assignmentId,
  session,
}: ClassSessionManageDialogProps) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<ManageAction>("cancel");

  const [state, formAction, isPending] = useActionState(
    async (prevState: ClassSessionFormState, formData: FormData) => {
      const result = await transitionClassSessionAction(prevState, formData);
      if (result.phase === "success") setOpen(false);
      return result;
    },
    CLASS_SESSION_FORM_INITIAL_STATE,
  );

  const canRecover = session.status === "in_progress";
  const lessonOrder = formatLessonOrder(session.weekNo ?? null, session.sessionNo ?? null);

  function openDialog() {
    setAction(canRecover ? "recovery" : "cancel");
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex min-h-11 items-center text-caption font-semibold text-info-text hover:underline"
      >
        수업 관리
      </button>

      {state.phase === "success" && state.message && !open ? (
        <span role="status" className={`ml-2 ${noticeSuccess}`}>
          {state.message}
        </span>
      ) : null}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={action === "recovery" ? "진행 중 수업 복구 처리" : "수업 취소"}
        description={`${lessonOrder} · ${CLASS_SESSION_STATUS_LABELS[session.status]} · 예정일 ${formatSessionDate(session.scheduled_date)}`}
        busy={isPending}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <input type="hidden" name="sessionId" value={session.id} />
          <input type="hidden" name="action" value={action} />

          {canRecover ? (
            <fieldset className="flex flex-col gap-2">
              <legend className={fieldLabel}>처리 방법</legend>
              <label className="flex min-h-11 items-center gap-2 text-body-sm text-ink">
                <input
                  type="radio"
                  name="action-choice"
                  checked={action === "recovery"}
                  onChange={() => setAction("recovery")}
                />
                복구 처리 (수업 종료로 정리)
              </label>
              <label className="flex min-h-11 items-center gap-2 text-body-sm text-ink">
                <input
                  type="radio"
                  name="action-choice"
                  checked={action === "cancel"}
                  onChange={() => setAction("cancel")}
                />
                수업 취소
              </label>
            </fieldset>
          ) : null}

          {action === "recovery" ? (
            <p className={noticeWarning}>
              정상적인 수업 종료가 아닌 복구 처리입니다. 담당 교사가 [수업 마치기]를 할 수 없는 경우에만 사용해 주세요.
              처리 사유와 처리자가 기록됩니다.
            </p>
          ) : (
            <p className="text-body-sm leading-relaxed text-ink">
              취소한 수업은 다시 진행할 수 없습니다. 이미 남긴 기록은 이력에 그대로 남습니다.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`manage-reason-${session.id}`} className={fieldLabel}>
              {action === "recovery" ? "복구 처리 사유 (필수)" : "취소 사유 (선택)"}
            </label>
            <textarea
              id={`manage-reason-${session.id}`}
              name="reason"
              required={action === "recovery"}
              maxLength={500}
              className={`${fieldTextarea} min-h-[88px]`}
            />
          </div>

          {state.phase === "error" && state.message ? (
            <p role="alert" className={noticeDanger}>
              {state.message}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={isPending}
              className={`${action === "recovery" ? appButtonDangerOutline : appButtonPrimary} sm:flex-1`}
            >
              {isPending ? "처리 중…" : action === "recovery" ? "복구 처리" : "수업 취소하기"}
            </button>
            <button type="button" onClick={() => setOpen(false)} disabled={isPending} className={`${appButtonSecondary} sm:flex-1`}>
              돌아가기
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
