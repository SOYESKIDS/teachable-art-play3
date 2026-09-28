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
//   6. CLI 는 `--linked --output json --agent yes` 로만 호출 (buildQueryCommand) — 결과는 parseCliResult 가
//      exit 0 · JSON object · rows array · error 필드 없음을 모두 확인할 때만 성공 (그 외 전부 실패 · fail closed)

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

// CLI 출력 형식을 명시한다. `--agent auto`(기본) 는 실행 환경을 감지해 사람 터미널에서는 표(text)를,
// agent 환경에서는 JSON 을 낸다 → 사람이 실행하면 "unparsed output" 이 났다 (PHASE 09A hotfix).
// `--output json --agent yes` = 항상 `{ boundary, rows, warning }` JSON (supabase 2.113.0 에서 확인).
// 대상은 `--linked` 뿐이다 (`--db-url` · `--local` · project ref 를 명령에 넣지 않는다).
export const CLI_PACKAGE = "supabase@2.113.0";
export const CLI_QUERY_ARGS = Object.freeze(["db", "query", "--linked", "--output", "json", "--agent", "yes"]);

/** 실행할 CLI 명령 (네트워크 없음 · 테스트 대상) */
export function buildQueryCommand(file) {
  if (/["\r\n]/.test(file)) refuse("임시 SQL 파일 경로에 허용되지 않는 문자");
  return `npx ${CLI_PACKAGE} ${CLI_QUERY_ARGS.join(" ")} --file "${file}"`;
}

const ANSI = /\u001b\[[0-9;]*m/g;
const DB_URL = /postgres(?:ql)?:\/\/\S+/gi;
const clean = (s) => redact(String(s).replace(ANSI, "").replace(DB_URL, "[redacted-db-url]")).trim().slice(0, 300);
// stderr 진행 메시지("Initialising login role..." · "Connecting to remote database..." 등)는 실패가 아니다.
// 이 패턴에 맞는 줄은 CLI · SQL 오류로 본다.
const ERROR_LINE = /\b(error|failed|fatal|panic)\b/i;

/**
 * CLI 결과 → { rows, error } (fail closed).
 * 성공 조건 전부: exit 0 · stderr 에 오류 줄 없음 · stdout 이 하나의 JSON object · `rows` 가 array (각 행 object) · `error` 필드 없음.
 * stdout 앞의 안내 줄: JSON 은 줄 맨 앞 `{` 에서 시작해 stdout 끝까지 온전히 해석돼야 하고,
 * 그 앞의 줄은 오류 패턴이 없을 때만 안내 문구로 무시한다 (오류 패턴이 있으면 실패).
 */
export function parseCliResult({ status, stdout, stderr }) {
  const fail = (msg) => ({ rows: null, error: clean(msg) });
  const errLines = String(stderr ?? "").replace(ANSI, "").split(/\r?\n/).filter((l) => ERROR_LINE.test(l));
  if (status !== 0) return fail(errLines.at(-1) ?? `cli exit ${status}`);
  if (errLines.length) return fail(errLines.at(-1));
  const text = String(stdout ?? "").replace(ANSI, "").trim();
  if (!text) return fail("empty stdout");
  const start = text.startsWith("{") ? 0 : text.search(/\n\{/) + 1;
  if (start === 0 && !text.startsWith("{")) return fail("stdout is not JSON (table/text output)");
  const lead = text.slice(0, start);
  if (ERROR_LINE.test(lead)) return fail(lead.split(/\r?\n/).filter((l) => ERROR_LINE.test(l)).at(-1));
  let json;
  try {
    json = JSON.parse(text.slice(start));
  } catch {
    return fail("stdout is not valid JSON");
  }
  if (json === null || typeof json !== "object" || Array.isArray(json)) return fail("JSON result is not an object");
  if ("error" in json) return fail(typeof json.error === "string" ? json.error : (json.error?.message ?? "error field in response"));
  if (!Array.isArray(json.rows)) return fail("no rows array in response");
  if (!json.rows.every((r) => r !== null && typeof r === "object" && !Array.isArray(r))) return fail("rows are not objects");
  return { rows: json.rows, error: null };
}

function execReadOnly(label, statement) {
  validateStatement(statement, label);
  const dir = mkdtempSync(join(tmpdir(), "p09-ro-"));
  const file = join(dir, "q.sql");
  writeFileSync(file, wrapReadOnly(statement));
  const r = spawnSync(buildQueryCommand(file), {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    timeout: 180000,
  });
  rmSync(dir, { recursive: true, force: true });
  const status = r.error ? `spawn ${r.error.code ?? "error"}` : r.status;
  return { label, ...parseCliResult({ status, stdout: r.stdout, stderr: r.stderr }) };
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
