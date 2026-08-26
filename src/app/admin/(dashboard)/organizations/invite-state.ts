/**
 * 교직원 초대 Server Action의 useActionState 상태.
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

/**
 * 교사 초대 상태. 원장용과 형태가 같지만 타입을 나눠 둔다 —
 * 두 초대는 실패 사유가 서로 다르고(원장/교사 역할 충돌 문구),
 * 앞으로 한쪽만 필드가 늘어날 여지가 있다.
 */
export interface TeacherInviteState {
  phase: "idle" | "success" | "error";
  message: string | null;
}

export const TEACHER_INVITE_INITIAL_STATE: TeacherInviteState = {
  phase: "idle",
  message: null,
};
