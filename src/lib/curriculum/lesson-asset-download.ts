import type { SupabaseClient } from "@supabase/supabase-js";
import type { LessonAssetUnavailableReason } from "./lesson-asset-queries";

/**
 * 자료 사전 다운로드 — 권한 · 다운로드 정책 판정 (사용자 지시 항목 1).
 *
 * ── 재생과 다운로드는 다른 허용이다 ────────────────────────────────
 *
 * 재생 경로(`resolve_lesson_asset_path`)는 `download_allowed` 를 보지 않는다.
 * 내려받기는 그 판정 **위에** 다운로드 정책을 하나 더 요구한다. 그래서 전용
 * RPC(`resolve_lesson_asset_download_path`)를 쓴다 — 호출 지점부터 분리해,
 * 재생만 되는 자산을 실수로 내려받게 만들 수 없다.
 *
 * `lesson_assets.download_allowed` 는 **기본 false** 다. 유형별 정책(워크북은
 * 인쇄 필요 · 영상은 스트리밍)이 확정되지 않았다. 확정 전에는 어떤 자산도
 * 내려받히지 않는다 — 코드가 아니라 데이터가 그것을 정한다.
 *
 * ── 서버에서만 호출한다 ────────────────────────────────────────────
 *
 * 저장 경로는 클라이언트로 내보내지 않는다. 서버가 단기 서명 URL 만 만든다.
 *
 * ── 받아 둔 파일은 다시 확인한다 ──────────────────────────────────
 *
 * 기기에 받아 둔 파일은 서버가 지울 수 없다. 그래서 앱이 물어보고 지운다.
 * `verifyDownloadableAssets()` 가 "지금도 허용되는 id"만 돌려주고, 빠진 id 는
 * 허용이 아니다.
 */

const BUCKET = "lesson-assets";

const UNDEFINED_FUNCTION = "42883";
const UNDEFINED_TABLE = "42P01";

/**
 * 내려받기용 서명 URL 유효시간.
 *
 * ★ 재생용(15분)보다 길게 둔다 — 파일 하나가 수십 MB 일 수 있고, 수업 전
 *   여러 개를 연달아 받는다. 그래도 한 시간을 넘기지 않는다.
 */
export const LESSON_ASSET_DOWNLOAD_URL_TTL_SECONDS = 30 * 60;

export type DownloadUrlResult =
  | { ok: true; url: string; expiresInSeconds: number }
  | { ok: false; reason: LessonAssetUnavailableReason | "download_not_allowed" };

/**
 * 한 자산의 내려받기용 서명 URL. **서버에서만 호출한다.**
 *
 * ★ 경로가 비면 "허용되지 않음"이다. 왜인지 단정하지 않는다 —
 *   목록 RPC 가 이미 이유를 알려 주고, 여기서는 받지 못한다는 사실만 돌려준다.
 */
export async function createLessonAssetDownloadUrl(
  supabase: SupabaseClient,
  classId: string,
  assetId: string,
): Promise<DownloadUrlResult> {
  const { data: path, error: pathError } = await supabase.rpc(
    "resolve_lesson_asset_download_path",
    { p_class_id: classId, p_asset_id: assetId },
  );

  if (pathError) {
    const notInstalled =
      pathError.code === UNDEFINED_FUNCTION || pathError.code === UNDEFINED_TABLE;
    console.error("[curriculum/assets] download path resolve failed:", {
      code: pathError.code ?? null,
    });
    // ★ 경로 해석 함수가 없으면 내려받기를 열지 않는다 (fail closed).
    return { ok: false, reason: notInstalled ? "download_not_allowed" : "playback_failed" };
  }

  if (typeof path !== "string" || path.trim() === "") {
    return { ok: false, reason: "download_not_allowed" };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, LESSON_ASSET_DOWNLOAD_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[curriculum/assets] download sign failed");
    return { ok: false, reason: "playback_failed" };
  }

  return {
    ok: true,
    url: data.signedUrl,
    expiresInSeconds: LESSON_ASSET_DOWNLOAD_URL_TTL_SECONDS,
  };
}

export interface VerifyDownloadsResult {
  ok: boolean;
  /** 지금도 기기에 둘 수 있는 자산 id */
  allowed: string[];
  /** 더 이상 허용되지 않아 지워야 하는 자산 id */
  revoked: string[];
}

/**
 * 받아 둔 자산이 지금도 허용되는지 확인한다.
 *
 * ★ 조회에 실패하면 **아무것도 지우지 않는다.**
 *   연결이 끊긴 상태에서 "허용 안 됨"으로 단정하면, 수업 직전에 미리 받아 둔
 *   자료가 통째로 사라진다. 그래서 `ok: false` 일 때는 revoked 를 비워 둔다.
 *   대신 기기 쪽 유효기간이 따로 돌아간다 (asset-cache.ts).
 */
export async function verifyDownloadableAssets(
  supabase: SupabaseClient,
  classId: string,
  assetIds: string[],
): Promise<VerifyDownloadsResult> {
  if (assetIds.length === 0) return { ok: true, allowed: [], revoked: [] };

  const { data, error } = await supabase.rpc("lesson_asset_download_status", {
    p_class_id: classId,
    p_asset_ids: assetIds,
  });

  if (error) {
    console.error("[curriculum/assets] download status failed:", {
      code: error.code ?? null,
    });
    return { ok: false, allowed: [], revoked: [] };
  }

  const allowed = new Set(
    (Array.isArray(data) ? data : [])
      .map((row) => (row as { asset_id?: unknown }).asset_id)
      .filter((id): id is string => typeof id === "string"),
  );

  return {
    ok: true,
    allowed: [...allowed],
    revoked: assetIds.filter((id) => !allowed.has(id)),
  };
}

export const DOWNLOAD_NOT_ALLOWED_LABEL =
  "이 자료는 내려받기가 허용되지 않았습니다. 수업 중에는 재생으로 사용해 주세요.";

export const DOWNLOAD_POLICY_PENDING_NOTICE =
  "자료 유형별 내려받기 정책이 아직 확정되지 않았습니다. 허용된 자료만 목록에 나옵니다.";
