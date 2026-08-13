"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchActiveMemberships } from "@/lib/auth/organization";
import type { OrganizationLoginState } from "./form-state";

/**
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 * 타입/상수는 ./form-state.ts에 있다.
 */

const MESSAGES = {
  invalidInput: "이메일 또는 비밀번호를 확인해주세요.",
  invalidCredentials: "이메일 또는 비밀번호를 확인해주세요.",
  teacherOnly: "교사용 서비스는 준비 중입니다. 기관 관리자에게 문의해주세요.",
  noAccess: "접근 권한이 없는 계정입니다.",
  unexpected: "로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
} as const;

export async function organizationSignInAction(
  _prevState: OrganizationLoginState,
  formData: FormData,
): Promise<OrganizationLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: MESSAGES.invalidInput };
  }

  // redirect()는 예외를 던지므로 try 바깥에서 호출한다.
  try {
    const supabase = await createClient();

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.user) {
      return { error: MESSAGES.invalidCredentials };
    }

    const userId = signInData.user.id;

    // 권한 판정은 전적으로 DB(organization_members + organizations RLS)가 한다.
    const directorMemberships = await fetchActiveMemberships(supabase, userId, [
      "director",
    ]);

    if (directorMemberships.length > 0) {
      // 통과 — 아래에서 /director로 이동한다.
    } else {
      const teacherMemberships = await fetchActiveMemberships(supabase, userId, [
        "teacher",
      ]);

      // 권한 없는 세션을 기관 영역에 남기지 않는다.
      await supabase.auth.signOut();

      return {
        error:
          teacherMemberships.length > 0
            ? MESSAGES.teacherOnly
            : MESSAGES.noAccess,
      };
    }
  } catch (error) {
    console.error("[login] organization sign-in failed:", error);
    return { error: MESSAGES.unexpected };
  }

  redirect("/director");
}
