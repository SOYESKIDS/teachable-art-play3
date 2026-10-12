import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LessonAssetType,
  LessonAssetUsagePoint,
} from "@/lib/curriculum/lesson-asset-queries";

/**
 * HQ 자산 관리 조회 — 사용자 지시 항목 7 (등록 · 권한 · 승인 · 설정 · 빈 상태).
 *
 * ── 왜 별도 RPC 인가 ──────────────────────────────────────────────
 *
 * 교직원 목록(`list_lesson_assets_for_class`)은 반 기준이고 승인 전 자산을
 * 보여 주지 않는다. HQ 는 승인 전 자산을 봐야 한다 — 승인하는 사람이기 때문이다.
 * 그래서 `list_lesson_assets_for_admin` 을 따로 쓴다.
 *
 * ── 저장 경로를 돌려받지 않는다 ───────────────────────────────────
 *
 * 관리 화면에도 경로를 내보내지 않는다. "파일이 등록되었는가"(`hasSource`)만
 * 알면 승인 판단이 된다.
 *
 * ── 빈 상태를 성공으로 감추지 않는다 ──────────────────────────────
 *
 * 조회 실패와 "등록된 자산이 없음"을 구분해 돌려준다. 화면이 각각 다르게
 * 안내해야 한다.
 */

const UNDEFINED_FUNCTION = "42883";
const UNDEFINED_TABLE = "42P01";

export type AssetApprovalStatus =
  | "draft"
  | "reviewed"
  | "approved"
  | "published"
  | "archived";

export type AssetRightsStatus = "unverified" | "cleared" | "restricted";

export const ASSET_APPROVAL_LABEL: Record<AssetApprovalStatus, string> = {
  draft: "초안",
  reviewed: "검수됨",
  approved: "승인됨",
  published: "발행 · 기관 제공",
  archived: "보관",
};

export const ASSET_RIGHTS_LABEL: Record<AssetRightsStatus, string> = {
  unverified: "권리 확인 전",
  cleared: "권리 확인 완료",
  restricted: "사용 제한",
};

export const ASSET_RIGHTS_MEANING: Record<AssetRightsStatus, string> = {
  unverified: "저작권·라이선스 범위를 확인하지 않았습니다. 기관에 제공하지 않습니다.",
  cleared: "확인된 범위 안에서 제공할 수 있습니다.",
  restricted: "확인 결과 제공할 수 없는 자료입니다.",
};

export interface AdminLessonAsset {
  assetId: string;
  assetType: LessonAssetType;
  title: string;
  versionLabel: string;
  approvalStatus: AssetApprovalStatus;
  rightsStatus: AssetRightsStatus;
  rightsNote: string | null;
  downloadAllowed: boolean;
  /** 파일 또는 외부 주소가 등록되었는가 */
  hasSource: boolean;
  usagePoint: LessonAssetUsagePoint | null;
  usageNote: string | null;
  sourceRef: string | null;
  sortOrder: number;
  /** 낙관적 동시성 토큰 */
  updatedAt: string;
}

export interface AdminLessonAssetList {
  ok: boolean;
  notInstalled: boolean;
  assets: AdminLessonAsset[];
}

function asApproval(value: unknown): AssetApprovalStatus {
  const allowed: AssetApprovalStatus[] = [
    "draft",
    "reviewed",
    "approved",
    "published",
    "archived",
  ];
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as AssetApprovalStatus)
    : "draft";
}

function asRights(value: unknown): AssetRightsStatus {
  const allowed: AssetRightsStatus[] = ["unverified", "cleared", "restricted"];
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as AssetRightsStatus)
    : "unverified";
}

export async function fetchAdminLessonAssets(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<AdminLessonAssetList> {
  const { data, error } = await supabase.rpc("list_lesson_assets_for_admin", {
    p_lesson_id: lessonId,
  });

  if (error) {
    const notInstalled =
      error.code === UNDEFINED_FUNCTION || error.code === UNDEFINED_TABLE;
    console.error("[admin/assets] list failed:", { code: error.code ?? null });
    return { ok: false, notInstalled, assets: [] };
  }

  const rows = Array.isArray(data) ? data : [];

  return {
    ok: true,
    notInstalled: false,
    assets: rows.map((row) => ({
      assetId: String(row.asset_id),
      assetType: String(row.asset_type) as LessonAssetType,
      title: String(row.title),
      versionLabel: String(row.version_label),
      approvalStatus: asApproval(row.approval_status),
      rightsStatus: asRights(row.rights_status),
      rightsNote: row.rights_note === null ? null : String(row.rights_note),
      downloadAllowed: row.download_allowed === true,
      hasSource: row.has_source === true,
      usagePoint:
        row.usage_point === null
          ? null
          : (String(row.usage_point) as LessonAssetUsagePoint),
      usageNote: row.usage_note === null ? null : String(row.usage_note),
      sourceRef: row.source_ref === null ? null : String(row.source_ref),
      sortOrder: typeof row.sort_order === "number" ? row.sort_order : 1,
      updatedAt: String(row.updated_at),
    })),
  };
}

/**
 * 발행 전에 남은 조건.
 *
 * ★ 화면이 "왜 발행할 수 없는지"를 미리 알려 주기 위한 것이다.
 *   최종 판정은 DB CHECK 가 한다 — 여기서 통과해 보여도 DB 가 거절할 수 있다.
 */
export function publishBlockers(asset: AdminLessonAsset): string[] {
  const blockers: string[] = [];
  if (!asset.hasSource) blockers.push("파일 또는 외부 주소가 등록되지 않았습니다");
  if (asset.rightsStatus !== "cleared") blockers.push("권리 확인이 끝나지 않았습니다");
  return blockers;
}

export const ASSET_DOWNLOAD_POLICY_NOTE =
  "내려받기를 허용하면 교직원 기기에 파일이 남습니다. 회수할 수 없으므로 권리 확인이 끝난 자료만 허용합니다.";
