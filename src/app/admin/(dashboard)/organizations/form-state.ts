/**
 * 기관 등록 / 수정 Server Action의 useActionState 상태.
 *
 * `"use server"` 파일은 런타임 export가 전부 async 함수여야 하므로
 * 타입과 상수는 이 파일에 둔다.
 */
export interface OrganizationFormState {
  phase: "idle" | "success" | "error";
  message: string | null;
}

export const ORGANIZATION_FORM_INITIAL_STATE: OrganizationFormState = {
  phase: "idle",
  message: null,
};
