"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchActiveMemberships } from "@/lib/auth/organization";
import {
  MIN_PASSWORD_LENGTH,
  SET_PASSWORD_COPY,
  parseSetPasswordMode,
  type SetPasswordState,
} from "./form-state";

/**
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 * 타입/상수는 ./form-state.ts에 있다.
 */

const MESSAGES = {
  tooShort: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 설정해주세요.`,
  mismatch: "두 비밀번호가 일치하지 않습니다.",
  failed: "비밀번호를 설정하지 못했습니다. 잠시 후 다시 시도해주세요.",
} as const;

/**
 * 초대 최초 설정과 비밀번호 재설정이 모두 이 Action을 쓴다.
 *
 * ★ 대상 사용자는 오직 쿠키 세션이 정한다. 폼이 보낸 mode는 문구 선택에만 쓴다.
 * ★ 비밀번호와 토큰 값은 어떤 경우에도 로그에 남기지 않는다.
 */
export async function setPasswordAction(
  _prevState: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const mode = parseSetPasswordMode(String(formData.get("mode") ?? ""));
  const copy = SET_PASSWORD_COPY[mode];

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: MESSAGES.tooShort };
  }

  if (password !== passwordConfirm) {
    return { error: MESSAGES.mismatch };
  }

  // redirect()는 예외를 던지므로 try 바깥에서 호출한다.
  // 역할에 따라 도착지가 달라지므로 try 밖 스코프에 담아 둔다.
  let destination = "/login";

  try {
    const supabase = await createClient();

    // 초대 수락 또는 재설정 링크로 만들어진 세션이 반드시 있어야 한다.
    const { data } = await supabase.auth.getClaims();

    if (!data?.claims) {
      return { error: copy.noSessionMessage };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error("[auth/set-password] updateUser failed:", error.message);
      return { error: MESSAGES.failed };
    }

    // 도착지는 역할이 정한다. 예전처럼 /director로 고정하면
    // 교사는 requireDirector()에 막혀 곧바로 /login으로 튕겨 나간다.
    const userId = typeof data.claims.sub === "string" ? data.claims.sub : null;

    if (userId) {
      const directorMemberships = await fetchActiveMemberships(
        supabase,
        userId,
        ["director"],
      );

      if (directorMemberships.length > 0) {
        destination = "/director";
      } else {
        const teacherMemberships = await fetchActiveMemberships(
          supabase,
          userId,
          ["teacher"],
        );

        if (teacherMemberships.length > 0) {
          destination = "/teacher";
        }
        // 어느 쪽도 아니면 destination은 "/login"으로 남는다.
        // 비밀번호 변경 자체는 이미 성공했으므로 오류로 되돌리지 않는다.
      }
    }
  } catch (error) {
    console.error("[auth/set-password] unexpected failure:", error);
    return { error: MESSAGES.failed };
  }

  redirect(destination);
}
