import {
  CLASS_STATUS_BADGE_CLASSES,
  CLASS_STATUS_LABELS,
  formatAgeGroup,
} from "@/lib/admin/class-child";
import { formatTeacherNames } from "@/lib/admin/class-teacher";
import type { ClassListItem, ClassSummary } from "@/types/class-child";
import { ClassFormDialog } from "./ClassFormDialog";

interface ClassManagementSectionProps {
  organizationId: string;
  defaultSchoolYear: number;
  classes: ClassListItem[];
  /** 반 id → 담당 교사 이름들. 담당 교사 관리 Section과 같은 데이터를 재사용한다. */
  teacherNamesByClassId: Record<string, string[]>;
  /** 반 id → 운영 중인 프로그램 수. 수업 프로그램 운영 Section과 같은 데이터를 재사용한다. */
  activeProgramCountByClassId: Record<string, number>;
  summary: ClassSummary;
  /** 조회 실패 시 목록 대신 안내를 보여준다 */
  hasError: boolean;
  reachedLimit: boolean;
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

/**
 * 반 관리 영역.
 *
 * Server Component다 — 목록 자체는 상호작용이 없고, 등록/수정 Dialog만 Client다.
 * PC는 compact table, 모바일은 카드 stack으로 전환한다(가로 스크롤에 의존하지 않는다).
 */
export function ClassManagementSection({
  organizationId,
  defaultSchoolYear,
  classes,
  teacherNamesByClassId,
  activeProgramCountByClassId,
  summary,
  hasError,
  reachedLimit,
}: ClassManagementSectionProps) {
  return (
    <section className="rounded-xl border border-navy/10 bg-white p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-navy">반 관리</h2>
          <p className="mt-1 text-[12px] text-navy/50">
            학년도별로 반을 등록하고 운영 상태를 관리합니다. 반은 삭제하지 않고
            보관합니다.
          </p>
        </div>
        {!hasError && classes.length > 0 ? (
          <ClassFormDialog
            organizationId={organizationId}
            defaultSchoolYear={defaultSchoolYear}
            variant="outline"
          />
        ) : null}
      </div>

      {hasError ? (
        <p className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-6 text-center text-[13px] text-navy/55">
          반 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-2.5">
            <SummaryItem label="전체 반" value={summary.total} />
            <SummaryItem label="활성 반" value={summary.active} />
            <SummaryItem label="보관 반" value={summary.archived} />
          </dl>

          {reachedLimit ? (
            <p className="mt-3 rounded-lg border border-yellow/50 bg-yellow-soft px-3 py-2 text-[12px] text-navy">
              표시 가능한 최대 개수에 도달했습니다. 일부 반이 목록에 보이지 않을
              수 있습니다.
            </p>
          ) : null}

          {classes.length === 0 ? (
            <div className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-navy">
                아직 등록된 반이 없습니다.
              </p>
              <p className="mt-1 text-[13px] text-navy/50">
                첫 반을 등록해 기관 운영을 시작하세요.
              </p>
              <div className="mt-4 flex justify-center">
                <ClassFormDialog
                  organizationId={organizationId}
                  defaultSchoolYear={defaultSchoolYear}
                />
              </div>
            </div>
          ) : (
            <>
              {/* PC: compact table */}
              <div className="mt-4 hidden overflow-x-auto rounded-lg border border-navy/10 lg:block">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface-soft text-navy/50">
                      <th className="px-4 py-2.5 text-left font-semibold">
                        반 이름
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        연령
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        학년도
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        재원 원아
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        담당 교사
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        운영 프로그램
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
                    {classes.map((classRow) => (
                      <tr
                        key={classRow.id}
                        className="border-t border-navy/8 bg-white"
                      >
                        <td className="px-4 py-3 font-semibold text-navy">
                          {classRow.name}
                        </td>
                        <td className="px-4 py-3 text-navy/70">
                          {formatAgeGroup(classRow.age_group)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-navy/70">
                          {classRow.school_year}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-navy/70">
                          {classRow.activeChildCount.toLocaleString("ko-KR")}명
                        </td>
                        <td className="px-4 py-3 text-navy/70">
                          {formatTeacherNames(
                            teacherNamesByClassId[classRow.id] ?? [],
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-navy/70">
                          {(
                            activeProgramCountByClassId[classRow.id] ?? 0
                          ).toLocaleString("ko-KR")}
                          개
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 text-[12px] font-semibold ${CLASS_STATUS_BADGE_CLASSES[classRow.status]}`}
                          >
                            {CLASS_STATUS_LABELS[classRow.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ClassFormDialog
                            organizationId={organizationId}
                            defaultSchoolYear={defaultSchoolYear}
                            classRow={classRow}
                            variant="link"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일: 카드 stack */}
              <ul className="mt-4 flex flex-col gap-2 lg:hidden">
                {classes.map((classRow) => (
                  <li
                    key={classRow.id}
                    className="rounded-lg border border-navy/10 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-navy">
                          {classRow.name}
                        </p>
                        <p className="mt-0.5 text-[12px] text-navy/50">
                          {formatAgeGroup(classRow.age_group)} ·{" "}
                          {classRow.school_year}학년도 · 재원{" "}
                          {classRow.activeChildCount.toLocaleString("ko-KR")}명
                        </p>
                        <p className="mt-0.5 text-[12px] text-navy/50">
                          담당 교사:{" "}
                          {formatTeacherNames(
                            teacherNamesByClassId[classRow.id] ?? [],
                          )}
                          {" · "}운영 프로그램{" "}
                          {(
                            activeProgramCountByClassId[classRow.id] ?? 0
                          ).toLocaleString("ko-KR")}
                          개
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[12px] font-semibold ${CLASS_STATUS_BADGE_CLASSES[classRow.status]}`}
                      >
                        {CLASS_STATUS_LABELS[classRow.status]}
                      </span>
                    </div>
                    <div className="mt-2.5 flex justify-end border-t border-navy/8 pt-2.5">
                      <ClassFormDialog
                        organizationId={organizationId}
                        defaultSchoolYear={defaultSchoolYear}
                        classRow={classRow}
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
    </section>
  );
}
