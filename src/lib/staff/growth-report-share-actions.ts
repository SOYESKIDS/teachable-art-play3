"use server";

import { refresh } from "next/cache";
import { requireDirector } from "@/lib/auth/organization";
import type { GrowthReportShareRevokeState } from "@/types/parent-share";

/**
 * SERVICE-13 — 학부모 공유 링크 Server Action (이전 형식 리포트).
 *
 * ★ PHASE 10B (M5 앱 준비): 새 공유 링크 발급(create_child_growth_report_share)은 앱에서 없앴다.
 *   M5 가 그 RPC 를 회수하고, 기존 링크의 중지(revoke_child_growth_report_share)는 유지한다 (DEC-041).
 *
 * ★ 원장만 도달할 수 있다.
 *   requireDirector()로 시작하고, DB의 쓰기 Policy에도
 *   교사 분기가 없다. 교사는 리포트를 작성하지만 외부 공개 권한은 갖지 않는다.
 *
 * ★ service_role을 쓰지 않는다. 사용자 세션 client + RLS만 사용한다.
 *
 * ★ 로그에 남기는 것은 scope와 오류 코드뿐이다.
 *   token · token hash · share id · report id · 원아 정보는 넣지 않는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 20260903090000이 직접 던지는 코드 */
const SH_INVALID_INPUT = "SH001";
const SH_NOT_FOUND = "SH002";
const SH_NOT_COMPLETE = "SH003";
const SH_ALREADY_REVOKED = "SH004";
const SH_IMMUTABLE = "SH005";

const GENERIC_FAILURE = "공유 링크를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";

interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
}

function logFailure(scope: string, code: string) {
  console.error(`[staff/growth-report-share] ${scope} failed: ${code}`);
}

/** 사용자에게 보여 줄 수 있는 문구로만 바꾼다. raw 오류를 그대로 내보내지 않는다. */
function toMessage(error: PostgrestLikeError): string {
  switch (error.code) {
    case SH_INVALID_INPUT:
      return "공유 링크를 만들 정보가 올바르지 않습니다.";
    case SH_NOT_FOUND:
      return "성장 리포트를 찾을 수 없거나 권한이 없습니다.";
    case SH_NOT_COMPLETE:
      return "작성 완료된 성장 리포트만 학부모에게 공유할 수 있습니다.";
    case SH_ALREADY_REVOKED:
      return "이미 중지된 공유 링크입니다. 화면을 새로고침해주세요.";
    case SH_IMMUTABLE:
      return "공유 링크의 대상과 유효기간은 변경할 수 없습니다.";
    case "23505":
      // 두 창에서 동시에 만든 경우. 조용히 두 개가 생기지 않은 것이 정상 동작이다.
      return "다른 곳에서 방금 공유 링크가 만들어졌습니다. 화면을 새로고침해주세요.";
    case "42501":
      return "이 작업을 수행할 권한이 없습니다.";
    default:
      return GENERIC_FAILURE;
  }
}

/**
 * 공유 중지.
 *
 * DELETE가 아니다. revoked_at을 기록하고, 그 행은 다시 활성화되지 않는다
 * (UPDATE Policy의 USING이 revoked_at is null을 요구한다).
 * 중지 즉시 기존 링크는 공개 함수의 조건에서 탈락한다.
 */
export async function revokeGrowthReportShareAction(input: {
  shareId: string;
}): Promise<GrowthReportShareRevokeState> {
  const { supabase } = await requireDirector();

  const shareId = typeof input?.shareId === "string" ? input.shareId : "";

  if (!UUID_PATTERN.test(shareId)) {
    return { ok: false, message: "잘못된 요청입니다." };
  }

  const { error } = await supabase.rpc("revoke_child_growth_report_share", {
    p_share_id: shareId,
  });

  if (error) {
    logFailure("revoke share", error.code ?? "unknown");
    return { ok: false, message: toMessage(error) };
  }

  refresh();

  return { ok: true };
}
