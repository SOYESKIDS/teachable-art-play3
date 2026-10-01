"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { formatLessonOptionLabel } from "@/lib/admin/class-session";
import type { SchedulableLessonOption } from "@/types/class-session";
import { createClassSessionAction } from "./class-session-actions";
import { fieldInput } from "@/components/ui/field";
import {
  CLASS_SESSION_FORM_INITIAL_STATE,
  type ClassSessionFormState,
} from "./class-session-state";

interface ClassSessionScheduleDialogProps {
  organizationId: string;
  assignmentId: string;
  programId: string;
  /** 게시된 차시 중 아직 열린 수업이 없는 것만 (호출부에서 이미 걸러 내려준다) */
  schedulableLessons: SchedulableLessonOption[];
  /** 이 프로그램에 게시된 차시가 하나라도 있는지 — 빈 상태 문구를 가르는 데 쓴다 */
  hasPublishedLesson: boolean;
  variant?: "primary" | "outline";
}

const buttonClasses = {
  primary:
    "min-h-11 rounded-lg bg-navy px-4 py-2.5 text-caption font-semibold text-white transition-colors hover:bg-navy-deep",
  outline:
    "min-h-11 rounded-lg border border-navy/25 bg-white px-4 py-2.5 text-caption font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5",
} as const;

const inputClasses = fieldInput;

interface ScheduleFormValues {
  lessonId: string;
  scheduledDate: string;
}

const EMPTY_VALUES: ScheduleFormValues = { lessonId: "", scheduledDate: "" };

/**
 * 수업 일정 등록 Modal.
 *
 * 입력을 controlled로 두는 이유 (LessonFormDialog R3 / ClassProgramAssignDialog와 동일)
 *   React 19는 <form action={fn}> 제출 시 액션이 끝나면 form.reset()을 실행한다
 *   (성공/실패 구분 없이 항상). uncontrolled 입력이면 서버가
 *   "이 차시는 이미 예정 또는 진행 중인 수업이 있습니다"를 돌려줘도
 *   선택한 차시와 예정일이 전부 초기화된다.
 *
 * 신규 수업의 status는 항상 scheduled다. 사용자가 고르지 않는다.
 */
export function ClassSessionScheduleDialog({
  organizationId,
  assignmentId,
  programId,
  schedulableLessons,
  hasPublishedLesson,
  variant = "primary",
}: ClassSessionScheduleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<ScheduleFormValues>(EMPTY_VALUES);

  /**
   * 서버 오류 배너를 감출지 여부.
   * 사용자가 값을 고치기 시작하면 지난 오류는 현재 입력을 설명하지 못하므로 감춘다.
   */
  const [isMessageHidden, setIsMessageHidden] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (prevState: ClassSessionFormState, formData: FormData) => {
      setIsMessageHidden(false);

      const result = await createClassSessionAction(prevState, formData);
      if (result.phase === "success") setIsOpen(false);
      return result;
    },
    CLASS_SESSION_FORM_INITIAL_STATE,
  );

  function updateValue<K extends keyof ScheduleFormValues>(
    key: K,
    value: ScheduleFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setIsMessageHidden(true);
  }

  function openDialog() {
    setValues(EMPTY_VALUES);
    setIsMessageHidden(true);
    setIsOpen(true);
  }

  const hasNoCandidate = schedulableLessons.length === 0;
  const visibleMessage = isMessageHidden ? null : state.message;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={buttonClasses[variant]}
      >
        수업 일정 등록
      </button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="수업 일정 등록"
        description="게시된 차시를 골라 예정 수업을 만듭니다."
        size="lg"
        busy={isPending}
      >
        {hasNoCandidate ? (
          <div className="py-3 text-center">
            {hasPublishedLesson ? (
              <>
                <p className="text-label font-semibold text-navy">
                  추가로 등록할 수 있는 차시가 없습니다.
                </p>
                <p className="mt-1.5 text-caption text-ink-muted">
                  게시된 차시가 모두 예정 또는 진행 중입니다. 기존 수업을
                  완료하거나 취소하면 같은 차시를 다시 등록할 수 있습니다.
                </p>
              </>
            ) : (
              <>
                <p className="text-label font-semibold text-navy">
                  실행할 수 있는 게시 차시가 없습니다.
                </p>
                <p className="mt-1.5 text-caption text-ink-muted">
                  먼저 프로그램의 차시를 게시해주세요.
                </p>
                <Link
                  href={`/admin/curriculum/${programId}`}
                  className="mt-4 inline-flex min-h-11 min-w-11 items-center justify-center text-caption font-semibold text-trust-blue transition-opacity hover:opacity-70"
                >
                  차시 관리로 이동 →
                </Link>
              </>
            )}
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input
              type="hidden"
              name="organizationId"
              value={organizationId}
            />
            <input type="hidden" name="assignmentId" value={assignmentId} />

            <div className="flex flex-col gap-1.5">
              <label
                className="text-micro font-semibold text-ink-muted"
                htmlFor="schedule-lesson"
              >
                차시 <span className="text-trust-blue">*</span>
              </label>
              <select
                id="schedule-lesson"
                name="lessonId"
                required
                disabled={isPending}
                value={values.lessonId}
                onChange={(event) =>
                  updateValue("lessonId", event.target.value)
                }
                className={inputClasses}
              >
                <option value="">차시를 선택하세요</option>
                {schedulableLessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {formatLessonOptionLabel(
                      lesson.weekNo,
                      lesson.sessionNo,
                      lesson.title,
                    )}
                  </option>
                ))}
              </select>
              <p className="text-micro text-ink-muted">
                게시된 차시만 등록할 수 있습니다. 이미 예정·진행 중인 차시는
                제외됩니다.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-micro font-semibold text-ink-muted"
                htmlFor="schedule-date"
              >
                예정일
              </label>
              <input
                id="schedule-date"
                name="scheduled_date"
                type="date"
                disabled={isPending}
                value={values.scheduledDate}
                onChange={(event) =>
                  updateValue("scheduledDate", event.target.value)
                }
                className={inputClasses}
              />
              <p className="text-micro text-ink-muted">
                아직 정해지지 않았다면 비워두세요.
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
              {isPending ? "등록 중…" : "등록하기"}
            </button>
          </form>
        )}
      </Dialog>
    </>
  );
}
