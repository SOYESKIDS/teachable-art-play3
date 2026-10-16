import { test } from "node:test";
import assert from "node:assert/strict";
import { teacherPrioritySession, teacherSessionLinks } from "../src/lib/staff/session-navigation.ts";

const session = (id, status = "scheduled", date = "2026-10-16", extra = {}) => ({
  id, status, scheduled_date: date, parentsActive: true, organization_id: "org & 교사", ...extra,
});
const board = (extra = {}) => ({ today: "2026-10-16", todaySessions: [], ongoingFromOtherDays: [], overdueSessions: [], undatedSessions: [], ...extra });

test("오늘 수업이 없어도 지난 실제 회차의 준비 화면으로 연결하고 날짜를 바꾸지 않는다", () => {
  const past = Object.freeze(session("past", "scheduled", "2026-10-15"));
  const input = Object.freeze(board({ overdueSessions: Object.freeze([past]) }));
  const before = JSON.stringify(input);
  assert.equal(teacherPrioritySession(input), past);
  const link = teacherSessionLinks(past).preparation;
  assert.equal(link.label, "수업 준비");
  const url = new URL(link.href, "https://example.test");
  assert.equal(url.pathname, "/teacher/sessions/past/before");
  assert.equal(url.searchParams.get("org"), "org & 교사");
  assert.equal(JSON.stringify(input), before);
});
test("진행 중인 수업은 새 예정 수업보다 우선하고 during으로 이어진다", () => {
  const ongoing = session("ongoing", "in_progress", "2026-10-15");
  const picked = teacherPrioritySession(board({ todaySessions: [session("today")], ongoingFromOtherDays: [ongoing] }));
  assert.equal(picked, ongoing);
  assert.match(teacherSessionLinks(picked).preparation.href, /\/during\?/);
});
test("오늘 진행 중·오늘 예정·지난 예정·일정 미정의 순서를 유지한다", () => {
  const active = session("active", "in_progress");
  const today = session("today");
  const past = session("past", "scheduled", "2026-10-15");
  const undated = session("undated", "scheduled", null);
  const input = board({ todaySessions: [today, active], overdueSessions: [past], undatedSessions: [undated] });
  assert.equal(teacherPrioritySession(input), active);
  assert.equal(teacherPrioritySession({ ...input, todaySessions: [today] }), today);
  assert.equal(teacherPrioritySession({ ...input, todaySessions: [] }), past);
  assert.equal(teacherPrioritySession({ ...input, todaySessions: [], overdueSessions: [] }), undated);
});
test("완료·취소·부모 비활성 예정·미래 예정은 준비할 수업으로 추천하지 않는다", () => {
  const input = board({ todaySessions: [session("done", "completed"), session("cancel", "cancelled"), session("archived", "scheduled", "2026-10-16", { parentsActive: false }), session("future", "scheduled", "2026-10-17")] });
  assert.equal(teacherPrioritySession(input), null);
  for (const item of input.todaySessions.slice(0, 3)) assert.equal(teacherSessionLinks(item).preparation, null);
});
test("수업이 없으면 회차를 만들거나 다음 주차를 추측하지 않는다", () => {
  assert.equal(teacherPrioritySession(board()), null);
});
test("완료 회차에만 결과 확인 링크를 만들고 취소 회차에 새 작업을 안내하지 않는다", () => {
  assert.match(teacherSessionLinks(session("done", "completed")).report, /\/done\/report\?/);
  for (const status of ["scheduled", "in_progress", "cancelled"]) assert.equal(teacherSessionLinks(session("s", status)).report, null);
  assert.deepEqual(teacherSessionLinks(session("c", "cancelled")), { preparation: null, report: null });
});
