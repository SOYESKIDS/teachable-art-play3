// PHASE 09A — responsive · accessibility · runtime baseline (CDP · 새 의존성 없음 · 읽기 전용)
// ---------------------------------------------------------------------
// 사용:
//   node supabase/validation/staging_e2e/ui_audit.mjs --target staging            (Preview · 비밀 필요)
//   node supabase/validation/staging_e2e/ui_audit.mjs --target local-rehearsal    (127.0.0.1:3100 · harness 자체 검증)
//
// · staging: Supabase ref = Staging · Preview alias 정확히 일치 · 앱 번들 Supabase ref = Staging ·
//            bypass 비밀 없음 (alias 는 Deployment Protection Exception) · 처음 /login 이 SSO 면 BLOCKED_BY_VERCEL_DEPLOYMENT_PROTECTION ·
//            이동할 때마다 origin 재확인 (SSO · 다른 host 로 가면 REFUSE) ·
//            역할 비밀번호는 env 만 · 없으면 로그인 화면만 점검하고 인증 화면 = BLOCKED_PENDING_LOCAL_PASSWORDS
// · 읽기만 한다 (로그인 · 화면 이동 · 측정). 쓰기 흐름은 e2e_roles.mjs.
// · 결과에 화면 본문 · 아동 이름 · screenshot 없음 (개수 · 크기 · 위반 목록만) · 임시 브라우저 profile 은 종료 시 삭제

import { launchEphemeral } from "./browser.mjs";
import {
  ACCOUNTS,
  assertBundleProjectRef,
  bundleTextsScript,
  assertLocalBaseUrl,
  assertOnOrigin,
  assertPreviewBaseUrl,
  assertStagingProjectRef,
  getSecret,
  isVercelSso,
  PASSWORDS_BLOCKED,
  PREVIEW_ALIAS,
  PREVIEW_BLOCKED,
  redact,
  refuse,
  runMain,
  secretPresence,
} from "./guards.mjs";

const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768, mobile: false },
  { name: "tablet", width: 768, height: 1024, mobile: true },
  { name: "mobile", width: 390, height: 844, mobile: true },
];

const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth;
  const overflowX = document.documentElement.scrollWidth - vw;
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const offenders = [...document.querySelectorAll('body *')].filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1 && getComputedStyle(el).position !== 'fixed').slice(0, 5)
    .map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''));
  const controls = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button]')].filter(visible);
  const small = controls.filter((el) => { const r = el.getBoundingClientRect(); return (r.width < 44 || r.height < 44) && !el.closest('p, li span'); })
    .map((el) => el.tagName.toLowerCase() + ':' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height));
  const inputs = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')];
  const unlabeled = inputs.filter((el) => !(el.labels && el.labels.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map((el) => el.name || el.id || el.type);
  const buttonsNoName = [...document.querySelectorAll('button, [role=button]')].filter((el) => visible(el) && !(el.innerText || '').trim() && !el.getAttribute('aria-label')).length;
  const imgsNoAlt = [...document.querySelectorAll('img')].filter((el) => !el.hasAttribute('alt')).length;
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]));
  let skip = 0; for (let i = 1; i < headings.length; i++) if (headings[i] - headings[i - 1] > 1) skip++;
  const alerts = [...document.querySelectorAll('[role=alert]')].filter((el) => visible(el) && (el.innerText || '').trim()).length;
  return {
    overflowX, offenders, controls: controls.length, smallTargets: small.length, smallTargetSamples: small.slice(0, 5),
    unlabeledInputs: unlabeled, buttonsWithoutName: buttonsNoName, imgsWithoutAlt: imgsNoAlt,
    h1: headings.filter((h) => h === 1).length, headingSkips: skip, visibleAlerts: alerts,
    lang: document.documentElement.lang || null,
    domNodes: document.getElementsByTagName('*').length,
  };
})()`;

// Tab 으로 처음 몇 개 요소를 돌며 focus 표시가 보이는지 (outline · box-shadow)
const FOCUS = `(() => {
  const el = document.activeElement; if (!el || el === document.body) return null;
  const s = getComputedStyle(el);
  const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
  return { tag: el.tagName.toLowerCase(), visibleFocus: visible };
})()`;

async function main() {
  const args = process.argv.slice(2);
  const target = args.includes("--target") ? args[args.indexOf("--target") + 1] : "staging";
  let base;
  let roles;
  if (target === "local-rehearsal") {
    base = assertLocalBaseUrl("http://127.0.0.1:3100");
    const { SMOKE_PASSWORD } = await import("../browser_smoke/accounts.mjs");
    roles = {
      teacher: { email: "smoke-v2-teacher@example.test", password: SMOKE_PASSWORD, admin: false },
      director: { email: "smoke-v2-director@example.test", password: SMOKE_PASSWORD, admin: false },
      hqAdmin: { email: "smoke-hq-admin@example.test", password: SMOKE_PASSWORD, admin: true },
    };
  } else if (target === "staging") {
    base = assertPreviewBaseUrl(PREVIEW_ALIAS);
    assertStagingProjectRef();
    const p = secretPresence();
    roles = Object.fromEntries(
      ["teacher", "director", "hqAdmin", "hqSales"]
        .filter((k) => p[k] === "PRESENT")
        .map((k) => [k, { email: ACCOUNTS[k], password: getSecret(k), admin: k === "hqAdmin" || k === "hqSales" }]),
    );
  } else {
    refuse(`알 수 없는 target (${target})`);
  }
  const staging = target === "staging";

  const { page, close } = await launchEphemeral({ port: 9344 });
  const onBase = async () => assertOnOrigin(await page.url(), base);
  const go = async (p) => {
    await page.goto(`${base}${p}`);
    await onBase();
  };
  const login = async (role) => {
    await page.clearCookies();
    await go(role.admin ? "/admin/login" : "/login");
    if (!(await page.type('input[name="email"]', role.email)) || !(await page.type('input[name="password"]', role.password))) {
      throw new Error("login fields not found");
    }
    await page.eval(`(() => { const b = document.querySelector('form button[type="submit"]'); b && b.click(); })()`);
    if (!(await page.waitFor(`!location.pathname.endsWith('/login')`, 30000))) throw new Error("login did not leave the login page");
    await page.idle();
    await onBase();
    return new URL(await page.url()).pathname;
  };
  const focusCheck = async () => {
    const seen = [];
    for (let i = 0; i < 6; i += 1) {
      await page.key("Tab", "Tab", 9);
      const r = await page.eval(FOCUS);
      if (r) seen.push(r);
    }
    return { tabbed: seen.length, withoutVisibleFocus: seen.filter((s) => !s.visibleFocus).map((s) => s.tag) };
  };

  const out = { target, base, passwords: secretPresence(), pages: [] };
  if (staging && Object.keys(roles).length === 0) out.AUTHENTICATED_E2E = PASSWORDS_BLOCKED;
  let closeInfo = {};
  try {
    await page.goto(`${base}/login`);
    if (staging && isVercelSso(await page.url())) {
      console.log(JSON.stringify({ target, base, status: PREVIEW_BLOCKED }));
      return;
    }
    await onBase();
    const texts = await page.eval(bundleTextsScript());
    out.bundle_supabase_project = assertBundleProjectRef(texts, { expectLocal: !staging });

    const targets = [{ key: "login", role: null, path: "/login" }];
    if (roles.teacher) targets.push({ key: "teacher_today", role: "teacher" });
    if (roles.director) targets.push({ key: "director_landing", role: "director" });
    if (roles.hqAdmin) targets.push({ key: "hq_organizations", role: "hqAdmin", path: "/admin/organizations" });
    // PHASE 10G (읽기 전용 GET): 교사 W1 수업 준비 화면(보드의 W1 링크에서 찾음) · HQ Sales 기관 화면
    if (roles.teacher && staging) targets.push({ key: "teacher_w1_lesson", role: "teacher", resolve: "w1_before" });
    if (roles.hqSales) targets.push({ key: "hq_sales_organizations", role: "hqSales", path: "/sales/organizations" });

    for (const t of targets) {
      let landing = t.path ?? null;
      if (t.role) {
        landing = await login(roles[t.role]);
        if (t.path) landing = t.path;
        if (t.resolve === "w1_before") {
          const { loadPackage } = await import("../../../content/starter/2026.1/build-sql.mjs");
          const title = loadPackage().weeks[0].title;
          const href = await page.eval(`(() => { const a = [...document.querySelectorAll('a[href*="/teacher/sessions/"][href*="/before"]')].find((x) => { for (let el = x.parentElement; el && el !== document.body; el = el.parentElement) { if ((el.innerText || '').includes(${JSON.stringify(title)})) return el.querySelectorAll('a[href*="/before"]').length === 1; } return false; }); return a ? a.getAttribute('href') : null; })()`);
          if (!href) {
            out.pages.push({ page: t.key, error: "W1 lesson link not found on teacher board" });
            continue;
          }
          landing = href;
        }
      } else {
        await page.clearCookies();
      }
      for (const vp of VIEWPORTS) {
        await page.viewport(vp.width, vp.height, vp.mobile);
        page.drain();
        const t0 = Date.now();
        await go(landing);
        const loadMs = Date.now() - t0;
        const audit = await page.eval(AUDIT);
        const focus = vp.name === "desktop" ? await focusCheck() : undefined;
        const errs = page.drain();
        out.pages.push({
          page: t.key,
          path: landing,
          viewport: vp.name,
          load_ms: loadMs,
          requests: page.requests.length,
          console_errors: errs.consoleErrors.length,
          bad_responses: errs.badResponses.map((r) => r.replace(/\?.*$/, "").replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")),
          ...audit,
          focus,
        });
        page.requests.length = 0;
      }
    }
  } finally {
    closeInfo = await close();
  }
  out.browserProfileRemoved = closeInfo.profileRemoved;
  console.log(redact(JSON.stringify(out, null, 1)));
}

await runMain(main);
