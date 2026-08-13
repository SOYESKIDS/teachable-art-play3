/**
 * 원장 초대 Server Action의 useActionState 상태.
 * `"use server"` 파일은 런타임 export가 전부 async 함수여야 하므로 여기에 둔다.
 */
export interface DirectorInviteState {
  phase: "idle" | "success" | "error";
  message: string | null;
}

export const DIRECTOR_INVITE_INITIAL_STATE: DirectorInviteState = {
  phase: "idle",
  message: null,
};
