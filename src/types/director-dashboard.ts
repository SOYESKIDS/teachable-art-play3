import type { GrowthReportListItem } from "./staff-growth-report";
import type { StaffSessionItem } from "./staff-session";

/**
 * SERVICE-12 — 원장 운영 대시보드 타입 · 상수 · 표시 헬퍼.
 *
 * ★ 이 화면은 아동도 교사도 평가하지 않는다.
 *   점수 · 등급 · 순위 · 출석률 · 위험도 · 발달단계 필드를 두지 않는다.
 *   여기 있는 숫자는 전부 "몇 건이 기록되어 있는가"라는 사실 집계다.
 *
 * ★ 없는 것을 만들어내지 않는다.
 *   DB에 "출결 입력 완료" 같은 플래그가 없으므로 완결 여부를 추정하지 않는다.
 *   판단할 수 있는 것은 "출결 기록이 한 건이라도 있는가"뿐이고,
 *   화면 문구도 딱 거기까지만 말한다.
 *
 * ★ 원장이 볼 수 없는 것은 세지도 않는다.
 *   작성 중(draft) 성장 리포트는 20260901160000의 SELECT Policy가
 *   원장에게 아예 보여주지 않는다. 그래서 "작성 중 N건" 같은 항목이 없다.
 *   RLS를 우회해 개수만 세는 경로도 만들지 않는다.
 */

/** 집계 기간 — 최근 며칠의 수업을 볼 것인가 */
export const DASHBOARD_WINDOW_DAYS = 30;

/**
 * 집계 대상 수업 수 상한.
 *
 * 유치원 한 곳이 30일 동안 갖는 수업은 반 10개 기준 100건 안팎이다.
 * 300이면 정상 운영을 막지 않으면서, 데이터가 커져도 대시보드 하나가
 * DB를 통째로 읽는 일을 막는다. 상한에 닿으면 숫자를 보여주지 않고
 * "집계 범위를 넘었다"고 말한다 — 틀린 숫자보다 낫다.
 */
export const MAX_DASHBOARD_SESSIONS = 300;

/** 출결/관찰 존재 여부 확인용 행 상한 (수업 300 × 한 반 정원 여유분) */
export const MAX_DASHBOARD_RECORD_ROWS = 6000;

/** "확인이 필요한 기록"에 한 번에 보여줄 수업 수 */
export const MAX_DASHBOARD_FOLLOW_UPS = 5;

/** 최근 성장 리포트 노출 수 */
export const MAX_DASHBOARD_RECENT_REPORTS = 5;

/** 오늘 수업 상태 분포. class_sessions.status의 실제 값만 쓴다. */
export interface DashboardTodaySummary {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

/**
 * 출결 기록 현황.
 *
 * targetSessions : 최근 기간 중 예정일이 오늘까지인 수업 (취소 제외)
 * recordedSessions : 그중 출결 행이 한 건이라도 있는 수업
 * withoutRecordSessions : 출결 행이 아직 하나도 없는 수업
 *
 * ★ "완결"이 아니라 "존재"다.
 *   원아 전원이 입력되었는지는 현재 스키마로 단정할 수 없다.
 *   (반 이동 이력 때문에 그 수업의 정원 자체가 사후적으로 달라질 수 있다)
 */
export interface DashboardAttendanceSummary {
  targetSessions: number;
  recordedSessions: number;
  withoutRecordSessions: number;
  /** 조회 성공 + 상한 미도달일 때만 true. false면 숫자를 표시하지 않는다. */
  reliable: boolean;
}

/**
 * 관찰 기록 현황.
 *
 * completeRecords는 class_session_observations.record_status = 'complete',
 * 즉 **교사가 스스로 작성 완료로 표시한 기록**이다.
 * AI 관련 상태(SERVICE-10의 generated/accepted)는 쓰지 않는다.
 */
export interface DashboardObservationSummary {
  totalRecords: number;
  completeRecords: number;
  /** 완료된 수업인데 관찰 기록이 아직 한 건도 없는 수업 수 */
  sessionsWithoutRecord: number;
  reliable: boolean;
}

/**
 * 성장 리포트 현황.
 *
 * ★ 원장에게 보이는 것은 작성 완료본뿐이다(RLS). 그래서 완료 건수만 있다.
 */
export interface DashboardGrowthReportSummary {
  completedCount: number;
  /** 목록 상한에 닿았는가 — 닿았으면 "이상"으로 표기한다 */
  truncated: boolean;
}

/**
 * "확인이 필요한 기록" 한 줄.
 *
 * ★ sameSlotCount 는 만들어낸 번호가 아니다.
 *   같은 반 · 같은 예정일 · 같은 차시(lesson_id)를 가진 **기록 확인 대상 수업**이
 *   몇 개인지 센 값이다.
 *
 *   ★ 등록된 수업 전체 수가 아니다.
 *     집계 대상(isRecordTarget)만 세므로 취소된 수업은 포함되지 않는다.
 *     그래서 화면 문구도 "등록되어 있습니다"가 아니라
 *     "확인할 수업이 N회 있습니다"라고 쓴다.
 *
 * ★ session UUID 는 화면에 표시하지 않는다.
 *   구분에 쓰는 것은 차시명 · 상태 · 프로그램명처럼 사람이 읽는 사실뿐이다.
 */
export interface DashboardFollowUpSession {
  session: StaffSessionItem;
  sameSlotCount: number;
}

export interface DirectorDashboardData {
  /** Asia/Seoul 기준 오늘 (YYYY-MM-DD) */
  today: string;
  /** "2026년 9월 3일 목요일" — 서버에서 만들어 내려보낸다 */
  todayLabel: string;
  /** 집계 시작일 (YYYY-MM-DD) */
  windowStart: string;
  windowDays: number;

  todaySummary: DashboardTodaySummary;
  todaySessions: StaffSessionItem[];

  attendance: DashboardAttendanceSummary;
  observation: DashboardObservationSummary;
  growthReport: DashboardGrowthReportSummary;

  /** 출결 기록이 아직 없는 수업 (최대 MAX_DASHBOARD_FOLLOW_UPS건) */
  attendanceFollowUps: DashboardFollowUpSession[];
  /** 완료됐지만 관찰 기록이 아직 없는 수업 (최대 MAX_DASHBOARD_FOLLOW_UPS건) */
  observationFollowUps: DashboardFollowUpSession[];

  recentReports: GrowthReportListItem[];

  /** 수업 조회가 성공했는가 — false면 수업 관련 영역에 안내 문구를 보여준다 */
  sessionsOk: boolean;
  /** 성장 리포트 조회가 성공했는가 */
  reportsOk: boolean;
  /** 집계 대상 수업이 상한에 닿았는가 */
  sessionsTruncated: boolean;
}

const WEEKDAY_LABELS = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
] as const;

/**
 * "YYYY-MM-DD" → "2026년 9월 3일 목요일".
 *
 * ★ 시간대에 의존하지 않는다.
 *   Date.UTC로 만들고 getUTCDay()로 읽으므로 서버 TZ가 무엇이든 같은 값이 나온다.
 *   new Date("2026-09-03")를 로컬 게터로 읽으면 UTC-9 지역에서 하루가 밀린다.
 *
 * ★ 이 함수는 서버에서 실행되어 결과 문자열만 HTML로 내려간다.
 *   Client가 다시 계산하지 않으므로 hydration 불일치가 생길 수 없다.
 */
export function formatKoreanFullDate(isoDate: string): string {
  const parts = isoDate.split("-");

  if (parts.length !== 3) return isoDate;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return isoDate;
  }

  const weekday = WEEKDAY_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];

  return `${year}년 ${month}월 ${day}일 ${weekday}`;
}

/**
 * "YYYY-MM-DD"에서 며칠 앞/뒤 날짜를 구한다.
 *
 * 달력 날짜 연산이라 시간대를 섞지 않는다 — formatKoreanFullDate와 같은 이유로
 * UTC 자정 기준으로만 더하고 뺀다.
 */
export function shiftIsoDate(isoDate: string, days: number): string {
  const parts = isoDate.split("-");

  if (parts.length !== 3) return isoDate;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return isoDate;
  }

  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  const shiftedYear = String(shifted.getUTCFullYear()).padStart(4, "0");
  const shiftedMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const shiftedDay = String(shifted.getUTCDate()).padStart(2, "0");

  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}
