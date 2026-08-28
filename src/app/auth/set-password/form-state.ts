/**
 * 비밀번호 설정 Server Action의 useActionState 상태.
 * `"use server"` 파일은 런타임 export가 전부 async 함수여야 하므로 여기에 둔다.
 */
export interface SetPasswordState {
  error: string | null;
}

export const SET_PASSWORD_INITIAL_STATE: SetPasswordState = { error: null };

/** Supabase 기본 정책(6자)보다 강하게 잡되, 과하지 않게 8자로 둔다 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * 같은 화면이 두 흐름을 담당한다.
 *   invite   — 초대를 수락한 사용자의 최초 비밀번호 설정
 *   recovery — 비밀번호를 잊은 사용자의 재설정
 *
 * 세션을 만드는 방법(verifyOtp / exchangeCodeForSession)은 동일하고
 * 화면 문구와 실패 안내만 다르다. 재설정 사용자에게 "초대 링크 만료"를
 * 보여주지 않기 위한 구분이다.
 */
export type SetPasswordMode = "invite" | "recovery";

/** searchParams·FormData는 신뢰할 수 없는 입력이므로 정해진 값만 통과시킨다 */
export function parseSetPasswordMode(
  value: string | string[] | undefined,
): SetPasswordMode {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "recovery" ? "recovery" : "invite";
}

export const SET_PASSWORD_COPY: Record<
  SetPasswordMode,
  {
    heading: string;
    description: string;
    submitLabel: string;
    pendingLabel: string;
    /** 세션이 없을 때 /login으로 보낼 안내 코드 */
    expiredNotice: string;
    /** 저장 직전에 세션이 사라졌을 때 폼에 보여줄 문구 */
    noSessionMessage: string;
  }
> = {
  invite: {
    heading: "비밀번호 설정",
    description: "앞으로 로그인에 사용할 비밀번호를 설정해주세요.",
    submitLabel: "비밀번호 설정",
    pendingLabel: "설정 중…",
    expiredNotice: "invalid_link",
    noSessionMessage:
      "초대 링크가 만료되었습니다. 관리자에게 다시 요청해주세요.",
  },
  recovery: {
    heading: "새 비밀번호 설정",
    description: "새로 사용하실 비밀번호를 입력해주세요.",
    submitLabel: "비밀번호 변경",
    pendingLabel: "변경 중…",
    expiredNotice: "recovery_expired",
    noSessionMessage:
      "재설정 링크가 만료되었습니다. 비밀번호 찾기를 다시 진행해주세요.",
  },
};
