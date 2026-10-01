// PHASE 10F — Staging 콘텐츠 적용기 · UAT 전환 SQL 정적 안전 검사 (node:test · 네트워크 · DB 없음)
// ---------------------------------------------------------------------
// 실행:  node --test supabase/validation/phase10f/content_runner.test.mjs
// 실제 전환 동작(보존 · 반복 · 거부 · 되돌리기)은 supabase/tests/p0_phase10f_uat_switch.test.sql (local) 이 판정한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const R = await import(pathToFileURL(join(root, "supabase", "content", "apply_staging_content.mjs")).href);
const refuses = (fn) => assert.throws(fn, (e) => e?.name === "RefuseToRun");
const STAGING = "itcddooiuqsqingfhxkk";

test("단계 allow-list: load · publish · uat-switch → 고정 파일 3개 (임의 SQL · 파일 인자 없음)", () => {
  assert.deepEqual(Object.keys(R.STEPS), ["load", "publish", "uat-switch"]);
  assert.ok(Object.isFrozen(R.STEPS));
  for (const file of Object.values(R.STEPS)) assert.match(file, /^supabase\/content\/starter_2026_1_[a-z_]+\.sql$/);
  assert.deepEqual(R.parseArgs(["load", "--confirm-staging", STAGING]), { step: "load", dryRun: false });
  assert.deepEqual(R.parseArgs(["uat-switch", "--confirm-staging", STAGING, "--dry-run"]), { step: "uat-switch", dryRun: true });
  refuses(() => R.parseArgs(["load"]));
  refuses(() => R.parseArgs(["load", "--confirm-staging", "vpppxuhodwauaclhybtg"]));
  refuses(() => R.parseArgs(["evil.sql", "--confirm-staging", STAGING]));
  refuses(() => R.parseArgs(["load", "--confirm-staging", STAGING, "--file", "x.sql"]));
  refuses(() => R.parseArgs(["supabase/content/starter_2026_1_load.sql", "--confirm-staging", STAGING]));
});

test("load · publish = canonical 생성 결과 · uat-switch = 고정 SHA-256", async () => {
  for (const step of ["load", "publish", "uat-switch"]) {
    const p = await R.prepareStep(step);
    assert.match(p.sha256, /^[0-9a-f]{64}$/);
  }
  assert.match(R.UAT_SWITCH_SHA256, /^[0-9a-f]{64}$/);
  const sw = readFileSync(join(root, R.STEPS["uat-switch"]), "utf8");
  assert.equal(R.sha256(sw), R.UAT_SWITCH_SHA256);
  assert.equal(R.sha256(sw.replace(/\n/g, "\r\n")), R.UAT_SWITCH_SHA256, "CRLF checkout 에서도 같은 해시");
});

test("적용기: guards · 읽기 전용 runner 재사용 · db query --linked 만 · 트랜잭션 감싸기 · 재시도 없음", () => {
  const src = readFileSync(join(root, "supabase", "content", "apply_staging_content.mjs"), "utf8").replace(/^\s*\/\/.*$/gm, "");
  assert.match(src, /assertStagingProjectRef\(\)/);
  assert.match(src, /assertLinkedProjectJson\(\)/);
  assert.match(src, /preWriteGate\(\)/);
  assert.match(src, /`begin;\\n\$\{prepared\.sql\}\\ncommit;\\n`/);
  assert.match(src, /buildQueryCommand\(file\)/);
  assert.doesNotMatch(src, /db push|migration up|--db-url|db reset|vercel/i);
  assert.doesNotMatch(src, /for \(|while \(|retry/i, "no retry loops");
  // 읽기 전용 runner 의 허용 파일 · 쓰기 키워드 규칙은 바뀌지 않았다
  const guard = readFileSync(join(root, "supabase", "validation", "staging_e2e", "sql_guard.mjs"), "utf8");
  assert.match(guard, /\^supabase\\\/validation\\\/staging_e2e\\\/sql\\\/\[a-z0-9_\]\+\\\.sql\$/);
  assert.match(guard, /insert\|update\|delete/);
});

test("UAT 전환 SQL: 합성 UAT 반 · 계약 · 배정만 · 삭제 · 계약 변경 · 수업/기록 쓰기 없음 · fail closed", () => {
  const sql = readFileSync(join(root, R.STEPS["uat-switch"]), "utf8");
  const code = sql.replace(/--.*$/gm, "");
  assert.doesNotMatch(code, /\bdelete\b|\btruncate\b|\bdrop\b|\balter\b|\bgrant\b|\brevoke\b/i);
  assert.doesNotMatch(code, /update\s+public\.(contracts|organizations|classes|children|class_sessions|class_session_attendance|class_session_observations|reports|curriculum_\w+|lesson_sections)\b/i);
  assert.doesNotMatch(code, /insert\s+into\s+public\.(?!class_program_assignments)/i, "insert only into class_program_assignments");
  assert.equal((code.match(/update\s+public\.class_program_assignments/gi) ?? []).length, 1);
  assert.match(code, /set status = 'completed'\s+where id = c_old_assign and organization_id = c_org and status = 'active'/);
  assert.match(code, /email not like '%@example\.test'/, "non-synthetic users gate");
  assert.match(code, /v_contract\.status <> 'active'/, "contract must be active");
  assert.match(code, /'already_switched'/, "idempotent re-run");
  assert.match(code, /contract_readiness_internal\(c_contract\)/, "post-check readiness");
  assert.match(code, /create or replace function pg_temp\./, "temp function only");
  assert.doesNotMatch(code, /vpppxuhodwauaclhybtg/);
  assert.doesNotMatch(code, /\bbegin\s*;|\bcommit\s*;/i, "적용기가 트랜잭션을 감싼다");
});
