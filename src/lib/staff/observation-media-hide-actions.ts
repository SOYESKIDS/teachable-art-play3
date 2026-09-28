"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/lib/auth/organization";
import { UUID_PATTERN, logRpcFailure, toUserFacingError } from "@/lib/errors/rpc-errors";

const OBSERVATION_MEDIA_BUCKET = "observation-media";

export interface HideMediaResult {
  ok: boolean;
  message: string;
}

/**
 * 사진 숨김 · Storage 정리 orchestration (DEC-088 · DEC-107).
 *
 * 1) hide_observation_media RPC — metadata 숨김 (즉시 조회 · 서명 대상에서 빠짐)
 * 2) 사용자 세션으로 Storage 객체 삭제 (hidden 사진만 허용하는 정책 · service role 미사용)
 * 3) mark_observation_media_storage RPC — 결과 기록 (실패하면 delete_failed · 다시 숨기기로 재시도)
 *
 * 한 DB transaction 이 아니다. Storage 삭제가 실패해도 사진은 숨김 상태로 남는다.
 * storage_path 는 화면 · 로그에 내보내지 않는다.
 */
export async function hideObservationMediaAction(input: { mediaId: string }): Promise<HideMediaResult> {
  if (!UUID_PATTERN.test(input.mediaId)) {
    return { ok: false, message: "요청 값을 확인할 수 없습니다." };
  }

  const { supabase } = await requireStaff();

  const hidden = await supabase.rpc("hide_observation_media", { p_media_id: input.mediaId });

  if (hidden.error) {
    logRpcFailure("media hide", hidden.error);
    return {
      ok: false,
      message: toUserFacingError(hidden.error, "사진을 숨기지 못했습니다. 잠시 후 다시 시도해 주세요.").message,
    };
  }

  const payload = (hidden.data ?? {}) as { storage_path?: string; storage_status?: string };

  if (payload.storage_path && payload.storage_status !== "deleted") {
    const removed = await supabase.storage.from(OBSERVATION_MEDIA_BUCKET).remove([payload.storage_path]);
    const deleted = !removed.error;

    if (removed.error) {
      console.error("[media hide] storage delete failed (will retry on next hide)");
    }

    const marked = await supabase.rpc("mark_observation_media_storage", {
      p_media_id: input.mediaId,
      p_deleted: deleted,
    });

    if (marked.error) {
      logRpcFailure("media storage mark", marked.error);
    }
  }

  refresh();
  return { ok: true, message: "사진을 숨겼습니다." };
}
