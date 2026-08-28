/**
 * 비밀번호 재설정 링크의 목적지 규칙.
 *
 * ─ 왜 redirectTo가 /auth/set-password 페이지를 직접 가리키지 않는가 ─
 *
 *   메일 링크로 돌아온 사용자는 아직 세션이 없다. 세션은 서버가
 *   verifyOtp() 또는 exchangeCodeForSession()을 호출하면서
 *   **응답에 쿠키를 써야** 만들어진다.
 *   Next.js의 Server Component(page.tsx)는 렌더 중 쿠키를 쓸 수 없으므로
 *   (src/lib/supabase/server.ts의 setAll try/catch 참조)
 *   교환은 Route Handler인 /auth/confirm에서 해야 한다.
 *
 *   그래서 링크는 /auth/confirm으로 들어와 세션을 만든 뒤
 *   next 파라미터가 가리키는 /auth/set-password로 넘어간다.
 *   즉 사용자가 최종적으로 도착하는 곳은 /auth/set-password가 맞다.
 *
 *   이 경로는 초대(invite) 흐름이 이미 쓰고 있는 경로와 동일하다.
 *   새 인증 구현을 만들지 않고 같은 Endpoint를 재사용한다.
 */

/** 비밀번호 설정 화면 경로 */
export const SET_PASSWORD_PATH = "/auth/set-password";

/**
 * 재설정 메일이 돌아올 경로.
 * mode=recovery를 미리 실어 보내 초대 문구와 재설정 문구를 구분한다.
 */
export const RECOVERY_CONFIRM_PATH = `/auth/confirm?next=${encodeURIComponent(
  `${SET_PASSWORD_PATH}?mode=recovery`,
)}`;
