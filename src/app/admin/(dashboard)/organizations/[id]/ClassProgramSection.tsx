"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_BADGE_CLASSES,
  ASSIGNMENT_STATUS_LABELS,
  formatAssignmentDate,
  isTerminalAssignmentStatus,
} from "@/lib/admin/class-program";
import {
  CURRICULUM_STATUS_BADGE_CLASSES,
  CURRICULUM_STATUS_LABELS,
} from "@/lib/admin/curriculum";
import type {
  AssignableClassOption,
  AssignableProgramOption,
  AssignmentStatus,
  ClassProgramAssignmentItem,
  ClassProgramSummary,
} from "@/types/class-program";
import { ClassProgramAssignDialog } from "./ClassProgramAssignDialog";
import { ClassProgramManageDialog } from "./ClassProgramManageDialog";

interface ClassProgramSectionProps {
  organizationId: string;
  assignments: ClassProgramAssignmentItem[];
  assignableClasses: AssignableClassOption[];
  assignablePrograms: AssignableProgramOption[];
  summary: ClassProgramSummary;
  hasError: boolean;
}

const controlClasses =
  "h-10 rounded-lg border border-navy/15 bg-white px-3 text-[13px] font-medium text-navy transition-colors focus:border-trust-blue focus:outline-none";

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

function StatusBadge({ status }: { status: AssignmentStatus }) {
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[12px] font-semibold ${ASSIGNMENT_STATUS_BADGE_CLASSES[status]}`}
    >
      {ASSIGNMENT_STATUS_LABELS[status]}
    </span>
  );
}

/** 배정 당시 published였어도 지금은 draft/archived일 수 있어 현재 상태를 그대로 보여준다 */
function ProgramStatusBadge({
  status,
}: {
  status: ClassProgramAssignmentItem["programStatus"];
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
 * 수업 프로그램 운영 Section.
 *
 * 상태 필터를 위해 Client Component다. 배정 수가 기관당 수십 건 규모라
 * 이미 받아온 배열을 거르는 편이 URL searchParams 왕복보다 단순하다
 * (원아 관리 Section과 같은 판단).
 *
 * 완료·취소 이력도 함께 보여준다. 과거 운영 기록은 지우지 않는다.
 */
export function ClassProgramSection({
  organizationId,
  assignments,
  assignableClasses,
  assignablePrograms,
  summary,
  hasError,
}: ClassProgramSectionProps) {
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | "all">(
    "all",
  );

  const visibleAssignments = useMemo(
    () =>
      statusFilter === "all"
        ? assignments
        : assignments.filter((item) => item.status === statusFilter),
    [assignments, statusFilter],
  );

  return (
    <section className="rounded-xl border border-navy/10 bg-white p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-navy">수업 프로그램 운영</h2>
          <p className="mt-1 text-[12px] text-navy/50">
            이 기관의 반에 게시된 수업 프로그램을 배정하고 운영 상태를
            관리합니다. 완료·취소한 이력도 그대로 남습니다.
          </p>
        </div>
        {!hasError && assignments.length > 0 ? (
          <ClassProgramAssignDialog
            organizationId={organizationId}
            assignableClasses={assignableClasses}
            assignablePrograms={assignablePrograms}
            variant="outline"
          />
        ) : null}
      </div>

      {hasError ? (
        <p className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-6 text-center text-[13px] text-navy/55">
          운영 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <SummaryItem label="운영 중" value={summary.active} />
            <SummaryItem label="완료" value={summary.completed} />
            <SummaryItem label="취소" value={summary.cancelled} />
            <SummaryItem
              label="미배정 반"
              value={summary.unassignedActiveClasses}
            />
          </dl>
          <p className="mt-2 text-[11px] text-navy/40">
            운영 중 · 완료 · 취소는 배정 건수이고, 미배정 반은 운영 중인 반 가운데
            운영 중인 프로그램이 없는 반 수입니다.
          </p>

          {assignments.length === 0 ? (
            <div className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-navy">
                아직 운영 중인 수업 프로그램이 없습니다.
              </p>
              <p className="mt-1 text-[13px] text-navy/50">
                반에 게시된 프로그램을 배정해 수업 운영을 시작하세요.
              </p>
              <div className="mt-4 flex justify-center">
                <ClassProgramAssignDialog
                  organizationId={organizationId}
                  assignableClasses={assignableClasses}
                  assignablePrograms={assignablePrograms}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <label className="sr-only" htmlFor="assignment-status-filter">
                  운영 상태 필터
                </label>
                <select
                  id="assignment-status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as AssignmentStatus | "all",
                    )
                  }
                  className={`${controlClasses} w-full sm:w-[160px]`}
                >
                  <option value="all">상태 전체</option>
                  {ASSIGNMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {ASSIGNMENT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>

                <p className="text-[12px] text-navy/45">
                  {visibleAssignments.length.toLocaleString("ko-KR")}건 표시 중
                  (전체 {assignments.length.toLocaleString("ko-KR")}건)
                </p>
              </div>

              {visibleAssignments.length === 0 ? (
                <p className="mt-3 rounded-lg border border-navy/10 bg-surface-soft px-4 py-8 text-center text-[13px] text-navy/55">
                  해당 상태의 운영 이력이 없습니다.
                </p>
              ) : (
                <>
                  {/* PC: compact table */}
                  <div className="mt-3 hidden overflow-x-auto rounded-lg border border-navy/10 lg:block">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-surface-soft text-navy/50">
                          <th className="px-4 py-2.5 text-left font-semibold">
                            반
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            프로그램
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            코드
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            시작일
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            운영 상태
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            프로그램 상태
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold">
                            관리
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleAssignments.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-navy/8 bg-white"
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">
                              {item.className ?? "—"}
                              {item.classStatus === "archived" ? (
                                <span className="ml-1 text-[12px] font-normal text-navy/40">
                                  (보관)
                                </span>
                              ) : null}
                            </td>
                            <td className="max-w-[240px] truncate px-4 py-3 text-navy/75">
                              {item.programTitle ?? "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-navy/70">
                              {item.programCode ?? "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 tabular-nums text-navy/70">
                              {formatAssignmentDate(item.start_date)}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={item.status} />
                            </td>
                            <td className="px-4 py-3">
                              <ProgramStatusBadge status={item.programStatus} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <span className="inline-flex items-center gap-3">
                                {/* 수업 실행 이력은 종료된 배정에서도 열람할 수 있어야 한다. */}
                                <Link
                                  href={`/admin/organizations/${organizationId}/program-assignments/${item.id}`}
                                  className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
                                >
                                  {isTerminalAssignmentStatus(item.status)
                                    ? "수업 이력"
                                    : "수업 운영"}
                                </Link>
                                {isTerminalAssignmentStatus(item.status) ? (
                                  <span className="text-[12px] text-navy/40">
                                    변경 불가
                                  </span>
                                ) : (
                                  <ClassProgramManageDialog
                                    organizationId={organizationId}
                                    assignment={item}
                                  />
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 모바일: 카드 stack */}
                  <ul className="mt-3 flex flex-col gap-2 lg:hidden">
                    {visibleAssignments.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-navy/10 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-navy/50">
                              {item.className ?? "—"}
                              {item.classStatus === "archived" ? " (보관)" : ""}
                            </p>
                            <p className="mt-0.5 break-words text-[14px] font-semibold text-navy">
                              {item.programTitle ?? "—"}
                            </p>
                            <p className="mt-0.5 break-all text-[12px] text-navy/50">
                              {item.programCode ?? "—"} · 시작{" "}
                              {formatAssignmentDate(item.start_date)}
                            </p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-navy/8 pt-2.5">
                          <span className="text-[12px] text-navy/45">
                            프로그램{" "}
                            {item.programStatus
                              ? CURRICULUM_STATUS_LABELS[item.programStatus]
                              : "—"}
                          </span>
                          <span className="flex items-center gap-3">
                            <Link
                              href={`/admin/organizations/${organizationId}/program-assignments/${item.id}`}
                              className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
                            >
                              {isTerminalAssignmentStatus(item.status)
                                ? "수업 이력"
                                : "수업 운영"}
                            </Link>
                            {isTerminalAssignmentStatus(item.status) ? (
                              <span className="text-[12px] text-navy/40">
                                변경 불가
                              </span>
                            ) : (
                              <ClassProgramManageDialog
                                organizationId={organizationId}
                                assignment={item}
                              />
                            )}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
