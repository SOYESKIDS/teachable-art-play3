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
