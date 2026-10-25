// The equalization card's figures (f03c), against the fund cases with later closes, 25 and 26: each LP's row at each
// close and over all of them is its exact amount from the case, rounded down to the cent, the back fees included from
// f04b (F29); the leftover is never negative and at most a cent an LP; the total is the column's exact total with
// toCents. Then case 26's figures as Jordan gave them, the card as a CSV, and a fund with no equalization rate (FA45).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { D, equalization, readFund } from "spillpoint-fund";
import { describe, expect, it } from "vitest";

import { equalizationBlocks, equalizationCsv, equalizationCsvName } from "../src/equalizationCard.ts";
import { PENDING } from "./support/cases.ts";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));

interface Amount {
  amount: string;
  exact: string;
}
interface Moves {
  name: string;
  capital_paid: Amount;
  capital_returned: Amount;
  interest_paid: Amount;
  interest_received: Amount;
  back_fees: Amount;
}
const COLUMNS = ["capital_paid", "capital_returned", "interest_paid", "interest_received", "back_fees"] as const;

/** An exact amount (FC1: "700000", "756000/73") as a fraction of whole numbers. */
function fraction(exact: string): [bigint, bigint] {
  const [num, den = "1"] = exact.split("/") as [string, string?];
  const [whole, frac = ""] = num.split(".") as [string, string?];
  return [BigInt(whole + frac), BigInt(den) * 10n ** BigInt(frac.length)];
}

/** Rounded down to the cent in whole-number arithmetic, as its own check on the page's 40 digits: "10356.16". */
function floorCents(exact: string): string {
  const [n, d] = fraction(exact);
  const cents = (n * 100n) / d; // never negative here, so this is the floor
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

/** The exact total of a column, to the cent half up, as toCents does: "44136.99". */
function totalCents(exacts: string[]): string {
  const [n, d] = exacts.map(fraction).reduce(([an, ad], [bn, bd]) => [an * bd + bn * ad, ad * bd], [0n, 1n]);
  const cents = (n * 200n + d) / (2n * d);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

// A pending case (support/cases.ts) waits for the page's step: its expected.json is ahead of the engine.
describe.each(["fund-25-later-close", "fund-26-closes-and-classes"].filter((d) => !PENDING.includes(d)))("%s: the equalization card", (dir) => {
  const eq = equalization(readFund(caseFile(dir, "inputs.json").fund))!;
  const expected = caseFile(dir, "expected.json").equalization as { rate: string; closes: { date: string; joining: string[]; lps: Moves[] }[]; lps: Moves[] };
  const blocks = equalizationBlocks(eq);
  const wanted = [...expected.closes.map((c) => ({ date: c.date as string | null, lps: c.lps })), { date: null, lps: expected.lps }];

  it("has a block for each close, in date order, then all the closes together", () => {
    expect(blocks.map((b) => b.date)).toEqual(wanted.map((w) => w.date));
    expect(blocks.at(-1)!.heading).toBe("All the closes together");
  });

  it.each(wanted.map((w, i) => [w.date ?? "all the closes", i] as const))("at %s: each row rounded down, the leftover and the total", (_, i) => {
    const b = blocks[i]!;
    const w = wanted[i]!;
    expect(b.rows.map((r) => r.name)).toEqual(w.lps.map((m) => m.name));
    COLUMNS.forEach((column, c) => {
      b.rows.forEach((r, j) => expect(r.amounts[c]!.toFixed(2), `${r.name}, ${column}`).toBe(floorCents(w.lps[j]![column].exact)));
      const left = b.leftover[c]!;
      expect(left.gte(0) && left.lte(new D("0.01").times(b.rows.length)), `${column} left over ${left.toFixed(2)}`).toBe(true);
      expect(b.total[c]!.toFixed(2), `${column} total`).toBe(totalCents(w.lps.map((m) => m[column].exact)));
      expect(b.rows.reduce((sum, r) => sum.plus(r.amounts[c]!), left).toFixed(2)).toBe(b.total[c]!.toFixed(2));
    });
  });
});

describe("case 26's equalization card", () => {
  const eq = equalization(readFund(caseFile("fund-26-closes-and-classes", "inputs.json").fund))!;
  const blocks = equalizationBlocks(eq);

  it("reads, over both closes, as Jordan gave it: Birchwood's 666,666.66 paid in, 9,863.01 interest and 50,000.00 back fees (F29)", () => {
    const all = blocks.at(-1)!;
    expect(all.rows.map((r) => [r.name, ...r.amounts.map((a) => a.toFixed(2))])).toEqual([
      ["Alder Endowment", "0.00", "1500000.00", "0.00", "32383.56", "0.00"],
      ["Birchwood Family Office", "666666.66", "416666.66", "9863.01", "11260.27", "50000.00"],
      ["Cedar Holdings", "1250000.00", "0.00", "33780.82", "0.00", "0.00"],
    ]);
    // 0.01 left over in each of the first four columns; the back fees are whole dollars.
    expect(all.leftover.map((a) => a.toFixed(2))).toEqual(["0.01", "0.01", "0.01", "0.01", "0.00"]);
    expect(all.total.map((a) => a.toFixed(2))).toEqual(["1916666.67", "1916666.67", "43643.84", "43643.84", "50000.00"]);
  });

  it("rounds each LP's exact total in all the closes, so Alder's interest there is a cent more than its two closes' added up", () => {
    expect(blocks.map((b) => b.heading)).toEqual(["1 Apr 2022: Birchwood Family Office joins", "1 Oct 2022: Cedar Holdings joins", "All the closes together"]);
    const alder = blocks.map((b) => b.rows.find((r) => r.name === "Alder Endowment")!.amounts[3]!.toFixed(2));
    expect(alder).toEqual(["9863.01", "22520.54", "32383.56"]);
  });

  it("is a CSV of every block, each close by its date, then all the closes, named after the fund", () => {
    const text = equalizationCsv(blocks);
    expect(text.startsWith("﻿")).toBe(true);
    expect(text.replace(/^﻿/, "").split("\r\n")).toEqual([
      "Close,LP,Paid in,Got back,Interest paid,Interest received,Back fees",
      "2022-04-01,Alder Endowment,0.00,666666.66,0.00,9863.01,0.00",
      "2022-04-01,Birchwood Family Office,666666.66,0.00,9863.01,0.00,50000.00",
      "2022-04-01,Left over from rounding down,0.01,0.01,0.00,0.00,0.00",
      "2022-04-01,Total,666666.67,666666.67,9863.01,9863.01,50000.00",
      "2022-10-01,Alder Endowment,0.00,833333.33,0.00,22520.54,0.00",
      "2022-10-01,Birchwood Family Office,0.00,416666.66,0.00,11260.27,0.00",
      "2022-10-01,Cedar Holdings,1250000.00,0.00,33780.82,0.00,0.00",
      "2022-10-01,Left over from rounding down,0.00,0.01,0.00,0.01,0.00",
      "2022-10-01,Total,1250000.00,1250000.00,33780.82,33780.82,0.00",
      "All closes,Alder Endowment,0.00,1500000.00,0.00,32383.56,0.00",
      "All closes,Birchwood Family Office,666666.66,416666.66,9863.01,11260.27,50000.00",
      "All closes,Cedar Holdings,1250000.00,0.00,33780.82,0.00,0.00",
      "All closes,Left over from rounding down,0.01,0.01,0.01,0.01,0.00",
      "All closes,Total,1916666.67,1916666.67,43643.84,43643.84,50000.00",
      "",
    ]);
    expect(equalizationCsvName("Two later closes and a friends-and-family class")).toBe("two-later-closes-and-a-friends-and-family-class-equalization.csv");
  });
});

describe("an equalization with no rate (FA45)", () => {
  // Case 25 with its first investment call moved to Cedar's close: only the fee call comes before it, so no rate is
  // given. Cedar pays its $20,000 of back fees and catches up on nothing; nobody pays or gets interest.
  const base = caseFile("fund-25-later-close", "inputs.json").fund;
  const { equalization_rate: _, ...terms } = base.terms;
  const flows = base.cash_flows.map((f: { date: string }, i: number) => (i === 0 ? { ...f, date: "2021-07-15" } : f));
  const eq = equalization(readFund({ ...base, terms, cash_flows: flows }))!;

  it("has no rate, and every interest amount is 0.00, the back fees as the joiner owes them", () => {
    expect(eq.rate).toBeNull();
    const all = equalizationBlocks(eq).at(-1)!;
    expect(all.rows.map((r) => [r.name, ...r.amounts.map((a) => a.toFixed(2))])).toEqual([
      ["Alder Endowment", "0.00", "0.00", "0.00", "0.00", "0.00"],
      ["Birchwood Family Office", "0.00", "0.00", "0.00", "0.00", "0.00"],
      ["Cedar Holdings", "0.00", "0.00", "0.00", "0.00", "20000.00"],
    ]);
  });
});
