import { createHash } from "node:crypto";

import { tryGuardWrite } from "@/lib/env/write-guard";
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
 * ★ 제한이 동작하지 않으면 **조회를 막는다 (fail-closed).**
 *   이전 구현은 salt 미설정·migration 미적용 때 통과시켰다. 그러면 보안 설정이
 *   빠진 환경에서 아동 기록이 제한 없이 나간다. 보호자가 일시적으로 못 보는 것보다
 *   민감 기록이 통제 없이 나가는 쪽이 더 나쁘다.
 *
 *   막힌 이유는 서버 로그에만 남기고, 응답은 다른 실패와 같은 형태를 쓴다.
 *   운영자는 로그와 `/admin/readiness` 로 원인을 본다.
 */

export interface ThrottleVerdict {
  /** false 면 민감 내용을 제공하지 않는다 */
  allowed: boolean;
  /**
   * 제한 장치가 동작하지 않았다 (미적용 · 설정 없음 · 조회 실패).
   *
   * degraded 이면 `allowed` 는 항상 false 다 — 제한을 우회해 제공하지 않는다.
   * 운영자가 원인을 알 수 있게 사유를 함께 돌려준다.
   */
  degraded: boolean;
  /** degraded 사유. 운영자 확인용이며 사용자 화면에 쓰지 않는다 */
  reason:
    | "ok"
    | "limited"
    | "salt_missing"
    | "rpc_missing"
    | "rpc_failed"
    /** 배포 환경 가드가 쓰기를 막았다 (비운영 배포가 운영 DB 를 볼 때 등) */
    | "write_blocked";
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
  /*
    ★ 이 함수는 조회 횟수를 **기록한다** — 읽기처럼 보이지만 쓰기다.
      비운영 배포가 운영 DB 에 붙어 있으면 운영의 제한 기록이 더럽혀지고,
      그 기록은 실제 보호자 조회를 막는 데 쓰인다.

      막히면 조회도 제공하지 않는다. 제한을 걸 수 없는 상태에서 아동 기록을
      내보내지 않는다는 기존 원칙(fail-closed)과 같다.
  */
  if (!tryGuardWrite("share/portal:throttle").allowed) {
    return { allowed: false, degraded: true, reason: "write_blocked" };
  }

  const key = bucketKey(request, scope);

  if (key === null) {
    // ★ salt 미설정 — 제한을 걸 수 없으므로 제공하지 않는다.
    return { allowed: false, degraded: true, reason: "salt_missing" };
  }

  const { data, error } = await supabase.rpc("register_portal_access_attempt", {
    p_bucket_key: key,
  });

  if (error) {
    const missing =
      error.code === UNDEFINED_FUNCTION || error.code === UNDEFINED_TABLE;
    // 오류 코드만 남긴다. 키·IP·token 은 로그에 넣지 않는다.
    console.error("[share/portal] throttle unavailable:", { code: error.code ?? null });
    // ★ 제한 장치가 없으면 제공하지 않는다 (fail-closed).
    return {
      allowed: false,
      degraded: true,
      reason: missing ? "rpc_missing" : "rpc_failed",
    };
  }

  if (data === false) {
    return { allowed: false, degraded: false, reason: "limited" };
  }

  return { allowed: true, degraded: false, reason: "ok" };
}
