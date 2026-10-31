// The page's fees on invested capital (plan, "0.6.0: fees on invested capital", f06c): each fee step's On on the Terms
// tab, the LPs' total commitments only with a step on commitments, the investments a step on invested capital needs,
// the fund's net invested capital and the note beside a distribution that names no investment on Cash flows, saving and
// opening each step's basis, case 38 in the picker, and the fund-41 refusals in the page's words.

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { feeCalls, readFund } from "spillpoint-fund";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { NAMES_NO_INVESTMENT } from "../src/CashFlows.tsx";
import { readFile } from "../src/file.ts";
import { FEE_ROW } from "../src/flows.ts";
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
const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));
const saved = async () => JSON.parse(await downloads.at(-1)!.blob.text());
/** The problem under a field: its words, read through the field's own description. */
const problemUnder = (label: string | RegExp) => {
  const field = screen.getByLabelText(label);
  expect(field.getAttribute("aria-invalid"), `${label} is marked`).toBe("true");
  return document.getElementById(field.getAttribute("aria-describedby")!)!.textContent;
};
const unmarked = (label: string | RegExp) => screen.getByLabelText(label).getAttribute("aria-invalid") === "false";
/** "Add an investment", on the Investments tab, where deal by deal's missing investments are (F37). */
const addInvestment = () => screen.getByRole("button", { name: "Add an investment", hidden: true });
/** A table as shown: each row's header and cells. */
const rowsOf = (table: Element) => [...table.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th, td")].map((c) => c.textContent));
const scheduleCard = () => screen.getByRole("region", { name: "The schedule's fee calls" });
const investedLine = () => within(scheduleCard()).queryByText(/^Net invested capital at /)?.textContent ?? null;
const payoutsNotice = () => screen.getByText(/^Your last change to the/).closest(".notice")!.textContent;
const termsPanel = () => screen.getByRole("tabpanel", { name: "Terms" });
const notes = () => [...document.querySelectorAll(".flows__note")].map((tr) => tr.textContent);
const breakpointXs = () =>
  within(screen.getByRole("region", { name: "Breakpoints" }))
    .getAllByRole("button")
    .map((b) => b.querySelector(".breakpoints__value")!.firstChild!.textContent!.trim());

const NEEDS_INVESTMENTS = "A fee on invested capital needs the fund's investments. Add them on the Investments tab.";
const LINE = "Invested capital is the cost of the fund's investments, less the cost of what it has exited or written off. Each day of a period counts at that day's invested capital.";
const worked = (from: string) => `Fees are worked out from ${from}, called in advance on calendar periods; the first period runs from the start date.`;

describe("each fee step's On, on the Terms tab", () => {
  it("shows case 38's two steps, on commitments then on invested capital, with the line under the steps", async () => {
    render(<App />);
    await openFile(caseText("fund-38-fees-on-invested-capital"));
    tab("Terms");
    expect([chosen("Fee rate step 1 is on"), chosen("Fee rate step 2 is on")]).toEqual(["Commitments", "Invested capital"]);
    expect(options("Fee rate step 1 is on")).toEqual(["Commitments", "Invested capital"]);
    // Beside the rate, each labelled On on screen.
    const step = within(termsPanel()).getByRole("list", { name: "The fee rates by date" }).querySelectorAll("li")[1]!;
    expect([...step.querySelectorAll("label")].map((l) => l.textContent)).toEqual(["Fee rate step 2", "On", "from"]);
    expect(within(termsPanel()).getByText(LINE)).toBeDefined();
    expect(within(termsPanel()).getByText(worked("the LPs' commitments or the fund's invested capital, as each step says"))).toBeDefined();
  });

  it("says what the fees are worked out from: case 29 commitments, case 40 invested capital", async () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    tab("Terms");
    expect(chosen("Fee rate step 2 is on")).toBe("Commitments");
    expect(within(termsPanel()).getByText(worked("the LPs' commitments"))).toBeDefined();
    // The line under the steps is there whatever they're on, so what Invested capital means is there before it's chosen.
    expect(within(termsPanel()).getByText(LINE)).toBeDefined();
    await openFile(caseText("fund-40-spv-fees-on-invested-capital"), "forty.json");
    tab("Terms");
    expect(within(termsPanel()).getByText(worked("the fund's invested capital"))).toBeDefined();
  });

  it("starts a step added on the basis of the step above it, its rate and date blank", async () => {
    render(<App />);
    await openFile(caseText("fund-38-fees-on-invested-capital"));
    tab("Terms");
    click("button", "Add a fee rate step");
    expect([chosen("Fee rate step 3 is on"), value("Fee rate step 3"), value("Fee rate step 3 is in force from")]).toEqual(["Invested capital", "", ""]);
  });

  it("starts a step added after a step on commitments on commitments", () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    tab("Terms");
    click("button", "Add a fee rate step");
    expect(chosen("Fee rate step 3 is on")).toBe("Commitments");
  });
});

describe("the LPs' total commitments", () => {
  it("are asked for in case 38, which lists no LPs and has a step on commitments", async () => {
    render(<App />);
    await openFile(caseText("fund-38-fees-on-invested-capital"));
    tab("Terms");
    expect(value("The LPs' total commitments")).toBe("$20,000,000");
  });

  it("are never asked for in case 40, wholly on invested capital, a step added included; a step on commitments asks", async () => {
    render(<App />);
    await openFile(caseText("fund-40-spv-fees-on-invested-capital"));
    tab("Terms");
    expect(screen.queryByLabelText("The LPs' total commitments")).toBeNull();
    click("button", "Add a fee rate step");
    expect(screen.queryByLabelText("The LPs' total commitments")).toBeNull();
    choose("Fee rate step 2 is on", "Commitments");
    expect(value("The LPs' total commitments")).toBe("");
  });

  it("are kept, out of the input, while every step is on invested capital, and come back with a step on commitments", async () => {
    render(<App />);
    await openFile(caseText("fund-38-fees-on-invested-capital"));
    tab("Terms");
    choose("Fee rate step 1 is on", "Invested capital");
    expect(screen.queryByLabelText("The LPs' total commitments")).toBeNull();
    expect(screen.queryByText("The fund can't run as it is.")).toBeNull();
    save();
    expect((await saved()).fund.terms.management_fee).not.toHaveProperty("commitments");
    choose("Fee rate step 1 is on", "Commitments");
    expect(value("The LPs' total commitments")).toBe("$20,000,000");
  });

  it("aren't asked for beside listed LPs, on either basis", async () => {
    render(<App />);
    await openFile(caseText("fund-39-invested-capital-deal-by-deal-classes"));
    tab("Terms");
    expect(chosen("Fee rate step 1 is on")).toBe("Commitments");
    expect(screen.queryByLabelText("The LPs' total commitments")).toBeNull();
  });
});

describe("a step on invested capital without investments", () => {
  it("shows the investments line under case 29's second step switched to Invested capital, and back to Commitments clears it", () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    tab("Terms");
    choose("Fee rate step 2 is on", "Invested capital");
    expect(problemUnder("Fee rate step 2 is on")).toBe(NEEDS_INVESTMENTS);
    expect(unmarked("Fee rate step 1 is on")).toBe(true);
    // At the top of the tab, with "Show me" to the step's On.
    fireEvent.click(within(termsPanel()).getByRole("button", { name: "Show me" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Fee rate step 2 is on"));
    tab("Payouts");
    expect(payoutsNotice()).toBe(`Your last change to the terms has a problem, so these payouts are from the fund before it. ${NEEDS_INVESTMENTS} Fix it`);
    tab("Terms");
    choose("Fee rate step 2 is on", "Commitments");
    expect(unmarked("Fee rate step 2 is on")).toBe(true);
    expect(screen.queryByText(NEEDS_INVESTMENTS)).toBeNull();
    expect(screen.queryByText("The fund can't run as it is.")).toBeNull();
  });

  it("is under every step on invested capital, and Show me goes to the first", () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    tab("Terms");
    choose("Fee rate step 2 is on", "Invested capital");
    click("button", "Add a fee rate step");
    type("Fee rate step 3", "1");
    type("Fee rate step 3 is in force from", "2027-02-15");
    expect([problemUnder("Fee rate step 2 is on"), problemUnder("Fee rate step 3 is on")]).toEqual([NEEDS_INVESTMENTS, NEEDS_INVESTMENTS]);
    fireEvent.click(within(termsPanel()).getByRole("button", { name: "Show me" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Fee rate step 2 is on"));
  });

  it("comes before deal by deal's, as the engine checks it first; deal by deal alone, it's under Add an investment", () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    tab("Terms");
    click("radio", "Deal by deal");
    expect(addInvestment().getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(addInvestment().getAttribute("aria-describedby")!)!.textContent).toBe("Deal by deal needs the fund's investments: add each one, with its checks.");
    choose("Fee rate step 2 is on", "Invested capital");
    expect(problemUnder("Fee rate step 2 is on")).toBe(NEEDS_INVESTMENTS);
    expect(addInvestment().getAttribute("aria-invalid")).toBe("false");
  });

  it("shows under case 40's one step when its investment is removed, and the Payouts notice names the investments", async () => {
    render(<App />);
    await openFile(caseText("fund-40-spv-fees-on-invested-capital"));
    tab("Investments");
    click("button", "Remove investment 1");
    expect(within(screen.getByRole("tabpanel", { name: "Investments" })).getByRole("status").textContent).toContain(NEEDS_INVESTMENTS);
    tab("Terms");
    expect(problemUnder("Fee rate step 1 is on")).toBe(NEEDS_INVESTMENTS);
    tab("Payouts");
    expect(payoutsNotice()).toContain("Your last change to the investments has a problem");
  });
});

describe("the schedule's fee calls and the fund's invested capital, on Cash flows", () => {
  it("lists case 38's 18 fee calls, the six on invested capital, $1,432,461.39 in all, and its invested capital at D", () => {
    render(<App />);
    pick("fund-38-fees-on-invested-capital");
    tab("Cash flows");
    const rows = rowsOf(within(scheduleCard()).getByRole("table"));
    expect(rows[0]).toEqual(["Date", "Covers", "Call"]);
    const calls = rows.slice(1, -1);
    expect(calls).toHaveLength(18);
    expect(calls.slice(0, 12).every((c) => c[2] === "$100,000.00")).toBe(true);
    expect(calls.slice(12)).toEqual([
      ["1 Jan 2023", "1 Jan 2023 to 31 Mar 2023", "$44,550.00"],
      ["1 Apr 2023", "1 Apr 2023 to 30 Jun 2023", "$48,303.30"],
      ["1 Jul 2023", "1 Jul 2023 to 30 Sep 2023", "$44,388.59"],
      ["1 Oct 2023", "1 Oct 2023 to 31 Dec 2023", "$37,125.00"],
      ["1 Jan 2024", "1 Jan 2024 to 31 Mar 2024", "$32,107.01"],
      ["1 Apr 2024", "1 Apr 2024 to 30 Jun 2024", "$25,987.50"],
    ]);
    expect(rows.at(-1)).toEqual(["Total", "18 calls", "$1,432,461.39"]);
    expect(investedLine()).toBe("Net invested capital at 30 Jun 2024: $7,000,000.");
  });

  it("gives case 39's invested capital at 30 Sep 2024, $6,500,000, and case 40's, $0 at 31 Mar 2025", async () => {
    render(<App />);
    await openFile(caseText("fund-39-invested-capital-deal-by-deal-classes"), "thirty-nine.json");
    tab("Cash flows");
    expect(investedLine()).toBe("Net invested capital at 30 Sep 2024: $6,500,000.");
    await openFile(caseText("fund-40-spv-fees-on-invested-capital"), "forty.json");
    tab("Cash flows");
    expect(investedLine()).toBe("Net invested capital at 31 Mar 2025: $0.");
    expect(rowsOf(within(scheduleCard()).getByRole("table")).slice(1)).toEqual([
      ["1 Jan 2022", "1 Jan 2022 to 31 Dec 2022", "$32,000.00"],
      ["1 Jan 2023", "1 Jan 2023 to 31 Dec 2023", "$40,000.00"],
      ["1 Jan 2024", "1 Jan 2024 to 31 Dec 2024", "$19,781.42"],
      ["Total", "3 calls", "$91,781.42"],
    ]);
  });

  it("has no invested capital line with every step on commitments, or while the fund can't run", async () => {
    render(<App />);
    pick("fund-29-fee-schedule");
    tab("Cash flows");
    expect(investedLine()).toBeNull();
    await openFile(caseText("fund-38-fees-on-invested-capital"), "thirty-eight.json");
    tab("Terms");
    type("Fee rate step 2", "");
    tab("Cash flows");
    expect(within(scheduleCard()).getByText("The schedule's fee calls show here once the fund can run.")).toBeDefined();
    expect(investedLine()).toBeNull();
  });

  it("says when fees have started with nothing to call: case 40's fee from after its exit", async () => {
    render(<App />);
    await openFile(caseText("fund-40-spv-fees-on-invested-capital"));
    tab("Terms");
    type("Fees start on", "2024-07-01");
    tab("Cash flows");
    expect(within(scheduleCard()).getByText("No fee call yet: the fund has had no invested capital while its fee has been on it.")).toBeDefined();
    expect(investedLine()).toBe("Net invested capital at 31 Mar 2025: $0.");
    // A start after D reads as in 0.4.0.
    tab("Terms");
    type("Fees start on", "2026-01-01");
    tab("Cash flows");
    expect(within(scheduleCard()).getByText("No fee call yet: fees start on 1 Jan 2026.")).toBeDefined();
  });

  it("notes a distribution that names no investment, on the whole fund with a step on invested capital", () => {
    expect(NAMES_NO_INVESTMENT).toBe("Names no investment, so it doesn't lower invested capital.");
    render(<App />);
    pick("fund-38-fees-on-invested-capital");
    tab("Cash flows");
    expect(notes()).toEqual([]);
    // Alder's exit named no investment: its cost stays in invested capital.
    choose("Row 4's investment", "—");
    expect(notes()).toEqual([NAMES_NO_INVESTMENT]);
    expect(screen.getByLabelText("Row 4's investment").closest("tr")!.nextElementSibling!.textContent).toBe(NAMES_NO_INVESTMENT);
    expect(investedLine()).toBe("Net invested capital at 30 Jun 2024: $11,000,000.");
    // Every step on commitments, nothing to note.
    tab("Terms");
    choose("Fee rate step 2 is on", "Commitments");
    tab("Cash flows");
    expect(notes()).toEqual([]);
  });

  it("doesn't note a distribution deal by deal, where naming no investment is a problem", () => {
    render(<App />);
    pick("fund-38-fees-on-invested-capital");
    tab("Cash flows");
    choose("Row 4's investment", "—");
    expect(notes()).toEqual([NAMES_NO_INVESTMENT]);
    tab("Terms");
    click("radio", "Deal by deal");
    tab("Cash flows");
    expect(notes()).toEqual([]);
    expect(problemUnder("Row 4's investment")).toBe("Deal by deal, every distribution comes from an investment: choose which.");
  });
});

describe("saving and opening each step's basis", () => {
  it("saves case 38's steps as the case has them: the step on commitments without the word", async () => {
    render(<App />);
    pick("fund-38-fees-on-invested-capital");
    save();
    expect((await saved()).fund.terms.management_fee).toEqual({
      start: "2020-01-01",
      frequency: "quarterly",
      steps: [{ rate: "0.02" }, { rate: "0.015", basis: "invested_capital", from: "2023-01-01" }],
      commitments: "20000000",
    });
  });

  it("saves case 40's one step on invested capital, with no commitments", async () => {
    render(<App />);
    await openFile(caseText("fund-40-spv-fees-on-invested-capital"));
    save();
    expect((await saved()).fund.terms.management_fee).toEqual({ start: "2022-01-01", frequency: "annual", steps: [{ rate: "0.02", basis: "invested_capital" }] });
  });

  it("opens commitments with no LPs and every step on invested capital, and saves without them: they change no amount", async () => {
    const input = caseFile("fund-40-spv-fees-on-invested-capital", "inputs.json").fund;
    const withCommitments = { ...input, terms: { ...input.terms, management_fee: { ...input.terms.management_fee, commitments: "5000000" } } };
    render(<App />);
    await openFile(JSON.stringify(withCommitments), "forty.json");
    expect(status()).toBe("Opened forty.json.");
    save();
    const file = await saved();
    expect(file.fund.terms.management_fee).not.toHaveProperty("commitments");
    const calls = (fund: unknown) => feeCalls(readFund(fund))!.map((c) => c.call.toString());
    expect(calls(file.fund)).toEqual(calls(withCommitments));
  });

  it("opens and saves a step switched in the form: case 29's second step on invested capital, once it has investments", async () => {
    const input = caseFile("fund-29-fee-schedule", "inputs.json").fund;
    const withInvestment = { ...input, investments: [{ name: "Alder Robotics", checks: [{ date: "2021-04-01", amount: "10000000" }] }] };
    render(<App />);
    await openFile(JSON.stringify(withInvestment), "twenty-nine.json");
    expect(status()).toBe("Opened twenty-nine.json.");
    tab("Terms");
    choose("Fee rate step 2 is on", "Invested capital");
    expect(screen.queryByText("The fund can't run as it is.")).toBeNull();
    save();
    expect((await saved()).fund.terms.management_fee.steps).toEqual([{ rate: "0.02" }, { rate: "0.015", basis: "invested_capital", from: "2026-02-15" }]);
  });
});

describe("case 38 in the picker", () => {
  it("is A fee that moves to invested capital, opening at $5,000,000 below its one breakpoint at $5,446,930.70", () => {
    render(<App />);
    pick("fund-38-fees-on-invested-capital");
    expect((screen.getByLabelText("Start from") as HTMLSelectElement).selectedOptions[0]!.textContent).toBe("A fee that moves to invested capital (fictional)");
    expect((screen.getByLabelText(/^Distribution on/) as HTMLInputElement).value).toBe("$5,000,000");
    expect(breakpointXs()).toEqual(["$5,446,930.70"]);
    expect(document.querySelector(".example-label")!.textContent).toBe(
      "This fund: $15.4M paid in over 21 calls (18 from its fee schedule), $10M distributed before X and a NAV of $18M on 30 Jun 2024. X isn't its last distribution.",
    );
  });
});

describe("the fund-41 refusals, in the page's words", () => {
  const dir = "fund-41-invested-capital-refused";
  const fixtures = readdirSync(resolve(casesDir, dir, "fixtures")).sort();
  const fixture = (file: string) => caseFile(`${dir}/fixtures`, file) as { base: string; change: { set?: Record<string, unknown>; del?: string | string[] } };
  const basis = (step: number) => `Fee rate step ${step}'s basis isn't one the page knows: it's commitments or invested_capital.`;
  const investments = "Its list of investments is missing: it's needed for a management fee on invested capital.";
  const WORDS: Record<string, string> = {
    "fee-basis-before-from.json": basis(2),
    "fee-basis-capitalized.json": basis(2),
    "fee-basis-not-text.json": basis(2),
    "fee-basis-on-the-first-step-bad.json": basis(1),
    "fee-basis-unknown.json": basis(2),
    "fee-commitments-mismatch-on-invested-capital.json": "Its management fee schedule: its commitments for the schedule aren't the LPs' total.",
    "fee-invested-capital-nobody-pays.json": "Its management fee schedule: no LP pays it, as every LP is in a class at a fee rate of 0.",
    "fee-invested-capital-with-fee-rate.json": "Its management fee rate: with a schedule, the schedule's first rate is the fund's, so there's no rate of its own.",
    "fee-mixed-without-commitments.json": "Its management fee's total commitments are missing: they're needed when the fund lists no LPs.",
    "fee-on-invested-capital-empty-investments.json": investments,
    "fee-on-invested-capital-investments-before-fee-call.json": investments,
    "fee-on-invested-capital-investments-before-lps.json": investments,
    "fee-on-invested-capital-without-investments.json": investments,
    "fee-rate-before-basis.json":
      'Fee rate step 2\'s rate isn\'t a number the page can use: it\'s a rate from 0 up to, not including, 1, the first above 0, written as an exact string like "0.02".',
    "fee-step-key-still-unsupported.json":
      "This file has a term the page doesn't model: `offset` on a fee rate step (step 2 of its management fee schedule). A step has only its rate, what it's on and the date it's in force from.",
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
    for (const path of [f.change.del ?? []].flat()) {
      const [at, key] = walk(path);
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

  /**
   * Every investment of the fund removed, on the Investments tab. Case 38's write-off, Row 5, goes first: a write-off
   * names the investment it ends, so on "—" it would be refused before the investments (F37), where the fixture's names
   * one the file doesn't list, refused after them.
   */
  const removeInvestments = () => {
    tab("Cash flows");
    const writeOff = [...document.querySelectorAll<HTMLSelectElement>('select[id$=".type"]')].findIndex((s) => s.value === "write_off");
    if (writeOff >= 0) click("button", `Remove row ${writeOff + 1}`);
    tab("Investments");
    while (screen.queryByRole("button", { name: "Remove investment 1" })) click("button", "Remove investment 1");
  };

  // The five the form can make, each made on its base's tabs as the fixture has it, and where its words show.
  // `control`: where the page shows it, when that isn't the control the fixture's path names: the investments a step on
  // invested capital needs are under its On (F40).
  const FORM: Record<string, { make: () => void; under: string; words: string; control?: string }> = {
    "fee-invested-capital-nobody-pays.json": {
      make: () => {
        tab("LPs");
        choose("LP 1's class", "Friends and family");
        choose("LP 2's class", "Friends and family");
        tab("Terms");
      },
      under: "A schedule",
      words: "No LP pays this schedule: every LP is in a class at a fee rate of 0.",
    },
    "fee-mixed-without-commitments.json": {
      make: () => (tab("Terms"), type("The LPs' total commitments", "")),
      under: "The LPs' total commitments",
      words: "Needed: the fund lists no LPs, so the fee is on this total.",
    },
    "fee-on-invested-capital-empty-investments.json": {
      make: () => (removeInvestments(), tab("Terms")),
      under: "Fee rate step 1 is on",
      words: NEEDS_INVESTMENTS,
      control: "terms.management_fee.steps[0].basis",
    },
    "fee-on-invested-capital-without-investments.json": {
      make: () => (removeInvestments(), tab("Terms")),
      under: "Fee rate step 2 is on",
      words: NEEDS_INVESTMENTS,
      control: "terms.management_fee.steps[1].basis",
    },
    "fee-on-invested-capital-investments-before-fee-call.json": {
      // Fee isn't a kind to choose with a schedule: the row is made with fees entered, then the schedule chosen again.
      make: () => {
        tab("Terms");
        click("radio", "Entered as fee calls");
        tab("Cash flows");
        click("button", "Add a cash flow");
        type("Row 6's date", "2021-01-01");
        choose("Row 6's type", "Call");
        choose("Row 6's kind", "Fee");
        type("Row 6's amount", "100000");
        tab("Terms");
        click("radio", "A schedule");
        // With the investments, it's the Fee row's problem; without them, the investments come first.
        tab("Cash flows");
        expect(problemUnder("Row 6's kind")).toBe(FEE_ROW);
        removeInvestments();
        tab("Terms");
      },
      under: "Fee rate step 2 is on",
      words: NEEDS_INVESTMENTS,
      control: "terms.management_fee.steps[1].basis",
    },
  };

  it("makes five in the form; the other ten only a file can make", () => {
    expect(Object.keys(FORM)).toHaveLength(5);
    expect(fixtures.filter((f) => !(f in FORM))).toEqual([
      "fee-basis-before-from.json",
      "fee-basis-capitalized.json",
      "fee-basis-not-text.json",
      "fee-basis-on-the-first-step-bad.json",
      "fee-basis-unknown.json",
      "fee-commitments-mismatch-on-invested-capital.json",
      "fee-invested-capital-with-fee-rate.json",
      "fee-on-invested-capital-investments-before-lps.json",
      "fee-rate-before-basis.json",
      "fee-step-key-still-unsupported.json",
    ]);
  });

  it.each(Object.keys(FORM))("%s, made in the form, shows beside its field, and its tab says so", async (file) => {
    const f = fixture(file);
    render(<App />);
    await openFile(caseText(f.base));
    const { make, under, words, control } = FORM[file]!;
    make();
    expect(problemUnder(under)).toBe(words);
    // The form's refusal is at the fixture's path: the field the words are under is the one that path names, or its On.
    const field = caseFile(dir, "expected.json").fixtures[file].refused.field as string;
    expect(screen.getByLabelText(under).id).toBe(control ?? controlFor(field));
    if (control) expect(field).toBe("investments");
    tab("Payouts");
    expect(payoutsNotice()).toContain(words);
  });
});
