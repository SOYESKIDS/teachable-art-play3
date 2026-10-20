/**
 * 공개 체험과 실제 SaaS 의 분리 검사 (정적).
 *
 * ★ /experience · 새 홈 · 체험 데이터 · 체험 컴포넌트에서 시작하는 import 그래프를
 *   끝까지 따라가, 그 안에 Supabase · 인증 · 업무(staff/admin/director) · 공유 토큰 ·
 *   서버 전용 모듈이 하나도 없는지 본다.
 * ★ 예외는 하나 — 기존 공개 상담 폼(src/components/forms/**). 이미 공개 홈에 있던 경로이고,
 *   anon INSERT 전용 RLS · 쓰기 가드 · 동의 검증을 그대로 쓴다. 이 폴더 안으로는 따라가지 않는다.
 * ★ Proxy matcher 가 보호 경로를 그대로 지키고 /experience 를 끼워 넣지 않았는지 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

const ENTRIES = [
  "src/app/page.tsx",
  "src/app/experience",
  "src/components/play",
  "src/data/experience",
];

const ALLOWED_BOUNDARY = [join(SRC, "components", "forms")];

const FORBIDDEN = [
  /@supabase\//,
  /["']@\/lib\/supabase/,
  /["']@\/lib\/auth/,
  /["']@\/lib\/staff/,
  /["']@\/lib\/admin/,
  /["']@\/lib\/share/,
  /["']@\/lib\/entitlement/,
  /["']@\/lib\/env\/write-guard/,
  /["']server-only["']/,
  /["']next\/headers["']/,
];

function walk(p) {
  const abs = join(ROOT, p);
  if (statSync(abs).isFile()) return [abs];
  return readdirSync(abs, { recursive: true })
    .map((f) => join(abs, f))
    .filter((f) => /\.(ts|tsx)$/.test(f) && statSync(f).isFile());
}

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null;
  for (const c of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + c) && statSync(base + c).isFile()) return base + c;
  }
  return null;
}

function graph() {
  const seen = new Map();
  const queue = ENTRIES.flatMap(walk);
  while (queue.length) {
    const f = queue.pop();
    if (seen.has(f)) continue;
    const code = readFileSync(f, "utf8");
    seen.set(f, code);
    if (ALLOWED_BOUNDARY.some((b) => f.startsWith(b))) continue;
    for (const m of code.matchAll(/(?:import|export)[^"']*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)) {
      const next = resolveImport(f, m[1] ?? m[2]);
      if (next) queue.push(next);
    }
  }
  return seen;
}

test("체험 · 새 홈의 import 그래프에 Supabase · 인증 · 업무 · 공유 · 서버 전용 모듈이 없다", () => {
  const files = graph();
  assert.ok(files.size > 20, `그래프가 너무 작다 (${files.size})`);
  const hits = [];
  for (const [f, code] of files) {
    if (ALLOWED_BOUNDARY.some((b) => f.startsWith(b))) continue;
    for (const re of FORBIDDEN) if (re.test(code)) hits.push(`${relative(ROOT, f)} ← ${re}`);
    if (/^\s*["']use server["']/m.test(code)) hits.push(`${relative(ROOT, f)} ← "use server"`);
  }
  assert.deepEqual(hits, []);
});

test("체험 데이터 · 컴포넌트는 fetch · 쿠키 · 서버 저장소를 쓰지 않는다", () => {
  for (const f of ENTRIES.flatMap(walk)) {
    const code = readFileSync(f, "utf8");
    assert.ok(!/\bfetch\s*\(/.test(code), `${relative(ROOT, f)} fetch`);
    assert.ok(!/document\.cookie|cookies\(\)/.test(code), `${relative(ROOT, f)} cookie`);
    assert.ok(!/localStorage/.test(code), `${relative(ROOT, f)} localStorage (체험 상태는 sessionStorage 탭 한정)`);
  }
});

test("동적 체험 페이지는 1~24 만 빌드하고 그 밖의 번호는 404 다", () => {
  for (const p of ["src/app/experience/weeks/[weekNo]/page.tsx", "src/app/experience/classroom/[weekNo]/page.tsx"]) {
    const code = readFileSync(join(ROOT, p), "utf8");
    assert.match(code, /export const dynamicParams = false/, p);
    assert.match(code, /export function generateStaticParams/, p);
    assert.match(code, /notFound\(\)/, p);
  }
});

test("Proxy 보호 경로는 그대로이고 /experience 는 들어가지 않는다", () => {
  const code = readFileSync(join(SRC, "proxy.ts"), "utf8");
  const matcher = code.match(/matcher:\s*\[([^\]]*)\]/)[1];
  for (const p of ["/admin/:path*", "/sales/:path*", "/director/:path*", "/teacher/:path*", "/learning/:path*"]) {
    assert.ok(matcher.includes(`"${p}"`), p);
  }
  assert.ok(!matcher.includes("/experience"));
});
