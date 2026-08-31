"use client";

import { useMemo, useState } from "react";
import { CLASS_SESSION_STATUS_LABELS } from "@/lib/admin/class-session";
import type { ClassSessionStatus } from "@/types/class-session";
import type {
  ClassFilterOption,
  SessionHistorySummary,
  StaffSessionItem,
} from "@/types/staff-session";
import { SessionCard } from "./SessionCard";

interface SessionHistoryBoardProps {
  sessions: StaffSessionItem[];
  summary: SessionHistorySummary;
  classOptions: ClassFilterOption[];
  /** 교사 화면은 담당 반이 보통 하나라 반 필터를 감출 수 있다 */
  showClassFilter?: boolean;
  hasError: boolean;
  /** 출결 상세 route의 기준 경로 (예: /director/sessions) */
  attendanceBasePath?: string;
  /**
   * 관찰기록 상세 route의 기준 경로 (예: /teacher/sessions).
   *
   * ★ 넘기지 않으면 관찰기록 버튼이 생기지 않는다.
   *   08B에서는 교사 이력 화면만 넘긴다 — 원장 이력 화면(08C)은 그대로 둔다.
   */
  observationBasePath?: string;
}

const controlClasses =
  "h-11 rounded-lg border border-navy/15 bg-white px-3 text-[14px] font-medium text-navy transition-colors focus:border-trust-blue focus:outline-none";

const STATUS_FILTERS: readonly (ClassSessionStatus | "all")[] = [
  "all",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];

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

/**
 * 수업 이력 화면 (원장·교사 공용).
 *
 * 상태·반 필터를 위해 Client Component다. 한 기관의 수업 수는
 * 반 수 × 프로그램 차시 수 규모라 이미 받아온 배열을 거르는 편이
 * URL searchParams 왕복보다 반응이 빠르다(원아 관리 Section과 같은 판단).
 *
 * 여기서는 상태를 바꾸지 않는다 — 운영 동작은 "오늘의 수업"에서만 한다.
 * 이력 화면에서 실수로 완료를 누르는 것을 막기 위한 의도적 분리다.
 */
export function SessionHistoryBoard({
  sessions,
  summary,
  classOptions,
  showClassFilter = true,
  hasError,
  attendanceBasePath,
  observationBasePath,
}: SessionHistoryBoardProps) {
  const [statusFilter, setStatusFilter] = useState<ClassSessionStatus | "all">(
    "all",
  );
  const [classFilter, setClassFilter] = useState<string>("all");

  const visible = useMemo(
    () =>
      sessions.filter(
        (session) =>
          (statusFilter === "all" || session.status === statusFilter) &&
          (classFilter === "all" || session.class_id === classFilter),
      ),
    [sessions, statusFilter, classFilter],
  );

  if (hasError) {
    return (
      <p className="rounded-xl border border-navy/10 bg-white px-4 py-12 text-center text-[14px] text-navy/55">
        수업 이력을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </p>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="rounded-xl border border-navy/10 bg-white px-4 py-12 text-center text-[14px] text-navy/55">
        아직 진행한 수업이 없습니다.
      </p>
    );
  }

  return (
    <>
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {(
          [
            ["전체", summary.total],
            ["예정", summary.scheduled],
            ["진행 중", summary.inProgress],
            ["완료", summary.completed],
            ["취소", summary.cancelled],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-navy/10 bg-white px-4 py-3"
          >
            <dt className="text-[11px] font-semibold text-navy/45">{label}</dt>
            <dd className="mt-0.5 text-[22px] font-bold tabular-nums leading-none text-navy">
              {value.toLocaleString("ko-KR")}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="history-status-filter">
          수업 상태 필터
        </label>
        <select
          id="history-status-filter"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as ClassSessionStatus | "all")
          }
          className={`${controlClasses} w-full sm:w-[160px]`}
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {status === "all"
                ? "상태 전체"
                : CLASS_SESSION_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        {showClassFilter && classOptions.length > 1 ? (
          <>
            <label className="sr-only" htmlFor="history-class-filter">
              반 필터
            </label>
            <select
              id="history-class-filter"
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className={`${controlClasses} w-full sm:w-[200px]`}
            >
              <option value="all">반 전체</option>
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {option.status === "archived" ? " (보관)" : ""}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <p className="text-[13px] tabular-nums text-navy/45">
          {visible.length.toLocaleString("ko-KR")}건 표시 중
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-10 text-center text-[14px] text-navy/55">
          해당 조건의 수업이 없습니다.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              readOnly
              attendanceHref={buildAttendanceHref(attendanceBasePath, session)}
              observationHref={buildObservationHref(
                observationBasePath,
                session,
              )}
            />
          ))}
        </ul>
      )}
    </>
  );
}
