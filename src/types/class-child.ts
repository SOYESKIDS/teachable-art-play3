/** public.classes / public.children 대응 타입 (20260824_create_class_child_foundation.sql) */

export type ClassStatus = "active" | "archived";

export type AgeGroup = "age3" | "age4" | "age5" | "mixed";

export type ChildStatus = "active" | "inactive" | "graduated";

export interface ClassRow {
  id: string;
  organization_id: string;
  name: string;
  age_group: AgeGroup | null;
  school_year: number;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
}

export interface ChildRow {
  id: string;
  organization_id: string;
  /** 반 미배정 원아가 존재할 수 있어 nullable이다 */
  class_id: string | null;
  name: string;
  birth_year: number | null;
  status: ChildStatus;
  created_at: string;
  updated_at: string;
}

/**
 * 반 목록 표시용 ViewModel.
 * activeChildCount는 children.status = 'active'인 현재 재원 원아 수다.
 */
export interface ClassListItem extends ClassRow {
  activeChildCount: number;
}

/**
 * 원아 목록 표시용 ViewModel.
 * class_id를 사람이 읽을 수 있는 반 이름으로 풀어 둔다. 미배정이면 null.
 */
export interface ChildListItem extends ChildRow {
  className: string | null;
  classStatus: ClassStatus | null;
}

export interface ClassSummary {
  total: number;
  active: number;
  archived: number;
}

export interface ChildSummary {
  total: number;
  active: number;
  inactive: number;
  graduated: number;
  unassigned: number;
}
