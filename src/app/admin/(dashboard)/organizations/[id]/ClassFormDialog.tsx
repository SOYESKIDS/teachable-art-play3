"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
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
import { fieldInput } from "@/components/ui/field";
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
    "min-h-11 rounded-lg bg-navy px-4 py-2.5 text-caption font-semibold text-white transition-colors hover:bg-navy-deep",
  outline:
    "min-h-11 rounded-lg border border-navy/25 bg-white px-4 py-2.5 text-caption font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5",
  link: "inline-flex min-h-11 min-w-11 items-center justify-center text-caption font-semibold text-trust-blue transition-opacity hover:opacity-70",
} as const;

const ARCHIVE_CONFIRM =
  "이 반을 보관 상태로 변경하시겠습니까?\n기존 원아 정보는 삭제되지 않습니다.";

const inputClasses = fieldInput;

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

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description="같은 학년도에 같은 이름의 운영 중인 반은 만들 수 없습니다."
        size="md"
        busy={isPending}
      >
        <form
          action={formAction}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
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
              className="text-micro font-semibold text-ink-muted"
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
              className="text-micro font-semibold text-ink-muted"
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
              className="text-micro font-semibold text-ink-muted"
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
              className="text-micro font-semibold text-ink-muted"
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
            <p className="text-micro text-ink-muted">
              보관해도 원아 정보는 삭제되지 않습니다. 반은 삭제할 수 없습니다.
            </p>
          </div>

          {state.message ? (
            <p
              role="alert"
              className={`rounded-lg border px-3 py-2 text-caption ${
                state.phase === "error"
                  ? "border-danger-border bg-danger-soft text-danger"
                  : "border-success-border bg-success-soft text-success-text"
              }`}
            >
              {state.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 h-11 rounded-lg bg-navy text-label font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "저장 중…" : "반 정보 저장"}
          </button>
        </form>
      </Dialog>
    </>
  );
}
