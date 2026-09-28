// LOCAL ONLY — 최소 Chrome DevTools Protocol 드라이버 (새 npm 의존성 없음 · node 내장만)
// headless Chrome/Edge 를 띄워 페이지 이동 · 입력 · 클릭 · 스크린샷 · console/network 수집을 한다.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function launch({ port = 9333 } = {}) {
  const exe = BROWSERS.find((path) => existsSync(path));
  if (!exe) throw new Error("no Chrome/Edge found");
  const profile = mkdtempSync(join(tmpdir(), "smoke-profile-"));
  const proc = spawn(exe, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
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
  const pageTarget = targets?.find((t) => t.type === "page");
  if (!pageTarget) throw new Error("no page target");
  const page = new Page(pageTarget.webSocketDebuggerUrl);
  await page.ready;
  return { page, close: () => proc.kill() };
}

export class Page {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    this.consoleErrors = [];
    this.badResponses = [];
    this.requests = [];
    this.inflight = 0;
    this.ready = new Promise((resolve) => {
      this.ws.addEventListener("open", async () => {
        await this.send("Page.enable");
        await this.send("Runtime.enable");
        await this.send("Network.enable");
        await this.send("Log.enable");
        resolve();
      });
    });
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message}`));
        else resolve(msg.result);
        return;
      }
      this.handle(msg);
    });
  }

  handle({ method, params }) {
    if (method === "Runtime.exceptionThrown") {
      this.consoleErrors.push(`exception: ${params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text}`);
    } else if (method === "Runtime.consoleAPICalled" && (params.type === "error" || params.type === "assert")) {
      this.consoleErrors.push(`console.${params.type}: ${params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 400)}`);
    } else if (method === "Log.entryAdded" && params.entry.level === "error") {
      this.consoleErrors.push(`log: ${params.entry.text?.slice(0, 300)} ${params.entry.url ?? ""}`);
    } else if (method === "Network.requestWillBeSent") {
      this.inflight += 1;
      this.requests.push({ url: params.request.url, method: params.request.method, postData: params.request.postData ?? "" });
    } else if (method === "Network.loadingFinished" || method === "Network.loadingFailed") {
      this.inflight = Math.max(0, this.inflight - 1);
    } else if (method === "Network.responseReceived") {
      const status = params.response.status;
      if (status >= 400) this.badResponses.push(`${status} ${params.response.url}`);
    }
    for (const listener of this.listeners) listener(method, params);
  }

  send(method, params = {}) {
    const id = (this.id += 1);
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async idle(ms = 700, timeout = 20000) {
    const start = Date.now();
    let quietSince = Date.now();
    while (Date.now() - start < timeout) {
      if (this.inflight > 0) quietSince = Date.now();
      if (Date.now() - quietSince >= ms) return;
      await sleep(100);
    }
  }

  async goto(url) {
    const loaded = new Promise((resolve) => {
      const listener = (method) => {
        if (method === "Page.loadEventFired") {
          this.listeners = this.listeners.filter((l) => l !== listener);
          resolve();
        }
      };
      this.listeners.push(listener);
    });
    await this.send("Page.navigate", { url });
    await Promise.race([loaded, sleep(60000)]);
    await this.idle();
  }

  async eval(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(`eval failed: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`);
    return result.result.value;
  }

  url() {
    return this.eval("location.href");
  }

  text() {
    return this.eval("document.body ? document.body.innerText : ''");
  }

  async waitFor(expression, timeout = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        if (await this.eval(expression)) return true;
      } catch {
        /* navigation in progress */
      }
      await sleep(200);
    }
    return false;
  }

  /** React 제어 입력에도 반영되도록 native setter + input/change 이벤트 */
  async fill(selector, value) {
    return this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
  }

  /** 실제 키보드 입력처럼 입력한다 (focus + Input.insertText) */
  async type(selector, text) {
    const focused = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.focus(); if (el.select) el.select(); return true; })()`);
    if (!focused) return false;
    await this.send("Input.insertText", { text });
    await this.idle(300);
    return true;
  }

  /** 보이는 버튼/링크 중 텍스트가 정확히(또는 포함) 일치하는 첫 요소 클릭 */
  async clickText(text, { exact = true, scope = "button, a, [role=button], [role=tab], label" } = {}) {
    const clicked = await this.eval(`(() => {
      const want = ${JSON.stringify(text)};
      const items = [...document.querySelectorAll(${JSON.stringify(scope)})].filter((el) => {
        const t = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
        const visible = el.offsetParent !== null || el.getClientRects().length > 0;
        return visible && !el.disabled && (${exact} ? t === want : t.includes(want));
      });
      if (!items.length) return false;
      items[0].click();
      return true;
    })()`);
    if (clicked) await this.idle();
    return clicked;
  }

  async click(selector) {
    const ok = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`);
    if (ok) await this.idle();
    return ok;
  }

  async viewport(width, height, mobile = false) {
    await this.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  }

  async screenshot(path) {
    const { data } = await this.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path, Buffer.from(data, "base64"));
  }

  async key(key, code = key, keyCode = 0) {
    await this.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode });
  }

  async clearCookies() {
    await this.send("Network.clearBrowserCookies");
  }

  drain() {
    const out = { consoleErrors: this.consoleErrors, badResponses: this.badResponses };
    this.consoleErrors = [];
    this.badResponses = [];
    return out;
  }
}
