"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { appButtonSecondary } from "@/components/ui/app-button";
import { createPeriodDraftAction } from "@/lib/staff/period-report-actions";
import {
  PERIOD_QUEUE_STATUS_LABELS,
  type PeriodQueueRow,
} from "@/lib/staff/period-report-composer-queries";
import type { PeriodReportKind } from "@/lib/staff/period-report-queries";

/**
 * 기간 리포트 대기열 — 사용자 지시 항목 1.
 *
 * ★ 기능이 꺼져 있으면 버튼을 두지 않고 이유를 적는다.
 *   계약에 없거나 아직 출시되지 않은 상태를 "오류"로 보여 주지 않는다.
 *
 * ★ 이미 있는 리포트는 링크로, 없으면 만들기 form 으로 보낸다.
 *   만들기는 서버가 같은 기간의 리포트를 다시 쓰거나 새로 만든다 (중복 생성 없음).
 *
 * ★ 완료된 리포트는 "만들기"를 다시 제안하지 않는다. 열어서 수정본을 만든다.
 */

interface PeriodQueueProps {
  organizationId: string;
  assignmentId: string;
  kind: PeriodReportKind;
  /** 월간 블록 번호 */
  blockNo?: number;
  /** 학기 키 */
  termKey?: string;
  childRows: { childId: string; childName: string }[];
  rows: PeriodQueueRow[];
  canWrite: boolean;
  /** 모델이 아직 적용되지 않았다 */
  notInstalled: boolean;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={appButtonSecondary}>
      {pending ? "여는 중…" : label}
    </button>
  );
}

export function PeriodQueue({
  organizationId,
  assignmentId,
  kind,
  blockNo,
  termKey,
  childRows,
  rows,
  canWrite,
  notInstalled,
}: PeriodQueueProps) {
  const byChild = new Map(rows.map((row) => [row.childId, row]));
  const orgQuery = `?org=${encodeURIComponent(organizationId)}`;

  if (notInstalled) {
    return (
      <p className="rounded-xl border border-warning-border bg-warning-soft px-4 py-6 text-[15px] text-warning-text">
        기간 리포트 경로가 아직 적용되지 않았습니다. 적용 후 사용할 수 있습니다.
      </p>
    );
  }

  if (childRows.length === 0) {
    return (
      <p className="rounded-xl border border-hairline bg-white px-4 py-8 text-center text-[15px] text-ink">
        이 반에 원아가 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline bg-white">
      <table className="w-full min-w-[520px] border-collapse text-left text-[15px] text-ink">
        <caption className="sr-only">
          {kind === "monthly" ? `${blockNo}번째 4주 월간 요약` : `${termKey} 학기 리포트`} 대기열
        </caption>
        <thead className="bg-brand-ivory text-[14px] text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              원아
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              상태
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              <span className="sr-only">행동</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {childRows.map((child) => {
            const row = byChild.get(child.childId) ?? null;
            const status = row?.status ?? "none";
            return (
              <tr key={child.childId} className="border-t border-hairline">
                <th scope="row" className="px-4 py-3 text-left font-semibold">
                  {child.childName}
                </th>
                <td className="px-4 py-3 text-ink-muted">
                  {PERIOD_QUEUE_STATUS_LABELS[status]}
                </td>
                <td className="px-4 py-3 text-right">
                  {row?.reportId ? (
                    <Link
                      href={`/teacher/growth-reports/period/${row.reportId}${orgQuery}`}
                      className="inline-flex min-h-11 items-center text-[14px] font-semibold text-brand-navy underline"
                    >
                      열기
                    </Link>
                  ) : canWrite ? (
                    <form action={createPeriodDraftAction} className="flex justify-end">
                      <input type="hidden" name="childId" value={child.childId} />
                      <input type="hidden" name="assignmentId" value={assignmentId} />
                      <input type="hidden" name="organizationId" value={organizationId} />
                      <input type="hidden" name="kind" value={kind} />
                      {kind === "monthly" ? (
                        <input type="hidden" name="blockNo" value={String(blockNo ?? "")} />
                      ) : (
                        <input type="hidden" name="termKey" value={termKey ?? ""} />
                      )}
                      <SubmitButton label="작성 시작" />
                    </form>
                  ) : (
                    <span className="text-[14px] text-ink-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
