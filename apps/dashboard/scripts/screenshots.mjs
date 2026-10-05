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
const focus = (selector, index = 0) => `document.querySelectorAll(${JSON.stringify(selector)})[${index}].focus()`;
const focusButton = (text) => `[...document.querySelectorAll("button")].find((b) => b.textContent.includes(${JSON.stringify(text)})).focus()`;
/** Types into the text box inside a label, then presses Enter once the page has caught up. */
const input = (label) => `[...document.querySelectorAll("label")].find((l) => l.textContent.trim().startsWith(${JSON.stringify(label)})).querySelector("input")`;
const type = (label, value) => [
  `(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(${input(label)}, ${JSON.stringify(value)});
    ${input(label)}.dispatchEvent(new Event("input", { bubbles: true }));
  })()`,
  `${input(label)}.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))`,
];
const CURVES = "section[aria-labelledby=curves-heading]";
/** Types into the index-th element matching a selector, as a person would. */
const fill = (selector, index, value) => `(() => {
  const input = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event("input", { bubbles: true }));
})()`;
const pick = (selector, index, value) => `(() => {
  const select = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, ${JSON.stringify(value)});
  select.dispatchEvent(new Event("change", { bubbles: true }));
})()`;
const clickAll = (selector) => `document.querySelectorAll(${JSON.stringify(selector)}).forEach((e) => e.click())`;
const HOLDERS = "section[aria-labelledby=edit-holders-heading] input";
const SERIES = "fieldset.series input";
/** Case 6b, built from scratch in the editor, click by click. */
const BUILD_6B = [
  choose("Start from", "scratch"),
  click("Cap table"),
  fill(HOLDERS, 0, "Founder A"),
  click("Add a holder"),
  click("Add a holder"),
  click("Add a holder"),
  fill(HOLDERS, 1, "Founder B"),
  fill(HOLDERS, 2, "Investor X"),
  fill(HOLDERS, 3, "Investor Y"),
  click("Add a preferred series"),
  fill(SERIES, 1, "1"),
  fill(SERIES, 0, "Seed-1 Preferred"),
  click("Add a preferred series"),
  fill(SERIES, 5, "3"),
  fill(SERIES, 4, "Seed-2 Preferred"),
  fill('[aria-label="Founder A, Common Stock"]', 0, "6,000,000"),
  fill('[aria-label="Founder B, Common Stock"]', 0, "2,000,000"),
  fill('[aria-label="Investor X, Seed-1 Preferred"]', 0, "1,000,000"),
  fill('[aria-label="Investor Y, Seed-2 Preferred"]', 0, "1,000,000"),
  pick("select[id^=edit-rank-]", 0, "1"),
  clickAll("#edit-group input[type=checkbox]"),
  fill("#edit-range-high", 0, "40M"),
];

const SHOTS = {
  "m3a-overview": { width: 1100, height: 900, steps: [] },
  "m3a-by-class": { width: 1100, height: 900, steps: [click("By class")] },
  "m3a-simple-example": { width: 1100, height: 900, steps: [choose("Start from", "edge-04-participating-capped")] },
  "m3a-phone": { width: 390, height: 844, mobile: true, steps: [] },
  // A shot with `clip` keeps just those parts of the page.
  "m3b-curves": { width: 1100, height: 900, steps: [], clip: [CURVES] },
  "m3b-zoomed": { width: 1100, height: 900, steps: [type("Show from", "30M"), type("to", "70M"), focusButton("Cobalt")], clip: [CURVES] },
  "m3b-by-class": { width: 1100, height: 900, steps: [click("By class")], clip: [CURVES] },
  "m3b-tick": { width: 1100, height: 900, steps: [focus(".exit-value__tick", 2)], clip: [".exit-value", ".tick-tip"] },
  // Mostly text, so a lower quality still reads cleanly and keeps the file small.
  "m3b-breakpoints": { width: 1100, height: 900, steps: [], clip: ["section[aria-labelledby=breakpoints-heading]"], quality: 30 },
  "m3b-phone": { width: 390, height: 844, mobile: true, steps: [], clip: [CURVES] },
  "m3c-editor": { width: 1100, height: 900, steps: [click("Cap table")], clip: [".tabs", ".editor__status", "section[aria-labelledby=edit-holders-heading]"] },
  "m3c-holdings": {
    width: 1100,
    height: 900,
    steps: [click("Cap table")],
    clip: ["section[aria-labelledby=edit-shares-heading]", "section[aria-labelledby=edit-seniority-heading]", "section[aria-labelledby=edit-group-heading]"],
    quality: 40,
  },
  "m3c-error": {
    width: 1100,
    height: 900,
    // Series A is the third series; its cap is its fifth box.
    steps: [click("Cap table"), fill("fieldset.series input", 12, "1")],
    clip: ["fieldset.series:nth-of-type(3)"],
  },
  "m3c-stale": {
    width: 1100,
    height: 900,
    steps: [click("Cap table"), fill("fieldset.series input", 12, "1"), click("Payouts")],
    clip: [".notice--problem", ".founder"],
  },
  // The shares grid scrolled sideways, to show the holder column staying in view.
  "m3c-phone": {
    width: 390,
    height: 844,
    mobile: true,
    steps: [click("Cap table"), `document.querySelector("section[aria-labelledby=edit-shares-heading] .table-scroll").scrollLeft = 400`],
    clip: ["section[aria-labelledby=edit-shares-heading]"],
  },
  "m3c-6b-editor": {
    width: 1100,
    height: 900,
    steps: BUILD_6B,
    clip: ["section[aria-labelledby=edit-shares-heading]", "section[aria-labelledby=edit-seniority-heading]", "section[aria-labelledby=edit-group-heading]"],
    quality: 40,
  },
  "m3d-unsaved": { width: 1100, height: 900, steps: [click("Cap table"), fill("#edit-name", 0, "Millrace Robotics, my copy")], clip: [".masthead", ".example-label"] },
  "m3d-saved": { width: 1100, height: 900, steps: [click("Cap table"), fill("#edit-name", 0, "Millrace Robotics, my copy"), click("Save")], clip: [".masthead", ".example-label"] },
  "m3c-6b-curves": { width: 1100, height: 900, steps: [...BUILD_6B, click("Payouts")], clip: [CURVES, "section[aria-labelledby=breakpoints-heading]"], quality: 40 },
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
  for (const step of shot.steps.flat()) {
    await evaluate(step);
    await sleep(100);
    await settled();
  }
  const height = await evaluate("Math.ceil(document.documentElement.scrollHeight)");
  // The page's own coordinates of everything the shot keeps, with a little room around it.
  const clip = shot.clip
    ? await evaluate(`(() => {
        const rects = ${JSON.stringify(shot.clip)}.flatMap((s) => [...document.querySelectorAll(s)]).map((e) => e.getBoundingClientRect());
        const top = Math.min(...rects.map((r) => r.top)) + scrollY - 8, bottom = Math.max(...rects.map((r) => r.bottom)) + scrollY + 8;
        const left = Math.max(0, Math.min(...rects.map((r) => r.left)) - 8), right = Math.min(innerWidth, Math.max(...rects.map((r) => r.right)) + 8);
        return { x: left, y: top, width: right - left, height: bottom - top, scale: 1 };
      })()`)
    : { x: 0, y: 0, width: shot.width, height, scale: 1 };
  const { data } = await send("Page.captureScreenshot", { format: "webp", quality: shot.quality ?? 75, captureBeyondViewport: true, clip });
  const file = join(OUT, `${name}.webp`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log(`${file} (${Math.round(clip.width)}×${Math.round(clip.height)}, ${Math.round(Buffer.from(data, "base64").length / 1024)} KB)`);
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
  // So focusing a mark or a legend row shows what it would for a keyboard user.
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  // A shot that clicks Save shouldn't leave a file behind.
  await send("Browser.setDownloadBehavior", { behavior: "deny" });
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
