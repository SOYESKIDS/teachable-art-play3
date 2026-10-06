"use client";

import { fieldInput } from "@/components/ui/field";
import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { INSTITUTION_TYPES } from "@/lib/admin/organization-filters";
import { INSTITUTION_TYPE_LABELS } from "@/lib/admin/organization-labels";
import { createOrganizationAction } from "./actions";
import { ORGANIZATION_FORM_INITIAL_STATE } from "./form-state";

interface CreateOrganizationDialogProps {
  /** Empty State에서 쓰는 보조 스타일 */
  variant?: "primary" | "outline";
}

const buttonClasses = {
  primary:
    "min-h-11 rounded-lg bg-navy px-4 py-2.5 text-caption font-semibold text-white transition-colors hover:bg-navy-deep",
  outline:
    "min-h-11 rounded-lg border border-navy/25 bg-white px-4 py-2.5 text-caption font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5",
} as const;

/**
 * 기관 등록 Modal.
 *
 * 등록 성공 시 Server Action이 상세 페이지로 redirect하므로
 * 이 컴포넌트가 성공 상태를 따라 닫을 필요가 없다(불필요한 상태 동기화 제거).
 */
export function CreateOrganizationDialog({
  variant = "primary",
}: CreateOrganizationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createOrganizationAction,
    ORGANIZATION_FORM_INITIAL_STATE,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClasses[variant]}
      >
        기관 등록
      </button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="기관 등록"
        description="등록 후 상세 화면에서 정보를 수정할 수 있습니다."
        size="md"
        busy={isPending}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-micro font-semibold text-ink-muted"
              htmlFor="new-organization-name"
            >
              기관명 <span className="text-trust-blue">*</span>
            </label>
            <input
              id="new-organization-name"
              name="name"
              type="text"
              required
              maxLength={100}
              disabled={isPending}
              placeholder="예) 새봄유치원"
              className={fieldInput}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-micro font-semibold text-ink-muted"
              htmlFor="new-organization-type"
            >
              기관 유형
            </label>
            <select
              id="new-organization-type"
              name="institution_type"
              defaultValue=""
              disabled={isPending}
              className={fieldInput}
            >
              <option value="">미지정</option>
              {INSTITUTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {INSTITUTION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {state.phase === "error" && state.message ? (
            <p
              role="alert"
              className="rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-caption text-navy"
            >
              {state.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 h-11 rounded-lg bg-navy text-label font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "등록 중…" : "기관 등록"}
          </button>
        </form>
      </Dialog>
    </>
  );
}
