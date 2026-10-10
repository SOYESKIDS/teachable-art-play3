import { test } from "node:test";
import assert from "node:assert/strict";
import { STATUS_UPDATE_FAILURE, statusUpdateOutcome } from "../src/app/admin/(dashboard)/leads/status-outcome.ts";

// 응답 모양은 supabase-js 의 .update().eq().select("id, status") 결과와 같다 ({ data, error }).
const ID = "b9c28d2f-6c45-440a-81fe-4279f620f1fe";
const REQ = { id: ID, status: "closed" };

test("정상: 요청한 id · status 의 1행이 돌아오면 성공", () => {
  const out = statusUpdateOutcome({ data: [{ id: ID, status: "closed" }], error: null }, REQ);
  assert.deepEqual(out, { phase: "success", message: null, rows: 1 });
});

test("0행: 오류 없이 빈 배열이어도 성공으로 표시하지 않는다 (RLS 차단 · 없는 id)", () => {
  const out = statusUpdateOutcome({ data: [], error: null }, REQ);
  assert.equal(out.phase, "error");
  assert.equal(out.message, STATUS_UPDATE_FAILURE);
  assert.equal(out.phase === "error" && out.reason, "no-row");
});

test("응답 data 가 null 이어도 성공으로 표시하지 않는다", () => {
  assert.equal(statusUpdateOutcome({ data: null, error: null }, REQ).phase, "error");
});

test("권한 오류(42501): 실패로 표시하고 성공 메시지를 내지 않는다", () => {
  const out = statusUpdateOutcome({ data: null, error: { message: "permission denied for table lead_submissions", code: "42501" } }, REQ);
  assert.equal(out.phase === "error" && out.reason, "db-error");
  assert.equal(out.message, STATUS_UPDATE_FAILURE);
});

test("CHECK 위반 등 다른 DB 오류도 실패", () => {
  const out = statusUpdateOutcome({ data: null, error: { message: "new row violates check constraint", code: "23514" } }, REQ);
  assert.equal(out.phase, "error");
});

test("여러 행이 바뀐 비정상 응답은 성공으로 보지 않는다", () => {
  const out = statusUpdateOutcome({ data: [{ id: ID, status: "closed" }, { id: "x", status: "closed" }], error: null }, REQ);
  assert.equal(out.phase === "error" && out.reason, "multiple-rows");
});

test("돌아온 행의 id 나 status 가 요청과 다르면 실패", () => {
  assert.equal(statusUpdateOutcome({ data: [{ id: "other", status: "closed" }], error: null }, REQ).phase, "error");
  const out = statusUpdateOutcome({ data: [{ id: ID, status: "new" }], error: null }, REQ);
  assert.equal(out.phase === "error" && out.reason, "mismatch");
});

test("예상하지 못한 응답 모양(배열 아님 · 행이 객체 아님)은 실패", () => {
  assert.equal(statusUpdateOutcome({ data: { id: ID, status: "closed" }, error: null }, REQ).phase, "error");
  assert.equal(statusUpdateOutcome({ data: ["closed"], error: null }, REQ).phase, "error");
});
