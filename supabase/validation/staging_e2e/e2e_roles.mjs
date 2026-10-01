// PHASE 09A — role E2E (CDP · 새 의존성 없음) — PRE-CUTOVER (G-2 · G-1 · M5 미적용) 기대값
// ---------------------------------------------------------------------
// 사용:
//   node supabase/validation/staging_e2e/e2e_roles.mjs --target local-rehearsal [--allow-writes --session <uuid>]
//   node supabase/validation/staging_e2e/e2e_roles.mjs --target staging [--allow-staging-writes]
//        (staging 쓰기 대상 수업은 env SOYE_STAGING_E2E_SESSION_ID 로만 · 사람이 승인한 합성 수업 1건)
//
// 기본 = 읽기 전용 (로그인 · 이동 · 화면 확인). 쓰기 단계는 아래를 **모두** 만족할 때만 (실패 시 브라우저를 띄우기 전에 REFUSE TO RUN):
//   staging: --allow-staging-writes · Supabase ref = Staging (+ CLI 대상 env 없음) · Preview alias 정확히 일치 ·
//            SOYE_STAGING_E2E_SESSION_ID (UUID) · 대상 범위가 합성(기관 · 반 · 원아 · 구성원 · DB 지문)이고 수업이 아직
//            scheduled (소비 안 됨 · e2e_target_scope.sql 읽기 전용 확인) · 교사 · 원장 비밀번호 PRESENT
//   local-rehearsal: --allow-writes · --session <uuid> · 127.0.0.1 앱 · 번들에 remote Supabase 없음
// 수업을 자동으로 고르지 않는다 (지정된 수업의 카드만 연다). 같은 수업을 다시 쓰면 scope 확인에서 거부된다 (idempotence).
// 초대(원장 · 교사) 화면은 열거나 제출하지 않는다. screenshot · HTML dump 없음. portal token 은 메모리에만.

import { launchEphemeral } from "./browser.mjs";
import {
  ACCOUNTS,
  assertBundleProjectRef,
  bundleTextsScript,
  assertLocalBaseUrl,
  assertOnOrigin,
  assertPreviewBaseUrl,
  assertStagingProjectRef,
  assertSyntheticScope,
  E2E_SESSION_ENV,
  getSecret,
  isUuid,
  isVercelSso,
  PASSWORDS_BLOCKED,
  PREVIEW_ALIAS,
  PREVIEW_BLOCKED,
  redact,
  refuse,
  runMain,
  secretPresence,
  TEST_PREFIX,
} from "./guards.mjs";

const args = process.argv.slice(2);


const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);

/** 실행 조건 판정 — 네트워크 · 브라우저 전에 끝난다 */
export async function resolvePlan({ argv = args, env = process.env, queryScope } = {}) {
  const has = (f) => argv.includes(f);
  const val = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined);
  const tgt = val("--target") ?? "staging";

  if (tgt === "local-rehearsal") {
    if (has("--allow-staging-writes")) refuse("local-rehearsal 에 staging 쓰기 flag");
    const base = assertLocalBaseUrl("http://127.0.0.1:3100");
    const { SMOKE_PASSWORD } = await import("../browser_smoke/accounts.mjs");
    const roles = {
      teacher: { email: "smoke-v2-teacher@example.test", password: SMOKE_PASSWORD },
      director: { email: "smoke-v2-director@example.test", password: SMOKE_PASSWORD },
      hqAdmin: { email: "smoke-hq-admin@example.test", password: SMOKE_PASSWORD },
      hqSales: { email: "smoke-hq-sales@example.test", password: SMOKE_PASSWORD },
      // PHASE 10B: 이전 형식(기간형) 리포트 읽기 호환 확인용 legacy 기관 계정 (local seed 에만 있음)
      legacyTeacher: { email: "smoke-legacy-teacher@example.test", password: SMOKE_PASSWORD },
      legacyDirector: { email: "smoke-legacy-director@example.test", password: SMOKE_PASSWORD },
    };
    const allowWrites = has("--allow-writes");
    const sessionId = val("--session");
    if (allowWrites && !isUuid(sessionId)) refuse("쓰기에는 --session <uuid> 가 필요하다 (자동 선택 없음)");
    return { target: tgt, base, roles, allowWrites, sessionId: sessionId ?? null, org: null, local: true };
  }

  if (tgt !== "staging") refuse(`알 수 없는 target (${tgt})`);
  if (has("--allow-writes")) refuse("staging 에는 --allow-writes 대신 --allow-staging-writes 만 쓴다");
  const base = assertPreviewBaseUrl(PREVIEW_ALIAS);
  assertStagingProjectRef({ env });
  const p = secretPresence(env);
  const allowWrites = has("--allow-staging-writes");
  const sessionId = env[E2E_SESSION_ENV] ?? "";

  if (allowWrites) {
    if (!isUuid(sessionId)) refuse(`${E2E_SESSION_ENV} (UUID) 가 필요하다 — 쓰기 대상 수업을 자동으로 고르지 않는다`);
    if (p.teacher !== "PRESENT" || p.director !== "PRESENT") refuse("쓰기 E2E 에는 교사 · 원장 비밀번호가 모두 필요하다");
  }
  if (["teacher", "director", "hqAdmin", "hqSales"].every((k) => p[k] === "MISSING")) {
    return { blocked: { target: tgt, status: PASSWORDS_BLOCKED, AUTHENTICATED_E2E: PASSWORDS_BLOCKED, passwords: p } };
  }

  let org = null;
  if (allowWrites) {
    const rows = await queryScope(sessionId);
    assertSyntheticScope(rows?.[0]);
    org = rows[0].organization_id;
  }
  const roles = Object.fromEntries(
    ["teacher", "director", "hqAdmin", "hqSales"]
      .filter((k) => p[k] === "PRESENT")
      .map((k) => [k, { email: ACCOUNTS[k], password: getSecret(k, env) }]),
  );
  return { target: tgt, base, roles, allowWrites, sessionId: isUuid(sessionId) ? sessionId : null, org, local: false };
}

async function stagingScope(sessionId) {
  const { queryReadOnly } = await import("./remote_readonly_query.mjs");
  const [res] = queryReadOnly("supabase/validation/staging_e2e/sql/e2e_target_scope.sql", { session_id: sessionId });
  if (!res || res.error) refuse(`대상 범위 확인 실패 (${res?.error ?? "no result"})`);
  return res.rows;
}

async function main() {
  const plan = await resolvePlan({ queryScope: stagingScope });
  if (plan.blocked) {
    console.log(JSON.stringify(plan.blocked));
    return;
  }
  const { base, roles, allowWrites } = plan;
  const staging = !plan.local;

  const results = [];
  const record = (role, step, status, note = "") => {
    results.push({ role, step, status, note: redact(note).slice(0, 200) });
    console.error(`${status.padEnd(7)} [${role}] ${step}${note ? ` — ${redact(note).slice(0, 160)}` : ""}`);
  };
  async function step(role, name, fn, { write = false } = {}) {
    if (write && !allowWrites) return record(role, name, "SKIP", "write step (쓰기 조건 없음)");
    try {
      const r = await fn();
      // true = PASS · "CUTOVER_PENDING: …" = 기대된 cutover 전 상태 · 그 밖의 문자열 · false · undefined = FAIL
      const status = r === true ? "PASS" : typeof r === "string" && r.startsWith("CUTOVER_PENDING") ? "CUTOVER_PENDING" : "FAIL";
      record(role, name, status, typeof r === "string" ? r : "");
      return r === true || status === "CUTOVER_PENDING";
    } catch (e) {
      if (e?.name === "RefuseToRun") throw e;
      record(role, name, "FAIL", String(e?.message ?? e));
      return false;
    }
  }

  const { page, close } = await launchEphemeral({ port: 9345 });
  const bodyHas = (text) => page.eval(`document.body.innerText.includes(${JSON.stringify(text)})`);
  const h1 = () => page.eval(`(document.querySelector('h1')?.innerText || '').trim()`);
  const path = async () => new URL(await page.url()).pathname;
  const onBase = async () => assertOnOrigin(await page.url(), base);
  const go = async (p) => {
    await page.goto(`${base}${p}`);
    await onBase();
  };
  const noAlert = async () => {
    const t = await page.eval(`[...document.querySelectorAll('[role=alert]')].map((a) => (a.innerText||'').trim()).filter(Boolean).join(' | ')`);
    return !t || `alert: ${t}`;
  };
  const noErrors = () => {
    const d = page.drain();
    const bad = d.badResponses.filter((r) => !/favicon/.test(r));
    if (d.consoleErrors.length || bad.length) return `console=${d.consoleErrors.length} bad=${bad.map((r) => r.replace(/\?.*$/, "").replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")).join(",")}`;
    return true;
  };
  async function login(role, admin = false) {
    await page.clearCookies();
    await go(admin ? "/admin/login" : "/login");
    if (!(await page.type('input[name="email"]', roles[role].email))) throw new Error("email field not found");
    if (!(await page.type('input[name="password"]', roles[role].password))) throw new Error("password field not found");
    await page.eval(`(() => { const b = document.querySelector('form button[type="submit"]'); b && b.click(); })()`);
    const left = await page.waitFor(`!location.pathname.endsWith('/login')`, 30000);
    await page.idle();
    await onBase();
    if (!left) throw new Error("login did not leave the login page");
    return path();
  }
  async function clickInDialog(text) {
    const ok = await page.eval(`(() => {
      const d = [...document.querySelectorAll('[role=dialog], dialog[open]')].pop(); if (!d) return false;
      const b = [...d.querySelectorAll('button')].find((x) => (x.innerText || '').trim() === ${JSON.stringify(text)} && !x.disabled);
      if (!b) return false; b.click(); return true; })()`);
    if (ok) await page.idle();
    return ok;
  }

  const ctx = { sessionId: plan.sessionId, org: plan.org };
  let closeInfo = {};
  try {
    // Preview 가 아직 Deployment Protection(SSO) 뒤면 우회하지 않고 멈춘다 (쓰기 전 · 로그인 전)
    await page.goto(`${base}/login`);
    if (staging && isVercelSso(await page.url())) {
      console.log(JSON.stringify({ target: plan.target, status: PREVIEW_BLOCKED }));
      return;
    }
    await onBase();
    const texts = await page.eval(bundleTextsScript());
    assertBundleProjectRef(texts, { expectLocal: !staging });

    // ── Login / auth regression (PHASE 09C) ─────────────────
    // 실패 로그인은 Auth 감사 기록을 남기므로 local-rehearsal 에서만 한다 (staging = SKIP)
    for (const [label, loginPath, knownEmail] of [
      ["staff", "/login", roles.teacher?.email],
      ["hq", "/admin/login", roles.hqAdmin?.email],
    ]) {
      await step("auth", `${label} ${loginPath}: initial render has no error alert`, async () => {
        await page.clearCookies();
        await go(loginPath);
        return noAlert();
      });
      if (!plan.local) {
        record("auth", `${label} invalid credentials`, "SKIP", "local-rehearsal only (no failed sign-in on Staging)");
        continue;
      }
      const attempt = async (email) => {
        await page.clearCookies();
        await go(loginPath);
        if (!(await page.type('input[name="email"]', email)) || !(await page.type('input[name="password"]', `${TEST_PREFIX}WRONG_${stamp}`))) return null;
        await page.eval(`document.querySelector('form button[type="submit"]').click()`);
        if (!(await page.waitFor(`!!document.querySelector('[role=alert]') && !!(document.querySelector('[role=alert]').innerText||'').trim()`, 20000))) return null;
        return page.eval(`(() => { const a = document.querySelector('[role=alert]'); const e = document.querySelector('input[name="email"]'); const p = document.querySelector('input[name="password"]');
          return { text: a.innerText.trim(), emailInvalid: e.getAttribute('aria-invalid'), pwInvalid: p.getAttribute('aria-invalid'),
            describedBy: e.getAttribute('aria-describedby') === a.id && p.getAttribute('aria-describedby') === a.id && !!a.id, path: location.pathname }; })()`);
      };
      await step("auth", `${label} invalid credentials: generic message · aria-invalid · aria-describedby · no account disclosure`, async () => {
        const unknown = await attempt(`${TEST_PREFIX.toLowerCase()}nobody_${stamp}@example.test`);
        const wrongPw = knownEmail ? await attempt(knownEmail) : unknown;
        if (!unknown || !wrongPw) return "error alert not shown";
        if (unknown.text !== wrongPw.text) return "unknown email and wrong password produce different messages";
        if (!/이메일 또는 비밀번호를 확인/.test(unknown.text)) return "message is not the generic credential message";
        if (unknown.emailInvalid !== "true" || unknown.pwInvalid !== "true" || !unknown.describedBy) return "aria-invalid / aria-describedby missing";
        return unknown.path.endsWith("/login") || `left login page (${unknown.path})`;
      });
    }

    // ── Teacher ─────────────────────────────────────────────
    if (roles.teacher) {
      await step("teacher", "login → /teacher", async () => (await login("teacher")) === "/teacher" || `landed ${await path()}`);
      await step("teacher", "today board h1 = 오늘의 수업", async () => (await h1()) === "오늘의 수업" || `h1=${await h1()}`);
      await step("teacher", "no AI UI on V2 teacher screen", async () => !(await bodyHas("AI 정리")) && !(await bodyHas("AI 초안")));
      // PHASE 10G (읽기 전용): 실제 STARTER W1 수업 카드 · 준비 화면이 canonical 콘텐츠를 보여 준다 · 종료된 STAGING-P8 예정 수업은 보드에 없다
      if (staging) {
        const { loadPackage } = await import("../../../content/starter/2026.1/build-sql.mjs");
        const w1 = loadPackage().weeks[0];
        const s1First = w1.sections.find((s) => s.code === "s1").body.split("\n")[0];
        await step("teacher", "today board: no ended STAGING-P8 scheduled session", async () => !(await bodyHas("색과 모양 놀이(가상)")) || "STAGING-P8 session still on board");
        let w1Href = null;
        await step("teacher", `today board: real STARTER W1 card (${w1.title}) with start link`, async () => {
          w1Href = await page.eval(`(() => { const a = [...document.querySelectorAll('a[href*="/teacher/sessions/"][href*="/before"]')].find((x) => (x.closest('li, article, section, div')?.innerText || '').includes(${JSON.stringify(w1.title)})); return a ? a.getAttribute('href') : null; })()`);
          return Boolean(w1Href) || "W1 card or start link not found";
        });
        if (w1Href) {
          await step("teacher", "open real W1 lesson (준비 화면 · 읽기만): canonical title · s1 · objective · no (가상)", async () => {
            await go(w1Href);
            const okTitle = await bodyHas(w1.title);
            const okS1 = await bodyHas(s1First);
            const okObjective = await bodyHas(w1.objective);
            const noSynthetic = !(await bodyHas("(가상)"));
            return (okTitle && okS1 && okObjective && noSynthetic) || `title=${okTitle} s1=${okS1} objective=${okObjective} noSynthetic=${noSynthetic}`;
          });
        }
      }
      if (ctx.sessionId) {
        await step("teacher", "target session card present on today board (no auto-pick)", async () => {
          const href = await page.eval(`(() => { const a = [...document.querySelectorAll('a[href*="/teacher/sessions/${ctx.sessionId}/before"]')][0]; return a ? a.getAttribute('href') : null; })()`);
          if (!href) return "target session card not on today board";
          const org = new URL(href, base).searchParams.get("org");
          if (ctx.org && org !== ctx.org) return "card organization differs from verified scope";
          ctx.org = org;
          ctx.beforeHref = href;
          return true;
        });
      } else record("teacher", "session flow", "SKIP", "no target session (read-only run · 자동 선택 없음)");

      if (ctx.beforeHref) {
        await step("teacher", "BEFORE: start disabled until required checks", async () => {
          await go(ctx.beforeHref);
          return page.eval(`(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.innerText||'').includes('수업 시작')); return !!b && b.disabled; })()`);
        });
        await step("teacher", "BEFORE → DURING (필수 확인 · 수업 시작)", async () => {
          if (!(await page.click('input[name="safetyConfirmed"]')) || !(await page.click('input[name="privacyConfirmed"]'))) return "required checkbox not found";
          if (!(await page.clickText("수업 시작"))) return "start button not found";
          return (await page.waitFor(`location.pathname.endsWith('/during')`, 30000)) || "did not reach DURING";
        }, { write: true });
        await step("teacher", "quick memo autosave (author)", async () => {
          if (!(await page.clickText("빠른 메모"))) return "memo toggle not found";
          if (!(await page.type("#quick-memo-body", `${TEST_PREFIX}MEMO_${stamp}`))) return "memo field not found";
          return (await page.waitFor(`document.body.innerText.includes('저장됨')`, 15000)) || "memo not saved";
        }, { write: true });
        await step("teacher", "quick memo cleanup (empty = delete)", async () => {
          const ok = await page.eval(`(() => { const t = document.querySelector('#quick-memo-body'); if (!t) return false; t.focus(); t.select(); return true; })()`);
          if (!ok) return "memo field not found";
          await page.key("Backspace", "Backspace", 8);
          await page.idle(2500);
          return (await page.waitFor(`document.body.innerText.includes('저장됨') && document.querySelector('#quick-memo-body').value === ''`, 15000)) || "memo not cleared";
        }, { write: true });
        await step("teacher", "finish (수업 마치기)", async () => {
          if (!(await page.clickText("지금 수업 마치기")) && !(await page.clickText("수업 마치기"))) return "finish button not found";
          await clickInDialog("수업 마치기");
          return (await page.waitFor(`location.pathname.endsWith('/attendance')`, 30000)) || "did not reach attendance";
        }, { write: true });
        await step("teacher", "attendance (출석 · 출결 저장)", async () => {
          const n = await page.eval(`(() => { let n = 0; for (const g of document.querySelectorAll('[role=group]')) { const b = [...g.querySelectorAll('button')].find((x) => (x.innerText||'').trim() === '출석'); if (b) { b.click(); n++; } } return n; })()`);
          if (!n) return "no attendance groups";
          if (!(await page.clickText("출결 저장"))) return "save button not found";
          await page.idle(1500);
          // A11Y-1 (PHASE 09C): 성공 문구는 role=status (polite) · 오류만 role=alert
          const saved = await page.eval(`(() => { const s = [...document.querySelectorAll('[role=status]')].find((x) => (x.innerText||'').includes('출결을 저장했습니다')); return s ? s.getAttribute('aria-live') : null; })()`);
          if (saved !== "polite") return `success message not in role=status polite (${saved})`;
          return noAlert();
        }, { write: true });
        await step("teacher", "Growth5 observation (창의적 시도 · 스스로)", async () => {
          await go(`/teacher/sessions/${ctx.sessionId}/observations?org=${ctx.org}`);
          if (!(await page.fill('textarea[id^="note-"]', `${TEST_PREFIX}OBS_${stamp} 색을 섞어 보았다`))) return "note field not found";
          if (!(await page.clickText("창의적 시도", { scope: "label", exact: false }))) return "metric label not found";
          if (!(await page.waitFor(`!!document.querySelector('[role=radiogroup][aria-label^="창의적 시도"]')`, 10000))) return "stage group not shown";
          const stage = await page.eval(`(() => { const g = document.querySelector('[role=radiogroup][aria-label^="창의적 시도"]'); const l = g && [...g.querySelectorAll('label')].find((x) => (x.innerText||'').includes('스스로')); if (!l) return false; l.click(); return true; })()`);
          if (!stage) return "stage option not found";
          await page.idle();
          if (!(await page.clickText("관찰 완료하고 다음 아이"))) return "save button not found";
          await page.idle(1500);
          return noAlert();
        }, { write: true });
        await step("teacher", "Weekly draft → edit → complete", async () => {
          await go(`/teacher/growth-reports?org=${ctx.org}`);
          if (!(await page.clickText("작성하기"))) return "no '작성하기' row";
          if (!(await page.waitFor(`location.pathname.includes('/growth-reports/weekly/')`, 30000))) return "composer not opened";
          ctx.reportPath = await path();
          if (!(await page.type("#weekly-teacher_observation", `${TEST_PREFIX}WEEKLY_${stamp} 두 색을 섞어 보았다`))) return "observation field not found";
          if (!(await page.clickText("임시저장"))) return "save draft not found";
          await page.idle(1500);
          if (!(await page.clickText("리포트 완료"))) return "complete button not found";
          await clickInDialog("리포트 완료");
          return (await page.waitFor(`document.body.innerText.includes('수정본 만들기')`, 30000)) || "not completed";
        }, { write: true });
      }
      await step("teacher", "no console errors / failed requests", async () => noErrors());
    } else record("teacher", "all", "BLOCKED", PASSWORDS_BLOCKED);

    // ── Director ────────────────────────────────────────────
    if (roles.director) {
      await step("director", "login → /director/sessions (STARTER · no dashboard)", async () => (await login("director")) === "/director/sessions" || `landed ${await path()}`);
      await step("director", "nav has no 홈 (director_dashboard)", async () =>
        !(await page.eval(`[...document.querySelectorAll('nav a')].some((a) => (a.innerText||'').trim() === '홈')`)));
      await step("director", "/director shows not-entitled (no aggregates)", async () => {
        await go("/director");
        return bodyHas("현재 이용 상품에 포함되지 않은 기능입니다.");
      });
      await step("director", "no automatic missing-record detection (STARTER)", async () => {
        for (const p of ["/director", "/director/sessions"]) {
          await go(p);
          for (const t of ["확인이 필요한 기록", "출결 기록 없음", "관찰 기록 없음"]) if (await bodyHas(t)) return `${p} shows "${t}"`;
        }
        return true;
      });
      await step("director", "no bulk print UI", async () => !(await bodyHas("일괄 인쇄")));
      await step("director", "session history h1", async () => { await go("/director/sessions/history"); return (await h1()) === "수업 이력" || `h1=${await h1()}`; });
      if (ctx.sessionId) {
        await step("director", "attendance page loads", async () => { await go(`/director/sessions/${ctx.sessionId}/attendance`); return (await path()).endsWith("/attendance"); });
        await step("director", "observation read-only", async () => { await go(`/director/sessions/${ctx.sessionId}/observations`); return bodyHas("원장은 조회만 할 수 있습니다"); });
      }
      await step("director", "completed Weekly list", async () => { await go("/director/growth-reports"); return bodyHas("주간 리포트 (완료)"); });
      await step("director", "portal page · consent select present", async () => {
        await go("/director/portal");
        return page.eval(`!!document.querySelector('select[id^="consent-"]')`);
      });
      await step("director", "issue child portal link", async () => {
        if (!(await page.clickText("링크 만들기")) && !(await page.clickText("새 링크 발급"))) return "no issue button";
        if (!(await page.waitFor(`!!document.querySelector('input[aria-label="공유 링크 주소"]')`, 20000))) return "link not shown";
        ctx.portalUrl = await page.eval(`document.querySelector('input[aria-label="공유 링크 주소"]').value`); // 메모리에만
        return /#[A-Za-z0-9_-]{43}$/.test(ctx.portalUrl) || "unexpected link shape";
      }, { write: true });
      await step("director", "no console errors / failed requests", async () => noErrors());
    } else record("director", "all", "BLOCKED", PASSWORDS_BLOCKED);

    // ── Parent Portal (계정 없음 · token 링크) ─────────────
    await step("parent", "invalid token → generic message", async () => {
      await page.clearCookies();
      await go(`/share/portal/00000000-0000-4000-8000-000000000000#${"E".repeat(43)}`);
      return page.waitFor(`document.body.innerText.includes('이 링크로는 기록을 확인할 수 없습니다.')`, 20000);
    });
    if (ctx.portalUrl) {
      // 발급된 링크의 origin 을 버리고 검증된 base 에 붙인다 (token 은 메모리에만)
      const portalPath = ctx.portalUrl.replace(/^https?:\/\/[^/]+/, "");
      const openPortal = async () => {
        await page.clearCookies();
        await go(portalPath);
        return page.waitFor(`document.body.innerText.includes('의 기록') || document.body.innerText.includes('이 링크로는')`, 20000);
      };
      await step("parent", "valid token → portal view · no photos · no raw stage codes", async () => {
        await openPortal();
        if (!(await bodyHas("의 기록"))) return "portal view not shown";
        const r = await page.eval(`({ imgs: document.querySelectorAll('main img, article img').length, raw: /\\b(together|after_modeling|independent)\\b/.test(document.body.innerText) })`);
        return (r.imgs === 0 && !r.raw) || `imgs=${r.imgs} raw_stage=${r.raw}`;
      });
      await step("parent", "latest completed report content visible", async () => (await bodyHas("교사 관찰 기록")) || "report section not shown");
      if (roles.director && ctx.reportPath) {
        const directorReport = ctx.reportPath.replace("/teacher/", "/director/");
        await step("director", "emergency hide (E2E reason)", async () => {
          await login("director");
          await go(directorReport);
          if (!(await page.clickText("학부모 화면에서 숨기기"))) return "no hide control";
          await page.clickText("기타", { scope: "label, button, option" });
          if (!(await page.type('textarea[id^="visibility-reason-"], input[id^="visibility-reason-"]', `${TEST_PREFIX}HIDE_${stamp}`))) return "reason field not found";
          if (!(await clickInDialog("숨기기"))) await page.clickText("숨기기");
          return (await page.waitFor(`document.body.innerText.includes('학부모 화면에 다시 공개')`, 20000)) || "not hidden";
        }, { write: true });
        await step("parent", "hidden report not shown in portal (empty state)", async () => {
          await openPortal();
          const empty = (await bodyHas("아직 공유된 기록이 없습니다.")) || (await bodyHas("현재 새로 공유된 기록이 없습니다."));
          if (!(empty && !(await bodyHas("교사 관찰 기록")))) return "hidden report still visible";
          // 숨김 · 미작성 · 미공개 사유를 드러내지 않는다 (generic empty state 만)
          const leak = await page.eval(`/(숨김|숨겼|비공개|사유|${TEST_PREFIX}HIDE|결석|미작성)/.test(document.body.innerText)`);
          return !leak || "portal discloses a hide / absence / not-written reason";
        }, { write: true });
        await step("director", "cleanup: unhide report", async () => {
          await login("director");
          await go(directorReport);
          if (!(await page.clickText("학부모 화면에 다시 공개"))) return "no unhide control";
          if (!(await page.type('textarea[id^="visibility-reason-"], input[id^="visibility-reason-"]', `${TEST_PREFIX}UNHIDE_${stamp}`))) return "reason field not found";
          if (!(await clickInDialog("다시 공개"))) await page.clickText("다시 공개");
          return (await page.waitFor(`document.body.innerText.includes('학부모 화면에서 숨기기')`, 20000)) || "not unhidden";
        }, { write: true });
      }
      if (roles.director) {
        await step("director", "cleanup: revoke portal link", async () => {
          await login("director");
          await go("/director/portal");
          if (!(await page.clickText("공유 링크 중지"))) return "no revoke button";
          if (!(await clickInDialog("공유 링크 중지"))) await clickInDialog("중지");
          await page.idle(1500);
          return true;
        }, { write: true });
        await step("parent", "revoked token → generic message", async () => {
          await openPortal();
          return (await bodyHas("이 링크로는 기록을 확인할 수 없습니다.")) || "revoked link still shows records";
        }, { write: true });
      }
      ctx.portalUrl = null;
    } else record("parent", "valid / hidden / revoked token", "SKIP", "portal link not issued (쓰기 조건 없음)");

    // ── Legacy READ 호환 (PHASE 10B · local-rehearsal 만 · 읽기만) ─────
    // M5 는 legacy 쓰기를 회수하고 조회는 유지한다 → 이전 형식 리포트는 교사 · 원장 모두 읽기 전용으로 열려야 한다.
    const openLegacyReport = async (listPath, detailPrefix) => {
      await go(listPath);
      const href = await page.eval(`(() => { const a = [...document.querySelectorAll('a[href^="${detailPrefix}"]')].find((x) => /\\/growth-reports\\/[0-9a-f-]{36}(\\?|$)/.test(x.getAttribute('href'))); return a ? a.getAttribute('href') : null; })()`);
      if (!href) return "legacy report link not found";
      await go(href);
      return true;
    };
    const legacyWriteUi = () => page.eval(`(() => {
      const labels = [...document.querySelectorAll('button')].map((b) => (b.innerText || '').trim());
      return { textareas: document.querySelectorAll('main textarea').length,
               writeButtons: labels.filter((l) => /작성완료|임시저장|AI|링크 만들기|새 링크 발급/.test(l)) };
    })()`);
    if (roles.legacyTeacher) {
      await step("legacyTeacher", "legacy report READ: detail opens read-only (no editor · no AI · no save)", async () => {
        await login("legacyTeacher");
        const opened = await openLegacyReport("/teacher/growth-reports", "/teacher/growth-reports/");
        if (opened !== true) return opened;
        if (!(await bodyHas("이전 형식의 리포트입니다"))) return "read-only notice not shown";
        if (!(await bodyHas("가상 변화"))) return "legacy report content not shown";
        const ui = await legacyWriteUi();
        return (ui.textareas === 0 && ui.writeButtons.length === 0) || `write UI present: textareas=${ui.textareas} buttons=${ui.writeButtons.join("|")}`;
      });
    }
    if (roles.legacyDirector) {
      await step("legacyDirector", "legacy report READ: detail opens · share section has no new-link issuing", async () => {
        await login("legacyDirector");
        const opened = await openLegacyReport("/director/growth-reports", "/director/growth-reports/");
        if (opened !== true) return opened;
        if (!(await bodyHas("가상 변화"))) return "legacy report content not shown";
        if (!(await bodyHas("학부모 공유 (이전 형식)"))) return "legacy share section not shown";
        const ui = await legacyWriteUi();
        return (ui.textareas === 0 && ui.writeButtons.length === 0) || `write UI present: textareas=${ui.textareas} buttons=${ui.writeButtons.join("|")}`;
      });
    }

    // ── HQ Admin (읽기 · 초대 화면 열지 않음) ────────────────
    if (roles.hqAdmin) {
      await step("hqAdmin", "login → /admin/leads", async () => (await login("hqAdmin", true)) === "/admin/leads" || `landed ${await path()}`);
      for (const [name, p] of [
        ["organization list", "/admin/organizations"],
        ["readiness", "/admin/readiness"],
        ["products · capabilities", "/admin/products"],
      ]) {
        await step("hqAdmin", name, async () => { await go(p); return ((await path()) === p && (await h1()).length > 0) || `path=${await path()} h1=${await h1()}`; });
      }
      // PHASE 10C: 출시 dialog 는 사유(필수) · 동시성 값을 받는다 — 열어서 확인만 하고 제출하지 않는다 (쓰기 없음)
      await step("hqAdmin", "capability release dialog asks for a reason (opened · not submitted)", async () => {
        await go("/admin/products");
        const r = await page.eval(`(async () => {
          const b = [...document.querySelectorAll('section[aria-labelledby="capability-title"] button')].find((x) => x.textContent.trim() === "출시");
          if (!b) return "no release button";
          b.click();
          await new Promise((res) => setTimeout(res, 300));
          const d = document.querySelector('[role="dialog"]');
          const t = d && d.querySelector('textarea[name="reason"]');
          const h = d && d.querySelector('input[type="hidden"][name="expectedUpdatedAt"]');
          const cancel = d && [...d.querySelectorAll('button')].find((x) => x.textContent.trim() === "취소");
          const ok = Boolean(t && t.required && h && h.value);
          if (cancel) cancel.click();
          return ok ? "ok" : "reason field or expectedUpdatedAt missing";
        })()`);
        return r === "ok" || r;
      });
      await step("hqAdmin", "organization detail (first)", async () => {
        await go("/admin/organizations");
        const href = await page.eval(`(() => { const a = [...document.querySelectorAll('a[href^="/admin/organizations/"]')].find((x) => /\\/admin\\/organizations\\/[0-9a-f-]{36}$/.test(x.getAttribute('href'))); return a ? a.getAttribute('href') : null; })()`);
        if (!href) return "no org link";
        await go(href);
        return (await path()) === href;
      });
      await step("hqAdmin", "no console errors / failed requests", async () => noErrors());
    } else record("hqAdmin", "all", "BLOCKED", PASSWORDS_BLOCKED);

    // ── HQ Sales PRE-G2 (읽기만 · 넓은 권한은 CUTOVER PENDING 으로 기록) ──
    if (roles.hqSales) {
      await step("hqSales", "login → /sales/leads", async () => (await login("hqSales", true)) === "/sales/leads" || `landed ${await path()}`);
      await step("hqSales", "/sales/organizations commercial summary (no child names column)", async () => {
        await go("/sales/organizations");
        return ((await bodyHas("원아 수")) && (await bodyHas("계약 상태"))) || "summary table not shown";
      });
      await step("hqSales", "PRE-G2: /admin/organizations reachable (target = redirect to /sales)", async () => {
        await go("/admin/organizations");
        const p = await path();
        return p.startsWith("/admin") ? "CUTOVER_PENDING: sales can open /admin before G-2" : p.startsWith("/sales") ? true : `landed ${p}`;
      });
    } else record("hqSales", "all", "BLOCKED", PASSWORDS_BLOCKED);
  } finally {
    closeInfo = await close();
  }

  const summary = results.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {});
  console.log(redact(JSON.stringify({ target: plan.target, allowWrites, summary, browserProfileRemoved: closeInfo.profileRemoved, results }, null, 1)));
  if (summary.FAIL) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith("e2e_roles.mjs")) {
  await runMain(main);
}
