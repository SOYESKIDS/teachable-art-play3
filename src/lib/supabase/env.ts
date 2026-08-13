/**
 * Supabase 공개 환경변수 접근 지점.
 *
 * 여기서만 환경변수를 읽어 Browser / Server / Proxy Client가 동일한 값을 쓰도록 한다.
 * Publishable Key는 공개되어도 안전한 키이며, RLS가 최종 보안 계층이다.
 * Service Role Key / Secret Key / DB 접속 정보는 이 프로젝트에서 사용하지 않는다.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return { url, publishableKey };
}
