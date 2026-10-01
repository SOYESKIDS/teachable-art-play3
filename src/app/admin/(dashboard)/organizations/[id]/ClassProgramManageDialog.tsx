"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  ASSIGNMENT_STATUS_LABELS,
  formatAssignmentDate,
} from "@/lib/admin/class-program";
import type {
  AssignmentCloseStatus,
  ClassProgramAssignmentItem,
} from "@/types/class-program";
import { closeClassProgramAssignmentAction } from "./class-program-actions";
import { fieldInput } from "@/components/ui/field";
import {
  CLASS_CHILD_FORM_INITIAL_STATE,
  type ClassChildFormState,
} from "./class-child-state";

interface ClassProgramManageDialogProps {
  organizationId: string;
  assignment: ClassProgramAssignmentItem;
}

const inputClasses = fieldInput;

/** 배정 정보 한 줄 (읽기 전용) */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-micro text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-caption font-medium text-navy">
        {value}
      </dd>
    </div>
  );
}

/**
 * 운영 관리 Modal.
 *
 * 운영 중(active)인 배정에만 노출한다. 여기서 할 수 있는 일은 "종료"뿐이다.
 *   완료 처리 : active → completed
 *   취소 처리 : active → cancelled
 *
 * ★ 시작일은 수정하지 않는다.
 *   배정은 생성 시점에 대상(반·프로그램)과 시작일이 정해지고, 그 뒤로는 상태만 바뀐다.
 *   잘못 입력했다면 취소 처리 후 새로 배정한다 — 그래야 "언제 무엇을 운영했는지"가
 *   나중에 덮어써지지 않고 이력으로 남는다. 그래서 시작일은 읽기 전용으로만 보여준다.
 *
 * 완료·취소는 되돌릴 수 없으므로, 상태를 고른 뒤에야 저장 버튼이 열리고 경고를 함께 보여준다.
 */
export function ClassProgramManageDialog({
  organizationId,
  assignment,
}: ClassProgramManageDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  // "" = 아직 고르지 않음. 실수로 종료되는 것을 막기 위해 기본 선택을 두지 않는다.
  const [status, setStatus] = useState<AssignmentCloseStatus | "">("");
  const [isMessageHidden, setIsMessageHidden] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (prevState: ClassChildFormState, formData: FormData) => {
      setIsMessageHidden(false);

      const result = await closeClassProgramAssignmentAction(
        prevState,
        formData,
      );
      if (result.phase === "success") setIsOpen(false);
      return result;
    },
    CLASS_CHILD_FORM_INITIAL_STATE,
  );

  function openDialog() {
    setStatus("");
    setIsMessageHidden(true);
    setIsOpen(true);
  }

  const visibleMessage = isMessageHidden ? null : state.message;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex min-h-11 min-w-11 items-center justify-center text-caption font-semibold text-trust-blue transition-opacity hover:opacity-70"
      >
        운영 관리
      </button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="운영 관리"
        description="운영 중인 배정을 완료 또는 취소로 종료합니다."
        size="md"
        busy={isPending}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input
            type="hidden"
            name="organizationId"
            value={organizationId}
          />
          <input type="hidden" name="assignmentId" value={assignment.id} />

          {/* 배정 정보는 전부 읽기 전용이다. 이 화면에서 바꿀 수 있는 값은 상태뿐이다. */}
          <dl className="flex flex-col gap-2 rounded-lg border border-line bg-surface-soft px-4 py-3">
            <InfoRow label="반" value={assignment.className ?? "—"} />
            <InfoRow
              label="프로그램"
              value={assignment.programTitle ?? "—"}
            />
            <InfoRow
              label="시작일"
              value={formatAssignmentDate(assignment.start_date)}
            />
            <InfoRow
              label="현재 상태"
              value={ASSIGNMENT_STATUS_LABELS[assignment.status]}
            />
          </dl>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-micro font-semibold text-ink-muted"
              htmlFor="manage-status"
            >
              운영 종료 <span className="text-trust-blue">*</span>
            </label>
            <select
              id="manage-status"
              name="status"
              required
              disabled={isPending}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as AssignmentCloseStatus | "");
                setIsMessageHidden(true);
              }}
              className={inputClasses}
            >
              <option value="">처리할 상태를 선택하세요</option>
              <option value="completed">완료 처리</option>
              <option value="cancelled">취소 처리</option>
            </select>
            <p className="text-micro text-ink-muted">
              시작일과 배정 대상(반·프로그램)은 변경할 수 없습니다.
            </p>
          </div>

          {status ? (
            <p className="rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-caption leading-relaxed text-navy">
              {status === "completed"
                ? "완료 처리하면 다시 운영 중으로 되돌릴 수 없습니다."
                : "취소된 운영 이력은 다시 운영 중으로 되돌릴 수 없습니다."}{" "}
              같은 프로그램을 다시 운영하려면 새로 배정하면 됩니다. 기존
              이력은 그대로 남습니다.
            </p>
          ) : null}

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
            disabled={isPending || status === ""}
            className="mt-1 h-11 rounded-lg bg-navy text-label font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "처리 중…" : "운영 종료"}
          </button>
        </form>
      </Dialog>
    </>
  );
}
