"use client";

import { useActionState } from "react";
import { organizationSignInAction } from "@/app/login/actions";
import { ORGANIZATION_LOGIN_INITIAL_STATE } from "@/app/login/form-state";

/**
 * 기관 사용자(원장 · 교사) 로그인 폼.
 *
 * ★ 인증은 여기서 하지 않는다.
 *   organizationSignInAction 하나가 유일한 인증 경로다. 이 폼은 그 action 을
 *   호출하는 껍데기일 뿐이고, /login 과 /kindergarten 이 같은 것을 쓴다.
 *   포털을 하나 더 열었다고 해서 인증 코드가 하나 더 생기면 안 된다 —
 *   그러면 나중에 한쪽만 고쳐지는 순간이 반드시 온다.
 *
 * ★ 오류 문구를 여기서 만들지 않는다.
 *   무엇이 틀렸는지(없는 이메일인지, 비밀번호가 틀렸는지)를 화면이 구분해서
 *   말하면 계정 존재 여부를 알려 주는 것이 된다. 문구는 action 이 정한
 *   한 가지뿐이고, 이 폼은 받은 문구를 그대로 보여 준다.
 */

const fieldClasses =
  "w-full rounded-[var(--radius-lg)] border border-navy/15 bg-white px-4 py-3 text-[15px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

const labelClasses = "block text-[13px] font-semibold text-navy/70";

interface StaffLoginFormProps {
  /** 서버에서 전달된 초기 안내 메시지 */
  initialError?: string | null;
  /** 같은 화면에 폼이 둘 이상 놓일 때 id 충돌을 막는다 */
  idPrefix?: string;
}

export function StaffLoginForm({
  initialError = null,
  idPrefix = "staff-login",
}: StaffLoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    organizationSignInAction,
    ORGANIZATION_LOGIN_INITIAL_STATE,
  );

  const message = state.error ?? initialError;
  const emailId = `${idPrefix}-email`;
  const passwordId = `${idPrefix}-password`;
  const errorId = `${idPrefix}-error`;

  return (
    <form action={formAction} className="mt-7 flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label className={labelClasses} htmlFor={emailId}>
          이메일
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          /*
            ★ "email" 이 아니라 "username" 이다.
              이 칸은 연락처를 받는 곳이 아니라 로그인 식별자다.
              비밀번호 관리자는 username + current-password 를 한 쌍으로 보고
              저장·자동입력한다. email 로 두면 그 짝이 흐려져 저장된
              자격증명이 채워지지 않는 경우가 생긴다.
              키보드는 type="email" 이 이미 정해 주므로 잃는 것이 없다.
          */
          autoComplete="username"
          required
          disabled={isPending}
          /*
            오류가 났을 때 스크린리더가 입력칸에서 곧바로 이유를 읽게 한다.
            메시지를 화면 아래에만 두면 폼을 위에서 아래로 읽는 사용자는
            무엇을 고쳐야 하는지 모른 채 같은 값을 다시 넣게 된다.
          */
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          placeholder="기관 담당자 이메일"
          className={fieldClasses}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClasses} htmlFor={passwordId}>
          비밀번호
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          placeholder="비밀번호를 입력하세요"
          className={fieldClasses}
        />
      </div>

      {message ? (
        <p
          id={errorId}
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
