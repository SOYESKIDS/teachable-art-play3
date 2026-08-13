"use client";

import { useActionState, useEffect, useState } from "react";
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
    "rounded-lg bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep",
  outline:
    "rounded-lg border border-navy/25 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5",
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

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClasses[variant]}
      >
        기관 등록
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
            aria-labelledby="create-organization-title"
            className="relative w-full max-w-[460px] rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <div>
                <h2
                  id="create-organization-title"
                  className="text-[17px] font-bold text-navy"
                >
                  기관 등록
                </h2>
                <p className="mt-0.5 text-[12px] text-navy/50">
                  등록 후 상세 화면에서 정보를 수정할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="기관 등록 닫기"
                className="shrink-0 rounded-lg border border-navy/15 px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
              >
                닫기
              </button>
            </header>

            <form action={formAction} className="flex flex-col gap-4 px-5 py-5">
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
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
                  className="h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="new-organization-type"
                >
                  기관 유형
                </label>
                <select
                  id="new-organization-type"
                  name="institution_type"
                  defaultValue=""
                  disabled={isPending}
                  className="h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] text-navy transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60"
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
                  className="rounded-lg border border-soft-coral/50 bg-soft-coral/10 px-3 py-2 text-[13px] text-navy"
                >
                  {state.message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="mt-1 h-11 rounded-lg bg-navy text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "등록 중…" : "등록"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
