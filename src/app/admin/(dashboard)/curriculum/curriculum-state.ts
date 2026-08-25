/**
 * 커리큘럼 Server Action의 useActionState 상태.
 *
 * `"use server"` 파일은 런타임 export가 전부 async 함수여야 하므로
 * 타입과 상수는 이 파일에 둔다. (organizations/form-state.ts와 동일한 이유)
 * 프로그램 / 차시 / 활동 세 Action 파일이 이 하나를 공유한다.
 */
export interface CurriculumFormState {
  phase: "idle" | "success" | "error";
  message: string | null;
}

export const CURRICULUM_FORM_INITIAL_STATE: CurriculumFormState = {
  phase: "idle",
  message: null,
};
