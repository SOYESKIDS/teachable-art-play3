"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  formatClassOptionLabel,
  formatProgramOptionLabel,
  hasAgeGroupMismatch,
} from "@/lib/admin/class-program";
import type {
  AssignableClassOption,
  AssignableProgramOption,
} from "@/types/class-program";
import { createClassProgramAssignmentAction } from "./class-program-actions";
import {
  CLASS_CHILD_FORM_INITIAL_STATE,
  type ClassChildFormState,
} from "./class-child-state";

interface ClassProgramAssignDialogProps {
  organizationId: string;
  /** 운영 중인 반만 (호출부에서 이미 걸러 내려준다) */
  assignableClasses: AssignableClassOption[];
  /** 게시된 프로그램만 (호출부에서 이미 걸러 내려준다) */
  assignablePrograms: AssignableProgramOption[];
  variant?: "primary" | "outline";
}

const buttonClasses = {
  primary:
    "rounded-lg bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep",
  outline:
    "rounded-lg border border-navy/25 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5",
} as const;

const inputClasses =
  "h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] text-navy transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

interface AssignFormValues {
  classId: string;
  programId: string;
  startDate: string;
}

const EMPTY_VALUES: AssignFormValues = {
  classId: "",
  programId: "",
  startDate: "",
};

/**
 * 반에 프로그램을 배정하는 Modal.
 *
 * 입력을 controlled로 두는 이유 (LessonFormDialog R3 / ActivityFormDialog R4와 동일)
 *   React 19는 <form action={fn}> 제출 시 액션 실행 직전에 requestFormReset을 걸고
 *   액션이 끝나면 form.reset()을 실행한다(성공/실패 구분 없이 항상).
 *   uncontrolled 입력이면 서버가 "이 반에는 해당 프로그램이 이미 운영 중입니다"를
 *   돌려줘도 선택한 반·프로그램·시작일이 전부 초기화된다.
 *
 * 신규 배정의 status는 항상 active다. 사용자가 고르지 않는다.
 */
export function ClassProgramAssignDialog({
  organizationId,
  assignableClasses,
  assignablePrograms,
  variant = "primary",
}: ClassProgramAssignDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<AssignFormValues>(EMPTY_VALUES);

  /**
   * 서버 오류 배너를 감출지 여부.
   * 사용자가 값을 고치기 시작하면 지난 오류는 현재 입력을 설명하지 못하므로 감춘다.
   */
  const [isMessageHidden, setIsMessageHidden] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (prevState: ClassChildFormState, formData: FormData) => {
      setIsMessageHidden(false);

      const result = await createClassProgramAssignmentAction(
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

  function updateValue<K extends keyof AssignFormValues>(
    key: K,
    value: AssignFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setIsMessageHidden(true);
  }

  function openDialog() {
    setValues(EMPTY_VALUES);
    setIsMessageHidden(true);
    setIsOpen(true);
  }

  /**
   * 반을 바꿀 때, 새 반이 이미 운영 중인 프로그램은 아래 후보에서 사라진다.
   * 그때 programId를 그대로 두면 select는 빈칸인데 state에는 값이 남는 불일치가 생긴다
   * (브라우저가 selectedIndex를 -1로 만들어 제출 자체는 required에 막히지만,
   *  화면과 state가 어긋난 상태를 남겨 둘 이유가 없다).
   */
  function selectClass(classId: string) {
    const nextClass = assignableClasses.find((item) => item.id === classId);

    setValues((prev) => ({
      ...prev,
      classId,
      programId: nextClass?.activeProgramIds.includes(prev.programId)
        ? ""
        : prev.programId,
    }));
    setIsMessageHidden(true);
  }

  const selectedClass = assignableClasses.find(
    (item) => item.id === values.classId,
  );

  /**
   * 선택한 반에서 이미 운영 중인 프로그램은 후보에서 뺀다.
   * 반을 아직 고르지 않았으면 전체 게시 프로그램을 보여준다.
   * (Client 필터는 편의일 뿐이고, 중복 판정은 Server Action과 partial unique가 한다.)
   */
  const programOptions = useMemo(() => {
    if (!selectedClass) return assignablePrograms;

    const taken = new Set(selectedClass.activeProgramIds);

    return assignablePrograms.filter((program) => !taken.has(program.id));
  }, [assignablePrograms, selectedClass]);

  const selectedProgram = programOptions.find(
    (item) => item.id === values.programId,
  );

  // 연령이 서로 다르면 알려만 준다. DB도 UI도 저장을 막지 않는다.
  const showAgeMismatch =
    selectedClass !== undefined &&
    selectedProgram !== undefined &&
    hasAgeGroupMismatch(selectedClass.ageGroup, selectedProgram.ageGroup);

  const hasNoClass = assignableClasses.length === 0;
  const hasNoProgram = assignablePrograms.length === 0;
  const visibleMessage = isMessageHidden ? null : state.message;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={buttonClasses[variant]}
      >
        프로그램 배정
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
            aria-labelledby="assign-program-title"
            className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="assign-program-title"
                  className="text-[17px] font-bold text-navy"
                >
                  프로그램 배정
                </h2>
                <p className="mt-0.5 text-[12px] text-navy/50">
                  운영 중인 반에 게시된 프로그램을 배정합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="프로그램 배정 닫기"
                className="shrink-0 rounded-lg border border-navy/15 px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
              >
                닫기
              </button>
            </header>

            {hasNoClass || hasNoProgram ? (
              <div className="px-5 py-8 text-center">
                {hasNoClass ? (
                  <>
                    <p className="text-[14px] font-semibold text-navy">
                      운영 중인 반이 없습니다.
                    </p>
                    <p className="mt-1.5 text-[13px] text-navy/55">
                      먼저 반을 등록하거나 운영 상태로 변경해주세요.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-semibold text-navy">
                      배정할 수 있는 게시 프로그램이 없습니다.
                    </p>
                    <p className="mt-1.5 text-[13px] text-navy/55">
                      먼저 수업 프로그램을 게시해주세요.
                    </p>
                    <Link
                      href="/admin/curriculum"
                      className="mt-4 inline-block text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
                    >
                      수업 프로그램 관리로 이동 →
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <form action={formAction} className="flex flex-col gap-4 px-5 py-5">
                <input
                  type="hidden"
                  name="organizationId"
                  value={organizationId}
                />

                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="assign-class"
                  >
                    반 <span className="text-trust-blue">*</span>
                  </label>
                  <select
                    id="assign-class"
                    name="classId"
                    required
                    disabled={isPending}
                    value={values.classId}
                    onChange={(event) => selectClass(event.target.value)}
                    className={inputClasses}
                  >
                    <option value="">반을 선택하세요</option>
                    {assignableClasses.map((classOption) => (
                      <option key={classOption.id} value={classOption.id}>
                        {formatClassOptionLabel(
                          classOption.name,
                          classOption.ageGroup,
                          classOption.schoolYear,
                        )}
                      </option>
                    ))}
                  </select>
                  <p className="text-[12px] text-navy/45">
                    보관된 반은 새로 배정할 수 없어 목록에 없습니다.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="assign-program"
                  >
                    프로그램 <span className="text-trust-blue">*</span>
                  </label>
                  <select
                    id="assign-program"
                    name="programId"
                    required
                    disabled={isPending}
                    value={values.programId}
                    onChange={(event) =>
                      updateValue("programId", event.target.value)
                    }
                    className={inputClasses}
                  >
                    <option value="">프로그램을 선택하세요</option>
                    {programOptions.map((program) => (
                      <option key={program.id} value={program.id}>
                        {formatProgramOptionLabel(
                          program.code,
                          program.title,
                          program.durationWeeks,
                          program.ageGroup,
                        )}
                      </option>
                    ))}
                  </select>
                  <p className="text-[12px] text-navy/45">
                    {selectedClass && programOptions.length === 0
                      ? "이 반은 게시된 프로그램을 이미 모두 운영 중입니다."
                      : "게시된 프로그램만 배정할 수 있습니다. 이미 운영 중인 프로그램은 제외됩니다."}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="assign-start-date"
                  >
                    시작일
                  </label>
                  <input
                    id="assign-start-date"
                    name="start_date"
                    type="date"
                    disabled={isPending}
                    value={values.startDate}
                    onChange={(event) =>
                      updateValue("startDate", event.target.value)
                    }
                    className={inputClasses}
                  />
                  <p className="text-[12px] text-navy/45">
                    아직 정해지지 않았다면 비워두세요.
                  </p>
                </div>

                {showAgeMismatch ? (
                  <p className="rounded-lg border border-yellow/50 bg-yellow-soft px-3 py-2 text-[13px] text-navy">
                    반 연령과 프로그램 권장 연령이 다릅니다. 그대로 배정할 수
                    있습니다.
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
                  {isPending ? "배정 중…" : "배정하기"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
