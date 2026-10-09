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
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL_ = process.env.URL ?? "http://localhost:4173/";
// OUT=/some/dir writes shots elsewhere, for a look that isn't for a review note.
const OUT = process.env.OUT ?? resolve(import.meta.dirname, "../../../notes/screenshots");
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
const SERIES_NAME = "fieldset.series input[id^=edit-class-]";
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
  // By id, not position: a series' fields have grown since M3 (dividends, M5k2).
  click("Add a preferred series"),
  fill("input[id^=edit-oip-]", 0, "1"),
  fill(SERIES_NAME, 0, "Seed-1 Preferred"),
  click("Add a preferred series"),
  fill("input[id^=edit-oip-]", 1, "3"),
  fill(SERIES_NAME, 1, "Seed-2 Preferred"),
  fill('[aria-label="Founder A, Common Stock"]', 0, "6,000,000"),
  fill('[aria-label="Founder B, Common Stock"]', 0, "2,000,000"),
  fill('[aria-label="Investor X, Seed-1 Preferred"]', 0, "1,000,000"),
  fill('[aria-label="Investor Y, Seed-2 Preferred"]', 0, "1,000,000"),
  pick("select[id^=edit-rank-]", 0, "1"),
  clickAll("#edit-group input[type=checkbox]"),
  fill("#edit-range-high", 0, "40M"),
];

/** Chooses an option by the text it shows, for a select whose values are the editor's own keys. */
const pickText = (selector, index, text) => `(() => {
  const select = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
  const option = [...select.options].find((o) => o.text === ${JSON.stringify(text)});
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, option.value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
})()`;
/** Case 10b, typed in from a blank cap table: a carve-out alongside the preferences, which makes payouts curve (X17). */
const BUILD_10B = [
  choose("Start from", "scratch"),
  click("Cap table"),
  fill(HOLDERS, 0, "Founder A"),
  click("Add a holder"),
  click("Add a holder"),
  click("Add a holder"),
  fill(HOLDERS, 1, "Founder B"),
  fill(HOLDERS, 2, "Investor X"),
  fill(HOLDERS, 3, "Manager M"),
  click("Add a preferred series"),
  fill(SERIES, 1, "2.50"),
  fill(SERIES, 0, "Series A Preferred"),
  fill('[aria-label="Founder A, Common Stock"]', 0, "4,500,000"),
  fill('[aria-label="Founder B, Common Stock"]', 0, "1,500,000"),
  fill('[aria-label="Investor X, Series A Preferred"]', 0, "4,000,000"),
  fill("#edit-range-high", 0, "50M"),
  click("Add a carve-out"),
  pick("#edit-carve-timing", 0, "alongside_preferences"),
  fill("input[id^=edit-carve-to-]", 0, "10M"),
  fill("[id^=edit-carve-percent-]", 0, "10"),
  click("Add a tier"),
  fill("input[id^=edit-carve-to-]", 1, "20M"),
  fill("[id^=edit-carve-percent-]", 1, "5"),
  fill("[id^=edit-carve-share-]", 0, "60"),
  click("Add a recipient"),
  pickText("[id^=edit-carve-holder-]", 1, "Manager M"),
  fill("[id^=edit-carve-share-]", 1, "40"),
];

/** Millrace's cap table is built from its rounds (M4i): editing it means dropping them, which asks first. */
const EDIT_DIRECTLY = ["window.confirm = () => true", click("Edit the cap table directly")];
/** Opens the cap table after the index-th event on the Rounds tab. */
const openRound = (index) => `document.querySelectorAll(".rounds__table")[${index}].open = true`;
const ROUND = (n) => `.rounds__event:nth-child(${n})`;
/** Opens the index-th event's form on the Rounds tab. */
const editRound = (index) => `document.querySelectorAll(".rounds__edit")[${index}].click()`;
/** Opens a locked round case as a saved file, its payouts on its last event, and waits until it has opened. */
const openCase = (name) => {
  const inputs = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../cases", name, "inputs.json"), "utf8"));
  const file = { format: "spillpoint", version: 5, name, holders: inputs.holders, events: inputs.events, cap_table_after_event: inputs.events.at(-1).id, range: ["0", "50000000"] };
  return `new Promise((done) => {
    const input = document.querySelector("input[type=file]");
    const files = new DataTransfer();
    files.items.add(new File([${JSON.stringify(JSON.stringify(file))}], "case.json", { type: "application/json" }));
    input.files = files.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const wait = () => (document.body.innerText.includes("Opened case.json.") ? done() : setTimeout(wait, 50));
    wait();
  })`;
};

/** Opens an OCF export through the page's import button, from files on disk, and waits for its report or its refusal. */
const importFiles = (paths) => {
  const files = paths.map((p) => ({ name: p.split("/").pop(), base64: readFileSync(resolve(import.meta.dirname, "../../..", p)).toString("base64") }));
  return `new Promise((done) => {
    const input = document.querySelector("input[aria-label^='Open an OCF export']");
    const files = new DataTransfer();
    for (const f of ${JSON.stringify(files)}) files.items.add(new File([Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0))], f.name));
    input.files = files.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const wait = () => (document.querySelector(".import, .file-status--problem") ? done() : setTimeout(wait, 50));
    wait();
  })`;
};
const packageOf = (name) => readdirSync(resolve(import.meta.dirname, "../../../cases", name, "package")).map((f) => `cases/${name}/package/${f}`);

/** Quillfern's export, imported and used (04f). */
const QUILLFERN = [importFiles(["apps/dashboard/test/fixtures/quillfern-macos.zip"]), click("Use this cap table")];
/**
 * "Add a round" on it, and case 26's Series B typed in (05b3a). The start event is r1 and the round r2, so their
 * fields are found by id; Fund W, added on the Rounds tab, is r3.
 */
const SERIES_B = [
  click("Cap table"),
  click("Add a round"),
  `document.querySelector("section[aria-labelledby=rounds-holders-heading] button.add").click()`,
  fill("#rounds-holder-r3", 0, "Fund W"),
  fill("#ev-r2-date", 0, "2026-03-31"),
  fill("#ev-r2-pre_money", 0, "40000000"),
  fill("#ev-r2-pool_target_unissued_percent_post", 0, "10"),
  pickText("#ev-r2-investments-0-holder", 0, "Fund W"),
  fill("#ev-r2-investments-0-amount", 0, "8000000"),
  click("Add an investor"),
  pickText("#ev-r2-investments-1-holder", 0, "Fund U"),
  fill("#ev-r2-investments-1-amount", 0, "1500000"),
  `document.querySelector("#ev-r2-investments-1-pro_rata").click()`,
  pick("#ev-r2-seniority", 0, "senior"),
  click("Done"),
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
    steps: [click("Cap table"), ...EDIT_DIRECTLY, fill("fieldset.series input", 12, "1")],
    clip: ["fieldset.series:nth-of-type(3)"],
  },
  "m3c-stale": {
    width: 1100,
    height: 900,
    steps: [click("Cap table"), ...EDIT_DIRECTLY, fill("fieldset.series input", 12, "1"), click("Payouts")],
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
  // M3 as a whole, and M3e's narrow-screen pass at a common phone width (375) and the narrowest (320).
  "m3-overview": { width: 1100, height: 900, steps: [], clip: [".masthead", ".exit-value"] },
  "m3e-phone-top": { width: 375, height: 812, mobile: true, steps: [], clip: [".masthead", ".founder"] },
  "m3e-phone-table": { width: 375, height: 812, mobile: true, steps: [], clip: ["section[aria-labelledby=who-gets-what]"] },
  "m3e-phone-tick": { width: 375, height: 812, mobile: true, steps: [focus(".exit-value__tick", 9)], clip: [".exit-value", ".tick-tip"] },
  "m3e-small-chart": { width: 320, height: 640, mobile: true, steps: [], clip: [CURVES] },
  "m3c-6b-curves": { width: 1100, height: 900, steps: [...BUILD_6B, click("Payouts")], clip: [CURVES, "section[aria-labelledby=breakpoints-heading]"], quality: 40 },
  // M4i: Millrace built from its rounds.
  "m4i-rounds": { width: 1100, height: 900, steps: [click("Rounds")], clip: [".example-label", ".tabs", "section[aria-labelledby=rounds-heading]", ROUND(1), ROUND(2), ROUND(3), ROUND(4)], quality: 50 },
  "m4i-seed": { width: 1100, height: 900, steps: [click("Rounds"), openRound(5)], clip: [ROUND(6)] },
  "m4i-locked": { width: 1100, height: 900, steps: [click("Cap table")], clip: [".editor__built", "section[aria-labelledby=edit-holders-heading]"], quality: 50 },
  "m4i-phone": { width: 375, height: 812, mobile: true, steps: [click("Rounds"), openRound(9)], clip: [ROUND(10)] },
  // M4j: editing the rounds.
  "m4j-seed": { width: 1100, height: 900, steps: [click("Rounds"), editRound(5)], clip: [ROUND(6)], quality: 50 },
  "m4j-series-b": { width: 1100, height: 900, steps: [click("Rounds"), editRound(9)], clip: [ROUND(10)], quality: 50 },
  "m4j-holders": { width: 1100, height: 900, steps: [click("Rounds")], clip: ["section[aria-labelledby=rounds-holders-heading]"], quality: 50 },
  "m4j-phone": { width: 375, height: 812, mobile: true, steps: [click("Rounds"), editRound(5)], clip: [ROUND(6)], quality: 50 },
  // M4k: adding events, and which one the payouts use.
  "m4k-add": {
    width: 1100,
    height: 900,
    steps: [choose("Start from", "scratch-rounds"), click("Rounds"), pick("#rounds-add-type", 0, "priced_round"), click("Add it at the end")],
    clip: [ROUND(2), ".rounds__add"],
    quality: 50,
  },
  "m4k-after": { width: 1100, height: 900, steps: [click("Rounds")], clip: ["section[aria-labelledby=rounds-heading]"] },
  // M5k: SAFEs and notes still outstanding at the sale.
  "m5k-editor": {
    width: 1100,
    height: 900,
    steps: [
      choose("Start from", "scratch"),
      click("Cap table"),
      click("Add a convertible note"),
      fill("[id^=edit-note-principal-]", 0, "500,000"),
      fill("[id^=edit-note-interest-]", 0, "6"),
      fill("[id^=edit-note-issued-]", 0, "2025-01-01"),
      fill("[id^=edit-note-cap-]", 0, "8M"),
    ],
    clip: ["section[aria-labelledby=edit-outstanding-heading]", "section[aria-labelledby=edit-range-heading]"],
    quality: 50,
  },
  "m5k-at-sale": { width: 1100, height: 900, steps: [click("Rounds"), pick("#rounds-after", 0, "option_pool")], clip: [ROUND(3)], quality: 50 },
  "m5k-payouts": {
    width: 1100,
    height: 900,
    // The table's own "By class", not the chart's, which comes first on the page.
    steps: [click("Rounds"), pick("#rounds-after", 0, "option_pool"), click("Payouts"), `document.querySelector("section[aria-labelledby=who-gets-what] .toggle button:nth-child(2)").click()`],
    clip: ["section[aria-labelledby=who-gets-what]"],
    quality: 50,
  },
  "m5k-unbuilt": {
    width: 1100,
    height: 900,
    steps: [
      choose("Start from", "scratch-rounds"),
      click("Rounds"),
      pick("#rounds-add-type", 0, "notes"),
      click("Add it at the end"),
      pick("#rounds-add-type", 0, "priced_round"),
      click("Add it at the end"),
      // Both forms closed, so the shot is the two cards' messages.
      `[...document.querySelectorAll(".rounds__edit")].filter((b) => b.textContent === "Done").forEach((b) => b.click())`,
    ],
    clip: [ROUND(2), ROUND(3)],
    quality: 50,
  },
  // M5k3: a carve-out, and the payouts it makes curve.
  "m5k3-carve-out": { width: 1100, height: 900, steps: BUILD_10B, clip: ["section[aria-labelledby=edit-carve-out-heading]"], quality: 50 },
  "m5k3-curves": {
    width: 1100,
    height: 900,
    steps: [...BUILD_10B, click("Payouts"), ...type("Show from", "0"), ...type("to", "20M")],
    clip: [CURVES],
  },
  "m5k3-for-you": {
    width: 1100,
    height: 900,
    steps: [...BUILD_10B, click("Payouts")],
    clip: ["ol.breakpoints > li:nth-child(1)", "ol.breakpoints > li:nth-child(2)"],
    quality: 50,
  },
  // M5l: the sale's terms, and what each payment pays.
  "m5l-exit-terms": {
    width: 1100,
    height: 900,
    steps: [click("Cap table"), click("Add a carve-out"), fill("[id^=edit-carve-percent-]", 0, "5"), pickText("[id^=edit-carve-holder-]", 0, "Dev Patel")],
    clip: ["section[aria-labelledby=edit-exit-terms-heading]"],
    quality: 50,
  },
  "m5l-paid-over-time": {
    width: 1100,
    height: 900,
    steps: [
      ...BUILD_6B,
      click("Add a payment schedule"),
      fill("input[id^=edit-payment-amount-]", 0, "29M"),
      fill("input[id^=edit-payment-amount-]", 1, "2M"),
      click("Payouts"),
    ],
    clip: ["section[aria-labelledby=paid-over-time-heading]"],
    quality: 50,
  },
  "m5l-rounds-terms": { width: 1100, height: 900, steps: [click("Rounds")], clip: ["section[aria-labelledby=rounds-heading]"], quality: 50 },
  // 03i: SAFEs and notes in a round that triggers anti-dilution, the round's settings, and blanks marked at once.
  "03i-pieces": { width: 1100, height: 900, steps: [openCase("edge-16i-discounted-note-in-an-up-round"), click("Rounds")], clip: [ROUND(4)], quality: 50 },
  "03i-more-terms": {
    width: 1100,
    height: 900,
    steps: [openCase("edge-16g-safe-converts-in-a-down-round"), click("Rounds"), editRound(3), `document.querySelector("${ROUND(4)} details.event-form__more").open = true`],
    clip: [`${ROUND(4)} details.event-form__more`],
    quality: 50,
  },
  "03i-blanks": {
    width: 1100,
    height: 900,
    steps: [choose("Start from", "scratch-rounds"), click("Rounds"), pick("#rounds-add-type", 0, "priced_round"), click("Add it at the end")],
    clip: [`${ROUND(2)} .rounds__heading`, `${ROUND(2)} .rounds__problem`, "[id$='-investments-0-amount-error']"],
    quality: 50,
  },
  "m4j-error": {
    width: 1100,
    height: 900,
    steps: [click("Rounds"), editRound(5), fill("[id$='-investments-0-amount']", 0, "a lot")],
    clip: [`${ROUND(6)} .rounds__heading`, `${ROUND(6)} .rounds__problem`, `${ROUND(6)} fieldset.series`],
  },
  // 04f: opening an OCF export. The report comes first, then a question for each term OCF leaves open.
  "04f-report": { width: 1100, height: 900, steps: [importFiles(["apps/dashboard/test/fixtures/quillfern-macos.zip"])], clip: [".import"], quality: 50 },
  "04f-millrace": { width: 1100, height: 900, steps: [importFiles(packageOf("ocf-11-millrace"))], clip: [".import__open"], quality: 50 },
  "04f-safe-question": {
    width: 1100,
    height: 900,
    steps: [importFiles([...packageOf("ocf-01-larkspur"), "cases/ocf-04-to-fill/fixtures/safe-cap-without-timing.ocf.json"])],
    clip: [".import__open"],
    quality: 50,
  },
  "04f-imported": {
    width: 1100,
    height: 900,
    steps: [importFiles(["apps/dashboard/test/fixtures/quillfern-zip.zip"]), click("Use this cap table")],
    clip: [".masthead", ".file-status", ".founder"],
  },
  "04f-refused": {
    width: 1100,
    height: 900,
    steps: [importFiles([...packageOf("ocf-01-larkspur"), "cases/ocf-03-refused/fixtures/conversion-ratio-loose.ocf.json"])],
    clip: [".masthead", ".file-status"],
  },
  // 05b3a: "Add a round" on an imported cap table, which becomes the one the company's rounds start from (R31).
  "05b3a-next-round": { width: 1100, height: 900, steps: [...QUILLFERN, click("Cap table")], clip: ["section[aria-labelledby=next-round-heading]"], quality: 50 },
  "05b3a-rounds": { width: 1100, height: 900, steps: [...QUILLFERN, ...SERIES_B], clip: [".example-label", ".tabs", ROUND(1), ROUND(2)], quality: 50 },
  "05b3a-round-form": {
    width: 1100,
    height: 900,
    steps: [...QUILLFERN, ...SERIES_B, editRound(1)],
    clip: [ROUND(2)],
    quality: 50,
  },
  "05b3a-starting-table": {
    width: 1100,
    height: 900,
    steps: [...QUILLFERN, ...SERIES_B, click("Cap table")],
    clip: [".editor__built", "section[aria-labelledby=edit-holders-heading]"],
    quality: 50,
  },
  "05b3a-payouts": { width: 1100, height: 900, steps: [...QUILLFERN, ...SERIES_B, click("Payouts")], clip: [".example-label", ".founder"] },
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
      // An OCF import's report stands in for the payouts until it's used (04f).
      if (await evaluate(`document.readyState === "complete" && !!document.querySelector("h1, .import") && !document.body.innerText.includes("Working out")`)) return;
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
