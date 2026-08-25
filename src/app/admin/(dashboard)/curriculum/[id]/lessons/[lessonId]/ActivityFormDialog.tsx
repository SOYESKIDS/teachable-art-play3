"use client";

import { useActionState, useEffect, useState } from "react";
import {
  ACTIVITY_DESCRIPTION_MAX,
  ACTIVITY_DURATION_MAX,
  ACTIVITY_DURATION_MIN,
  ACTIVITY_MATERIALS_MAX,
  ACTIVITY_TITLE_MAX,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  SEQUENCE_NO_MAX,
  SEQUENCE_NO_MIN,
} from "@/lib/admin/curriculum";
import type { ActivityType, LessonActivityRow } from "@/types/curriculum";
import { createActivityAction, updateActivityAction } from "../../../activity-actions";
import {
  CURRICULUM_FORM_INITIAL_STATE,
  type CurriculumFormState,
} from "../../../curriculum-state";

interface ActivityFormDialogProps {
  programId: string;
  lessonId: string;
  /** 등록 모드에서 제안할 다음 순서 번호 */
  nextSequenceNo: number;
  /** 있으면 수정 모드, 없으면 등록 모드 */
  activity?: LessonActivityRow;
  variant?: "primary" | "outline" | "link";
}

const buttonClasses = {
  primary:
    "rounded-lg bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep",
  outline:
    "rounded-lg border border-navy/25 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5",
  link: "text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70",
} as const;

const inputClasses =
  "h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

const textareaClasses =
  "min-h-[110px] rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-[14px] leading-relaxed text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

/**
 * 폼 입력값. 숫자도 string으로 들고 있다가 그대로 제출한다.
 * 사용자가 친 "101" 같은 값을 미리 숫자로 바꾸거나 보정하지 않고
 * 서버 검증에 그대로 넘기기 위함이다(LessonFormDialog R2/R3와 같은 원칙).
 */
interface ActivityFormValues {
  sequenceNo: string;
  activityType: ActivityType;
  title: string;
  description: string;
  durationMinutes: string;
  materials: string;
}

/**
 * 등록이면 "마지막 순서 + 1"을 기본 제안값으로, 수정이면 기존 값을 채운다.
 * Dialog를 열 때마다 이 함수로 되돌리므로 기본 제안은 유지되고,
 * 사용자가 바꾼 값은 오류가 나도 state에 그대로 남는다.
 */
function toFormValues(
  activity: LessonActivityRow | undefined,
  nextSequenceNo: number,
): ActivityFormValues {
  return {
    sequenceNo: String(activity?.sequence_no ?? nextSequenceNo),
    activityType: activity?.activity_type ?? "activity",
    title: activity?.title ?? "",
    description: activity?.description ?? "",
    durationMinutes:
      activity?.duration_minutes === null ||
      activity?.duration_minutes === undefined
        ? ""
        : String(activity.duration_minutes),
    materials: activity?.materials ?? "",
  };
}

/**
 * 활동 등록 / 수정 Modal.
 *
 * 순서는 drag & drop이 아니라 sequence_no 숫자로 관리한다.
 * 향후 drag & drop을 붙이더라도 같은 update Action을 재사용할 수 있다.
 *
 * 입력을 controlled로 두는 이유 (LessonFormDialog R3와 동일)
 *   React 19는 <form action={fn}> 제출 시 액션 실행 직전에 requestFormReset을 걸고
 *   액션이 끝나면 form.reset()을 실행한다(성공/실패 구분 없이 항상).
 *   uncontrolled 입력이면 서버가 "같은 차시에 동일한 활동 순서가 이미 있습니다"를
 *   돌려줘도 순서가 기본 제안값으로, 설명/준비물이 빈칸으로 되돌아간다.
 *   활동 설명은 최대 3000자라 이 초기화의 손실이 특히 크다.
 */
export function ActivityFormDialog({
  programId,
  lessonId,
  nextSequenceNo,
  activity,
  variant = "primary",
}: ActivityFormDialogProps) {
  const isEdit = activity !== undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<ActivityFormValues>(() =>
    toFormValues(activity, nextSequenceNo),
  );

  /**
   * 서버 오류 배너를 감출지 여부.
   *
   * 오류가 난 뒤 사용자가 값을 고치기 시작하면 그 오류는 이미 지난 입력에 대한 것이라
   * 지금 화면의 값과 어긋난다. 그래서 입력이 바뀌는 순간 감춘다.
   * 새로 제출하면 다시 false가 되어 새 결과가 정상적으로 보인다.
   */
  const [isMessageHidden, setIsMessageHidden] = useState(false);

  const submitAction = isEdit ? updateActivityAction : createActivityAction;

  // 저장 성공 시 Dialog를 닫는 처리는 Action 안에서 한다(useEffect + setState 연쇄 렌더 회피).
  const [state, formAction, isPending] = useActionState(
    async (prevState: CurriculumFormState, formData: FormData) => {
      // 새 제출이 시작됐으니 이번 결과는 보여준다.
      setIsMessageHidden(false);

      const result = await submitAction(prevState, formData);
      if (result.phase === "success") setIsOpen(false);
      return result;
    },
    CURRICULUM_FORM_INITIAL_STATE,
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  /** 값이 바뀌면 지난 서버 오류는 더 이상 현재 입력을 설명하지 못하므로 감춘다 */
  function updateValue<K extends keyof ActivityFormValues>(
    key: K,
    value: ActivityFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setIsMessageHidden(true);
  }

  /**
   * 열 때마다 초기값으로 되돌린다.
   * 저장하지 않고 닫은 편집이나 이전 오류가 다음 열기까지 남지 않게 한다.
   */
  function openDialog() {
    setValues(toFormValues(activity, nextSequenceNo));
    setIsMessageHidden(true);
    setIsOpen(true);
  }

  const title = isEdit ? "활동 수정" : "활동 추가";
  const visibleMessage = isMessageHidden ? null : state.message;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={buttonClasses[variant]}
      >
        {isEdit ? "수정" : "활동 추가"}
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
            aria-labelledby="activity-form-title"
            className="relative max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="activity-form-title"
                  className="text-[17px] font-bold text-navy"
                >
                  {title}
                </h2>
                <p className="mt-0.5 text-[12px] text-navy/50">
                  차시 안에서 진행되는 활동 단위입니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={`${title} 닫기`}
                className="shrink-0 rounded-lg border border-navy/15 px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
              >
                닫기
              </button>
            </header>

            <form action={formAction} className="flex flex-col gap-4 px-5 py-5">
              <input type="hidden" name="programId" value={programId} />
              <input type="hidden" name="lessonId" value={lessonId} />
              {isEdit ? (
                <input type="hidden" name="activityId" value={activity.id} />
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="activity-sequence"
                  >
                    순서 <span className="text-trust-blue">*</span>
                  </label>
                  {/*
                    min / max를 두지 않는다 (LessonFormDialog R2와 같은 이유).
                    <input type="number" max="100">에 스피너로 100을 넘기면 브라우저가
                    값을 조용히 100으로 되돌린다. 100은 유효값이라 서버도 통과시켜
                    사용자가 넣지 않은 값이 저장된다.
                    범위 판정은 Server Action 한 곳에서만 하고, 아래 문구로 안내한다.
                  */}
                  <input
                    id="activity-sequence"
                    name="sequence_no"
                    type="number"
                    required
                    step={1}
                    inputMode="numeric"
                    disabled={isPending}
                    value={values.sequenceNo}
                    onChange={(event) =>
                      updateValue("sequenceNo", event.target.value)
                    }
                    aria-describedby="activity-sequence-hint"
                    className={inputClasses}
                  />
                  <p
                    id="activity-sequence-hint"
                    className="text-[12px] text-navy/45"
                  >
                    {SEQUENCE_NO_MIN}~{SEQUENCE_NO_MAX} 사이로 입력합니다. 작은
                    번호부터 진행됩니다.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="activity-type"
                  >
                    활동 유형 <span className="text-trust-blue">*</span>
                  </label>
                  <select
                    id="activity-type"
                    name="activity_type"
                    required
                    disabled={isPending}
                    value={values.activityType}
                    onChange={(event) =>
                      updateValue("activityType", event.target.value as ActivityType)
                    }
                    className={inputClasses}
                  >
                    {ACTIVITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {ACTIVITY_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="activity-title"
                >
                  활동명 <span className="text-trust-blue">*</span>
                </label>
                <input
                  id="activity-title"
                  name="title"
                  type="text"
                  required
                  maxLength={ACTIVITY_TITLE_MAX}
                  disabled={isPending}
                  value={values.title}
                  onChange={(event) => updateValue("title", event.target.value)}
                  placeholder="예) 선을 따라 걷기"
                  className={inputClasses}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="activity-description"
                >
                  활동 설명
                </label>
                <textarea
                  id="activity-description"
                  name="description"
                  maxLength={ACTIVITY_DESCRIPTION_MAX}
                  disabled={isPending}
                  value={values.description}
                  onChange={(event) =>
                    updateValue("description", event.target.value)
                  }
                  placeholder="교사가 수업에서 그대로 따라 할 수 있도록 진행 방법을 적습니다."
                  className={textareaClasses}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="activity-materials"
                >
                  준비물
                </label>
                <textarea
                  id="activity-materials"
                  name="materials"
                  maxLength={ACTIVITY_MATERIALS_MAX}
                  disabled={isPending}
                  value={values.materials}
                  onChange={(event) =>
                    updateValue("materials", event.target.value)
                  }
                  placeholder="예) 마스킹 테이프, 색연필"
                  className={`${textareaClasses} min-h-[72px]`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="activity-duration"
                >
                  활동 시간(분)
                </label>
                {/* sequence_no와 같은 이유로 min / max를 두지 않는다 */}
                <input
                  id="activity-duration"
                  name="duration_minutes"
                  type="number"
                  step={1}
                  inputMode="numeric"
                  disabled={isPending}
                  value={values.durationMinutes}
                  onChange={(event) =>
                    updateValue("durationMinutes", event.target.value)
                  }
                  placeholder="비워두면 미입력"
                  aria-describedby="activity-duration-hint"
                  className={inputClasses}
                />
                <p
                  id="activity-duration-hint"
                  className="text-[12px] text-navy/45"
                >
                  {ACTIVITY_DURATION_MIN}~{ACTIVITY_DURATION_MAX}분 사이로
                  입력하거나 비워둡니다.
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
