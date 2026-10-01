"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { signInAction } from "./actions";
import { LOGIN_INITIAL_STATE } from "./login-state";
import { fieldAuth } from "@/components/ui/field";

const fieldClasses = fieldAuth;

const labelClasses = "block text-caption font-semibold text-navy/70";

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
  const errorId = "admin-login-error";

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
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
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
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          disabled={isPending}
          placeholder="비밀번호를 입력하세요"
          className={fieldClasses}
        />
      </div>

      {message ? (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-label font-medium text-danger"
        >
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="secondary"
        disabled={isPending}
        className="mt-1 w-full px-6 text-body-sm font-semibold"
      >
        {isPending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
