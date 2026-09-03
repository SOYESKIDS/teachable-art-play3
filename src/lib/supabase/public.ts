import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * SERVICE-13 — 로그인 없는 공개 경로 전용 Supabase Client.
 *
 * ★ 이 파일은 Secret Key를 쓰지 않는다.
 *   getSupabaseEnv()가 주는 것은 Publishable(anon) Key뿐이고,
 *   이 프로젝트의 서버 코드 어디에서도 RLS를 우회하지 않는다.
 *   (Secret Key를 쓰는 파일은 lib/supabase/admin.ts 하나이며 Auth Admin 전용이다.)
 *
 * ★ 세션을 다루지 않는다.
 *   쿠키를 읽지도 쓰지도 않으므로 언제나 anon 역할로 실행된다.
 *   그래서 원장이 로그인한 브라우저로 학부모 링크를 열어도
 *   부모와 완전히 같은 권한으로만 데이터를 본다 — 화면이 사람에 따라 달라지지 않는다.
 *
 * ★ 이 Client로 할 수 있는 일은 하나뿐이다.
 *   public.read_shared_growth_report() 호출.
 *   child_growth_report_shares 표에는 anon GRANT가 없어 직접 조회가 불가능하고,
 *   성장 리포트 표에도 anon SELECT Policy가 없다.
 */
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createSupabaseClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
