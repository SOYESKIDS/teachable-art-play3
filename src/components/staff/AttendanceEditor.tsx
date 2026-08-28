"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  CLASS_SESSION_STATUS_LABELS,
  formatLessonOrder,
  formatSessionDate,
} from "@/lib/admin/class-session";
import { saveAttendanceAction } from "@/lib/staff/attendance-actions";
import {
  ATTENDANCE_FORM_INITIAL_STATE,
  type AttendanceFormState,
  type AttendanceStatus,
  type StaffAttendanceChild,
  type StaffAttendancePageData,
} from "@/types/staff-attendance";

type StaffRole = "director" | "teacher";

type AttendanceFilter =
  | "all"
  | "unrecorded"
  | AttendanceStatus;

interface AttendanceEditorProps {
  data: StaffAttendancePageData;
  role: StaffRole;
  backHref: string;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "출석",
  absent: "결석",
  late: "지각",
  left_early: "조퇴",
};

const FILTERS: readonly {
  value: AttendanceFilter;
  label: string;
}[] = [
  { value: "all", label: "전체 보기" },
  { value: "unrecorded", label: "미기록 보기" },
  { value: "present", label: "출석 보기" },
  { value: "absent", label: "결석 보기" },
  { value: "late", label: "지각 보기" },
  { value: "left_early", label: "조퇴 보기" },
];

type StatusMap = Record<string, AttendanceStatus | null>;

function buildStatusMap(
  children: StaffAttendanceChild[],
): StatusMap {
  return Object.fromEntries(
    children.map((child) => [
      child.childId,
      child.attendanceStatus,
    ]),
  );
}

function childStatusLabel(
  status: StaffAttendanceChild["childStatus"],
): string | null {
  if (status === "inactive") return "재원 중지";
  if (status === "graduated") return "졸업";
  return null;
}

/**
 * SERVICE-07B 출결 편집 화면.
 *
 * 화면 정책
 *   scheduled   : 입력/수정
 *   in_progress : 입력/수정
 *   completed   : 입력/정정
 *   cancelled   : 조회만
 *
 * 교사 + archived class:
 *   기존 attendance 정정 가능
 *   신규 attendance 입력 불가
 *
 * 최종 권한 판정은 Server Action + RLS가 다시 수행한다.
 */
export function AttendanceEditor({
  data,
  role,
  backHref,
}: AttendanceEditorProps) {
  const { session, children } = data;

  const [filter, setFilter] =
    useState<AttendanceFilter>("all");

  /**
   * M-1: 보기 필터는 "누른 시점"의 원아 집합을 고정한다.
   *
   * draftStatuses로 매번 다시 거르면 미기록 보기에서 출석을 누르는 순간
   * 그 원아가 사라져 방금 무엇을 바꿨는지 확인할 수 없다.
   * null이면 전체 보기다.
   */
  const [filteredIds, setFilteredIds] =
    useState<ReadonlySet<string> | null>(null);

  const [savedStatuses, setSavedStatuses] =
    useState<StatusMap>(() => buildStatusMap(children));

  const [draftStatuses, setDraftStatuses] =
    useState<StatusMap>(() => buildStatusMap(children));

  /**
   * H-2: 서버가 돌려준 출결이 최종 truth다.
   *
   * Server Action의 refresh() 이후 children prop이 새로 오면
   * 그 값으로 saved/draft를 다시 맞춘다. 그래야
   *   - 다른 사용자가 동시에 바꾼 값이 화면에 반영되고
   *   - 새로 들어온 원아가 올바른 출결 상태로 초기화된다.
   *
   * 배열 identity 대신 "출결 내용" 서명을 비교한다.
   * refresh()는 내용이 같아도 새 배열을 주기 때문에,
   * identity로 비교하면 저장하지 않은 편집이 불필요하게 날아간다.
   *
   * 렌더 중 setState는 React가 공식적으로 권장하는 prop 동기화 패턴이라
   * useEffect를 쓰지 않는다(이 프로젝트의 set-state-in-effect 룰도 피한다).
   */
  const serverSignature = useMemo(
    () =>
      children
        .map(
          (child) =>
            `${child.childId}:${child.attendanceStatus ?? ""}`,
        )
        .join("|"),
    [children],
  );

  const [syncedSignature, setSyncedSignature] =
    useState(serverSignature);

  if (syncedSignature !== serverSignature) {
    const serverStatuses = buildStatusMap(children);

    setSyncedSignature(serverSignature);
    setSavedStatuses(serverStatuses);
    setDraftStatuses(serverStatuses);
  }

  const [state, formAction, isPending] = useActionState(
    async (prevState: AttendanceFormState, formData: FormData) => {
      const result = await saveAttendanceAction(
        prevState,
        formData,
      );

      if (result.phase === "success") {
        setSavedStatuses({ ...draftStatuses });
      }

      return result;
    },
    ATTENDANCE_FORM_INITIAL_STATE,
  );

  const sessionReadOnly =
    session.status === "cancelled";

  const teacherArchived =
    role === "teacher" &&
    session.classStatus !== "active";

  function canEditChild(
    child: StaffAttendanceChild,
  ): boolean {
    if (sessionReadOnly) return false;

    // 이름조차 읽히지 않는 비정상 historical row는
    // 화면에서 임의 정정하지 않는다.
    if (!child.childName) return false;

    // archived 반 교사는 기존 attendance만 정정 가능.
    if (
      teacherArchived &&
      !child.hasExistingAttendance
    ) {
      return false;
    }

    return true;
  }

  function chooseStatus(
    child: StaffAttendanceChild,
    status: AttendanceStatus,
  ) {
    if (!canEditChild(child)) return;

    setDraftStatuses((current) => ({
      ...current,
      [child.childId]: status,
    }));
  }

  function markUnrecordedPresent() {
    setDraftStatuses((current) => {
      const next = { ...current };

      for (const child of children) {
        if (
          next[child.childId] === null &&
          canEditChild(child)
        ) {
          next[child.childId] = "present";
        }
      }

      return next;
    });
  }

  const counts = useMemo(() => {
    const result = {
      all: children.length,
      unrecorded: 0,
      present: 0,
      absent: 0,
      late: 0,
      left_early: 0,
    };

    for (const child of children) {
      const status =
        draftStatuses[child.childId] ?? null;

      if (status === null) {
        result.unrecorded += 1;
      } else {
        result[status] += 1;
      }
    }

    return result;
  }, [children, draftStatuses]);

  /**
   * 필터를 누른 시점의 대상만 고정해 둔다.
   * 같은 필터를 다시 누르면 현재 상태 기준으로 새로 잡힌다.
   */
  function selectFilter(next: AttendanceFilter) {
    setFilter(next);

    if (next === "all") {
      setFilteredIds(null);
      return;
    }

    const matched = children.filter((child) => {
      const status =
        draftStatuses[child.childId] ?? null;

      return next === "unrecorded"
        ? status === null
        : status === next;
    });

    setFilteredIds(
      new Set(matched.map((child) => child.childId)),
    );
  }

  const visibleChildren = useMemo(() => {
    if (filter === "all" || filteredIds === null) {
      return children;
    }

    return children.filter((child) =>
      filteredIds.has(child.childId),
    );
  }, [children, filter, filteredIds]);

  /**
   * 실제로 달라진 값만 Server Action으로 보낸다.
   *
   * - 미기록(null)은 보내지 않음
   * - 기존과 같은 값도 보내지 않음
   * - 사용자가 선택하거나 정정한 값만 보냄
   */
  const dirtyEntries = useMemo(
    () =>
      children.flatMap((child) => {
        const draft =
          draftStatuses[child.childId] ?? null;

        const saved =
          savedStatuses[child.childId] ?? null;

        if (
          draft === null ||
          draft === saved
        ) {
          return [];
        }

        return [
          {
            childId: child.childId,
            attendanceStatus: draft,
          },
        ];
      }),
    [
      children,
      draftStatuses,
      savedStatuses,
    ],
  );

  const writableUnrecordedCount =
    children.filter(
      (child) =>
        (draftStatuses[child.childId] ?? null) ===
          null && canEditChild(child),
    ).length;

  const canSubmit =
    !sessionReadOnly &&
    !isPending &&
    dirtyEntries.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center rounded-lg border border-navy/15 bg-white px-3 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
          >
            ← 수업 목록
          </Link>
        </div>

        <span className="rounded-md border border-navy/15 bg-white px-2.5 py-1 text-[12px] font-bold text-navy">
          {CLASS_SESSION_STATUS_LABELS[session.status]}
        </span>
      </div>

      <section className="mt-4 rounded-xl border border-navy/10 bg-white p-4 sm:p-5">
        <p className="text-[13px] font-bold text-navy">
          {session.className ?? "반 정보 없음"}
          {session.classStatus === "archived" ? (
            <span className="ml-1 font-normal text-navy/45">
              (보관)
            </span>
          ) : null}
        </p>

        <p className="mt-1 text-[12px] text-navy/50">
          {formatLessonOrder(
            session.weekNo,
            session.sessionNo,
          )}
          {session.programTitle
            ? ` · ${session.programTitle}`
            : ""}
        </p>

        <h1 className="mt-1 break-words text-[20px] font-bold leading-snug text-navy">
          {session.lessonTitle ??
            "차시 정보 없음"}
        </h1>

        <p className="mt-2 text-[13px] text-navy/50">
          예정일{" "}
          {formatSessionDate(
            session.scheduledDate,
          )}
          {session.programCode
            ? ` · ${session.programCode}`
            : ""}
        </p>
      </section>

      {sessionReadOnly ? (
        <p className="mt-4 rounded-xl border border-navy/15 bg-navy/5 px-4 py-3 text-[13px] leading-relaxed text-navy">
          취소된 수업의 출결은 조회만 할 수 있습니다.
        </p>
      ) : null}

      {teacherArchived ? (
        <p className="mt-4 rounded-xl border border-yellow/50 bg-yellow-soft px-4 py-3 text-[13px] leading-relaxed text-navy">
          보관된 반에서는 새 출결 기록을 추가할 수 없습니다.
          기존에 기록된 출결만 정정할 수 있습니다.
        </p>
      ) : null}

      {/*
        저장 바는 모바일에서 sticky bottom-3다(높이 약 98px + 12px 오프셋).
        목록 아래에 그만큼 여백을 두지 않으면 마지막 원아의 출결 버튼이
        저장 바 뒤에 가려 눌리지 않는다. sm 이상은 form이 static이라 필요 없다.
      */}
      <section className="mt-5 pb-28 sm:pb-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-bold text-navy">
              원아 출결
            </h2>
            <p className="mt-1 text-[12px] text-navy/50">
              총{" "}
              {children.length.toLocaleString(
                "ko-KR",
              )}
              명
            </p>
          </div>

          {!sessionReadOnly &&
          writableUnrecordedCount > 0 ? (
            <div className="text-right">
              <button
                type="button"
                onClick={markUnrecordedPresent}
                disabled={isPending}
                className="min-h-11 rounded-lg border border-navy/20 bg-white px-4 text-[13px] font-bold text-navy transition-colors hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                미기록{" "}
                {writableUnrecordedCount.toLocaleString(
                  "ko-KR",
                )}
                명 출석 처리
              </button>

              {/* 편집 불가 원아가 섞여 있으면 숫자가 달라 보이는 이유를 알려준다 */}
              {counts.unrecorded >
              writableUnrecordedCount ? (
                <p className="mt-1 text-[11px] leading-relaxed text-navy/45">
                  미기록{" "}
                  {counts.unrecorded.toLocaleString(
                    "ko-KR",
                  )}
                  명 중{" "}
                  {(
                    counts.unrecorded -
                    writableUnrecordedCount
                  ).toLocaleString("ko-KR")}
                  명은 기록할 수 없는 원아입니다.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-navy/10 bg-white/60 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-bold text-navy">
                보기 필터
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-navy/45">
                상태별 원아를 찾아보기 위한 필터입니다. 출결을 변경하는 버튼이 아닙니다.
                {filter !== "all"
                  ? " 목록은 필터를 누른 시점 기준으로 유지되며, 같은 필터를 다시 누르면 갱신됩니다."
                  : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          {FILTERS.map((item) => {
            const selected =
              filter === item.value;

            const count =
              counts[item.value];

            return (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  selectFilter(item.value)
                }
                aria-pressed={selected}
                className={`min-h-12 rounded-lg border px-2 py-2 text-center transition-colors ${
                  selected
                    ? "border-trust-blue/50 bg-trust-blue/10 text-navy"
                    : "border-navy/10 bg-white text-navy hover:border-trust-blue/30 hover:bg-trust-blue/5"
                }`}
              >
                <span className="block text-[12px] font-semibold">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-[15px] font-bold tabular-nums">
                  {count.toLocaleString(
                    "ko-KR",
                  )}
                </span>
              </button>
            );
          })}
          </div>
        </div>

        {children.length === 0 ? (
          <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-10 text-center text-[14px] leading-relaxed text-navy/50">
            이 수업에 표시할 원아가 없습니다.
          </p>
        ) : visibleChildren.length === 0 ? (
          <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-10 text-center text-[14px] text-navy/50">
            해당 조건의 원아가 없습니다.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {visibleChildren.map(
              (child) => {
                const currentStatus =
                  draftStatuses[
                    child.childId
                  ] ?? null;

                const editable =
                  canEditChild(child);

                const statusLabel =
                  childStatusLabel(
                    child.childStatus,
                  );

                return (
                  <li
                    key={child.childId}
                    className="rounded-xl border border-navy/10 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-[15px] font-bold text-navy">
                          {child.childName ??
                            "원아 이름 확인 불가"}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-navy/45">
                          {statusLabel ? (
                            <span className="rounded border border-navy/10 px-1.5 py-0.5">
                              {statusLabel}
                            </span>
                          ) : null}

                          {!child.isCurrentClassMember &&
                          child.hasExistingAttendance ? (
                            <span className="rounded border border-navy/10 px-1.5 py-0.5">
                              과거 출결
                            </span>
                          ) : null}

                          {teacherArchived &&
                          !child.hasExistingAttendance ? (
                            <span className="rounded border border-yellow/40 bg-yellow-soft px-1.5 py-0.5 text-navy">
                              신규 기록 불가
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <span className="text-[12px] font-semibold text-navy/50">
                        {currentStatus
                          ? STATUS_LABELS[
                              currentStatus
                            ]
                          : "미기록"}
                      </span>
                    </div>

                    <div className="mt-3">
                      <p
                        className="mb-2 text-[11px] font-bold text-navy/55"
                        id={`attendance-label-${child.childId}`}
                      >
                        출결 선택
                      </p>

                      {/*
                        스크린리더가 "출석 버튼"만 읽으면 어느 원아인지 알 수 없다.
                        원아 이름을 포함한 group 레이블을 붙인다.
                      */}
                      <div
                        role="group"
                        aria-label={`${
                          child.childName ??
                          "이름 확인 불가 원아"
                        } 출결 선택`}
                        className="grid grid-cols-4 gap-1.5"
                      >
                      {(
                        Object.keys(
                          STATUS_LABELS,
                        ) as AttendanceStatus[]
                      ).map((status) => {
                        const selected =
                          currentStatus ===
                          status;

                        return (
                          <button
                            key={status}
                            type="button"
                            disabled={
                              !editable ||
                              isPending
                            }
                            onClick={() =>
                              chooseStatus(
                                child,
                                status,
                              )
                            }
                            aria-pressed={
                              selected
                            }
                            className={`min-h-11 rounded-lg border px-1.5 text-[12px] font-bold transition-colors sm:text-[13px] ${
                              selected
                                ? "border-navy bg-navy text-white"
                                : "border-navy/15 bg-white text-navy hover:border-navy/30 hover:bg-navy/5"
                            } disabled:cursor-not-allowed disabled:opacity-45`}
                          >
                            {
                              STATUS_LABELS[
                                status
                              ]
                            }
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        )}
      </section>

      {!sessionReadOnly &&
      children.length > 0 ? (
        <form
          action={formAction}
          className="sticky bottom-3 mt-5 rounded-xl border border-navy/15 bg-white/95 p-3 shadow-[var(--shadow-elevated)] backdrop-blur sm:static sm:bg-white sm:p-4"
        >
          <input
            type="hidden"
            name="sessionId"
            value={session.id}
          />

          <input
            type="hidden"
            name="entries"
            value={JSON.stringify(
              dirtyEntries,
            )}
          />

          {state.message ? (
            <p
              role="alert"
              className={`mb-3 rounded-lg border px-3 py-2 text-[13px] leading-relaxed ${
                state.phase === "error"
                  ? "border-soft-coral/50 bg-soft-coral/10 text-navy"
                  : "border-soft-green/50 bg-soft-green/15 text-navy"
              }`}
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-navy/50">
              변경된 출결{" "}
              <strong className="text-navy">
                {dirtyEntries.length.toLocaleString(
                  "ko-KR",
                )}
                명
              </strong>
            </p>

            <button
              type="submit"
              disabled={!canSubmit}
              className="min-h-12 w-full rounded-lg bg-navy px-6 text-[14px] font-bold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
            >
              {isPending
                ? "저장 중..."
                : "출결 저장"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
