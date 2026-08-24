"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  CLASS_STATUSES,
  CLASS_STATUS_LABELS,
  NAME_MAX_LENGTH,
  SCHOOL_YEAR_MAX,
  SCHOOL_YEAR_MIN,
} from "@/lib/admin/class-child";
import type { ClassListItem } from "@/types/class-child";
import { createClassAction, updateClassAction } from "./class-child-actions";
import {
  CLASS_CHILD_FORM_INITIAL_STATE,
  type ClassChildFormState,
} from "./class-child-state";

interface ClassFormDialogProps {
  organizationId: string;
  /** 등록 모드의 학년도 기본값. Hydration 불일치를 막기 위해 서버에서 내려받는다. */
  defaultSchoolYear: number;
  /** 있으면 수정 모드, 없으면 등록 모드 */
  classRow?: ClassListItem;
  variant?: "primary" | "outline" | "link";
}

const buttonClasses = {
  primary:
    "rounded-lg bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep",
  outline:
    "rounded-lg border border-navy/25 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5",
  link: "text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70",
} as const;

const ARCHIVE_CONFIRM =
  "이 반을 보관 상태로 변경하시겠습니까?\n기존 원아 정보는 삭제되지 않습니다.";

const inputClasses =
  "h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

/**
 * 반 등록 / 수정 Modal.
 *
 * 등록과 수정이 입력 필드가 완전히 같아 한 컴포넌트로 둔다.
 * 기관 ID는 서버가 내려준 값을 hidden으로 보내고, Server Action이 다시 검증한다.
 * 반 삭제는 제공하지 않는다 — 보관(archived)으로만 처리한다.
 */
export function ClassFormDialog({
  organizationId,
  defaultSchoolYear,
  classRow,
  variant = "primary",
}: ClassFormDialogProps) {
  const isEdit = classRow !== undefined;
  const [isOpen, setIsOpen] = useState(false);
  const submitAction = isEdit ? updateClassAction : createClassAction;

  // 저장 성공 시 Dialog를 닫는 처리는 Action 안에서 한다.
  // useEffect로 state를 감시해 setState하면 불필요한 연쇄 렌더가 발생한다.
  // 목록 갱신은 Server Action의 refresh()가 처리한다.
  const [state, formAction, isPending] = useActionState(
    async (prevState: ClassChildFormState, formData: FormData) => {
      const result = await submitAction(prevState, formData);
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

  /** 운영 중 → 보관 전환은 되돌리기 번거로운 동작이라 한 번 확인한다 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!isEdit || classRow.status !== "active") return;

    const nextStatus = new FormData(event.currentTarget).get("status");

    if (nextStatus === "archived" && !window.confirm(ARCHIVE_CONFIRM)) {
      event.preventDefault();
    }
  }

  const title = isEdit ? "반 수정" : "반 추가";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClasses[variant]}
      >
        {isEdit ? "수정" : "반 추가"}
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
            aria-labelledby="class-form-title"
            className="relative max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <div>
                <h2
                  id="class-form-title"
                  className="text-[17px] font-bold text-navy"
                >
                  {title}
                </h2>
                <p className="mt-0.5 text-[12px] text-navy/50">
                  같은 학년도에 같은 이름의 운영 중인 반은 만들 수 없습니다.
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

            <form
              action={formAction}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 px-5 py-5"
            >
              <input
                type="hidden"
                name="organizationId"
                value={organizationId}
              />
              {isEdit ? (
                <input type="hidden" name="classId" value={classRow.id} />
              ) : null}

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="class-name"
                >
                  반 이름 <span className="text-trust-blue">*</span>
                </label>
                <input
                  id="class-name"
                  name="name"
                  type="text"
                  required
                  maxLength={NAME_MAX_LENGTH}
                  disabled={isPending}
                  defaultValue={classRow?.name ?? ""}
                  placeholder="예) 햇살반"
                  className={inputClasses}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="class-age-group"
                >
                  연령
                </label>
                <select
                  id="class-age-group"
                  name="age_group"
                  disabled={isPending}
                  defaultValue={classRow?.age_group ?? ""}
                  className={inputClasses}
                >
                  <option value="">미설정</option>
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
                  htmlFor="class-school-year"
                >
                  학년도 <span className="text-trust-blue">*</span>
                </label>
                <input
                  id="class-school-year"
                  name="school_year"
                  type="number"
                  required
                  min={SCHOOL_YEAR_MIN}
                  max={SCHOOL_YEAR_MAX}
                  step={1}
                  disabled={isPending}
                  defaultValue={classRow?.school_year ?? defaultSchoolYear}
                  className={inputClasses}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="class-status"
                >
                  상태
                </label>
                <select
                  id="class-status"
                  name="status"
                  disabled={isPending}
                  defaultValue={classRow?.status ?? "active"}
                  className={inputClasses}
                >
                  {CLASS_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {CLASS_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <p className="text-[12px] text-navy/45">
                  보관해도 원아 정보는 삭제되지 않습니다. 반은 삭제할 수 없습니다.
                </p>
              </div>

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
