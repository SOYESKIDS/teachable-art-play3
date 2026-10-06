import { appButtonPrimary } from "@/components/ui/app-button";
import { formatServiceDate } from "@/lib/staff/session-dates";

/**
 * 미래 수업 안내 (PHASE UAT-STABILIZATION).
 *
 * 수업일 전에는 시작 · 출결 · 관찰 · 완료를 열지 않는다. 버튼은 보이되 비활성이고,
 * 서버 행동도 같은 규칙(guardSessionWrite)으로 거절한다.
 */
export function FutureSessionNotice({
  scheduledDate,
  actionLabel,
}: {
  scheduledDate: string | null;
  /** 비활성으로 보여 줄 행동 이름 — 예: "수업 시작", "출결 저장" */
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-info-border bg-info-soft px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p id="future-session-note" className="text-body font-bold text-info-text">
          수업일에 열립니다.
        </p>
        <p className="mt-1 text-label text-ink">
          예정일 <span className="font-semibold tabular-nums">{formatServiceDate(scheduledDate)}</span> · 그 전에는 수업 안내만 미리 볼 수 있습니다.
        </p>
      </div>
      <button type="button" disabled aria-describedby="future-session-note" className={appButtonPrimary}>
        {actionLabel}
      </button>
    </div>
  );
}
