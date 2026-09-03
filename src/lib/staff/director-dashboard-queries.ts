import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DASHBOARD_WINDOW_DAYS,
  MAX_DASHBOARD_FOLLOW_UPS,
  MAX_DASHBOARD_RECENT_REPORTS,
  MAX_DASHBOARD_RECORD_ROWS,
  MAX_DASHBOARD_SESSIONS,
  formatKoreanFullDate,
  shiftIsoDate,
  type DashboardFollowUpSession,
  type DashboardTodaySummary,
  type DirectorDashboardData,
} from "@/types/director-dashboard";
import { MAX_GROWTH_REPORT_LIST } from "@/types/staff-growth-report";
import type { ObservationRecordStatus } from "@/types/staff-observation";
import type { StaffSessionItem } from "@/types/staff-session";
import {
  fetchSessionsInRange,
  sortForBoard,
} from "./class-session-queries";
import { fetchGrowthReports } from "./growth-report-queries";

/**
 * SERVICE-12 — 원장 운영 대시보드 집계.
 *
 * ★ 권한 범위를 이 파일이 정하지 않는다.
 *   organization_id 로만 좁혀 질의하고, 무엇이 보이는지는 전부 RLS 가 결정한다.
 *     class_sessions / class_session_attendance / class_session_observations
 *       → 원장 분기(has_org_role(organization_id, ['director']))가 열려 있다
 *     child_growth_reports
 *       → 원장 분기에 status = 'complete' 가 함께 걸려 있어 작성 중 리포트는
 *         **존재 자체가 조회되지 않는다.** 그래서 draft 를 세는 코드가 없다.
 *   organizationId 는 Client 값이 아니라 requireDirector() 가 DB 에서 읽어 온
 *   membership 에서만 나온다.
 *
 * ★ N+1 금지
 *   수업 1묶음 → 반/배정/프로그램/차시 각 1회(fetchSessionsInRange 재사용)
 *   → 출결 1회 → 관찰 1회. 원아별·수업별 반복 질의가 없다.
 *   성장 리포트도 기존 fetchGrowthReports 를 그대로 쓴다.
 *
 * ★ 틀린 숫자를 만들지 않는다.
 *   조회가 실패하거나 상한에 닿으면 reliable = false 로 내리고,
 *   화면은 숫자 대신 "집계할 수 없다"고 말한다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function logQueryFailure(scope: string, message: string) {
  // 원인 파악에 필요한 최소한만 남긴다. 행 내용·아동 정보는 로그에 넣지 않는다.
  console.error(`[staff/director-dashboard] ${scope} query failed: ${message}`);
}

interface AttendanceLookupRow {
  class_session_id: string;
}

interface ObservationLookupRow {
  class_session_id: string;
  record_status: ObservationRecordStatus;
}

/** 조회 실패/미조회 상태의 빈 대시보드 — 화면이 항상 렌더될 수 있게 한다 */
function emptyDashboard(today: string): DirectorDashboardData {
  return {
    today,
    todayLabel: formatKoreanFullDate(today),
    windowStart: shiftIsoDate(today, -(DASHBOARD_WINDOW_DAYS - 1)),
    windowDays: DASHBOARD_WINDOW_DAYS,

    todaySummary: {
      total: 0,
      scheduled: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    },
    todaySessions: [],

    attendance: {
      targetSessions: 0,
      recordedSessions: 0,
      withoutRecordSessions: 0,
      reliable: false,
    },
    observation: {
      totalRecords: 0,
      completeRecords: 0,
      sessionsWithoutRecord: 0,
      reliable: false,
    },
    growthReport: { completedCount: 0, truncated: false },

    attendanceFollowUps: [],
    observationFollowUps: [],
    recentReports: [],

    sessionsOk: false,
    reportsOk: false,
    sessionsTruncated: false,
  };
}

/**
 * 출결/관찰 집계의 대상 수업.
 *
 * "오늘까지 이미 있었던 수업" 중 취소되지 않은 것.
 *
 *   scheduled_date is not null : 언제 있었는지 알 수 없는 수업은 세지 않는다
 *   scheduled_date <= today    : ★ 아직 오지 않은 수업을 "기록 없음"으로 잡지 않는다
 *                                (fetchSessionsInRange 의 .lte 와 이중으로 건다 —
 *                                 조회 조건이 바뀌어도 이 규칙은 남아야 한다)
 *   status <> 'cancelled'      : 취소된 수업에는 기록을 요구하지 않는다
 */
function isRecordTarget(session: StaffSessionItem, today: string): boolean {
  if (session.scheduled_date === null) return false;
  if (session.scheduled_date > today) return false;

  return session.status !== "cancelled";
}

/**
 * 같은 반 · 같은 예정일 · 같은 차시로 등록된 수업이 몇 개인가.
 *
 * 화면에서 두 줄이 완전히 똑같아 보이는 경우를 사용자에게 알려 주기 위한 값이다.
 * 추가 질의 없이 이미 읽어 온 수업 목록만으로 센다.
 */
function countSameSlotSessions(
  sessions: StaffSessionItem[],
): Map<string, number> {
  const slotKey = (session: StaffSessionItem) =>
    `${session.class_id}|${session.scheduled_date ?? ""}|${session.lesson_id}`;

  const perSlot = new Map<string, number>();

  for (const session of sessions) {
    const key = slotKey(session);
    perSlot.set(key, (perSlot.get(key) ?? 0) + 1);
  }

  const perSession = new Map<string, number>();

  for (const session of sessions) {
    perSession.set(session.id, perSlot.get(slotKey(session)) ?? 1);
  }

  return perSession;
}

/**
 * 원장 대시보드 한 화면에 필요한 집계.
 *
 * 실패는 영역별로 격리한다. 성장 리포트 조회가 실패해도 오늘 수업은 보여야 하고,
 * 반대도 마찬가지다. 그래서 전체를 실패시키지 않고 플래그로 내려보낸다.
 */
export async function fetchDirectorDashboard(
  supabase: SupabaseClient,
  organizationId: string,
  today: string,
): Promise<DirectorDashboardData> {
  if (!UUID_PATTERN.test(organizationId)) {
    return emptyDashboard(today);
  }

  const windowStart = shiftIsoDate(today, -(DASHBOARD_WINDOW_DAYS - 1));

  // 수업과 성장 리포트는 서로 의존하지 않는다 → 병렬로 읽는다.
  const [sessionResult, reportResult] = await Promise.all([
    fetchSessionsInRange(
      supabase,
      organizationId,
      windowStart,
      today,
      MAX_DASHBOARD_SESSIONS,
    ),
    fetchGrowthReports(supabase, organizationId),
  ]);

  const dashboard = emptyDashboard(today);

  // ---------------------------------------------------------------
  // 성장 리포트 — 원장에게는 완료본만 돌아온다(RLS)
  // ---------------------------------------------------------------
  if (reportResult.ok) {
    // 방어적으로 한 번 더 거른다. 정책이 이미 걸러 주지만, 이 화면의 문구가
    // "작성 완료"라고 단정하므로 화면 쪽에서도 같은 조건을 유지한다.
    const completed = reportResult.reports.filter(
      (report) => report.status === "complete",
    );

    dashboard.reportsOk = true;
    dashboard.growthReport = {
      completedCount: completed.length,
      truncated: reportResult.reports.length >= MAX_GROWTH_REPORT_LIST,
    };
    // fetchGrowthReports 가 period_end 내림차순으로 이미 정렬해 돌려준다.
    dashboard.recentReports = completed.slice(0, MAX_DASHBOARD_RECENT_REPORTS);
  }

  if (!sessionResult.ok) {
    return dashboard;
  }

  dashboard.sessionsOk = true;
  dashboard.sessionsTruncated = sessionResult.truncated;

  const sessions = sessionResult.sessions;

  // ---------------------------------------------------------------
  // 오늘 수업
  // ---------------------------------------------------------------
  const todaySessions = sessions.filter(
    (session) => session.scheduled_date === today,
  );

  const todaySummary: DashboardTodaySummary = {
    total: todaySessions.length,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const session of todaySessions) {
    if (session.status === "scheduled") todaySummary.scheduled += 1;
    else if (session.status === "in_progress") todaySummary.inProgress += 1;
    else if (session.status === "completed") todaySummary.completed += 1;
    else todaySummary.cancelled += 1;
  }

  dashboard.todaySummary = todaySummary;
  dashboard.todaySessions = sortForBoard(todaySessions);

  const targetSessions = sessions.filter((session) =>
    isRecordTarget(session, today),
  );

  if (targetSessions.length === 0) {
    // 집계할 수업이 없으면 질의도 하지 않는다. 0건은 사실이므로 reliable 이다.
    dashboard.attendance = {
      targetSessions: 0,
      recordedSessions: 0,
      withoutRecordSessions: 0,
      reliable: true,
    };
    dashboard.observation = {
      totalRecords: 0,
      completeRecords: 0,
      sessionsWithoutRecord: 0,
      reliable: true,
    };

    return dashboard;
  }

  const targetIds = targetSessions.map((session) => session.id);
  const sameSlotCounts = countSameSlotSessions(targetSessions);

  const toFollowUps = (
    sessions: StaffSessionItem[],
  ): DashboardFollowUpSession[] =>
    sessions.slice(0, MAX_DASHBOARD_FOLLOW_UPS).map((session) => ({
      session,
      sameSlotCount: sameSlotCounts.get(session.id) ?? 1,
    }));

  // 출결/관찰은 "이 수업들에 기록이 있는가"만 본다. 아동 정보는 읽지 않는다.
  const [attendanceResult, observationResult] = await Promise.all([
    supabase
      .from("class_session_attendance")
      .select("class_session_id")
      .eq("organization_id", organizationId)
      .in("class_session_id", targetIds)
      .limit(MAX_DASHBOARD_RECORD_ROWS),

    supabase
      .from("class_session_observations")
      .select("class_session_id, record_status")
      .eq("organization_id", organizationId)
      .in("class_session_id", targetIds)
      .limit(MAX_DASHBOARD_RECORD_ROWS),
  ]);

  // ---------------------------------------------------------------
  // 출결 기록 — "완결"이 아니라 "존재"만 판단한다
  // ---------------------------------------------------------------
  if (attendanceResult.error) {
    logQueryFailure("attendance", attendanceResult.error.message);
  } else {
    const rows = (attendanceResult.data ?? []) as unknown as AttendanceLookupRow[];
    // 상한에 닿았다면 어떤 수업의 기록을 못 본 것일 수 있다 → 숫자를 믿지 않는다.
    const truncated = rows.length >= MAX_DASHBOARD_RECORD_ROWS;
    const recordedIds = new Set(rows.map((row) => row.class_session_id));

    const withoutRecord = targetSessions.filter(
      (session) => !recordedIds.has(session.id),
    );

    dashboard.attendance = {
      targetSessions: targetSessions.length,
      recordedSessions: targetSessions.length - withoutRecord.length,
      withoutRecordSessions: withoutRecord.length,
      reliable: !truncated,
    };

    if (!truncated) {
      // 최근 수업부터 보여준다 (fetchSessionsInRange 가 내림차순으로 준다).
      dashboard.attendanceFollowUps = toFollowUps(withoutRecord);
    }
  }

  // ---------------------------------------------------------------
  // 관찰 기록 — record_status 는 교사가 직접 정한 값이다 (AI 상태가 아니다)
  // ---------------------------------------------------------------
  if (observationResult.error) {
    logQueryFailure("observations", observationResult.error.message);
  } else {
    const rows = (observationResult.data ?? []) as unknown as ObservationLookupRow[];
    const truncated = rows.length >= MAX_DASHBOARD_RECORD_ROWS;

    const sessionIdsWithRecord = new Set(
      rows.map((row) => row.class_session_id),
    );

    const completeRecords = rows.filter(
      (row) => row.record_status === "complete",
    ).length;

    // ★ 완료된 수업만 본다.
    //   예정일이 지났어도 status 가 'scheduled' 인 수업은 "아직 완료 처리되지
    //   않은 수업"이지 "관찰을 안 쓴 수업"이 아니다. 그런 수업까지 여기 넣으면
    //   수업이 실제로 열렸는지도 모르면서 기록을 요구하는 셈이 된다.
    //   (그 수업은 출결 카드가 이미 사실 그대로 보여 준다)
    //
    //   관찰기록이 완료 수업에 반드시 있어야 한다는 규칙은 이 서비스 어디에도
    //   없다. 그래서 화면 문구도 "미작성/누락"이 아니라 "관찰 기록 없음"이다.
    const withoutRecord = targetSessions.filter(
      (session) =>
        session.status === "completed" && !sessionIdsWithRecord.has(session.id),
    );

    dashboard.observation = {
      totalRecords: rows.length,
      completeRecords,
      sessionsWithoutRecord: withoutRecord.length,
      reliable: !truncated,
    };

    if (!truncated) {
      dashboard.observationFollowUps = toFollowUps(withoutRecord);
    }
  }

  return dashboard;
}
