// The clawback (plan step 3, f01h): the card's sentence holds the reference's carry paid, entitlement and owed at every
// point of every final case; its small chart is exact, because the engine reports every X where what's owed bends;
// the headline never shows carry without the clawback beside it; and the NAV button sets X to NAV, where a fund that
// isn't final has its clawback too.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, readFund, splitAt, splitAtNav } from "spillpoint-fund";
import { describe, expect, it } from "vitest";

import { breakpointViews, defaultTop, owedPoints } from "../src/analysis.ts";
import { answerText, App } from "../src/App.tsx";
import { clawbackSentence } from "../src/Clawback.tsx";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));
const RUN_CASES = readdirSync(casesDir).filter((d) => d.startsWith("fund-") && !d.endsWith("refused"));
const FINAL_CASES = RUN_CASES.filter((d) => caseFile(d, "inputs.json").fund.final === true);
const fundOf = (dir: string) => readFund(caseFile(dir, "inputs.json").fund);
const CLOSE = new D("1e-20");

interface ExpectedClawback {
  carry_paid: string;
  entitlement: string;
  owed: string;
}

/** "2750000.00" as the page writes it: "$2,750,000.00". */
const money = (s: string) => {
  const [whole, part] = s.split(".") as [string, string];
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${part}`;
};

/** The sentence the card should give for a case's expected clawback. */
const sentenceFor = (c: ExpectedClawback) =>
  `If this is the fund's last distribution, the GP has been paid ${money(c.carry_paid)} of carry, has earned ${money(c.entitlement)} on the fund's totals, and ${
    c.owed === "0.00" ? "owes nothing back to the LPs" : `owes ${money(c.owed)} back to the LPs`
  }.`;

/** The page, opened on an example picked from the list. */
function open(id: string) {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Start from"), { target: { value: id } });
}

const xBox = () => screen.getByLabelText(/^Distribution on/) as HTMLInputElement;
const typeX = (text: string) => fireEvent.change(xBox(), { target: { value: text } });
const card = () => screen.getByRole("region", { name: "The clawback" });
const sentence = () => within(card()).getByText(/^If this is the fund's last distribution/).textContent;
const owedLegend = () => within(card()).getByRole("list", { name: /^Owed at X/ }).textContent;

describe("the clawback's sentence and chart", () => {
  it("covers every final case: 10, 11, 12, 13, 15 and 16", () => {
    expect(FINAL_CASES).toEqual(["fund-10-clawback", "fund-11-clawback-pref", "fund-12-spv", "fund-13-clawback-steps", "fund-15-clawback-capital", "fund-16-clawback-catch-up"]);
  });

  it.each(FINAL_CASES)("%s: the sentence gives the case's carry paid, entitlement and owed at every point", (dir) => {
    const fund = fundOf(dir);
    const points = (caseFile(dir, "expected.json").points as { x: string; clawback: ExpectedClawback }[]).filter((p) => p.clawback);
    expect(points.length).toBeGreaterThan(0);
    for (const p of points) expect(clawbackSentence(splitAt(fund, p.x.replace(/\.00$/, "")).clawback!), `${dir} at ${p.x}`).toBe(sentenceFor(p.clawback));
  });

  it.each(FINAL_CASES)("%s: what's owed at every X between two of the chart's points is on the straight line between them", (dir) => {
    const fund = fundOf(dir);
    const bps = breakpointViews(fund);
    const top = defaultTop(fund, bps, new D(0));
    const points = owedPoints(fund, bps, top);
    expect(points[0]!.x.isZero()).toBe(true);
    expect(points.at(-1)!.x.eq(top)).toBe(true);
    const owed = (x: D) => splitAt(fund, x).clawback!.owed;
    const offLine = (a: (typeof points)[number], b: (typeof points)[number]) =>
      ["0.25", "0.5", "0.75"].some((t) => {
        const x = a.x.plus(b.x.minus(a.x).times(t));
        return owed(x).minus(a.owed.plus(b.owed.minus(a.owed).times(t))).abs().gt(CLOSE);
      });
    for (const [a, b] of points.slice(1).map((p, i) => [points[i]!, p] as const)) expect(offLine(a, b), `${dir} from ${a.x} to ${b.x}`).toBe(false);
    // The bends matter: with them left out, a case that owes anything isn't a straight line from $0 to the top.
    if (points[0]!.owed.gt(0)) expect(offLine(points[0]!, points.at(-1)!)).toBe(true);
  });
});

describe("case 13: a late call and a clawback", () => {
  it("opens at $0, owing $2,750,000.00: the GP has been paid $4,750,000.00 and has earned $2,000,000.00", () => {
    open("fund-13-clawback-steps");
    expect(xBox().value).toBe("$0");
    expect(screen.getByRole("region", { name: "The answer" }).querySelector(".headline__answer")!.textContent).toBe(
      "With nothing distributed on 1 Jan 2025, the GP's carry is $0, and it owes $2.75M back.",
    );
    expect(sentence()).toBe(
      "If this is the fund's last distribution, the GP has been paid $4,750,000.00 of carry, has earned $2,000,000.00 on the fund's totals, and owes $2,750,000.00 back to the LPs.",
    );
    expect(owedLegend()).toBe("The clawback$2,750,000.00");
  });

  it("owes $750,000.00 from $10,000,000 to $15,000,000, then $656,250.00 from $15,937,500 on", () => {
    open("fund-13-clawback-steps");
    const owedAt = (x: string) => {
      typeX(x);
      return owedLegend().replace("The clawback", "");
    };
    expect(["10000000", "12000000", "15000000", "15937500", "25000000"].map(owedAt)).toEqual(["$750,000.00", "$750,000.00", "$750,000.00", "$656,250.00", "$656,250.00"]);
    // Between $15,000,000 and $15,937,500 it falls on a straight line: halfway, halfway between $750,000 and $656,250.
    expect(owedAt("15468750")).toBe("$703,125.00");
    typeX("15000000");
    expect(screen.getByRole("region", { name: "The answer" }).querySelector(".headline__answer")!.textContent).toBe(
      "At a $15M distribution on 1 Jan 2025, the GP's carry is $1M, and it owes $750K back.",
    );
  });

  it("lists where the clawback bends, in the engine's words, numbered as in the breakpoint list, with what's owed at each", () => {
    open("fund-13-clawback-steps");
    const items = within(within(card()).getByRole("list", { name: "Where the clawback bends" }))
      .getAllByRole("listitem")
      .map((li) => [li.querySelector("button")!.textContent, ...[...li.querySelectorAll("p")].map((p) => p.textContent)]);
    expect(items).toEqual([
      ["1$10,000,000.00", "The clawback owed stops falling.", "Owed at this X: $750,000.00."],
      ["2$15,000,000.00", "The clawback owed starts to fall: on the fund's totals, LPs reach 2.0x: carry is 30% from here.", "Owed at this X: $750,000.00."],
      ["3$15,937,500.00", "The clawback owed stops falling.", "Owed at this X: $656,250.00."],
    ]);
  });

  it("marks the bends and X on its own chart, and moves X to a bend when it's chosen", () => {
    open("fund-13-clawback-steps");
    const chart = within(card()).getByRole("img", { name: "The clawback owed against X, from $0 to $40M, with 3 breakpoints marked." });
    const texts = [...chart.querySelectorAll("svg text")].map((t) => t.textContent);
    for (const mark of ["1", "2", "3", "X = $0"]) expect(texts).toContain(mark);
    fireEvent.click(within(card()).getAllByRole("button")[2]!);
    expect(xBox().value).toBe("$15,937,500");
    expect(sentence()).toBe(
      "If this is the fund's last distribution, the GP has been paid $5,937,500.00 of carry, has earned $5,281,250.00 on the fund's totals, and owes $656,250.00 back to the LPs.",
    );
  });
});

describe("the NAV point", () => {
  it("case 8 opens at NAV, owing nothing: the card says so, and the headline has no clawback", () => {
    open("fund-08-carry-steps");
    expect(sentence()).toBe(sentenceFor(caseFile("fund-08-carry-steps", "expected.json").points.find((p: { x: string }) => p.x === "40000000.00").clawback));
    expect(sentence()).toBe(
      "If this is the fund's last distribution, the GP has been paid $6,806,250.00 of carry, has earned $6,806,250.00 on the fund's totals, and owes nothing back to the LPs.",
    );
    expect(within(card()).queryByRole("img")).toBeNull();
    expect(within(card()).getByText("The fund isn't final, so away from NAV there's no clawback, and no chart of one against X.")).toBeDefined();
    expect(screen.getByRole("region", { name: "The answer" }).querySelector(".headline__answer")!.textContent).toBe(
      "At a $40M distribution on 30 Sep 2026, the GP's carry is $6.81M.",
    );
    expect(screen.getByText("X is at NAV")).toBeDefined();
  });

  it("case 8 has no clawback card away from NAV, and the NAV button sets X back to NAV", () => {
    open("fund-08-carry-steps");
    typeX("34500000");
    expect(screen.queryByRole("region", { name: "The clawback" })).toBeNull();
    expect(screen.queryByText("X is at NAV")).toBeNull();
    const nav = screen.getByRole("button", { name: "Set X to NAV" });
    expect(nav.nextElementSibling!.textContent).toBe("At NAV, $40,000,000.00, as if the fund were liquidated on 30 Sep 2026; the clawback card then shows what the GP would owe back.");
    fireEvent.click(nav);
    expect(xBox().value).toBe("$40,000,000");
    expect(card()).toBeDefined();
  });

  it("case 3 has no NAV, so no button, and isn't final, so no clawback card", () => {
    render(<App />);
    expect(screen.queryByRole("button", { name: "Set X to NAV" })).toBeNull();
    expect(screen.queryByRole("region", { name: "The clawback" })).toBeNull();
  });

  it("case 12, final, owes nothing at any X: no chart, and the card says why", () => {
    open("fund-12-spv");
    expect(sentence()).toBe(
      "If this is the fund's last distribution, the GP has been paid $792,000.00 of carry, has earned $792,000.00 on the fund's totals, and owes nothing back to the LPs.",
    );
    expect(within(card()).queryByRole("img")).toBeNull();
    expect(within(card()).getByText(/^Nothing is owed at any X/)).toBeDefined();
    // Final, so NAV is a point like any other: the button doesn't mention the card.
    expect(screen.getByRole("button", { name: "Set X to NAV" }).nextElementSibling!.textContent).toBe("At NAV, $6,000,000.00, as if the fund were liquidated on 1 May 2026.");
    typeX("0");
    expect(within(card()).getByText(/^Nothing is owed at any X/)).toBeDefined();
  });

  it("says what a fund that isn't final would owe if liquidated at NAV: case 13's terms, not final, NAV $10M", () => {
    const fund = readFund({ ...caseFile("fund-13-clawback-steps", "inputs.json").fund, final: false, nav: "10000000" });
    const atNav = splitAtNav(fund)!;
    expect(atNav.clawback!.owed.toFixed(2)).toBe("750000.00");
    expect(answerText(fund, atNav, atNav.clawback!.owed)).toBe(
      "At a $10M distribution on 1 Jan 2025, the GP's carry is $0, and if the fund were liquidated at NAV it would owe $750K back.",
    );
    // Away from NAV, a fund that isn't final has no clawback.
    expect(splitAt(fund, "15000000").clawback).toBeNull();
  });
});
