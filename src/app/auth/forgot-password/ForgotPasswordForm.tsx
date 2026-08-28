"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "./actions";
import {
  FORGOT_PASSWORD_INITIAL_STATE,
  FORGOT_PASSWORD_SENT_MESSAGE,
} from "./form-state";

const fieldClasses =
  "w-full rounded-[var(--radius-lg)] border border-navy/15 bg-white px-4 py-3 text-[15px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

const labelClasses = "block text-[13px] font-semibold text-navy/70";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    FORGOT_PASSWORD_INITIAL_STATE,
  );

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label className={labelClasses} htmlFor="recovery-email">
          이메일
        </label>
        <input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={isPending}
          placeholder="가입하신 기관 담당자 이메일"
          className={fieldClasses}
        />
      </div>

      {state.sent ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-lg)] border border-trust-blue/40 bg-trust-blue/10 px-4 py-3 text-[14px] font-medium text-navy"
        >
          {FORGOT_PASSWORD_SENT_MESSAGE}
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          aria-live="polite"
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
        {isPending ? "보내는 중…" : "재설정 메일 보내기"}
      </button>
    </form>
  );
}
