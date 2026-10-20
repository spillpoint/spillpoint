// The LPs' card's figures (f02c), against the fund cases: at every point of cases 17 to 20, each LP's row is its exact
// amount from the case, rounded down to the cent; the leftover is never negative and at most a cent an LP; and the
// total row is the page's own figure for the LPs, which the case gives. Then the card as a CSV.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { D, readFund, splitAt, splitAtNav } from "spillpoint-fund";
import { describe, expect, it } from "vitest";

import { csvField, downToCent, lpsCsv, lpsCsvName, lpsTable } from "../src/lpsCard.ts";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));
const LP_CASES = ["fund-17-lps-three", "fund-18-lps-thirds", "fund-19-lps-clawback", "fund-20-lps-spv"];

interface LpAmount {
  amount: string;
  exact: string;
}
interface Point {
  x: string;
  exact: string;
  tags: string[];
  distribution: { lps: { total: string } };
  to_date: { lps: { total: string } };
  clawback?: { owed: string };
  by_lp: { name: string; distribution: LpAmount; to_date: LpAmount; clawback?: LpAmount }[];
}

/**
 * An exact amount (FC1: "666666.5", "2000000/3") rounded down to the cent in whole-number arithmetic, as its own check
 * on the page's 40-digit rounding: "666666.66".
 */
function floorCents(exact: string): string {
  const [num, den] = exact.includes("/") ? (exact.split("/") as [string, string]) : [exact, "1"];
  const [whole, frac = ""] = num.split(".") as [string, string?];
  const n = BigInt(whole + frac) * 100n;
  const d = BigInt(den) * 10n ** BigInt(frac.length);
  const cents = n / d; // amounts here are never negative, so this is the floor
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

describe.each(LP_CASES)("%s: the LPs' card at every point", (dir) => {
  const fund = readFund(caseFile(dir, "inputs.json").fund);
  const expected = caseFile(dir, "expected.json");
  const paidIn: LpAmount[] = expected.lps.map((lp: { paid_in: LpAmount }) => lp.paid_in);

  it.each((expected.points as Point[]).map((p) => [p.x, p] as const))("at %s", (_, p) => {
    // The card follows the split it's shown with: at the NAV point, the NAV split, final by definition (F14).
    const split = p.tags.includes("nav") && !fund.final ? splitAtNav(fund)! : splitAt(fund, p.exact);
    const table = lpsTable(split);
    const owes = p.clawback !== undefined && p.clawback.owed !== "0.00";
    expect(table.headings).toEqual(["LP", "Share", "Paid in", "This distribution", "To date", ...(owes ? ["Share of the clawback"] : [])]);
    expect(table.rows.map((r) => r.name)).toEqual(p.by_lp.map((r) => r.name));
    const columns: [string, (i: number) => LpAmount, string][] = [
      ["paid in", (i) => paidIn[i]!, expected.lps_paid_in],
      ["this distribution", (i) => p.by_lp[i]!.distribution, p.distribution.lps.total],
      ["to date", (i) => p.by_lp[i]!.to_date, p.to_date.lps.total],
      ...(owes ? [["the clawback", (i: number) => p.by_lp[i]!.clawback!, p.clawback!.owed] as [string, (i: number) => LpAmount, string]] : []),
    ];
    columns.forEach(([what, exactOf, lpsAmount], c) => {
      // Each LP's row: its exact amount, rounded down to the cent.
      table.rows.forEach((r, i) => expect(r.amounts[c]!.toFixed(2), `${r.name}, ${what}`).toBe(floorCents(exactOf(i).exact)));
      // The leftover: never negative, and at most a cent an LP.
      const left = table.leftover[c]!;
      expect(left.gte(0) && left.lte(new D("0.01").times(table.rows.length)), `${what} left over ${left.toFixed(2)}`).toBe(true);
      // The total row: the page's own figure for the LPs, which is the case's.
      expect(table.total[c]!.toFixed(2), `${what} total`).toBe(lpsAmount);
      expect(table.rows.reduce((sum, r) => sum.plus(r.amounts[c]!), left).toFixed(2)).toBe(lpsAmount);
    });
  });
});

describe("the leftover", () => {
  it("is a cent for one LP whose amount is $0.005: it gets $0.00", () => {
    const fund = readFund({ ...caseFile("fund-01-one-call", "inputs.json").fund, lps: [{ name: "Alder", commitment: "1" }] });
    const table = lpsTable(splitAt(fund, "0.005"));
    expect([table.rows[0]!.amounts[1]!.toFixed(2), table.leftover[1]!.toFixed(2), table.total[1]!.toFixed(2)]).toEqual(["0.00", "0.01", "0.01"]);
  });

  it("is never negative and at most a cent an LP, for seven LPs at 1 to 7 at every cent up to $3", () => {
    const fund = readFund({ ...caseFile("fund-01-one-call", "inputs.json").fund, lps: [1, 2, 3, 4, 5, 6, 7].map((c) => ({ name: `LP ${c}`, commitment: String(c) })) });
    for (let cent = 0; cent <= 300; cent++) {
      const table = lpsTable(splitAt(fund, new D(cent).div(100)));
      for (const left of table.leftover) expect(left.gte(0) && left.lte("0.07"), `at ${cent} cents: ${left.toFixed(2)}`).toBe(true);
    }
  });

  it("rounds a whole number of cents that's a hair under at 40 digits to itself, after 20 places", () => {
    expect(downToCent(new D("666666.66").minus("1e-35")).toFixed(2)).toBe("666666.66");
    expect(downToCent(new D("666666.669999")).toFixed(2)).toBe("666666.66");
  });
});

describe("shares, to two places", () => {
  it("reads 1/3, 11/21 and 1/7 as 33.33%, 52.38% and 14.29%", () => {
    const fund = readFund(caseFile("fund-20-lps-spv", "inputs.json").fund);
    expect(lpsTable(splitAt(fund, "1000000")).rows.map((r) => r.share)).toEqual(["33.33%", "52.38%", "14.29%"]);
  });
});

describe("the CSV", () => {
  it("for case 18 at $2,000,000 reads 666666.66 three times, 0.02 left over and 2000000.00 in all", () => {
    const fund = readFund(caseFile("fund-18-lps-thirds", "inputs.json").fund);
    const csv = lpsCsv(lpsTable(splitAt(fund, "2000000")));
    expect(csv).toBe(
      "﻿" +
        [
          "LP,Share,Paid in,This distribution,To date",
          "Alder,33.33%,1666666.66,666666.66,666666.66",
          "Birch,33.33%,1666666.66,666666.66,666666.66",
          "Cedar,33.33%,1666666.66,666666.66,666666.66",
          "Left over from rounding down,,0.02,0.02,0.02",
          "Total,100%,5000000.00,2000000.00,2000000.00",
        ].join("\r\n") +
        "\r\n",
    );
  });

  it("has a column for the clawback when one is owed: case 19 at $0", () => {
    const fund = readFund(caseFile("fund-19-lps-clawback", "inputs.json").fund);
    const lines = lpsCsv(lpsTable(splitAt(fund, "0"))).slice(1).split("\r\n");
    expect(lines[0]).toBe("LP,Share,Paid in,This distribution,To date,Share of the clawback");
    expect(lines.slice(1, 5)).toEqual([
      "Alder Endowment,70.00%,14000000.00,0.00,17675000.00,1925000.00",
      "Birchwood Family Office,30.00%,6000000.00,0.00,7575000.00,825000.00",
      "Left over from rounding down,,0.00,0.00,0.00,0.00",
      "Total,100%,20000000.00,0.00,25250000.00,2750000.00",
    ]);
  });

  it("quotes as RFC 4180, and keeps a spreadsheet from reading a name as a formula", () => {
    expect(csvField("Cedar, LP")).toBe('"Cedar, LP"');
    expect(csvField('The "Oak" Trust')).toBe('"The ""Oak"" Trust"');
    expect(csvField("Two\nlines")).toBe('"Two\nlines"');
    expect(csvField("Ñandú")).toBe("Ñandú");
    expect(["=SUM(A1)", "+1", "-5", "@home"].map(csvField)).toEqual(["'=SUM(A1)", "'+1", "'-5", "'@home"]);
    expect(csvField('=HYPERLINK("x", "y")')).toBe(`"'=HYPERLINK(""x"", ""y"")"`);
    expect(csvField("Alder")).toBe("Alder");
  });

  it("is named as Save names its file, with X and D", () => {
    expect(lpsCsvName("A late call and a clawback", new D("15000000"), "2025-01-01")).toBe("a-late-call-and-a-clawback-lps-at-15000000-on-2025-01-01.csv");
    expect(lpsCsvName("A VC fund", new D(191500000).div(3), "2026-09-30")).toBe("a-vc-fund-lps-at-63833333.33-on-2026-09-30.csv");
    expect(lpsCsvName("", new D(0), "2026-03-01")).toBe("fund-lps-at-0-on-2026-03-01.csv");
  });
});
