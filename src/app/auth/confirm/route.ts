import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * 이메일 링크(초대 / 비밀번호 재설정 등) 수락 Endpoint.
 *
 * @supabase/ssr 서버 흐름에서는 URL fragment(#access_token=...)를 서버가 읽을 수 없으므로,
 * Email Template이 `token_hash` + `type`을 쿼리로 넘기고 여기서 verifyOtp로 세션을 만든다.
 * (Supabase Dashboard의 Invite Email Template 수정이 필요하다 — 보고서 참조)
 */

/** 설치된 @supabase/auth-js의 EmailOtpType 중 이 앱이 허용하는 값만 통과시킨다 */
const ALLOWED_TYPES = ["invite", "recovery", "magiclink", "email"] as const;

function parseType(raw: string | null): EmailOtpType | null {
  return raw && (ALLOWED_TYPES as readonly string[]).includes(raw)
    ? (raw as EmailOtpType)
    : null;
}

/** Open Redirect 방지 — 앱 내부 절대경로만 허용한다 */
function parseNext(raw: string | null): string {
  if (!raw) return "/auth/set-password";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/auth/set-password";
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tokenHash = searchParams.get("token_hash");
  const type = parseType(searchParams.get("type"));
  const next = parseNext(searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_link", request.nextUrl.origin),
    );
  }

  // 서버 Client가 verifyOtp 성공 시 세션 쿠키를 직접 기록한다.
  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    // 내부 메시지는 서버 로그로만 남긴다.
    console.error("[auth/confirm] verifyOtp failed:", error.message);
    return NextResponse.redirect(
      new URL("/login?error=invalid_link", request.nextUrl.origin),
    );
  }

  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}
