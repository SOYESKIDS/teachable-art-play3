"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MIN_PASSWORD_LENGTH, type SetPasswordState } from "./form-state";

/**
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 * 타입/상수는 ./form-state.ts에 있다.
 */

const MESSAGES = {
  tooShort: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 설정해주세요.`,
  mismatch: "두 비밀번호가 일치하지 않습니다.",
  noSession: "초대 링크가 만료되었습니다. 관리자에게 다시 요청해주세요.",
  failed: "비밀번호를 설정하지 못했습니다. 잠시 후 다시 시도해주세요.",
} as const;

export async function setPasswordAction(
  _prevState: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: MESSAGES.tooShort };
  }

  if (password !== passwordConfirm) {
    return { error: MESSAGES.mismatch };
  }

  const supabase = await createClient();

  // 초대 수락(verifyOtp)으로 만들어진 세션이 반드시 있어야 한다.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return { error: MESSAGES.noSession };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[auth/set-password] updateUser failed:", error.message);
    return { error: MESSAGES.failed };
  }

  redirect("/director");
}
