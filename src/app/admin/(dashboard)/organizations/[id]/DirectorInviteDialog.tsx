"use client";

import { fieldInput } from "@/components/ui/field";
import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { inviteDirectorAction } from "../actions";
import { DIRECTOR_INVITE_INITIAL_STATE } from "../invite-state";

interface DirectorInviteDialogProps {
  organizationId: string;
  variant?: "primary" | "outline";
}

const buttonClasses = {
  primary:
    "min-h-11 rounded-lg bg-navy px-4 py-2.5 text-caption font-semibold text-white transition-colors hover:bg-navy-deep",
  outline:
    "min-h-11 rounded-lg border border-navy/25 bg-white px-4 py-2.5 text-caption font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5",
} as const;

/**
 * 원장 초대 Modal.
 *
 * 기관 ID는 서버에서 내려준 값을 hidden으로 그대로 보내고,
 * Server Action이 다시 UUID 형식과 기관 존재 여부를 검증한다.
 */
export function DirectorInviteDialog({
  organizationId,
  variant = "primary",
}: DirectorInviteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    inviteDirectorAction,
    DIRECTOR_INVITE_INITIAL_STATE,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClasses[variant]}
      >
        원장 초대
      </button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="원장 초대"
        description="입력한 이메일로 초대 메일이 발송됩니다."
        size="md"
        busy={isPending}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input
            type="hidden"
            name="organizationId"
            value={organizationId}
          />

          <div className="flex flex-col gap-1.5">
            <label
              className="text-micro font-semibold text-ink-muted"
              htmlFor="director-name"
            >
              원장 이름 <span className="text-trust-blue">*</span>
            </label>
            <input
              id="director-name"
              name="display_name"
              type="text"
              required
              maxLength={50}
              disabled={isPending}
              placeholder="예) 김소예"
              className={fieldInput}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-micro font-semibold text-ink-muted"
              htmlFor="director-email"
            >
              이메일 <span className="text-trust-blue">*</span>
            </label>
            <input
              id="director-email"
              name="email"
              type="email"
              required
              maxLength={255}
              disabled={isPending}
              placeholder="director@example.com"
              className={fieldInput}
            />
          </div>

          {state.message ? (
            <p
              role="alert"
              className={`rounded-lg border px-3 py-2 text-caption ${
                state.phase === "error"
                  ? "border-danger-border bg-danger-soft text-danger"
                  : "border-success-border bg-success-soft text-success-text"
              }`}
            >
              {state.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 h-11 rounded-lg bg-navy text-label font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "초대 중…" : "초대 메일 보내기"}
          </button>
        </form>
      </Dialog>
    </>
  );
}
