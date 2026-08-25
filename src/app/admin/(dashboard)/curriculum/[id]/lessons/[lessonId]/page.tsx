import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import {
  fetchLesson,
  fetchLessonActivities,
  fetchProgram,
} from "@/lib/admin/curriculum-queries";
import {
  ACTIVITY_TYPE_LABELS,
  CURRICULUM_STATUS_BADGE_CLASSES,
  CURRICULUM_STATUS_LABELS,
  formatMinutes,
  formatOptionalText,
  SEQUENCE_NO_MAX,
} from "@/lib/admin/curriculum";
import { ActivityFormDialog } from "./ActivityFormDialog";

export const metadata: Metadata = {
  title: "차시 상세 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LessonDetailPageProps {
  params: Promise<{ id: string; lessonId: string }>;
}

/**
 * 차시 상세 + 활동 관리.
 *
 * 활동을 프로그램 상세의 Dialog 안에서 편집하지 않고 별도 Route로 뺀 이유:
 *   - 활동 설명이 최대 3000자다. Dialog 안의 Dialog로는 편집이 어렵다.
 *   - 활동 편집 중에도 "어느 프로그램 · 몇 주차 차시인지" 맥락이 보여야 한다.
 *   - 콘텐츠 작성자가 특정 차시를 북마크·공유할 수 있다.
 * 대신 breadcrumb으로 프로그램 → 차시 위치를 항상 보여준다.
 */
export default async function LessonDetailPage({
  params,
}: LessonDetailPageProps) {
  const { supabase } = await requireAdmin();
  const { id, lessonId } = await params;

  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(lessonId)) {
    notFound();
  }

  const [programResult, lessonResult] = await Promise.all([
    fetchProgram(supabase, id),
    fetchLesson(supabase, lessonId),
  ]);

  if (!programResult.ok || !lessonResult.ok) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-5 py-8 lg:px-8">
        <div className="rounded-xl border border-navy/10 bg-white px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-navy">
            차시 데이터를 불러오지 못했습니다.
          </p>
          <p className="mt-1.5 text-[13px] text-navy/50">
            잠시 후 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  const program = programResult.program;
  const lesson = lessonResult.lesson;

  // ★ URL 조작 차단 — 이 차시가 정말 이 프로그램의 것이 아니면 404로 처리한다.
  if (!program || !lesson || lesson.program_id !== program.id) {
    notFound();
  }

  const activityResult = await fetchLessonActivities(supabase, lesson.id);
  const activities = activityResult.ok ? activityResult.activities : [];

  // 등록 폼에 제안할 다음 순서 번호(마지막 + 1, 상한을 넘지 않게 자른다).
  const nextSequenceNo = Math.min(
    activities.reduce((max, item) => Math.max(max, item.sequence_no), 0) + 1,
    SEQUENCE_NO_MAX,
  );

  // 보관된 차시·프로그램에는 새 활동을 추가하지 않는다(Server Action에서도 다시 검증한다).
  const canAddActivity =
    lesson.status !== "archived" && program.status !== "archived";

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-8 lg:px-8">
      {/* Breadcrumb — 모바일에서도 줄바꿈되도록 flex-wrap */}
      <nav
        aria-label="이동 경로"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]"
      >
        <Link
          href="/admin/curriculum"
          className="font-semibold text-trust-blue transition-opacity hover:opacity-70"
        >
          수업 프로그램
        </Link>
        <span aria-hidden className="text-navy/30">
          ›
        </span>
        <Link
          href={`/admin/curriculum/${program.id}`}
          className="max-w-[200px] truncate font-semibold text-trust-blue transition-opacity hover:opacity-70 sm:max-w-none"
        >
          {program.title}
        </Link>
        <span aria-hidden className="text-navy/30">
          ›
        </span>
        <span className="text-navy/55">
          {lesson.week_no}주차 {lesson.session_no}차시
        </span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-bold text-navy">{lesson.title}</h1>
        <span
          className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold ${CURRICULUM_STATUS_BADGE_CLASSES[lesson.status]}`}
        >
          {CURRICULUM_STATUS_LABELS[lesson.status]}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-navy/50">
        {program.code} · {lesson.week_no}주차 {lesson.session_no}차시 ·{" "}
        {formatMinutes(lesson.duration_minutes)}
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <section className="rounded-xl border border-navy/10 bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">차시 정보</h2>
          <dl className="mt-2">
            <div className="flex flex-col gap-1 border-b border-navy/8 py-3">
              <dt className="text-[11px] font-semibold text-navy/45">차시명</dt>
              <dd className="text-[14px] text-navy">{lesson.title}</dd>
            </div>
            <div className="flex flex-col gap-1 py-3">
              <dt className="text-[11px] font-semibold text-navy/45">
                교육 목표
              </dt>
              <dd className="whitespace-pre-line text-[14px] leading-relaxed text-navy">
                {formatOptionalText(lesson.objective)}
              </dd>
            </div>
          </dl>
          <p className="mt-1 text-[12px] text-navy/45">
            차시 정보 수정은 프로그램 상세의 차시 목록에서 할 수 있습니다.
          </p>
        </section>

        <section className="rounded-xl border border-navy/10 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-navy">활동 관리</h2>
              <p className="mt-1 text-[12px] text-navy/50">
                순서 번호가 작은 활동부터 진행됩니다. 활동은 삭제할 수 없습니다.
              </p>
            </div>
            {canAddActivity && activities.length > 0 ? (
              <ActivityFormDialog
                programId={program.id}
                lessonId={lesson.id}
                nextSequenceNo={nextSequenceNo}
                variant="outline"
              />
            ) : null}
          </div>

          {!activityResult.ok ? (
            <p className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-6 text-center text-[13px] text-navy/55">
              활동 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </p>
          ) : (
            <>
              {!canAddActivity ? (
                <p className="mt-4 rounded-lg border border-navy/10 bg-surface-soft px-3 py-2 text-[12px] text-navy/55">
                  보관된 차시 또는 프로그램입니다. 기존 활동은 확인·수정할 수
                  있지만 새 활동은 추가할 수 없습니다.
                </p>
              ) : null}

              {activities.length === 0 ? (
                <div className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-8 text-center">
                  <p className="text-[14px] font-semibold text-navy">
                    등록된 활동이 없습니다.
                  </p>
                  <p className="mt-1 text-[13px] text-navy/50">
                    도입부터 마무리까지 수업 흐름을 활동으로 구성해보세요.
                  </p>
                  {canAddActivity ? (
                    <div className="mt-4 flex justify-center">
                      <ActivityFormDialog
                        programId={program.id}
                        lessonId={lesson.id}
                        nextSequenceNo={nextSequenceNo}
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
                            순서
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            유형
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            활동명
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            시간
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            준비물
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold">
                            관리
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activities.map((activity) => (
                          <tr
                            key={activity.id}
                            className="border-t border-navy/8 bg-white"
                          >
                            <td className="whitespace-nowrap px-4 py-3 tabular-nums font-semibold text-navy">
                              {activity.sequence_no}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-navy/70">
                              {ACTIVITY_TYPE_LABELS[activity.activity_type]}
                            </td>
                            <td className="max-w-[260px] truncate px-4 py-3 text-navy/75">
                              {activity.title}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 tabular-nums text-navy/70">
                              {formatMinutes(activity.duration_minutes)}
                            </td>
                            <td className="max-w-[220px] truncate px-4 py-3 text-navy/70">
                              {formatOptionalText(activity.materials)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <ActivityFormDialog
                                programId={program.id}
                                lessonId={lesson.id}
                                nextSequenceNo={nextSequenceNo}
                                activity={activity}
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
                    {activities.map((activity) => (
                      <li
                        key={activity.id}
                        className="rounded-lg border border-navy/10 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-navy/50">
                              {activity.sequence_no}.{" "}
                              {ACTIVITY_TYPE_LABELS[activity.activity_type]} ·{" "}
                              {formatMinutes(activity.duration_minutes)}
                            </p>
                            <p className="mt-0.5 break-words text-[14px] font-semibold text-navy">
                              {activity.title}
                            </p>
                            {activity.materials ? (
                              <p className="mt-0.5 break-words text-[12px] text-navy/50">
                                준비물: {activity.materials}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-2.5 flex justify-end border-t border-navy/8 pt-2.5">
                          <ActivityFormDialog
                            programId={program.id}
                            lessonId={lesson.id}
                            nextSequenceNo={nextSequenceNo}
                            activity={activity}
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
      </div>
    </div>
  );
}
