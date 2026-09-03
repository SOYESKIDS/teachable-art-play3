import type { OrganizationStatus } from "./organization";

/**
 * SERVICE-14 — 본사 운영 콘솔 타입 · 상수.
 *
 * ★ 이 화면은 기관도 교사도 아동도 평가하지 않는다.
 *   점수 · 등급 · 위험도 · 발달단계 필드를 두지 않는다. 여기 있는 값은 전부
 *   "몇 개가 있는가 / 언제였는가"라는 운영 사실이다.
 *   "출결 기록 없음 2회"는 사실이고, "운영 위험도 72점"은 만들지 않는다.
 *
 * ★ 개인정보를 담지 않는다.
 *   원아 이름 · 관찰 원문 · 교사 작성문 · 아이 발화 · 사진 · 학부모 공유 토큰을
 *   담을 필드가 없다. 담을 곳이 없으므로 실수로 새어 나갈 수도 없다.
 *
 * ★ 모르는 것은 0으로 말하지 않는다.
 *   조회가 실패하거나 집계 상한에 닿으면 숫자 대신 null 을 내려보내고
 *   화면은 "—"를 보여 준다. 0은 "없다"는 사실 주장이라 함부로 쓰지 않는다.
 */

/** 집계 기간 — SERVICE-12 원장 대시보드와 같은 30일 */
export const ADMIN_WINDOW_DAYS = 30;

/**
 * 집계 상한.
 *
 * 지금 규모(기관 한 자리 수)에서는 어디에도 닿지 않는다.
 * 기관 300개 · 반 1,000개 · 원아 수천 명까지를 염두에 둔 값이고,
 * 상한에 닿으면 숫자를 지어내지 않고 "집계할 수 없음"으로 내려간다.
 */
export const MAX_ADMIN_ORGANIZATIONS = 300;
export const MAX_ADMIN_CLASSES = 2000;
export const MAX_ADMIN_MEMBERS = 3000;
export const MAX_ADMIN_CHILDREN = 8000;
export const MAX_ADMIN_ASSIGNMENTS = 3000;
export const MAX_ADMIN_SESSIONS = 3000;
/** 출결/관찰 존재 확인용 행 상한 (수업 수 × 한 반 정원 여유분) */
export const MAX_ADMIN_RECORD_ROWS = 20000;

/**
 * `.in()` 한 번에 넣는 수업 id 개수.
 *
 * id 하나가 37자라 3,000개를 한 요청에 넣으면 URL 이 100KB 를 넘어 게이트웨이가
 * 거절한다. 그렇다고 수업마다 질의하면 N+1 이다. 그 사이를 chunk 로 메운다 —
 * 요청 수는 수업 수에 비례하지만 상수 계수가 200 이라 실제로는 몇 회에 그친다.
 */
export const ADMIN_ID_CHUNK_SIZE = 200;

/** 화면에 한 번에 보여 줄 개수 */
export const MAX_ADMIN_ATTENTION_ORGS = 8;
export const MAX_ADMIN_RECENT_ITEMS = 5;
/** 기관 행에 배지로 펼칠 확인 항목 수. 나머지는 "+N"으로 접는다. */
export const MAX_ADMIN_ATTENTION_BADGES = 3;

/**
 * 상단 KPI.
 *
 * ★ 전부 **운영 중(active)인 기관에 속한 것만** 센다.
 *   기관이 운영 종료됐는데 그 안의 반·교사·원아·수업·리포트가 아직 active 라면,
 *   "운영 기관"에서는 빠지고 다른 KPI 에는 들어가 서로 어긋난 숫자가 된다.
 *   그래서 기준을 하나로 맞춘다 — 이 화면이 말하는 것은 "지금 운영 중인 곳"이다.
 *   운영이 끝난 기관까지 포함한 전체 목록은 /admin/organizations 가 담당한다.
 *
 * null = 집계 불가(조회 실패 또는 상한 초과). 화면은 "—"를 보여 준다.
 */
export interface AdminKpis {
  /** status = 'active' 인 기관 수 */
  activeOrganizations: number | null;
  /** 운영 기관에 속한 active 반 수 */
  activeClasses: number | null;
  /** 운영 기관의 active teacher **소속 건수** (사람 수가 아니다) */
  teacherMemberships: number | null;
  /** 운영 기관에 속한 active 원아 수 */
  activeChildren: number | null;
  /** 운영 기관의 최근 30일 수업 수 (취소 제외) */
  recentSessions: number | null;
  /** 운영 기관의 status = 'complete' 성장 리포트 수 */
  completedReports: number | null;
}

/**
 * 기관 행에 붙는 확인 항목.
 *
 * ★ 사실만 담는다. 심각도도 순위도 없다.
 */
export type AdminAttentionKind =
  | "attendance_missing"
  | "observation_missing"
  | "no_class"
  | "no_teacher"
  | "no_program";

export interface AdminAttentionItem {
  kind: AdminAttentionKind;
  /** 개수가 의미 있는 항목만 채운다 (기록 없음 계열) */
  count?: number;
}

/** 기관 운영 현황 한 줄 */
export interface AdminOrganizationRow {
  id: string;
  name: string;
  status: OrganizationStatus;

  classCount: number;
  teacherCount: number;
  childCount: number;
  /** 운영 중(active)인 프로그램 배정 수 */
  assignmentCount: number;

  /** 최근 수업일 (YYYY-MM-DD). 30일 창 안에 수업이 없으면 null */
  lastSessionDate: string | null;
  /** 최근 30일 수업 수 (취소 제외) */
  recentSessionCount: number;

  attention: AdminAttentionItem[];
}

/** 최근 완료된 성장 리포트 (개인정보 없이 기관 · 기간 · 완료 시각만) */
export interface AdminRecentReport {
  id: string;
  organizationId: string;
  organizationName: string;
  periodStart: string;
  periodEnd: string;
  completedAt: string;
}

/** 최근 수업 (기관 · 반 · 날짜 · 상태) */
export interface AdminRecentSession {
  id: string;
  organizationId: string;
  organizationName: string;
  className: string | null;
  scheduledDate: string;
  completedCount: number;
}

export interface AdminDashboardData {
  /** Asia/Seoul 기준 오늘 (YYYY-MM-DD) */
  today: string;
  /** "2026년 9월 3일" — 서버에서 만들어 내려보낸다 */
  todayLabel: string;
  windowStart: string;
  windowDays: number;

  kpis: AdminKpis;
  organizations: AdminOrganizationRow[];
  attentionOrganizations: AdminOrganizationRow[];
  recentReports: AdminRecentReport[];
  recentSessions: AdminRecentSession[];

  /** 기관 목록 조회가 성공했는가 */
  organizationsOk: boolean;
  /** 규모/교사/원아/배정 집계가 믿을 만한가 (상한 미도달 + 조회 성공) */
  rosterReliable: boolean;
  /** 수업 수·최근 수업일이 믿을 만한가 */
  sessionsReliable: boolean;
  /**
   * 출결·관찰 "기록 없음" 집계가 믿을 만한가.
   *
   * 수업 조회가 온전해야 하고, 그 수업들의 출결/관찰 행도 상한에 닿지 않아야 한다.
   * 수업 수는 맞는데 기록 조회만 잘린 경우가 있어 sessionsReliable 과 분리한다.
   */
  activityReliable: boolean;
  /** 최근 활동 조회가 성공했는가 */
  recentOk: boolean;
}

/** 기관 상세 상단의 운영 요약 */
export interface AdminOrganizationSummary {
  status: OrganizationStatus;

  directorCount: number | null;
  teacherCount: number | null;
  classCount: number | null;
  childCount: number | null;
  assignmentCount: number | null;

  lastSessionDate: string | null;
  recentSessionCount: number | null;
  completedReportCount: number | null;

  windowDays: number;
  attention: AdminAttentionItem[];
  /** 확인 항목 계산이 믿을 만한가 */
  attentionReliable: boolean;
}

/** 확인 항목 한국어 표기. 평가어(누락 · 경고 · 위험)를 쓰지 않는다. */
export const ADMIN_ATTENTION_LABELS: Record<AdminAttentionKind, string> = {
  attendance_missing: "출결 기록 없음",
  observation_missing: "관찰 기록 없음",
  no_class: "운영 중인 반 없음",
  no_teacher: "배정된 교사 없음",
  no_program: "프로그램 미배정",
};

/** 배지 문구: "출결 기록 없음 2회" / "프로그램 미배정" */
export function formatAttentionItem(item: AdminAttentionItem): string {
  const label = ADMIN_ATTENTION_LABELS[item.kind];

  return item.count === undefined
    ? label
    : `${label} ${item.count.toLocaleString("ko-KR")}회`;
}
