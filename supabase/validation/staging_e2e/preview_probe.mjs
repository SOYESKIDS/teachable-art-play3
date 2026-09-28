// PHASE 09 — Preview HTTP baseline probe (READ ONLY · GET 만)
// ---------------------------------------------------------------------
// 사용:  node supabase/validation/staging_e2e/preview_probe.mjs [--base <preview url>]
//
// · base 는 saas-v2 Preview alias 정확히 하나만 (guards.assertPreviewBaseUrl)
// · PHASE 09B: 그 alias 는 Vercel Deployment Protection Exception 으로 열려 있어야 한다. 자동화 bypass 비밀은 쓰지 않는다.
//   `/login` 이 여전히 vercel.com SSO 로 redirect 하면 app_level = BLOCKED_BY_VERCEL_DEPLOYMENT_PROTECTION 으로 멈춘다 (우회 시도 없음)
// · 앱 응답을 볼 수 있으면 /login HTML 과 JS chunk 에서 Supabase project ref 를 찾아 Staging 인지 확인한다 (아니면 REFUSE)
// · redirect 는 Preview origin 안에서만 따라간다 · 응답 본문은 저장 · 출력하지 않는다 (alert 여부 · 크기 · 시간만)

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertBundleProjectRef, assertPreviewBaseUrl, classifyPreviewAccess, PREVIEW_ALIAS, PREVIEW_BLOCKED, redact, runMain } from "./guards.mjs";

const PATHS = [
  "/login",
  "/admin/login",
  "/teacher",
  "/director",
  "/admin",
  "/sales",
  // 없는 portal · 잘못된 token (Parent 계정 없음 · token 방식)
  "/share/portal/00000000-0000-4000-8000-000000000000?t=E2E_INVALID_TOKEN_000000000000000000000000000",
];
const SECURITY_HEADERS = [
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "content-security-policy",
  "permissions-policy",
  "x-robots-tag",
];

async function get(url) {
  const chain = [];
  let current = url;
  const started = performance.now();
  for (let hop = 0; hop < 6; hop += 1) {
    const t0 = performance.now();
    const res = await fetch(current, { redirect: "manual" });
    const ttfb = Math.round(performance.now() - t0);
    const location = res.headers.get("location");
    chain.push({ status: res.status, ttfb_ms: ttfb, location: location ? redact(location).replace(/\?.*$/, "?…") : null });
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, current);
      // Preview origin 밖으로 나가면 따라가지 않는다 (SSO · 외부)
      if (next.origin !== new URL(url).origin) {
        return { chain, final: { status: res.status, externalUrl: next.href }, headers: res.headers, body: "", total_ms: Math.round(performance.now() - started) };
      }
      current = next.href;
      continue;
    }
    const body = await res.text();
    return { chain, final: { status: res.status }, headers: res.headers, body, total_ms: Math.round(performance.now() - started) };
  }
  return { chain, final: { status: "too_many_redirects" }, headers: new Headers(), body: "", total_ms: Math.round(performance.now() - started) };
}

async function main() {
  const baseArg = process.argv.indexOf("--base");
  const base = assertPreviewBaseUrl(baseArg >= 0 ? process.argv[baseArg + 1] : PREVIEW_ALIAS);
  const report = { base, results: [] };

  for (const path of PATHS) {
    const r = await get(base + path);
    const access = classifyPreviewAccess(r.final);
    const row = {
      path: path.replace(/\?t=.*/, "?t=<invalid>"),
      chain: r.chain,
      final_status: r.final.status,
      total_ms: r.total_ms,
      access,
      security_headers: Object.fromEntries(SECURITY_HEADERS.map((h) => [h, r.headers.get(h) ? "present" : "missing"])),
    };
    if (access !== PREVIEW_BLOCKED && r.body) {
      row.html_bytes = r.body.length;
      row.alert_in_initial_html = /role="alert"/.test(r.body);
      row.error_500_marker = /Application error|Internal Server Error/i.test(r.body);
    }
    report.results.push(row);
  }

  // 앱이 가리키는 Supabase project 확인 (/login 이 앱 응답일 때만)
  const login = report.results[0];
  report.preview_access = login.access;
  if (login.access !== "REACHABLE") {
    report.app_level = login.access === PREVIEW_BLOCKED ? PREVIEW_BLOCKED : `UNREACHABLE (${login.access})`;
  } else {
    const html = (await get(base + "/login")).body;
    const chunks = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]).slice(0, 40);
    const texts = [html];
    let assetsOk = 0;
    for (const c of chunks) {
      const res = await fetch(base + c, { redirect: "manual" });
      if (res.ok) assetsOk += 1;
      texts.push(await res.text());
    }
    report.static_assets = { checked: chunks.length, ok: assetsOk };
    report.bundle_supabase_project = assertBundleProjectRef(texts);
    report.app_level = "CHECKED";
  }

  console.log(redact(JSON.stringify(report, null, 1)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runMain(main);
}
