// The chart and the breakpoints (plan step 2, f01g): the lines are exact because they're drawn from the engine's split at
// every breakpoint; every breakpoint is listed in the engine's words, numbered as on the chart and the slider; and the
// slider, its marks and the range's top move X.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, readFund, splitAt } from "spillpoint-fund";
import examples from "virtual:fund-examples";
import { describe, expect, it } from "vitest";

import { breakpointViews, chartPoints, defaultTop } from "../src/analysis.ts";
import { App } from "../src/App.tsx";
import { PENDING, RUN_CASES } from "./support/cases.ts";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));
const fundOf = (dir: string) => readFund(caseFile(dir, "inputs.json").fund);
const CLOSE = new D("1e-20");

/** The page, opened on an example picked from the list. */
function open(id: string) {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Start from"), { target: { value: id } });
}

describe("the chart's lines are exact", () => {
  it.each(RUN_CASES)("%s: X's split at every point between two chart points is on the straight line between them", (dir) => {
    const fund = fundOf(dir);
    const bps = breakpointViews(fund);
    const top = defaultTop(fund, bps, new D(0));
    const points = chartPoints(fund, bps, top);
    expect(points[0]!.x.isZero()).toBe(true);
    expect(points.at(-1)!.x.eq(top)).toBe(true);
    // Every breakpoint below the top is a point, so the lines bend only where the engine says.
    for (const b of bps.filter((b) => b.x.lt(top))) expect(points.some((p) => p.x.eq(b.x)), `breakpoint ${b.n}`).toBe(true);
    for (const [a, b] of points.slice(1).map((p, i) => [points[i]!, p] as const)) {
      for (const t of ["0.25", "0.5", "0.75"]) {
        const x = a.x.plus(b.x.minus(a.x).times(t));
        const d = splitAt(fund, x).distribution;
        const line = (k: "lps" | "gp" | "gpCommitment") => a[k].plus(b[k].minus(a[k]).times(t));
        expect(d.lps.total.minus(line("lps")).abs().lte(CLOSE), `${dir} LPs at ${x}`).toBe(true);
        expect(d.gp.total.minus(line("gp")).abs().lte(CLOSE), `${dir} GP at ${x}`).toBe(true);
        expect(d.gpCommitment.minus(line("gpCommitment")).abs().lte(CLOSE), `${dir} GP commitment at ${x}`).toBe(true);
      }
    }
  });

  it.each(RUN_CASES)("%s: the GP's carry per extra $1M on each side of a breakpoint is the engine's, a dollar either side", (dir) => {
    const fund = fundOf(dir);
    const gp = (x: D) => splitAt(fund, x).distribution.gp.total;
    for (const b of breakpointViews(fund)) {
      expect(gp(b.x).minus(gp(b.x.minus(1))).times(1_000_000).minus(b.gpPerMillion.below).abs().lte(CLOSE), `below ${b.n}`).toBe(true);
      expect(gp(b.x.plus(1)).minus(gp(b.x)).times(1_000_000).minus(b.gpPerMillion.above).abs().lte(CLOSE), `above ${b.n}`).toBe(true);
    }
  });

  it("chooses each example's range: 2 x paid-in, 1.25 x the last breakpoint, 1.5 x NAV, 1.25 x the opening X, the largest, to two digits", () => {
    const tops = examples.map((e) => {
      const fund = readFund(e.fund);
      return defaultTop(fund, breakpointViews(fund), new D(e.defaultX)).toString();
    });
    // Case 3: 1.25 x its opening $20,000,000; case 8: 1.25 x $63,833,333.33; case 13: 2 x $20,000,000; case 26: 2 x its
    // $5,250,000 paid in, up to two digits; case 29: 2 x its $33,925,000 paid in, its schedule's fees included, up to two
    // digits; case 12: 1.5 x $6,000,000.
    expect(tops).toEqual(["25000000", "80000000", "40000000", "11000000", "68000000", "9000000"]);
  });

  it("opens case 3 on a range that takes in its opening X with room to spare", () => {
    render(<App />);
    expect(screen.getByRole("slider", { name: "X, from $0 to $25M" })).toBeDefined();
  });
});

/** The list's items: each breakpoint's head, then its sentences. */
function listed() {
  return within(screen.getByRole("region", { name: "Breakpoints" }))
    .getAllByRole("listitem")
    .map((li) => [...li.querySelectorAll("p")].map((p) => p.textContent));
}

describe("the breakpoints", () => {
  // An example whose case is pending (support/cases.ts) waits for the page's step: its expected.json is ahead of the engine.
  it.each(examples.filter((e) => !PENDING.includes(e.id)).map((e) => [e.id] as const))("lists %s's breakpoints in the engine's words, each with the GP's carry per extra $1M", (id) => {
    open(id);
    const expected = caseFile(id, "expected.json").breakpoints as { x: string; reasons: { text: string }[] }[];
    const items = listed();
    expect(items).toHaveLength(expected.length);
    expected.forEach((b, i) => {
      const words = b.reasons.map((r) => `${r.text.charAt(0).toUpperCase()}${r.text.slice(1)}.`);
      expect(items[i]!.slice(0, -1)).toEqual(words);
      expect(items[i]!.at(-1)).toMatch(/^The GP's carry (goes from \$[\d,]+ to \$[\d,]+|stays at \$[\d,]+) per extra \$1M\.$/);
    });
  });

  it("gives case 8's three, at $7,000,000, $34,500,000 and $63,833,333.33, with the GP's carry per $1M at each", () => {
    open("fund-17-lps-three");
    const heads = within(screen.getByRole("region", { name: "Breakpoints" })).getAllByRole("button").map((b) => b.textContent);
    expect(heads).toEqual(["1$7,000,000.00 ($7M)", "2$34,500,000.00 ($34.5M)", "3$63,833,333.33 ($63.8M)"]);
    expect(listed()).toEqual([
      ["LPs have their $10,890,000 of paid-in capital back.", "The GP's carry goes from $0 to $198,000 per extra $1M."],
      ["LPs reach 3.0x: carry is 25% from here.", "The GP's carry goes from $198,000 to $247,500 per extra $1M."],
      ["LPs reach 5.0x: carry is 30% from here.", "The GP's carry goes from $247,500 to $297,000 per extra $1M."],
    ]);
    // Not final: no clawback's reasons, and the intro doesn't mention one.
    expect(screen.getByText(/^A breakpoint is a distribution X/).textContent).toBe("A breakpoint is a distribution X where one of its tiers ends, so the split bends. Choose one to move X there.");
  });

  it("lists case 13's clawback reasons too, since it's final", () => {
    open("fund-19-lps-clawback");
    expect(listed()).toEqual([
      ["LPs have their $20,000,000 of paid-in capital back.", "The clawback owed stops falling.", "The GP's carry goes from $0 to $200,000 per extra $1M."],
      ["The clawback owed starts to fall: on the fund's totals, LPs reach 2.0x: carry is 30% from here.", "The GP's carry stays at $200,000 per extra $1M."],
      ["LPs reach 2.0x: carry is 30% from here.", "The clawback owed stops falling.", "The GP's carry goes from $200,000 to $300,000 per extra $1M."],
    ]);
    expect(screen.getByText(/^A breakpoint is a distribution X/).textContent).toContain("or where the clawback owed changes, since this is the fund's last distribution");
  });

  it("moves X to a breakpoint exactly when it's chosen: case 8's third, where the LPs reach 5.0x", () => {
    open("fund-17-lps-three");
    fireEvent.click(within(screen.getByRole("region", { name: "Breakpoints" })).getAllByRole("button")[2]!);
    expect((screen.getByLabelText(/^Distribution on/) as HTMLInputElement).value).toBe("$63,833,333.33");
    expect(screen.getByRole("heading", { name: "The split at $63,833,333.33" })).toBeDefined();
    // At the step exactly the LPs have 5.0x, and the 30% step has paid nothing yet.
    expect(screen.getByText("The LPs' net multiple to date", { selector: "dt" }).nextElementSibling!.textContent).toBe("5.00x");
    expect(screen.getAllByText("X is here")).toHaveLength(1);
  });
});

describe("the slider, its marks and the range", () => {
  it("runs from $0 to the range's top, and moves X", () => {
    open("fund-17-lps-three");
    const slider = screen.getByRole("slider", { name: "X, from $0 to $80M" });
    expect(slider.getAttribute("aria-valuetext")).toBe("$40,000,000");
    fireEvent.change(slider, { target: { value: "250" } });
    expect((screen.getByLabelText(/^Distribution on/) as HTMLInputElement).value).toBe("$20,000,000");
    expect(screen.getByRole("heading", { name: "The split at $20,000,000" })).toBeDefined();
  });

  it("marks every breakpoint and NAV under the slider in order of X, numbered as in the list; choosing one moves X there", () => {
    open("fund-17-lps-three");
    const marks = screen.getAllByRole("button", { name: /^(Breakpoint \d|NAV), at/ });
    expect(marks.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Breakpoint 1, at $7,000,000.00",
      "Breakpoint 2, at $34,500,000.00",
      "NAV, at $40,000,000.00",
      "Breakpoint 3, at $63,833,333.33",
    ]);
    // NAV is too close to breakpoint 2 to share its row: it steps down one.
    expect(marks.map((b) => b.style.top)).toEqual(["0px", "0px", "22px", "0px"]);
    fireEvent.click(screen.getByRole("button", { name: "Breakpoint 2, at $34,500,000.00" }));
    expect((screen.getByLabelText(/^Distribution on/) as HTMLInputElement).value).toBe("$34,500,000");
    fireEvent.click(screen.getByRole("button", { name: "NAV, at $40,000,000.00" }));
    expect((screen.getByLabelText(/^Distribution on/) as HTMLInputElement).value).toBe("$40,000,000");
  });

  it("takes a typed top, says when one isn't an amount, and rises to take in an X typed past it", () => {
    open("fund-17-lps-three");
    const topBox = screen.getByLabelText("The slider and the chart run up to");
    expect((topBox as HTMLInputElement).value).toBe("$80,000,000");
    fireEvent.change(topBox, { target: { value: "$50M" } });
    expect(screen.getByRole("slider", { name: "X, from $0 to $50M" })).toBeDefined();
    // Case 8's third breakpoint is past $50M: the chart says so, and the slider doesn't mark it.
    expect(screen.getByText(/One breakpoint is past \$50M; raise the range's top to see it\./)).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Breakpoint 3/ })).toBeNull();
    fireEvent.change(topBox, { target: { value: "lots" } });
    expect(screen.getByText("Write an amount above $0: 100000000, 100,000,000 or $100M.")).toBeDefined();
    fireEvent.change(screen.getByLabelText(/^Distribution on/), { target: { value: "$150M" } });
    // $150M is past $50M, so the range rises to 1.25 x $150M, to two digits: $190M.
    expect(screen.getByRole("slider", { name: "X, from $0 to $190M" })).toBeDefined();
  });
});

describe("the chart", () => {
  it("marks every breakpoint, NAV and X, and gives each line's value at X in its legend", () => {
    open("fund-17-lps-three");
    const chart = screen.getByRole("img", { name: /lines against X, from \$0 to \$80M, with 3 breakpoints marked/ });
    const texts = [...chart.querySelectorAll("svg text")].map((t) => t.textContent);
    for (const mark of ["1", "2", "3", "NAV", "X = $40M"]) expect(texts).toContain(mark);
    const legend = within(screen.getByRole("list", { name: "Values at X = $40,000,000.00" }))
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(legend).toEqual(["The GP's carry$6,806,250.00", "The LPs$32,793,750.00", "The GP commitment$400,000.00"]);
  });

  it("leaves out the GP commitment's line in a fund without one", () => {
    open("fund-19-lps-clawback");
    fireEvent.change(screen.getByLabelText(/^Distribution on/), { target: { value: "15000000" } });
    const legend = within(screen.getByRole("list", { name: /^Values at X/ })).getAllByRole("listitem").map((li) => li.textContent);
    expect(legend).toEqual(["The GP's carry$1,000,000.00", "The LPs$14,000,000.00"]);
  });
});
