// LOCAL ONLY — cutover 검증 SQL 실행기 (PHASE 07 G-1)
// ---------------------------------------------------------------------
// 사용:  node supabase/cutover/tests/run-local.mjs <file.sql> [--raw] [--container supabase_db_<project>]
//        <file.sql> = 현재 디렉터리 기준 경로 또는 이 폴더 기준 파일명
//        --raw      = pgTAP 판정 없이 실행 결과를 그대로 출력 (seed · preflight 보고서용)
//
// · local Supabase DB 컨테이너(`supabase_db_*`)의 psql 로만 실행한다. remote · --linked 경로 없음.
// · 파일 안의 `\ir <path>` 를 실제 파일 내용으로 펼친다 (cutover SQL 을 복제하지 않기 위함).
// · 테스트 파일은 스스로 begin … rollback 하므로 DB 상태를 바꾸지 않는다.
// · pgTAP 결과(ok / not ok / plan)를 세어 요약하고, 실패 · plan 불일치면 exit 1.
// · 새 npm 의존성 없음 (node 내장 모듈만).

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..", "..", "..");
const args = process.argv.slice(2);
const containerFlag = args.indexOf("--container");
const raw = args.includes("--raw");
const target = args.find(
  (arg, index) => !arg.startsWith("--") && (containerFlag < 0 || index !== containerFlag + 1),
);
const container =
  containerFlag >= 0 ? args[containerFlag + 1] : `supabase_db_${basename(projectRoot)}`;

if (!target) {
  console.error("usage: node supabase/cutover/tests/run-local.mjs <file.sql> [--raw] [--container supabase_db_<project>]");
  process.exit(2);
}
if (!/^supabase_db_[A-Za-z0-9_.-]+$/.test(container)) {
  console.error(`refusing: container must be a local supabase_db_* container (got "${container}")`);
  process.exit(2);
}

function expand(file, depth = 0) {
  if (depth > 5) throw new Error("\\ir nesting too deep");
  const text = readFileSync(file, "utf8");
  return text.replace(/^\\ir\s+(\S+)\s*$/gm, (_line, rel) => {
    const included = resolve(dirname(file), rel);
    return `-- >>> included: ${included.slice(projectRoot.length + 1)}\n${expand(included, depth + 1)}\n-- <<< end include`;
  });
}

const file = existsSync(resolve(process.cwd(), target)) ? resolve(process.cwd(), target) : resolve(here, target);
const sql = expand(file);

const result = spawnSync(
  "docker",
  ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1"],
  { input: sql, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);

if (result.error) {
  console.error(`docker exec failed: ${result.error.message}`);
  process.exit(2);
}

if (raw) {
  process.stdout.write(result.stdout ?? "");
  const errors = `${result.stderr ?? ""}`.split(/\r?\n/).filter((line) => line.trim() !== "");
  for (const line of errors) console.error(line);
  console.log(`\n${basename(file)}: psql_exit=${result.status}`);
  process.exit(result.status === 0 ? 0 : 1);
}

const lines = `${result.stdout ?? ""}`.split(/\r?\n/);
const tap = lines.filter((line) => /^(ok |not ok |1\.\.\d+|#)/.test(line));
for (const line of tap) console.log(line);

const planLine = tap.find((line) => /^1\.\.\d+$/.test(line));
const planned = planLine ? Number(planLine.slice(3)) : null;
const passed = tap.filter((line) => line.startsWith("ok ")).length;
const failed = tap.filter((line) => line.startsWith("not ok ")).length;
const skipped = tap.filter((line) => /^ok .*# skip/i.test(line)).length;
const todo = tap.filter((line) => /# todo/i.test(line)).length;
const stderr = `${result.stderr ?? ""}`
  .split(/\r?\n/)
  .filter((line) => /ERROR|error:/.test(line));

for (const line of stderr) console.error(line);
console.log(
  `\n${basename(file)}: planned=${planned ?? "?"} executed=${passed + failed} passed=${passed} failed=${failed} skip=${skipped} todo=${todo} psql_exit=${result.status}`,
);

const ok = result.status === 0 && planned !== null && failed === 0 && passed + failed === planned && stderr.length === 0;
console.log(ok ? "Result: PASS" : "Result: FAIL");
process.exit(ok ? 0 : 1);
