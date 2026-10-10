/**
 * 상태 변경 UPDATE 응답 → 화면 상태.
 *
 * ★ "오류 없음"만으로 성공 처리하지 않는다.
 *   PostgREST 는 RLS 가 막거나 id 가 없을 때 오류 없이 빈 배열(0행)을 돌려준다.
 *   그대로 성공으로 보면 관리자는 바꿨다고 믿고 DB 는 그대로 남는다.
 *   수정된 행이 정확히 1행이고, 그 행의 id · status 가 요청과 같을 때만 성공이다.
 *
 * 이 파일은 다른 모듈을 import 하지 않는다 (node --test 로 바로 검증).
 */

export const STATUS_UPDATE_FAILURE = "상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.";

export interface StatusUpdateResponse {
  data: unknown;
  error: { message: string; code?: string } | null;
}

export interface StatusUpdateRequest {
  id: string;
  status: string;
}

export type StatusUpdateOutcome =
  | { phase: "success"; message: null; rows: 1 }
  | {
      phase: "error";
      message: string;
      rows: number;
      reason: "db-error" | "no-row" | "multiple-rows" | "unexpected-response" | "mismatch";
    };

function fail(reason: Exclude<StatusUpdateOutcome, { phase: "success" }>["reason"], rows: number): StatusUpdateOutcome {
  return { phase: "error", message: STATUS_UPDATE_FAILURE, rows, reason };
}

export function statusUpdateOutcome(response: StatusUpdateResponse, request: StatusUpdateRequest): StatusUpdateOutcome {
  if (response.error) return fail("db-error", 0);
  if (response.data === null || response.data === undefined) return fail("no-row", 0);
  if (!Array.isArray(response.data)) return fail("unexpected-response", 0);

  const rows = response.data.length;
  if (rows === 0) return fail("no-row", 0);
  if (rows > 1) return fail("multiple-rows", rows);

  const row: unknown = response.data[0];
  if (typeof row !== "object" || row === null) return fail("unexpected-response", 1);
  const { id, status } = row as { id?: unknown; status?: unknown };
  if (id !== request.id || status !== request.status) return fail("mismatch", 1);

  return { phase: "success", message: null, rows: 1 };
}
