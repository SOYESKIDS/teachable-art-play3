"use client";

import { useActionState } from "react";
import { organizationSignInAction } from "./actions";
import { ORGANIZATION_LOGIN_INITIAL_STATE } from "./form-state";

const fieldClasses =
  "w-full rounded-[var(--radius-lg)] border border-navy/15 bg-white px-4 py-3 text-[15px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

const labelClasses = "block text-[13px] font-semibold text-navy/70";

interface LoginFormProps {
  /** 서버에서 전달된 초기 안내 메시지 */
  initialError?: string | null;
}

export function LoginForm({ initialError = null }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    organizationSignInAction,
    ORGANIZATION_LOGIN_INITIAL_STATE,
  );

  const message = state.error ?? initialError;

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label className={labelClasses} htmlFor="organization-email">
          이메일
        </label>
        <input
          id="organization-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={isPending}
          placeholder="기관 담당자 이메일"
          className={fieldClasses}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClasses} htmlFor="organization-password">
          비밀번호
        </label>
        <input
          id="organization-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          placeholder="비밀번호를 입력하세요"
          className={fieldClasses}
        />
      </div>

      {message ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-[var(--radius-lg)] border border-soft-coral/50 bg-soft-coral/10 px-4 py-3 text-[14px] font-medium text-navy"
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 h-12 w-full rounded-full bg-navy text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
