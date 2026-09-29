/**
 * RPC 오류 → 사용자 문구 (DEC-111 · state-error-model).
 *
 * PHASE 07 SQL 은 사용자에게 보여도 되는 문장을 앱 전용 SQLSTATE
 * (예: SS004 · RP006 · OB004) 와 함께 던진다. 이 코드일 때만 message 를 그대로 쓴다.
 * 그 외(제약 이름 · 내부 오류 · 권한 오류 원문)는 절대 화면에 내보내지 않고
 * 호출한 곳이 정한 일반 문구로 바꾼다.
 */

const APP_ERROR_CODE = /^(SS|OB|GM|QM|RP|PT|CT|CP|MD|CS|EN|HS|MB|AG)\d{3}$/;

/** 동시 수정 충돌 (last-write-wins 금지 · DEC-111) */
const CONFLICT_CODES = new Set(["OB004", "QM005", "RP009", "CT008", "CP004", "MB005"]);

export interface RpcErrorLike {
  code?: string | null;
  message?: string | null;
}

export interface UserFacingError {
  message: string;
  kind: "validation" | "permission" | "conflict" | "not_entitled" | "server";
  code: string | null;
}

export function toUserFacingError(error: RpcErrorLike | null | undefined, fallback: string): UserFacingError {
  const code = typeof error?.code === "string" ? error.code : null;

  if (code && APP_ERROR_CODE.test(code) && error?.message) {
    return {
      message: error.message,
      code,
      kind: CONFLICT_CODES.has(code)
        ? "conflict"
        : code === "SS005" || code === "OB007" || code === "RP007" || code === "PT003" || code.startsWith("EN")
          ? "not_entitled"
          : code.endsWith("002")
            ? "permission"
            : "validation",
    };
  }

  if (code === "42501") {
    return { message: "찾을 수 없거나 접근 권한이 없습니다.", code, kind: "permission" };
  }

  return { message: fallback, code, kind: "server" };
}

/** 서버 로그용: 민감 본문 없이 코드만 남긴다 (PHASE 07 §112) */
export function logRpcFailure(scope: string, error: RpcErrorLike | null | undefined) {
  console.error(`[${scope}] failed: code=${error?.code ?? "unknown"}`);
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
