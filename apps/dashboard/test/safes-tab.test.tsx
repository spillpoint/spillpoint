// The SAFEs tab (11c), clicked through in a simulated browser, on each kind of table the page builds: an import (Larkspur,
// with a trial at case 27's Series B price), a company built from its rounds (Millrace, its payouts on the table before
// its Seed), and a cap table entered directly (edge-12b's). "See the payouts after this round" shows the Payouts tab on
// the trial's table, paying what buildCapTables and solve pay, and never saved.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { buildCapTables, prepare, readOcf, solve } from "spillpoint";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { draftFromExit } from "../src/draft.ts";
import { dollarsAndCents, parseDollars } from "../src/format.ts";
import { paid } from "../src/paid.ts";
import { runTrial, trialBase } from "../src/trial.ts";
import { ANALYSIS_TIMEOUT } from "./analysis.ts";

type Json = Record<string, unknown>;
const cases = resolve(import.meta.dirname, "../../../cases");
const caseJson = (name: string, file: string) => JSON.parse(readFileSync(resolve(cases, name, file), "utf8"));
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const openTab = (name: "Payouts" | "Cap table" | "Rounds" | "SAFEs") => fireEvent.click(screen.getByRole("tab", { name }));
const panel = () => document.getElementById("panel-safes")!;
const item = (name: string) => within(panel()).getByRole("article", { name });
const lines = (el: HTMLElement) => within(el).getAllByRole("listitem").map((li) => li.textContent);

let downloads: number;
beforeEach(() => {
  downloads = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
    downloads++;
    return "blob:test";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

/** Larkspur's export, its blanks answered as case 27 fills them, a sale date, and "Use this cap table". */
async function importLarkspur() {
  render(<App />);
  const files = readdirSync(resolve(cases, "ocf-01-larkspur/package")).map(
    (f) => new File([readFileSync(resolve(cases, "ocf-01-larkspur/package", f))], f, { type: "application/json" }),
  );
  fireEvent.change(screen.getByLabelText(/Open a cap table export/), { target: { files } });
  const review = await screen.findByRole("region", { name: /^Importing / });
  fireEvent.click(within(within(review).getByRole("group", { name: "Does Seed Preferred participate?" })).getByLabelText(/^Non-participating/));
  type(within(review).getByLabelText("Investor N's note's repayment multiple at a sale"), "1");
  type(within(review).getByLabelText("When is the sale?"), "2026-06-30");
  click("Use this cap table");
  await screen.findByText(/^Imported Larkspur Instruments, Inc\. from 8 files\./);
}

/** Case 27's Series B on the SAFEs tab: at its exact price, Investor Z's $8,000,000, the pool to 10%, senior. */
const CASE_27_PRICE = String(caseJson("edge-27-safes-and-note-convert-on-an-imported-table", "expected.json").cap_tables.at(-1).details.price_per_share);
function typeCase27SeriesB() {
  openTab("SAFEs");
  type(within(panel()).getByLabelText("Price per share ($)"), CASE_27_PRICE);
  type(within(panel()).getByLabelText("Amount raised ($)"), "8,000,000");
  type(within(panel()).getByLabelText("Option pool after the round (% of the company)"), "10");
  type(within(panel()).getByLabelText("The round's date"), "2025-12-01");
  type(within(panel()).getByLabelText("How the new series ranks against the earlier series"), "senior");
}

describe("an import: Larkspur, with a trial at case 27's Series B price", () => {
  it("says what each SAFE and the note convert into, as case 27 has them", async () => {
    await importLarkspur();
    openTab("SAFEs");
    expect(within(panel()).getByText(/^Two SAFEs and one convertible note are outstanding on the cap table the payouts use\./)).toBeTruthy();
    expect(within(panel()).getByText("Give the round's price per share and the amount it raises.")).toBeTruthy();
    typeCase27SeriesB();

    const round = lines(within(panel()).getByRole("heading", { name: "The round" }).nextElementSibling as HTMLElement);
    expect(round[0]).toBe(
      "At $2.700764 a share, the $8,000,000 buys 2,962,124 shares of Series B Preferred. The price implies a $50,000,000 pre-money valuation, $58,000,000 post-money, on the fully diluted shares the round is priced on.",
    );
    expect(round[1]).toBe("The pool is topped up by 887,540 shares, to 10% of the company after the round. The top-up comes before the new money, so it dilutes only the holders before the round.");

    const x = lines(item("Investor X's SAFE"));
    expect(x[2]).toMatch(/converts at the lower of the two, its cap price \(the cap on a tie\): 367,202 shares of Series B Preferred \(from SAFEs\), rounded down to whole shares\./);
    // The SAFEs' cap price can move with the price, since the note beside them counts in their capitalization (R33).
    expect(x[4]).toMatch(/^Its cap price can move with the round's price here: the company capitalization counts the notes and other SAFEs converting beside it/);
    const note = lines(item("Investor N's note"));
    // Case 27's note: a $10,000,000 cap on its 16,451,250 base shares, with the pool (its expected.json's base_shares).
    expect(note[0]).toBe("Its cap price is $0.607857: its $10,000,000 cap ÷ the 16,451,250 shares just before the round, counting the unissued pool, as the note's terms count them.");
    expect(note[2]).toMatch(/440,082 shares of Series B Preferred \(from notes\)/);
    // Its base, the shares just before the round, is the same at any price: its cap takes over at its cap price ÷ (1 − its discount).
    expect(note[4]).toMatch(/^At \$\d+\.\d+ a share or more, its cap sets its price; below that, (its discount does|it converts at the round's own price)\.$/);
  });

  it(
    "shows the payouts after the round, as buildCapTables and solve pay them, without saving them, and goes back",
    async () => {
      await importLarkspur();
      typeCase27SeriesB();
      click("See the payouts after this round");
      const payouts = document.getElementById("panel-payouts")!;
      expect(screen.getByRole("tab", { name: "Payouts" }).getAttribute("aria-selected")).toBe("true");
      expect(within(payouts).getByText(/^These are the payouts after the trial round on the SAFEs tab:/).parentElement!.textContent).toContain(
        "Series B Preferred, $8,000,000 at $2.700764 a share. It isn't saved, or added to your rounds.",
      );
      await within(payouts).findByRole("heading", { name: "Breakpoints" }, { timeout: ANALYSIS_TIMEOUT });

      // The same round, built by the engine on Larkspur's import: buildCapTables, then solve at the page's exit value.
      const files = readdirSync(resolve(cases, "ocf-01-larkspur/package")).map((f) => ({ name: f, content: caseJson("ocf-01-larkspur/package", f) }));
      const imported = readOcf(files);
      const table = imported.cap_table as Json & { securities: Json[]; unconverted_notes: Json[] };
      const filled = {
        ...table,
        securities: table.securities.map((s) => (s.id === "cls-seed" ? { ...s, participation: "non_participating", cap_multiple: null } : s)),
        unconverted_notes: table.unconverted_notes.map((n) => ({ ...n, repayment_multiple: "1" })),
      };
      const base = trialBase(draftFromExit({ cap_table: filled, range: ["0", "1"] }), { date: imported.as_of, issueOrder: imported.issue_order }, null);
      if (!base.ok) throw new Error(base.message);
      const trial = runTrial(base.base, { by: "price", price: CASE_27_PRICE, preMoney: "", amount: "8000000", poolTarget: "10", date: "2025-12-01", rank: "senior" });
      if (!trial.ok) throw new Error(trial.message);
      const after = buildCapTables({ holders: trial.rounds.holders, events: trial.rounds.events }).at(-1)!.capTable;
      const exitValue = parseDollars((screen.getByRole("textbox", { name: "Exit value" }) as HTMLInputElement).value)!;
      const engine = paid(solve(prepare(after, "2026-06-30"), exitValue).answers[0]!.payout.lines).holderTotals;
      const shown = within(payouts).getByRole("table");
      for (const h of after.holders) {
        const row = within(shown).queryByText(h.name)?.closest("tr");
        if (!engine.get(h.id)) continue;
        expect(row?.textContent, h.name).toContain(dollarsAndCents(engine.get(h.id)!));
      }
      expect(within(shown).getByText("New investors")).toBeTruthy();

      // Nothing was saved, and the way back is the cap table's own payouts, with no new investors in them.
      expect(downloads).toBe(0);
      click("Back to your cap table's payouts");
      expect(within(payouts).queryByText(/^These are the payouts after the trial round/)).toBeNull();
      expect(within(within(payouts).getByRole("table")).queryByText("New investors")).toBeNull();
    },
    60_000,
  );
});

describe("a company built from its rounds: Millrace, its payouts on the table before its Seed", () => {
  it("converts its two SAFEs as its Seed does", () => {
    render(<App />);
    openTab("Rounds");
    type(screen.getByLabelText("The payouts use the cap table after"), "grants_at_pool_creation");
    openTab("SAFEs");
    const seed = caseJson("millrace", "expected.json").cap_tables.find((t: Json) => t.after_event === "seed").details;
    type(within(panel()).getByLabelText("Price per share ($)"), String(seed.price_per_share));
    type(within(panel()).getByLabelText("Amount raised ($)"), "2500000");
    type(within(panel()).getByLabelText("Option pool after the round (% of the company)"), "18");
    expect(lines(item("Priya Shah's SAFE"))[2]).toMatch(/779,362 shares of Series A Preferred \(from SAFEs\)/);
    expect(lines(item("Marcus Lee's SAFE"))[2]).toMatch(/389,681 shares of Series A Preferred \(from SAFEs\)/);
    // Nothing but post-money SAFEs converts, so their capitalization is the same at any price, and so is their cap price.
    expect(lines(item("Priya Shah's SAFE"))[4]).toBe("At $0.384930 a share or more, its cap sets its price; below that, it converts at the round's own price.");
  });

  it("says when nothing is outstanding to convert", () => {
    render(<App />);
    openTab("SAFEs");
    expect(within(panel()).getByText(/^No SAFE or convertible note is outstanding on the cap table the payouts use/)).toBeTruthy();
  });
});

describe("a cap table entered directly: edge-12b's", () => {
  function openEdge12b() {
    render(<App />);
    const exit = caseJson("edge-12b-safe-cap-and-discount", "inputs.json").exit;
    const file = JSON.stringify({ format: "spillpoint", version: 7, name: "Edge 12b", cap_table: exit.cap_table, range: exit.range });
    fireEvent.change(screen.getByLabelText("Open a saved cap table"), { target: { files: [new File([file], "edge-12b.json", { type: "application/json" })] } });
  }

  it("gives its SAFE's two prices, and where its cap takes over: its cap price ÷ (1 − its discount)", async () => {
    openEdge12b();
    await screen.findByText("Opened edge-12b.json.");
    openTab("SAFEs");
    type(within(panel()).getByLabelText("Price per share ($)"), "1.00");
    type(within(panel()).getByLabelText("Amount raised ($)"), "$5M");
    const x = lines(item("Investor X's SAFE"));
    // Capitalization: 9,000,000 common, 500,000 options and the 1,000,000 pool, ÷ (1 − $1,000,000 ÷ $10,000,000), 11,666,666.67.
    expect(x[0]).toBe(
      "Its cap price is $0.857143: its $10,000,000 cap ÷ the company capitalization just before the round, 11,666,666.67 shares. As the YC post-money SAFE counts it, that includes the SAFEs themselves and the pool before this round's increase, and leaves out the new money.",
    );
    expect(x[1]).toBe("Its discount price is $0.80: the round's $1.00 less its 20% discount.");
    expect(x[2]).toMatch(/^Its \$1,000,000 converts at the lower of the two, its discount price \(the cap on a tie\): 1,250,000 shares/);
    expect(x[4]).toBe("At $1.071429 a share or more, its cap sets its price; below that, its discount does.");
    // At $2.00, above that, its cap does.
    type(within(panel()).getByLabelText("Price per share ($)"), "2");
    expect(lines(item("Investor X's SAFE"))[2]).toMatch(/its cap price \(the cap on a tie\)/);
  });

  it("asks for what it needs, in plain words, and says nothing of whether the round is a good one", async () => {
    openEdge12b();
    await screen.findByText("Opened edge-12b.json.");
    openTab("SAFEs");
    type(within(panel()).getByLabelText("Price per share ($)"), "abc");
    type(within(panel()).getByLabelText("Amount raised ($)"), "5000000");
    expect(within(panel()).getByText("Give the round's price per share, more than zero.")).toBeTruthy();
    fireEvent.click(within(panel()).getByLabelText("Its pre-money valuation"));
    type(within(panel()).getByLabelText("Pre-money valuation ($)"), "20M");
    expect(lines(item("Investor X's SAFE")).length).toBe(5);
    expect(panel().textContent).not.toMatch(/\b(good|bad|better|worse|should|recommend|deal|fair|favou?rable|advice)\b/i);
  });
});

describe("the tabs", () => {
  it("are four, the SAFEs tab last, reached by the arrow keys", () => {
    render(<App />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Payouts", "Cap table", "Rounds", "SAFEs"]);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Payouts" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "SAFEs" }).getAttribute("aria-selected")).toBe("true");
  });
});
