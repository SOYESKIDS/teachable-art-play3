import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Server Component / Server Action / Route Handler 전용 Supabase Client.
 *
 * Next.js 16에서 `cookies()`는 비동기이므로 반드시 await 후 사용한다.
 * 요청마다 새 Client를 만들고 절대 모듈 스코프에 캐싱하지 않는다.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 렌더 중에는 쿠키를 쓸 수 없다.
          // 세션 갱신은 proxy.ts가 담당하므로 이 경우는 무시해도 안전하다.
        }
      },
    },
  });
}
