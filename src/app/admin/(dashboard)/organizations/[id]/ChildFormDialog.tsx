"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  BIRTH_YEAR_MAX,
  BIRTH_YEAR_MIN,
  CHILD_STATUSES,
  CHILD_STATUS_LABELS,
  NAME_MAX_LENGTH,
} from "@/lib/admin/class-child";
import type { ChildListItem, ClassListItem } from "@/types/class-child";
import { createChildAction, updateChildAction } from "./class-child-actions";
import { fieldInput } from "@/components/ui/field";
import {
  CLASS_CHILD_FORM_INITIAL_STATE,
  type ClassChildFormState,
} from "./class-child-state";

interface ChildFormDialogProps {
  organizationId: string;
  /** 배정 가능한 반 후보. 보관된 반은 호출부에서 이미 제외해 내려준다. */
  activeClasses: ClassListItem[];
  /** 있으면 수정 모드, 없으면 등록 모드 */
  child?: ChildListItem;
  variant?: "primary" | "outline" | "link";
}

const buttonClasses = {
  primary:
    "min-h-11 rounded-lg bg-navy px-4 py-2.5 text-caption font-semibold text-white transition-colors hover:bg-navy-deep",
  outline:
    "min-h-11 rounded-lg border border-navy/25 bg-white px-4 py-2.5 text-caption font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5",
  link: "inline-flex min-h-11 min-w-11 items-center justify-center text-caption font-semibold text-trust-blue transition-opacity hover:opacity-70",
} as const;

const inputClasses = fieldInput;

/**
 * 원아 등록 / 수정 Modal.
 *
 * 개인정보 최소화 원칙에 따라 입력 항목은 이름 · 출생연도 · 반 · 상태 넷뿐이다.
 * 부모 연락처 / 성별 / 주소 / 사진 / 자유 메모 등은 DB에도 컬럼이 없고 여기에도 추가하지 않는다.
 *
 * 반 선택지는 "운영 중인 반"만 노출한다(보관된 반으로 새로 배정하지 않는다).
 * 다만 수정 모드에서 이미 보관된 반에 속해 있는 원아는 현재 반을 그대로 유지할 수 있도록
 * 그 반만 예외적으로 선택지에 남긴다.
 */
export function ChildFormDialog({
  organizationId,
  activeClasses,
  child,
  variant = "primary",
}: ChildFormDialogProps) {
  const isEdit = child !== undefined;
  const [isOpen, setIsOpen] = useState(false);
  const submitAction = isEdit ? updateChildAction : createChildAction;

  // 저장 성공 시 Dialog를 닫는 처리는 Action 안에서 한다(useEffect + setState 연쇄 렌더 회피).
  const [state, formAction, isPending] = useActionState(
    async (prevState: ClassChildFormState, formData: FormData) => {
      const result = await submitAction(prevState, formData);
      if (result.phase === "success") setIsOpen(false);
      return result;
    },
    CLASS_CHILD_FORM_INITIAL_STATE,
  );

  // 보관된 반에 이미 속한 원아는 그 반을 선택지에 남겨 둔다(강제 이동시키지 않는다).
  const keepsArchivedClass =
    isEdit && child.class_id !== null && child.classStatus === "archived";

  const title = isEdit ? "원아 수정" : "원아 등록";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClasses[variant]}
      >
        {isEdit ? "수정" : "원아 등록"}
      </button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description="운영에 필요한 최소 정보만 입력합니다."
        size="md"
        busy={isPending}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input
            type="hidden"
            name="organizationId"
            value={organizationId}
          />
          {isEdit ? (
            <input type="hidden" name="childId" value={child.id} />
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label
              className="text-micro font-semibold text-ink-muted"
              htmlFor="child-name"
            >
              이름 <span className="text-trust-blue">*</span>
            </label>
            <input
              id="child-name"
              name="name"
              type="text"
              required
              maxLength={NAME_MAX_LENGTH}
              disabled={isPending}
              defaultValue={child?.name ?? ""}
              placeholder="예) 김하늘"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-micro font-semibold text-ink-muted"
              htmlFor="child-birth-year"
            >
              출생연도
            </label>
            <input
              id="child-birth-year"
              name="birth_year"
              type="number"
              min={BIRTH_YEAR_MIN}
              max={BIRTH_YEAR_MAX}
              step={1}
              disabled={isPending}
              defaultValue={child?.birth_year ?? ""}
              placeholder="비워두면 미입력"
              className={inputClasses}
            />
            <p className="text-micro text-ink-muted">
              반 편성 참고용입니다. 생년월일은 저장하지 않습니다.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-micro font-semibold text-ink-muted"
              htmlFor="child-class"
            >
              반
            </label>
            <select
              id="child-class"
              name="class_id"
              disabled={isPending}
              defaultValue={child?.class_id ?? ""}
              className={inputClasses}
            >
              <option value="">미배정</option>
              {keepsArchivedClass && child.class_id ? (
                <option value={child.class_id}>
                  {child.className ?? "이름 없음"} (보관)
                </option>
              ) : null}
              {activeClasses.map((classRow) => (
                <option key={classRow.id} value={classRow.id}>
                  {classRow.name} ({classRow.school_year}학년도)
                </option>
              ))}
            </select>
            {activeClasses.length === 0 && !keepsArchivedClass ? (
              <p className="text-micro text-ink-muted">
                운영 중인 반이 없습니다. 먼저 반을 등록하면 배정할 수 있습니다.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-micro font-semibold text-ink-muted"
              htmlFor="child-status"
            >
              상태
            </label>
            <select
              id="child-status"
              name="status"
              disabled={isPending}
              defaultValue={child?.status ?? "active"}
              className={inputClasses}
            >
              {CHILD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CHILD_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
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
            {isPending ? "저장 중…" : "원아 정보 저장"}
          </button>
        </form>
      </Dialog>
    </>
  );
}
