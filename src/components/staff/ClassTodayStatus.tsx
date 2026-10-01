import type { TodaySessionBoard } from "@/types/staff-session";
import { groupSessionsByClass } from "./class-groups";

/**
 * 원장 수업 운영 — 반별 오늘 현황 (화면 표시 전용).
 *
 * ★ 이미 받은 오늘 보드(board)만 반 기준으로 다시 센다. 새 질의 · 새 집계 없음.
 * ★ 숫자는 수업 상태(예정 · 진행 중 · 완료 · 취소)의 개수뿐이다.
 *   기록 유무를 탐지하거나 평가하는 문구를 두지 않는다 (STARTER 에도 그대로 보인다).
 * ★ "이전 날짜" 열은 보드의 진행 중(다른 날) · 지난 예정 수업 수다.
 */
export function ClassTodayStatus({ board }: { board: TodaySessionBoard }) {
  const earlier = [...board.ongoingFromOtherDays, ...board.overdueSessions];
  const groups = groupSessionsByClass([...board.todaySessions, ...earlier]);

  if (groups.length === 0) return null;

  const earlierIds = new Set(earlier.map((session) => session.id));

  return (
    <section
      aria-labelledby="class-today-status"
      className="rounded-2xl border border-line bg-white p-4 sm:p-5"
    >
      <h2
        id="class-today-status"
        className="text-label font-bold text-navy"
      >
        반별 오늘 현황
      </h2>
      <p className="mt-0.5 text-micro leading-relaxed text-ink-muted">
        오늘 수업의 상태별 개수입니다. 이전 날짜는 아직 마치지 않았거나 시작하지
        않은 지난 수업입니다.
      </p>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          const today = group.sessions.filter(
            (session) => !earlierIds.has(session.id),
          );
          const count = (status: (typeof today)[number]["status"]) =>
            today.filter((session) => session.status === status).length;
          const earlierCount = group.sessions.length - today.length;

          const parts = [
            ["예정", count("scheduled")],
            ["진행 중", count("in_progress")],
            ["완료", count("completed")],
            ["취소", count("cancelled")],
          ] as const;

          return (
            <li
              key={group.key}
              className="rounded-xl border border-line-soft bg-surface-warm px-3.5 py-3"
            >
              <p className="truncate text-label font-bold text-navy">
                {group.className}
                {group.archived ? (
                  <span className="ml-1 text-micro font-normal text-ink-muted">
                    (보관)
                  </span>
                ) : null}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-caption tabular-nums text-ink-muted">
                {today.length === 0 ? (
                  <span>오늘 수업 없음</span>
                ) : (
                  parts
                    .filter(([, value]) => value > 0)
                    .map(([label, value]) => (
                      <span key={label}>
                        {label}{" "}
                        <strong className="font-bold text-navy">{value}</strong>
                      </span>
                    ))
                )}
                {earlierCount > 0 ? (
                  <span className="text-warning-text">
                    이전 날짜{" "}
                    <strong className="font-bold">{earlierCount}</strong>
                  </span>
                ) : null}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
