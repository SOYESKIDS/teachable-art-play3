import {
  canAssignClasses,
  formatAssignedClassNames,
  TEACHER_MEMBER_STATUS_BADGE_CLASSES,
  TEACHER_MEMBER_STATUS_LABELS,
} from "@/lib/admin/class-teacher";
import type { ClassListItem } from "@/types/class-child";
import type {
  TeacherAssignmentSummary,
  TeacherAssignmentViewModel,
} from "@/types/class-teacher";
import { TeacherAssignmentDialog } from "./TeacherAssignmentDialog";

interface TeacherAssignmentSectionProps {
  organizationId: string;
  teachers: TeacherAssignmentViewModel[];
  /** 신규 배정 후보 — 운영 중인 반만 */
  assignableClasses: ClassListItem[];
  summary: TeacherAssignmentSummary;
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

/** 담당 반을 한 줄로 표시한다. 보관된 반은 흐리게 구분한다. */
function AssignedClasses({
  teacher,
}: {
  teacher: TeacherAssignmentViewModel;
}) {
  if (teacher.assignedClasses.length === 0) {
    return <span className="text-navy/45">미배정</span>;
  }

  return (
    <span className="break-words">
      {teacher.assignedClasses.map((item, index) => (
        <span key={item.classId}>
          {index > 0 ? <span className="text-navy/30"> · </span> : null}
          <span
            className={item.classStatus === "archived" ? "text-navy/45" : ""}
          >
            {item.className}
            {item.classStatus === "archived" ? " (보관)" : ""}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * 담당 교사 관리 영역.
 *
 * Server Component다 — 목록은 정적이고 배정 Dialog만 Client다.
 * 이번 단계에서는 "이미 등록된 교사"의 반 배정만 다룬다.
 * 교사 초대(이메일 발송)는 제공하지 않으므로 초대 버튼도 두지 않는다.
 */
export function TeacherAssignmentSection({
  organizationId,
  teachers,
  assignableClasses,
  summary,
  hasError,
}: TeacherAssignmentSectionProps) {
  return (
    <section className="rounded-xl border border-navy/10 bg-white p-5 lg:col-span-2">
      <div>
        <h2 className="text-[15px] font-bold text-navy">담당 교사 관리</h2>
        <p className="mt-1 text-[12px] text-navy/50">
          이미 이 기관에 등록된 교사의 담당 반을 관리합니다. 한 교사가 여러 반을
          담당할 수 있습니다.
        </p>
      </div>

      {hasError ? (
        <p className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-6 text-center text-[13px] text-navy/55">
          교사 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <SummaryItem label="등록 교사" value={summary.total} />
            <SummaryItem label="활성 교사" value={summary.active} />
            <SummaryItem label="배정 완료" value={summary.assigned} />
            <SummaryItem label="미배정" value={summary.unassigned} />
          </dl>

          {teachers.length === 0 ? (
            <div className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-navy">
                아직 등록된 교사가 없습니다.
              </p>
              <p className="mt-1 text-[13px] text-navy/50">
                교사 초대 기능은 추후 제공됩니다.
              </p>
            </div>
          ) : (
            <>
              {/* PC: compact table */}
              <div className="mt-4 hidden overflow-hidden rounded-lg border border-navy/10 lg:block">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface-soft text-navy/50">
                      <th className="px-4 py-2.5 text-left font-semibold">
                        교사명
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        멤버 상태
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        담당 반
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher) => (
                      <tr
                        key={teacher.membershipId}
                        className="border-t border-navy/8 bg-white"
                      >
                        <td className="px-4 py-3 font-semibold text-navy">
                          {teacher.displayName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 text-[12px] font-semibold ${TEACHER_MEMBER_STATUS_BADGE_CLASSES[teacher.membershipStatus]}`}
                          >
                            {
                              TEACHER_MEMBER_STATUS_LABELS[
                                teacher.membershipStatus
                              ]
                            }
                          </span>
                        </td>
                        <td className="px-4 py-3 text-navy/70">
                          <AssignedClasses teacher={teacher} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canAssignClasses(teacher.membershipStatus) ? (
                            <TeacherAssignmentDialog
                              organizationId={organizationId}
                              teacher={teacher}
                              assignableClasses={assignableClasses}
                            />
                          ) : (
                            <span className="text-[12px] text-navy/40">
                              활성 교사만 배정 가능
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
                {teachers.map((teacher) => (
                  <li
                    key={teacher.membershipId}
                    className="rounded-lg border border-navy/10 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-navy">
                          {teacher.displayName}
                        </p>
                        <p className="mt-0.5 break-words text-[12px] text-navy/55">
                          담당 반:{" "}
                          {formatAssignedClassNames(
                            teacher.assignedClasses.map((item) =>
                              item.classStatus === "archived"
                                ? `${item.className} (보관)`
                                : item.className,
                            ),
                          )}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[12px] font-semibold ${TEACHER_MEMBER_STATUS_BADGE_CLASSES[teacher.membershipStatus]}`}
                      >
                        {TEACHER_MEMBER_STATUS_LABELS[teacher.membershipStatus]}
                      </span>
                    </div>
                    <div className="mt-2.5 flex justify-end border-t border-navy/8 pt-2.5">
                      {canAssignClasses(teacher.membershipStatus) ? (
                        <TeacherAssignmentDialog
                          organizationId={organizationId}
                          teacher={teacher}
                          assignableClasses={assignableClasses}
                        />
                      ) : (
                        <span className="text-[12px] text-navy/40">
                          활성 교사만 배정 가능
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
