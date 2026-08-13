"use client";

import { useActionState } from "react";
import { INSTITUTION_TYPES } from "@/lib/admin/organization-filters";
import { INSTITUTION_TYPE_LABELS } from "@/lib/admin/organization-labels";
import type { OrganizationRow } from "@/types/organization";
import { updateOrganizationAction } from "../actions";
import { ORGANIZATION_FORM_INITIAL_STATE } from "../form-state";

interface OrganizationEditFormProps {
  organization: OrganizationRow;
}

/**
 * 수정 가능한 컬럼은 name / institution_type 두 개뿐이다.
 * organizations.status는 Data API GRANT에서 제외되어 있어 여기서 다루지 않는다.
 */
export function OrganizationEditForm({
  organization,
}: OrganizationEditFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateOrganizationAction,
    ORGANIZATION_FORM_INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="organizationId" value={organization.id} />

      <div className="flex flex-col gap-1.5">
        <label
          className="text-[12px] font-semibold text-navy/60"
          htmlFor="organization-name"
        >
          기관명 <span className="text-trust-blue">*</span>
        </label>
        <input
          id="organization-name"
          name="name"
          type="text"
          required
          maxLength={100}
          disabled={isPending}
          defaultValue={organization.name}
          className="h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] text-navy transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          className="text-[12px] font-semibold text-navy/60"
          htmlFor="organization-type"
        >
          기관 유형
        </label>
        <select
          id="organization-type"
          name="institution_type"
          disabled={isPending}
          defaultValue={organization.institution_type ?? ""}
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

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="h-11 rounded-lg bg-navy px-6 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
