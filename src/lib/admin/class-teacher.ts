import type { TeacherMemberStatus } from "@/types/class-teacher";

/**
 * 담당 교사 관리 공용 라벨 · 표시 헬퍼.
 * class-child.ts와 같은 역할이며 Client / Server 공용이라 Supabase 의존성을 두지 않는다.
 */

export const TEACHER_MEMBER_STATUS_LABELS: Record<TeacherMemberStatus, string> =
  {
    active: "활성",
    invited: "초대 대기",
    disabled: "비활성",
  };

export const TEACHER_MEMBER_STATUS_BADGE_CLASSES: Record<
  TeacherMemberStatus,
  string
> = {
  active: "bg-soft-green/20 text-navy border-soft-green/50",
  invited: "bg-pale-yellow/40 text-navy border-yellow/50",
  disabled: "bg-navy/5 text-navy/50 border-navy/15",
};

/** 배정 대상이 될 수 있는 멤버 상태는 active 하나뿐이다 */
export function canAssignClasses(status: TeacherMemberStatus): boolean {
  return status === "active";
}

/**
 * 반 목록에 담당 교사를 좁은 폭으로 표시하기 위한 요약.
 *   []                    → "미배정"
 *   ["김교사"]             → "김교사"
 *   ["김교사", "박교사"]    → "김교사 외 1명"
 */
export function formatTeacherNames(names: string[]): string {
  if (names.length === 0) return "미배정";
  if (names.length === 1) return names[0];

  return `${names[0]} 외 ${names.length - 1}명`;
}

/** 교사가 담당하는 반이 여러 개일 때 한 줄로 보여준다 */
export function formatAssignedClassNames(names: string[]): string {
  return names.length === 0 ? "미배정" : names.join(" · ");
}
