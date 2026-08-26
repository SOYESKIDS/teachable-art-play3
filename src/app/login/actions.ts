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
  // 역할에 따라 도착지가 달라지므로 try 밖 스코프에 담아 둔다.
  let destination = "/director";

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
      // 원장 권한이 있으면 기관 전체를 볼 수 있는 원장 화면을 우선한다.
      // (원장이면서 특정 반 담임을 겸하는 경우도 원장 화면에서 전부 보인다.)
      destination = "/director";
    } else {
      const teacherMemberships = await fetchActiveMemberships(supabase, userId, [
        "teacher",
      ]);

      if (teacherMemberships.length > 0) {
        destination = "/teacher";
      } else {
        // 권한 없는 세션을 기관 영역에 남기지 않는다.
        await supabase.auth.signOut();

        return { error: MESSAGES.noAccess };
      }
    }
  } catch (error) {
    console.error("[login] organization sign-in failed:", error);
    return { error: MESSAGES.unexpected };
  }

  redirect(destination);
}
