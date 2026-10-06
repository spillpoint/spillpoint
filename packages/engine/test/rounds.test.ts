// Building cap tables from rounds (M4c), checked against every locked round
// case: each cap table the engine builds, field by field, up to the first
// event a later M4 PR builds, which must be refused naming its term.

import type { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import { InputError, UnsupportedTermError, buildCapTables, parseExact } from "../src/index.ts";
import type { CapTableAfterEvent } from "../src/index.ts";
import { roundDownShares } from "../src/rounds.ts";
import { D } from "../src/decimal.ts";
import { ALL_CASES, readCaseFile } from "./support/cases.ts";

interface Inputs {
  holders: unknown[];
  events: { id: string; type: string }[];
}
interface ExpectedTable {
  after_event: string;
  date: string | null;
  details: Record<string, unknown>;
  cap_table: {
    holders: { id: string; name: string }[];
    securities: Record<string, unknown>[];
    seniority: string[][];
    positions: { holder: string; security: string; shares: number }[];
    unissued_pool: number;
    unconverted_safes?: Record<string, string | null>[];
    unconverted_notes?: Record<string, string | null>[];
  };
}

const ROUND_CASES = ALL_CASES.filter((name) => (readCaseFile(name, "inputs.json") as Partial<Inputs>).events);

/** Where each round case stops in M4c: the event, and the term a later M4 PR builds. Null: built in full. */
const STOPS: Record<string, [event: string, term: string] | null> = {
  "edge-14a-pool-top-up": null,
  "edge-14b-no-top-up": null,
  "edge-15-safe-discount-beats-cap": ["series_a", "safe_conversion"],
  "edge-16a-broad-based": ["series_b", "anti_dilution"],
  "edge-16b-narrow-based": ["series_b", "anti_dilution"],
  "edge-16c-full-ratchet": ["series_b", "anti_dilution"],
  "edge-16d-broad-based-not-in-price": ["series_b", "anti_dilution"],
  "edge-16e-broad-based-pool-in-a": ["series_b", "anti_dilution"],
  "edge-16f-broad-based-cp2-rounded": ["series_b", "anti_dilution"],
  "edge-17a-pay-to-play-priced-after": ["series_b", "pay_to_play"],
  "edge-17b-pay-to-play-priced-before": ["series_b", "pay_to_play"],
  "edge-17c-pay-to-play-partial": ["series_b", "pay_to_play"],
  "edge-17d-pay-to-play-partial-proportional": ["series_b", "pay_to_play"],
  "edge-17e-pay-to-play-anti-dilution": ["series_b", "pay_to_play"],
  "edge-17f-pay-to-play-anti-dilution-priced-before": ["series_b", "pay_to_play"],
  "edge-17g-pay-to-play-two-series": ["series_b", "pay_to_play"],
  "edge-17h-pay-to-play-two-series-proportional": ["series_b", "pay_to_play"],
  "edge-18-pro-rata-with-safe": ["series_a", "safe_conversion"],
  "edge-18b-pro-rata-pool-in-base": ["series_a", "safe_conversion"],
  "edge-18c-pro-rata-and-more": ["series_a", "safe_conversion"],
  "edge-19a-note-converts-with-pool": ["series_a", "note_conversion"],
  "edge-19b-note-converts-without-pool": ["series_a", "note_conversion"],
  "edge-19c-note-converts-common-only": ["series_a", "note_conversion"],
  "edge-20-pre-money-safe-converts": ["series_a", "safe_conversion"],
  "edge-21-note-and-pre-money-safe": ["series_a", "safe_conversion"],
  millrace: ["seed", "safe_conversion"],
};

/** A value the engine holds to 40 digits against the case's exact one: within one part in 10^30. */
function expectClose(actual: Decimal, exact: unknown, what: string): void {
  const expected = parseExact(exact, what);
  const tolerance = new D("1e-30").times(D.max(1, expected.abs()));
  expect(actual.minus(expected).abs().lte(tolerance), `${what}: ${actual.toString()} against ${String(exact)}`).toBe(true);
}

function expectSameNumber(actual: Decimal | null, exact: unknown, what: string): void {
  if (exact == null) {
    expect(actual, what).toBeNull();
    return;
  }
  expect(actual?.eq(parseExact(exact, what)), `${what}: ${String(actual)} against ${String(exact)}`).toBe(true);
}

function expectSameTable(built: CapTableAfterEvent, expected: ExpectedTable): void {
  const at = expected.after_event;
  const ct = built.capTable;
  const exp = expected.cap_table;
  expect(built.event).toBe(at);
  expect(built.date).toBe(expected.date);
  expect(ct.holders).toEqual(exp.holders);
  expect(ct.seniority, `${at} seniority`).toEqual(exp.seniority);
  expect(ct.positions.map((p) => [p.holder, p.security, p.shares.toNumber()]), `${at} positions`).toEqual(
    exp.positions.map((p) => [p.holder, p.security, p.shares]),
  );
  expect(ct.unissuedPool.toNumber(), `${at} pool`).toBe(exp.unissued_pool);

  expect(ct.securities.map((s) => [s.id, s.name, s.kind])).toEqual(exp.securities.map((s) => [s.id, s.name, s.kind]));
  ct.securities.forEach((s, i) => {
    const e = exp.securities[i]!;
    const what = `${at} ${s.id}`;
    if (s.kind === "option") expectSameNumber(s.strike, e.strike, `${what} strike`);
    if (s.kind === "preferred") {
      expectClose(s.originalIssuePrice, e.original_issue_price, `${what} original issue price`);
      expectClose(s.conversionPrice, e.conversion_price, `${what} conversion price`);
      expectSameNumber(s.preferenceMultiple, e.preference_multiple, `${what} preference multiple`);
      expectSameNumber(s.capMultiple, e.cap_multiple, `${what} cap multiple`);
      expect([s.participation, s.antiDilution, s.antiDilutionA ?? null]).toEqual([e.participation, e.anti_dilution, e.anti_dilution_a ?? null]);
    }
  });

  const safes = exp.unconverted_safes ?? [];
  expect(built.unconvertedSafes.map((f) => [f.id, f.holder])).toEqual(safes.map((f) => [f.id, f.holder]));
  built.unconvertedSafes.forEach((f, i) => {
    const e = safes[i]!;
    expectSameNumber(f.purchaseAmount, e.purchase_amount, `${at} ${f.id} purchase amount`);
    expectSameNumber(f.postMoneyCap, e.post_money_cap ?? null, `${at} ${f.id} post-money cap`);
    expectSameNumber(f.preMoneyCap, e.pre_money_cap ?? null, `${at} ${f.id} pre-money cap`);
    expectSameNumber(f.discount, e.discount, `${at} ${f.id} discount`);
  });
  const notes = exp.unconverted_notes ?? [];
  expect(built.unconvertedNotes.map((n) => [n.id, n.holder, n.issueDate, n.conversionBase])).toEqual(
    notes.map((n) => [n.id, n.holder, n.issue_date, n.conversion_base]),
  );
  built.unconvertedNotes.forEach((n, i) => {
    const e = notes[i]!;
    expectSameNumber(n.principal, e.principal, `${at} ${n.id} principal`);
    expectSameNumber(n.interestRate, e.interest_rate, `${at} ${n.id} rate`);
    expectSameNumber(n.valuationCap, e.valuation_cap, `${at} ${n.id} cap`);
    expectSameNumber(n.discount, e.discount, `${at} ${n.id} discount`);
  });

  const d = built.details;
  const ed = expected.details;
  if (d.kind === "issue_percent") {
    expect(d.sharesIssued.toNumber()).toBe(ed.shares_issued);
    expectSameNumber(d.basisShares, ed.basis_shares, `${at} basis`);
  } else if (d.kind === "create_pool") {
    expect(d.poolCreated.toNumber()).toBe(ed.pool_created);
    expectSameNumber(d.basisShares, ed.basis_shares, `${at} basis`);
  } else if (d.kind === "priced_round") {
    expectClose(d.price, ed.price_per_share, `${at} price`);
    expectSameNumber(d.postMoneyValuation, ed.post_money_valuation, `${at} post-money valuation`);
    expectClose(d.preRoundFullyDiluted, ed.pre_round_fully_diluted, `${at} pre-round fully diluted`);
    expectClose(d.postMoneyFullyDilutedSolved, ed.post_money_fully_diluted_solved, `${at} post-money fully diluted, solved`);
    expectClose(d.postMoneyFullyDilutedActual, ed.post_money_fully_diluted_actual, `${at} post-money fully diluted, actual`);
    expect(d.newShares.map((n) => [n.holder, n.shares.toNumber()])).toEqual((ed.new_shares as { holder: string; shares: number }[]).map((n) => [n.holder, n.shares]));
    expect(d.poolTopUp.toNumber()).toBe(ed.pool_top_up);
  } else {
    expect(ed).toEqual({});
  }
}

describe("every locked round case", () => {
  it("is listed here, with where it stops in M4c", () => {
    expect(Object.keys(STOPS).sort()).toEqual(ROUND_CASES);
  });

  describe.each(ROUND_CASES)("%s", (name) => {
    const inputs = readCaseFile(name, "inputs.json") as Inputs;
    const expected = (readCaseFile(name, "expected.json") as { cap_tables: ExpectedTable[] }).cap_tables;
    const stop = STOPS[name] ?? null;
    const builtCount = stop ? inputs.events.findIndex((e) => e.id === stop[0]) : inputs.events.length;

    it(`builds every cap table${stop ? ` before ${stop[0]}` : ""}, field by field`, () => {
      const built = buildCapTables({ ...inputs, events: inputs.events.slice(0, builtCount) });
      expect(built).toHaveLength(builtCount);
      built.forEach((t, i) => expectSameTable(t, expected[i]!));
    });

    if (stop) {
      it(`refuses ${stop[0]}, naming ${stop[1]}, rather than skipping it`, () => {
        let error: unknown;
        try {
          buildCapTables(inputs);
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(UnsupportedTermError);
        expect(error).toMatchObject({ term: stop[1], milestone: "M4" });
        expect((error as Error).message).toMatch(/supports this from M4; until then it refuses the input rather than ignoring the term/);
      });
    }
  });
});

describe("the cases M4c builds in full", () => {
  it("14a tops the pool up to 15% and prices the Series A at $2.50", () => {
    const series = buildCapTables(readCaseFile("edge-14a-pool-top-up", "inputs.json")).at(-1)!;
    expect(series.details).toMatchObject({ kind: "priced_round", poolTopUp: new D(500_000) });
    expect(series.details.kind === "priced_round" && series.details.price.toString()).toBe("2.5");
  });

  it("14b leaves a pool that already meets its target as it is (R16)", () => {
    const series = buildCapTables(readCaseFile("edge-14b-no-top-up", "inputs.json")).at(-1)!;
    expect(series.details.kind === "priced_round" && series.details.poolTopUp.toNumber()).toBe(0);
  });

  it("Millrace builds up to its Seed round: Lena's 6% (R1), the SAFEs waiting, and the pool (R2)", () => {
    const inputs = readCaseFile("millrace", "inputs.json") as Inputs;
    const built = buildCapTables({ ...inputs, events: inputs.events.slice(0, 5) });
    expect(built.map((t) => t.event)).toEqual(["founding", "early_hire", "pre_seed_safes", "option_pool", "grants_at_pool_creation"]);
    expect(built[1]!.details).toMatchObject({ kind: "issue_percent", sharesIssued: new D(638_297) });
    expect(built[2]!.unconvertedSafes.map((f) => f.id)).toEqual(["safe_priya", "safe_marcus"]);
    expect(built[3]!.details).toMatchObject({ kind: "create_pool", poolCreated: new D(1_182_033) });
    expect(built[4]!.capTable.unissuedPool.toNumber()).toBe(692_033);
  });
});

describe("share counts at 40 digits (E19)", () => {
  it("count a hair under a whole number as that number", () => {
    expect(roundDownShares(new D("463999.9999999999999999999999999999999")).toString()).toBe("464000");
  });
  it("otherwise round down", () => {
    expect(roundDownShares(new D("154666.6666666666666666666666666666667")).toString()).toBe("154666");
    expect(roundDownShares(new D("7.99999")).toString()).toBe("7");
  });
});

describe("inputs it won't read", () => {
  const base = () => ({
    holders: [{ id: "a", name: "Founder A" }, { id: "x", name: "Investor X" }],
    events: [
      { id: "founding", date: "2022-01-01", type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "a", shares: 1000 }] },
    ] as Record<string, unknown>[],
  });
  const round = (extra: Record<string, unknown> = {}) => ({
    id: "seed", date: "2023-01-01", type: "priced_round",
    series: { id: "seed", name: "Seed Preferred", kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "none" },
    pre_money: "1000", investments: [{ holder: "x", amount: "500" }], seniority: [["seed"]], ...extra,
  });
  const build = (...events: Record<string, unknown>[]) => {
    const inputs = base();
    inputs.events.push(...events);
    return () => buildCapTables(inputs);
  };

  it("an unknown event type or field", () => {
    expect(build({ id: "e", date: null, type: "stock_split" })).toThrow(/unknown event type "stock_split"/);
    expect(build(round({ pre_mony: "1000" }))).toThrow(InputError);
  });
  it("a grant bigger than the pool", () => {
    expect(build({ id: "g", date: null, type: "grant_options", grants: [{ holder: "a", shares: 5, strike: "1" }] })).toThrow(
      /a grant of 5 options is more than the 0 left in the unissued pool/,
    );
  });
  it("a SAFE with both kinds of cap (R24)", () => {
    expect(build({ id: "s", date: null, type: "safes", safes: [{ id: "s1", holder: "x", purchase_amount: "10", post_money_cap: "100", pre_money_cap: "90" }] })).toThrow(
      /a post-money cap or a pre-money cap, not both/,
    );
  });
  it("a new series left out of the seniority", () => {
    expect(build(round({ seniority: [] }))).toThrow(/seed must appear in exactly one tier/);
  });
  it("shares for a holder who isn't listed", () => {
    expect(build(round({ investments: [{ holder: "zoe", amount: "500" }] }))).toThrow(/unknown holder zoe/);
  });

  it("builds a plain round: $500 at $1,000 pre-money on 1,000 shares is $1.00 a share", () => {
    const seed = build(round())().at(-1)!;
    expect(seed.capTable.positions.map((p) => [p.holder, p.security, p.shares.toNumber()])).toEqual([
      ["a", "common", 1000],
      ["x", "seed", 500],
    ]);
  });
});
