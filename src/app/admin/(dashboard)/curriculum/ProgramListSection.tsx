"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatAgeGroup } from "@/lib/admin/class-child";
import {
  CURRICULUM_STATUSES,
  CURRICULUM_STATUS_BADGE_CLASSES,
  CURRICULUM_STATUS_LABELS,
} from "@/lib/admin/curriculum";
import { formatOrganizationDate } from "@/lib/admin/organization-labels";
import type { CurriculumStatus, ProgramListItem } from "@/types/curriculum";
import { ProgramFormDialog } from "./ProgramFormDialog";

interface ProgramListSectionProps {
  programs: ProgramListItem[];
}

const controlClasses =
  "h-10 rounded-lg border border-navy/15 bg-white px-3 text-[13px] text-navy placeholder:text-navy/35 transition-colors focus:border-trust-blue focus:outline-none";

const headerCellClasses =
  "whitespace-nowrap px-4 py-3 text-[11px] font-semibold tracking-wide text-navy/45";

const bodyCellClasses = "whitespace-nowrap px-4 py-3 text-navy/75";

function StatusBadge({ status }: { status: CurriculumStatus }) {
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[12px] font-semibold ${CURRICULUM_STATUS_BADGE_CLASSES[status]}`}
    >
      {CURRICULUM_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * 프로그램 목록 + 검색/필터.
 *
 * 검색·필터는 Client에서 처리한다. 콘텐츠 규모가 프로그램 수십 개 수준이라
 * 이미 받아온 배열을 거르는 편이 URL searchParams 왕복이나 pagination보다 단순하고 빠르다.
 * (기관 목록은 수백~수천을 전제해 서버 pagination을 쓰지만, 여기는 성격이 다르다.)
 */
export function ProgramListSection({ programs }: ProgramListSectionProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CurriculumStatus | "all">(
    "all",
  );

  const visiblePrograms = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return programs.filter((program) => {
      if (statusFilter !== "all" && program.status !== statusFilter) return false;

      if (!keyword) return true;

      return (
        program.code.toLowerCase().includes(keyword) ||
        program.title.toLowerCase().includes(keyword)
      );
    });
  }, [programs, query, statusFilter]);

  const isFiltered = query.trim() !== "" || statusFilter !== "all";

  return (
    <>
      <div className="rounded-xl border border-navy/10 bg-white p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="program-search">
            프로그램 코드 또는 이름 검색
          </label>
          <input
            id="program-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="코드 또는 프로그램명 검색"
            className={`${controlClasses} w-full sm:w-[280px]`}
          />

          <label className="sr-only" htmlFor="program-status-filter">
            상태 필터
          </label>
          <select
            id="program-status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as CurriculumStatus | "all")
            }
            className={`${controlClasses} w-full font-medium sm:w-[150px]`}
          >
            <option value="all">상태 전체</option>
            {CURRICULUM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CURRICULUM_STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          {isFiltered ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
              }}
              className="self-start text-[12px] font-semibold text-trust-blue transition-opacity hover:opacity-70 sm:self-auto"
            >
              필터 초기화
            </button>
          ) : null}
        </div>

        <p className="mt-3 text-[12px] text-navy/45">
          {visiblePrograms.length.toLocaleString("ko-KR")}개 표시 중 (전체{" "}
          {programs.length.toLocaleString("ko-KR")}개)
        </p>
      </div>

      {visiblePrograms.length === 0 ? (
        <div className="rounded-xl border border-navy/10 bg-white px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-navy">
            조건에 맞는 프로그램이 없습니다.
          </p>
          <p className="mt-1.5 text-[13px] text-navy/50">
            검색어나 상태 필터를 조정해보세요.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto rounded-xl border border-navy/10 bg-white lg:block">
            <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
              <thead className="border-b border-navy/10 bg-surface-soft">
                <tr>
                  <th scope="col" className={headerCellClasses}>
                    프로그램 코드
                  </th>
                  <th scope="col" className={headerCellClasses}>
                    프로그램명
                  </th>
                  <th scope="col" className={headerCellClasses}>
                    권장 연령
                  </th>
                  <th scope="col" className={headerCellClasses}>
                    운영 주차
                  </th>
                  <th scope="col" className={headerCellClasses}>
                    차시 수
                  </th>
                  <th scope="col" className={headerCellClasses}>
                    상태
                  </th>
                  <th scope="col" className={headerCellClasses}>
                    최근 수정일
                  </th>
                  <th scope="col" className={`${headerCellClasses} text-right`}>
                    관리
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiblePrograms.map((program) => (
                  <tr key={program.id} className="border-b border-navy/8 last:border-b-0">
                    <td className={`${bodyCellClasses} font-semibold text-navy`}>
                      {program.code}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-navy/75">
                      {program.title}
                    </td>
                    <td className={bodyCellClasses}>
                      {formatAgeGroup(program.age_group)}
                    </td>
                    <td className={`${bodyCellClasses} tabular-nums`}>
                      {program.duration_weeks}주
                    </td>
                    <td className={`${bodyCellClasses} tabular-nums`}>
                      {program.lessonCount.toLocaleString("ko-KR")}차시
                    </td>
                    <td className={bodyCellClasses}>
                      <StatusBadge status={program.status} />
                    </td>
                    <td className={`${bodyCellClasses} tabular-nums`}>
                      {formatOrganizationDate(program.updated_at)}
                    </td>
                    <td className={`${bodyCellClasses} text-right`}>
                      <Link
                        href={`/admin/curriculum/${program.id}`}
                        className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack */}
          <ul className="flex flex-col gap-2 lg:hidden">
            {visiblePrograms.map((program) => (
              <li
                key={program.id}
                className="rounded-xl border border-navy/10 bg-white px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-navy/50">
                      {program.code}
                    </p>
                    <p className="mt-0.5 break-words text-[14px] font-semibold text-navy">
                      {program.title}
                    </p>
                  </div>
                  <StatusBadge status={program.status} />
                </div>

                <p className="mt-1.5 text-[12px] text-navy/50">
                  {formatAgeGroup(program.age_group)} · {program.duration_weeks}주
                  · {program.lessonCount.toLocaleString("ko-KR")}차시
                </p>
                <p className="mt-0.5 text-[12px] text-navy/45">
                  최근 수정 {formatOrganizationDate(program.updated_at)}
                </p>

                <div className="mt-2.5 flex justify-end border-t border-navy/8 pt-2.5">
                  <Link
                    href={`/admin/curriculum/${program.id}`}
                    className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
                  >
                    상세
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** Empty State에서 쓰는 등록 버튼 (Section과 같은 파일에 두어 import를 단순하게 유지) */
export function ProgramEmptyState() {
  return (
    <div className="rounded-xl border border-navy/10 bg-white px-6 py-16 text-center">
      <p className="text-[15px] font-semibold text-navy">
        등록된 수업 프로그램이 없습니다.
      </p>
      <p className="mt-1.5 text-[13px] text-navy/50">
        첫 프로그램을 등록해 TeachAble Art Play 커리큘럼을 구성해보세요.
      </p>
      <div className="mt-5 flex justify-center">
        <ProgramFormDialog variant="outline" />
      </div>
    </div>
  );
}
