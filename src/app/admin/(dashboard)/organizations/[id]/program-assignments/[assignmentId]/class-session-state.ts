/**
 * 수업 실행 Server Action의 useActionState 상태.
 *
 * `"use server"` 파일은 런타임 export가 전부 async 함수여야 하므로
 * 타입과 상수는 이 파일에 둔다. (class-child-state.ts와 동일한 이유)
 */
export interface ClassSessionFormState {
  phase: "idle" | "success" | "error";
  message: string | null;
}

export const CLASS_SESSION_FORM_INITIAL_STATE: ClassSessionFormState = {
  phase: "idle",
  message: null,
};
