// M5 APPLICATION PREFLIGHT (READ ONLY) — legacy 쓰기 회수 cutover 전 앱 점검 · PHASE 08
// ---------------------------------------------------------------------
// 사용:  node supabase/cutover/M5_app_preflight.mjs [--root <배포할 앱 소스 루트>]
//        --root 를 주지 않으면 이 저장소 루트를 점검한다.
//
// 배포하려는 앱 소스가 M5_legacy_write_revoke.sql 이 회수하는 경로를 하나도 쓰지 않고, legacy 화면 계열이
// 꺼져 있는지 정적으로 확인한다. 파일을 읽기만 하고 DB · 네트워크에 접근하지 않는다.
//
// ★ 이 점검은 Step J 를 시작하기 위한 조건이기도 하다 (JKL_start_gate.mjs · cutover-runbook §2-1).
//   J(기본 경로 전환) 는 이 점검을 PASS 하는 빌드를 배포하는 것으로 수행하고, 곧바로 K(G-1) · L(M5) 를 이어서 한다.
//   현재 saas-v2 브랜치는 legacy 화면 계열(Production 기본)을 유지하므로 FAIL 이 정상이다.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootArg = process.argv.indexOf("--root");
const root = rootArg >= 0
  ? resolve(process.argv[rootArg + 1])
  : resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
}

function walk(dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((entry) => {
    const full = join(abs, entry);
    const rel = relative(root, full).replaceAll("\\", "/");
    if (statSync(full).isDirectory()) return walk(rel);
    return /\.(ts|tsx|mjs|js)$/.test(entry) ? [rel] : [];
  });
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const sources = walk("src").map((file) => ({ file, src: stripComments(readFileSync(join(root, file), "utf8")) }));
check("app source found", sources.length > 0, root);

// 1. 회수되는 RPC 호출 0 (direct legacy write consumer absent)
const REVOKED_RPC = [
  "save_class_session_observation_atomic",
  "create_or_refresh_child_growth_report",
  "save_child_growth_report_atomic",
  "save_child_growth_report_ai_draft",
  "apply_child_growth_report_ai_draft",
  "create_child_growth_report_share",
  "save_observation_ai_generated_atomic",
  "save_observation_ai_review_atomic",
];
const rpcHits = sources.flatMap(({ file, src }) =>
  [...src.matchAll(/\.rpc\(\s*["'`]([a-z_]+)["'`]/g)]
    .filter((m) => REVOKED_RPC.includes(m[1]))
    .map((m) => `${file}:${m[1]}`),
);
check("no consumer of an RPC revoked by M5", rpcHits.length === 0, rpcHits.join(", "));

// 2. 회수되는 표 쓰기 0
const REVOKED_TABLE_WRITES = {
  child_growth_reports: ["insert", "update", "upsert"],
  child_growth_report_sources: ["insert", "delete", "upsert"],
  child_growth_report_ai_drafts: ["insert", "update", "upsert"],
  child_growth_report_shares: ["insert", "upsert"],
  class_session_observation_domains: ["insert", "delete", "upsert"],
  class_session_observation_ai_drafts: ["insert", "update", "upsert"],
};
const tableHits = [];
for (const { file, src } of sources) {
  for (const [table, ops] of Object.entries(REVOKED_TABLE_WRITES)) {
    const pattern = new RegExp(`\\.from\\(\\s*["'\`]${table}["'\`]\\s*\\)\\s*\\.(${ops.join("|")})\\(`, "g");
    for (const m of src.matchAll(pattern)) tableHits.push(`${file}:${table}.${m[1]}`);
  }
}
check("no direct write to a table revoked by M5", tableHits.length === 0, tableHits.join(", "));

// 3. 세션 status 직접 UPDATE 0
const statusHits = sources
  .filter(({ src }) => /\.from\(\s*["'`]class_sessions["'`]\s*\)\s*\.update\(\s*\{[^}]*\bstatus\b/.test(src))
  .map(({ file }) => file);
check("no direct class_sessions.status update", statusHits.length === 0, statusHits.join(", "));

// 4. legacy 화면 계열 파일 · 라우팅 스위치 제거
const LEGACY_FILES = [
  "src/lib/staff/legacy-session-actions.ts",
  "src/components/staff/LegacySessionActions.tsx",
  "src/lib/rollout/staff-app-routing.ts",
];
const legacyPresent = LEGACY_FILES.filter((file) => existsSync(join(root, file)));
check("legacy route family files and routing switch removed", legacyPresent.length === 0, legacyPresent.join(", "));

// 5. legacy UI disabled for the target rollout: Legacy* 화면 · 컴포넌트를 import 하는 곳 0
const legacyUiImports = sources
  .filter(({ src }) => /from\s+["'`][^"'`]*\/Legacy[A-Z][A-Za-z]*["'`]/.test(src))
  .map(({ file }) => file);
check("legacy UI disabled (no Legacy* page / component import)", legacyUiImports.length === 0, legacyUiImports.join(", "));

// 6. no legacy action dependency: legacy 수업 Action · 라우팅 스위치 소비자 0
const legacyDeps = sources
  .filter(({ src }) => /legacy-session-actions|staffAppRouting\s*\(|staff-app-routing/.test(src))
  .map(({ file }) => file);
check("no legacy action / routing-switch dependency", legacyDeps.length === 0, legacyDeps.join(", "));

// 결과
let failed = 0;
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  → ${detail}` : ""}`);
}
console.log(`\nM5 application preflight: ${results.length - failed}/${results.length} PASS`);
console.log(failed === 0 ? "VERDICT: PASS (코드 준비됨 · DB 는 M5_preflight.sql 로 별도 확인)" : "VERDICT: FAIL — M5 를 적용하지 않는다 · Step J 를 시작하지 않는다");
process.exit(failed === 0 ? 0 : 1);
