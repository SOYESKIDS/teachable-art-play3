/**
 * SERVICE-17 — 원아 일괄 등록 Server Action 의 useActionState 상태.
 *
 * `"use server"` 파일은 런타임 export 가 전부 async 함수여야 하므로
 * 타입과 상수는 이 파일에 둔다 (기존 form-state.ts / class-child-state.ts 와 같은 이유).
 */

/** 실패한 행 하나. 사용자에게 "몇 번째 줄이 왜 실패했는지" 보여 준다. */
export interface BulkChildRowError {
  /** 사용자가 보는 줄 번호 (1부터) */
  line: number;
  /** 그 줄의 원문 일부. 내부 UUID 는 넣지 않는다. */
  input: string;
  reason: string;
}

export interface BulkChildState {
  phase: "idle" | "success" | "error";
  message: string | null;
  createdCount: number;
  failedCount: number;
  errors: BulkChildRowError[];
}

export const BULK_CHILD_INITIAL_STATE: BulkChildState = {
  phase: "idle",
  message: null,
  createdCount: 0,
  failedCount: 0,
  errors: [],
};

/** 한 번에 처리할 수 있는 최대 줄 수. 과도한 대량 insert 를 막는다. */
export const BULK_CHILD_MAX_ROWS = 200;

/** DB 왕복 한 번에 넣는 행 수 */
export const BULK_CHILD_CHUNK_SIZE = 50;

/** 화면에 펼쳐 보여 줄 실패 줄 수 */
export const BULK_CHILD_MAX_ERRORS = 20;
