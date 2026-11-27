// R32 (11b, 1.1.0): a priced round at a price per share the founder gives, in place of its pre-money. Two checks, on
// every locked round case with a priced round:
// - rebuilt at the exact price each round solves to, as the case records it (C1), every table is the case's, field by
//   field, and today's: every count the same, every price and amount within one part in 10^30 (E14);
// - at four other prices for each round, it's today's round given the pre-money that price implies, so the two ways of
//   working a round out can't drift apart where no case has a price.

import type { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import { InputError, UnsupportedTermError, buildCapTables, parseExact } from "../src/index.ts";
import type { CapTableAfterEvent } from "../src/index.ts";
import { D } from "../src/decimal.ts";
import { ALL_CASES, OCF_CASES, OCX_CASES, readCaseFile } from "./support/cases.ts";
import { expectSameTable } from "./support/round-tables.ts";
import type { ExpectedTable } from "./support/round-tables.ts";

type Json = Record<string, unknown>;
interface Case {
  holders: unknown[];
  events: Json[];
}

const inputsOf = (name: string) => readCaseFile(name, "inputs.json") as Case;
const tablesOf = (name: string) => (readCaseFile(name, "expected.json") as { cap_tables: ExpectedTable[] }).cap_tables;
const roundsOf = (inputs: Case) => inputs.events.filter((e) => e.type === "priced_round").map((e) => String(e.id));

const CASES = ALL_CASES.filter((name) => !OCF_CASES.includes(name) && !OCX_CASES.includes(name) && (inputsOf(name).events ?? []).some((e) => e.type === "priced_round"));

/** Every locked case with a priced round: 41 cases have events, and 12g's are a SAFE at a sale, with no round. */
const EXPECTED_CASES = 40;

/** The case with one round's pre-money replaced by a price per share (R32). */
function withPrice(inputs: Case, round: string, price: string): Case {
  return {
    ...inputs,
    events: inputs.events.map((e) => {
      if (e.id !== round) return e;
      const { pre_money: _pre, ...rest } = e;
      return { ...rest, price_per_share: price };
    }),
  };
}

/** The case with one round's pre-money set to the one given. */
function withPreMoney(inputs: Case, round: string, preMoney: string): Case {
  return { ...inputs, events: inputs.events.map((e) => (e.id === round ? { ...e, pre_money: preMoney } : e)) };
}

/** The price a round solves to, as the case records it: exact, "a/b" where it repeats (C1). */
function casePrice(name: string, round: string): string {
  return String(tablesOf(name).find((t) => t.after_event === round)!.details.price_per_share);
}

/** Two builds alike: every count the same, every other number within one part in 10^30 (E14), everything else equal. */
function expectSameBuild(a: unknown, b: unknown, where: string): void {
  if (D.isDecimal(a) || D.isDecimal(b)) {
    expect(D.isDecimal(a) && D.isDecimal(b), `${where}: a number on both`).toBe(true);
    const [x, y] = [a as Decimal, b as Decimal];
    if (x.isInteger() && y.isInteger()) expect(x.eq(y), `${where}: ${x.toString()} against ${y.toString()}`).toBe(true);
    else expect(x.minus(y).abs().lte(new D("1e-30").times(D.max(1, y.abs()))), `${where}: ${x.toString()} against ${y.toString()}`).toBe(true);
    return;
  }
  if (Array.isArray(a)) {
    expect(Array.isArray(b) && b.length === a.length, `${where}: the same length`).toBe(true);
    a.forEach((v, i) => expectSameBuild(v, (b as unknown[])[i], `${where}[${i}]`));
    return;
  }
  if (a !== null && typeof a === "object") {
    expect(b !== null && typeof b === "object", `${where}: an object on both`).toBe(true);
    expect(Object.keys(a).sort(), `${where}: the same fields`).toEqual(Object.keys(b as object).sort());
    for (const k of Object.keys(a)) expectSameBuild((a as Json)[k], (b as Json)[k], `${where}.${k}`);
    return;
  }
  expect(a, where).toBe(b);
}

const expectSameBuilds = (a: CapTableAfterEvent[], b: CapTableAfterEvent[]) => {
  expect(a.map((t) => t.event)).toEqual(b.map((t) => t.event));
  a.forEach((t, i) => expectSameBuild(t, b[i], t.event));
};

describe("a round at the price it solves to (R32)", () => {
  it(`covers every locked case with a priced round: ${EXPECTED_CASES}`, () => {
    expect(CASES).toHaveLength(EXPECTED_CASES);
  });

  describe.each(CASES)("%s", (name) => {
    const inputs = inputsOf(name);
    const rounds = roundsOf(inputs);
    const stated = rounds.reduce((c, round) => withPrice(c, round, casePrice(name, round)), inputs);

    it("builds the case's tables, field by field, with every round at its price", () => {
      const built = buildCapTables(stated);
      const expected = tablesOf(name);
      expect(built).toHaveLength(expected.length);
      built.forEach((t, i) => expectSameTable(t, expected[i]!, rounds.includes(t.event)));
    });

    it("builds today's tables, every count the same and every price and amount within one part in 10^30", () => {
      expectSameBuilds(buildCapTables(stated), buildCapTables(inputs));
    });

    it("implies the round's own pre-money", () => {
      const built = buildCapTables(stated);
      for (const round of rounds) {
        const d = built.find((t) => t.event === round)!.details;
        if (d.kind !== "priced_round") throw new Error(`${round} is a priced round`);
        const given = parseExact(inputs.events.find((e) => e.id === round)!.pre_money, `${round} pre_money`);
        expect(d.preMoney.minus(given).abs().lte(new D("1e-30").times(given)), `${round}: ${d.preMoney.toString()} against ${given.toString()}`).toBe(true);
      }
    });
  });
});

/** Half, nine tenths, eleven tenths and twice the price a round solves to. */
const MULTIPLES = ["0.5", "0.9", "1.1", "2"];

/** The case with nothing marked pro-rata, which changes no count, only what's checked against the entitlement (R6). */
function unmarked(inputs: Case): Case {
  return {
    ...inputs,
    events: inputs.events.map((e) =>
      e.type === "priced_round" ? { ...e, investments: (e.investments as Json[]).map(({ pro_rata: _p, ...inv }) => inv) } : e,
    ),
  };
}

/**
 * One round at a multiple of its price: built, with today's round given the pre-money it implies alongside; or
 * refused, and why. A refusal is one of two, each a rule as it stands:
 * - a pro-rata investment the case marks is more than the entitlement at that price (R6), since a SAFE converting at
 *   its discount gets other shares there, which the pro-rata base counts. Today's round refuses it too, in the same
 *   words, at the pre-money the price implies, which the round gives with nothing marked;
 * - a conversion counted in a series' A at its discount, in a round that adjusts the series (R25), refused at a stated
 *   price as it is solved: no case settles it at either.
 */
function atMultiple(name: string, round: string, multiple: string): "built" | "pro-rata" | "discounted conversion in A" {
  const inputs = inputsOf(name);
  const price = parseExact(casePrice(name, round), "price").times(multiple).toString();
  const preMoneyOf = (built: CapTableAfterEvent[]) => {
    const d = built.find((t) => t.event === round)!.details;
    if (d.kind !== "priced_round") throw new Error(`${round} is a priced round`);
    expect(d.price.eq(price), `${round}'s price is the one given`).toBe(true);
    return d.preMoney.toString();
  };
  let stated: CapTableAfterEvent[];
  try {
    stated = buildCapTables(withPrice(inputs, round, price));
  } catch (e) {
    if (e instanceof UnsupportedTermError && e.term === "discounted_conversion_in_anti_dilution_a") return "discounted conversion in A";
    if (!(e instanceof InputError) || !e.message.includes("pro-rata entitlement")) throw e;
    const preMoney = preMoneyOf(buildCapTables(unmarked(withPrice(inputs, round, price))));
    expect(() => buildCapTables(withPreMoney(inputs, round, preMoney))).toThrow(e.message);
    return "pro-rata";
  }
  expectSameBuilds(stated, buildCapTables(withPreMoney(inputs, round, preMoneyOf(stated))));
  return "built";
}

describe("a round at other prices: today's round, given the pre-money the price implies (R32)", () => {
  describe.each(CASES)("%s", (name) => {
    it.each(roundsOf(inputsOf(name)).flatMap((round) => MULTIPLES.map((m) => [round, m] as const)))("%s at %s × its price", (round, multiple) => {
      expect(["built", "pro-rata", "discounted conversion in A"]).toContain(atMultiple(name, round, multiple));
    });
  });

  it("builds 260 of the 268, and refuses 8 as the round rules do", () => {
    const outcomes = CASES.flatMap((name) => roundsOf(inputsOf(name)).flatMap((round) => MULTIPLES.map((m) => `${name} ${round} × ${m}: ${atMultiple(name, round, m)}`)));
    const refused = outcomes.filter((o) => !o.endsWith(": built"));
    expect([outcomes.length, refused]).toEqual([
      268,
      [
        "edge-16h-safe-conversion-exempt series_a × 0.5: discounted conversion in A",
        "edge-16j-note-and-safe-from-before-the-seed series_a × 0.5: discounted conversion in A",
        "edge-18-pro-rata-with-safe seed × 2: pro-rata",
        "edge-18b-pro-rata-pool-in-base seed × 1.1: pro-rata",
        "edge-18b-pro-rata-pool-in-base seed × 2: pro-rata",
        "edge-18c-pro-rata-and-more seed × 1.1: pro-rata",
        "edge-18c-pro-rata-and-more seed × 2: pro-rata",
        "millrace seed × 2: pro-rata",
      ],
    ]);
  });
});

describe("a round's price per share (R32)", () => {
  const millrace = () => inputsOf("millrace");

  it("is given in place of its pre-money, never beside it", () => {
    const both = { ...millrace(), events: millrace().events.map((e) => (e.id === "series_b" ? { ...e, price_per_share: "1.082112" } : e)) };
    expect(() => buildCapTables(both)).toThrow("inputs.events[9].price_per_share: give the round's pre-money or its price per share, not both (R32)");
  });

  it("is more than zero, and may be written as a fraction (C1)", () => {
    expect(() => buildCapTables(withPrice(millrace(), "series_b", "0"))).toThrow("inputs.events[9].price_per_share: must be more than zero");
    const [a, b] = [buildCapTables(withPrice(millrace(), "series_b", "3/2")), buildCapTables(withPrice(millrace(), "series_b", "1.5"))];
    expectSameBuilds(a, b);
  });

  it("sets the round's price as given, and its pre-money from it: Millrace's Series B at $1.082112, six places", () => {
    const series = buildCapTables(withPrice(millrace(), "series_b", "1.082112")).at(-1)!.details;
    if (series.kind !== "priced_round") throw new Error("the Series B is a priced round");
    // The price is the one given. It's the solved price, $1.0821118…, rounded up, so Cobalt's $10,000,000 buys two
    // shares fewer than the case's 9,241,189: 10,000,000 ÷ 1.082112 is 9,241,187.6, rounded down (R3).
    expect(series.price.toString()).toBe("1.082112");
    expect(series.newShares.map((n) => [n.holder, n.shares.toNumber()])).toEqual([["cobalt", 9_241_187]]);
    // And the pre-money it implies is a little over the case's $36,000,000: $36,000,005.27.
    expect(series.preMoney.toFixed(2)).toBe("36000005.27");
    expect(series.postMoneyValuation.minus(series.preMoney).eq(10_000_000)).toBe(true);
  });
});
