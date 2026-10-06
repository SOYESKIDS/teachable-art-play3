// PHASE UAT-STABILIZATION — 학부모 공유 잠금 · 미래 수업 쓰기 가드 · 목표 표기 · 날짜 (node:test · 네트워크 · DB 없음)
// ---------------------------------------------------------------------
// 실행:  node --test supabase/validation/uat_stabilization/stabilization.test.mjs
// 순수 모듈(import 없음)은 Node 가 직접 import 하고, 서버 행동은 소스 패턴으로 확인한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const Goal = await import(pathToFileURL(join(root, "src", "lib", "content", "goal-notation.ts")).href);
const Labels = await import(pathToFileURL(join(root, "src", "lib", "entitlement", "labels.ts")).href);
const Board = await import(pathToFileURL(join(root, "src", "lib", "staff", "class-session-queries.ts")).href);

// ── P0 학부모 공유 출시 잠금 ─────────────────────────────────────
test("parent share: 출시 잠금 상수는 false 이고 서버 발급 행동이 RPC 전에 거절한다", () => {
  const locks = strip(read("src/lib/staff/release-locks.ts"));
  assert.match(locks, /export const PARENT_SHARING_RELEASED = false;/);
  const actions = strip(read("src/lib/staff/weekly-report-actions.ts"));
  const fn = actions.slice(actions.indexOf("export async function issueChildPortalAction"));
  const lockAt = fn.indexOf("if (!PARENT_SHARING_RELEASED)");
  const rpcAt = fn.indexOf('rpc("issue_child_portal"');
  assert.ok(lockAt > 0 && rpcAt > 0 && lockAt < rpcAt, "잠금 확인이 issue_child_portal RPC 보다 먼저");
  assert.match(fn.slice(lockAt, rpcAt), /return \{ ok: false, message: PARENT_SHARING_LOCK_MESSAGE, sharePath: null \}/);
});

test("parent share: 화면 버튼은 잠금 시 disabled · 기존 링크 중지(revoke)는 그대로", () => {
  const manager = read("src/components/staff/PortalManager.tsx");
  assert.match(manager, /disabled=\{busy \|\| issueLocked\}/);
  assert.match(manager, /공유 링크 중지/);
  const page = read("src/app/director/portal/page.tsx");
  assert.match(page, /issueLocked=\{!PARENT_SHARING_RELEASED\}/);
  assert.match(read("src/lib/staff/release-locks.ts"), /학부모 공유 기능은 현재 준비 중입니다\. 공유 동의 및 보안 정책 확정 후 제공됩니다\./);
});

// ── 미래 수업 쓰기 가드 ───────────────────────────────────────────
test("future session: 서버 가드가 미래 예정일 · 종료된 배정을 거절한다 (한국 시간 기준)", () => {
  const guard = strip(read("src/lib/staff/session-write-guard.ts"));
  assert.match(guard, /isFutureSessionDate\(row\.scheduled_date, todayInSeoul\(\)\)/);
  assert.match(guard, /status && status !== "active"/);
  assert.doesNotMatch(guard, /toISOString/, "UTC 날짜 비교 금지");
});

test("future session: 쓰기 서버 행동 6개가 모두 RPC 전에 가드를 거친다", () => {
  const cases = [
    ["src/lib/staff/class-mode-actions.ts", 'rpc("confirm_session_before"', "requireActiveAssignment: true"],
    ["src/lib/staff/class-mode-actions.ts", 'rpc("finish_class_session"'],
    ["src/lib/staff/class-mode-actions.ts", 'rpc("save_quick_memo"'],
    ["src/lib/staff/observation-v2-actions.ts", 'rpc("save_class_observation"'],
    ["src/lib/staff/attendance-actions.ts", "save_class_session_attendance_atomic"],
  ];
  for (const [file, rpc, extra] of cases) {
    const src = strip(read(file));
    const at = src.indexOf(rpc);
    assert.ok(at > 0, `${file}: ${rpc}`);
    const before = src.slice(Math.max(0, src.lastIndexOf("export async function", at)), at);
    assert.match(before, /guardSessionWrite\(/, `${file}: ${rpc} 앞에 guardSessionWrite`);
    if (extra) assert.ok(before.includes(extra), `${file}: ${extra}`);
  }
  const media = strip(read("src/lib/staff/observation-media-actions.ts"));
  const prep = media.slice(media.indexOf("export async function prepareObservationMediaUpload"));
  assert.match(prep.slice(0, prep.indexOf("export async function", 10)), /guardSessionWrite\(/);
});

test("future session: 화면은 버튼을 비활성으로 두고 '수업일에 열립니다'를 보여 준다", () => {
  const notice = read("src/components/staff/FutureSessionNotice.tsx");
  assert.match(notice, /수업일에 열립니다\./);
  assert.match(notice, /<button type="button" disabled/);
  for (const file of [
    "src/app/teacher/sessions/[sessionId]/before/page.tsx",
    "src/app/teacher/sessions/[sessionId]/attendance/page.tsx",
    "src/app/director/sessions/[sessionId]/attendance/page.tsx",
  ]) {
    assert.match(read(file), /isFutureSessionDate\(/, file);
    assert.match(read(file), /<FutureSessionNotice/, file);
  }
  assert.match(read("src/components/staff/SessionCard.tsx"), /isFuture \?/);
});

test("future session: 서비스 날짜는 Asia/Seoul — 한국 자정 직후에도 하루가 밀리지 않는다", () => {
  // 2026-10-01 00:30 KST = 2026-09-30 15:30 UTC
  assert.equal(Labels.seoulToday(new Date("2026-09-30T15:30:00Z")), "2026-10-01");
  assert.equal(Labels.formatDotDate("2026-09-28"), "2026.09.28");
  assert.equal(Labels.formatDotDate("2026-09-30T15:30:00Z"), "2026.10.01");
});

// ── 운영 보드 · 과거 합성 프로그램 ─────────────────────────────────
test("board: 종료된 배정의 예정 수업은 오늘 · 지난 미완료 갈래에 없고 시작 대상이 아니다", () => {
  const item = (id, date, assignmentStatus) => ({
    id, organization_id: "o", class_id: "c", class_program_assignment_id: "a", program_id: "p", lesson_id: "l",
    scheduled_date: date, status: "scheduled", created_at: "", updated_at: "", className: "반", classAgeGroup: null,
    classStatus: "active", programTitle: "t", programCode: "X", programStatus: "published", weekNo: 1, sessionNo: 1,
    lessonTitle: "t", lessonStatus: "published", assignmentStatus, parentsActive: assignmentStatus === "active",
  });
  const board = Board.buildTodayBoard([item("ended-past", "2026-09-28", "completed"), item("active-past", "2026-09-28", "active")], "2026-10-01");
  assert.deepEqual(board.overdueSessions.map((s) => s.id), ["active-past"]);
});

// ── 목표 표기 ────────────────────────────────────────────────────
test("goal notation: 'A X · B O' 를 이렇게 해요(B) / 하지 않아요(A) 로 나누고, 형식이 아니면 null", () => {
  const parsed = Goal.parseGoalNotation("‘빨리 적응시키기’ X · 새로운 공간을 자기 속도로 알아가며 안전감과 소속감을 만드는 첫 시작 O");
  assert.deepEqual(parsed, { avoid: "빨리 적응시키기", goal: "새로운 공간을 자기 속도로 알아가며 안전감과 소속감을 만드는 첫 시작" });
  assert.equal(Goal.parseGoalNotation("그냥 목표 문장"), null);
  assert.equal(Goal.parseGoalNotation(null), null);
});

// ── 이름 ────────────────────────────────────────────────────────
test("navigation: '수업 이력' → '수업 일정·이력' (교사 · 원장)", () => {
  assert.match(read("src/app/teacher/nav.ts"), /label: "수업 일정·이력"/);
  assert.match(read("src/app/director/nav.ts"), /label: "수업 일정·이력"/);
  assert.match(read("supabase/validation/staging_e2e/e2e_roles.mjs"), /=== "수업 일정·이력"/);
});
