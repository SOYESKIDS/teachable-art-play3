import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GrowthReportShareMetadata,
  GrowthReportShareStatus,
} from "@/types/parent-share";

/**
 * SERVICE-13 — 원장 화면이 읽는 공유 metadata.
 *
 * ★ token_hash 를 select 하지 않는다.
 *   select 하려 해도 컬럼 GRANT가 없어 42501이 난다. 원장도 자기가 만든
 *   공유의 hash를 읽어 갈 수 없고, 원본은 애초에 DB에 없다.
 *
 * ★ organization scope는 RLS가 정한다.
 *   Policy가 private.has_org_role(organization_id, ['director'])를 요구하므로
 *   다른 기관 공유는 조회 결과에 나타나지 않는다.
 *   (organization_id 자체도 SELECT GRANT에 없어 where에 쓸 수 없다)
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 원장에게 열려 있는 컬럼 전부. 여기에 token_hash는 없다. */
const SHARE_COLUMNS = "id, report_id, created_at, expires_at, revoked_at";

interface ShareRow {
  id: string;
  report_id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

function logQueryFailure(scope: string, message: string) {
  // 코드와 원인만 남긴다. 공유 id·리포트 id·토큰은 로그에 넣지 않는다.
  console.error(`[staff/growth-report-share] ${scope} query failed: ${message}`);
}

/**
 * 상태 판정.
 *
 * 중지가 만료보다 앞선다 — 중지된 링크는 유효기간이 남아 있어도 쓸 수 없고,
 * 원장에게도 "중지됨"으로 보이는 편이 정확하다. DB의 공개 함수도 같은 순서로
 * revoked_at is null 을 먼저 본다.
 */
function resolveStatus(row: ShareRow, now: number): GrowthReportShareStatus {
  if (row.revoked_at !== null) return "revoked";

  const expiresAt = Date.parse(row.expires_at);

  // 파싱에 실패하면 "살아 있다"고 단정하지 않는다. 만료로 본다.
  if (!Number.isFinite(expiresAt)) return "expired";

  return expiresAt > now ? "active" : "expired";
}

/**
 * 이 리포트의 가장 최근 공유 한 건.
 *
 * ★ 중지된 행도 함께 본다.
 *   "한 번도 공유하지 않음"과 "공유했다가 중지함"을 원장에게 구분해 보여 주기
 *   위해서다. 살아 있는 공유는 partial unique index 때문에 언제나 최대 1건이다.
 */
export async function fetchGrowthReportShare(
  supabase: SupabaseClient,
  reportId: string,
): Promise<GrowthReportShareMetadata | null> {
  if (!UUID_PATTERN.test(reportId)) return null;

  const { data, error } = await supabase
    .from("child_growth_report_shares")
    .select(SHARE_COLUMNS)
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    logQueryFailure("share metadata", error.message);
    return null;
  }

  const rows = (data ?? []) as unknown as ShareRow[];
  const row = rows[0];

  if (!row) return null;

  return {
    shareId: row.id,
    status: resolveStatus(row, Date.now()),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}
