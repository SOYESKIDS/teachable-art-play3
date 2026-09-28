// PHASE 09A — Preview HTTP baseline probe (READ ONLY · GET 만)
// ---------------------------------------------------------------------
// 사용:  node supabase/validation/staging_e2e/preview_probe.mjs [--base <preview url>]
//
// · base 는 saas-v2 Preview alias 또는 그 Preview deployment URL 만 (guards.assertPreviewBaseUrl)
// · Vercel Deployment Protection(SSO) 이 켜져 있으면 앱 응답을 볼 수 없다:
//     SOYE_STAGING_VERCEL_BYPASS (Vercel "Protection Bypass for Automation" 값) 가 있으면 그 값을 요청 header 로
//     Preview origin 에만 보낸다 (제3자 · Supabase 로 보내지 않는다 · 출력하지 않는다)
//     없으면 edge 수준(상태 · redirect · 보안 header · 응답 시간)만 기록하고 앱 수준 점검은
//     BLOCKED_PENDING_LOCAL_SECRETS 로 표시한다
// · bypass 가 있으면 /login HTML 과 JS chunk 에서 Supabase project ref 를 찾아 Staging 인지 확인한다 (아니면 REFUSE)
// · 응답 본문은 저장 · 출력하지 않는다 (alert 여부 · 크기 · 시간만)

import { assertBundleProjectRef, assertPreviewBaseUrl, getSecret, PREVIEW_ALIAS, redact, runMain, secretPresence } from "./guards.mjs";

await runMain(async () => {
const baseArg = process.argv.indexOf("--base");
const base = assertPreviewBaseUrl(baseArg >= 0 ? process.argv[baseArg + 1] : PREVIEW_ALIAS);
const bypass = getSecret("vercelBypass");
const presence = secretPresence();

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
  const headers = bypass ? { "x-vercel-protection-bypass": bypass } : {};
  const chain = [];
  let current = url;
  const started = performance.now();
  for (let hop = 0; hop < 6; hop += 1) {
    const t0 = performance.now();
    const res = await fetch(current, { redirect: "manual", headers });
    const ttfb = Math.round(performance.now() - t0);
    const location = res.headers.get("location");
    chain.push({ status: res.status, ttfb_ms: ttfb, location: location ? redact(location).replace(/nonce=[^&]+/, "nonce=…") : null });
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, current);
      // Preview origin 밖으로 나가면 따라가지 않는다 (SSO · 외부)
      if (next.origin !== new URL(url).origin) {
        return { chain, final: { status: res.status, external: next.host }, headers: res.headers, body: "", total_ms: Math.round(performance.now() - started) };
      }
      current = next.href;
      continue;
    }
    const body = await res.text();
    return { chain, final: { status: res.status }, headers: res.headers, body, total_ms: Math.round(performance.now() - started) };
  }
  return { chain, final: { status: "too_many_redirects" }, headers: new Headers(), body: "", total_ms: Math.round(performance.now() - started) };
}

const report = { base, secrets: presence, bypass_used: Boolean(bypass), results: [] };

for (const path of PATHS) {
  const r = await get(base + path);
  const sso = r.final.external === "vercel.com";
  const row = {
    path: path.replace(/\?t=.*/, "?t=<invalid>"),
    chain: r.chain,
    final_status: r.final.status,
    total_ms: r.total_ms,
    deployment_protection_sso: sso,
    security_headers: Object.fromEntries(SECURITY_HEADERS.map((h) => [h, r.headers.get(h) ? "present" : "missing"])),
  };
  if (!sso && r.body) {
    row.html_bytes = r.body.length;
    row.alert_in_initial_html = /role="alert"/.test(r.body);
    row.error_500_marker = /Application error|Internal Server Error/i.test(r.body);
  }
  report.results.push(row);
}

// 앱이 가리키는 Supabase project 확인 (bypass 로 앱 응답을 볼 수 있을 때만)
const login = report.results[0];
if (login.deployment_protection_sso) {
  report.app_level = "BLOCKED_PENDING_LOCAL_SECRETS (Vercel Deployment Protection · SOYE_STAGING_VERCEL_BYPASS MISSING)";
} else {
  const html = (await get(base + "/login")).body;
  const chunks = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]).slice(0, 40);
  const texts = [html];
  let assetsOk = 0;
  for (const c of chunks) {
    const res = await fetch(base + c, { headers: bypass ? { "x-vercel-protection-bypass": bypass } : {} });
    if (res.ok) assetsOk += 1;
    texts.push(await res.text());
  }
  report.static_assets = { checked: chunks.length, ok: assetsOk };
  report.bundle_supabase_project = assertBundleProjectRef(texts);
  report.app_level = "CHECKED";
}

console.log(redact(JSON.stringify(report, null, 1)));
});
