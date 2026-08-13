import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * 기관 사용자(원장 · 향후 교사) 로그아웃.
 *
 * SOYES 운영자 로그아웃(/admin/logout → /admin/login)과 도착지가 다르므로 분리한다.
 * Response 객체에 직접 쿠키를 쓰기 때문에 세션 파기가 반드시 응답에 반영된다.
 * prefetch 사고를 막기 위해 이 경로로는 <Link>를 두지 않는다.
 */
async function signOutAndRedirect(request: NextRequest) {
  const loginUrl = new URL("/login", request.nextUrl.origin);
  const response = NextResponse.redirect(loginUrl, { status: 303 });

  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers ?? {}).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  await supabase.auth.signOut();

  return response;
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
