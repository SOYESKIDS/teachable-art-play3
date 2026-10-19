import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchStaffAttendance } from "@/lib/staff/attendance-queries";
import { fetchStaffObservations } from "@/lib/staff/observation-queries";
import { summarizeReportAttendance, summarizeReportObservations } from "./session-report-summary";

/**
 * 결과 보고 화면이 읽는 값 — B단계.
 *
 * ── 이미 저장된 것을 모아 온다 ───────────────────────────────────
 *
 * 결과 보고의 앞 세 단계(진행 확인 · 출석 · 관찰 보충)는 **새로 입력받는 값이
 * 아니다.** 회차 상태 · 출결 · 관찰은 이미 각자의 화면에서 저장되고 있다. 이
 * 함수는 그것을 불러와 교사가 확인만 하면 되게 한다.
 *
 * ★ 숫자를 여기서 만들지 않는다. 출석 인원도 관찰 건수도 저장된 행을 센 값이다.
 *   비어 있으면 0 이 아니라 "아직 기록 없음"으로 구분해 돌려준다 — 0명 참석과
 *   출결 미입력은 다른 상태다.
 *
 * 개인 quick_memos와 기관 제출 보고서는 다르다. 개인 메모는 별도 컴포넌트에서
 * 작성자 권한으로 읽고, 이 집계에는 섞지 않는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ReportAttendanceSummary {
  /** 출결을 한 건이라도 입력했는가 */
  recorded: boolean;
  /** 이 반 명단 인원 */
  rosterCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leftEarlyCount: number;
  historicalRecordedCount: number;
  /** 아직 입력하지 않은 원아 수 */
  unrecordedCount: number;
}

export interface ReportObservationSummary {
  rosterCount: number;
  /** 관찰을 남긴 원아 수 */
  recordedCount: number;
  /** 작성 중(draft) 상태로 남은 원아 수 */
  draftCount: number;
  completeCount: number;
  historicalRecordedCount: number;
  unrecordedCount: number;
}

export interface SessionReportData {
  sessionId: string;
  classId: string;
  className: string | null;
  scheduledDate: string | null;
  status: string;
  weekNo: number | null;
  /** 이 회차가 참조하는 실제 차시 제목. 저장소 주차 제목으로 대체하지 않는다. */
  weekTitle: string | null;
  attendance: ReportAttendanceSummary | null;
  observation: ReportObservationSummary | null;
}

export type SessionReportResult =
  | { ok: true; data: SessionReportData }
  | { ok: false; reason: "invalid_id" | "not_found" | "load_failed" };

export async function fetchSessionReport(
  supabase: SupabaseClient,
  organizationId: string,
  sessionId: string,
): Promise<SessionReportResult> {
  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(sessionId)) {
    return { ok: false, reason: "invalid_id" };
  }

  // 출결 조회가 회차 자체도 확인해 준다 (RLS 범위 포함).
  const attendance = await fetchStaffAttendance(supabase, organizationId, sessionId);
  if (!attendance.ok) return { ok: false, reason: attendance.reason };

  const observations = await fetchStaffObservations(supabase, organizationId, sessionId);

  const session = attendance.data.session;
  const attendanceSummary = summarizeReportAttendance(attendance.data.children);
  const observationSummary = observations.ok ? summarizeReportObservations(observations.data.children) : null;

  const weekNo = typeof session.weekNo === "number" ? session.weekNo : null;

  return {
    ok: true,
    data: {
      sessionId: session.id,
      classId: session.classId,
      className: session.className ?? null,
      scheduledDate: session.scheduledDate ?? null,
      status: session.status,
      weekNo,
      weekTitle: session.lessonTitle ?? null,
      attendance: attendanceSummary,
      // ★ 관찰 조회가 실패하면 null 이다. 0 으로 바꾸지 않는다.
      observation: observationSummary,
    },
  };
}
