import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeSections, getWeekContentFromDb } from "../src/lib/weeks/week-db-source.ts";

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
