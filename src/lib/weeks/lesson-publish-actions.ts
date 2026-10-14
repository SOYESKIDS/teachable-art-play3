"use server";

import { requireHqStaff } from "@/lib/auth/admin";
import { guardWrite } from "@/lib/env/write-guard";
import { UUID_PATTERN } from "@/lib/errors/rpc-errors";

/**
 * 차시 발행 — E단계.
 *
 * ── 서버가 직접 판정한다 ────────────────────────────────────────
 *
 * 이 액션은 **상태도 미해결 건수도 역할도 받지 않는다.** 받으면 그 값이
 * 조작될 수 있고, 조작되면 검수하지 않은 주차가 발행된다.
 * `publish_lesson` RPC 안에서 DB 가 저장된 데이터를 직접 읽어 판정한다.
 *
 * ── 왜 체크섬을 받는가 ──────────────────────────────────────────
 *
 * 검수자가 내용을 확인한 시점과 발행 버튼을 누르는 시점 사이에 본문이 바뀔 수
 * 있다. 그러면 **검수하지 않은 내용이 발행된다.** 그래서 검수 화면이 보여준
 * 체크섬을 그대로 돌려받아, 서버가 지금 내용의 체크섬과 비교한다.
 * 다르면 거부하고 다시 검수하게 한다.
 *
 * 이 값은 권한이 아니다. 조작하면 **거부**될 뿐 통과되지 않는다.
 */

export type PublishFailure =
  | "invalid_input"
  | "forbidden"
  | "blocked"
  | "content_changed"
  | "failed";

export interface PublishLessonState {
  ok: boolean;
  reason?: PublishFailure;
  /** 사람이 읽을 설명. DB 가 돌려준 문장을 그대로 쓴다 */
  detail?: string;
  contentChecksum?: string;
}

export async function publishLessonAction(
  lessonId: string,
  reviewedChecksum: string,
): Promise<PublishLessonState> {
  // ★ 배포 환경 가드. 발행은 교사·교실 화면에 내용을 내보내는 쓰기다 —
  //   비운영 배포가 운영 DB 에 붙어 있을 때 여기서 멈춘다.
  guardWrite("weeks/lesson:publish");

  if (!UUID_PATTERN.test(lessonId)) {
    return { ok: false, reason: "invalid_input", detail: "차시 id 형식이 아닙니다." };
  }
  if (!/^[0-9a-f]{64}$/.test(reviewedChecksum)) {
    return {
      ok: false,
      reason: "invalid_input",
      detail: "검수 시점 체크섬이 필요합니다. 검수 화면을 새로 고친 뒤 다시 시도해 주세요.",
    };
  }

  // 로그인·HQ 소속만 여기서 본다. **발행 권한(admin)은 DB 가 다시 판정한다** —
  // sales 가 이 액션에 닿아도 RPC 가 거부한다.
  const { supabase } = await requireHqStaff();

  const { data, error } = await supabase.rpc("publish_lesson", {
    p_lesson_id: lessonId,
    p_reviewed_checksum: reviewedChecksum,
  });

  if (error) {
    const message = error.message ?? "";

    // 실패 이유를 구분해 돌려준다. 화면이 「다시 검수」와 「미해결 정리」를
    // 다르게 안내해야 한다.
    if (message.includes("검수 이후 본문이 바뀌었습니다")) {
      return { ok: false, reason: "content_changed", detail: message };
    }
    if (message.includes("발행할 수 없습니다")) {
      return { ok: false, reason: "blocked", detail: message };
    }
    if (error.code === "42501" || message.includes("본사 관리자만")) {
      return { ok: false, reason: "forbidden", detail: "발행 권한이 없습니다." };
    }

    console.error("[weeks] publish_lesson failed:", message);
    return { ok: false, reason: "failed", detail: "발행에 실패했습니다." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const checksum = (row as { content_checksum?: string } | null)?.content_checksum;

  return { ok: true, contentChecksum: checksum };
}

/* ───────────────────────────── 검수 상태 조회 */

export interface LessonReviewState {
  lessonId: string;
  weekNo: number;
  lessonStatus: string;
  programStatus: string;
  sectionCount: number;
  sceneCount: number;
  noteCount: number;
  unresolvedCount: number;
  openDecisionCount: number;
  /** 발행 요청에 그대로 되돌려 보낸다 */
  contentChecksum: string;
}

export type ReviewStateResult =
  | { ok: true; state: LessonReviewState }
  | { ok: false; reason: "forbidden" | "not_found" | "failed"; detail: string };

/**
 * 주차 검수 화면이 읽는 상태.
 *
 * ★ 저장소 fixture 로 대신하지 않는다. DB 가 답하지 못하면 **답하지 못했다고**
 *   돌려준다 — 화면이 정상처럼 보이면 아무도 적재가 안 된 것을 모른다.
 */
export async function getLessonReviewState(lessonId: string): Promise<ReviewStateResult> {
  if (!UUID_PATTERN.test(lessonId)) {
    return { ok: false, reason: "not_found", detail: "차시 id 형식이 아닙니다." };
  }

  const { supabase } = await requireHqStaff();

  const { data, error } = await supabase.rpc("lesson_review_state", { p_lesson_id: lessonId });

  if (error) {
    if (error.code === "42501" || (error.message ?? "").includes("본사 관리자만")) {
      return { ok: false, reason: "forbidden", detail: "검수 상태를 볼 권한이 없습니다." };
    }
    console.error("[weeks] lesson_review_state failed:", error.message);
    return { ok: false, reason: "failed", detail: "검수 상태를 읽지 못했습니다." };
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!row) {
    return { ok: false, reason: "not_found", detail: "차시를 찾을 수 없습니다." };
  }

  return {
    ok: true,
    state: {
      lessonId: String(row.reviewed_lesson_id),
      weekNo: Number(row.reviewed_week_no),
      lessonStatus: String(row.lesson_status),
      programStatus: String(row.program_status),
      sectionCount: Number(row.section_count),
      sceneCount: Number(row.scene_count),
      noteCount: Number(row.note_count),
      unresolvedCount: Number(row.unresolved_count),
      openDecisionCount: Number(row.open_decision_count),
      contentChecksum: String(row.content_checksum),
    },
  };
}
