import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/** 로그인 없이 접근 가능한 보호 영역 내 Route */
const PUBLIC_PATHS = ["/admin/login"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * 영역별 로그인 화면.
 *
 * SOYES 운영자와 기관 사용자는 로그인 화면이 다르므로 리다이렉트 대상도 분리한다.
 * (/admin → /admin/login, /director → /login)
 */
function loginPathFor(pathname: string): string {
  return pathname.startsWith("/director") ? "/login" : "/admin/login";
}

/**
 * Request Cookie → Supabase 세션 갱신 → Response Cookie 반영.
 *
 * @supabase/ssr 0.12.x 권장 패턴대로 getAll / setAll을 모두 구현한다.
 * 세션 검증은 access token(JWT)을 실제로 검증하는 `getClaims()`를 사용한다.
 * (쿠키에 담긴 user 객체를 그대로 신뢰하는 `getSession()`은 쓰지 않는다.)
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        // 인증 쿠키를 세팅한 응답은 CDN이 캐싱하면 안 된다.
        Object.entries(headers ?? {}).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  // 응답이 만들어지기 전에 반드시 호출해야 갱신된 토큰이 쿠키에 반영된다.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const { pathname } = request.nextUrl;

  // 세션이 없는 상태로 보호 Route에 접근하면 로그인 화면으로 보낸다.
  // (이것은 UX용 1차 게이트일 뿐이고, 최종 권한 판정은 각 페이지의 서버 검사 + DB RLS가 담당한다.)
  if (!claims && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = loginPathFor(pathname);
    loginUrl.search = "";

    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return response;
}
