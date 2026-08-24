/**
 * 반 / 원아 Server Action의 useActionState 상태.
 *
 * `"use server"` 파일은 런타임 export가 전부 async 함수여야 하므로
 * 타입과 상수는 이 파일에 둔다. (organizations/form-state.ts와 동일한 이유)
 */
export interface ClassChildFormState {
  phase: "idle" | "success" | "error";
  message: string | null;
}

export const CLASS_CHILD_FORM_INITIAL_STATE: ClassChildFormState = {
  phase: "idle",
  message: null,
};
