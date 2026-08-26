import {
  CLASS_SESSION_STATUS_BADGE_CLASSES,
  CLASS_SESSION_STATUS_LABELS,
  formatLessonOrder,
  formatSessionDate,
  isTerminalSessionStatus,
} from "@/lib/admin/class-session";
import {
  CURRICULUM_STATUS_BADGE_CLASSES,
  CURRICULUM_STATUS_LABELS,
} from "@/lib/admin/curriculum";
import type {
  ClassSessionItem,
  ClassSessionSummary,
  SchedulableLessonOption,
} from "@/types/class-session";
import { ClassSessionManageDialog } from "./ClassSessionManageDialog";
import { ClassSessionRescheduleDialog } from "./ClassSessionRescheduleDialog";
import { ClassSessionScheduleDialog } from "./ClassSessionScheduleDialog";

interface ClassSessionSectionProps {
  organizationId: string;
  assignmentId: string;
  programId: string;
  sessions: ClassSessionItem[];
  summary: ClassSessionSummary;
  schedulableLessons: SchedulableLessonOption[];
  hasPublishedLesson: boolean;
  /** 배정이 active이고 반·프로그램도 유효한가 — 신규 등록/수업 시작의 전제 */
  canOpenNewSession: boolean;
  hasError: boolean;
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-navy/10 bg-surface-soft px-3.5 py-2.5">
      <dt className="text-[11px] font-semibold text-navy/45">{label}</dt>
      <dd className="mt-0.5 text-[20px] font-bold tabular-nums text-navy">
        {value.toLocaleString("ko-KR")}
      </dd>
    </div>
  );
}

function SessionStatusBadge({
  status,
}: {
  status: ClassSessionItem["status"];
}) {
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[12px] font-semibold ${CLASS_SESSION_STATUS_BADGE_CLASSES[status]}`}
    >
      {CLASS_SESSION_STATUS_LABELS[status]}
    </span>
  );
}

/** 수업 당시 published였어도 지금은 draft/archived일 수 있어 현재 상태를 그대로 보여준다 */
function LessonStatusBadge({
  status,
}: {
  status: ClassSessionItem["lessonStatus"];
}) {
  if (!status) return <span className="text-navy/40">—</span>;

  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[12px] font-semibold ${CURRICULUM_STATUS_BADGE_CLASSES[status]}`}
    >
      {CURRICULUM_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * 이 수업 행에서 "수업 시작"과 "일정 변경"이 가능한가.
 *
 * 두 동작 모두 재개 경로라 부모가 지금도 유효해야 한다.
 * 차시가 개별적으로 보관되었을 수도 있어 행 단위로 한 번 더 본다.
 * (실제 차단은 Server Action과 DB trigger가 하고, 여기서는 버튼을 감춘다.)
 */
function canRestart(
  session: ClassSessionItem,
  canOpenNewSession: boolean,
): boolean {
  return canOpenNewSession && session.lessonStatus === "published";
}

/**
 * 수업 실행 이력 Section.
 *
 * 완료·취소 이력도 함께 보여준다. 지난 수업 기록은 지우지 않는다.
 * 상태 필터를 두지 않은 이유: 한 배정의 수업 수는 프로그램 차시 수(보통 8~16)
 * 규모라 전부 한 화면에서 보는 편이 오히려 파악이 빠르다.
 */
export function ClassSessionSection({
  organizationId,
  assignmentId,
  programId,
  sessions,
  summary,
  schedulableLessons,
  hasPublishedLesson,
  canOpenNewSession,
  hasError,
}: ClassSessionSectionProps) {
  return (
    <section className="rounded-xl border border-navy/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-navy">수업 실행 이력</h2>
          <p className="mt-1 text-[12px] text-navy/50">
            이 배정으로 실행한 차시별 수업입니다. 완료·취소한 수업도 그대로
            남습니다.
          </p>
        </div>
        {!hasError && canOpenNewSession && sessions.length > 0 ? (
          <ClassSessionScheduleDialog
            organizationId={organizationId}
            assignmentId={assignmentId}
            programId={programId}
            schedulableLessons={schedulableLessons}
            hasPublishedLesson={hasPublishedLesson}
            variant="outline"
          />
        ) : null}
      </div>

      {hasError ? (
        <p className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-6 text-center text-[13px] text-navy/55">
          수업 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <SummaryItem label="전체" value={summary.total} />
            <SummaryItem label="예정" value={summary.scheduled} />
            <SummaryItem label="진행 중" value={summary.inProgress} />
            <SummaryItem label="완료" value={summary.completed} />
            <SummaryItem label="취소" value={summary.cancelled} />
          </dl>

          {sessions.length === 0 ? (
            <div className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-navy">
                아직 등록된 수업 일정이 없습니다.
              </p>
              <p className="mt-1 text-[13px] text-navy/50">
                {canOpenNewSession
                  ? "게시된 차시를 골라 첫 수업 일정을 등록하세요."
                  : "이 배정으로는 새 수업을 등록할 수 없습니다."}
              </p>
              {canOpenNewSession ? (
                <div className="mt-4 flex justify-center">
                  <ClassSessionScheduleDialog
                    organizationId={organizationId}
                    assignmentId={assignmentId}
                    programId={programId}
                    schedulableLessons={schedulableLessons}
                    hasPublishedLesson={hasPublishedLesson}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {/* PC: compact table */}
              <div className="mt-4 hidden overflow-hidden rounded-lg border border-navy/10 lg:block">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface-soft text-navy/50">
                      <th className="px-4 py-2.5 text-left font-semibold">
                        주차 · 차시
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        차시명
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        예정일
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        수업 상태
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        차시 상태
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr
                        key={session.id}
                        className="border-t border-navy/8 bg-white"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">
                          {formatLessonOrder(session.weekNo, session.sessionNo)}
                        </td>
                        <td className="max-w-[240px] truncate px-4 py-3 text-navy/75">
                          {session.lessonTitle ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-navy/70">
                          {formatSessionDate(session.scheduled_date)}
                        </td>
                        <td className="px-4 py-3">
                          <SessionStatusBadge status={session.status} />
                        </td>
                        <td className="px-4 py-3">
                          <LessonStatusBadge status={session.lessonStatus} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {isTerminalSessionStatus(session.status) ? (
                            <span className="text-[12px] text-navy/40">
                              변경 불가
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-3">
                              <ClassSessionManageDialog
                                organizationId={organizationId}
                                assignmentId={assignmentId}
                                session={session}
                                parentsActive={canRestart(
                                  session,
                                  canOpenNewSession,
                                )}
                              />
                              {session.status === "scheduled" &&
                              canRestart(session, canOpenNewSession) ? (
                                <ClassSessionRescheduleDialog
                                  organizationId={organizationId}
                                  assignmentId={assignmentId}
                                  session={session}
                                />
                              ) : null}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일: 카드 stack */}
              <ul className="mt-4 flex flex-col gap-2 lg:hidden">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-lg border border-navy/10 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-navy/50">
                          {formatLessonOrder(session.weekNo, session.sessionNo)}
                        </p>
                        <p className="mt-0.5 break-words text-[14px] font-semibold text-navy">
                          {session.lessonTitle ?? "—"}
                        </p>
                        <p className="mt-0.5 text-[12px] text-navy/50">
                          예정 {formatSessionDate(session.scheduled_date)}
                        </p>
                      </div>
                      <SessionStatusBadge status={session.status} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-navy/8 pt-2.5">
                      <span className="text-[12px] text-navy/45">
                        차시{" "}
                        {session.lessonStatus
                          ? CURRICULUM_STATUS_LABELS[session.lessonStatus]
                          : "—"}
                      </span>
                      {isTerminalSessionStatus(session.status) ? (
                        <span className="text-[12px] text-navy/40">
                          변경 불가
                        </span>
                      ) : (
                        <span className="flex items-center gap-3">
                          <ClassSessionManageDialog
                            organizationId={organizationId}
                            assignmentId={assignmentId}
                            session={session}
                            parentsActive={canRestart(
                              session,
                              canOpenNewSession,
                            )}
                          />
                          {session.status === "scheduled" &&
                          canRestart(session, canOpenNewSession) ? (
                            <ClassSessionRescheduleDialog
                              organizationId={organizationId}
                              assignmentId={assignmentId}
                              session={session}
                            />
                          ) : null}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
