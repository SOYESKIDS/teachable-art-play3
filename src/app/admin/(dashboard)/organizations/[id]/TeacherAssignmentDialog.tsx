"use client";

import { useActionState, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import type { ClassListItem } from "@/types/class-child";
import type { TeacherAssignmentViewModel } from "@/types/class-teacher";
import { saveTeacherAssignmentsAction } from "./teacher-assignment-actions";
import {
  CLASS_CHILD_FORM_INITIAL_STATE,
  type ClassChildFormState,
} from "./class-child-state";

interface TeacherAssignmentDialogProps {
  organizationId: string;
  teacher: TeacherAssignmentViewModel;
  /** 신규 배정 후보 — 호출부에서 운영 중(active)인 반만 넘긴다 */
  assignableClasses: ClassListItem[];
}

interface ClassOption {
  classId: string;
  label: string;
  /** 보관된 반은 기존 배정을 해제하기 위해서만 노출한다 */
  isArchived: boolean;
}

/**
 * 담당 반 배정 Modal.
 *
 * 한 교사가 여러 반을 담당할 수 있어 checkbox 다중 선택으로 만든다.
 * 체크를 모두 해제하고 저장하면 "미배정" 상태가 된다.
 *
 * class_teachers에는 UPDATE가 없으므로 서버에서 현재 배정과 비교해
 * 추가분만 INSERT, 제외분만 DELETE한다.
 */
export function TeacherAssignmentDialog({
  organizationId,
  teacher,
  assignableClasses,
}: TeacherAssignmentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 저장 성공 시 Dialog를 닫는 처리는 Action 안에서 한다(useEffect + setState 연쇄 렌더 회피).
  const [state, formAction, isPending] = useActionState(
    async (prevState: ClassChildFormState, formData: FormData) => {
      const result = await saveTeacherAssignmentsAction(prevState, formData);
      if (result.phase === "success") setIsOpen(false);
      return result;
    },
    CLASS_CHILD_FORM_INITIAL_STATE,
  );

  const assignedClassIds = useMemo(
    () => new Set(teacher.assignedClasses.map((item) => item.classId)),
    [teacher.assignedClasses],
  );

  /**
   * 선택 후보 = 운영 중인 반 + (이미 배정된 보관 반).
   * 보관된 반은 새로 배정할 수 없지만, 이미 배정되어 있다면 해제할 수 있어야 하므로 남긴다.
   */
  const options = useMemo<ClassOption[]>(() => {
    const active: ClassOption[] = assignableClasses.map((classRow) => ({
      classId: classRow.id,
      label: `${classRow.name} · ${classRow.school_year}학년도`,
      isArchived: false,
    }));

    const activeIds = new Set(assignableClasses.map((classRow) => classRow.id));

    const archivedAssigned: ClassOption[] = teacher.assignedClasses
      .filter((item) => !activeIds.has(item.classId))
      .map((item) => ({
        classId: item.classId,
        label: `${item.className} · ${item.schoolYear}학년도 (보관)`,
        isArchived: true,
      }));

    return [...active, ...archivedAssigned];
  }, [assignableClasses, teacher.assignedClasses]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center text-caption font-semibold text-trust-blue transition-opacity hover:opacity-70"
      >
        담당 반 관리
      </button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="담당 반 관리"
        description={`${teacher.displayName} 교사`}
        size="md"
        busy={isPending}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input
            type="hidden"
            name="organizationId"
            value={organizationId}
          />
          <input
            type="hidden"
            name="organizationMemberId"
            value={teacher.membershipId}
          />

          <div className="rounded-lg border border-line bg-surface-soft px-4 py-3">
            <p className="text-micro font-semibold text-ink-muted">
              현재 담당 반
            </p>
            <p className="mt-1 text-caption text-navy">
              {teacher.assignedClasses.length === 0
                ? "미배정"
                : teacher.assignedClasses
                    .map((item) =>
                      item.classStatus === "archived"
                        ? `${item.className} (보관)`
                        : item.className,
                    )
                    .join(" · ")}
            </p>
          </div>

          <fieldset className="flex flex-col gap-1.5" disabled={isPending}>
            <legend className="mb-1.5 text-micro font-semibold text-ink-muted">
              담당할 반 선택
            </legend>

            {options.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface-soft px-4 py-6 text-center text-caption text-ink-muted">
                운영 중인 반이 없습니다. 먼저 반을 등록해주세요.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {options.map((option) => (
                  <label
                    key={option.classId}
                    className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3.5 py-2.5 transition-colors hover:bg-navy/[0.03]"
                  >
                    <input
                      type="checkbox"
                      name="class_id"
                      value={option.classId}
                      defaultChecked={assignedClassIds.has(option.classId)}
                      className="h-4 w-4 shrink-0 accent-navy"
                    />
                    <span
                      className={`min-w-0 break-words text-caption ${
                        option.isArchived ? "text-ink-muted" : "text-navy"
                      }`}
                    >
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <p className="mt-1 text-micro text-ink-muted">
              체크를 모두 해제하고 저장하면 미배정 상태가 됩니다. 보관된 반은
              새로 배정할 수 없고 해제만 가능합니다.
            </p>
          </fieldset>

          {state.message ? (
            <p
              role="alert"
              className={`rounded-lg border px-3 py-2 text-caption ${
                state.phase === "error"
                  ? "border-soft-coral/50 bg-soft-coral/10 text-navy"
                  : "border-soft-green/50 bg-soft-green/15 text-navy"
              }`}
            >
              {state.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 h-11 rounded-lg bg-navy text-label font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "저장 중…" : "담당 반 저장"}
          </button>
        </form>
      </Dialog>
    </>
  );
}
