"use client";

import { useMemo, useState } from "react";
import {
  CHILD_STATUSES,
  CHILD_STATUS_BADGE_CLASSES,
  CHILD_STATUS_LABELS,
  formatBirthYear,
  formatClassName,
} from "@/lib/admin/class-child";
import type {
  ChildListItem,
  ChildStatus,
  ChildSummary,
  ClassListItem,
} from "@/types/class-child";
import { ChildFormDialog } from "./ChildFormDialog";

interface ChildManagementSectionProps {
  organizationId: string;
  childRows: ChildListItem[];
  classes: ClassListItem[];
  summary: ChildSummary;
  hasError: boolean;
  reachedLimit: boolean;
}

/** 반 필터의 특수값 — UUID와 겹치지 않는 문자열을 쓴다 */
const CLASS_FILTER_ALL = "all";
const CLASS_FILTER_UNASSIGNED = "unassigned";

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

const controlClasses =
  "h-10 rounded-lg border border-navy/15 bg-white px-3 text-[13px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none";

/**
 * 원아 관리 영역.
 *
 * 검색/필터는 Client에서 처리한다.
 * 기관당 원아는 수십~수백 규모라 이미 전부 받아온 배열을 그대로 거르는 편이
 * URL searchParams 왕복이나 별도 상태 라이브러리보다 단순하고 반응도 빠르다.
 * (반별 재원 수 집계에도 어차피 전체 목록이 필요하다.)
 */
export function ChildManagementSection({
  organizationId,
  childRows,
  classes,
  summary,
  hasError,
  reachedLimit,
}: ChildManagementSectionProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChildStatus | "all">("all");
  const [classFilter, setClassFilter] = useState<string>(CLASS_FILTER_ALL);

  const activeClasses = useMemo(
    () => classes.filter((classRow) => classRow.status === "active"),
    [classes],
  );

  const visibleChildren = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return childRows.filter((child) => {
      if (keyword && !child.name.toLowerCase().includes(keyword)) return false;
      if (statusFilter !== "all" && child.status !== statusFilter) return false;

      if (classFilter === CLASS_FILTER_UNASSIGNED) {
        return child.class_id === null;
      }

      if (classFilter !== CLASS_FILTER_ALL) {
        return child.class_id === classFilter;
      }

      return true;
    });
  }, [childRows, query, statusFilter, classFilter]);

  const isFiltered =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    classFilter !== CLASS_FILTER_ALL;

  return (
    <section className="rounded-xl border border-navy/10 bg-white p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-navy">원아 관리</h2>
          <p className="mt-1 text-[12px] text-navy/50">
            운영에 필요한 최소 정보(이름 · 출생연도 · 반 · 상태)만 관리합니다.
            원아는 삭제하지 않고 상태로 관리합니다.
          </p>
        </div>
        {!hasError && childRows.length > 0 ? (
          <ChildFormDialog
            organizationId={organizationId}
            activeClasses={activeClasses}
            variant="outline"
          />
        ) : null}
      </div>

      {hasError ? (
        <p className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-6 text-center text-[13px] text-navy/55">
          원아 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <SummaryItem label="전체" value={summary.total} />
            <SummaryItem label="재원" value={summary.active} />
            <SummaryItem label="비활성" value={summary.inactive} />
            <SummaryItem label="졸업" value={summary.graduated} />
            <SummaryItem label="미배정" value={summary.unassigned} />
          </dl>

          {reachedLimit ? (
            <p className="mt-3 rounded-lg border border-yellow/50 bg-yellow-soft px-3 py-2 text-[12px] text-navy">
              표시 가능한 최대 인원에 도달했습니다. 일부 원아가 목록에 보이지
              않을 수 있습니다.
            </p>
          ) : null}

          {childRows.length === 0 ? (
            <div className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-navy">
                아직 등록된 원아가 없습니다.
              </p>
              <p className="mt-1 text-[13px] text-navy/50">
                원아를 등록하면 반 배정과 상태 관리를 할 수 있습니다.
              </p>
              <div className="mt-4 flex justify-center">
                <ChildFormDialog
                  organizationId={organizationId}
                  activeClasses={activeClasses}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <label className="sr-only" htmlFor="child-search">
                  원아 이름 검색
                </label>
                <input
                  id="child-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="원아 이름 검색"
                  className={`${controlClasses} w-full sm:w-[220px]`}
                />

                <label className="sr-only" htmlFor="child-status-filter">
                  상태 필터
                </label>
                <select
                  id="child-status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as ChildStatus | "all")
                  }
                  className={`${controlClasses} w-full font-medium sm:w-[140px]`}
                >
                  <option value="all">상태 전체</option>
                  {CHILD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {CHILD_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>

                <label className="sr-only" htmlFor="child-class-filter">
                  반 필터
                </label>
                <select
                  id="child-class-filter"
                  value={classFilter}
                  onChange={(event) => setClassFilter(event.target.value)}
                  className={`${controlClasses} w-full font-medium sm:w-[200px]`}
                >
                  <option value={CLASS_FILTER_ALL}>반 전체</option>
                  <option value={CLASS_FILTER_UNASSIGNED}>미배정</option>
                  {classes.map((classRow) => (
                    <option key={classRow.id} value={classRow.id}>
                      {classRow.name}
                      {classRow.status === "archived" ? " (보관)" : ""}
                    </option>
                  ))}
                </select>

                {isFiltered ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setStatusFilter("all");
                      setClassFilter(CLASS_FILTER_ALL);
                    }}
                    className="self-start text-[12px] font-semibold text-trust-blue transition-opacity hover:opacity-70 sm:self-auto"
                  >
                    필터 초기화
                  </button>
                ) : null}
              </div>

              <p className="mt-3 text-[12px] text-navy/45">
                {visibleChildren.length.toLocaleString("ko-KR")}명 표시 중 (전체{" "}
                {childRows.length.toLocaleString("ko-KR")}명)
              </p>

              {visibleChildren.length === 0 ? (
                <p className="mt-3 rounded-lg border border-navy/10 bg-surface-soft px-4 py-8 text-center text-[13px] text-navy/55">
                  조건에 맞는 원아가 없습니다.
                </p>
              ) : (
                <>
                  {/* PC: compact table */}
                  <div className="mt-3 hidden overflow-hidden rounded-lg border border-navy/10 lg:block">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-surface-soft text-navy/50">
                          <th className="px-4 py-2.5 text-left font-semibold">
                            이름
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            출생연도
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            반
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            상태
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold">
                            관리
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleChildren.map((child) => (
                          <tr
                            key={child.id}
                            className="border-t border-navy/8 bg-white"
                          >
                            <td className="px-4 py-3 font-semibold text-navy">
                              {child.name}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-navy/70">
                              {formatBirthYear(child.birth_year)}
                            </td>
                            <td className="px-4 py-3 text-navy/70">
                              {formatClassName(child.className)}
                              {child.classStatus === "archived" ? (
                                <span className="ml-1 text-navy/40">(보관)</span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-md border px-2 py-0.5 text-[12px] font-semibold ${CHILD_STATUS_BADGE_CLASSES[child.status]}`}
                              >
                                {CHILD_STATUS_LABELS[child.status]}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <ChildFormDialog
                                organizationId={organizationId}
                                activeClasses={activeClasses}
                                child={child}
                                variant="link"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 모바일: 카드 stack */}
                  <ul className="mt-3 flex flex-col gap-2 lg:hidden">
                    {visibleChildren.map((child) => (
                      <li
                        key={child.id}
                        className="rounded-lg border border-navy/10 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-navy">
                              {child.name}
                            </p>
                            <p className="mt-0.5 text-[12px] text-navy/50">
                              {formatBirthYear(child.birth_year)} ·{" "}
                              {formatClassName(child.className)}
                              {child.classStatus === "archived" ? " (보관)" : ""}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-md border px-2 py-0.5 text-[12px] font-semibold ${CHILD_STATUS_BADGE_CLASSES[child.status]}`}
                          >
                            {CHILD_STATUS_LABELS[child.status]}
                          </span>
                        </div>
                        <div className="mt-2.5 flex justify-end border-t border-navy/8 pt-2.5">
                          <ChildFormDialog
                            organizationId={organizationId}
                            activeClasses={activeClasses}
                            child={child}
                            variant="link"
                          />
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
