"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { appButtonPrimary, appButtonSecondary, noticeSuccess } from "@/components/ui/app-button";
import { createWeeklyDraftAction, createWeeklyDraftsBulkAction } from "@/lib/staff/weekly-report-actions";
import { WEEKLY_QUEUE_STATUS_LABELS, type WeeklyQueueRow } from "@/lib/staff/weekly-report-queries";

interface WeeklyQueueProps {
  organizationId: string;
  assignmentId: string;
  weekNo: number;
  rows: WeeklyQueueRow[];
  canWrite: boolean;
}

/**
 * TC-07 Weekly 대기열 (DEC-101).
 * 상태: 관찰 필요 · 작성 가능 · 작성 중 · 완료 · 숨김 · 결석(작성 대상 아님).
 * 부모에게는 이 상태 · 사유를 보여 주지 않는다.
 */
export function WeeklyQueue({ organizationId, assignmentId, weekNo, rows, canWrite }: WeeklyQueueProps) {
  const [bulkState, bulkAction, bulkPending] = useActionState(createWeeklyDraftsBulkAction, { message: null });
  const readyRows = rows.filter((row) => row.status === "ready");
  const orgQuery = `?org=${encodeURIComponent(organizationId)}`;

  return (
    <div className="flex flex-col gap-4">
      {canWrite && readyRows.length > 0 ? (
        <form action={bulkAction} className="flex justify-end">
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <input type="hidden" name="weekNo" value={weekNo} />
          {readyRows.map((row) => (
            <input key={row.childId} type="hidden" name="childId" value={row.childId} />
          ))}
          <button type="submit" disabled={bulkPending} className={appButtonPrimary}>
            {bulkPending ? "만드는 중…" : `이번 주 리포트 만들기 (${readyRows.length}명)`}
          </button>
        </form>
      ) : null}

      {bulkState.message ? (
        <p role="status" className={noticeSuccess}>
          {bulkState.message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-hairline bg-white">
        <table className="w-full min-w-[520px] border-collapse text-left text-[15px] text-ink">
          <caption className="sr-only">{weekNo}주 주간 리포트 대기열</caption>
          <thead className="bg-brand-ivory text-[14px] text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">원아</th>
              <th scope="col" className="px-4 py-3 font-semibold">상태</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                <span className="sr-only">행동</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.childId} className="border-t border-hairline">
                <th scope="row" className="px-4 py-3 font-semibold">
                  {row.childName}
                </th>
                <td className="px-4 py-3">{WEEKLY_QUEUE_STATUS_LABELS[row.status]}</td>
                <td className="px-4 py-3 text-right">
                  {row.reportId ? (
                    <Link href={`/teacher/growth-reports/weekly/${row.reportId}${orgQuery}`} className={appButtonSecondary}>
                      {row.status === "drafting" || row.status === "correcting" ? "이어서 작성" : "보기"}
                    </Link>
                  ) : row.status === "ready" && canWrite ? (
                    <form action={createWeeklyDraftAction}>
                      <input type="hidden" name="childId" value={row.childId} />
                      <input type="hidden" name="assignmentId" value={assignmentId} />
                      <input type="hidden" name="organizationId" value={organizationId} />
                      <input type="hidden" name="weekNo" value={weekNo} />
                      <CreateDraftButton />
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 행별 초안 만들기 — 전송 중 중복 제출 방지 (서버 RPC 도 같은 아이 · 주차면 기존 초안을 돌려준다) */
function CreateDraftButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={appButtonSecondary}>
      {pending ? "만드는 중" : "작성하기"}
    </button>
  );
}
