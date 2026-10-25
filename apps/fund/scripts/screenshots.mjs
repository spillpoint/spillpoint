// Takes the fund page's review-note screenshots: pnpm --filter @spillpoint/fund screenshots <name>
//
// A copy of the main page's script (apps/dashboard/scripts/screenshots.mjs), as the plan's step 8 asks: it drives a
// local headless Chrome over its debugging protocol, using only Node's built-ins, runs the clicks a shot needs, and
// saves a small WebP under notes/screenshots/. The two apps share no code, so the driver is copied, not imported. A
// dev tool: not part of the page.
//
// Needs Chrome (CHROME=/path/to/chrome to override) and the built page served by
// `pnpm --filter @spillpoint/fund preview --port 4174` at http://localhost:4174/.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL_ = process.env.URL ?? "http://localhost:4174/";
// OUT=/some/dir writes shots elsewhere, for a look that isn't for a review note.
const OUT = process.env.OUT ?? resolve(import.meta.dirname, "../../../notes/screenshots");
// Not the main page's port, so the two scripts can run side by side.
const PORT = 9334;

/** Clicks and choices a shot needs, run in the page. */
const choose = (label, value) => `(() => {
  const select = [...document.querySelectorAll("label")].find((l) => l.textContent.trim().startsWith(${JSON.stringify(label)}))?.querySelector("select");
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
  setter.call(select, ${JSON.stringify(value)});
  select.dispatchEvent(new Event("change", { bubbles: true }));
})()`;
const click = (text) => `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(text)}).click()`;
/** Types into the element with an id, as a person would. */
const fill = (id, value) => `(() => {
  const input = document.getElementById(${JSON.stringify(id)});
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event("input", { bubbles: true }));
})()`;
const pasteText = (value) => `(() => {
  const box = document.querySelector(".paste__text");
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(box, ${JSON.stringify(value)});
  box.dispatchEvent(new Event("input", { bubbles: true }));
})()`;

const TABS = { payouts: "Payouts", terms: "Terms", flows: "Cash flows" };
/** Each tab, at a phone's width and a desktop's, after the steps that set the fund up. */
const tabShots = (prefix, setup) =>
  Object.fromEntries(
    Object.entries(TABS).flatMap(([key, name]) => [
      [`${prefix}-${key}-320`, { width: 320, height: 900, mobile: true, steps: [...setup, click(name)], quality: 50 }],
      [`${prefix}-${key}-1280`, { width: 1280, height: 900, steps: [...setup, click(name)], quality: 50 }],
    ]),
  );

const SHOTS = {
  // f01m: each tab at 320 and 1280 pixels, on case 13 and on a blank fund with its first refusal showing.
  ...tabShots("f01m-case13", [choose("Start from", "fund-19-lps-clawback")]),
  ...tabShots("f01m-blank", [choose("Start from", "blank")]),
  // The longest example, its carry in three steps, at a phone's width; and its cash flows with a refusal and the
  // paste box open, each cash flow a card.
  "f01m-case8-terms-320": { width: 320, height: 900, mobile: true, steps: [choose("Start from", "fund-17-lps-three"), click("Terms")], quality: 50 },
  "f01m-case8-flows-320": {
    width: 320,
    height: 900,
    mobile: true,
    steps: [
      choose("Start from", "fund-17-lps-three"),
      click("Cash flows"),
      fill("cash_flows[4].date", "2020-06-01"),
      click("Paste rows from a spreadsheet"),
      pasteText("Date\tType\tKind\tAmount\n3/4/2021\tCall\tInvestment\t$100,000\nQ3 2021\tDistribution\t\t$200,000"),
    ],
    quality: 50,
  },
  // f01m2: the cash flows at a phone's and a tablet's widths, cards until the table fits; and the split on a phone,
  // two tables one above the other.
  ...Object.fromEntries(
    [480, 600, 768, 900].map((width) => [
      `f01m2-case8-flows-${width}`,
      { width, height: 900, mobile: width < 900, steps: [choose("Start from", "fund-17-lps-three"), click("Cash flows")], clip: ["section[aria-labelledby=flows-heading]"], quality: 50 },
    ]),
  ),
  "f01m2-case8-split-320": {
    width: 320,
    height: 900,
    mobile: true,
    steps: [choose("Start from", "fund-17-lps-three")],
    clip: ["section[aria-labelledby=split-heading]"],
    quality: 50,
  },
  // f02d: the LPs' card, with its clawback column, at a laptop's width and a phone's; the LPs tab at both; and the
  // four tabs on one line at 320.
  ...Object.fromEntries(
    [1100, 320].flatMap((width) => [
      [
        `f02d-card-${width}`,
        { width, height: 900, mobile: width < 768, steps: [choose("Start from", "fund-19-lps-clawback")], clip: ["section[aria-labelledby=lps-card-heading]"], quality: 60 },
      ],
      [
        `f02d-lps-tab-${width}`,
        { width, height: 900, mobile: width < 768, steps: [choose("Start from", "fund-17-lps-three"), click("LPs")], clip: ["section[aria-labelledby=lps-heading]"], quality: 60 },
      ],
    ]),
  ),
  "f02d-tabs-320": { width: 320, height: 900, mobile: true, steps: [choose("Start from", "fund-17-lps-three")], clip: [".masthead", ".tabs"], quality: 60 },
  // f03d: case 26 at a laptop's width and a phone's: the LPs tab with its class and its closes, and Payouts' classes
  // and equalization cards.
  ...Object.fromEntries(
    [1100, 320].flatMap((width) => {
      const shot = (steps, clip) => ({ width, height: 900, mobile: width < 768, steps: [choose("Start from", "fund-26-closes-and-classes"), ...steps], clip: [clip], quality: 60 });
      return [
        [`f03d-lps-tab-${width}`, shot([click("LPs")], "section[aria-labelledby=lps-heading]")],
        [`f03d-classes-card-${width}`, shot([], "section[aria-labelledby=classes-card-heading]")],
        [`f03d-equalization-${width}`, shot([], "section[aria-labelledby=equalization-heading]")],
      ];
    }),
  ),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  // A fresh profile can take several seconds to start.
  for (let i = 0; i < 200; i++) {
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
      // The fund page works out everything at once, so it's ready when its tabs are there.
      if (await evaluate(`document.readyState === "complete" && !!document.querySelector("#panel-payouts")`)) return;
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
const profile = mkdtempSync(join(tmpdir(), "spillpoint-fund-chrome-"));
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
