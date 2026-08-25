"use client";

import { useActionState, useEffect, useState } from "react";
import {
  ASSIGNMENT_STATUS_LABELS,
  formatAssignmentDate,
} from "@/lib/admin/class-program";
import type {
  AssignmentCloseStatus,
  ClassProgramAssignmentItem,
} from "@/types/class-program";
import { closeClassProgramAssignmentAction } from "./class-program-actions";
import {
  CLASS_CHILD_FORM_INITIAL_STATE,
  type ClassChildFormState,
} from "./class-child-state";

interface ClassProgramManageDialogProps {
  organizationId: string;
  assignment: ClassProgramAssignmentItem;
}

const inputClasses =
  "h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] text-navy transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

/** 배정 정보 한 줄 (읽기 전용) */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[12px] text-navy/45">{label}</dt>
      <dd className="min-w-0 truncate text-[13px] font-medium text-navy">
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

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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
        className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
      >
        운영 관리
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
            aria-labelledby="manage-assignment-title"
            className="relative max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="manage-assignment-title"
                  className="text-[17px] font-bold text-navy"
                >
                  운영 관리
                </h2>
                <p className="mt-0.5 text-[12px] text-navy/50">
                  운영 중인 배정을 완료 또는 취소로 종료합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="운영 관리 닫기"
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
              <input type="hidden" name="assignmentId" value={assignment.id} />

              {/* 배정 정보는 전부 읽기 전용이다. 이 화면에서 바꿀 수 있는 값은 상태뿐이다. */}
              <dl className="flex flex-col gap-2 rounded-lg border border-navy/10 bg-surface-soft px-4 py-3">
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
                  className="text-[12px] font-semibold text-navy/60"
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
                <p className="text-[12px] text-navy/45">
                  시작일과 배정 대상(반·프로그램)은 변경할 수 없습니다.
                </p>
              </div>

              {status ? (
                <p className="rounded-lg border border-yellow/50 bg-yellow-soft px-3 py-2 text-[13px] leading-relaxed text-navy">
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
                disabled={isPending || status === ""}
                className="mt-1 h-11 rounded-lg bg-navy text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "처리 중…" : "운영 종료"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
