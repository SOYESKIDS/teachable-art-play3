import { createClient } from "@supabase/supabase-js";

/**
 * ⚠️ 서버 전용 Supabase Auth Admin Client.
 *
 * 이 파일은 Supabase Secret Key를 사용한다. 아래 규칙을 반드시 지킨다.
 *
 *   1. Client Component에서 절대 import하지 않는다.
 *      환경변수에 NEXT_PUBLIC_ prefix가 없으므로 Next.js가 브라우저 번들에
 *      값을 인라인하지 않지만, 아래 런타임 가드로 한 번 더 막는다.
 *   2. 이 Client는 **Auth Admin 작업에만** 사용한다.
 *      - auth.admin.inviteUserByEmail()  (원장 초대)
 *      - auth.admin.listUsers()          (이미 가입된 이메일의 user_id 확인)
 *      - auth.admin.getUserById()        (관리 화면에 원장 이메일 표시)
 *   3. organizations / profiles / organization_members / lead_submissions 등
 *      **일반 DB 작업에는 절대 쓰지 않는다.** 그 작업은 로그인 관리자 세션 Client와
 *      RLS를 그대로 사용한다. 편의상 RLS를 우회하지 않는다.
 *   4. @supabase/ssr의 cookie Client와 섞지 않는다. 세션을 저장하지 않는다.
 *   5. error.message 등 내부 정보를 사용자 화면에 노출하지 않는다.
 */
export function createAuthAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Auth Admin client must never run in the browser.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    // 값 자체는 절대 메시지에 담지 않는다.
    throw new Error("Supabase Auth Admin environment variables are missing.");
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
