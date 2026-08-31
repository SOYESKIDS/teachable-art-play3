import type { ReactNode } from "react";
import type { StaffSessionItem, TodaySessionBoard } from "@/types/staff-session";
import { SessionCard } from "./SessionCard";

interface TodaySessionBoardProps {
  board: TodaySessionBoard;
  /** 교사 화면은 자기 반만 보므로 반 이름 노출을 줄일 수 있다 */
  showClassName?: boolean;
  /** 담당 반이 아예 없을 때의 안내 (교사 전용) */
  noClassNotice?: string;
  hasError: boolean;
  /** 출결 상세 route의 기준 경로 (예: /teacher/sessions) */
  attendanceBasePath?: string;
  /**
   * 관찰기록 상세 route의 기준 경로 (예: /teacher/sessions).
   *
   * ★ 넘기지 않으면 관찰기록 버튼이 생기지 않는다.
   *   08B에서는 교사 화면만 넘긴다 — 원장 화면(08C)은 그대로 둔다.
   */
  observationBasePath?: string;
}

function KpiItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white px-4 py-3">
      <dt className="text-[11px] font-semibold text-navy/45">{label}</dt>
      <dd className="mt-0.5 text-[24px] font-bold tabular-nums leading-none text-navy">
        {value.toLocaleString("ko-KR")}
      </dd>
    </div>
  );
}

/** 출결 상세 링크. basePath가 없으면 출결 버튼을 노출하지 않는다. */
function buildAttendanceHref(
  basePath: string | undefined,
  session: StaffSessionItem,
): string | undefined {
  if (!basePath) return undefined;

  return `${basePath}/${session.id}/attendance?org=${encodeURIComponent(
    session.organization_id,
  )}`;
}

/** 관찰기록 상세 링크. basePath가 없으면 관찰기록 버튼을 노출하지 않는다. */
function buildObservationHref(
  basePath: string | undefined,
  session: StaffSessionItem,
): string | undefined {
  if (!basePath) return undefined;

  return `${basePath}/${session.id}/observations?org=${encodeURIComponent(
    session.organization_id,
  )}`;
}

function Section({
  title,
  description,
  sessions,
  showClassName,
  emptyText,
  attendanceBasePath,
  observationBasePath,
}: {
  title: string;
  description?: string;
  sessions: StaffSessionItem[];
  showClassName: boolean;
  emptyText?: string;
  attendanceBasePath?: string;
  observationBasePath?: string;
}) {
  if (sessions.length === 0 && !emptyText) return null;

  return (
    <section className="mt-7">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-[15px] font-bold text-navy">{title}</h2>
        <span className="text-[13px] tabular-nums text-navy/45">
          {sessions.length.toLocaleString("ko-KR")}건
        </span>
      </div>
      {description ? (
        <p className="mt-1 text-[12px] leading-relaxed text-navy/50">
          {description}
        </p>
      ) : null}

      {sessions.length === 0 ? (
        <p className="mt-3 rounded-xl border border-navy/10 bg-white px-4 py-8 text-center text-[14px] text-navy/50">
          {emptyText}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              showClassName={showClassName}
              attendanceHref={buildAttendanceHref(attendanceBasePath, session)}
              observationHref={buildObservationHref(
                observationBasePath,
                session,
              )}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * 오늘의 수업 화면 본문 (원장·교사 공용).
 *
 * 갈래를 넷으로 나눈 이유
 *   "오늘 날짜 수업"만 보여 주면 어제 잡아 두고 진행하지 않은 수업과
 *   날짜를 아직 정하지 않은 수업이 화면 어디에도 나타나지 않는다.
 *   교사가 놓치면 그대로 미결로 남으므로 아래 세 갈래를 함께 띄운다.
 *   대신 순서를 오늘 → 진행 중(다른 날) → 지난 예정 → 일정 미정으로 두어
 *   가장 먼저 볼 것이 맨 위에 오게 한다.
 */
export function TodaySessionBoardView({
  board,
  showClassName = true,
  noClassNotice,
  hasError,
  attendanceBasePath,
  observationBasePath,
}: TodaySessionBoardProps): ReactNode {
  if (hasError) {
    return (
      <p className="rounded-xl border border-navy/10 bg-white px-4 py-12 text-center text-[14px] text-navy/55">
        수업 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </p>
    );
  }

  if (noClassNotice) {
    return (
      <p className="rounded-xl border border-navy/10 bg-white px-4 py-12 text-center text-[14px] text-navy/55">
        {noClassNotice}
      </p>
    );
  }

  const { summary } = board;

  return (
    <>
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <KpiItem label="오늘 예정" value={summary.scheduledToday} />
        <KpiItem label="진행 중" value={summary.inProgress} />
        <KpiItem label="오늘 완료" value={summary.completedToday} />
        <KpiItem label="오늘 취소" value={summary.cancelledToday} />
      </dl>

      <Section
        title="오늘의 수업"
        sessions={board.todaySessions}
        showClassName={showClassName}
        emptyText="오늘 예정된 수업이 없습니다."
        attendanceBasePath={attendanceBasePath}
        observationBasePath={observationBasePath}
      />

      <Section
        title="진행 중인 다른 날 수업"
        description="아직 완료·취소 처리하지 않은 수업입니다."
        sessions={board.ongoingFromOtherDays}
        showClassName={showClassName}
        attendanceBasePath={attendanceBasePath}
        observationBasePath={observationBasePath}
      />

      <Section
        title="지난 예정 수업"
        description="예정일이 지났지만 아직 시작하지 않은 수업입니다. 진행했다면 완료로, 하지 않았다면 취소로 정리해주세요."
        sessions={board.overdueSessions}
        showClassName={showClassName}
        attendanceBasePath={attendanceBasePath}
        observationBasePath={observationBasePath}
      />

      <Section
        title="일정 미정 수업"
        description="예정일이 아직 정해지지 않은 수업입니다."
        sessions={board.undatedSessions}
        showClassName={showClassName}
        attendanceBasePath={attendanceBasePath}
        observationBasePath={observationBasePath}
      />
    </>
  );
}
