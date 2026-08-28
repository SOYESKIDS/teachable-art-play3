import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SET_PASSWORD_PATH } from "@/lib/auth/recovery-link";

/**
 * 이메일 링크(초대 / 비밀번호 재설정 등) 수락 Endpoint.
 *
 * @supabase/ssr 서버 흐름에서는 URL fragment(#access_token=...)를 서버가 읽을 수 없으므로,
 * 링크는 반드시 쿼리로 돌아와야 한다. 두 가지 형태를 모두 받는다.
 *
 *   1. token_hash + type  — Email Template을 `{{ .TokenHash }}` 형태로 수정한 경우.
 *      verifyOtp로 바로 세션을 만든다. 브라우저에 사전 상태가 필요 없어
 *      다른 기기에서 링크를 열어도 동작한다. (권장)
 *
 *   2. code               — 기본 Template(`{{ .ConfirmationURL }}`)인 경우.
 *      Supabase가 /auth/v1/verify에서 검증한 뒤 PKCE code를 붙여 되돌려 보낸다.
 *      exchangeCodeForSession으로 세션을 만든다. 이때 code_verifier 쿠키가
 *      필요하므로 **요청을 시작한 브라우저에서** 링크를 열어야 한다.
 *
 * 어느 쪽이든 세션 쿠키는 Route Handler인 여기서 기록된다.
 * (Server Component는 렌더 중 쿠키를 쓸 수 없다 — src/lib/supabase/server.ts 참조)
 */

/** 설치된 @supabase/auth-js의 EmailOtpType 중 이 앱이 허용하는 값만 통과시킨다 */
const ALLOWED_TYPES = ["invite", "recovery", "magiclink", "email"] as const;

function parseType(raw: string | null): EmailOtpType | null {
  return raw && (ALLOWED_TYPES as readonly string[]).includes(raw)
    ? (raw as EmailOtpType)
    : null;
}

/**
 * Open Redirect 방지 — 앱 내부 절대경로만 허용한다.
 * 백슬래시 등으로 다른 origin이 만들어지는 경우까지 origin 비교로 한 번 더 막는다.
 */
function resolveTarget(raw: string | null, origin: string): URL {
  const fallback = new URL(SET_PASSWORD_PATH, origin);

  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;

  let candidate: URL;

  try {
    candidate = new URL(raw, origin);
  } catch {
    return fallback;
  }

  return candidate.origin === fallback.origin ? candidate : fallback;
}

/**
 * 비밀번호 설정 화면으로 보낼 때만 mode를 채운다.
 * next에 이미 mode가 있으면(재설정 메일이 지정한 값) 그대로 둔다.
 */
function withMode(target: URL, type: EmailOtpType | null): URL {
  if (target.pathname !== SET_PASSWORD_PATH) return target;
  if (target.searchParams.has("mode")) return target;
  if (type === "recovery") target.searchParams.set("mode", "recovery");
  return target;
}

function failure(origin: string, isRecovery: boolean) {
  const code = isRecovery ? "recovery_expired" : "invalid_link";
  return NextResponse.redirect(new URL(`/login?error=${code}`, origin));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = request.nextUrl.origin;

  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = parseType(searchParams.get("type"));

  const target = withMode(resolveTarget(searchParams.get("next"), origin), type);

  // 초대 만료 문구와 재설정 만료 문구를 섞지 않기 위해 실패 코드를 미리 정한다.
  const isRecovery =
    type === "recovery" || target.searchParams.get("mode") === "recovery";

  // 서버 Client가 성공 시 세션 쿠키를 직접 기록한다.
  const supabase = await createClient();

  if (tokenHash) {
    if (!type) {
      return failure(origin, isRecovery);
    }

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      // 내부 메시지는 서버 로그로만 남긴다. 토큰 값 자체는 남기지 않는다.
      console.error("[auth/confirm] verifyOtp failed:", error.message);
      return failure(origin, isRecovery);
    }

    return NextResponse.redirect(target);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error(
        "[auth/confirm] exchangeCodeForSession failed:",
        error.message,
      );
      return failure(origin, isRecovery);
    }

    return NextResponse.redirect(target);
  }

  return failure(origin, isRecovery);
}
