// PHASE 09A — Staging READ-ONLY SQL 실행기 (Supabase Management API · `supabase db query --linked`)
// ---------------------------------------------------------------------
// 사용:
//   node supabase/validation/staging_e2e/remote_readonly_query.mjs <file.sql> [...] [--param name=<uuid>]
//   node supabase/validation/staging_e2e/remote_readonly_query.mjs --validate-only <file.sql> [...]   (네트워크 없음)
//
// 안전장치 (하나라도 어긋나면 REFUSE TO RUN · 실행 전에 판정):
//   1. 허용 파일만 (sql_guard.ALLOWED_FILES): staging_e2e/sql/*.sql · 읽기 전용 preflight 4개
//      (cutover 적용 · rollback 파일은 목록에 없다)
//   2. 문장 분리 후 모든 문장 사전 검증 (SELECT/WITH · 쓰기 · 세션 변경 키워드 · dollar-quote 거부) — 하나라도 거부면 아무것도 실행하지 않는다
//   3. linked project ref == Staging · CLI 대상을 바꾸는 env 없음 (guards.assertStagingProjectRef)
//   4. 첫 조회 전에 DB 지문 확인: 합성 계정이 아닌 사용자가 0 이어야 한다 (Production 이면 거부)
//   5. 모든 문장은 `begin transaction read only; … rollback;` 로 실행 — 1차 검사를 지나친 쓰기도 Postgres 가 25006 으로 거부
//   6. 결과가 오류 · 해석 불가 · 행 필드 없음이면 실패로 센다 (성공으로 판정되는 경로 없음)

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertStagingProjectRef, redact, refuse, ROOT, runMain } from "./guards.mjs";
import { bindUuidParams, isAllowedFile, splitStatements, validateStatement, wrapReadOnly } from "./sql_guard.mjs";

const FINGERPRINT = "select (select count(*) from auth.users where email not like '%@example.test')::int as non_synthetic_users";

/** 파일 → 검증된 문장 목록 (네트워크 없음) */
export function prepareFile(file, params = {}) {
  const rel = relative(ROOT, resolve(ROOT, file)).replaceAll("\\", "/");
  if (!isAllowedFile(rel)) refuse(`허용되지 않은 SQL 파일 (${rel})`);
  const statements = splitStatements(readFileSync(join(ROOT, rel), "utf8")).map((s, i) => {
    const bound = bindUuidParams(s, params);
    validateStatement(bound, `${basename(rel)}#${i + 1}`);
    return bound;
  });
  if (statements.length === 0) refuse(`실행할 문장이 없다 (${rel})`);
  return { rel, statements };
}

function execReadOnly(label, statement) {
  validateStatement(statement, label);
  const dir = mkdtempSync(join(tmpdir(), "p09-ro-"));
  const file = join(dir, "q.sql");
  writeFileSync(file, wrapReadOnly(statement));
  const r = spawnSync(`npx supabase@2.113.0 db query --linked --file "${file}"`, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    timeout: 180000,
  });
  rmSync(dir, { recursive: true, force: true });
  const text = `${r.stdout ?? ""}`;
  let rows = null;
  let error = null;
  try {
    const json = JSON.parse(text.slice(text.indexOf("{")));
    if (Array.isArray(json.rows)) rows = json.rows;
    else error = json.error?.message ?? "no rows in response";
  } catch {
    error = (text + (r.stderr ?? "")).split("\n").filter((l) => /error/i.test(l)).slice(-1)[0] ?? "unparsed output";
  }
  if (r.status !== 0 && !error) error = `cli exit ${r.status}`;
  return { label, rows, error: error ? redact(error).slice(0, 300) : null };
}

let fingerprintChecked = false;

/** 검증 · 지문 확인 후 읽기 전용 실행 (e2e_roles.mjs 가 쓰기 전 범위 확인에 사용) */
export function queryReadOnly(file, params = {}) {
  const prepared = prepareFile(file, params);
  assertStagingProjectRef();
  if (!fingerprintChecked) {
    const fp = execReadOnly("fingerprint", FINGERPRINT);
    if (fp.error || !fp.rows?.length) refuse(`DB 지문 확인 실패 (${fp.error ?? "no rows"})`);
    if (fp.rows[0].non_synthetic_users !== 0) refuse("합성 계정이 아닌 사용자가 있는 DB 다 (Staging 이 아닐 수 있음)");
    fingerprintChecked = true;
  }
  return prepared.statements.map((s, i) => execReadOnly(`${basename(prepared.rel)}#${i + 1}`, s));
}

async function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes("--validate-only");
  const params = {};
  const files = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--validate-only") continue;
    if (args[i] === "--param") {
      const [k, ...v] = String(args[i + 1] ?? "").split("=");
      params[k] = v.join("=");
      i += 1;
      continue;
    }
    files.push(args[i]);
  }
  if (files.length === 0) {
    console.error("usage: remote_readonly_query.mjs [--validate-only] <file.sql> ... [--param name=<uuid>]");
    process.exit(2);
  }

  // 모든 파일을 먼저 검증한다 (하나라도 거부면 아무것도 실행하지 않는다)
  const prepared = files.map((f) => prepareFile(f, params));
  if (validateOnly) {
    for (const p of prepared) console.log(JSON.stringify({ file: p.rel, statements: p.statements.length, valid: true }));
    return;
  }

  const ref = assertStagingProjectRef();
  console.log(`# target: Supabase Staging ${ref} · READ ONLY transaction per statement`);
  let failures = 0;
  for (const p of prepared) {
    console.log(`\n## ${basename(p.rel)} — ${p.statements.length} statement(s)`);
    for (const res of queryReadOnly(p.rel, params)) {
      if (res.error) failures += 1;
      console.log(JSON.stringify(res));
    }
  }
  process.exit(failures === 0 ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runMain(main);
}
