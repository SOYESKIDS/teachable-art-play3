import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuickMemoSaveQueue, quickMemoSaveAcknowledgement } from "../src/lib/staff/quick-memo-save-queue.ts";

const ok = updatedAt => ({ ok: true, updatedAt, message: null, conflict: false });
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
const make = (save, initialBody = "", initialUpdatedAt = null) => createQuickMemoSaveQueue({ save, initialBody, initialUpdatedAt });

test("수정하지 않은 메모는 마치기 전 확인해도 RPC를 호출하지 않는다", async () => {
  let calls = 0;
  const q = make(async () => { calls++; return ok("t1"); });
  assert.equal(await q.flush(), true);
  assert.equal(calls, 0);
});
test("입력 직후 자동저장 지연을 기다리지 않고 저장 결과를 기다린다", async () => {
  const pending = deferred();
  const q = make(() => pending.promise);
  q.setBody("마지막에 입력한 말");
  let finished = false;
  const saving = q.flush().then(value => { finished = true; return value; });
  await Promise.resolve();
  assert.equal(finished, false);
  assert.equal(q.getSnapshot().status, "saving");
  pending.resolve(ok("2026-10-16T02:30:00.123456+00:00"));
  assert.equal(await saving, true);
  assert.equal(q.getSnapshot().dirty, false);
});
test("저장 도중 추가 입력은 이전 서버 토큰으로 겹쳐 보내지 않고 순서대로 저장한다", async () => {
  const pending = deferred(); const calls = [];
  const q = make((body, token) => { calls.push({ body, token }); return calls.length === 1 ? pending.promise : Promise.resolve(ok("t2")); });
  q.setBody("첫 입력"); const first = q.flush();
  q.setBody("마지막 입력"); const second = q.flush();
  assert.equal(first, second);
  assert.equal(calls.length, 1);
  pending.resolve(ok("2026-10-16T02:30:00.123456+00:00"));
  assert.equal(await first, true);
  assert.deepEqual(calls, [{ body: "첫 입력", token: null }, { body: "마지막 입력", token: "2026-10-16T02:30:00.123456+00:00" }]);
  assert.equal(q.getSnapshot().body, "마지막 입력");
});
test("저장 도중 처음 값으로 되돌려도 이탈 경고를 유지하고 마지막 의도까지 저장한다", async () => {
  const pending = deferred(); const calls = [];
  const q = make((body, token) => { calls.push({ body, token }); return calls.length === 1 ? pending.promise : Promise.resolve(ok("t2")); }, "원래 값", "t0");
  q.setBody("수정 값"); const saving = q.flush(); q.setBody("원래 값");
  assert.equal(q.getSnapshot().dirty, true);
  pending.resolve(ok("t1")); await saving;
  assert.deepEqual(calls, [{ body: "수정 값", token: "t0" }, { body: "원래 값", token: "t1" }]);
});
test("예외·연결 실패는 미저장을 유지하고 같은 입력을 다시 저장할 수 있다", async () => {
  let calls = 0;
  const q = make(async () => { if (++calls === 1) throw Error("offline"); return ok("t1"); });
  q.setBody("지워지면 안 되는 입력");
  assert.equal(await q.flush(), false);
  assert.equal(q.getSnapshot().body, "지워지면 안 되는 입력");
  assert.equal(q.getSnapshot().status, "failed");
  assert.equal(q.getSnapshot().dirty, true);
  assert.equal(await q.flush(), true);
  assert.equal(calls, 2);
});
test("응답을 잃은 저장 도중 원래 값으로 돌아간 경우에도 재시도 시 실제 쓰기를 확인한다", async () => {
  const pending = deferred(); let calls = 0;
  const q = make(() => { calls++; return calls === 1 ? pending.promise : Promise.resolve(ok("t1")); }, "원래", "t0");
  q.setBody("변경"); const saving = q.flush(); q.setBody("원래");
  pending.resolve({ ok: false, updatedAt: null, conflict: false, message: "연결 실패" });
  assert.equal(await saving, false);
  assert.equal(q.getSnapshot().dirty, true);
  assert.equal(await q.flush(), true);
  assert.equal(calls, 2);
});
test("다른 기기 충돌 뒤에는 자동 재시도나 오래된 토큰으로 덮어쓰기를 하지 않는다", async () => {
  let calls = 0;
  const q = make(async () => { calls++; return { ok: false, updatedAt: null, conflict: true, message: "최신 내용 확인" }; });
  q.setBody("내 입력"); assert.equal(await q.flush(), false);
  q.setBody("내 추가 입력"); assert.equal(await q.flush(), false);
  assert.equal(calls, 1);
  assert.equal(q.getSnapshot().body, "내 추가 입력");
  assert.equal(q.getSnapshot().status, "conflict");
});
test("메모를 비우면 삭제 반환의 null 토큰을 다음 새 메모에 그대로 사용한다", async () => {
  const calls = [];
  const q = make(async (body, token) => { calls.push({ body, token }); return ok(body ? "t2" : null); }, "기존", "t1");
  q.setBody(""); await q.flush(); q.setBody("다시 작성"); await q.flush();
  assert.deepEqual(calls, [{ body: "", token: "t1" }, { body: "다시 작성", token: null }]);
});

test("응답이 비었거나 형식이 다르면 저장됨으로 처리하지 않는다", () => {
  for (const result of [null, {}, [], { updated_at: null }, { deleted: false, updated_at: null }]) {
    assert.equal(quickMemoSaveAcknowledgement(result, "실제 입력").ok, false);
  }
  assert.equal(quickMemoSaveAcknowledgement({ deleted: true, updated_at: null }, "실제 입력").ok, false);
});
test("서버의 마이크로초 토큰은 그대로 보존하고 빈 메모 삭제만 null로 인정한다", () => {
  const token = "2026-10-16T02:30:00.123456+00:00";
  assert.equal(quickMemoSaveAcknowledgement({ deleted: false, updated_at: token }, "입력").updatedAt, token);
  assert.equal(quickMemoSaveAcknowledgement({ deleted: true, updated_at: null }, "  ").ok, true);
});
