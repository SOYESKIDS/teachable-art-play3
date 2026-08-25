"use client";

import { useActionState, useEffect, useState } from "react";
import {
  CURRICULUM_STATUSES,
  CURRICULUM_STATUS_LABELS,
  LESSON_DURATION_MAX,
  LESSON_DURATION_MIN,
  LESSON_OBJECTIVE_MAX,
  LESSON_TITLE_MAX,
  SESSION_NO_MAX,
  SESSION_NO_MIN,
} from "@/lib/admin/curriculum";
import type { CurriculumLessonRow, CurriculumStatus } from "@/types/curriculum";
import { createLessonAction, updateLessonAction } from "../lesson-actions";
import {
  CURRICULUM_FORM_INITIAL_STATE,
  type CurriculumFormState,
} from "../curriculum-state";

interface LessonFormDialogProps {
  programId: string;
  /** 안내 문구에 쓰는 프로그램 운영 주차. 실제 상한 판정은 Server Action이 한다. */
  durationWeeks: number;
  /** 있으면 수정 모드, 없으면 등록 모드 */
  lesson?: CurriculumLessonRow;
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
  "h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70";

const textareaClasses =
  "min-h-[88px] rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-[14px] leading-relaxed text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

/**
 * 폼 입력값. 전부 문자열로 들고 있다가 그대로 제출한다.
 * 숫자로 미리 바꾸지 않는 이유는 "9"처럼 범위를 벗어난 값도 사용자가 친 그대로
 * 서버에 보내고 화면에도 남겨야 하기 때문이다(임의 보정 금지 - R2 참조).
 */
interface LessonFormValues {
  weekNo: string;
  sessionNo: string;
  title: string;
  objective: string;
  durationMinutes: string;
  status: CurriculumStatus;
}

function toFormValues(lesson?: CurriculumLessonRow): LessonFormValues {
  return {
    weekNo: String(lesson?.week_no ?? 1),
    sessionNo: String(lesson?.session_no ?? 1),
    title: lesson?.title ?? "",
    objective: lesson?.objective ?? "",
    durationMinutes:
      lesson?.duration_minutes === null || lesson?.duration_minutes === undefined
        ? ""
        : String(lesson.duration_minutes),
    status: lesson?.status ?? "draft",
  };
}

/**
 * 차시 등록 / 수정 Modal.
 *
 * 주차 범위("8주 과정에 9주차 금지") 판정은 Server Action 한 곳에서만 한다.
 * DB CHECK은 1~52까지만 보고, 실제 상한인 program.duration_weeks는
 * 다른 테이블 값이라 CHECK으로 표현할 수 없기 때문이다.
 * 입력란에 max를 두지 않는 이유는 아래 주차 필드 주석 참조.
 *
 * 입력을 controlled로 두는 이유
 *   React 19는 <form action={fn}> 제출 시 액션 실행 직전에 requestFormReset을 걸고,
 *   액션이 끝나면 form.reset()을 실행한다(성공/실패 구분 없이 항상).
 *   uncontrolled 입력(defaultValue)이면 그 reset 때문에 서버가 오류를 돌려줘도
 *   주차가 1로, 제목이 빈칸으로 되돌아간다.
 *   실제로 "주차 1"과 "1~8주차만 입력 가능" 오류가 함께 보이는 모순이 생겼다.
 *   값을 React state로 들고 있으면 reset이 일어나도 다시 state 값으로 복원된다.
 */
export function LessonFormDialog({
  programId,
  durationWeeks,
  lesson,
  variant = "primary",
}: LessonFormDialogProps) {
  const isEdit = lesson !== undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<LessonFormValues>(() =>
    toFormValues(lesson),
  );

  /**
   * 서버 오류 배너를 감출지 여부.
   *
   * 오류가 난 뒤 사용자가 값을 고치기 시작하면 그 오류는 이미 지난 입력에 대한 것이라
   * 지금 화면의 값과 어긋난다. 그래서 입력이 바뀌는 순간 감춘다.
   * 새로 제출하면 다시 false가 되어 새 결과가 정상적으로 보인다.
   */
  const [isMessageHidden, setIsMessageHidden] = useState(false);

  const submitAction = isEdit ? updateLessonAction : createLessonAction;

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
  function updateValue<K extends keyof LessonFormValues>(
    key: K,
    value: LessonFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setIsMessageHidden(true);
  }

  /** 열 때마다 원본 값으로 되돌린다. 저장하지 않고 닫은 편집이 남지 않게 한다. */
  function openDialog() {
    setValues(toFormValues(lesson));
    setIsMessageHidden(true);
    setIsOpen(true);
  }

  const isArchived = isEdit && lesson.status === "archived";
  const title = isEdit ? "차시 수정" : "차시 추가";
  const visibleMessage = isMessageHidden ? null : state.message;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={buttonClasses[variant]}
      >
        {isEdit ? "수정" : "차시 추가"}
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
            aria-labelledby="lesson-form-title"
            className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="lesson-form-title"
                  className="text-[17px] font-bold text-navy"
                >
                  {title}
                </h2>
                <p className="mt-0.5 text-[12px] text-navy/50">
                  이 프로그램은 {durationWeeks}주 과정입니다.
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
              {isEdit ? (
                <input type="hidden" name="lessonId" value={lesson.id} />
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="lesson-week"
                  >
                    주차 <span className="text-trust-blue">*</span>
                  </label>
                  {/*
                    ★ min / max 속성을 의도적으로 두지 않는다.
                      <input type="number" max="8">에 스피너(▲) 나 ↑키로 8을 넘기면
                      브라우저가 값을 조용히 8로 되돌린다(stepUp이 max에서 clamp된다).
                      그러면 사용자는 9를 넣었다고 생각하는데 8이 저장되고,
                      8은 유효한 값이라 어디에서도 오류가 나지 않는다.
                      실제로 이 경로로 "9주차 테스트"라는 차시가 8주차로 저장됐다.

                      max를 두면 반대로 타이핑한 9는 native validation이 제출 자체를 막아
                      Server Action의 안내 문구("이 프로그램은 8주 과정이므로…")가 뜨지 않는다.
                      즉 입력 방법에 따라 동작이 갈린다.

                      그래서 범위 판정을 Server Action 한 곳으로 모은다.
                      어떤 방법으로 넣든 잘못된 주차는 같은 한국어 오류로 돌아온다.
                      아래 안내 문구가 사용자 보조장치 역할을 한다.
                  */}
                  <input
                    id="lesson-week"
                    name="week_no"
                    type="number"
                    required
                    step={1}
                    inputMode="numeric"
                    disabled={isPending}
                    value={values.weekNo}
                    onChange={(event) =>
                      updateValue("weekNo", event.target.value)
                    }
                    aria-describedby="lesson-week-hint"
                    className={inputClasses}
                  />
                  <p id="lesson-week-hint" className="text-[12px] text-navy/45">
                    1~{durationWeeks}주차까지 입력할 수 있습니다.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="lesson-session"
                  >
                    차시 번호 <span className="text-trust-blue">*</span>
                  </label>
                  <input
                    id="lesson-session"
                    name="session_no"
                    type="number"
                    required
                    min={SESSION_NO_MIN}
                    max={SESSION_NO_MAX}
                    step={1}
                    disabled={isPending}
                    value={values.sessionNo}
                    onChange={(event) =>
                      updateValue("sessionNo", event.target.value)
                    }
                    className={inputClasses}
                  />
                  <p className="text-[12px] text-navy/45">
                    한 주에 여러 번 수업할 때 구분합니다.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="lesson-title"
                >
                  차시명 <span className="text-trust-blue">*</span>
                </label>
                <input
                  id="lesson-title"
                  name="title"
                  type="text"
                  required
                  maxLength={LESSON_TITLE_MAX}
                  disabled={isPending}
                  value={values.title}
                  onChange={(event) => updateValue("title", event.target.value)}
                  placeholder="예) 몸으로 만나는 선과 모양"
                  className={inputClasses}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="lesson-objective"
                >
                  교육 목표
                </label>
                <textarea
                  id="lesson-objective"
                  name="objective"
                  maxLength={LESSON_OBJECTIVE_MAX}
                  disabled={isPending}
                  value={values.objective}
                  onChange={(event) =>
                    updateValue("objective", event.target.value)
                  }
                  placeholder="이 차시에서 아이가 경험하길 바라는 것을 적습니다."
                  className={textareaClasses}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="lesson-duration"
                  >
                    수업 시간(분)
                  </label>
                  <input
                    id="lesson-duration"
                    name="duration_minutes"
                    type="number"
                    min={LESSON_DURATION_MIN}
                    max={LESSON_DURATION_MAX}
                    step={1}
                    disabled={isPending}
                    value={values.durationMinutes}
                    onChange={(event) =>
                      updateValue("durationMinutes", event.target.value)
                    }
                    placeholder="비워두면 미입력"
                    className={inputClasses}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="lesson-status"
                  >
                    상태
                  </label>
                  <select
                    id="lesson-status"
                    name="status"
                    disabled={isPending || isArchived}
                    value={values.status}
                    onChange={(event) =>
                      updateValue("status", event.target.value as CurriculumStatus)
                    }
                    className={inputClasses}
                  >
                    {CURRICULUM_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {CURRICULUM_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isArchived ? (
                <p className="text-[12px] text-navy/45">
                  보관된 차시는 다른 상태로 되돌릴 수 없습니다.
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
