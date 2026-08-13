import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy (구 middleware).
 *
 * 파일 위치는 `pages` / `app`과 같은 레벨이어야 하므로 이 프로젝트에서는 `src/proxy.ts`다.
 *
 * 역할
 * 1. Supabase 세션 갱신 (Request Cookie → Response Cookie)
 * 2. 비로그인 사용자의 /admin, /director 보호 Route 접근 차단
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 공개 홈페이지(/)와 LeadForm은 Proxy를 전혀 거치지 않는다.
  //
  // /login, /auth/confirm, /auth/set-password도 의도적으로 제외한다.
  // 세 경로는 "아직 세션이 없거나 지금 막 세션을 만드는" 흐름이라
  // 비로그인 리다이렉트가 끼어들면 초대 수락이 깨진다.
  // 해당 Route들은 각자 @supabase/ssr 서버 Client로 쿠키를 직접 다룬다.
  matcher: ["/admin/:path*", "/director/:path*"],
};
