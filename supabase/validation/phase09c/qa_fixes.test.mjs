// PHASE 09C — QA 수정 회귀 검사 (node:test · 새 npm 의존성 없음 · 정적 · 네트워크 · DB 없음)
// ---------------------------------------------------------------------
// 실행:  node --test supabase/validation/phase09c/qa_fixes.test.mjs
//
// 브라우저 확인은 supabase/validation/staging_e2e/e2e_roles.mjs (local-rehearsal) 가 한다:
//   출결 성공 문구 role=status · 로그인 오류 aria · 원장 STARTER 누락 자동 탐지 없음 · Parent 사유 비노출.
// 이 파일은 같은 규칙이 소스에서 되돌아가지 않았는지 빠르게 본다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");
function walk(dir) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(root, rel)).isDirectory() ? walk(rel) : /\.tsx?$/.test(name) ? [rel] : [];
  });
}

// ── A11Y-1 ──────────────────────────────────────────────────
test("A11Y-1: attendance success = role=status (polite) · error = role=alert", () => {
  const src = read("src/components/staff/AttendanceEditor.tsx");
  assert.match(src, /role=\{state\.phase === "error" \? "alert" : "status"\}/);
  assert.match(src, /aria-live=\{state\.phase === "error" \? "assertive" : "polite"\}/);
  assert.doesNotMatch(src, /role="alert"/, "no unconditional alert");
});

// ── A11Y-2 ──────────────────────────────────────────────────
test("A11Y-2: HQ nav · filter bars · dialog buttons keep 44px targets", () => {
  assert.match(read("src/app/admin/(dashboard)/AdminNav.tsx"), /"inline-flex min-h-11 items-center px-3"/);
  for (const f of ["src/app/admin/(dashboard)/leads/LeadFilterBar.tsx", "src/app/admin/(dashboard)/organizations/OrganizationFilterBar.tsx"]) {
    const src = read(f);
    assert.doesNotMatch(src, /"h-10 /, `${f}: h-10 control`);
    assert.match(src, /inline-flex min-h-11 (min-w-11 )?items-center (justify-center )?text-\[12px\]/, `${f}: reset link`);
  }
  for (const f of [...walk("src/app/admin"), "src/components/admin/AdminOperationsDashboard.tsx"]) {
    const src = read(f);
    assert.doesNotMatch(src, /"rounded-lg bg-navy px-4 py-2\.5 text-\[13px\]/, `${f}: primary button without min-h-11`);
    assert.doesNotMatch(src, /(className="|link: ")text-\[13px\] font-semibold text-trust-blue transition-opacity/, `${f}: text action without min-h-11`);
  }
});

// ── PERF-1 ──────────────────────────────────────────────────
test("PERF-1: director portal list is bounded and reports truncation", () => {
  const q = read("src/lib/staff/director-report-queries.ts");
  assert.match(q, /export const MAX_PORTAL_CHILDREN = 500;/);
  assert.match(q, /\.limit\(MAX_PORTAL_CHILDREN \+ 1\)/);
  assert.match(q, /truncated: children\.length > MAX_PORTAL_CHILDREN/);
  assert.match(q, /children\.slice\(0, MAX_PORTAL_CHILDREN\)/);
  assert.match(read("src/app/director/portal/page.tsx"), /rows\.truncated \?/);
});

// ── Login / auth ────────────────────────────────────────────
test("login: staff and HQ forms mark fields invalid and describe them by the error", () => {
  for (const f of ["src/components/auth/StaffLoginForm.tsx", "src/app/admin/login/LoginForm.tsx"]) {
    const src = read(f);
    assert.equal((src.match(/aria-invalid=\{message \? true : undefined\}/g) ?? []).length, 2, `${f}: aria-invalid`);
    assert.equal((src.match(/aria-describedby=\{message \? errorId : undefined\}/g) ?? []).length, 2, `${f}: aria-describedby`);
    assert.match(src, /id=\{errorId\}\s+role="alert"/, `${f}: error element id`);
  }
});
test("login: unknown email and wrong password share one generic message (no account disclosure)", () => {
  for (const f of ["src/app/login/actions.ts", "src/app/admin/login/actions.ts"]) {
    const src = read(f);
    const input = src.match(/invalidInput: "([^"]+)"/)?.[1];
    const creds = src.match(/invalidCredentials: "([^"]+)"/)?.[1];
    assert.ok(input && creds, f);
    assert.equal(input, creds, `${f}: messages differ`);
    assert.equal(creds, "이메일 또는 비밀번호를 확인해주세요.", f);
  }
});
