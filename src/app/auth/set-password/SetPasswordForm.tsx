"use client";

import { useActionState } from "react";
import { setPasswordAction } from "./actions";
import {
  MIN_PASSWORD_LENGTH,
  SET_PASSWORD_INITIAL_STATE,
} from "./form-state";

const fieldClasses =
  "w-full rounded-[var(--radius-lg)] border border-navy/15 bg-white px-4 py-3 text-[15px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

const labelClasses = "block text-[13px] font-semibold text-navy/70";

export function SetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    setPasswordAction,
    SET_PASSWORD_INITIAL_STATE,
  );

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label className={labelClasses} htmlFor="new-password">
          새 비밀번호
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          disabled={isPending}
          placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
          className={fieldClasses}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClasses} htmlFor="new-password-confirm">
          새 비밀번호 확인
        </label>
        <input
          id="new-password-confirm"
          name="password_confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          disabled={isPending}
          placeholder="한 번 더 입력해주세요"
          className={fieldClasses}
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-lg)] border border-soft-coral/50 bg-soft-coral/10 px-4 py-3 text-[14px] font-medium text-navy"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 h-12 w-full rounded-full bg-navy text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "설정 중…" : "비밀번호 설정"}
      </button>
    </form>
  );
}
