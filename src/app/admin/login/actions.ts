"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHqRole, type HqRole } from "@/lib/auth/admin";
import type { LoginState } from "./login-state";

/**
 * 이 파일의 런타임 export는 async Server Action 함수 하나뿐이어야 한다.
 * 타입/상수는 ./login-state.ts에 있다.
 */

/** 사용자에게 보여줄 메시지만 정의한다. Supabase 내부 에러 / URL / Key는 절대 노출하지 않는다. */
const MESSAGES = {
  invalidInput: "이메일 또는 비밀번호를 확인해주세요.",
  invalidCredentials: "이메일 또는 비밀번호를 확인해주세요.",
  notAdmin: "관리자 권한이 없는 계정입니다.",
  unexpected: "로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
} as const;

export async function signInAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: MESSAGES.invalidInput };
  }

  // redirect()는 내부적으로 예외를 던지므로 try 바깥에서 호출해야 한다.
  let role: HqRole | null = null;

  try {
    const supabase = await createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return { error: MESSAGES.invalidCredentials };
    }

    // 인증만으로는 부족하다. HQ 역할은 반드시 DB에 물어본다 (admin ≠ sales · DEC-079).
    role = await getHqRole(supabase);

    if (role === null) {
      // 관리자가 아닌 계정이 세션만 가진 채 Admin 영역에 남지 않도록 즉시 세션을 파기한다.
      await supabase.auth.signOut();
      return { error: MESSAGES.notAdmin };
    }
  } catch (error) {
    console.error("[admin] sign-in failed:", error);
    return { error: MESSAGES.unexpected };
  }

  // HQ Admin → 운영 Shell · HQ Sales → 영업 Shell (DEC-097)
  redirect(role === "sales" ? "/sales" : "/admin/leads");
}
