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

/**
 * searchParams 는 신뢰할 수 없는 입력이다.
 * 화이트리스트에 있는 코드만 문구로 바꾸고, 나머지는 전부 버린다 —
 * 주소에 적힌 문장을 그대로 화면에 띄우면 로그인 화면이
 * 남이 쓴 안내문을 대신 읽어 주는 창구가 된다.
 */
export function resolveLoginNotice(
  value: string | string[] | undefined,
): string | null {
  const code = Array.isArray(value) ? value[0] : value;
  return code ? (LOGIN_NOTICES[code] ?? null) : null;
}
