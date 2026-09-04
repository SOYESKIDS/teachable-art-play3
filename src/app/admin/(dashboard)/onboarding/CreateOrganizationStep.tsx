"use client";

import { useActionState } from "react";
import { createOrganizationAction } from "../organizations/actions";
import { ORGANIZATION_FORM_INITIAL_STATE } from "../organizations/form-state";
import { SectionCard } from "@/components/ui/surface";

/**
 * SERVICE-17 — 1단계 · 기관 등록.
 *
 * ★ 새 Server Action 을 만들지 않는다.
 *   기관 관리 화면이 쓰는 createOrganizationAction 을 그대로 호출한다.
 *   달라지는 것은 저장 성공 후 도착지뿐이고, 그것도 임의 URL 이 아니라
 *   서버가 아는 리터럴("onboarding") 하나로만 지정한다.
 *
 * ★ 저장에 성공하면 서버가 곧바로 2단계로 보낸다.
 *   그래서 이 컴포넌트에는 "다음" 버튼이 따로 없다.
 */
export function CreateOrganizationStep() {
  const [result, action, pending] = useActionState(
    createOrganizationAction,
    ORGANIZATION_FORM_INITIAL_STATE,
  );

  const inputClass =
    "w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-[14px] text-navy outline-none transition-colors focus-visible:border-trust-blue focus-visible:ring-2 focus-visible:ring-trust-blue/20";

  return (
    <SectionCard
      title="1단계 · 기관"
      description="기관을 등록하면 바로 다음 단계로 이동합니다. 나머지 정보는 이후 단계에서 채웁니다."
    >
      <form action={action} className="flex flex-col gap-3">
        {/* ★ 도착지 지정. 서버가 화이트리스트로만 해석한다. */}
        <input type="hidden" name="next" value="onboarding" />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-name" className="text-[12px] font-semibold text-navy/60">
            기관명
          </label>
          <input
            id="org-name"
            name="name"
            type="text"
            required
            maxLength={100}
            placeholder="소예 유치원"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-type" className="text-[12px] font-semibold text-navy/60">
            기관 유형
          </label>
          <select id="org-type" name="institution_type" defaultValue="kindergarten" className={inputClass}>
            <option value="kindergarten">유치원</option>
            <option value="daycare">어린이집</option>
            <option value="academy">학원</option>
            <option value="other">기타</option>
          </select>
        </div>

        <div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-navy px-4 text-[13px] font-bold text-white transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "등록 중..." : "기관 등록하고 계속"}
          </button>
        </div>
      </form>

      {result.phase === "error" && result.message ? (
        <p
          role="status"
          className="mt-3 rounded-lg border border-navy/20 bg-surface-soft px-3 py-2 text-[13px] leading-relaxed text-navy/75"
        >
          확인 필요 · {result.message}
        </p>
      ) : null}
    </SectionCard>
  );
}
