"use server";

import { createHash, randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { requireDirector } from "@/lib/auth/organization";
import {
  SHARE_TOKEN_BYTES,
  type GrowthReportShareCreateState,
  type GrowthReportShareRevokeState,
} from "@/types/parent-share";

/**
 * SERVICE-13 — 학부모 공유 링크 Server Action.
 *
 * ★ 원장만 도달할 수 있다.
 *   두 함수 모두 requireDirector()로 시작하고, DB의 쓰기 Policy에도
 *   교사 분기가 없다. 교사는 리포트를 작성하지만 외부 공개 권한은 갖지 않는다.
 *
 * ★ service_role을 쓰지 않는다. 사용자 세션 client + RLS만 사용한다.
 *
 * ★ 비밀값의 일생
 *   randomBytes(32)  → 이 프로세스 메모리
 *   SHA-256(hex)     → RPC 인자로 DB에 전달, 저장되는 것은 이것뿐
 *   원본             → 이 함수의 반환값으로 원장 화면에 한 번 전달되고 끝
 *
 *   원본은 DB에 저장되지 않고, 로그에 찍히지 않고, URL 경로/쿼리에도 들어가지 않는다.
 *   (링크에서는 #fragment 뒤에 붙어 서버로 전송되지 않는다)
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
 * 새 학부모 공유 링크 만들기.
 *
 * 기존에 살아 있는 공유가 있으면 RPC가 같은 transaction 안에서 먼저 중지한다.
 * 그래서 "새 링크 발급"과 "처음 발급"이 같은 경로다 — 분기를 두지 않는다.
 */
export async function createGrowthReportShareAction(input: {
  reportId: string;
}): Promise<GrowthReportShareCreateState> {
  const { supabase } = await requireDirector();

  const reportId = typeof input?.reportId === "string" ? input.reportId : "";

  if (!UUID_PATTERN.test(reportId)) {
    return { ok: false, message: "잘못된 요청입니다." };
  }

  // ★ 리포트를 서버가 다시 읽는다. Client가 보낸 상태·기관을 믿지 않는다.
  //   원장에게는 작성 완료된 리포트만 보이므로(11A SELECT Policy),
  //   작성 중 리포트는 여기서 not found가 된다.
  const { data: reportRow, error: reportError } = await supabase
    .from("child_growth_reports")
    .select("id, status")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    logFailure("report lookup", reportError.code ?? "unknown");
    return { ok: false, message: GENERIC_FAILURE };
  }

  if (!reportRow) {
    return {
      ok: false,
      message: "성장 리포트를 찾을 수 없거나 권한이 없습니다.",
    };
  }

  if ((reportRow as { status?: string }).status !== "complete") {
    return {
      ok: false,
      message: "작성 완료된 성장 리포트만 학부모에게 공유할 수 있습니다.",
    };
  }

  // ★ 여기서만 원본이 존재한다.
  //   base64url이라 URL fragment에 그대로 넣어도 인코딩이 필요 없다.
  const token = randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");

  const { data, error } = await supabase.rpc(
    "create_child_growth_report_share",
    {
      p_report_id: reportId,
      p_token_hash: tokenHash,
    },
  );

  if (error) {
    logFailure("create share", error.code ?? "unknown");
    return { ok: false, message: toMessage(error) };
  }

  const payload = data as
    | { share_id?: string; expires_at?: string }
    | null;

  if (!payload?.share_id || !payload.expires_at) {
    logFailure("create share", "unexpected rpc payload");
    return { ok: false, message: GENERIC_FAILURE };
  }

  refresh();

  return {
    ok: true,
    shareId: payload.share_id,
    token,
    expiresAt: payload.expires_at,
  };
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
