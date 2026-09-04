import type { OrganizationStatus } from "./organization";

/**
 * SERVICE-16 — 서비스 오픈 준비 화면 타입.
 *
 * ★ 평가하지 않는다.
 *   위험 점수 · 등급 · 순위를 만들지 않는다. 여기 있는 것은 전부
 *   "설정이 되어 있는가 / 몇 개인가"라는 사실이다.
 *
 * ★ 색으로만 말하지 않는다.
 *   모든 상태에 한국어 라벨(`label`)이 함께 있고, 화면은 라벨을 반드시 렌더한다.
 *
 * ★ 삭제 기능이 아니다.
 *   이 화면은 읽기 전용이다. 테스트 데이터 정리는 별도 문서와 승인 절차로 다룬다.
 */

/** 준비 항목 하나의 상태. done/pending 두 가지뿐이며 중간 점수가 없다. */
export interface ReadinessItem {
  key: string;
  /** 화면에 그대로 나가는 항목 이름 */
  label: string;
  /** true = 설정됨 */
  done: boolean;
  /** "2개" "미설정" 처럼 사실만 담는 짧은 값 */
  detail: string;
}

/** 기관 한 곳의 도입 준비 상태 */
export interface OrganizationReadiness {
  id: string;
  name: string;
  status: OrganizationStatus;
  items: ReadinessItem[];
  /** 완료된 항목 수 (점수가 아니라 개수다) */
  doneCount: number;
  totalCount: number;
}

/** 상단 요약 숫자. null = 확인 불가 → 화면은 "—" */
export interface ReadinessTotals {
  activeOrganizations: number | null;
  activeClasses: number | null;
  activeChildren: number | null;
  teacherMemberships: number | null;
  recentSessions: number | null;
  completedReports: number | null;
  /**
   * 활성 학부모 공유 수.
   *
   * ★ 언제나 null 이다.
   *   child_growth_report_shares 의 SELECT Policy 에는 원장 분기만 있고
   *   본사 관리자 분기가 없다(SERVICE-13 의 의도된 경계).
   *   RLS 를 우회해서까지 볼 값이 아니므로 관리자 화면에서는 세지 않는다.
   *   화면은 "—" 와 함께 그 이유를 문장으로 밝힌다.
   */
  activeParentShares: number | null;
}

export interface ReadinessData {
  today: string;
  todayLabel: string;
  windowDays: number;

  totals: ReadinessTotals;
  organizations: OrganizationReadiness[];

  /** 기관 목록 조회가 성공했는가 */
  ok: boolean;
  /** 집계가 상한에 닿지 않았는가 */
  reliable: boolean;
}

/** 학부모 공유 수를 세지 않는 이유. 화면에 그대로 보여 준다. */
export const PARENT_SHARE_NOTE =
  "학부모 공유 현황은 기관 원장 화면에서만 확인할 수 있습니다. 본사 관리자에게는 조회 권한을 두지 않았습니다.";
