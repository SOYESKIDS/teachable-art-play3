// PHASE 10C — 기능 출시 audit 경로 앱 검사 (node:test · 새 npm 의존성 없음 · 정적 · 네트워크 · DB 없음)
// ---------------------------------------------------------------------
// 실행:  node --test supabase/validation/phase10c/release_controls.test.mjs
//
// DB 판정(HQ Admin 만 · 사유 · 동시성 · blocker · 직접 UPDATE 회수 · audit)은
// supabase/tests/p0_phase10c_release_controls.test.sql 이 검사한다. 이 파일은 앱이 그 경로만 쓰는지 본다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
function walk(dir) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(root, rel)).isDirectory() ? walk(rel) : /\.tsx?$/.test(name) ? [rel] : [];
  });
}

const ACTIONS = "src/app/admin/(dashboard)/products/actions.ts";
const CONTROLS = "src/app/admin/(dashboard)/products/ProductControls.tsx";
const PAGE = "src/app/admin/(dashboard)/products/page.tsx";

function releaseActionBody() {
  const src = code(ACTIONS);
  const start = src.indexOf("export async function setCapabilityReleasedAction");
  assert.ok(start >= 0, "setCapabilityReleasedAction exists");
  const next = src.indexOf("\nexport ", start + 1);
  return src.slice(start, next < 0 ? undefined : next);
}

test("setCapabilityReleasedAction uses the audited RPC with code · released · reason · expectedUpdatedAt", () => {
  const body = releaseActionBody();
  assert.match(body, /supabase\.rpc\("set_capability_release", \{/);
  for (const param of ["p_code: code", "p_released: released", "p_reason: reason", "p_expected_updated_at: expectedUpdatedAt"]) {
    assert.ok(body.includes(param), param);
  }
  assert.doesNotMatch(body, /\.from\(\s*["'`]platform_capabilities["'`]\s*\)/, "no direct table access in the release action");
  // HQ Admin 확인이 RPC 호출보다 먼저
  assert.ok(body.indexOf("requireAdmin()") >= 0 && body.indexOf("requireAdmin()") < body.indexOf('rpc("set_capability_release"'));
});

test("no app code updates platform_capabilities.is_released directly", () => {
  const offenders = walk("src").filter((file) => {
    const src = code(file);
    return /\.from\(\s*["'`]platform_capabilities["'`]\s*\)[\s\S]{0,200}?\.update\(/.test(src) || /update\(\s*\{[^}]*\bis_released\b/.test(src);
  });
  assert.deepEqual(offenders, []);
});

test("reason is required (Korean message) and expectedUpdatedAt is mandatory", () => {
  const body = releaseActionBody();
  assert.match(body, /if \(!reason\) return \{ phase: "error", message: "출시 · 미출시 변경 사유를 입력해 주세요\." \};/);
  assert.match(body, /reason\.length > 500/);
  assert.match(body, /!expectedUpdatedAt/);
  const controls = read(CONTROLS);
  assert.match(controls, /출시 · 미출시 변경 사유 \(필수\)/);
  assert.match(controls, /<textarea\s+name="reason"\s+required\s+maxLength=\{500\}/);
  assert.match(controls, /<input type="hidden" name="expectedUpdatedAt" value=\{expectedUpdatedAt\} \/>/);
  const page = read(PAGE);
  assert.match(page, /select\("code, is_released, blocked_by, note, updated_at"\)/);
  assert.match(page, /expectedUpdatedAt=\{capability\.updated_at\}/);
});

test("release UI is HQ Admin only and Sales has no release mutation", () => {
  assert.match(code(PAGE), /await requireAdmin\(\)/);
  assert.match(code("src/lib/auth/admin.ts"), /=== "sales"\) redirect\("\/sales"\)/, "Sales is redirected away from Admin");
  const salesFiles = walk("src").filter((f) => f.startsWith("src/app/sales/") || f.includes("/sales/"));
  for (const f of salesFiles) {
    const src = code(f);
    assert.doesNotMatch(src, /set_capability_release|setCapabilityReleasedAction|CapabilityToggle/, f);
  }
  const callers = walk("src").filter((f) => /set_capability_release|setCapabilityReleasedAction/.test(code(f)));
  assert.deepEqual(callers.sort(), [ACTIONS, CONTROLS].sort());
});

const errors = await import(new URL("file:///" + join(root, "src/lib/errors/rpc-errors.ts").replaceAll("\\", "/")).href);

test("capability errors map to safe Korean messages (blocker · stale · permission · raw SQL hidden)", () => {
  const FALLBACK = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  const blocked = errors.toUserFacingError({ code: "CP003", message: "정책 결정 대기 중인 기능은 출시할 수 없습니다." }, FALLBACK);
  assert.deepEqual([blocked.message, blocked.kind], ["정책 결정 대기 중인 기능은 출시할 수 없습니다.", "validation"]);
  const stale = errors.toUserFacingError({ code: "CP004", message: "다른 곳에서 먼저 변경되었습니다. 새로고침한 뒤 다시 확인해 주세요." }, FALLBACK);
  assert.equal(stale.kind, "conflict");
  assert.equal(errors.toUserFacingError({ code: "CP002", message: "기능 출시 상태는 본사 운영 관리자만 바꿀 수 있습니다." }, FALLBACK).kind, "permission");
  const denied = errors.toUserFacingError({ code: "42501", message: 'permission denied for table platform_capabilities' }, FALLBACK);
  assert.equal(denied.message, "찾을 수 없거나 접근 권한이 없습니다.");
  const raw = errors.toUserFacingError({ code: "23514", message: 'new row violates check constraint "platform_capabilities_note_check"' }, FALLBACK);
  assert.equal(raw.message, FALLBACK);
});

test("migration keeps every capability unreleased and CO-12 / AR-8 blockers in place", () => {
  const dir = "supabase/migrations";
  const file = readdirSync(join(root, dir)).find((f) => f.endsWith("_p10c_release_controls.sql"));
  assert.ok(file, "PHASE 10C migration present");
  const sql = read(`${dir}/${file}`).replace(/--.*$/gm, "");
  assert.doesNotMatch(sql, /set\s+is_released\s*=\s*true/i, "migration releases nothing");
  assert.doesNotMatch(sql, /blocked_by\s*=\s*'\{\}'/i, "migration clears no blocker");
  assert.doesNotMatch(sql, /insert\s+into\s+public\.platform_capabilities/i);
  assert.match(sql, /revoke update \(is_released\) on public\.platform_capabilities from authenticated;/);
});
