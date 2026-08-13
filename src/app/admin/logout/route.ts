import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * 로그아웃 엔드포인트.
 *
 * Response 객체에 직접 쿠키를 쓰기 때문에 세션 파기가 반드시 응답에 반영된다.
 * - POST: /admin/leads의 로그아웃 버튼(form submit)
 * - GET : 서버 렌더 중 권한 미달을 발견했을 때의 redirect (Server Component에서는 쿠키를 쓸 수 없다)
 *
 * prefetch로 의도치 않게 로그아웃되지 않도록 이 경로로는 <Link>를 두지 않는다.
 */
async function signOutAndRedirect(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get("reason");

  const loginUrl = new URL("/admin/login", request.nextUrl.origin);
  if (reason === "forbidden") {
    loginUrl.searchParams.set("error", "forbidden");
  }

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

  // 세션이 이미 없어도 무시하고 로그인 화면으로 보낸다.
  await supabase.auth.signOut();

  return response;
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
