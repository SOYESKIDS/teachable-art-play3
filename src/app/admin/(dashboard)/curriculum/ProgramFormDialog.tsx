"use client";

import { useActionState, useEffect, useState } from "react";
import { AGE_GROUPS, AGE_GROUP_LABELS } from "@/lib/admin/class-child";
import {
  CURRICULUM_STATUSES,
  CURRICULUM_STATUS_LABELS,
  DURATION_WEEKS_MAX,
  DURATION_WEEKS_MIN,
  PROGRAM_CODE_MAX,
  PROGRAM_SUMMARY_MAX,
  PROGRAM_TITLE_MAX,
} from "@/lib/admin/curriculum";
import type { CurriculumProgramRow } from "@/types/curriculum";
import { createProgramAction, updateProgramAction } from "./actions";
import {
  CURRICULUM_FORM_INITIAL_STATE,
  type CurriculumFormState,
} from "./curriculum-state";

interface ProgramFormDialogProps {
  /** 있으면 수정 모드, 없으면 등록 모드 */
  program?: CurriculumProgramRow;
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
 * 프로그램 등록 / 수정 Modal.
 *
 * 등록과 수정의 입력 필드가 같아 한 컴포넌트로 둔다.
 * 기존 기관 상세는 인라인 Edit Form을 쓰지만, 여기서는 Dialog를 쓴다 —
 * 코드 필드가 상태에 따라 잠기고 상태 전이 규칙 안내가 붙어야 해서
 * 04B/04C의 Dialog 패턴이 더 잘 맞는다.
 *
 * 삭제 기능은 제공하지 않는다. 상태(초안/게시/보관)로만 관리한다.
 */
export function ProgramFormDialog({
  program,
  variant = "primary",
}: ProgramFormDialogProps) {
  const isEdit = program !== undefined;
  const [isOpen, setIsOpen] = useState(false);

  /**
   * ★ 등록과 수정이 Action을 넘기는 방식이 다르다. 의도된 차이다.
   *
   * 등록: createProgramAction을 **그대로** 넘긴다.
   *   이 Action은 성공 시 redirect()로 끝나 반환값이 없다(NEXT_REDIRECT를 던진다).
   *   Client 함수로 감싸 `await`하면 오지 않을 반환값을 기다리게 되어
   *   transition이 끝나지 않고 → isPending이 true로 고정되고 → navigation도 일어나지 않는다.
   *   (기존 CreateOrganizationDialog도 같은 이유로 Action을 그대로 넘긴다.)
   *   redirect로 페이지가 바뀌므로 Dialog를 따로 닫을 필요도 없다.
   *
   * 수정: 성공 상태를 받아 Dialog를 닫아야 하므로 감싼다.
   *   updateProgramAction은 redirect하지 않고 항상 상태를 반환한다.
   */
  const [state, formAction, isPending] = useActionState<
    CurriculumFormState,
    FormData
  >(
    isEdit
      ? async (prevState, formData) => {
          const result = await updateProgramAction(prevState, formData);
          if (result.phase === "success") setIsOpen(false);
          return result;
        }
      : createProgramAction,
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

  // 코드는 초안일 때만 바꿀 수 있다. Server Action에서도 같은 규칙을 다시 검증한다.
  const isCodeLocked = isEdit && program.status !== "draft";
  // 보관된 프로그램은 다른 상태로 되돌릴 수 없다.
  const isArchived = isEdit && program.status === "archived";

  const title = isEdit ? "프로그램 수정" : "프로그램 등록";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClasses[variant]}
      >
        {isEdit ? "수정" : "프로그램 등록"}
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
            aria-labelledby="program-form-title"
            className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="program-form-title"
                  className="text-[17px] font-bold text-navy"
                >
                  {title}
                </h2>
                <p className="mt-0.5 text-[12px] text-navy/50">
                  기관에 공통으로 제공되는 교육 프로그램입니다.
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
              {isEdit ? (
                <input type="hidden" name="programId" value={program.id} />
              ) : null}
              {/* 코드 입력이 잠긴 경우에도 서버가 현재 값을 받도록 hidden으로 함께 보낸다 */}
              {isCodeLocked ? (
                <input type="hidden" name="code" value={program.code} />
              ) : null}

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="program-code"
                >
                  프로그램 코드 <span className="text-trust-blue">*</span>
                </label>
                <input
                  id="program-code"
                  name={isCodeLocked ? undefined : "code"}
                  type="text"
                  required={!isCodeLocked}
                  disabled={isPending || isCodeLocked}
                  maxLength={PROGRAM_CODE_MAX}
                  defaultValue={program?.code ?? ""}
                  placeholder="예) TAP-STARTER-08"
                  className={inputClasses}
                />
                <p className="text-[12px] text-navy/45">
                  {isCodeLocked
                    ? "게시된 프로그램의 코드는 변경할 수 없습니다."
                    : "운영에서 프로그램을 식별하는 코드입니다. 게시 후에는 변경할 수 없습니다."}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="program-title"
                >
                  프로그램명 <span className="text-trust-blue">*</span>
                </label>
                <input
                  id="program-title"
                  name="title"
                  type="text"
                  required
                  maxLength={PROGRAM_TITLE_MAX}
                  disabled={isPending}
                  defaultValue={program?.title ?? ""}
                  placeholder="예) 창의예술 통합 프로그램"
                  className={inputClasses}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="program-summary"
                >
                  요약
                </label>
                <textarea
                  id="program-summary"
                  name="summary"
                  maxLength={PROGRAM_SUMMARY_MAX}
                  disabled={isPending}
                  defaultValue={program?.summary ?? ""}
                  placeholder="프로그램을 한두 문장으로 소개합니다."
                  className={textareaClasses}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="program-age-group"
                  >
                    권장 연령
                  </label>
                  <select
                    id="program-age-group"
                    name="age_group"
                    disabled={isPending}
                    defaultValue={program?.age_group ?? ""}
                    className={inputClasses}
                  >
                    <option value="">선택 안 함</option>
                    {AGE_GROUPS.map((ageGroup) => (
                      <option key={ageGroup} value={ageGroup}>
                        {AGE_GROUP_LABELS[ageGroup]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="program-duration"
                  >
                    운영 주차 <span className="text-trust-blue">*</span>
                  </label>
                  <input
                    id="program-duration"
                    name="duration_weeks"
                    type="number"
                    required
                    min={DURATION_WEEKS_MIN}
                    max={DURATION_WEEKS_MAX}
                    step={1}
                    disabled={isPending}
                    defaultValue={program?.duration_weeks ?? 8}
                    className={inputClasses}
                  />
                </div>
              </div>

              {isEdit ? (
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] font-semibold text-navy/60"
                    htmlFor="program-status"
                  >
                    상태
                  </label>
                  <select
                    id="program-status"
                    name="status"
                    disabled={isPending || isArchived}
                    defaultValue={program.status}
                    className={inputClasses}
                  >
                    {CURRICULUM_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {CURRICULUM_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <p className="text-[12px] text-navy/45">
                    {isArchived
                      ? "보관된 프로그램은 다른 상태로 되돌릴 수 없습니다."
                      : "게시하려면 차시가 한 개 이상 등록되어 있어야 합니다. 보관하면 되돌릴 수 없습니다."}
                  </p>
                </div>
              ) : (
                /*
                  등록은 항상 초안이다. 차시가 0개인 상태로는 게시 조건을 만족할 수 없어
                  선택지를 두면 반드시 실패하는 경로만 늘어난다. Server Action도 draft만 허용한다.
                */
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-navy/60">
                    상태
                  </span>
                  <p className="rounded-lg border border-navy/10 bg-surface-soft px-3 py-2.5 text-[14px] text-navy/70">
                    초안
                  </p>
                  <p className="text-[12px] text-navy/45">
                    새 프로그램은 초안으로 등록됩니다. 차시를 추가한 뒤 상세
                    화면에서 게시할 수 있습니다.
                  </p>
                </div>
              )}

              {state.message ? (
                <p
                  role="alert"
                  className={`rounded-lg border px-3 py-2 text-[13px] ${
                    state.phase === "error"
                      ? "border-soft-coral/50 bg-soft-coral/10 text-navy"
                      : "border-soft-green/50 bg-soft-green/15 text-navy"
                  }`}
                >
                  {state.message}
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
