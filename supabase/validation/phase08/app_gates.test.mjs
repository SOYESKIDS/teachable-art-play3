// PHASE 08 — 앱 서버 gate 검증 (node:test · 새 npm 의존성 없음 · local 전용)
// ---------------------------------------------------------------------
// 실행:  node --test supabase/validation/phase08/app_gates.test.mjs
//
// 1. src/lib/ai/ai-assist-gate.ts 를 직접 import 해 판정 helper 를 검사한다 (Node 24 type stripping).
//    · DB 판정 결과가 오류 · 모르는 값이면 차단 (fail closed)
//    · 명시적 식별자(원아 이름 · 이메일 · 전화 · UUID) 검사
// 2. Server Action 소스의 순서를 정적으로 검사한다 (Next 런타임 없이 확인할 수 있는 범위) ·
// 3. J/K/L start gate (현재 브랜치 · fixture 빌드) — J 는 M5 앱 조건이 준비된 빌드로만 시작한다:
//    · AI provider 호출 전에 authorizeAiAssist → 환경변수 → 식별자 검사 (A1)
//    · legacy 수업 상태 변경 Action 은 saas_v2 모드면 인증 · DB 접근 전에 거부 (A2)
// DB 판정 자체(ai_assist · AR-8 · 담당 교사)는 supabase/tests/p0_phase08_security.test.sql 이 검사한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const gate = await import(new URL("file:///" + join(root, "src/lib/ai/ai-assist-gate.ts").replaceAll("\\", "/")).href);

function fakeSupabase(result) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) => {
      calls.push({ name, args });
      return result;
    },
  };
}

test("A1: DB allowed=true is the only path that allows the provider call", async () => {
  const sb = fakeSupabase({ data: { allowed: true, reason: null }, error: null });
  assert.deepEqual(await gate.authorizeAiAssist(sb, "observation_cleanup", "id-1"), { allowed: true });
  assert.equal(sb.calls[0].name, "ai_assist_authorization");
  assert.deepEqual(sb.calls[0].args, { p_kind: "observation_cleanup", p_target_id: "id-1" });
});

test("A1: AR-8 policy block is passed through (API key presence is irrelevant)", async () => {
  const sb = fakeSupabase({ data: { allowed: false, reason: "policy_blocked" }, error: null });
  assert.deepEqual(await gate.authorizeAiAssist(sb, "observation_cleanup", "id-1"), { allowed: false, reason: "policy_blocked" });
});

test("A1: no ai_assist entitlement is passed through", async () => {
  const sb = fakeSupabase({ data: { allowed: false, reason: "not_entitled" }, error: null });
  assert.deepEqual(await gate.authorizeAiAssist(sb, "period_report_draft", "id-2"), { allowed: false, reason: "not_entitled" });
});

test("A1: RPC error, empty payload or unknown reason fail closed", async () => {
  const errored = fakeSupabase({ data: null, error: { code: "PGRST202" } });
  assert.deepEqual(await gate.authorizeAiAssist(errored, "observation_cleanup", "x"), { allowed: false, reason: "check_failed" });
  const empty = fakeSupabase({ data: null, error: null });
  assert.deepEqual(await gate.authorizeAiAssist(empty, "observation_cleanup", "x"), { allowed: false, reason: "check_failed" });
  const weird = fakeSupabase({ data: { allowed: "yes", reason: "bypass" }, error: null });
  assert.deepEqual(await gate.authorizeAiAssist(weird, "observation_cleanup", "x"), { allowed: false, reason: "check_failed" });
});

test("A1: every block reason has a user-facing message", () => {
  for (const reason of ["not_authorized", "policy_blocked", "not_released", "not_entitled", "read_only", "check_failed"]) {
    assert.ok(typeof gate.AI_BLOCK_MESSAGES[reason] === "string" && gate.AI_BLOCK_MESSAGES[reason].length > 0, reason);
  }
});

test("A1: explicit identifiers in free text block the provider call", () => {
  assert.equal(gate.findExplicitIdentifier(["오늘 가상아이A1이 색을 섞었다"], ["가상아이A1"]), "child_name");
  assert.equal(gate.findExplicitIdentifier(["연락처 parent@example.test 로 전달"], []), "email");
  assert.equal(gate.findExplicitIdentifier(["어머니 010-1234-5678"], []), "phone");
  assert.equal(gate.findExplicitIdentifier(["id 40000000-0000-0000-0000-0000000000a1"], []), "uuid");
  assert.equal(gate.findExplicitIdentifier([null, "", "두 색을 섞어 보았다"], ["가상아이A1"]), null);
  assert.equal(gate.findExplicitIdentifier(["해가 떴다"], ["해"]), null, "1-character names are not compared");
});

function source(path) {
  return readFileSync(join(root, path), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

// PHASE 10B: legacy AI 초안 Action(관찰 C1 · 기간 리포트 C2)은 M5 가 회수하는 RPC 를 쓰므로 앱에서 제거했다.
//   provider 모듈(src/lib/ai/*-draft-provider.ts)은 남아 있지만 어떤 앱 코드도 호출하지 않는다 → 판정 없는 provider 호출 경로 0.
//   AI 를 다시 붙일 때는 이 테스트를 "authorize → env → identifier → provider" 순서 검사로 되돌린다 (AR-8 OPEN).
function walkSrc(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walkSrc(`${dir}/${entry.name}`)
      : /\.(ts|tsx)$/.test(entry.name) ? [`${dir}/${entry.name}`] : [],
  );
}
const PROVIDER_USE = /generate(Observation|GrowthReport)Draft\(|@\/lib\/ai\/(observation|growth-report)-draft-provider/;
test("A1 (PHASE 10B): no app code calls an AI provider (legacy AI draft actions removed)", () => {
  for (const removed of ["src/lib/staff/observation-ai-actions.ts", "src/lib/staff/growth-report-ai-actions.ts"]) {
    assert.ok(!existsSync(join(root, removed)), removed);
  }
  const callers = walkSrc("src")
    .filter((file) => !file.startsWith("src/lib/ai/"))
    .filter((file) => PROVIDER_USE.test(source(file)));
  assert.deepEqual(callers, []);
});

// ---------------------------------------------------------------------
// J / K / L start gate (PHASE 08 PRE-COMMIT Issue 2)
// ---------------------------------------------------------------------
const gateScript = join(root, "supabase/cutover/JKL_start_gate.mjs");

function runGate(extraArgs = []) {
  return spawnSync(process.execPath, [gateScript, ...extraArgs], { encoding: "utf8" });
}

function fixtureRoot(files) {
  const dir = mkdtempSync(join(tmpdir(), "jkl-gate-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

// PHASE 10B: 이 브랜치는 legacy 화면 계열을 뺀 J 빌드다 → 앱 조건 READY (DB 조건은 JKL_window_preflight.sql 이 따로 본다)
test("JKL: current branch (legacy-free J build) passes the app start gate", () => {
  const r = runGate();
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /7\/7 PASS/);
  assert.match(r.stdout, /READY/);
});

test("JKL: a cutover build with no legacy consumer can start J", () => {
  const dir = fixtureRoot({
    "src/app/teacher/page.tsx": 'export default async function Page() { return null; }\nconst x = (s) => s.rpc("start_class_session", {});\n',
    "src/lib/staff/attendance-actions.ts": 'export const a = (s) => s.rpc("save_class_session_attendance_atomic", {});\n',
  });
  try {
    const r = runGate(["--root", dir]);
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /READY/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("JKL: any direct legacy write consumer blocks J", () => {
  const dir = fixtureRoot({
    "src/lib/staff/x.ts": 'export const a = (s) => s.from("class_sessions").update({ status: "completed" });\n',
  });
  try {
    const r = runGate(["--root", dir]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /no direct class_sessions.status update/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------
// PHASE 10B.1 — G-2 app preflight 수명 주기 (J-ready 빌드에서 예외 없이 lifecycle FAIL · gate 약화 없음)
// ---------------------------------------------------------------------
const g2Script = join(root, "supabase/cutover/G2_app_preflight.mjs");
const runG2 = (extraArgs = []) => spawnSync(process.execPath, [g2Script, ...extraArgs], { encoding: "utf8" });

test("G2 preflight: J-ready build fails cleanly with a lifecycle reason (no crash)", () => {
  const r = runG2();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout + r.stderr, /ENOENT|Error:|at .*\.mjs:\d+/);
  assert.match(r.stdout, /FAIL {2}staff app routing switch defaults to legacy and is server-only {2}→ pre-G2 routing switch absent/);
  assert.match(r.stdout, /17\/18 PASS/);
  assert.match(r.stdout, /LIFECYCLE:/);
  assert.match(r.stdout, /VERDICT: FAIL/);
});

test("G2 preflight: an ungated AI provider caller anywhere in src is caught (stricter than before)", () => {
  const dir = mkdtempSync(join(tmpdir(), "g2-pre-"));
  try {
    for (const top of ["src"]) {
      spawnSync(process.execPath, ["-e", `require("fs").cpSync(${JSON.stringify(join(root, top))}, ${JSON.stringify(join(dir, top))}, { recursive: true })`]);
    }
    mkdirSync(join(dir, "src/lib/staff"), { recursive: true });
    writeFileSync(join(dir, "src/lib/staff/rogue-ai.ts"), 'export async function x() { return generateObservationDraft({}); }\n');
    const r = runG2(["--root", dir]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL {2}AI actions authorize \(ai_assist · AR-8\) before calling the provider {2}→ src\/lib\/staff\/rogue-ai\.ts/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// PHASE 10B: legacy 수업 Action · 라우팅 스위치 자체를 제거했다 (이전 A2 는 saas_v2 모드 거부 순서를 검사했다)
const DIRECT_STATUS_UPDATE = /\.from\(\s*["'`]class_sessions["'`]\s*\)\s*\.update\(\s*\{[^}]*\bstatus\b/;
test("A2 (PHASE 10B): legacy session action and routing switch are removed and nothing updates class_sessions.status", () => {
  for (const removed of ["src/lib/staff/legacy-session-actions.ts", "src/components/staff/LegacySessionActions.tsx", "src/lib/rollout/staff-app-routing.ts"]) {
    assert.ok(!existsSync(join(root, removed)), removed);
  }
  const offenders = walkSrc("src").filter((file) => {
    const src = source(file);
    return /staffAppRouting|staff-app-routing|legacy-session-actions|LegacySessionActions/.test(src) || DIRECT_STATUS_UPDATE.test(src);
  });
  assert.deepEqual(offenders, []);
});
