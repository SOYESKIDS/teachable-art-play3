"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { signInAction } from "./actions";
import { LOGIN_INITIAL_STATE } from "./login-state";

const fieldClasses =
  "w-full rounded-[var(--radius-lg)] border border-navy/15 bg-white px-4 py-3 text-[15px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

const labelClasses = "block text-[13px] font-semibold text-navy/70";

interface LoginFormProps {
  /** 서버에서 전달된 초기 안내 메시지 (예: 권한 없는 세션으로 접근한 경우) */
  initialError?: string | null;
}

export function LoginForm({ initialError = null }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    LOGIN_INITIAL_STATE,
  );

  const message = state.error ?? initialError;

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label className={labelClasses} htmlFor="admin-email">
          이메일
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={isPending}
          placeholder="admin@soyeskids.com"
          className={fieldClasses}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClasses} htmlFor="admin-password">
          비밀번호
        </label>
        <input
          id="admin-password"
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

      <Button
        type="submit"
        variant="secondary"
        disabled={isPending}
        className="mt-1 w-full px-6 text-[15px] font-semibold"
      >
        {isPending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
