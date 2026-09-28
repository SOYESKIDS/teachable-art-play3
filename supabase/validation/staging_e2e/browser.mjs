// PHASE 09A — staging_e2e 전용 브라우저 실행 (browser_smoke/cdp.mjs 의 Page 재사용)
// ---------------------------------------------------------------------
// · 매 실행마다 새 임시 profile 을 만들고 close() 에서 **삭제**한다
//   (로그인 session cookie · 방문 URL · cache 가 디스크에 남지 않게)
// · screenshot · HTML dump 를 만들지 않는다 (Page.screenshot 은 쓰지 않는다)
// · 브라우저 console / network 기록은 메모리에만 있고, 결과에는 개수 · 경로(파라미터 · id 제거)만 쓴다

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Page } from "../browser_smoke/cdp.mjs";

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launchEphemeral({ port }) {
  const exe = BROWSERS.find((p) => existsSync(p));
  if (!exe) throw new Error("no Chrome/Edge found");
  const profile = mkdtempSync(join(tmpdir(), "p09-e2e-profile-"));
  const proc = spawn(exe, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-sync",
    "--window-size=1366,900",
    "about:blank",
  ], { stdio: "ignore" });

  let targets = null;
  for (let i = 0; i < 60 && !targets; i += 1) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    } catch {
      await sleep(250);
    }
  }
  const target = targets?.find((t) => t.type === "page");
  if (!target) {
    proc.kill();
    rmSync(profile, { recursive: true, force: true });
    throw new Error("no page target");
  }
  const page = new Page(target.webSocketDebuggerUrl);
  await page.ready;

  async function close() {
    try {
      page.ws.close();
    } catch {}
    proc.kill();
    for (let i = 0; i < 20; i += 1) {
      try {
        rmSync(profile, { recursive: true, force: true });
        if (!existsSync(profile)) return { profileRemoved: true };
      } catch {}
      await sleep(250);
    }
    return { profileRemoved: !existsSync(profile) };
  }
  return { page, close, profile };
}
