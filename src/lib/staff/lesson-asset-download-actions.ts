"use server";

import { requireStaff } from "@/lib/auth/organization";
import { UUID_PATTERN } from "@/lib/errors/rpc-errors";
import {
  createLessonAssetDownloadUrl,
  verifyDownloadableAssets,
  type DownloadUrlResult,
  type VerifyDownloadsResult,
} from "@/lib/curriculum/lesson-asset-download";

/**
 * 자료 사전 다운로드 서버 행동 — 사용자 지시 항목 1.
 *
 * ★ 쓰기가 아니다. DB 를 바꾸지 않는다.
 *   그래서 쓰기 가드(`guardWrite`)를 두지 않는다 — 비운영 환경 쓰기 차단은
 *   쓰기 경로에만 걸린다. 여기서는 읽기 판정만 한다.
 *
 * ★ 권한은 서버에서 다시 확인한다.
 *   `requireStaff()` 로 로그인·소속을 확인하고, 반·자산·다운로드 정책 판정은
 *   DB RPC 가 최종으로 한다. 화면이 보낸 "받아도 된다"를 믿지 않는다.
 *
 * ★ 저장 경로를 돌려주지 않는다. 단기 서명 URL 만 돌려준다.
 *
 * ★ 이 파일의 런타임 export 는 async Server Action 뿐이다.
 */

export async function getLessonAssetDownloadUrlAction(
  classId: string,
  assetId: string,
): Promise<DownloadUrlResult> {
  if (!UUID_PATTERN.test(classId) || !UUID_PATTERN.test(assetId)) {
    return { ok: false, reason: "download_not_allowed" };
  }

  const { supabase } = await requireStaff();
  return createLessonAssetDownloadUrl(supabase, classId, assetId);
}

/**
 * 기기에 받아 둔 자산이 지금도 허용되는지 확인한다.
 *
 * ★ 한 번에 50개까지. DB RPC 도 같은 제한을 걸고 있다.
 * ★ 실패를 "전부 허용 안 됨"으로 바꾸지 않는다. 호출자가 그때는 지우지 않는다.
 */
export async function verifyLessonAssetDownloadsAction(
  classId: string,
  assetIds: string[],
): Promise<VerifyDownloadsResult> {
  if (!UUID_PATTERN.test(classId) || !Array.isArray(assetIds)) {
    return { ok: false, allowed: [], revoked: [] };
  }

  const ids = assetIds.filter((id) => UUID_PATTERN.test(id)).slice(0, 50);
  if (ids.length === 0) return { ok: true, allowed: [], revoked: [] };

  const { supabase } = await requireStaff();
  return verifyDownloadableAssets(supabase, classId, ids);
}
