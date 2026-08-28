/**
 * 기관 사용자 로그인 Server Action의 useActionState 상태.
 * `"use server"` 파일은 런타임 export가 전부 async 함수여야 하므로 여기에 둔다.
 */
export interface OrganizationLoginState {
  error: string | null;
}

export const ORGANIZATION_LOGIN_INITIAL_STATE: OrganizationLoginState = {
  error: null,
};

/** searchParams로 전달되는 안내 메시지 (화이트리스트) */
export const LOGIN_NOTICES: Record<string, string> = {
  invalid_link: "초대 링크가 만료되었거나 이미 사용되었습니다.",
  recovery_expired:
    "비밀번호 재설정 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해주세요.",
  no_access: "접근 권한이 없는 계정입니다.",
};
