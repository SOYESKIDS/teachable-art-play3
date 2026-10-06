"use server";

import { requireTeacher } from "@/lib/auth/organization";
import { guardSessionWrite } from "@/lib/staff/session-write-guard";
import { UUID_PATTERN, logRpcFailure, toUserFacingError } from "@/lib/errors/rpc-errors";
import type { GrowthSelection, GrowthStage } from "@/types/staff-observation";

/**
 * Observation 2.0 저장 (DEC-086 · DEC-099 · DEC-100).
 *
 * · [임시저장] = draft · [관찰 완료하고 다음 아이] = complete
 * · 관찰 본문 + 관찰 포인트(Growth5)를 한 RPC 에서 원자적으로 저장한다
 * · 행 없음 = 기록 없음 · stage 없는 선택은 서버가 거부
 * · 동시성: expectedUpdatedAt (last-write-wins 금지)
 * · 본문을 로그에 남기지 않는다
 */

export interface SaveObservationInput {
  sessionId: string;
  childId: string;
  teacherNote: string;
  childVoice: string;
  recordStatus: "draft" | "complete";
  growth: GrowthSelection[];
  expectedUpdatedAt: string | null;
}

export interface SaveObservationResult {
  ok: boolean;
  message: string | null;
  conflict: boolean;
  observationId: string | null;
  updatedAt: string | null;
  recordStatus: "draft" | "complete" | null;
}

const STAGES: GrowthStage[] = ["together", "after_modeling", "independent"];

export async function saveClassObservationAction(input: SaveObservationInput): Promise<SaveObservationResult> {
  const fail = (message: string, conflict = false): SaveObservationResult => ({
    ok: false,
    message,
    conflict,
    observationId: null,
    updatedAt: null,
    recordStatus: null,
  });

  if (!UUID_PATTERN.test(input.sessionId) || !UUID_PATTERN.test(input.childId)) {
    return fail("요청 값을 확인할 수 없습니다.");
  }

  if (input.recordStatus !== "draft" && input.recordStatus !== "complete") {
    return fail("작성 상태 값이 올바르지 않습니다.");
  }

  if (
    !Array.isArray(input.growth) ||
    input.growth.length > 5 ||
    input.growth.some((item) => typeof item.metricCode !== "string" || !STAGES.includes(item.stage))
  ) {
    return fail("방식을 선택하거나 이 관찰 포인트 선택을 해제해 주세요.");
  }

  const { supabase } = await requireTeacher();

  const guard = await guardSessionWrite(supabase, input.sessionId);
  if (!guard.ok) return fail(guard.message);

  const { data, error } = await supabase.rpc("save_class_observation", {
    p_session_id: input.sessionId,
    p_child_id: input.childId,
    p_teacher_note: input.teacherNote,
    p_child_voice: input.childVoice,
    p_record_status: input.recordStatus,
    p_growth: input.growth.map((item) => ({ metric_code: item.metricCode, stage: item.stage })),
    p_expected_updated_at: input.expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("observation v2 save", error);
    const mapped = toUserFacingError(error, "관찰 기록을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.");
    return fail(mapped.message, mapped.kind === "conflict");
  }

  const row = (data ?? {}) as { observation_id?: string; updated_at?: string; record_status?: "draft" | "complete" };

  return {
    ok: true,
    message: input.recordStatus === "complete" ? "관찰 완료로 저장했습니다." : "임시저장했습니다.",
    conflict: false,
    observationId: row.observation_id ?? null,
    updatedAt: row.updated_at ?? null,
    recordStatus: row.record_status ?? input.recordStatus,
  };
}
