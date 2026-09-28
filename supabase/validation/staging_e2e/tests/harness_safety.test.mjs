// PHASE 09A — staging_e2e harness 안전 테스트 (node:test · 새 의존성 없음 · 네트워크 없음)
// ---------------------------------------------------------------------
// 실행:  node --test supabase/validation/staging_e2e/tests/harness_safety.test.mjs
// remote Supabase · Preview 에 접속하지 않는다. CLI 수준 테스트는 네트워크 전에 끝나는 거부 경로만 쓴다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as G from "../guards.mjs";
import * as S from "../sql_guard.mjs";
import { resolvePlan } from "../e2e_roles.mjs";
import * as Q from "../remote_readonly_query.mjs";

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(HERE, "..", "..", "..");
const refuses = (fn) => assert.throws(fn, (e) => e?.name === "RefuseToRun");
const refusesAsync = (p) => assert.rejects(p, (e) => e?.name === "RefuseToRun");

function fakeRoot(ref) {
  const dir = mkdtempSync(join(tmpdir(), "p09-root-"));
  if (ref !== null) {
    mkdirSync(join(dir, "supabase", ".temp"), { recursive: true });
    writeFileSync(join(dir, "supabase", ".temp", "project-ref"), ref);
  }
  return dir;
}

// ── REVIEW 1 · Production hard fail ─────────────────────────
test("project ref: Staging accepted", () => {
  const r = fakeRoot("itcddooiuqsqingfhxkk");
  assert.equal(G.assertStagingProjectRef({ root: r, env: {} }), "itcddooiuqsqingfhxkk");
  rmSync(r, { recursive: true, force: true });
});
test("project ref: Production · other · wrong · empty · missing refused", () => {
  for (const ref of ["vpppxuhodwauaclhybtg", "iwvxpbpqfwibghiwsjvz", "abcdefghijklmnopqrst", "", "  ", null]) {
    const r = fakeRoot(ref);
    refuses(() => G.assertStagingProjectRef({ root: r, env: {} }));
    rmSync(r, { recursive: true, force: true });
  }
});
test("project ref: CLI target env override refused", () => {
  const r = fakeRoot("itcddooiuqsqingfhxkk");
  for (const name of G.CLI_TARGET_ENV) refuses(() => G.assertStagingProjectRef({ root: r, env: { [name]: "postgres://x" } }));
  rmSync(r, { recursive: true, force: true });
});
test("base URL: only the exact saas-v2 Preview alias is accepted", () => {
  assert.equal(G.assertPreviewBaseUrl(G.PREVIEW_ALIAS), G.PREVIEW_ALIAS);
  assert.equal(G.assertPreviewBaseUrl(`${G.PREVIEW_ALIAS}/login?x=1`), G.PREVIEW_ALIAS);
  assert.equal(G.assertPreviewBaseUrl(G.PREVIEW_ALIAS.toUpperCase().replace("HTTPS", "https")), G.PREVIEW_ALIAS);
});
test("base URL: production · deployment-hash · external · http · userinfo · port · malformed · empty refused", () => {
  const bad = [
    "https://teachable-art-play3.vercel.app",
    "https://teachable-art-play3-soyeskids-projects.vercel.app",
    "https://teachable-art-play3-ekrf6e0u4-soyeskids-projects.vercel.app", // Production deployment 도 같은 형식
    "https://evil.example.com",
    "https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app.evil.com",
    "https://evil.com/https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app",
    "http://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app",
    "https://user:pw@teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app",
    "https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app:8443",
    "https://127.0.0.1:3100",
    "http://localhost:3100",
    "not a url",
    "",
    undefined,
  ];
  for (const u of bad) refuses(() => G.assertPreviewBaseUrl(u));
});
test("redirect: leaving the allowed origin (SSO · production · unknown) is refused", () => {
  assert.equal(G.assertOnOrigin(`${G.PREVIEW_ALIAS}/teacher`, G.PREVIEW_ALIAS), true);
  for (const u of ["https://vercel.com/sso-api?url=x", "https://teachable-art-play3.vercel.app/", "https://evil.example.com/", "about:blank"]) {
    refuses(() => G.assertOnOrigin(u, G.PREVIEW_ALIAS));
  }
});
test("local mode: localhost only", () => {
  assert.equal(G.assertLocalBaseUrl("http://127.0.0.1:3100"), "http://127.0.0.1:3100");
  for (const u of [G.PREVIEW_ALIAS, "https://127.0.0.1:3100", "http://10.0.0.5:3100", "http://evil.com"]) refuses(() => G.assertLocalBaseUrl(u));
});
test("bundle ref: Staging accepted · production · unknown · none refused · local with remote refused", () => {
  assert.equal(G.assertBundleProjectRef(["x https://itcddooiuqsqingfhxkk.supabase.co y"]), "itcddooiuqsqingfhxkk");
  refuses(() => G.assertBundleProjectRef(["https://vpppxuhodwauaclhybtg.supabase.co"]));
  refuses(() => G.assertBundleProjectRef(["https://itcddooiuqsqingfhxkk.supabase.co", "https://aaaaaaaaaaaaaaaaaaaa.supabase.co"]));
  refuses(() => G.assertBundleProjectRef(["no supabase here"]));
  assert.equal(G.assertBundleProjectRef(["http://127.0.0.1:54321"], { expectLocal: true }), "local");
  refuses(() => G.assertBundleProjectRef(["https://itcddooiuqsqingfhxkk.supabase.co"], { expectLocal: true }));
});

// ── REVIEW 3 · read-only SQL ─────────────────────────────────
test("sql: allow-listed files only (cutover apply · rollback refused)", () => {
  for (const f of ["supabase/cutover/G1_preflight.sql", "supabase/cutover/G2_db_preflight.sql", "supabase/cutover/M5_preflight.sql",
    "supabase/cutover/JKL_window_preflight.sql", "supabase/validation/staging_e2e/sql/e2e_effects.sql"]) assert.equal(S.isAllowedFile(f), true, f);
  for (const f of ["supabase/cutover/M3_hq_role_split_sensitive_access.sql", "supabase/cutover/M3_entitlement_write_gates.sql",
    "supabase/cutover/M5_legacy_write_revoke.sql", "supabase/cutover/M5_legacy_write_rollback.sql", "supabase/cutover/M3_hq_role_split_rollback.sql",
    "supabase/migrations/20261002090000_p08_membership_authority.sql", "supabase/validation/staging_e2e/sql/../../../cutover/M5_legacy_write_revoke.sql",
    "supabase/validation/staging_e2e/sql/x.SQL"]) assert.equal(S.isAllowedFile(f), false, f);
});
test("sql: write · DDL · session statements refused", () => {
  const bad = [
    "INSERT INTO public.children (name) VALUES ('x')",
    "update public.children set name = 'x'",
    "DELETE FROM public.children",
    "insert into t values (1) on conflict do update set x = 1",
    "MERGE INTO t USING s ON true WHEN MATCHED THEN DELETE",
    "create table t (x int)", "alter table t add column y int", "drop table t", "truncate public.children",
    "grant all on t to anon", "revoke all on t from anon", "call p()", "do $$ begin perform 1; end $$",
    "copy t to stdout", "vacuum", "select 1 into temp t", "select set_config('role','x',false)",
    "select pg_advisory_lock(1)", "select nextval('s')", "select * from dblink('x','y')", "set role postgres",
    "select 1 from t for update",
    "with x as (delete from public.children returning 1) select count(*) from x",
    "with x as (update t set a = 1 returning 1) select 1",
    "WITH x AS (INSERT INTO t VALUES (1) RETURNING 1) SELECT 1",
    "select $$drop$$",
    "/* hi */ delete from t",
  ];
  for (const s of bad) refuses(() => S.validateStatement(s, "t"));
});
test("sql: multi statement is split and every part validated", () => {
  const parts = S.splitStatements("SELECT 1; DELETE FROM public.children;");
  assert.equal(parts.length, 2);
  S.validateStatement(parts[0]);
  refuses(() => S.validateStatement(parts[1]));
  const withComment = S.splitStatements("select 1 -- ; delete from t\n; select 'a;b'");
  assert.equal(withComment.length, 2);
  refuses(() => S.splitStatements("select 'unterminated"));
  refuses(() => S.splitStatements("select 1 /* open"));
});
test("sql: keywords inside string literals do not trigger · plain select allowed", () => {
  assert.equal(S.validateStatement("select count(*) from t where name ~ '(update|delete)'"), true);
  assert.equal(S.validateStatement("with a as (select 1) select * from a"), true);
});
test("sql: canonical preflights and harness SQL pass validation", () => {
  for (const f of ["supabase/cutover/G1_preflight.sql", "supabase/cutover/G2_db_preflight.sql", "supabase/cutover/M5_preflight.sql",
    "supabase/cutover/JKL_window_preflight.sql", "supabase/validation/staging_e2e/sql/staging_inventory.sql",
    "supabase/validation/staging_e2e/sql/session_dates.sql", "supabase/validation/staging_e2e/sql/e2e_effects.sql"]) {
    const statements = S.splitStatements(readFileSync(join(ROOT, f), "utf8"));
    assert.ok(statements.length > 0, f);
    for (const s of statements) S.validateStatement(s, f);
  }
});
test("sql: parameters accept UUID only · unbound placeholder refused", () => {
  const sql = readFileSync(join(ROOT, "supabase/validation/staging_e2e/sql/e2e_target_scope.sql"), "utf8");
  const [stmt] = S.splitStatements(sql);
  refuses(() => S.bindUuidParams(stmt, {}));
  refuses(() => S.bindUuidParams(stmt, { session_id: "x'; delete from t; --" }));
  const bound = S.bindUuidParams(stmt, { session_id: "00000000-0000-4000-8000-000000000001" });
  assert.equal(S.validateStatement(bound), true);
});
test("sql: execution is always wrapped in a read-only transaction", () => {
  assert.match(S.wrapReadOnly("select 1"), /^begin transaction read only;\nselect 1;\nrollback;\n$/);
});
test("sql CLI: disallowed file refused before any network", () => {
  const r = spawnSync(process.execPath, [join(HERE, "remote_readonly_query.mjs"), "--validate-only", "supabase/cutover/M5_legacy_write_revoke.sql"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /REFUSE TO RUN/);
});

// ── HOTFIX · CLI 출력 형식 · JSON 파서 (fail closed) ─────────
// 실제 supabase 2.113.0 `--output json --agent yes` 출력 형태 (local 에서 확인한 모양 · 값은 가짜)
const CLI_OK = '{\n  "boundary": "0123abcd",\n  "rows": [\n    {\n      "non_synthetic_users": 0\n    }\n  ],\n  "warning": "untrusted data"\n}\n';
const PROGRESS = "Initialising login role...\nConnecting to remote database...\n";
test("cli command: --linked · explicit JSON output · --agent yes · no other target", () => {
  const cmd = Q.buildQueryCommand("C:/tmp/p09-ro-x/q.sql");
  assert.equal(cmd, 'npx supabase@2.113.0 db query --linked --output json --agent yes --file "C:/tmp/p09-ro-x/q.sql"');
  assert.ok(!/--db-url|--local\b|--project-ref|postgres(ql)?:\/\/|--workdir|--profile/.test(cmd));
  assert.ok(!/vpppxuhodwauaclhybtg|iwvxpbpqfwibghiwsjvz|itcddooiuqsqingfhxkk/.test(cmd), "no project ref in the command (linked only)");
  assert.ok(!/teachable-art-play3(-soyeskids-projects)?\.vercel\.app|supabase\.co/.test(cmd));
  refuses(() => Q.buildQueryCommand('C:/tmp/x" --db-url "postgres://x'));
});
test("cli command: execReadOnly uses buildQueryCommand only", () => {
  const src = readFileSync(join(HERE, "remote_readonly_query.mjs"), "utf8");
  assert.equal((src.match(/spawnSync\(/g) ?? []).length, 1);
  assert.match(src, /spawnSync\(buildQueryCommand\(file\)/);
});
test("cli parse A: table / non-JSON stdout fails", () => {
  const r = Q.parseCliResult({ status: 0, stdout: "┌───┐\n│ a │\n├───┤\n│ 1 │\n└───┘\n", stderr: PROGRESS });
  assert.equal(r.rows, null);
  assert.match(r.error, /not JSON/);
});
test("cli parse B: valid JSON with rows succeeds · stderr progress is not an error · empty rows is a valid result", () => {
  assert.deepEqual(Q.parseCliResult({ status: 0, stdout: CLI_OK, stderr: PROGRESS }), { rows: [{ non_synthetic_users: 0 }], error: null });
  assert.deepEqual(Q.parseCliResult({ status: 0, stdout: '{"rows":[]}', stderr: "" }), { rows: [], error: null });
});
test("cli parse C: leading info lines + JSON succeeds only if the lead has no error and the JSON is complete", () => {
  assert.deepEqual(Q.parseCliResult({ status: 0, stdout: `${PROGRESS}${CLI_OK}`, stderr: "" }).rows, [{ non_synthetic_users: 0 }]);
  assert.equal(Q.parseCliResult({ status: 0, stdout: `error: something\n${CLI_OK}`, stderr: "" }).rows, null);
  assert.equal(Q.parseCliResult({ status: 0, stdout: `${CLI_OK}trailing text`, stderr: "" }).rows, null);
  assert.equal(Q.parseCliResult({ status: 0, stdout: 'note {"rows":[{"a":1}]}', stderr: "" }).rows, null, "JSON must start a line");
});
test("cli parse D: exit 0 with empty stdout fails", () => {
  for (const stdout of ["", "  \n", undefined, null]) assert.equal(Q.parseCliResult({ status: 0, stdout, stderr: PROGRESS }).rows, null);
});
test("cli parse E: non-zero exit fails even with valid JSON · SQL error surfaced without ANSI · DB URL redacted", () => {
  assert.equal(Q.parseCliResult({ status: 1, stdout: CLI_OK, stderr: "" }).rows, null);
  assert.equal(Q.parseCliResult({ status: null, stdout: CLI_OK, stderr: "" }).rows, null, "timeout / signal");
  assert.equal(Q.parseCliResult({ status: "spawn ENOENT", stdout: "", stderr: "" }).rows, null);
  const r = Q.parseCliResult({
    status: 1,
    stdout: "",
    stderr: 'Connecting...\n\u001b[31mfailed to execute query: error: cannot execute INSERT in a read-only transaction postgresql://postgres:FAKE_TEST_ONLY_pw@db.example.test:5432/postgres\u001b[39m\n',
  });
  assert.equal(r.rows, null);
  assert.match(r.error, /read-only transaction/);
  assert.ok(!r.error.includes("\u001b") && !r.error.includes("FAKE_TEST_ONLY_pw") && !/postgres(ql)?:\/\//.test(r.error));
  assert.equal(Q.parseCliResult({ status: 0, stdout: CLI_OK, stderr: "ERROR: unexpected\n" }).rows, null, "error on stderr with exit 0");
});
test("cli parse F: JSON without a rows array fails (bare array · missing · non-array · non-object rows)", () => {
  for (const stdout of ['[{"a":1}]', '{"boundary":"x"}', '{"rows":{"a":1}}', '{"rows":"x"}', '{"rows":[1,2]}', '{"rows":[null]}', "null", "42", '"x"']) {
    assert.equal(Q.parseCliResult({ status: 0, stdout, stderr: "" }).rows, null, stdout);
  }
});
test("cli parse G: JSON with an error field fails", () => {
  for (const stdout of ['{"rows":[],"error":"boom"}', '{"error":{"message":"boom"}}', '{"rows":[{"a":1}],"error":null}']) {
    const r = Q.parseCliResult({ status: 0, stdout, stderr: "" });
    assert.equal(r.rows, null, stdout);
    assert.ok(r.error);
  }
});

// ── REVIEW 2 · 7 · remote write gate ─────────────────────────
const FAKE = {
  SOYE_STAGING_TEACHER_PASSWORD: "FAKE_TEST_ONLY_teacher",
  SOYE_STAGING_DIRECTOR_PASSWORD: "FAKE_TEST_ONLY_director",
};
const neverQuery = async () => { throw new Error("remote query must not run in this test"); };
test("write gate: read-only is the default (no flag = no writes)", async () => {
  const plan = await resolvePlan({ argv: ["--target", "staging"], env: { ...FAKE }, queryScope: neverQuery });
  assert.equal(plan.allowWrites, false);
});
test("write gate: flag without session id refused (no auto-pick)", async () => {
  await refusesAsync(resolvePlan({ argv: ["--target", "staging", "--allow-staging-writes"], env: { ...FAKE }, queryScope: neverQuery }));
});
test("write gate: invalid session id refused", async () => {
  await refusesAsync(resolvePlan({ argv: ["--target", "staging", "--allow-staging-writes"], env: { ...FAKE, SOYE_STAGING_E2E_SESSION_ID: "latest" }, queryScope: neverQuery }));
});
test("write gate: missing teacher or director credential refused", async () => {
  const env = { SOYE_STAGING_TEACHER_PASSWORD: "FAKE_TEST_ONLY_pw", SOYE_STAGING_E2E_SESSION_ID: "00000000-0000-4000-8000-000000000001" };
  await refusesAsync(resolvePlan({ argv: ["--target", "staging", "--allow-staging-writes"], env, queryScope: neverQuery }));
  const env2 = { SOYE_STAGING_DIRECTOR_PASSWORD: "FAKE_TEST_ONLY_pw", SOYE_STAGING_E2E_SESSION_ID: "00000000-0000-4000-8000-000000000001" };
  await refusesAsync(resolvePlan({ argv: ["--target", "staging", "--allow-staging-writes"], env: env2, queryScope: neverQuery }));
});
test("write gate: local flag on staging refused · staging flag on local refused", async () => {
  await refusesAsync(resolvePlan({ argv: ["--target", "staging", "--allow-writes"], env: { ...FAKE }, queryScope: neverQuery }));
  await refusesAsync(resolvePlan({ argv: ["--target", "local-rehearsal", "--allow-staging-writes"], env: {}, queryScope: neverQuery }));
  await refusesAsync(resolvePlan({ argv: ["--target", "local-rehearsal", "--allow-writes"], env: {}, queryScope: neverQuery }));
});
test("write gate: CLI target env override refused", async () => {
  await refusesAsync(resolvePlan({ argv: ["--target", "staging"], env: { ...FAKE, SUPABASE_DB_URL: "postgres://prod" }, queryScope: neverQuery }));
});
test("write gate: unknown target refused", async () => {
  await refusesAsync(resolvePlan({ argv: ["--target", "production"], env: {}, queryScope: neverQuery }));
});
test("missing passwords: AUTHENTICATED_E2E = BLOCKED_PENDING_LOCAL_PASSWORDS (no fallback / default password)", async () => {
  const plan = await resolvePlan({ argv: ["--target", "staging"], env: {}, queryScope: neverQuery });
  assert.equal(plan.blocked.status, "BLOCKED_PENDING_LOCAL_PASSWORDS");
  assert.equal(plan.blocked.AUTHENTICATED_E2E, "BLOCKED_PENDING_LOCAL_PASSWORDS");
  assert.deepEqual(G.secretPresence({}), { hqAdmin: "MISSING", hqSales: "MISSING", director: "MISSING", teacher: "MISSING" });
  assert.equal(G.getSecret("teacher", {}), "");
});

// ── PHASE 09B · Vercel bypass 비밀 제거 (Preview alias = Deployment Protection Exception) ──
// 검사 문자열은 조각으로 만든다 (이 파일 자체가 걸리지 않게)
const BYPASS_ENV = ["SOYE", "STAGING", "VERCEL", "BYPASS"].join("_");
const BYPASS_HEADER = ["x-vercel", "protection", "bypass"].join("-");
const BYPASS_COOKIE_QUERY = ["x-vercel", "set", "bypass", "cookie"].join("-");
const SCOPE_UUID = "00000000-0000-4000-8000-000000000001";
test("09B-1: bypass secret is not required — read-only plan and write plan resolve without it", async () => {
  assert.ok(!Object.values(G.SECRET_NAMES).includes(BYPASS_ENV));
  assert.deepEqual(Object.values(G.SECRET_NAMES).sort(), [
    "SOYE_STAGING_DIRECTOR_PASSWORD", "SOYE_STAGING_HQ_ADMIN_PASSWORD", "SOYE_STAGING_HQ_SALES_PASSWORD", "SOYE_STAGING_TEACHER_PASSWORD",
  ]);
  const ro = await resolvePlan({ argv: ["--target", "staging"], env: { ...FAKE }, queryScope: neverQuery });
  assert.equal(ro.blocked, undefined);
  assert.deepEqual(Object.keys(ro.roles).sort(), ["director", "teacher"]);
  const w = await resolvePlan({
    argv: ["--target", "staging", "--allow-staging-writes"],
    env: { ...FAKE, SOYE_STAGING_E2E_SESSION_ID: SCOPE_UUID },
    queryScope: async (id) => { assert.equal(id, SCOPE_UUID); return [OK_SCOPE]; },
  });
  assert.equal(w.allowWrites, true);
  assert.equal(w.sessionId, SCOPE_UUID);
});
test("09B-2 · 3: no bypass header · bypass query · bypass env anywhere in harness code", () => {
  for (const { f, src } of harnessSources) {
    if (f === "harness_safety.test.mjs") continue;
    assert.ok(!src.toLowerCase().includes(BYPASS_HEADER), `${f}: header`);
    assert.ok(!src.toLowerCase().includes(BYPASS_COOKIE_QUERY), `${f}: cookie query`);
    assert.ok(!src.includes(BYPASS_ENV) && !/vercelBypass/.test(src), `${f}: env`);
  }
});
test("09B-4: vercel.com SSO redirect → BLOCKED_BY_VERCEL_DEPLOYMENT_PROTECTION (no bypass attempt) · other external refused", () => {
  assert.equal(G.classifyPreviewAccess({ status: 302, externalUrl: "https://vercel.com/sso-api?url=x&nonce=y" }), "BLOCKED_BY_VERCEL_DEPLOYMENT_PROTECTION");
  assert.equal(G.PREVIEW_BLOCKED, "BLOCKED_BY_VERCEL_DEPLOYMENT_PROTECTION");
  assert.equal(G.isVercelSso("https://vercel.com/sso-api?x=1"), true);
  assert.equal(G.isVercelSso(G.PREVIEW_ALIAS + "/login"), false);
  assert.equal(G.classifyPreviewAccess({ status: 200 }), "REACHABLE");
  assert.equal(G.classifyPreviewAccess({ status: 500 }), "UNREACHABLE_STATUS_500");
  refuses(() => G.classifyPreviewAccess({ status: 302, externalUrl: "https://teachable-art-play3.vercel.app/login" }));
  refuses(() => G.classifyPreviewAccess({ status: 302, externalUrl: "https://evil.example/login" }));
  refuses(() => G.classifyPreviewAccess({ status: 302, externalUrl: "https://vercel.com.evil.example/sso-api" }));
});
test("09B-5 · 6: exact saas-v2 Preview alias allowed · Production host · deployment URL · localhost refused", () => {
  assert.equal(G.assertPreviewBaseUrl("https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app"), G.PREVIEW_ALIAS);
  assert.equal(G.assertPreviewBaseUrl(`${G.PREVIEW_ALIAS}/login`), G.PREVIEW_ALIAS);
  for (const u of [
    "https://teachable-art-play3.vercel.app",
    "https://teachable-art-play3-soyeskids-projects.vercel.app",
    "https://teachable-art-play3-abc123xyz-soyeskids-projects.vercel.app",
    "http://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app",
    "https://localhost",
    "http://127.0.0.1:3100",
  ]) refuses(() => G.assertPreviewBaseUrl(u));
  const src = readFileSync(join(HERE, "preview_probe.mjs"), "utf8");
  assert.match(src, /assertPreviewBaseUrl\(/);
  assert.match(src, /classifyPreviewAccess\(/);
});
test("09B-7: role passwords remain redacted", () => {
  const env = {
    SOYE_STAGING_HQ_ADMIN_PASSWORD: "FAKE_TEST_ONLY_admin_pw",
    SOYE_STAGING_HQ_SALES_PASSWORD: "FAKE_TEST_ONLY_sales_pw",
    SOYE_STAGING_DIRECTOR_PASSWORD: "FAKE_TEST_ONLY_director_pw",
    SOYE_STAGING_TEACHER_PASSWORD: "FAKE_TEST_ONLY_teacher_pw",
  };
  const out = G.redact(`a=${Object.values(env).join(" b=")}`, env);
  for (const v of Object.values(env)) assert.ok(!out.includes(v), v);
  assert.deepEqual(G.secretPresence(env), { hqAdmin: "PRESENT", hqSales: "PRESENT", director: "PRESENT", teacher: "PRESENT" });
});
test("09B-8: write mode still requires session id and synthetic scope (no bypass shortcut)", async () => {
  const argv = ["--target", "staging", "--allow-staging-writes"];
  await refusesAsync(resolvePlan({ argv, env: { ...FAKE }, queryScope: neverQuery }));
  await refusesAsync(resolvePlan({ argv, env: { ...FAKE, SOYE_STAGING_E2E_SESSION_ID: SCOPE_UUID }, queryScope: async () => [{ ...OK_SCOPE, session_status: "completed" }] }));
  await refusesAsync(resolvePlan({ argv, env: { ...FAKE, SOYE_STAGING_E2E_SESSION_ID: SCOPE_UUID }, queryScope: async () => [{ ...OK_SCOPE, children_synthetic: 2 }] }));
  await refusesAsync(resolvePlan({ argv, env: { ...FAKE, SOYE_STAGING_E2E_SESSION_ID: SCOPE_UUID }, queryScope: async () => [] }));
});

// ── REVIEW 6 · synthetic scope ───────────────────────────────
const OK_SCOPE = {
  session_found: true, session_status: "scheduled", organization_id: "x", org_synthetic: true, class_synthetic: true,
  children_total: 3, children_synthetic: 3, members_total: 2, members_synthetic: 2, non_synthetic_users: 0, class_mode_write: true,
};
test("synthetic scope: accepted only when every marker holds", () => assert.equal(G.assertSyntheticScope(OK_SCOPE), true));
test("synthetic scope: each violation refused", () => {
  const cases = [
    null, { ...OK_SCOPE, session_found: false }, { ...OK_SCOPE, session_status: "completed" }, { ...OK_SCOPE, session_status: "in_progress" },
    { ...OK_SCOPE, org_synthetic: false }, { ...OK_SCOPE, class_synthetic: false }, { ...OK_SCOPE, children_synthetic: 2 },
    { ...OK_SCOPE, children_total: 0, children_synthetic: 0 }, { ...OK_SCOPE, members_synthetic: 1 }, { ...OK_SCOPE, non_synthetic_users: 1 },
    { ...OK_SCOPE, class_mode_write: false },
  ];
  for (const c of cases) refuses(() => G.assertSyntheticScope(c));
});

// ── REVIEW 4 · 9 · redaction ────────────────────────────────
test("redact: secret values · portal token fragment · token json", () => {
  const env = { SOYE_STAGING_TEACHER_PASSWORD: "FAKE_TEST_ONLY_Teacher_Value" };
  const out = G.redact(
    "pw FAKE_TEST_ONLY_Teacher_Value portal https://a/share/portal/00000000-0000-4000-8000-000000000000#AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd body {\"token\":\"AbCdEf\"}",
    env,
  );
  assert.ok(!out.includes("FAKE_TEST_ONLY_Teacher_Value"));
  assert.ok(!out.includes("AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd"));
  assert.ok(!out.includes('"token":"AbCdEf"'));
});

// ── REVIEW 8 · 10 · 11 · static isolation ───────────────────
// 탐지 패턴은 조각으로 만든다 (이 파일 자체가 secret scan 에 걸리지 않게)
const SECRET_MARKERS = new RegExp([["sb", "secret_"].join("_"), ["service", "role"].join("_"), "sk-[A-Za-z0-9]{16,}"].join("|"));
const harnessSources = readdirSync(HERE).filter((f) => f.endsWith(".mjs")).map((f) => ({ f, src: readFileSync(join(HERE, f), "utf8") }));
test("invite: harness never clicks or submits invite UI", () => {
  for (const { f, src } of harnessSources) {
    assert.ok(!/clickText\(\s*["'`][^"'`]*초대/.test(src), f);
    assert.ok(!/초대 메일 보내기|director-email|teacher-email|inviteDirector|inviteTeacher/.test(src), f);
  }
});
test("cutover isolation: harness does not reference cutover apply / rollback files or destructive CLI", () => {
  for (const { f, src } of harnessSources) {
    assert.ok(!/M3_hq_role_split_sensitive_access|M3_entitlement_write_gates\.sql|M5_legacy_write_revoke|_rollback\.sql/.test(src), f);
    assert.ok(!/db push|db reset --linked|--prod\b|vercel (deploy|env|promote|alias)/.test(src), f);
  }
});
test("artifacts: no screenshots · no HTML dump to disk · no secret literals", () => {
  for (const { f, src } of harnessSources) {
    assert.ok(!/\.screenshot\(/.test(src), f);
    assert.ok(!/writeFileSync\([^)]*(html|outerHTML)/i.test(src), f);
    assert.ok(!SECRET_MARKERS.test(src), f);
  }
});
