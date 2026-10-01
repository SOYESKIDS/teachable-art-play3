// PHASE 10G — 오늘의 수업 보드: 종료된 배정의 예정 수업 제외 (node:test · 네트워크 · DB 없음)
// ---------------------------------------------------------------------
// 실행:  node --test supabase/validation/phase10g/session_board.test.mjs
// buildTodayBoard 는 src/lib/staff/class-session-queries.ts 의 순수 함수 (type import 만 있어 Node 가 직접 import 한다).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const Q = await import(pathToFileURL(join(root, "src", "lib", "staff", "class-session-queries.ts")).href);
const TODAY = "2026-10-01";

const item = (over) => ({
  id: over.id, organization_id: "org", class_id: "class", class_program_assignment_id: over.assignmentId ?? "a-new",
  program_id: "p", lesson_id: "l", scheduled_date: "date" in over ? over.date : TODAY, status: over.status ?? "scheduled",
  created_at: "", updated_at: "", className: "가상 반", classAgeGroup: null, classStatus: "active",
  programTitle: "SOYE KIDS 8주", programCode: over.programCode ?? "SOYE-STARTER-2026.1", programStatus: "published",
  weekNo: over.week ?? 1, sessionNo: 1, lessonTitle: "t", lessonStatus: "published",
  assignmentStatus: over.assignmentStatus ?? "active", parentsActive: (over.assignmentStatus ?? "active") === "active",
});

test("종료된 배정(STAGING-P8 completed)의 예정 수업은 오늘 · 지난 · 날짜 없음 갈래에 없다", () => {
  const board = Q.buildTodayBoard([
    item({ id: "old-w1-overdue", assignmentId: "a-old", assignmentStatus: "completed", programCode: "STAGING-P8", date: "2026-09-28" }),
    item({ id: "old-w2-today", assignmentId: "a-old", assignmentStatus: "completed", programCode: "STAGING-P8", date: TODAY, week: 2 }),
    item({ id: "old-undated", assignmentId: "a-old", assignmentStatus: "cancelled", programCode: "STAGING-P8", date: null }),
    item({ id: "new-w1-today", date: TODAY }),
    item({ id: "new-overdue", date: "2026-09-30", week: 2 }),
    item({ id: "new-undated", date: null, week: 3 }),
  ], TODAY);
  const ids = (list) => list.map((s) => s.id);
  assert.deepEqual(ids(board.todaySessions), ["new-w1-today"]);
  assert.deepEqual(ids(board.overdueSessions), ["new-overdue"]);
  assert.deepEqual(ids(board.undatedSessions), ["new-undated"]);
  assert.equal(board.summary.scheduledToday, 1, "요약도 현재 배정 기준");
  for (const s of [...board.todaySessions, ...board.overdueSessions, ...board.undatedSessions]) assert.equal(s.parentsActive, true);
});

test("진행 중 수업 · 오늘의 완료 · 취소 이력은 배정 상태와 무관하게 남는다", () => {
  const board = Q.buildTodayBoard([
    item({ id: "old-in-progress", assignmentId: "a-old", assignmentStatus: "completed", status: "in_progress", date: "2026-09-28" }),
    item({ id: "old-completed-today", assignmentId: "a-old", assignmentStatus: "completed", status: "completed", date: TODAY }),
    item({ id: "old-cancelled-today", assignmentId: "a-old", assignmentStatus: "completed", status: "cancelled", date: TODAY }),
  ], TODAY);
  assert.deepEqual(board.ongoingFromOtherDays.map((s) => s.id), ["old-in-progress"], "진행 중은 마치기 · 복구가 필요하다");
  assert.deepEqual(board.todaySessions.map((s) => s.id).sort(), ["old-cancelled-today", "old-completed-today"]);
  assert.equal(board.summary.inProgress, 1);
  assert.equal(board.summary.completedToday, 1);
  assert.equal(board.summary.cancelledToday, 1);
});

test("현재 배정의 미래 예정 수업은 기존대로 오늘 보드에 넣지 않는다 (이력 화면)", () => {
  const board = Q.buildTodayBoard([item({ id: "new-w2-future", date: "2026-10-08", week: 2 })], TODAY);
  assert.equal(board.todaySessions.length + board.overdueSessions.length + board.undatedSessions.length + board.ongoingFromOtherDays.length, 0);
});

test("서버 쿼리 경로: fetchTodayBoard 가 buildTodayBoard 를 쓰고 · 범위는 RLS(organization_id) 그대로 · 이력 조회는 status 로 거르지 않는다", () => {
  const src = readFileSync(join(root, "src", "lib", "staff", "class-session-queries.ts"), "utf8");
  assert.match(src, /return \{ ok: true, board: buildTodayBoard\(items, today\) \};/);
  assert.match(src, /if \(item\.status === "scheduled" && item\.assignmentStatus !== "active"\) continue;/);
  assert.match(src, /\.eq\("organization_id", organizationId\)\s*\n\s*\.or\(`scheduled_date\.eq\.\$\{today\},status\.in\.\(scheduled,in_progress\)`\)/);
  const history = src.slice(src.indexOf("export async function fetchSessionHistory"));
  assert.ok(history.length > 0);
  assert.doesNotMatch(history.slice(0, history.indexOf("\n}\n")), /assignmentStatus !== "active"/, "history keeps all assignments");
  for (const page of ["src/app/teacher/page.tsx", "src/app/director/sessions/page.tsx"]) {
    assert.match(readFileSync(join(root, page), "utf8"), /fetchTodayBoard\(/, `${page} uses the server board`);
  }
});
