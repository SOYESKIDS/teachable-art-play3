import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 보호자 공유 링크 공개 조회 rate limit — 실행 묶음 C3.
 *
 * ★ in-memory 가 아니다.
 *   서버 함수 인스턴스마다 따로 세면 전역 제한이 되지 않는다. 창과 카운터는
 *   DB(`portal_access_throttle`)에 있고, 여기서는 키를 만들어 RPC 를 부른다.
 *
 * ★ IP·token 원문을 로그에도 DB 에도 남기지 않는다 (지침 §7 C3).
 *   서버 비밀값(`PORTAL_THROTTLE_SALT`)을 섞어 sha256 hex 를 만들고 그것만 넘긴다.
 *   DB 만 보고 누가 접속했는지 되짚을 수 없다.
 *
 * ★ 제한 자체가 실패하면 조회를 막지 않는다.
 *   throttle 테이블이 아직 적용되지 않았거나 RPC 가 없으면 `allowed` 로 돌려준다.
 *   보호자가 기록을 못 보는 것보다, 제한이 아직 없는 상태를 보고하는 쪽이 낫다.
 *   그 사실은 `degraded: true` 로 알린다 — 조용히 "제한 적용됨"으로 넘기지 않는다.
 */

export interface ThrottleVerdict {
  allowed: boolean;
  /** 제한 장치가 동작하지 않았다 (미적용 · 설정 없음 · 조회 실패) */
  degraded: boolean;
  /** degraded 사유. 운영자 확인용이며 사용자 화면에 쓰지 않는다 */
  reason:
    | "ok"
    | "limited"
    | "salt_missing"
    | "rpc_missing"
    | "rpc_failed";
}

/** PostgREST 가 "함수가 없다"고 알려 주는 코드 */
const UNDEFINED_FUNCTION = "42883";
const UNDEFINED_TABLE = "42P01";

/**
 * 요청에서 제한 기준을 뽑는다.
 *
 * Vercel 앞단의 프록시 헤더를 쓴다. 신뢰할 수 없는 값일 수 있으므로
 * 그대로 저장하지 않고 해시 재료로만 쓴다. 헤더가 없으면 빈 문자열이 되고,
 * 그때는 모든 익명 요청이 한 버킷을 공유한다 — 느슨하지만 없는 것보다 낫다.
 */
function clientFingerprint(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim() ?? "";
  const real = headers.get("x-real-ip") ?? "";
  const vercelIp = headers.get("x-vercel-forwarded-for") ?? "";
  return first || real || vercelIp || "";
}

/**
 * 제한 버킷 키를 만든다.
 *
 * salt 가 없으면 키를 만들지 않는다 — salt 없는 해시는 IP 를 되짚을 수 있다.
 * (IPv4 공간은 전수 탐색이 가능하다.)
 */
function bucketKey(request: Request, scope: string): string | null {
  const salt = process.env.PORTAL_THROTTLE_SALT;
  if (!salt || salt.length < 16) return null;

  const fingerprint = clientFingerprint(request);
  return createHash("sha256")
    .update(`${salt}:${scope}:${fingerprint}`)
    .digest("hex");
}

/**
 * 조회 1회를 기록하고 허용 여부를 받는다.
 *
 * @param supabase anon 클라이언트 (`createPublicClient()`)
 * @param scope    제한을 나눌 범위. 지금은 "portal_resolve" 하나다.
 */
export async function registerPortalAccess(
  supabase: SupabaseClient,
  request: Request,
  scope: string,
): Promise<ThrottleVerdict> {
  const key = bucketKey(request, scope);

  if (key === null) {
    // salt 미설정. 제한이 동작하지 않는다는 사실을 숨기지 않는다.
    return { allowed: true, degraded: true, reason: "salt_missing" };
  }

  const { data, error } = await supabase.rpc("register_portal_access_attempt", {
    p_bucket_key: key,
  });

  if (error) {
    const missing =
      error.code === UNDEFINED_FUNCTION || error.code === UNDEFINED_TABLE;
    // 오류 코드만 남긴다. 키·IP·token 은 로그에 넣지 않는다.
    console.error("[share/portal] throttle unavailable:", { code: error.code ?? null });
    return {
      allowed: true,
      degraded: true,
      reason: missing ? "rpc_missing" : "rpc_failed",
    };
  }

  if (data === false) {
    return { allowed: false, degraded: false, reason: "limited" };
  }

  return { allowed: true, degraded: false, reason: "ok" };
}
