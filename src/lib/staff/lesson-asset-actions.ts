"use server";

import { requireStaff } from "@/lib/auth/organization";
import { UUID_PATTERN } from "@/lib/errors/rpc-errors";
import {
  createLessonAssetSignedUrl,
  type LessonAssetUnavailableReason,
} from "@/lib/curriculum/lesson-asset-queries";

/**
 * 수업 자산 재생 주소 발급 — 실행 묶음 B2.
 *
 * ★ 권한은 서버에서 다시 확인한다 (지침 §5 A1).
 *   Proxy 게이트나 클라이언트 표시를 권한 근거로 쓰지 않는다. 여기서
 *   `requireStaff()` 로 로그인·소속을 확인하고, 반·차시·자산 범위 판정은
 *   DB(`class_asset_playable` · `resolve_lesson_asset_path`)가 최종으로 한다.
 *
 * ★ 저장 경로를 돌려주지 않는다.
 *   단기 서명 URL 만 돌려주고, 그 URL 을 DB 에 저장하지 않는다.
 *
 * ★ 실패 이유를 구분해 돌려준다.
 *   교직원 화면이 "미등록 · 승인 대기 · 권리 확인 전 · 계약 범위 밖 · 개통 대기"
 *   를 각각 다르게 안내해야 한다. 성공만 반환하는 가짜 처리를 하지 않는다.
 */

export interface LessonAssetUrlState {
  ok: boolean;
  url?: string;
  reason?: LessonAssetUnavailableReason;
}

export async function getLessonAssetUrlAction(
  classId: string,
  assetId: string,
): Promise<LessonAssetUrlState> {
  if (!UUID_PATTERN.test(classId) || !UUID_PATTERN.test(assetId)) {
    return { ok: false, reason: "playback_failed" };
  }

  // 로그인·소속 확인. 반 담당 여부와 계약 범위는 DB 가 판정한다.
  const { supabase } = await requireStaff();

  const result = await createLessonAssetSignedUrl(supabase, classId, assetId);

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  return { ok: true, url: result.url };
}
