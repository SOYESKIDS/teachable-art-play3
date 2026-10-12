"use client";

import { useActionState } from "react";
import { runNotificationDeliveryAction } from "./notification-actions";
import {
  NOTIFICATION_RUN_INITIAL,
  type NotificationRunState,
} from "./notification-run-state";
import {
  NOTIFICATION_ERROR_LABEL,
  type NotificationIssueList,
} from "@/lib/admin/lead-notification-delivery";

/**
 * 알림 전달 실행 · 실패 확인 패널 — 사용자 지시 항목 6.
 *
 * ★ 실제 발송은 일어나지 않는다. adapter 가 비활성이다.
 *   버튼 문구를 "발송" 이 아니라 "전달 처리 실행" 으로 두고, 결과도
 *   "집어서 기록했다" 로 말한다. 보내지 않은 것을 보냈다고 쓰지 않는다.
 *
 * ★ 실패·멈춤 목록을 보여 준다.
 *   재시도 대기(attempt_count > 0), 처리기가 잡고 멈춘 행(sending), 실패 확정을
 *   함께 보여 준다. 알림 본문·연락처는 목록에 없다.
 */

async function submit(): Promise<NotificationRunState> {
  return runNotificationDeliveryAction();
}

export function NotificationRunPanel({ issues }: { issues: NotificationIssueList }) {
  const [state, formAction, pending] = useActionState(submit, NOTIFICATION_RUN_INITIAL);

  return (
    <section className="rounded-xl border border-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-label font-bold text-ink">알림 전달 처리</h2>
        <p className="text-caption text-ink-muted">
          실제 발송은 메일 provider 설정 후에 시작됩니다
        </p>
      </div>

      <form action={formAction} className="mt-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-lg border border-control-border px-4 text-label font-semibold text-navy transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "처리 중…" : "전달 처리 실행"}
        </button>
      </form>

      {state.phase !== "idle" && state.message && (
        <p
          role="status"
          className={`mt-3 text-caption leading-relaxed ${
            state.phase === "error" ? "text-danger" : "text-ink-muted"
          }`}
        >
          {state.message}
        </p>
      )}

      {state.summary && (
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {[
            ["되돌림", state.summary.reclaimed],
            ["집음", state.summary.claimed],
            ["전달", state.summary.sent],
            ["재시도", state.summary.retried],
            ["실패", state.summary.failed],
            ["동시 처리 충돌", state.summary.conflicts],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-baseline gap-1.5">
              <dt className="text-caption text-ink-muted">{label}</dt>
              <dd className="text-body-sm font-semibold tabular-nums text-ink">
                {String(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* 실패·멈춤 목록 */}
      {issues.notInstalled ? (
        <p className="mt-4 text-caption text-warning-text">
          전달 경로 migration 이 적용되지 않아 실패 목록을 확인할 수 없습니다.
        </p>
      ) : !issues.ok ? (
        <p className="mt-4 text-caption text-danger">
          실패 목록을 불러오지 못했습니다.
        </p>
      ) : issues.issues.length === 0 ? (
        <p className="mt-4 text-caption text-ink-muted">
          실패하거나 멈춘 알림이 없습니다.
        </p>
      ) : (
        <div className="mt-4">
          <p className="text-caption font-semibold text-ink">
            확인이 필요한 알림 {issues.issues.length}건
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {issues.issues.map((issue) => (
              <li
                key={issue.outboxId}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg border border-line px-3 py-2"
              >
                <span className="rounded-full border border-line px-2 py-0.5 text-micro font-bold text-ink-muted">
                  {issue.status}
                </span>
                <span className="text-caption tabular-nums text-ink-muted">
                  시도 {issue.attemptCount}회
                </span>
                {issue.lastErrorCode && (
                  <span className="text-caption text-warning-text">
                    {NOTIFICATION_ERROR_LABEL[issue.lastErrorCode] ??
                      issue.lastErrorCode}
                  </span>
                )}
                {issue.nextAttemptAt && issue.status === "pending" && (
                  <span className="text-caption tabular-nums text-ink-muted">
                    다음 시도 {issue.nextAttemptAt.slice(0, 16).replace("T", " ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-ink-muted">
            목록에는 문의 원문과 연락처가 포함되지 않습니다. 상세는 아래 문의 목록에서
            확인해 주세요.
          </p>
        </div>
      )}
    </section>
  );
}
