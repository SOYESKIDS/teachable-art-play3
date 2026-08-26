"use client";

import { useActionState, useEffect, useState } from "react";
import {
  allowedSessionTransitions,
  CLASS_SESSION_STATUS_LABELS,
  formatLessonOrder,
  formatSessionDate,
  requiresActiveParents,
} from "@/lib/admin/class-session";
import type {
  ClassSessionItem,
  ClassSessionTransitionStatus,
} from "@/types/class-session";
import { transitionClassSessionAction } from "./class-session-actions";
import {
  CLASS_SESSION_FORM_INITIAL_STATE,
  type ClassSessionFormState,
} from "./class-session-state";

interface ClassSessionManageDialogProps {
  organizationId: string;
  assignmentId: string;
  session: ClassSessionItem;
  /** 배정·반·프로그램·차시가 지금도 전부 유효한가 — 아니면 "수업 시작"을 막는다 */
  parentsActive: boolean;
}

const inputClasses =
  "h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] text-navy transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

/** 상태 선택지 문구 — 사용자가 무엇을 하는지가 드러나게 동사로 적는다 */
const TRANSITION_LABELS: Record<ClassSessionTransitionStatus, string> = {
  in_progress: "수업 시작",
  completed: "완료 처리",
  cancelled: "취소 처리",
};

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
 * 수업 상태 변경 Modal.
 *
 * 예정 / 진행 중인 수업에만 노출한다. 여기서 바뀌는 값은 status 하나뿐이다.
 *   예정   → 수업 시작 / 완료 처리 / 취소 처리
 *   진행 중 → 완료 처리 / 취소 처리
 *
 * ★ 예정일은 여기서 고치지 않는다 — 별도의 "일정 변경"에서 다룬다.
 *   상태 변경과 일정 변경은 부모(배정·반·프로그램·차시) 유효성 요구가 서로 달라서,
 *   한 폼에 섞으면 어떤 규칙에 걸렸는지 사용자가 알 수 없게 된다.
 *
 * ★ "수업 시작"만 부모가 지금도 유효해야 한다.
 *   완료·취소는 배정이 종료되었거나 반이 보관된 뒤에도 항상 할 수 있어야 한다.
 */
export function ClassSessionManageDialog({
  organizationId,
  assignmentId,
  session,
  parentsActive,
}: ClassSessionManageDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  // "" = 아직 고르지 않음. 실수로 처리되는 것을 막기 위해 기본 선택을 두지 않는다.
  const [status, setStatus] = useState<ClassSessionTransitionStatus | "">("");
  const [isMessageHidden, setIsMessageHidden] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (prevState: ClassSessionFormState, formData: FormData) => {
      setIsMessageHidden(false);

      const result = await transitionClassSessionAction(prevState, formData);
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
    setStatus("");
    setIsMessageHidden(true);
    setIsOpen(true);
  }

  // 부모가 유효하지 않으면 "수업 시작"은 선택지에서 아예 뺀다.
  // (숨기는 것은 안내일 뿐이고, 실제 차단은 Server Action과 DB trigger가 한다.)
  const options = allowedSessionTransitions(session.status).filter(
    (option) => parentsActive || !requiresActiveParents(option),
  );

  const isTerminalChoice = status === "completed" || status === "cancelled";
  const visibleMessage = isMessageHidden ? null : state.message;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
      >
        수업 관리
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
            aria-labelledby="manage-session-title"
            className="relative max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="manage-session-title"
                  className="text-[17px] font-bold text-navy"
                >
                  수업 관리
                </h2>
                <p className="mt-0.5 text-[12px] text-navy/50">
                  수업 상태를 변경합니다. 예정일은 변경되지 않습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="수업 관리 닫기"
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

              {/* 수업 정보는 전부 읽기 전용이다. */}
              <dl className="flex flex-col gap-2 rounded-lg border border-navy/10 bg-surface-soft px-4 py-3">
                <InfoRow
                  label="차시"
                  value={formatLessonOrder(session.weekNo, session.sessionNo)}
                />
                <InfoRow label="차시명" value={session.lessonTitle ?? "—"} />
                <InfoRow
                  label="예정일"
                  value={formatSessionDate(session.scheduled_date)}
                />
                <InfoRow
                  label="현재 상태"
                  value={CLASS_SESSION_STATUS_LABELS[session.status]}
                />
              </dl>

              {!parentsActive ? (
                <p className="rounded-lg border border-navy/15 bg-surface-soft px-3 py-2 text-[12px] leading-relaxed text-navy/60">
                  배정·반·프로그램·차시 중 하나가 더 이상 운영 상태가 아닙니다.
                  이 수업은 완료 또는 취소로만 정리할 수 있습니다.
                </p>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="manage-session-status"
                >
                  처리 <span className="text-trust-blue">*</span>
                </label>
                <select
                  id="manage-session-status"
                  name="status"
                  required
                  disabled={isPending}
                  value={status}
                  onChange={(event) => {
                    setStatus(
                      event.target.value as ClassSessionTransitionStatus | "",
                    );
                    setIsMessageHidden(true);
                  }}
                  className={inputClasses}
                >
                  <option value="">처리할 항목을 선택하세요</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {TRANSITION_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>

              {isTerminalChoice ? (
                <p className="rounded-lg border border-yellow/50 bg-yellow-soft px-3 py-2 text-[13px] leading-relaxed text-navy">
                  {status === "completed"
                    ? "완료 처리하면 다시 진행 중으로 되돌릴 수 없습니다."
                    : "취소된 수업은 다시 진행할 수 없습니다."}{" "}
                  같은 차시를 다시 하려면 수업 일정을 새로 등록하면 됩니다. 기존
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
                {isPending ? "처리 중…" : "저장"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
