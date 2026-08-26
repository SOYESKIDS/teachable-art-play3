"use client";

import { useActionState, useEffect, useState } from "react";
import { inviteTeacherAction } from "../actions";
import {
  TEACHER_INVITE_INITIAL_STATE,
  type TeacherInviteState,
} from "../invite-state";

interface TeacherInviteDialogProps {
  organizationId: string;
  variant?: "primary" | "outline";
}

const buttonClasses = {
  primary:
    "rounded-lg bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep",
  outline:
    "rounded-lg border border-navy/25 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5",
} as const;

const inputClasses =
  "h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none disabled:opacity-60";

interface InviteFormValues {
  displayName: string;
  email: string;
}

const EMPTY_VALUES: InviteFormValues = { displayName: "", email: "" };

/**
 * 교사 초대 Modal.
 *
 * 기관 ID는 서버에서 내려준 값을 hidden으로 그대로 보내고,
 * Server Action이 다시 UUID 형식과 기관 존재 여부를 검증한다.
 *
 * ★ 입력을 controlled로 둔 이유 (LessonFormDialog R3 이후 프로젝트 공통 패턴)
 *   React 19는 <form action={fn}> 제출이 끝나면 성공/실패와 무관하게 form.reset()을 실행한다.
 *   uncontrolled로 두면 서버가 "이미 이 기관의 원장으로 등록된 계정입니다"를 돌려줘도
 *   입력한 이름과 이메일이 전부 지워져 처음부터 다시 쳐야 한다.
 *   (원장 초대 Dialog는 이 패턴 도입 전에 만들어져 아직 uncontrolled다 —
 *    이번 작업 범위 밖이라 건드리지 않았다.)
 */
export function TeacherInviteDialog({
  organizationId,
  variant = "primary",
}: TeacherInviteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<InviteFormValues>(EMPTY_VALUES);

  /** 값을 고치기 시작하면 지난 오류는 현재 입력을 설명하지 못하므로 감춘다. */
  const [isMessageHidden, setIsMessageHidden] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (prevState: TeacherInviteState, formData: FormData) => {
      setIsMessageHidden(false);

      const result = await inviteTeacherAction(prevState, formData);
      if (result.phase === "success") setIsOpen(false);
      return result;
    },
    TEACHER_INVITE_INITIAL_STATE,
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function updateValue<K extends keyof InviteFormValues>(
    key: K,
    value: InviteFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setIsMessageHidden(true);
  }

  function openDialog() {
    setValues(EMPTY_VALUES);
    setIsMessageHidden(true);
    setIsOpen(true);
  }

  const visibleMessage = isMessageHidden ? null : state.message;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={buttonClasses[variant]}
      >
        교사 초대
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
            aria-labelledby="invite-teacher-title"
            className="relative w-full max-w-[460px] rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <div>
                <h2
                  id="invite-teacher-title"
                  className="text-[17px] font-bold text-navy"
                >
                  교사 초대
                </h2>
                <p className="mt-0.5 text-[12px] text-navy/50">
                  입력한 이메일로 초대 메일이 발송됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="교사 초대 닫기"
                className="shrink-0 rounded-lg border border-navy/15 px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
              >
                닫기
              </button>
            </header>

            <form action={formAction} className="flex flex-col gap-4 px-5 py-5">
              <input
                type="hidden"
                name="organizationId"
                value={organizationId}
              />

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="teacher-name"
                >
                  교사 이름 <span className="text-trust-blue">*</span>
                </label>
                <input
                  id="teacher-name"
                  name="display_name"
                  type="text"
                  required
                  maxLength={50}
                  disabled={isPending}
                  placeholder="예) 김교사"
                  value={values.displayName}
                  onChange={(event) =>
                    updateValue("displayName", event.target.value)
                  }
                  className={inputClasses}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-semibold text-navy/60"
                  htmlFor="teacher-email"
                >
                  이메일 <span className="text-trust-blue">*</span>
                </label>
                <input
                  id="teacher-email"
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  disabled={isPending}
                  placeholder="teacher@example.com"
                  value={values.email}
                  onChange={(event) => updateValue("email", event.target.value)}
                  className={inputClasses}
                />
                <p className="text-[12px] text-navy/45">
                  초대받은 교사가 메일 링크에서 직접 비밀번호를 설정합니다.
                </p>
              </div>

              {visibleMessage ? (
                <p
                  role="alert"
                  className={`rounded-lg border px-3 py-2 text-[13px] ${
                    state.phase === "error"
                      ? "border-soft-coral/50 bg-soft-coral/10 text-navy"
                      : "border-soft-green/50 bg-soft-green/15 text-navy"
                  }`}
                >
                  {visibleMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="mt-1 h-11 rounded-lg bg-navy text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "초대 중…" : "초대 메일 보내기"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
