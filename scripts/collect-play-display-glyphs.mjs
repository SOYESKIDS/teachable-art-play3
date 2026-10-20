/**
 * 공개 체험 화면에서 둥근 제목 글꼴(TAP Play Display)로 실제 그려진 글자를 모은다.
 *
 *   npx next build && npx next start -p 3121
 *   node scripts/collect-play-display-glyphs.mjs http://localhost:3121
 *   python scripts/subset-play-fonts.py <Jua-Regular.ttf>
 *
 * ★ 홈 · 체험 안내 · 24주 안내 · 성장 리포트 · 24주 교실 플레이어(모든 단계 · 화면 구성 · 시트 · 완료)를
 *   390 · 1440 폭에서 돈다. 결과: src/fonts/play/display-glyphs.txt (기존 목록과 합친다 — 글자가 줄지 않는다)
 * ★ 읽기만 한다. 체험 화면은 서버에 아무것도 쓰지 않는다 (상담 폼은 열기만 하고 보내지 않는다).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { launch } = await import(pathToFileURL(join(ROOT, "supabase/validation/browser_smoke/cdp.mjs")).href);
const base = process.argv[2] ?? "http://localhost:3121";
const { page, close } = await launch({ port: 9391 });
// cdp.mjs 의 inflight 계수가 어긋나면 idle 이 매번 timeout 까지 기다린다 → 짧은 고정 대기로 대체
page.idle = (ms = 300) => new Promise((r) => setTimeout(r, Math.min(ms, 600)));
const COLLECT = `(()=>{const r={};const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
while((n=w.nextNode())){const el=n.parentElement;if(!el||/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName))continue;const ff=getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/["']/g,'');(r[ff]??=new Set());for(const c of n.textContent)r[ff].add(c);}
for(const el of document.querySelectorAll('input,textarea,select,option,button')){const ff=getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/["']/g,'');(r[ff]??=new Set());for(const c of (el.placeholder||'')+(el.value||''))r[ff].add(c);}
return Object.fromEntries(Object.entries(r).map(([k,v])=>[k,[...v].join('')]));})()`;
const acc = {};
const add = async () => { const r = await page.eval(COLLECT); for (const [k, v] of Object.entries(r)) { acc[k] ??= new Set(); for (const c of v) acc[k].add(c); } };
const routes = ["/", "/experience", "/experience/weeks", "/experience/report"];
for (let n = 1; n <= 24; n++) routes.push(`/experience/weeks/${n}`, `/experience/classroom/${n}`);
for (const w of [390, 1440]) {
  await page.viewport(w, 900, w < 768);
  for (const r of routes) {
    await page.goto(base + r); await page.idle(200, 5000);
    await page.eval("document.querySelectorAll('details').forEach(d=>d.open=true)");
    await add();
    if (r.startsWith("/experience/classroom/")) {
      await page.eval("sessionStorage.clear()");
      await page.goto(base + r); await page.idle(200, 5000);
      await page.clickText("수업 시작");
      for (let i = 0; i < 5; i++) {
        await page.idle(150, 3000);
        for (const v of ["교사 화면", "나란히", "교실 화면"]) { await page.clickText(v).catch(() => {}); await page.idle(80, 2000); await page.eval("document.querySelectorAll('details').forEach(d=>d.open=true)"); await add(); }
        for (const d of ["준비물", "발문", "전체 단계"]) { await page.clickText(d).catch(() => {}); await page.idle(80, 2000); await add(); await page.key("Escape", "Escape", 27); }
        await page.key("ArrowRight", "ArrowRight", 39);
      }
      await page.idle(150, 3000); await add();
      await page.clickText("수업 종료").catch(() => {}); await page.idle(80, 2000); await add();
      await page.eval("sessionStorage.clear()");
    }
    if (r === "/" || r === "/experience") {
      await page.clickText("상담", { exact: false }).catch(() => {}); await page.idle(200, 3000); await add(); await page.key("Escape", "Escape", 27);
    }
  }
}
const display = Object.entries(acc).filter(([k]) => /^playDisplay$|TAP Play Display/i.test(k)).flatMap(([, v]) => [...v]);
if (!display.length) throw new Error("TAP Play Display 로 그려진 글자를 찾지 못했다 — 서버 · 글꼴 설정 확인");
const file = join(ROOT, "src/fonts/play/display-glyphs.txt");
const prev = existsSync(file) ? readFileSync(file, "utf8") : "";
const merged = [...new Set([...prev, ...display])].filter((c) => c.codePointAt(0) >= 0x20).sort().join("");
writeFileSync(file, merged);
console.log("display glyphs", merged.length, "(rendered", new Set(display).size + ")");
await close();
