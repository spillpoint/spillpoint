// Takes the review-note screenshots: pnpm screenshots <name>
//
// Drives a local headless Chrome over its debugging protocol, using only
// Node's built-ins. It waits until the page has finished working out the
// breakpoints (they compute in a background thread, which Chrome's own
// --screenshot flag doesn't wait for), runs any clicks a shot needs, and saves
// a small WebP under notes/screenshots/. A dev tool: not part of the page.
//
// Needs Chrome (CHROME=/path/to/chrome to override) and the built page served
// by `pnpm --filter @spillpoint/dashboard preview` at http://localhost:4173/.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL_ = process.env.URL ?? "http://localhost:4173/";
const OUT = resolve(import.meta.dirname, "../../../notes/screenshots");
const PORT = 9333;

/** Clicks and choices a shot needs, run in the page. */
const choose = (label, value) => `(() => {
  const select = [...document.querySelectorAll("label")].find((l) => l.textContent.trim().startsWith(${JSON.stringify(label)}))?.querySelector("select");
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
  setter.call(select, ${JSON.stringify(value)});
  select.dispatchEvent(new Event("change", { bubbles: true }));
})()`;
const click = (text) => `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(text)}).click()`;

const SHOTS = {
  "m3a-overview": { width: 1100, height: 900, steps: [] },
  "m3a-by-class": { width: 1100, height: 900, steps: [click("By class")] },
  "m3a-simple-example": { width: 1100, height: 900, steps: [choose("Example", "edge-04-participating-capped")] },
  "m3a-phone": { width: 390, height: 844, mobile: true, steps: [] },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = targets.find((t) => t.type === "page");
      if (page) return new WebSocket(page.webSocketDebuggerUrl);
    } catch {}
    await sleep(100);
  }
  throw new Error("Chrome didn't start");
}

function session(ws) {
  let id = 0;
  const waiting = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && waiting.has(msg.id)) {
      waiting.get(msg.id)(msg);
      waiting.delete(msg.id);
    }
  };
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      waiting.set(n, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
      ws.send(JSON.stringify({ id: n, method, params }));
    });
}

async function shoot(send, name, shot) {
  await send("Emulation.setDeviceMetricsOverride", { width: shot.width, height: shot.height, deviceScaleFactor: 1, mobile: !!shot.mobile });
  await send("Page.navigate", { url: URL_ });
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
  const settled = async () => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`document.readyState === "complete" && !!document.querySelector("h1") && !document.body.innerText.includes("Working out")`)) return;
      await sleep(100);
    }
    throw new Error(`${name}: the page didn't finish computing`);
  };
  await settled();
  for (const step of shot.steps) {
    await evaluate(step);
    await sleep(100);
    await settled();
  }
  const height = await evaluate("Math.ceil(document.documentElement.scrollHeight)");
  const { data } = await send("Page.captureScreenshot", {
    format: "webp",
    quality: 75,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: shot.width, height, scale: 1 },
  });
  const file = join(OUT, `${name}.webp`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log(`${file} (${shot.width}×${height}, ${Math.round(Buffer.from(data, "base64").length / 1024)} KB)`);
}

const names = process.argv.slice(2);
const wanted = names.length ? names : Object.keys(SHOTS);
const profile = mkdtempSync(join(tmpdir(), "spillpoint-chrome-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
try {
  const ws = await connect();
  await new Promise((r) => (ws.onopen = r));
  const send = session(ws);
  await send("Page.enable");
  await send("Runtime.enable");
  for (const name of wanted) {
    if (!SHOTS[name]) throw new Error(`no shot called ${name}; try ${Object.keys(SHOTS).join(", ")}`);
    await shoot(send, name, SHOTS[name]);
  }
  ws.close();
} finally {
  chrome.kill();
  await sleep(200);
  rmSync(profile, { recursive: true, force: true });
}
