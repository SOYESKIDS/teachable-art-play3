"use server";

import { buildAppUrl } from "@/lib/env/app-url";
import { createClient } from "@/lib/supabase/server";
import { RECOVERY_CONFIRM_PATH } from "@/lib/auth/recovery-link";
import type { ForgotPasswordState } from "./form-state";

/**
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 * 타입/상수는 ./form-state.ts와 @/lib/auth/recovery-link에 있다.
 */

const MESSAGES = {
  invalidEmail: "이메일 주소를 확인해주세요.",
  unexpected: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

/**
 * 비밀번호 재설정 메일 요청.
 *
 * ★ 계정 존재 여부를 절대 노출하지 않는다.
 *   Supabase가 "그런 사용자가 없다" 또는 rate limit 오류를 돌려주더라도
 *   화면 문구는 성공과 동일하게 유지하고, 원인은 서버 로그로만 남긴다.
 *
 * ★ 비밀번호·토큰을 다루지 않는다. 여기서 만드는 것은 메일 링크뿐이다.
 */
export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { error: MESSAGES.invalidEmail, sent: false };
  }

  // 환경변수가 없으면 getAppUrl()이 던진다. 잘못된 도메인의 링크를 보내는 것보다
  // 여기서 실패하는 편이 안전하다.
  let redirectTo: string;

  try {
    redirectTo = buildAppUrl(RECOVERY_CONFIRM_PATH);
  } catch (error) {
    console.error("[auth/forgot-password] app url is not configured:", error);
    return { error: MESSAGES.unexpected, sent: false };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      // 화면에는 반영하지 않는다 (계정 열거 방지).
      console.error(
        "[auth/forgot-password] resetPasswordForEmail failed:",
        error.message,
      );
    }
  } catch (error) {
    console.error("[auth/forgot-password] unexpected failure:", error);
  }

  return { error: null, sent: true };
}
