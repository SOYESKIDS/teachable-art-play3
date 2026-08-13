/**
 * 로그인 폼의 useActionState 상태 정의.
 *
 * `"use server"` 파일은 런타임 export가 전부 async 함수여야 하므로
 * (next-flight-loader/action-validate.js) 타입과 상수는 이 파일에 둔다.
 * actions.ts는 Server Action 함수만 export한다.
 */
export interface LoginState {
  error: string | null;
}

export const LOGIN_INITIAL_STATE: LoginState = { error: null };
