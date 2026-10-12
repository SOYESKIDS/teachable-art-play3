import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 수업 자산 조회 · 서명 URL 발급 — 실행 묶음 B2.
 *
 * ★ 저장 경로를 클라이언트로 내보내지 않는다.
 *   `resolve_lesson_asset_path` 는 서버에서만 호출하고, 그 결과로 만든
 *   단기 서명 URL 만 화면으로 넘긴다. URL 은 DB 에 저장하지 않는다.
 *
 * ★ 상태를 구분한다 (지침 §6 B2).
 *   미등록 · 승인 대기 · 권리 확인 전 · 계약 범위 밖 · 기능 미출시 · 발급 실패를
 *   각각 다른 값으로 돌려준다. 빈 링크에 "재생 가능"을 표시하지 않는다.
 *
 * ★ 읽기 실패를 빈 목록 성공으로 감추지 않는다.
 *
 * ★ 자동 재생에 의존하지 않는다.
 *   이 모듈은 URL 만 만든다. 재생은 사용자 동작으로 시작한다 (뷰어 컴포넌트).
 */

export type LessonAssetType =
  | "ebook"
  | "story"
  | "vod"
  | "music_video"
  | "audio"
  | "workbook"
  | "teacher_guide"
  | "activity_material";

export type LessonAssetUsagePoint =
  | "arrival"
  | "intro"
  | "story"
  | "core"
  | "creative"
  | "closing"
  | "workbook"
  | "extension";

/** 쓸 수 없는 이유. null 이면 쓸 수 있다. */
export type LessonAssetUnavailableReason =
  /** 자산 자리는 있으나 파일이 등록되지 않았다 */
  | "not_registered"
  /** 등록되었으나 발행 승인 전이다 */
  | "awaiting_approval"
  /** 저작권·라이선스 확인이 끝나지 않았다 */
  | "rights_unverified"
  /** 계약에 콘텐츠 재생 기능이 없다 (기능 미출시 포함) */
  | "feature_unreleased"
  /** 계약이 그 주차를 포함하지 않는다 */
  | "out_of_contract_scope"
  /** 서명 URL 발급에 실패했다 */
  | "playback_failed";

export interface LessonAsset {
  assetId: string;
  assetType: LessonAssetType;
  title: string;
  contentType: string | null;
  durationSeconds: number | null;
  pageCount: number | null;
  versionLabel: string;
  usagePoint: LessonAssetUsagePoint | null;
  usageNote: string | null;
  sortOrder: number;
  downloadAllowed: boolean;
  /** 받을 파일이 있는가 */
  hasSource: boolean;
  /** 네 조건을 모두 통과했는가 */
  playable: boolean;
  unavailableReason: LessonAssetUnavailableReason | null;
}

export interface LessonAssetList {
  /** 조회가 성공했는가 */
  ok: boolean;
  /** migration 미적용으로 테이블/함수가 없다 */
  notInstalled: boolean;
  assets: LessonAsset[];
}

const UNDEFINED_FUNCTION = "42883";
const UNDEFINED_TABLE = "42P01";

/** 서명 URL 유효시간. 짧게 두고 DB 에 저장하지 않는다. */
export const LESSON_ASSET_SIGNED_URL_TTL_SECONDS = 15 * 60;

const BUCKET = "lesson-assets";

function asReason(value: unknown): LessonAssetUnavailableReason | null {
  const allowed: LessonAssetUnavailableReason[] = [
    "not_registered",
    "awaiting_approval",
    "rights_unverified",
    "feature_unreleased",
    "out_of_contract_scope",
    "playback_failed",
  ];
  return typeof value === "string" &&
    (allowed as string[]).includes(value)
    ? (value as LessonAssetUnavailableReason)
    : null;
}

export async function fetchLessonAssets(
  supabase: SupabaseClient,
  classId: string,
  lessonId: string,
): Promise<LessonAssetList> {
  const { data, error } = await supabase.rpc("list_lesson_assets_for_class", {
    p_class_id: classId,
    p_lesson_id: lessonId,
  });

  if (error) {
    const notInstalled =
      error.code === UNDEFINED_FUNCTION || error.code === UNDEFINED_TABLE;
    // 코드만 남긴다. 경로·제목·교안 내용을 로그에 넣지 않는다.
    console.error("[curriculum/assets] list failed:", { code: error.code ?? null });
    return { ok: false, notInstalled, assets: [] };
  }

  const rows = Array.isArray(data) ? data : [];

  const assets: LessonAsset[] = rows.map((row) => ({
    assetId: String(row.asset_id),
    assetType: String(row.asset_type) as LessonAssetType,
    title: String(row.title),
    contentType: row.content_type === null ? null : String(row.content_type),
    durationSeconds:
      typeof row.duration_seconds === "number" ? row.duration_seconds : null,
    pageCount: typeof row.page_count === "number" ? row.page_count : null,
    versionLabel: String(row.version_label),
    usagePoint:
      row.usage_point === null
        ? null
        : (String(row.usage_point) as LessonAssetUsagePoint),
    usageNote: row.usage_note === null ? null : String(row.usage_note),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 1,
    downloadAllowed: row.download_allowed === true,
    hasSource: row.has_source === true,
    playable: row.playable === true,
    unavailableReason: asReason(row.unavailable_reason),
  }));

  return { ok: true, notInstalled: false, assets };
}

export type SignedAssetResult =
  | { ok: true; url: string; expiresInSeconds: number }
  | { ok: false; reason: LessonAssetUnavailableReason };

/**
 * 한 자산의 재생용 서명 URL 을 만든다. **서버에서만 호출한다.**
 *
 * 경로는 DB 가 접근 판정을 통과한 경우에만 돌려준다. 판정 실패와 미등록을
 * 구분할 수 없는 경우에는 보수적으로 `playback_failed` 를 쓰지 않고,
 * 목록 RPC 가 이미 알려 준 이유를 호출자가 함께 보여 준다.
 */
export async function createLessonAssetSignedUrl(
  supabase: SupabaseClient,
  classId: string,
  assetId: string,
): Promise<SignedAssetResult> {
  const { data: path, error: pathError } = await supabase.rpc(
    "resolve_lesson_asset_path",
    { p_class_id: classId, p_asset_id: assetId },
  );

  if (pathError) {
    console.error("[curriculum/assets] path resolve failed:", {
      code: pathError.code ?? null,
    });
    return { ok: false, reason: "playback_failed" };
  }

  if (typeof path !== "string" || path.trim() === "") {
    // 판정 실패이거나 저장 경로가 없다. 어느 쪽인지 여기서 단정하지 않는다.
    return { ok: false, reason: "not_registered" };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, LESSON_ASSET_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[curriculum/assets] sign failed");
    return { ok: false, reason: "playback_failed" };
  }

  return {
    ok: true,
    url: data.signedUrl,
    expiresInSeconds: LESSON_ASSET_SIGNED_URL_TTL_SECONDS,
  };
}

/* ══════════════════════════════════════════════════ 화면 문구 */

export const ASSET_TYPE_LABEL: Record<LessonAssetType, string> = {
  ebook: "EBOOK",
  story: "마음동화",
  vod: "수업 영상",
  music_video: "뮤직비디오",
  audio: "활동 음원",
  workbook: "워크북",
  teacher_guide: "교사용 가이드",
  activity_material: "활동자료",
};

export const ASSET_USAGE_LABEL: Record<LessonAssetUsagePoint, string> = {
  arrival: "등원 · 도입",
  intro: "도입",
  story: "그림책",
  core: "핵심활동",
  creative: "미술 · 창작",
  closing: "마무리",
  workbook: "워크북",
  extension: "별도 콘텐츠 시간",
};

/**
 * 쓸 수 없는 이유를 교직원에게 보여 줄 문구.
 * "준비 중" 하나로 뭉개지 않는다 — 무엇을 기다리는지가 다르다.
 */
export const ASSET_UNAVAILABLE_LABEL: Record<
  LessonAssetUnavailableReason,
  string
> = {
  not_registered: "자산 미등록 — 파일이 아직 등록되지 않았습니다",
  awaiting_approval: "승인 대기 — 발행 승인 전입니다",
  rights_unverified: "권리 확인 전 — 저작권 범위 확인이 끝나지 않았습니다",
  feature_unreleased: "개통 대기 — 콘텐츠 재생이 아직 열리지 않았습니다",
  out_of_contract_scope: "계약 범위 밖 — 이 주차는 현재 계약에 포함되지 않습니다",
  playback_failed: "재생 준비에 실패했습니다 — 잠시 후 다시 시도해 주세요",
};
