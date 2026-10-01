import type { ReactNode } from "react";
import type { StaffSessionItem, TodaySessionBoard } from "@/types/staff-session";
import { ErrorState, EmptyState } from "@/components/ui/surface";
import { SessionCard } from "./SessionCard";
import type { SessionActorRole } from "./SessionActions";

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
  /** 교사 = Class Mode 진입 · 원장 = 복구 처리 · 취소 (DEC-046 · DEC-085) */
  actorRole: SessionActorRole;
  /** 교사 Class Mode 기준 경로 (예: /teacher/sessions) */
  classModeBasePath?: string;
}

const KPI_DOT = {
  scheduled: "bg-info",
  active: "bg-navy",
  done: "bg-success",
  cancelled: "bg-ink-subtle",
} as const;

function KpiItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof KPI_DOT;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3.5 sm:px-5 sm:py-4">
      <dt className="flex items-center gap-1.5 text-caption font-semibold text-ink-muted">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${KPI_DOT[tone]}`} />
        {label}
      </dt>
      <dd className="mt-1.5 text-headline-lg font-bold tabular-nums leading-none text-navy">
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
  emptyHint,
  attendanceBasePath,
  observationBasePath,
  actorRole,
  classModeBasePath,
}: {
  title: string;
  description?: string;
  sessions: StaffSessionItem[];
  showClassName: boolean;
  emptyText?: string;
  emptyHint?: string;
  attendanceBasePath?: string;
  observationBasePath?: string;
  actorRole: SessionActorRole;
  classModeBasePath?: string;
}) {
  if (sessions.length === 0 && !emptyText) return null;

  return (
    <section className="mt-9">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="text-title-sm font-bold text-navy">{title}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-caption font-semibold tabular-nums text-ink-muted ring-1 ring-line">
          {sessions.length.toLocaleString("ko-KR")}건
        </span>
      </div>
      {description ? (
        <p className="mt-1 max-w-[70ch] text-caption leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}

      {sessions.length === 0 ? (
        <div className="mt-3">
          <EmptyState text={emptyText ?? ""} hint={emptyHint} />
        </div>
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
              actorRole={actorRole}
              classModeBasePath={classModeBasePath}
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
  actorRole,
  classModeBasePath,
}: TodaySessionBoardProps): ReactNode {
  if (hasError) {
    return (
      <ErrorState text="수업 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." />
    );
  }

  if (noClassNotice) {
    return (
      <EmptyState text={noClassNotice} />
    );
  }

  const { summary } = board;

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiItem label="오늘 예정" value={summary.scheduledToday} tone="scheduled" />
        <KpiItem label="진행 중" value={summary.inProgress} tone="active" />
        <KpiItem label="오늘 완료" value={summary.completedToday} tone="done" />
        <KpiItem label="오늘 취소" value={summary.cancelledToday} tone="cancelled" />
      </dl>

      <Section
        title="오늘의 수업"
        sessions={board.todaySessions}
        showClassName={showClassName}
        emptyText="오늘 예정된 수업이 없습니다."
        emptyHint="아직 마치지 않았거나 시작하지 않은 이전 날짜 수업이 있으면 아래에 함께 보입니다. 지난 수업은 수업 이력에서 볼 수 있습니다."
        attendanceBasePath={attendanceBasePath}
        observationBasePath={observationBasePath}
        actorRole={actorRole}
        classModeBasePath={classModeBasePath}
      />

      <Section
        title="진행 중인 다른 날 수업"
        description="아직 마치지 않은 수업입니다. 담당 교사는 [수업 이어서]에서 마칠 수 있습니다."
        sessions={board.ongoingFromOtherDays}
        showClassName={showClassName}
        attendanceBasePath={attendanceBasePath}
        observationBasePath={observationBasePath}
        actorRole={actorRole}
        classModeBasePath={classModeBasePath}
      />

      <Section
        title="지난 예정 수업"
        description="예정일이 지났지만 아직 시작하지 않은 수업입니다. 진행할 수업은 [수업 준비]에서 시작하고, 진행하지 않은 수업은 취소로 정리해 주세요."
        sessions={board.overdueSessions}
        showClassName={showClassName}
        attendanceBasePath={attendanceBasePath}
        observationBasePath={observationBasePath}
        actorRole={actorRole}
        classModeBasePath={classModeBasePath}
      />

      <Section
        title="일정 미정 수업"
        description="예정일이 아직 정해지지 않은 수업입니다."
        sessions={board.undatedSessions}
        showClassName={showClassName}
        attendanceBasePath={attendanceBasePath}
        observationBasePath={observationBasePath}
        actorRole={actorRole}
        classModeBasePath={classModeBasePath}
      />
    </>
  );
}
