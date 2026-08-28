/**
 * 비밀번호 재설정 요청 Server Action의 useActionState 상태.
 * `"use server"` 파일은 런타임 export가 전부 async 함수여야 하므로 여기에 둔다.
 */
export interface ForgotPasswordState {
  error: string | null;
  /** 요청을 접수했는지 여부. 계정 존재 여부와는 무관하다. */
  sent: boolean;
}

export const FORGOT_PASSWORD_INITIAL_STATE: ForgotPasswordState = {
  error: null,
  sent: false,
};

/**
 * 계정 열거(user enumeration)를 막기 위해, 등록된 이메일이든 아니든
 * 화면에는 항상 이 문구 하나만 보여준다.
 */
export const FORGOT_PASSWORD_SENT_MESSAGE =
  "입력하신 이메일로 재설정 안내를 보냈습니다. 등록된 계정인 경우 메일을 확인해주세요.";
