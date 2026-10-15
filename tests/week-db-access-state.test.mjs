import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeSections, getWeekContentFromDb } from "../src/lib/weeks/week-db-source.ts";
import { loadWeekContent } from "../src/lib/weeks/week-content-source.ts";

function clientWithLesson(lesson) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(table);
      const q = {
        select() { return q; }, eq() { return q; }, order() { return q; }, limit() { return q; },
        maybeSingle: async () => ({ data: lesson, error: null }),
        then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); },
      };
      return q;
    },
  };
}
const lesson = {
  id: "lesson-1", status: "draft", title: "유치원 가는 날",
  curriculum_programs: { id: "program-1", code: "SOYE-TAP24-2026.1", status: "published" },
};
const query = { programId: "program-1", weekNo: 1, audience: "service" };

test("본문 조회 0행은 원문에 없는 빈 블록으로 처리하지 않는다", () => {
  const result = decodeSections([]);
  assert.equal(result.ok, false);
  assert.match(result.detail, /적재 상태와 열람 권한/);
});
test("정식 경로의 미발행 차시는 본문·장면·출처를 조회하지 않는다", async () => {
  const client = clientWithLesson(lesson);
  const result = await getWeekContentFromDb(client, query);
  assert.equal(result.ok, true);
  assert.equal(result.result.bodyVisible, false);
  assert.equal(result.result.hidden, "not_published");
  assert.deepEqual(client.calls, ["curriculum_lessons"]);
  assert.equal(result.result.content.sourceFile, null);
  assert.deepEqual(result.result.content.scenes, []);
});
test("발행 차시라도 RLS로 본문이 0행이면 조회 실패를 알린다", async () => {
  const client = clientWithLesson({ ...lesson, status: "published" });
  const result = await getWeekContentFromDb(client, query);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "section_decode_failed");
});
test("RLS가 숨긴 차시를 DB에서 삭제됐다고 단정하지 않는다", async () => {
  const result = await getWeekContentFromDb(clientWithLesson(null), query);
  assert.equal(result.ok, false);
  assert.match(result.detail, /아직 발행되지 않았거나/);
  assert.doesNotMatch(result.detail, /program-1/);
});

async function loadViaRpc(reply) {
  const before = process.env.CONTENT_SOURCE;
  process.env.CONTENT_SOURCE = "database";
  const client = clientWithLesson(lesson);
  client.rpc = async (name, args) => {
    assert.equal(name, "resolve_organization_content_program");
    assert.deepEqual(args, { p_organization_id: "org-1" });
    return reply;
  };
  try {
    return { result: await loadWeekContent(client, { weekNo: 1, audience: "service", organizationId: "org-1" }), calls: client.calls };
  } finally {
    if (before === undefined) delete process.env.CONTENT_SOURCE;
    else process.env.CONTENT_SOURCE = before;
  }
}
test("교사 DB 로더는 계약표 읽기 없이 기관 교안 RPC로 연결한다", async () => {
  const { result, calls } = await loadViaRpc({ data: { ok: true, program_id: "44444444-4444-4444-4444-444444444444" }, error: null });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["curriculum_lessons"]);
});
test("교안 RPC 권한 오류는 계약 없음이나 fixture 성공으로 바뀌지 않는다", async () => {
  const { result, calls } = await loadViaRpc({ data: null, error: { code: "42501" } });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "query_failed");
  assert.deepEqual(calls, []);
});
test("교안 RPC의 계약 없음은 별도로 안내한다", async () => {
  const { result, calls } = await loadViaRpc({ data: { ok: false, reason: "no_contract" }, error: null });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "no_contract");
  assert.deepEqual(calls, []);
});
test("교안 RPC의 미연결은 조회 오류와 구분한다", async () => {
  const { result } = await loadViaRpc({ data: { ok: false, reason: "program_not_found" }, error: null });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "program_not_found");
});
test("교안 RPC의 잘못된 응답은 본문 조회 전에 막힌다", async () => {
  for (const data of [null, [], { ok: true, program_id: "" }, { ok: true, program_id: "arbitrary" }]) {
    const { result, calls } = await loadViaRpc({ data, error: null });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "query_failed");
    assert.deepEqual(calls, []);
  }
});
