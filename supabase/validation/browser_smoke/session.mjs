// LOCAL ONLY — smoke 공용 helper (로그인 · 결과 기록)
import { SMOKE_PASSWORD } from "./accounts.mjs";

export const BASE = "http://127.0.0.1:3100";

export async function login(page, email, { admin = false } = {}) {
  await page.clearCookies();
  await page.goto(`${BASE}${admin ? "/admin/login" : "/login"}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', SMOKE_PASSWORD);
  await page.eval(`(() => { const b = document.querySelector('form button[type="submit"]'); b && b.click(); })()`);
  await page.waitFor(`!location.pathname.endsWith('/login')`, 20000);
  await page.idle();
  return page.url();
}

export function recorder() {
  const rows = [];
  return {
    check(area, name, ok, note = "") {
      rows.push({ area, name, ok: Boolean(ok), note });
      console.log(`${ok ? "PASS" : "FAIL"}  [${area}] ${name}${note ? `  — ${note}` : ""}`);
    },
    rows,
    summary() {
      const failed = rows.filter((r) => !r.ok).length;
      console.log(`\n${rows.length - failed}/${rows.length} PASS`);
      return failed;
    },
  };
}
