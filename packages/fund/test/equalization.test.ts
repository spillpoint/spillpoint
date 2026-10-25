// The engine's equalization against every fund case with a later close (F25, F26, FC11): each close in date order,
// the LPs joining and in by then, and every amount each paid in or got back, with the interest and, from 0.4.0, the back
// fees (F29, F31, FC13), to the cent and within FA15 of exact. A fund without a later close has none.

import { describe, expect, it } from "vitest";

import { D, equalization, readFund, toCents } from "../src/index.ts";
import type { EqualizationAmounts } from "../src/index.ts";
import { RUN_CASES, exact, readCaseFile } from "./support/cases.ts";
import type { CaseExpected, CaseInputs, CaseMoves } from "./support/cases.ts";

/** FA15: two ways of working out one exact amount agree within this. */
const CLOSE = new D("1e-18");

const KEYS = [
  ["capitalPaid", "capital_paid"],
  ["capitalReturned", "capital_returned"],
  ["interestPaid", "interest_paid"],
  ["interestReceived", "interest_received"],
  ["backFees", "back_fees"],
] as const;

function sameMoves(got: EqualizationAmounts[], want: CaseMoves[], where: string) {
  expect(got.map((m) => m.name), where).toEqual(want.map((m) => m.name));
  got.forEach((m, i) => {
    for (const [mine, theirs] of KEYS) {
      const w = want[i]![theirs];
      expect(toCents(m[mine]), `${where} ${m.name} ${theirs}`).toBe(w.amount);
      expect(m[mine].minus(exact(w.exact)).abs().lte(CLOSE), `${where} ${m.name} ${theirs}: ${m[mine].toString()} against ${w.exact}`).toBe(true);
    }
  });
}

describe.each(RUN_CASES)("%s", (dir) => {
  const fund = readFund(readCaseFile<CaseInputs>(dir, "inputs.json").fund);
  const expected = readCaseFile<CaseExpected>(dir, "expected.json");
  const eq = equalization(fund);

  if (!expected.equalization) {
    it("has no equalization: no LP joins at a later close", () => {
      expect(eq).toBeNull();
    });
    return;
  }

  it("has each later close in date order, with the LPs joining and every LP in by then (F25, FA21)", () => {
    // FA45: null when no rate is given, which only fee calls before the closes allow.
    const rate = expected.equalization!.rate;
    if (rate === null) expect(eq!.rate).toBeNull();
    else expect(eq!.rate?.eq(exact(rate))).toBe(true);
    expect(eq!.closes.map((c) => c.date)).toEqual(expected.equalization!.closes.map((c) => c.date));
    eq!.closes.forEach((c, i) => expect(c.joining, c.date).toEqual(expected.equalization!.closes[i]!.joining));
  });

  it("gives every amount at each close, and each LP's over all of them, as the case does (F26)", () => {
    eq!.closes.forEach((c, i) => sameMoves(c.lps, expected.equalization!.closes[i]!.lps, c.date));
    sameMoves(eq!.lps, expected.equalization!.lps, "all the closes");
  });
});
