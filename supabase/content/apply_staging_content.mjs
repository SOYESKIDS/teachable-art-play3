// PHASE 10F — STARTER 2026.1 콘텐츠 Staging 적용기 (쓰기 · 좁은 용도 · 한 번에 한 단계)
// ---------------------------------------------------------------------
// 사용:
//   node supabase/content/apply_staging_content.mjs <load|publish|uat-switch> --confirm-staging itcddooiuqsqingfhxkk [--dry-run]
//
// 안전장치 (하나라도 어긋나면 REFUSE TO RUN · 쓰기 전에 판정 · fail closed):
//   1. 단계 이름 allow-list → 고정 파일 3개만 (임의 SQL · 파일 인자 없음)
//        load       supabase/content/starter_2026_1_load.sql        (canonical 에서 생성된 그대로여야 함)
//        publish    supabase/content/starter_2026_1_publish.sql     (canonical 에서 생성된 그대로여야 함)
//        uat-switch supabase/content/starter_2026_1_staging_uat_switch.sql (SHA-256 고정 · 바뀌면 거부)
//   2. 대상: supabase/.temp/project-ref == Staging (Production · 다른 ref 명시 거부 · CLI 대상 env 거부 — guards.mjs)
//      + supabase/.temp/linked-project.json ref 도 Staging · + 명령줄 --confirm-staging 값도 Staging
//   3. 쓰기 전 읽기 전용 확인 (remote_readonly_query 경로 · 그 안전장치 그대로): 합성 아닌 사용자 0 · active 계약 1 · suspended 0
//   4. 파일 전체를 `begin; … commit;` 하나로 실행 (중간 오류 = 전체 미적용) · 자동 재시도 없음
//   5. CLI 는 `db query --linked --output json --agent yes` 만 (db push · migration · db-url 없음) · 출력은 비밀 · DB URL 가림
// 읽기 전용 runner(remote_readonly_query.mjs)의 규칙은 바꾸지 않는다 — 이 파일은 별도 쓰기 경로다.

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assertStagingProjectRef, refuse, ROOT, runMain, STAGING_PROJECT_REF, DENIED_PROJECT_REFS } from "../validation/staging_e2e/guards.mjs";
import { buildQueryCommand, parseCliResult, queryReadOnly } from "../validation/staging_e2e/remote_readonly_query.mjs";

export const STEPS = Object.freeze({
  load: "supabase/content/starter_2026_1_load.sql",
  publish: "supabase/content/starter_2026_1_publish.sql",
  "uat-switch": "supabase/content/starter_2026_1_staging_uat_switch.sql",
});

// uat-switch 파일 고정 해시 (LF 기준). 파일을 바꾸면 검토 후 이 값을 함께 바꿔야 실행된다.
export const UAT_SWITCH_SHA256 = "d5536b4181fa7a926ddacb629595f20ff70c25882513ef9a6b1f41774a6e27b8";

const STATE_SQL = "supabase/validation/staging_e2e/sql/p10f_staging_content_state.sql";
const lf = (text) => text.replace(/\r\n/g, "\n");
export const sha256 = (text) => createHash("sha256").update(lf(text), "utf8").digest("hex");

export function parseArgs(argv) {
  const step = argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--confirm-staging");
  const confirmIdx = argv.indexOf("--confirm-staging");
  const confirm = confirmIdx >= 0 ? argv[confirmIdx + 1] : undefined;
  const known = new Set(["--confirm-staging", "--dry-run", step, confirm]);
  const extra = argv.filter((a) => !known.has(a));
  if (extra.length) refuse(`알 수 없는 인자 (${extra.join(" ")})`);
  if (!step || !Object.hasOwn(STEPS, step)) refuse(`단계는 ${Object.keys(STEPS).join(" | ")} 중 하나`);
  if (confirm !== STAGING_PROJECT_REF) refuse("--confirm-staging 값이 Staging ref 와 다르다");
  return { step, dryRun: argv.includes("--dry-run") };
}

/** 실행할 SQL (검증 포함 · 네트워크 없음) */
export async function prepareStep(step, { root = ROOT } = {}) {
  const rel = STEPS[step];
  const text = lf(readFileSync(join(root, rel), "utf8"));
  if (/vpppxuhodwauaclhybtg/i.test(text)) refuse("SQL 에 Production ref 문자열이 있다");
  if (/\b(begin|commit|rollback)\s*;/i.test(text)) refuse("SQL 파일에 트랜잭션 제어가 있다 (적용기가 감싼다)");
  if (step === "load" || step === "publish") {
    const build = await import(pathToFileURL(join(root, "content", "starter", "2026.1", "build-sql.mjs")).href);
    const generated = build.buildSql();
    if (text !== (step === "load" ? generated.load : generated.publish)) refuse(`${rel} 가 canonical 생성 결과와 다르다 (build-sql.mjs 로 다시 생성)`);
  } else if (sha256(text) !== UAT_SWITCH_SHA256) {
    refuse(`${rel} SHA-256 이 고정값과 다르다 (${sha256(text).slice(0, 16)}…)`);
  }
  return { rel, sql: text, sha256: sha256(text) };
}

function assertLinkedProjectJson(root = ROOT) {
  let ref;
  try {
    ref = JSON.parse(readFileSync(join(root, "supabase", ".temp", "linked-project.json"), "utf8")).ref;
  } catch {
    refuse("supabase/.temp/linked-project.json 을 읽을 수 없다");
  }
  if (DENIED_PROJECT_REFS.includes(ref)) refuse(`linked-project.json 이 거부 대상 프로젝트(${ref})를 가리킨다`);
  if (ref !== STAGING_PROJECT_REF) refuse(`linked-project.json ref 가 Staging 이 아니다 (${ref})`);
}

function preWriteGate() {
  const results = queryReadOnly(STATE_SQL);
  const row = (n) => {
    const r = results[n - 1];
    if (!r || r.error) refuse(`쓰기 전 상태 확인 실패 (#${n}: ${r?.error ?? "no result"})`);
    return r.rows;
  };
  const fp = row(1)[0];
  const contracts = row(6)[0];
  if (fp.non_synthetic_users !== 0) refuse("합성 계정이 아닌 사용자가 있다");
  if (contracts.active_contracts !== 1 || contracts.suspended_contracts !== 0) {
    refuse(`계약 상태가 기대와 다르다 (active ${contracts.active_contracts} · suspended ${contracts.suspended_contracts})`);
  }
  return { non_synthetic_users: fp.non_synthetic_users, active_contracts: contracts.active_contracts, suspended_contracts: contracts.suspended_contracts };
}

async function main() {
  const { step, dryRun } = parseArgs(process.argv.slice(2));
  const ref = assertStagingProjectRef();
  assertLinkedProjectJson();
  const prepared = await prepareStep(step);
  console.log(`# target: Supabase Staging ${ref} · step=${step} · file=${prepared.rel} · sha256=${prepared.sha256.slice(0, 16)}… · ${prepared.sql.length} chars`);
  const gate = preWriteGate();
  console.log(`# pre-write gate: ${JSON.stringify(gate)}`);
  if (dryRun) {
    console.log("# dry-run: 쓰기 없음");
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), "p10f-w-"));
  const file = join(dir, "w.sql");
  writeFileSync(file, `begin;\n${prepared.sql}\ncommit;\n`);
  const r = spawnSync(buildQueryCommand(file), { cwd: ROOT, encoding: "utf8", shell: true, timeout: 600000 });
  rmSync(dir, { recursive: true, force: true });
  const status = r.error ? `spawn ${r.error.code ?? "error"}` : r.status;
  const result = parseCliResult({ status, stdout: r.stdout, stderr: r.stderr });
  console.log(JSON.stringify({ step, applied: !result.error, error: result.error ?? null, rows: result.rows ? result.rows.length : null }));
  if (result.error) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runMain(main);
}
