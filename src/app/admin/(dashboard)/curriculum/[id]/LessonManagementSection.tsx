import Link from "next/link";
import {
  CURRICULUM_STATUS_BADGE_CLASSES,
  CURRICULUM_STATUS_LABELS,
  formatMinutes,
} from "@/lib/admin/curriculum";
import type {
  CurriculumStatus,
  CurriculumStatusSummary,
  LessonListItem,
} from "@/types/curriculum";
import { LessonFormDialog } from "./LessonFormDialog";

interface LessonManagementSectionProps {
  programId: string;
  durationWeeks: number;
  /** 보관된 프로그램에는 새 차시를 추가할 수 없다 */
  isProgramArchived: boolean;
  lessons: LessonListItem[];
  summary: CurriculumStatusSummary;
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
 * 차시 관리 영역.
 *
 * Server Component다 — 목록은 정적이고 등록/수정 Dialog만 Client다.
 * 활동은 이 화면에서 다루지 않고 차시 상세 페이지로 이동한다.
 * (활동 설명이 최대 3000자라 Dialog 안의 Dialog로 편집하기에 적합하지 않다.)
 */
export function LessonManagementSection({
  programId,
  durationWeeks,
  isProgramArchived,
  lessons,
  summary,
  hasError,
}: LessonManagementSectionProps) {
  return (
    <section className="rounded-xl border border-navy/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-navy">차시 관리</h2>
          <p className="mt-1 text-[12px] text-navy/50">
            주차와 차시 번호로 수업 순서를 구성합니다. 차시는 삭제하지 않고
            보관합니다.
          </p>
        </div>
        {!hasError && !isProgramArchived && lessons.length > 0 ? (
          <LessonFormDialog
            programId={programId}
            durationWeeks={durationWeeks}
            variant="outline"
          />
        ) : null}
      </div>

      {hasError ? (
        <p className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-6 text-center text-[13px] text-navy/55">
          차시 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <SummaryItem label="전체 차시" value={summary.total} />
            <SummaryItem label="초안" value={summary.draft} />
            <SummaryItem label="게시" value={summary.published} />
            <SummaryItem label="보관" value={summary.archived} />
          </dl>

          {isProgramArchived ? (
            <p className="mt-3 rounded-lg border border-navy/10 bg-surface-soft px-3 py-2 text-[12px] text-navy/55">
              보관된 프로그램입니다. 기존 차시는 확인·수정할 수 있지만 새 차시는
              추가할 수 없습니다.
            </p>
          ) : null}

          {lessons.length === 0 ? (
            <div className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-navy">
                등록된 차시가 없습니다.
              </p>
              <p className="mt-1 text-[13px] text-navy/50">
                차시를 추가하면 프로그램을 게시할 수 있습니다.
              </p>
              {!isProgramArchived ? (
                <div className="mt-4 flex justify-center">
                  <LessonFormDialog
                    programId={programId}
                    durationWeeks={durationWeeks}
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
                      <th className="px-4 py-2.5 text-left font-semibold">주차</th>
                      <th className="px-4 py-2.5 text-left font-semibold">차시</th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        차시명
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">시간</th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        활동 수
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">상태</th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((lesson) => (
                      <tr
                        key={lesson.id}
                        className="border-t border-navy/8 bg-white"
                      >
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums font-semibold text-navy">
                          {lesson.week_no}주차
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-navy/70">
                          {lesson.session_no}차시
                        </td>
                        <td className="max-w-[280px] truncate px-4 py-3 text-navy/75">
                          {lesson.title}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-navy/70">
                          {formatMinutes(lesson.duration_minutes)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-navy/70">
                          {lesson.activityCount.toLocaleString("ko-KR")}개
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={lesson.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <LessonFormDialog
                              programId={programId}
                              durationWeeks={durationWeeks}
                              lesson={lesson}
                              variant="link"
                            />
                            <Link
                              href={`/admin/curriculum/${programId}/lessons/${lesson.id}`}
                              className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
                            >
                              활동 관리
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일: 카드 stack */}
              <ul className="mt-4 flex flex-col gap-2 lg:hidden">
                {lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="rounded-lg border border-navy/10 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-navy/50">
                          {lesson.week_no}주차 · {lesson.session_no}차시
                        </p>
                        <p className="mt-0.5 break-words text-[14px] font-semibold text-navy">
                          {lesson.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-navy/50">
                          {formatMinutes(lesson.duration_minutes)} · 활동{" "}
                          {lesson.activityCount.toLocaleString("ko-KR")}개
                        </p>
                      </div>
                      <StatusBadge status={lesson.status} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-end gap-3 border-t border-navy/8 pt-2.5">
                      <LessonFormDialog
                        programId={programId}
                        durationWeeks={durationWeeks}
                        lesson={lesson}
                        variant="link"
                      />
                      <Link
                        href={`/admin/curriculum/${programId}/lessons/${lesson.id}`}
                        className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
                      >
                        활동 관리
                      </Link>
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
