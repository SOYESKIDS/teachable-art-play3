"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  appButtonDangerOutline,
  appButtonGhost,
  appButtonPrimary,
  appButtonSecondary,
  noticeDanger,
  noticeSuccess,
  noticeWarning,
} from "@/components/ui/app-button";
import { fieldLabel, fieldTextarea } from "@/components/ui/field";
import { formatLessonOrder } from "@/lib/admin/class-session";
import { cancelStaffSessionAction, recoverStaffSessionAction } from "@/lib/staff/session-actions";
import { STAFF_SESSION_FORM_INITIAL_STATE, type StaffSessionFormState } from "@/lib/staff/session-state";
import type { StaffSessionItem } from "@/types/staff-session";

export type SessionActorRole = "teacher" | "director";

interface SessionActionsProps {
  session: StaffSessionItem;
  actorRole: SessionActorRole;
  /** Class Mode 기준 경로 (교사: /teacher/sessions) */
  classModeBasePath?: string;
}

type DialogTarget = "cancel" | "recovery";

/**
 * 수업 카드의 행동 (DEC-046 · DEC-047 · DEC-085 · DEC-098).
 *
 * 교사
 *   예정   → [수업 준비] (BEFORE 로 이동 · 카드에서 바로 시작하지 않는다)
 *   진행 중 → [수업 이어서] (DURING)
 * 원장
 *   예정   → 시작 · 완료 버튼 없음
 *   진행 중 → [복구 처리] (정상 흐름이 아닌 예외 · 사유 필수 · 일반 버튼과 다른 모양)
 * 공통
 *   [수업 취소] — 현재 확정된 취소 규칙 그대로 (확대 없음)
 *
 * "수업 완료" 버튼은 어디에도 없다. scheduled → completed 는 불가능하다.
 */
export function SessionActions({ session, actorRole, classModeBasePath }: SessionActionsProps) {
  const [target, setTarget] = useState<DialogTarget | null>(null);

  const [cancelState, cancelAction, cancelPending] = useActionState(
    async (prev: StaffSessionFormState, formData: FormData) => {
      const result = await cancelStaffSessionAction(prev, formData);
      if (result.phase === "success") setTarget(null);
      return result;
    },
    STAFF_SESSION_FORM_INITIAL_STATE,
  );

  const [recoveryState, recoveryAction, recoveryPending] = useActionState(
    async (prev: StaffSessionFormState, formData: FormData) => {
      const result = await recoverStaffSessionAction(prev, formData);
      if (result.phase === "success") setTarget(null);
      return result;
    },
    STAFF_SESSION_FORM_INITIAL_STATE,
  );

  const orgQuery = `?org=${encodeURIComponent(session.organization_id)}`;
  const busy = cancelPending || recoveryPending;
  const context = `${session.className ?? "반 정보 없음"} · ${formatLessonOrder(session.weekNo, session.sessionNo)}`;
  const lastMessage = recoveryState.message ?? cancelState.message;
  const lastPhase = recoveryState.message ? recoveryState.phase : cancelState.phase;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {actorRole === "teacher" && classModeBasePath && session.status === "scheduled" && session.parentsActive ? (
          <Link href={`${classModeBasePath}/${session.id}/before${orgQuery}`} className={appButtonPrimary}>
            수업 준비
          </Link>
        ) : null}

        {actorRole === "teacher" && classModeBasePath && session.status === "in_progress" ? (
          <Link href={`${classModeBasePath}/${session.id}/during${orgQuery}`} className={appButtonPrimary}>
            수업 이어서
          </Link>
        ) : null}

        {actorRole === "director" && session.status === "in_progress" ? (
          <button type="button" onClick={() => setTarget("recovery")} disabled={busy} className={appButtonDangerOutline}>
            복구 처리
          </button>
        ) : null}

        <button type="button" onClick={() => setTarget("cancel")} disabled={busy} className={appButtonGhost}>
          수업 취소
        </button>
      </div>

      {session.status === "scheduled" && !session.parentsActive ? (
        <p className="mt-2 text-caption leading-relaxed text-ink-muted">
          반 보관 또는 프로그램 배정 종료로 진행할 수 없는 수업입니다. 필요하면 수업 취소로 정리해 주세요.
        </p>
      ) : null}

      {lastMessage && target === null ? (
        <p role="status" className={`mt-2 ${lastPhase === "error" ? noticeDanger : noticeSuccess}`}>
          {lastMessage}
        </p>
      ) : null}

      <Dialog
        open={target === "cancel"}
        onClose={() => setTarget(null)}
        title="수업 취소"
        description={context}
        busy={cancelPending}
      >
        <form action={cancelAction} className="flex flex-col gap-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <p className="text-body-sm leading-relaxed text-ink">
            취소한 수업은 다시 진행할 수 없습니다. 이미 남긴 기록은 이력에 그대로 남습니다.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`cancel-reason-${session.id}`} className={fieldLabel}>
              취소 사유 (선택)
            </label>
            <textarea
              id={`cancel-reason-${session.id}`}
              name="reason"
              maxLength={500}
              className={`${fieldTextarea} min-h-[88px]`}
            />
          </div>
          {cancelState.phase === "error" && cancelState.message ? (
            <p role="alert" className={noticeDanger}>
              {cancelState.message}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="submit" disabled={cancelPending} className={`${appButtonPrimary} sm:flex-1`}>
              {cancelPending ? "처리 중…" : "수업 취소하기"}
            </button>
            <button type="button" onClick={() => setTarget(null)} disabled={cancelPending} className={`${appButtonSecondary} sm:flex-1`}>
              돌아가기
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={target === "recovery"}
        onClose={() => setTarget(null)}
        title="진행 중 수업 복구 처리"
        description={context}
        busy={recoveryPending}
      >
        <form action={recoveryAction} className="flex flex-col gap-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <p className={noticeWarning}>
            정상적인 수업 종료가 아닌 복구 처리입니다. 담당 교사가 [수업 마치기]를 할 수 없는 경우에만 사용해 주세요.
            처리 사유와 처리자가 기록됩니다.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`recovery-reason-${session.id}`} className={fieldLabel}>
              복구 처리 사유 (필수)
            </label>
            <textarea
              id={`recovery-reason-${session.id}`}
              name="reason"
              required
              maxLength={500}
              aria-describedby={`recovery-reason-help-${session.id}`}
              className={`${fieldTextarea} min-h-[88px]`}
            />
            <p id={`recovery-reason-help-${session.id}`} className="text-caption text-ink-muted">
              아이의 이름이나 기록 내용은 적지 말아 주세요.
            </p>
          </div>
          {recoveryState.phase === "error" && recoveryState.message ? (
            <p role="alert" className={noticeDanger}>
              {recoveryState.message}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="submit" disabled={recoveryPending} className={`${appButtonDangerOutline} sm:flex-1`}>
              {recoveryPending ? "처리 중…" : "복구 처리"}
            </button>
            <button type="button" onClick={() => setTarget(null)} disabled={recoveryPending} className={`${appButtonSecondary} sm:flex-1`}>
              돌아가기
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
