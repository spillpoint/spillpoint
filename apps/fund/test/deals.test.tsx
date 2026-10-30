// Investments and carry deal by deal on the page (plan, "0.5.0: investments and carry deal by deal", f05c): the basis
// on Terms, the Investments tab and its table, a distribution's From and Share sold and a write-off on Cash flows, X's
// source beside X, the headline and what's due beside the split, each class's due, saving and opening, case 34 in the
// picker and as case 33 on the whole fund, cases 35 and 36 opened, case 26 switched to deal by deal and back, and the
// fund-37 refusals in the page's words.

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, findBreakpoints, readFund } from "spillpoint-fund";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App, dueText } from "../src/App.tsx";
import { readFile } from "../src/file.ts";
import { flowsFrom, flowsInput } from "../src/flows.ts";
import { cents } from "../src/format.ts";
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
/** The problem under a control: its words, read through the control's own description. */
const problemOf = (field: HTMLElement) => {
  expect(field.getAttribute("aria-invalid"), `${field.id} is marked`).toBe("true");
  return document.getElementById(field.getAttribute("aria-describedby")!)!.textContent;
};
const problemUnder = (label: string | RegExp) => problemOf(screen.getByLabelText(label));
/** A table as shown: each row's header and cells. The one table, not the copy measured out of sight. */
const rowsOf = (table: Element) => [...table.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th, td")].map((c) => c.textContent));
const card = (name: string | RegExp) => screen.queryByRole("region", { name });
const cardTable = (name: string | RegExp) => rowsOf(within(card(name)!).getAllByRole("table")[0]!);
const headline = () => [...screen.getByRole("region", { name: "The answer" }).querySelectorAll("p")].map((p) => p.textContent);
const xBox = () => screen.getByLabelText(/^Distribution on/) as HTMLInputElement;
const typeX = (text: string) => fireEvent.change(xBox(), { target: { value: text } });
/** The split's rows, as shown: each tier's label and its four amounts. */
const splitRows = () => rowsOf(within(card(/^The split at/)!).getByRole("table")).slice(2);
/** The facts under the split, each "name: value". */
const facts = () => [...card(/^The split at/)!.querySelectorAll("dl.facts > div")].map((d) => `${d.querySelector("dt")!.textContent}: ${d.querySelector("dd")!.textContent}`);
const due = () => facts().find((f) => f.startsWith("Due to LPs before carry"));
const breakpointXs = () =>
  within(screen.getByRole("region", { name: "Breakpoints" }))
    .getAllByRole("button")
    .map((b) => b.querySelector(".breakpoints__value")!.firstChild!.textContent!.trim());
const clawbackSentence = () => within(card("The clawback")!).getByText(/^If /).textContent;
const payoutsNotice = () => screen.getByText(/^Your last change to/).closest(".notice")!.textContent;
/** The notice at the top of the tab shown, when the fund can't run. */
const tabNotice = () => within(screen.getByRole("tabpanel")).queryByText(/^The fund can't run as it is\./)?.closest(".notice")?.textContent ?? null;

describe("the forms round trip with the investments", () => {
  it.each(["fund-33-portfolio-whole-fund", "fund-34-deal-by-deal", "fund-35-deal-by-deal-clawback", "fund-36-deal-by-deal-classes-closes"])(
    "%s: the Investments and Cash flows tabs write its investments, tags, write-offs and X's source back exactly",
    (dir) => {
      const input = caseFile(dir, "inputs.json").fund;
      const fund = readFund(input);
      const again = readFund({ ...input, ...flowsInput(flowsFrom(fund)) });
      const exactly = (f: typeof fund) => JSON.parse(JSON.stringify({ investments: f.investments, from: f.distributionFrom, flows: f.cashFlows }, (_, v) => (v instanceof D ? v.toString() : v)));
      expect(exactly(again)).toEqual(exactly(fund));
      expect(fund.investments.length).toBeGreaterThan(0);
      expect(findBreakpoints(again).map((b) => b.x.toString())).toEqual(findBreakpoints(fund).map((b) => b.x.toString()));
    },
  );

  it("writes a share of 100% as none, which is its default, and any other share exactly, as the terms' rates are", () => {
    const fund = readFund(caseFile("fund-35-deal-by-deal-clawback", "inputs.json").fund);
    const flows = flowsInput(flowsFrom(fund)) as { cash_flows: Record<string, unknown>[]; distribution_from: Record<string, unknown> };
    const tags = flows.cash_flows.filter((f) => f.type !== "call");
    expect(tags).toEqual([
      { date: "2021-09-30", type: "distribution", amount: "6000000", investment: "Dogwood Labs", share: "0.4" },
      { date: "2022-06-30", type: "distribution", amount: "12000000", investment: "Elm Bio" },
      { date: "2023-06-30", type: "distribution", amount: "1000000", investment: "Elm Bio" },
      { date: "2023-09-30", type: "write_off", investment: "Fir Payments" },
    ]);
    expect(flows.distribution_from).toEqual({ investment: "Dogwood Labs" });
  });
});

describe("the Terms tab's carry basis", () => {
  it("starts on the whole fund, with the one line, and leaves the basis out of a saved file", async () => {
    render(<App />);
    tab("Terms");
    expect([checked("On the whole fund"), checked("Deal by deal")]).toEqual([true, false]);
    expect(
      screen.getByText(
        "Deal by deal: before carry, LPs get back the cost of each investment exited or written off, with its share of fees and expenses. At the end the GP owes back any carry the whole fund doesn't earn.",
      ),
    ).toBeDefined();
    save();
    expect((await saved()).fund.terms).not.toHaveProperty("carry_basis");
  });

  it("turns the pref and catch-up off deal by deal, saying why, and brings them back as they were on the whole fund", async () => {
    render(<App />);
    pick("fund-17-lps-three");
    tab("Terms");
    click("checkbox", "A preferred return");
    type("Rate a year, simple", "7.5");
    click("radio", "Full");
    click("radio", "Deal by deal");
    const pref = screen.getByRole("checkbox", { name: "A preferred return" }) as HTMLInputElement;
    expect([pref.checked, pref.disabled]).toEqual([false, true]);
    expect(screen.getByText("Off deal by deal: this version has no pref deal by deal, so no catch-up either.")).toBeDefined();
    expect([screen.queryByLabelText("Rate a year, simple"), screen.queryByRole("radiogroup", { name: "Catch-up" })]).toEqual([null, null]);
    click("radio", "On the whole fund");
    expect([checked("A preferred return"), value("Rate a year, simple"), checked("Full")]).toEqual([true, "7.5", true]);
    expect(screen.queryByText(/^Off deal by deal/)).toBeNull();
  });

  it("keeps a pref typed on the whole fund out of the input deal by deal, so the fund still runs and saves without one", async () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    tab("Terms");
    click("radio", "On the whole fund");
    click("checkbox", "A preferred return");
    click("radio", "Full");
    click("radio", "Deal by deal");
    expect(tabNotice()).toBeNull();
    save();
    const terms = (await saved()).fund.terms;
    expect([terms.carry_basis, "pref" in terms, "catch_up" in terms]).toEqual(["deal_by_deal", false, false]);
    tab("Payouts");
    expect(headline()[0]).toBe("Carry 20% deal by deal; no pref; GP commitment 1%, fee-free.");
  });

  it("writes carry_basis deal by deal, with no pref or catch-up, and the headline says it after the carry", async () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    expect(headline()[0]).toBe("Carry 20% deal by deal; no pref; GP commitment 1%, fee-free.");
    save();
    const terms = (await saved()).fund.terms;
    expect(terms).toEqual({ carry: "0.2", gp_commitment: { share: "0.01", pays_fees: false, pays_expenses: true }, carry_basis: "deal_by_deal" });
  });
});

describe("the Investments tab", () => {
  it("comes after Cash flows, and lists case 34's three investments with their checks", () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Payouts", "Terms", "Cash flows", "Investments", "LPs"]);
    tab("Investments");
    expect([1, 2, 3].map((n) => [value(`Investment ${n}'s name`), value(`Investment ${n}, check 1's date`), value(`Investment ${n}, check 1's amount`)])).toEqual([
      ["Alder Robotics", "2020-02-01", "$3,000,000"],
      ["Birch Health", "2020-03-01", "$3,000,000"],
      ["Cedar AI", "2021-02-01", "$4,000,000"],
    ]);
    // The first check goes with its investment.
    expect(screen.queryByRole("button", { name: "Remove investment 1, check 1" })).toBeNull();
  });

  it("shows case 34's investments table at D, before X, from the engine: Alder exited at 3.00x, Birch written off, Cedar held", () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    tab("Investments");
    expect(card("The investments at 30 Jun 2024, before X")).not.toBeNull();
    expect(cardTable("The investments at 30 Jun 2024, before X")).toEqual([
      ["Investment", "Cost", "Exited or written off", "Written off", "Proceeds", "Realized multiple"],
      ["Alder Robotics", "$3,000,000.00", "$3,000,000.00", "$0.00", "$9,000,000.00", "3.00x"],
      ["Birch Health", "$3,000,000.00", "$3,000,000.00", "$3,000,000.00", "$0.00", "0.00x"],
      ["Cedar AI", "$4,000,000.00", "$0.00", "$0.00", "$0.00", "—"],
    ]);
    expect(screen.getByText("Cost is each investment's checks to D. The realized multiple is its proceeds over the cost exited or written off.")).toBeDefined();
  });

  it("shows case 35's partial sale, escrow release and write-off as F36 has them: Dogwood 40% sold at 2.50x", async () => {
    render(<App />);
    await openFile(caseText("fund-35-deal-by-deal-clawback"));
    tab("Investments");
    expect(cardTable(/^The investments at/)).toEqual([
      ["Investment", "Cost", "Exited or written off", "Written off", "Proceeds", "Realized multiple"],
      ["Dogwood Labs", "$6,000,000.00", "$2,400,000.00", "$0.00", "$6,000,000.00", "2.50x"],
      // Its $1,000,000 escrow release is among its proceeds, and realizes nothing more.
      ["Elm Bio", "$4,000,000.00", "$4,000,000.00", "$0.00", "$13,000,000.00", "3.25x"],
      ["Fir Payments", "$5,000,000.00", "$5,000,000.00", "$5,000,000.00", "$0.00", "0.00x"],
      ["Hazel Cloud", "$8,000,000.00", "$0.00", "$0.00", "$0.00", "—"],
    ]);
  });

  it("adds an investment with its name focused, a follow-on with its date focused, and removes a check", () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    tab("Investments");
    click("button", "Add an investment");
    expect(document.activeElement).toBe(screen.getByLabelText("Investment 4's name"));
    click("button", "Add a follow-on to investment 3");
    expect(document.activeElement).toBe(screen.getByLabelText("Investment 3, check 2's date"));
    type("Investment 3, check 2's date", "2022-05-01");
    type("Investment 3, check 2's amount", "1M");
    expect(screen.getByRole("button", { name: "Remove investment 3, check 2" })).toBeDefined();
    click("button", "Remove investment 3, check 2");
    expect(screen.queryByLabelText("Investment 3, check 2's date")).toBeNull();
  });

  it("removes an investment, leaving the cash flows that named it on none", async () => {
    render(<App />);
    await openFile(caseText("fund-33-portfolio-whole-fund"));
    tab("Investments");
    click("button", "Remove investment 1");
    tab("Cash flows");
    expect(chosen("Row 6's investment")).toBe("—");
    expect(options("Row 7's investment")).toEqual(["Birch Health", "Cedar AI"]);
  });

  it("says when there are none, and while the fund can't run, that its table comes once it can", () => {
    render(<App />);
    tab("Investments");
    expect(screen.getByText("No investments yet. Add them to tag distributions and write-offs, and to pay carry deal by deal.")).toBeDefined();
    pick("fund-34-deal-by-deal");
    tab("Investments");
    type("Investment 1, check 1's amount", "");
    expect(screen.getByText("The table shows here once the fund can run.")).toBeDefined();
  });
});

describe("the Cash flows tab's investments", () => {
  it("shows case 34's exit from Alder Robotics, all of it sold, and Birch Health's write-off with no amount", () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    tab("Cash flows");
    expect(options("Row 6's type")).toEqual(["Call", "Distribution", "Write-off"]);
    expect([chosen("Row 6's type"), chosen("Row 6's investment"), value("Row 6's share sold"), value("Row 6's amount")]).toEqual(["Distribution", "Alder Robotics", "100", "$9,000,000"]);
    expect([chosen("Row 7's type"), chosen("Row 7's investment")]).toEqual(["Write-off", "Birch Health"]);
    expect([screen.queryByLabelText("Row 7's amount"), screen.queryByLabelText("Row 7's share sold"), screen.queryByLabelText("Row 1's investment")]).toEqual([null, null, null]);
    // Deal by deal every distribution comes from an investment, and a write-off always names one: no "—" to choose.
    expect([options("Row 6's investment"), options("Row 7's investment")]).toEqual([
      ["Alder Robotics", "Birch Health", "Cedar AI"],
      ["Alder Robotics", "Birch Health", "Cedar AI"],
    ]);
  });

  it("offers none for a distribution on the whole fund, and a new row copies the From of the row above", async () => {
    render(<App />);
    await openFile(caseText("fund-33-portfolio-whole-fund"));
    tab("Cash flows");
    expect(options("Row 6's investment")).toEqual(["—", "Alder Robotics", "Birch Health", "Cedar AI"]);
    choose("Row 7's type", "Distribution");
    click("button", "Add a cash flow");
    expect([chosen("Row 8's type"), chosen("Row 8's investment"), value("Row 8's share sold")]).toEqual(["Distribution", "Birch Health", "100"]);
  });

  it("sells a share of what's left, typed as a percent, and keeps it out of view without an investment", async () => {
    render(<App />);
    await openFile(caseText("fund-33-portfolio-whole-fund"));
    tab("Cash flows");
    type("Row 6's share sold", "40");
    save();
    expect((await saved()).fund.cash_flows[5]).toEqual({ date: "2022-06-30", type: "distribution", amount: "9000000", investment: "Alder Robotics", share: "0.4" });
    choose("Row 6's investment", "—");
    expect(screen.queryByLabelText("Row 6's share sold")).toBeNull();
    save();
    expect((await saved()).fund.cash_flows[5]).toEqual({ date: "2022-06-30", type: "distribution", amount: "9000000" });
  });

  it("says on one date in what order calls, checks, write-offs and distributions run", () => {
    render(<App />);
    tab("Cash flows");
    expect(screen.getByText(/^On one date, calls run first/).textContent).toBe(
      "On one date, calls run first, then the investments' checks, then write-offs, then distributions in the order shown here. “Sort by date” keeps that order within a date.",
    );
  });
});

describe("X's source beside X", () => {
  it("is From and Share sold under the X box deal by deal, and isn't there on the whole fund", async () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    expect([chosen("From"), options("From"), value("Share sold")]).toEqual(["Cedar AI", ["Alder Robotics", "Birch Health", "Cedar AI"], "100"]);
    await openFile(caseText("fund-33-portfolio-whole-fund"));
    expect([screen.queryByLabelText("From"), screen.queryByLabelText("Share sold")]).toEqual([null, null]);
  });

  it("changes the split when X sells half of Cedar AI: less is due, so carry starts sooner", () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    type("Share sold", "50");
    // Cedar's $2,000,000 half realized of $10,000,000 made: $8,000,000 of the cost, of which the LPs' 99% and 80% of
    // their $1,200,000 of fees, $7,920,000 + $960,000. With $3,330,000 back, X's 99% returns the other $5,550,000 first.
    expect(due()).toBe("Due to LPs before carry: $8,880,000.00");
    expect(breakpointXs()).toEqual(["$5,606,060.61"]);
  });

  it("is in the No payouts yet card for a blank fund deal by deal, which has never run", () => {
    render(<App />);
    pick("blank");
    tab("Terms");
    click("radio", "Deal by deal");
    tab("Payouts");
    const noPayouts = screen.getByText("No payouts yet.").closest(".card") as HTMLElement;
    expect(within(noPayouts).getByLabelText("From")).toBeDefined();
    expect(within(noPayouts).getByLabelText("Share sold")).toBeDefined();
  });

  it("keeps a whole fund's X source out of view, and saves it as it was", async () => {
    render(<App />);
    await openFile(caseText("fund-33-portfolio-whole-fund"));
    save();
    expect((await saved()).fund.distribution_from).toEqual({ investment: "Cedar AI" });
  });
});

describe("case 34 from the picker", () => {
  it("opens at $5,000,000, below its one breakpoint, with $11,100,000 due before carry", () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    expect(xBox().value).toBe("$5,000,000");
    expect(breakpointXs()).toEqual(["$7,848,484.85"]);
    expect(due()).toBe("Due to LPs before carry: $11,100,000.00");
    expect(headline()).toEqual(["Carry 20% deal by deal; no pref; GP commitment 1%, fee-free.", "At a $5M distribution on 30 Jun 2024, the GP's carry is $0.", "The LPs get $4.95M and the GP commitment $50K."]);
    expect(screen.getByRole("region", { name: "Breakpoints" }).textContent).toContain("LPs have their $11,100,000 back for the investments exited or written off, fees and expenses included.");
  });

  it("shows Alder's exit at X = 0: $3,330,000 back to the LPs, then $1,116,000 of carry", () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    typeX("0");
    expect(splitRows()).toEqual([
      ["Capital", "$0.00", "—", "$3,330,000.00", "—"],
      ["Carry at 20%", "$0.00", "$0.00", "$4,464,000.00", "$1,116,000.00"],
      ["Total", "$0.00", "$0.00", "$7,794,000.00", "$1,116,000.00"],
    ]);
  });

  it("at NAV pays $1,938,000 in all and owes nothing back, all the LPs' paid-in due: its cost and its fees", () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    click("button", "Set X to NAV");
    // The case's NAV point: X's $11,880,000 for the LPs, its $7,770,000 still due first, then 20% of the rest.
    expect(splitRows().at(-1)).toEqual(["Total", "$11,058,000.00", "$822,000.00", "$18,852,000.00", "$1,938,000.00"]);
    expect(due()).toBe("Due to LPs before carry: $11,100,000.00, all their paid-in: $9,900,000.00 of cost and $1,200,000.00 of fees and expenses");
    expect(clawbackSentence()).toContain("owes nothing back to the LPs");
    expect(headline()[1]).toBe("If the fund were liquidated at NAV, $12M on 30 Jun 2024, the GP would end with $1.94M of carry.");
  });

  it("switched to On the whole fund is case 33: no carry at the exit, one breakpoint at $2,212,121.21, the same $1,938,000 at $12,000,000", () => {
    render(<App />);
    pick("fund-34-deal-by-deal");
    tab("Terms");
    click("radio", "On the whole fund");
    tab("Payouts");
    expect(headline()[0]).toBe("Carry 20%; no pref; GP commitment 1%, fee-free.");
    expect(breakpointXs()).toEqual(["$2,212,121.21"]);
    expect(findBreakpoints(readFund(caseFile("fund-33-portfolio-whole-fund", "inputs.json").fund)).map((b) => b.x.toFixed(2))).toEqual(["2212121.21"]);
    expect(due()).toBeUndefined();
    typeX("0");
    expect(splitRows()).toEqual([
      ["Capital", "$0.00", "—", "$8,910,000.00", "—"],
      ["Carry at 20%", "$0.00", "$0.00", "$0.00", "$0.00"],
      ["Total", "$0.00", "$0.00", "$8,910,000.00", "$0.00"],
    ]);
    typeX("12000000");
    expect(splitRows().at(-1)!.at(-1)).toBe("$1,938,000.00");
    // F36: the table is the same on either basis.
    tab("Investments");
    expect(cardTable(/^The investments at/)[1]).toEqual(["Alder Robotics", "$3,000,000.00", "$3,000,000.00", "$0.00", "$9,000,000.00", "3.00x"]);
  });
});

describe("cases 35 and 36 opened", () => {
  it("case 35: at X = 0 the GP owes $2,348,128 back, cleared at $18,376,163.27", async () => {
    render(<App />);
    await openFile(caseText("fund-35-deal-by-deal-clawback"));
    expect(clawbackSentence()).toBe(
      "If this is the fund's last distribution, the GP has been paid $2,348,128.00 of carry, has earned $0.00 on the fund's totals, and owes $2,348,128.00 back to the LPs.",
    );
    expect(breakpointXs()).toEqual(["$6,395,918.37", "$18,376,163.27"]);
    // X set exactly at the second breakpoint, $900,432,000/49.
    fireEvent.click(within(screen.getByRole("region", { name: "Breakpoints" })).getAllByRole("button")[1]!);
    expect(clawbackSentence()).toContain("owes nothing back to the LPs");
    // X final: what's due is all the LPs' paid-in, with its parts.
    expect(due()).toMatch(/^Due to LPs before carry: \$[\d,.]+, all their paid-in: \$[\d,.]+ of cost and \$[\d,.]+ of fees and expenses$/);
  });

  it("case 36: its three breakpoints, and each class's due before carry on the classes card", async () => {
    render(<App />);
    await openFile(caseText("fund-36-deal-by-deal-classes-closes"));
    expect(breakpointXs()).toEqual(["$5,400,000.00", "$5,841,919.19", "$6,283,838.38"]);
    const rows = cardTable("Each class at $0");
    expect(rows[0]).toContain("Due before carry");
    const at = rows[0]!.indexOf("Due before carry");
    expect(rows.slice(1).map((r) => [r[0], r[at]])).toEqual([
      ["Fund terms", "$5,240,500.00"],
      ["Anchor", "$2,968,050.00"],
      ["Friends and family", "$1,861,200.00"],
    ]);
    expect(due()).toBe("Due to LPs before carry: $10,069,750.00");
  });

  it("case 36 at its NAV point: the NAV split, its due the end's $12,855,000, not the axis's $10,069,750 (FA58)", async () => {
    render(<App />);
    await openFile(caseText("fund-36-deal-by-deal-classes-closes"));
    click("button", "Set X to NAV");
    const point = (caseFile("fund-36-deal-by-deal-classes-closes", "expected.json").points as { x: string; due: { total: { amount: string } }; to_date: { gp: { total: string } } }[]).at(-1)!;
    expect([point.x, point.due.total.amount]).toEqual(["15000000.00", "12855000.00"]);
    expect(due()).toMatch(/^Due to LPs before carry: \$12,855,000\.00, all their paid-in: /);
    expect(splitRows().at(-1)!.at(-1)).toBe(cents(new D(point.to_date.gp.total)));
  });
});

describe("case 26 switched to deal by deal and back", () => {
  it("asks for the fund's investments, on the Investments tab, and the payouts say the change was to the terms", () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    const before = headline();
    tab("Terms");
    click("radio", "Deal by deal");
    expect(tabNotice()).toContain("Deal by deal needs the fund's investments: add each one, with its checks.");
    tab("Payouts");
    expect(payoutsNotice()).toBe(
      "Your last change to the terms has a problem, so these payouts are from the fund before it. Deal by deal needs the fund's investments: add each one, with its checks. Fix it",
    );
    expect(headline()).toEqual(before);
    click("button", "Fix it");
    expect(screen.getByRole("tab", { name: "Investments" }).getAttribute("aria-selected")).toBe("true");
    const add = screen.getByRole("button", { name: "Add an investment" });
    expect(document.activeElement).toBe(add);
    expect(problemOf(add)).toBe("Deal by deal needs the fund's investments: add each one, with its checks.");
    tab("Terms");
    click("radio", "On the whole fund");
    expect(tabNotice()).toBeNull();
    tab("Payouts");
    expect(headline()).toEqual(before);
  });

  it("runs deal by deal once X comes from an investment it lists", () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    tab("Terms");
    click("radio", "Deal by deal");
    tab("Investments");
    click("button", "Add an investment");
    type("Investment 1's name", "Ash Labs");
    type("Investment 1, check 1's date", "2022-01-01");
    type("Investment 1, check 1's amount", "2000000");
    // Case 26 has no distribution before X, so X's source is all it still needs.
    tab("Payouts");
    expect(problemUnder("From")).toBe("Deal by deal, X comes from an investment: choose which.");
    choose("From", "Ash Labs");
    expect(screen.queryByText(/^Your last change to/)).toBeNull();
    expect(headline()[0]).toMatch(/^Carry 20% deal by deal; /);
    expect(due()).toMatch(/^Due to LPs before carry: \$/);
  });
});

describe("saving and opening", () => {
  it.each(["fund-34-deal-by-deal", "fund-35-deal-by-deal-clawback", "fund-36-deal-by-deal-classes-closes"])("%s saves its basis, investments, tags, write-offs and X's source as the case has them", async (dir) => {
    render(<App />);
    await openFile(caseText(dir));
    save();
    const file = (await saved()).fund;
    const input = caseFile(dir, "inputs.json").fund;
    expect(file.terms.carry_basis).toBe("deal_by_deal");
    const tags = (flows: Record<string, unknown>[]) => flows.filter((f) => f.type !== "call").map((f) => [f.date, f.type, f.investment, f.share ?? "1"]);
    expect(tags(file.cash_flows)).toEqual(tags(input.cash_flows));
    expect(readFund(file).investments).toEqual(readFund(input).investments);
    expect(readFund(file).distributionFrom).toEqual(readFund(input).distributionFrom);
  });

  it("trims an investment's name, and the names its cash flows and X's source give, as it opens a file (FA52)", async () => {
    const input = caseFile("fund-34-deal-by-deal", "inputs.json").fund;
    input.investments[0].name = " Alder Robotics ";
    input.cash_flows[5].investment = "Alder Robotics ";
    input.distribution_from.investment = " Cedar AI";
    render(<App />);
    await openFile(JSON.stringify(input), "spaced.json");
    expect(status()).toBe("Opened spaced.json.");
    save();
    const file = (await saved()).fund;
    expect([file.investments[0].name, file.cash_flows[5].investment, file.distribution_from.investment]).toEqual(["Alder Robotics", "Alder Robotics", "Cedar AI"]);
  });
});

describe("what's due beside the split", () => {
  const due = (cost: string, uninvested: string, fees: string) => {
    const [c, u, f] = [new D(cost), new D(uninvested), new D(fees)];
    return { costMade: c, costRealized: c, cost: c, uninvested: u, feesAndExpenses: f, total: c.plus(u).plus(f) };
  };
  it("is the total before the end, and at the end its parts, with capital called and never invested only when there's a cent or more", () => {
    expect(dueText(due("9900000", "0", "1200000"), false)).toBe("$11,100,000.00");
    expect(dueText(due("9900000", "0", "1200000"), true)).toBe("$11,100,000.00, all their paid-in: $9,900,000.00 of cost and $1,200,000.00 of fees and expenses");
    expect(dueText(due("9000000", "900000", "1200000"), true)).toBe(
      "$11,100,000.00, all their paid-in: $9,000,000.00 of cost, $900,000.00 called and never invested and $1,200,000.00 of fees and expenses",
    );
    expect(dueText(due("9000000", "0.004", "1200000"), true)).toBe("$10,200,000.00, all their paid-in: $9,000,000.00 of cost and $1,200,000.00 of fees and expenses");
  });
});

describe("the fund-37 refusals, in the page's words", () => {
  const dir = "fund-37-deals-refused";
  const fixtures = readdirSync(resolve(casesDir, dir, "fixtures")).sort();
  const fixture = (file: string) => caseFile(`${dir}/fixtures`, file) as { base: string; change: { set?: Record<string, unknown>; del?: string } };
  const amounts = 'isn\'t a number the page can use: amounts and rates are exact strings, like "8000000" or "0.2", amounts more than zero and nothing negative.';
  const share = 'isn\'t a share the page can use: it\'s above 0 and at most 1, written as an exact string like "0.4".';
  const unknownInvestment = (row: number) => `The investment in row ${row} of its cash flows: it isn't one of the fund's investments.`;
  const WORDS: Record<string, string> = {
    "call-unknown-fields-in-order.json": "The note in row 1 of its cash flows isn't part of a fund's input.",
    "carry-basis-after-the-classes.json": "The name in row 1 of its LP classes isn't a value it can take.",
    "carry-basis-not-text.json": "Its carry basis isn't one the page knows: it's whole_fund or deal_by_deal.",
    "carry-basis-unknown.json": "Its carry basis isn't one the page knows: it's whole_fund or deal_by_deal.",
    "check-after-d-before-unknown-investment.json": "Check 1 in row 3 of its investments: this check is after the distribution date.",
    "check-after-distribution-date.json": "Check 1 in row 3 of its investments: this check is after the distribution date.",
    "check-amount-missing.json": "The amount of check 1 in row 3 of its investments is missing.",
    "check-amount-zero.json": `The amount of check 1 in row 1 of its investments ${amounts}`,
    "check-before-any-call.json": "The amount of check 1 in row 2 of its investments: by its date, the checks come to more than the investment calls.",
    "check-date-not-a-date.json": "The date of check 1 in row 1 of its investments isn't a date that exists, written YYYY-MM-DD.",
    "check-not-an-object.json": "Check 1 in row 1 of its investments isn't a value it can take.",
    "check-unknown-key.json": "`shares` on check 1 in row 1 of its investments isn't part of a fund's input.",
    "deal-by-deal-compounded-pref.json": "This file has a term the page doesn't model: a pref compounded, not simple (`terms.pref.compounding`).",
    "deal-by-deal-distribution-from-missing.json": "X's source is missing: deal by deal, X comes from an investment.",
    "deal-by-deal-distribution-without-investment.json": "The investment in row 6 of its cash flows is missing: deal by deal, every distribution comes from one.",
    "deal-by-deal-later-close-without-rate.json": "Its equalization interest rate is missing: it's needed when an investment or expense call comes before a later close.",
    "deal-by-deal-pref-and-a-term-not-modeled.json": "This file has a term the page doesn't model: `hurdle_irr`.",
    "deal-by-deal-with-pref.json":
      "This file has a term the page doesn't model: a pref with carry deal by deal (`terms.pref`). Deal by deal, this version has no pref, so no catch-up either.",
    "deal-by-deal-without-investments.json": "Its list of investments is missing: it's needed to pay carry deal by deal.",
    "distribution-before-its-investment.json": "Row 6 of its cash flows: it's before the first check in the investment it names.",
    "distribution-from-investment-unknown.json": "The investment X comes from: it isn't one of the fund's investments.",
    "distribution-from-not-an-object.json": "X's source isn't a value it can take.",
    "distribution-from-share-above-one.json": `The share X sells ${share}`,
    "distribution-from-unknown-key.json": "`amount` in X's source isn't part of a fund's input.",
    "distribution-from-without-investment.json": "The investment X comes from is missing.",
    "flow-after-d-before-investment-checks.json": "Row 6 of its cash flows: this cash flow is after the distribution date.",
    "flow-investment-blank.json": "The investment in row 6 of its cash flows isn't a value it can take.",
    "flow-investment-not-text.json": "The investment in row 6 of its cash flows isn't a value it can take.",
    "investment-checks-empty.json": "The list of checks in row 2 of its investments isn't a value it can take.",
    "investment-checks-missing.json": "The list of checks in row 2 of its investments is missing.",
    "investment-name-blank.json": "The name in row 3 of its investments isn't a value it can take.",
    "investment-name-missing.json": "The name in row 1 of its investments is missing.",
    "investment-name-repeated-after-its-checks.json": `The amount of check 1 in row 3 of its investments ${amounts}`,
    "investment-name-repeated.json": "The name in row 3 of its investments: an investment above already has this name; each needs its own.",
    "investment-not-an-object.json": "Row 2 of its investments isn't a value it can take.",
    "investment-on-a-call.json": "Row 1 of its cash flows is a call, which has no investment or share: only a distribution or a write-off does.",
    "investment-unknown-before-lp-class-unknown.json": unknownInvestment(3),
    "investment-unknown-key.json": "`sector` in row 1 of its investments isn't part of a fund's input.",
    "investment-unknown.json": unknownInvestment(6),
    "investments-before-distribution-from.json": "The name in row 1 of its investments isn't a value it can take.",
    "investments-exceed-calls.json": "The amount of check 1 in row 3 of its investments: by its date, the checks come to more than the investment calls.",
    "investments-not-a-list.json": "Its list of investments isn't a value it can take.",
    "share-above-one.json": `The share in row 6 of its cash flows ${share}`,
    "share-percent.json": `The share in row 6 of its cash flows ${share}`,
    "share-without-investment.json": "The investment in row 6 of its cash flows is missing: a share sold needs the investment it's sold from.",
    "share-zero.json": `The share in row 6 of its cash flows ${share}`,
    "unknown-investment-before-exceed-calls.json": unknownInvestment(6),
    "unknown-investment-before-not-made.json": "Row 6 of its cash flows: it's before the first check in the investment it names.",
    "whole-fund-investment-unknown.json": unknownInvestment(6),
    "write-off-after-distribution-date.json": "Row 7 of its cash flows: this cash flow is after the distribution date.",
    "write-off-before-its-investment.json": "Row 7 of its cash flows: it's before the first check in the investment it names.",
    "write-off-investment-unknown.json": unknownInvestment(7),
    "write-off-with-a-share.json": "Row 7 of its cash flows is a write-off, which has no kind, amount or share: only its date and investment.",
    "write-off-with-an-amount.json": "Row 7 of its cash flows is a write-off, which has no kind, amount or share: only its date and investment.",
    "write-off-without-investment.json": "The investment in row 7 of its cash flows is missing: a write-off names the investment it ends.",
  };

  /** The fixture's change, made to its base's input: `set` and `del` at dotted paths with [i] (FC12). */
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

  const inv = (n: number) => `Investment ${n}`;
  // Those the form can make, each made on its base's tabs as the fixture has it, with where its words show.
  const FORM: Record<string, { make: () => void; under: () => HTMLElement; words: string }> = {
    "check-after-distribution-date.json": {
      make: () => (tab("Investments"), type(`${inv(3)}, check 1's date`, "2024-07-01")),
      under: () => screen.getByLabelText(`${inv(3)}, check 1's date`),
      words: "This check is after the distribution date, 30 Jun 2024.",
    },
    "check-amount-missing.json": {
      make: () => (tab("Investments"), type(`${inv(3)}, check 1's amount`, "")),
      under: () => screen.getByLabelText(`${inv(3)}, check 1's amount`),
      words: "Write the check's amount in dollars, more than zero: 3000000 or $3M.",
    },
    "check-amount-zero.json": {
      make: () => (tab("Investments"), type(`${inv(1)}, check 1's amount`, "0")),
      under: () => screen.getByLabelText(`${inv(1)}, check 1's amount`),
      words: "Write the check's amount in dollars, more than zero: 3000000 or $3M.",
    },
    "check-before-any-call.json": {
      make: () => (tab("Investments"), type(`${inv(2)}, check 1's date`, "2020-01-10")),
      under: () => screen.getByLabelText(`${inv(2)}, check 1's amount`),
      words: "By this check's date the checks come to more than the investment calls. Checks are paid from capital called for investments.",
    },
    "check-date-not-a-date.json": {
      make: () => (tab("Investments"), type(`${inv(1)}, check 1's date`, "")),
      under: () => screen.getByLabelText(`${inv(1)}, check 1's date`),
      words: "Choose this check's date.",
    },
    "deal-by-deal-distribution-from-missing.json": {
      make: () => (tab("Investments"), click("button", "Remove investment 3")),
      under: () => screen.getByLabelText("From"),
      words: "Deal by deal, X comes from an investment: choose which.",
    },
    "deal-by-deal-distribution-without-investment.json": {
      make: () => {
        tab("Terms");
        click("radio", "On the whole fund");
        tab("Cash flows");
        choose("Row 6's investment", "—");
        tab("Terms");
        click("radio", "Deal by deal");
      },
      under: () => screen.getByLabelText("Row 6's investment"),
      words: "Deal by deal, every distribution comes from an investment: choose which.",
    },
    "deal-by-deal-later-close-without-rate.json": {
      make: () => (tab("Terms"), type("Equalization interest rate", "")),
      under: () => screen.getByLabelText("Equalization interest rate"),
      words: "Needed: an investment or expense call comes before a later close. Write 0 for none.",
    },
    "deal-by-deal-without-investments.json": {
      // Birch Health's write-off goes first: a write-off without its investment is refused before the investments are.
      make: () => {
        tab("Cash flows");
        click("button", "Remove row 7");
        tab("Investments");
        for (const n of [3, 2, 1]) click("button", `Remove investment ${n}`);
      },
      under: () => screen.getByRole("button", { name: "Add an investment" }),
      words: "Deal by deal needs the fund's investments: add each one, with its checks.",
    },
    "distribution-before-its-investment.json": {
      make: () => (tab("Cash flows"), type("Row 6's date", "2020-01-20")),
      under: () => screen.getByLabelText("Row 6's date"),
      words: "This distribution is before the first check in Alder Robotics, on 1 Feb 2020.",
    },
    "distribution-from-share-above-one.json": {
      make: () => type("Share sold", "200"),
      under: () => screen.getByLabelText("Share sold"),
      words: "Write the share X sells as a percent, above 0 and at most 100: 100 or 40.",
    },
    "flow-after-d-before-investment-checks.json": {
      make: () => (tab("Cash flows"), type("Row 6's date", "2024-07-01")),
      under: () => screen.getByLabelText("Row 6's date"),
      words: "This cash flow is after the distribution date, 30 Jun 2024.",
    },
    "flow-investment-blank.json": {
      make: () => (tab("Investments"), type(`${inv(1)}'s name`, "")),
      under: () => screen.getByLabelText("Row 6's investment"),
      words: "This investment has no name yet: name it on the Investments tab.",
    },
    "investment-name-blank.json": {
      make: () => (tab("Investments"), type(`${inv(3)}'s name`, " ")),
      under: () => screen.getByLabelText(`${inv(3)}'s name`),
      words: "Write the investment's name.",
    },
    "investment-name-repeated-after-its-checks.json": {
      make: () => (tab("Investments"), type(`${inv(3)}'s name`, "Alder Robotics"), type(`${inv(3)}, check 1's amount`, "-1")),
      under: () => screen.getByLabelText(`${inv(3)}, check 1's amount`),
      words: "Write the check's amount in dollars, more than zero: 3000000 or $3M.",
    },
    "investment-name-repeated.json": {
      make: () => (tab("Investments"), type(`${inv(3)}'s name`, "Alder Robotics")),
      under: () => screen.getByLabelText(`${inv(3)}'s name`),
      words: "An investment above already has this name; each investment needs its own.",
    },
    "investments-exceed-calls.json": {
      make: () => (tab("Investments"), type(`${inv(3)}, check 1's amount`, "4500000")),
      under: () => screen.getByLabelText(`${inv(3)}, check 1's amount`),
      words: "By this check's date the checks come to more than the investment calls. Checks are paid from capital called for investments.",
    },
    "share-above-one.json": {
      make: () => (tab("Cash flows"), type("Row 6's share sold", "150")),
      under: () => screen.getByLabelText("Row 6's share sold"),
      words: "Write the share sold as a percent, above 0 and at most 100: 100 or 40.",
    },
    "share-zero.json": {
      make: () => (tab("Cash flows"), type("Row 6's share sold", "0")),
      under: () => screen.getByLabelText("Row 6's share sold"),
      words: "Write the share sold as a percent, above 0 and at most 100: 100 or 40.",
    },
    "write-off-after-distribution-date.json": {
      make: () => (tab("Cash flows"), type("Row 7's date", "2024-07-01")),
      under: () => screen.getByLabelText("Row 7's date"),
      words: "This cash flow is after the distribution date, 30 Jun 2024.",
    },
    "write-off-before-its-investment.json": {
      make: () => (tab("Cash flows"), type("Row 7's date", "2020-02-15")),
      under: () => screen.getByLabelText("Row 7's date"),
      words: "This write-off is before the first check in Birch Health, on 1 Mar 2020.",
    },
    "write-off-without-investment.json": {
      make: () => (tab("Investments"), click("button", "Remove investment 2")),
      under: () => screen.getByLabelText("Row 7's investment"),
      words: "Choose the investment this write-off ends.",
    },
  };

  it("makes twenty-two in the form; the other thirty-three only a file can make", () => {
    expect(Object.keys(FORM)).toHaveLength(22);
    expect(fixtures.filter((f) => !(f in FORM))).toEqual([
      "call-unknown-fields-in-order.json",
      "carry-basis-after-the-classes.json",
      "carry-basis-not-text.json",
      "carry-basis-unknown.json",
      "check-after-d-before-unknown-investment.json",
      "check-not-an-object.json",
      "check-unknown-key.json",
      "deal-by-deal-compounded-pref.json",
      "deal-by-deal-pref-and-a-term-not-modeled.json",
      "deal-by-deal-with-pref.json",
      "distribution-from-investment-unknown.json",
      "distribution-from-not-an-object.json",
      "distribution-from-unknown-key.json",
      "distribution-from-without-investment.json",
      "flow-investment-not-text.json",
      "investment-checks-empty.json",
      "investment-checks-missing.json",
      "investment-name-missing.json",
      "investment-not-an-object.json",
      "investment-on-a-call.json",
      "investment-unknown-before-lp-class-unknown.json",
      "investment-unknown-key.json",
      "investment-unknown.json",
      "investments-before-distribution-from.json",
      "investments-not-a-list.json",
      "share-percent.json",
      "share-without-investment.json",
      "unknown-investment-before-exceed-calls.json",
      "unknown-investment-before-not-made.json",
      "whole-fund-investment-unknown.json",
      "write-off-investment-unknown.json",
      "write-off-with-a-share.json",
      "write-off-with-an-amount.json",
    ]);
  });

  it.each(Object.keys(FORM))("%s, made in the form, shows beside its field, and the Payouts notice says so", async (file) => {
    const f = fixture(file);
    render(<App />);
    await openFile(caseText(f.base));
    const { make, under, words } = FORM[file]!;
    make();
    const field = under();
    expect(problemOf(field)).toBe(words);
    // The form's refusal is at the fixture's path: the words shown are the ones for the control that path names.
    const path = caseFile(dir, "expected.json").fixtures[file].refused.field as string;
    expect(field.getAttribute("aria-describedby")).toBe(`${controlFor(path)}-problem`);
    tab("Payouts");
    expect(payoutsNotice()).toContain(words);
  });

  it("reads a share typed as 40%, as the terms' rates are, so a file's \"40%\" is one only a file has", async () => {
    render(<App />);
    await openFile(caseText("fund-34-deal-by-deal"));
    tab("Cash flows");
    type("Row 6's share sold", "40%");
    expect(tabNotice()).toBeNull();
    save();
    expect((await saved()).fund.cash_flows[5].share).toBe("0.4");
  });
});
