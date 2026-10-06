import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInSeoul } from "@/lib/staff/class-session-queries";
import { isFutureSessionDate } from "@/lib/staff/session-dates";

/**
 * 수업 쓰기 가드 (PHASE UAT-STABILIZATION).
 *
 * ★ 미래 수업에는 쓰지 않는다 — 수업 시작 · 출결 · 관찰 기록 · 빠른 메모 · 수업 마치기 · 사진.
 *   기준 날짜는 서비스 기준(한국 시간) `todayInSeoul()` — 보드 · 버튼과 같은 함수.
 *   예정일이 없는 수업(미정)은 지금과 같이 막지 않는다.
 *
 * ★ 종료된 배정(completed · cancelled)의 예정 수업은 시작하지 않는다.
 *   오늘의 수업 보드가 이미 숨기는 수업(buildTodayBoard)을 URL 로 직접 열어도 시작할 수 없게
 *   서버에서 같은 규칙을 다시 확인한다. 특정 데이터(STAGING-P8 등)를 지목하지 않는다.
 *
 * ★ 권한은 여기서 판정하지 않는다. 조회는 사용자 세션(RLS)으로 하고, 최종 권한 · 상태 판정은
 *   기존 RPC · RLS 가 그대로 한다. 이 가드는 그 앞에 "날짜 · 배정" 조건 하나를 더할 뿐이다.
 *
 * 한계: 같은 RPC 를 PostgREST 로 직접 부르면 이 가드를 지나지 않는다 — DB 쪽 가드는
 *   별도 migration 승인이 필요하다 (docs/11-production-readiness/uat-stabilization.md §Risks).
 */
export const FUTURE_SESSION_MESSAGE = "수업일에 열립니다.";
export const ENDED_ASSIGNMENT_MESSAGE = "종료된 프로그램 배정의 수업은 시작할 수 없습니다.";


type GuardResult = { ok: true } | { ok: false; message: string };

export async function guardSessionWrite(
  supabase: SupabaseClient,
  sessionId: string,
  options: { requireActiveAssignment?: boolean } = {},
): Promise<GuardResult> {
  const { data, error } = await supabase
    .from("class_sessions")
    .select("scheduled_date, class_program_assignment_id")
    .eq("id", sessionId)
    .maybeSingle();

  // 조회 실패 · 0건은 여기서 판단하지 않는다 — 뒤의 RPC · RLS 가 기존 문구로 거절한다.
  if (error || !data) return { ok: true };

  const row = data as { scheduled_date: string | null; class_program_assignment_id: string | null };

  if (isFutureSessionDate(row.scheduled_date, todayInSeoul())) {
    return { ok: false, message: FUTURE_SESSION_MESSAGE };
  }

  if (options.requireActiveAssignment && row.class_program_assignment_id) {
    const { data: assignment } = await supabase
      .from("class_program_assignments")
      .select("status")
      .eq("id", row.class_program_assignment_id)
      .maybeSingle();

    const status = (assignment as { status?: string } | null)?.status;
    if (status && status !== "active") {
      return { ok: false, message: ENDED_ASSIGNMENT_MESSAGE };
    }
  }

  return { ok: true };
}
