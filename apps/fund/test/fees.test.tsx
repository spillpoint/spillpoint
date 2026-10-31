// The page's management fees (plan, "0.4.0: management fees", f04c): fees entered as fee calls or a schedule on the
// Terms tab, the schedule's calls on Cash flows, a Fee row with a schedule, the paste, saving and opening, a schedule
// typed in from a blank fund, and the fund-32 refusals in the page's words.

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, findBreakpoints, readFund } from "spillpoint-fund";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { readFile } from "../src/file.ts";
import { FEE_ROW } from "../src/flows.ts";
import { readPaste } from "../src/paste.ts";
import { controlFor } from "../src/terms.ts";
import { openFile, status } from "./support/files.ts";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseText = (dir: string) => readFileSync(resolve(casesDir, dir, "inputs.json"), "utf8");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));

// Saving makes a file: kept here instead, with the name it was given.
let downloads: { name: string; blob: Blob }[] = [];
let lastBlob: Blob | null = null;
beforeEach(() => {
  downloads = [];
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => ((lastBlob = blob), "blob:made") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, blob: lastBlob! });
  });
});
afterEach(() => vi.restoreAllMocks());

const pick = (id: string) => fireEvent.change(screen.getByLabelText("Start from"), { target: { value: id } });
const tab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (role: "radio" | "checkbox" | "button", name: string | RegExp) => fireEvent.click(screen.getByRole(role, { name }));
/** A picker set to the option with this text. */
const choose = (label: string | RegExp, text: string) => {
  const select = screen.getByLabelText(label) as HTMLSelectElement;
  const option = [...select.options].find((o) => o.textContent === text);
  expect(option, `${text} in ${label}`).toBeDefined();
  fireEvent.change(select, { target: { value: option!.value } });
};
const options = (label: string | RegExp) => [...(screen.getByLabelText(label) as HTMLSelectElement).options].map((o) => o.textContent);
const chosen = (label: string | RegExp) => (screen.getByLabelText(label) as HTMLSelectElement).selectedOptions[0]!.textContent;
const value = (label: string | RegExp) => (screen.getByLabelText(label) as HTMLInputElement).value;
const checked = (label: string | RegExp) => (screen.getByLabelText(label) as HTMLInputElement).checked;
const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));
const saved = async () => JSON.parse(await downloads.at(-1)!.blob.text());
/** The problem under a field: its words, read through the field's own description. */
const problemUnder = (label: string | RegExp) => {
  const field = screen.getByLabelText(label);
  expect(field.getAttribute("aria-invalid"), `${label} is marked`).toBe("true");
  return document.getElementById(field.getAttribute("aria-describedby")!)!.textContent;
};
/** A table as shown: each row's header and cells. */
const rowsOf = (table: Element) => [...table.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th, td")].map((c) => c.textContent));
const scheduleCard = () => screen.getByRole("region", { name: "The schedule's fee calls" });
const payoutsNotice = () => screen.getByText(/^Your last change to the/).closest(".notice")!.textContent;

describe("the Terms tab's management fee", () => {
  it("starts on fees entered as fee calls, with its one line and no schedule", () => {
    render(<App />);
    tab("Terms");
    expect(checked("Entered as fee calls")).toBe(true);
    expect(screen.getByText("Enter each fee call on the Cash flows tab as a call of kind Fee. Fees are paid-in capital, returned to the LPs first.")).toBeDefined();
    expect(screen.queryByLabelText("Fees start on")).toBeNull();
  });

  it("switches to a schedule: from the fund's first call, called quarterly, its first rate 2% and selected", () => {
    render(<App />);
    pick("fund-19-lps-clawback");
    tab("Terms");
    click("radio", "A schedule");
    expect([value("Fees start on"), chosen("Called"), value("Fee rate step 1")]).toEqual(["2020-01-01", "Quarterly", "2"]);
    expect(options("Called")).toEqual(["Quarterly", "Half-yearly", "Yearly"]);
    expect(document.activeElement).toBe(screen.getByLabelText("Fee rate step 1"));
    expect(screen.getByText("Fees are worked out from the LPs' commitments, called in advance on calendar periods; the first period runs from the start date.")).toBeDefined();
    // The fund lists its LPs, so their commitments are the base.
    expect(screen.queryByLabelText("The LPs' total commitments")).toBeNull();
  });

  it("takes the management fee rate away with a schedule, and brings back what was typed in it without one", () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    tab("Terms");
    expect(value("Management fee rate")).toBe("2");
    expect(screen.getByText("Needed only when a class has its own fee rate. It divides the fee calls between the classes and charges nothing itself.")).toBeDefined();
    click("radio", "A schedule");
    expect(screen.queryByLabelText("Management fee rate")).toBeNull();
    // The classes on the LPs tab say what a class's rate is set against.
    tab("LPs");
    expect(screen.getByText("Blank: the schedule's rates. A class's rate is set against its first rate.")).toBeDefined();
    tab("Terms");
    click("radio", "Entered as fee calls");
    expect(value("Management fee rate")).toBe("2");
    tab("LPs");
    expect(screen.getByText("Blank: the fund's fees.")).toBeDefined();
  });

  it("adds and removes a step, each later one in force from a date", () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    tab("Terms");
    expect([value("Fee rate step 1"), value("Fee rate step 2"), value("Fee rate step 2 is in force from")]).toEqual(["2", "1.5", "2026-02-15"]);
    click("button", "Add a fee rate step");
    expect([value("Fee rate step 3"), value("Fee rate step 3 is in force from")]).toEqual(["", ""]);
    click("button", "Remove fee rate step 3");
    expect(screen.queryByLabelText("Fee rate step 3")).toBeNull();
    // The first has no date and no Remove: it's in force from the start.
    expect(screen.queryByLabelText("Fee rate step 1 is in force from")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove fee rate step 1" })).toBeNull();
  });

  it("asks for the LPs' total commitments only when the fund lists no LPs", () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    tab("Terms");
    expect(value("The LPs' total commitments")).toBe("$40,000,000");
    pick("fund-26-closes-and-classes");
    tab("Terms");
    click("radio", "A schedule");
    expect(screen.queryByLabelText("The LPs' total commitments")).toBeNull();
  });
});

describe("the schedule's fee calls, on Cash flows", () => {
  it("lists case 29's 22 calls, $100,000.00 first and $150,000.00 last, $4,225,000.00 in all; it pays no GP part", () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    tab("Cash flows");
    const rows = rowsOf(within(scheduleCard()).getByRole("table"));
    expect(rows[0]).toEqual(["Date", "Covers", "Call"]);
    const calls = rows.slice(1, -1);
    expect(calls).toHaveLength(22);
    expect(calls[0]).toEqual(["15 Feb 2021", "15 Feb 2021 to 31 Mar 2021", "$100,000.00"]);
    expect(calls.at(-1)).toEqual(["1 Apr 2026", "1 Apr 2026 to 30 Jun 2026", "$150,000.00"]);
    expect(rows.at(-1)).toEqual(["Total", "22 calls", "$4,225,000.00"]);
    expect(within(scheduleCard()).getByText("Worked out from the schedule on the Terms tab, and run as fee calls. They aren't rows of the table above.")).toBeDefined();
  });

  it("gives case 30's half-year with the step, $212,115.23, of it $4,242.30 the GP commitment's", async () => {
    render(<App />);
    await openFile(caseText("fund-30-fee-step-down"));
    tab("Cash flows");
    const rows = rowsOf(within(scheduleCard()).getByRole("table"));
    expect(rows[0]).toEqual(["Date", "Covers", "Call", "The GP commitment's part"]);
    expect(rows.find((r) => r[0] === "1 Jan 2022")).toEqual(["1 Jan 2022", "1 Jan 2022 to 30 Jun 2022", "$212,115.23", "$4,242.30"]);
  });

  it("says when fees start after D, and that the calls wait while the fund can't run", () => {
    render(<App />);
    pick("fund-19-lps-clawback");
    tab("Terms");
    click("radio", "A schedule");
    type("Fees start on", "2030-01-01");
    tab("Cash flows");
    expect(within(scheduleCard()).getByText("No fee call yet: fees start on 1 Jan 2030.")).toBeDefined();
    tab("Terms");
    type("Fees start on", "");
    tab("Cash flows");
    expect(within(scheduleCard()).getByText("The schedule's fee calls show here once the fund can run.")).toBeDefined();
  });

  it("isn't there with fees entered as fee calls", () => {
    render(<App />);
    tab("Cash flows");
    expect(screen.queryByRole("region", { name: "The schedule's fee calls" })).toBeNull();
  });

  it("counts the schedule's calls among the calls paid in, in the line under the picker", () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    expect(document.querySelector(".example-label")!.textContent).toBe("This fund: $34.2M paid in over 25 calls (22 from its fee schedule) and $24M distributed before X. X isn't its last distribution.");
  });
});

describe("the headline's terms line", () => {
  const termsLine = () => document.querySelector(".headline__terms")!.textContent;

  it("names case 29's schedule after the GP commitment, each step with its date", () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    expect(termsLine()).toBe("Carry 20%; pref 8%, full catch-up; GP commitment 1%, fee-free; management fee 2% a year from 15 Feb 2021, 1.5% from 15 Feb 2026, called quarterly.");
  });

  it("names case 30's, called half-yearly, its GP commitment paying its share of fees", async () => {
    render(<App />);
    await openFile(caseText("fund-30-fee-step-down"));
    expect(termsLine()).toBe(
      "Carry 20%; pref 8%, full catch-up; GP commitment 2%, paying its share of fees; management fee 2% a year from 1 Jul 2020, 1.5% from 1 Mar 2022, called half-yearly.",
    );
  });

  it("names a schedule of one step by its start alone, and adds nothing for fees entered as calls", async () => {
    render(<App />);
    await openFile(caseText("fund-31-fee-schedule-classes-closes"));
    expect(termsLine()).toBe("Carry 20%; no pref; no GP commitment; management fee 2% a year from 1 Jan 2022, called quarterly. Anchor: carry 15%, fees at 1%. Friends and family: carry 0%, no fees.");
    pick("fund-26-closes-and-classes");
    expect(termsLine()).toBe("Carry 20%; no pref; no GP commitment. Friends and family: carry 0%, no fees.");
  });
});

describe("a Fee row with a schedule", () => {
  it("is a problem under each of case 26's two Fee rows once it has a schedule, and Fee isn't offered for the others", () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    tab("Terms");
    click("radio", "A schedule");
    tab("Cash flows");
    expect([problemUnder("Row 2's kind"), problemUnder("Row 4's kind")]).toEqual([FEE_ROW, FEE_ROW]);
    expect(FEE_ROW).toBe("This fund's fees come from its schedule. Remove this row, or set Management fee to Entered as fee calls.");
    expect(options("Row 1's kind")).toEqual(["Investment", "Expense"]);
    expect(options("Row 2's kind")).toEqual(["Investment", "Fee", "Expense"]);
    // "Show me" goes to the first.
    fireEvent.click(within(screen.getByRole("tabpanel", { name: "Cash flows" })).getByRole("button", { name: "Show me" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Row 2's kind"));
    tab("Payouts");
    expect(payoutsNotice()).toContain(FEE_ROW);
    // A new row after a Fee row is an investment.
    tab("Cash flows");
    click("button", "Add a cash flow");
    expect(chosen("Row 5's kind")).toBe("Investment");
    // Fees entered as fee calls again: no problem.
    tab("Terms");
    click("radio", "Entered as fee calls");
    tab("Cash flows");
    expect(screen.getByLabelText("Row 2's kind").getAttribute("aria-invalid")).toBe("false");
  });

  it("is a row a paste can't read, with the same reason", () => {
    const paste = "2022-01-01\tCall\tInvestment\t1000000\n2022-01-01\tCall\tFee\t100000";
    expect(readPaste(paste, "month-first", true).unread).toEqual(["Row 2: this fund's fees come from its schedule; set Management fee to Entered as fee calls to add fee calls"]);
    expect(readPaste(paste, "month-first", false).rows.map((r) => r.kind)).toEqual(["investment", "fee"]);
  });

  it("is a row the paste box can't read with a schedule, said under the box", () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    tab("Cash flows");
    click("button", "Paste rows from a spreadsheet");
    fireEvent.change(screen.getByRole("textbox", { name: /paste/i }), { target: { value: "2022-01-01\tCall\tFee\t100000" } });
    expect(within(screen.getByRole("list", { name: "Rows it can't read" })).getByRole("listitem").textContent).toBe(
      "Row 1: this fund's fees come from its schedule; set Management fee to Entered as fee calls to add fee calls.",
    );
  });
});

describe("saving and opening a schedule", () => {
  it("saves case 29's with its commitments, the first step without a date", async () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    save();
    expect((await saved()).fund.terms.management_fee).toEqual({
      start: "2021-02-15",
      frequency: "quarterly",
      steps: [{ rate: "0.02" }, { rate: "0.015", from: "2026-02-15" }],
      commitments: "40000000",
    });
  });

  it("saves case 31's without commitments, since it lists its LPs, and its frequency written out", async () => {
    render(<App />);
    await openFile(caseText("fund-31-fee-schedule-classes-closes"));
    save();
    const terms = (await saved()).fund.terms;
    expect(terms.management_fee).toEqual({ start: "2022-01-01", frequency: "quarterly", steps: [{ rate: "0.02" }] });
    expect(terms).not.toHaveProperty("fee_rate");
  });

  it("opens a schedule with commitments beside listed LPs, which are their total, and saves it without them", async () => {
    const input = caseFile("fund-30-fee-step-down", "inputs.json").fund;
    render(<App />);
    await openFile(JSON.stringify({ ...input, terms: { ...input.terms, management_fee: { ...input.terms.management_fee, commitments: "25000000" } } }), "thirty.json");
    expect(status()).toBe("Opened thirty.json.");
    save();
    expect((await saved()).fund.terms.management_fee).not.toHaveProperty("commitments");
  });

  it("opens a null schedule as fees entered as fee calls", async () => {
    const input = caseFile("fund-19-lps-clawback", "inputs.json").fund;
    render(<App />);
    await openFile(JSON.stringify({ ...input, terms: { ...input.terms, management_fee: null } }), "null.json");
    expect(status()).toBe("Opened null.json.");
    tab("Terms");
    expect(checked("Entered as fee calls")).toBe(true);
  });
});

describe("case 30, typed in from a blank fund with the schedule form", () => {
  it("owes back $150,000.00 at X = 0, as the case does, and saves case 30's fund", async () => {
    render(<App />);
    pick("blank");
    tab("Cash flows");
    type("As of", "2027-03-31");
    click("checkbox", "This is the fund's last distribution");
    const flows: [string, string, string | null, string][] = [
      ["2020-07-01", "Call", "Investment", "10000000"],
      ["2021-09-15", "Call", "Investment", "8000000"],
      ["2023-06-30", "Distribution", null, "12000000"],
      ["2025-03-31", "Distribution", null, "20000000"],
    ];
    flows.forEach(([date, kind, callKind, amount], i) => {
      if (i > 0) click("button", "Add a cash flow");
      type(`Row ${i + 1}'s date`, date);
      choose(`Row ${i + 1}'s type`, kind);
      if (callKind) choose(`Row ${i + 1}'s kind`, callKind);
      type(`Row ${i + 1}'s amount`, amount);
    });
    tab("LPs");
    for (const [i, [name, commitment]] of [
      ["Alder Endowment", "15000000"],
      ["Birchwood Family Office", "10000000"],
    ].entries()) {
      click("button", "Add an LP");
      type(`LP ${i + 1}'s name`, name!);
      type(`LP ${i + 1}'s commitment`, commitment!);
    }
    tab("Terms");
    click("checkbox", "A preferred return");
    type("Rate a year, simple", "8");
    click("radio", "Full");
    click("checkbox", "A GP commitment");
    type("Its share of the fund", "2");
    click("checkbox", "Pays its share of fees");
    click("radio", "A schedule");
    expect(value("Fees start on")).toBe("2020-07-01");
    choose("Called", "Half-yearly");
    click("button", "Add a fee rate step");
    type("Fee rate step 2", "1.5");
    type("Fee rate step 2 is in force from", "2022-03-01");
    expect(screen.queryByText("The fund can't run as it is.")).toBeNull();
    tab("Payouts");
    const clawback = screen.getByRole("region", { name: "The clawback" });
    expect(clawback.textContent).toContain("owes $150,000.00 back to the LPs");
    // The fund the form wrote is case 30's, value for value, with the same breakpoints.
    save();
    const values = (input: unknown) => {
      const fund = readFund(input);
      return { fund: JSON.parse(JSON.stringify(fund, (_, v) => (v instanceof D ? v.toString() : v))), breakpoints: findBreakpoints(fund).map((b) => b.x.toString()) };
    };
    expect(values((await saved()).fund)).toEqual(values(caseFile("fund-30-fee-step-down", "inputs.json").fund));
  });
});

describe("the fund-32 refusals, in the page's words", () => {
  const dir = "fund-32-fees-refused";
  const fixtures = readdirSync(resolve(casesDir, dir, "fixtures")).sort();
  const fixture = (file: string) => caseFile(`${dir}/fixtures`, file) as { base: string; change: { set?: Record<string, unknown>; del?: string } };
  const rate = 'isn\'t a number the page can use: it\'s a rate from 0 up to, not including, 1, the first above 0, written as an exact string like "0.02".';
  const order = ": each step's date must come after the one before it, and the first has none of its own.";
  const commitmentsAmount = 'Its management fee\'s total commitments aren\'t an amount the page can use: they\'re an exact string more than zero, like "40000000".';
  const offset = "This file has a term the page doesn't model: `offset` on its management fee schedule. A schedule has a start date, how often it's called, its rates by date and the LPs' total commitments.";
  const feeRate = "Its management fee rate: with a schedule, the schedule's first rate is the fund's, so there's no rate of its own.";
  const frequency = "Its management fee's frequency isn't one the page knows: it's quarterly, semiannual or annual.";
  const rateNeeded = "Its equalization interest rate is missing: it's needed when an investment or expense call comes before a later close.";
  const WORDS: Record<string, string> = {
    "class-fee-rate-without-fee-terms.json": "Its management fee rate is missing: it's needed when a class has its own fee rate.",
    "distribution-before-schedule.json": "Row 6 of its cash flows: this distribution is before the fund's first call.",
    "fee-call-with-schedule.json": "Row 5 of its cash flows: it's a fee call, and this fund's fees come from its schedule.",
    "fee-commitments-missing.json": "Its management fee's total commitments are missing: they're needed when the fund lists no LPs.",
    "fee-commitments-not-a-number.json": commitmentsAmount,
    "fee-commitments-not-the-lps-total.json": "Its management fee schedule: its commitments for the schedule aren't the LPs' total.",
    "fee-commitments-zero.json": commitmentsAmount,
    "fee-first-rate-zero.json": `Fee rate step 1's rate ${rate}`,
    "fee-first-step-from.json": `Fee rate step 1${order}`,
    "fee-frequency-monthly.json": frequency,
    "fee-rate-with-schedule.json": feeRate,
    "fee-schedule-not-an-object.json": "Its management fee schedule isn't a value it can take.",
    "fee-schedule-offset.json": offset,
    "fee-start-missing.json": "Its management fee's start date is missing.",
    "fee-start-not-a-date.json": "Its management fee's start date isn't a date that exists, written YYYY-MM-DD.",
    // From 0.6.0 a step's basis is read (F40): case 29's step on invested capital needs investments it doesn't list.
    "fee-step-basis.json": "Its list of investments is missing: it's needed for a management fee on invested capital.",
    "fee-step-from-at-start.json": `Fee rate step 2${order}`,
    "fee-step-from-missing.json": "Fee rate step 2's date is missing.",
    "fee-step-from-not-a-date.json": "Fee rate step 2's date isn't a date that exists, written YYYY-MM-DD.",
    "fee-step-not-an-object.json": "Fee rate step 1 isn't a value it can take.",
    "fee-step-rate-missing.json": "Fee rate step 2's rate is missing.",
    "fee-step-rate-negative.json": `Fee rate step 2's rate ${rate}`,
    "fee-step-rate-not-a-number.json": `Fee rate step 1's rate ${rate}`,
    "fee-step-rate-one.json": `Fee rate step 1's rate ${rate}`,
    "fee-steps-empty.json": "Its management fee's list of rates isn't a value it can take.",
    "fee-steps-missing.json": "Its management fee's list of rates is missing.",
    "fee-steps-not-a-list.json": "Its management fee's list of rates isn't a value it can take.",
    "fee-steps-out-of-order.json": `Fee rate step 3${order}`,
    "later-close-without-rate.json": rateNeeded,
    "order-commitments-after-lps.json": "The close in row 2 of its LPs isn't a date that exists, written YYYY-MM-DD.",
    "order-fee-call-before-lps.json": "Row 5 of its cash flows: it's a fee call, and this fund's fees come from its schedule.",
    "order-fee-call-first-in-cash-flows.json": "Row 6 of its cash flows: it's a fee call, and this fund's fees come from its schedule.",
    "order-fee-rate-before-classes.json": feeRate,
    "order-rate-before-commitments.json": rateNeeded,
    "order-schedule-before-fee-rate.json": frequency,
    "order-unsupported-before-fields.json": offset,
    "schedule-without-payers.json": "Its management fee schedule: no LP pays it, as every LP is in a class at a fee rate of 0.",
  };

  /** The fixture's change, made to its base's input: `set` and `del` at dotted paths with [i], appending at a list's end (FC12). */
  function changed(file: string): unknown {
    const f = fixture(file);
    const input = structuredClone(caseFile(f.base, "inputs.json").fund);
    const steps = (path: string) => path.split(/\.|\[(\d+)\]/).filter((s) => s !== undefined && s !== "").map((s) => (/^\d+$/.test(s) ? Number(s) : s));
    const walk = (path: string) => {
      const keys = steps(path);
      let at: Record<string | number, unknown> = input;
      for (const k of keys.slice(0, -1)) at = at[k] as Record<string | number, unknown>;
      return [at, keys.at(-1)!] as const;
    };
    for (const [path, v] of Object.entries(f.change.set ?? {})) {
      const [at, key] = walk(path);
      at[key] = v;
    }
    if (f.change.del) {
      const [at, key] = walk(f.change.del);
      delete at[key];
    }
    return input;
  }

  it("has words for every fixture", () => {
    expect(Object.keys(WORDS).sort()).toEqual(fixtures);
  });

  it.each(fixtures)("%s, opened as a file, is refused in one line", (file) => {
    const result = readFile(JSON.stringify(changed(file)));
    expect(result.ok ? "opened" : result.message).toBe(WORDS[file]);
  });

  // The eighteen the form can make, each made on its base's tabs as the fixture has it, and where its words show.
  // `control`: where the page shows it, when that isn't the control the fixture's path names: a Fee row's problem is at
  // its kind, which is what makes it one, and the investments a step on invested capital needs are under its On (F40).
  const FORM: Record<string, { make: () => void; under: string; words: string; control?: string }> = {
    "fee-start-missing.json": { make: () => (tab("Terms"), type("Fees start on", "")), under: "Fees start on", words: "Choose the date fees start on." },
    "fee-step-rate-missing.json": {
      make: () => (tab("Terms"), type("Fee rate step 2", "")),
      under: "Fee rate step 2",
      words: "Write the fee rate as a percent a year, 0 or more and below 100: 2 or 1.5.",
    },
    "fee-step-rate-not-a-number.json": {
      make: () => (tab("Terms"), type("Fee rate step 1", "2 percent")),
      under: "Fee rate step 1",
      words: "Write the fee rate as a percent a year, 0 or more and below 100: 2 or 1.5.",
    },
    "fee-step-rate-negative.json": {
      make: () => (tab("Terms"), type("Fee rate step 2", "-0.5")),
      under: "Fee rate step 2",
      words: "Write the fee rate as a percent a year, 0 or more and below 100: 2 or 1.5.",
    },
    "fee-step-rate-one.json": {
      make: () => (tab("Terms"), type("Fee rate step 1", "100")),
      under: "Fee rate step 1",
      words: "Write the fee rate as a percent a year, 0 or more and below 100: 2 or 1.5.",
    },
    "fee-first-rate-zero.json": {
      make: () => (tab("Terms"), type("Fee rate step 1", "0")),
      under: "Fee rate step 1",
      words: "The first rate must be above 0. To start fees later, change the start date.",
    },
    "fee-step-from-missing.json": {
      make: () => (tab("Terms"), type("Fee rate step 2 is in force from", "")),
      under: "Fee rate step 2 is in force from",
      words: "Choose the date this rate is in force from.",
    },
    "fee-step-from-at-start.json": {
      make: () => (tab("Terms"), type("Fee rate step 2 is in force from", "2020-07-01")),
      under: "Fee rate step 2 is in force from",
      words: "Each step's date must come after the one before it.",
    },
    "fee-steps-out-of-order.json": {
      make: () => {
        tab("Terms");
        click("button", "Add a fee rate step");
        type("Fee rate step 3", "1");
        type("Fee rate step 3 is in force from", "2021-06-30");
      },
      under: "Fee rate step 3 is in force from",
      words: "Each step's date must come after the one before it.",
    },
    "fee-commitments-zero.json": {
      make: () => (tab("Terms"), type("The LPs' total commitments", "0")),
      under: "The LPs' total commitments",
      words: "Write the LPs' total commitments in dollars, more than zero: 40000000 or $40M.",
    },
    "fee-commitments-not-a-number.json": {
      make: () => (tab("Terms"), type("The LPs' total commitments", "forty million")),
      under: "The LPs' total commitments",
      words: "Write the LPs' total commitments in dollars, more than zero: 40000000 or $40M.",
    },
    "fee-commitments-missing.json": {
      make: () => (tab("Terms"), type("The LPs' total commitments", "")),
      under: "The LPs' total commitments",
      words: "Needed: the fund lists no LPs, so the fee is on this total.",
    },
    "class-fee-rate-without-fee-terms.json": {
      make: () => (tab("Terms"), click("radio", "Entered as fee calls")),
      under: "Management fee rate",
      words: "Needed: a class has its own fee rate.",
    },
    "fee-call-with-schedule.json": {
      // Fee isn't a kind to choose with a schedule: the row is made with fees entered, then the schedule chosen again.
      make: () => {
        tab("Terms");
        click("radio", "Entered as fee calls");
        tab("Cash flows");
        click("button", "Add a cash flow");
        type("Row 5's date", "2021-01-01");
        choose("Row 5's type", "Call");
        choose("Row 5's kind", "Fee");
        type("Row 5's amount", "250000");
        tab("Terms");
        click("radio", "A schedule");
        tab("Cash flows");
      },
      under: "Row 5's kind",
      words: FEE_ROW,
      control: "cash_flows[4].kind",
    },
    "distribution-before-schedule.json": {
      make: () => {
        tab("Cash flows");
        click("button", "Add a cash flow");
        type("Row 6's date", "2021-01-31");
        type("Row 6's amount", "1000000");
      },
      under: "Row 6's date",
      words: "This distribution is before the fund's first call.",
    },
    "fee-step-basis.json": {
      make: () => (tab("Terms"), choose("Fee rate step 2 is on", "Invested capital")),
      under: "Fee rate step 2 is on",
      words: "A fee on invested capital needs the fund's investments. Add them on the Investments tab.",
      control: "terms.management_fee.steps[1].basis",
    },
    "later-close-without-rate.json": {
      make: () => (tab("Terms"), type("Equalization interest rate", "")),
      under: "Equalization interest rate",
      words: "Needed: an investment or expense call comes before a later close. Write 0 for none.",
    },
    "schedule-without-payers.json": {
      make: () => {
        tab("LPs");
        choose("LP 1's class", "Friends and family");
        type("Class 1's fee rate", "0");
        tab("Terms");
      },
      under: "A schedule",
      words: "No LP pays this schedule: every LP is in a class at a fee rate of 0.",
    },
  };

  it("makes eighteen in the form; the other nineteen only a file can make", () => {
    expect(Object.keys(FORM)).toHaveLength(18);
    expect(fixtures.filter((f) => !(f in FORM))).toEqual([
      "fee-commitments-not-the-lps-total.json",
      "fee-first-step-from.json",
      "fee-frequency-monthly.json",
      "fee-rate-with-schedule.json",
      "fee-schedule-not-an-object.json",
      "fee-schedule-offset.json",
      "fee-start-not-a-date.json",
      "fee-step-from-not-a-date.json",
      "fee-step-not-an-object.json",
      "fee-steps-empty.json",
      "fee-steps-missing.json",
      "fee-steps-not-a-list.json",
      "order-commitments-after-lps.json",
      "order-fee-call-before-lps.json",
      "order-fee-call-first-in-cash-flows.json",
      "order-fee-rate-before-classes.json",
      "order-rate-before-commitments.json",
      "order-schedule-before-fee-rate.json",
      "order-unsupported-before-fields.json",
    ]);
  });

  it.each(Object.keys(FORM))("%s, made in the form, shows beside its field, and its tab says so", async (file) => {
    const f = fixture(file);
    render(<App />);
    await openFile(caseText(f.base));
    const { make, under, words, control } = FORM[file]!;
    make();
    expect(problemUnder(under)).toBe(words);
    // The form's refusal is at the fixture's path: the field the words are under is the one that path names.
    const field = caseFile(dir, "expected.json").fixtures[file].refused.field as string;
    expect(screen.getByLabelText(under).id).toBe(control ?? controlFor(field));
    tab("Payouts");
    expect(payoutsNotice()).toContain(words);
  });
});
