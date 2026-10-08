// Building cap tables from rounds (M4c–M4g), checked against every locked
// round case: each cap table the engine builds, field by field.

import type { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import { InputError, UnsupportedTermError, buildCapTables, parseExact } from "../src/index.ts";
import type { CapTableAfterEvent, PreferredSeries } from "../src/index.ts";
import { roundDownShares, roundHalfUp } from "../src/rounds.ts";
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

/**
 * The 37 cases with events: 26 since M4g, 12g (M5b), 22's warrants (M5d), 23's dividends (R30, M5e3), 24, whose
 * sale carries a carve-out (0.3.0 work, 03a), 21b, 21c, 17i (03c) and 21d (03c2), which the engine refuses until 03g,
 * and 16g, 16h and 16i (03d), refused until 03h.
 */
const EXPECTED_ROUND_CASES = 37;
/**
 * The 0.3.0 work's round cases the engine refuses until 03g or 03h, by the first term it names. 17i also converts a
 * post-money SAFE beside a note.
 */
const NOT_YET: Record<string, string> = {
  "edge-16g-safe-converts-in-a-down-round": "anti_dilution_with_conversions",
  "edge-16h-safe-conversion-exempt": "anti_dilution_exempts_conversions",
  "edge-17i-pay-to-play-with-conversions": "post_money_safe_with_pre_money_instruments",
  "edge-21b-post-money-safe-and-note": "post_money_safe_with_pre_money_instruments",
  "edge-21c-post-money-and-pre-money-safes": "post_money_safe_with_pre_money_instruments",
  "edge-21d-post-money-safe-and-discounted-note": "post_money_safe_with_pre_money_instruments",
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
      if (e.conversion_ratio != null) expectClose(s.conversionRatio, e.conversion_ratio, `${what} conversion ratio`);
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
    if (ed.company_capitalization != null) expectClose(d.companyCapitalization!, ed.company_capitalization, `${at} Company Capitalization`);
    else expect(d.companyCapitalization).toBeNull();
    const conversions = (ed.safe_conversions ?? []) as Record<string, unknown>[];
    expect(d.safeConversions.map((c) => [c.safe, c.holder, c.method, c.shares.toNumber(), c.series])).toEqual(
      conversions.map((c) => [c.safe, c.holder, c.method, c.shares, c.series]),
    );
    d.safeConversions.forEach((c, i) => {
      expectClose(c.conversionPrice, conversions[i]!.conversion_price, `${at} ${c.safe} conversion price`);
      if (conversions[i]!.company_capitalization != null) expectClose(c.companyCapitalization!, conversions[i]!.company_capitalization, `${at} ${c.safe} Company Capitalization`);
      else expect(c.companyCapitalization).toBeNull();
    });
    const noteConversions = (ed.note_conversions ?? []) as Record<string, unknown>[];
    expect(d.noteConversions.map((c) => [c.note, c.holder, c.conversionBase, c.method, c.shares.toNumber(), c.series])).toEqual(
      noteConversions.map((c) => [c.note, c.holder, c.conversion_base, c.method, c.shares, c.series]),
    );
    d.noteConversions.forEach((c, i) => {
      const e = noteConversions[i]!;
      const what = `${at} ${c.note}`;
      expectSameNumber(c.principal, e.principal, `${what} principal`);
      expectClose(c.interest, e.interest, `${what} interest`);
      expectClose(c.amountConverting, e.amount_converting, `${what} amount converting`);
      expectClose(c.baseShares, e.base_shares, `${what} base shares`);
      expectClose(c.conversionPrice, e.conversion_price, `${what} conversion price`);
    });
    const proRata = (ed.pro_rata ?? []) as Record<string, string>[];
    expect(d.proRata.map((p) => [p.holder, p.preRoundShare.times(100).toFixed(6), p.entitlement.toFixed(2)])).toEqual(
      proRata.map((p) => [p.holder, p.pre_round_fd_percent, p.entitlement]),
    );
    d.proRata.forEach((p, i) => expectSameNumber(p.amountInvested, proRata[i]!.amount_invested, `${at} ${p.holder} pro-rata invested`));
    const adjustments = (ed.anti_dilution ?? []) as Record<string, unknown>[];
    expect(d.antiDilution.map((x) => [x.series, x.rule, x.c.toNumber()])).toEqual(adjustments.map((x) => [x.series, x.rule, x.C]));
    d.antiDilution.forEach((x, i) => {
      const e = adjustments[i]!;
      const what = `${at} ${x.series}`;
      expectClose(x.cp1, e.cp1, `${what} CP1`);
      expectClose(x.cp2, e.cp2, `${what} CP2`);
      if (e.cp2_unrounded != null) expectClose(x.cp2Unrounded!, e.cp2_unrounded, `${what} CP2 before rounding`);
      else expect(x.cp2Unrounded, `${what} CP2 before rounding`).toBeNull();
      if (e.A != null) expectClose(x.a!, e.A, `${what} A`);
      else expect(x.a, `${what} A`).toBeNull();
      if (e.B != null) expectClose(x.b!, e.B, `${what} B`);
      else expect(x.b, `${what} B`).toBeNull();
      expectClose(x.newConversionRatio, e.new_conversion_ratio, `${what} new conversion ratio`);
    });
    const p2p = ed.pay_to_play as Record<string, unknown> | undefined;
    if (p2p == null) expect(d.payToPlay, `${at} pay-to-play`).toBeNull();
    else {
      const pp = d.payToPlay!;
      expect([pp.series, pp.partialParticipation, pp.pricedAfterConversion]).toEqual([p2p.series, p2p.partial_participation, p2p.priced_after_conversion]);
      expectSameNumber(pp.offeredAmount, p2p.offered_amount, `${at} pay-to-play offered`);
      const ratios = p2p.conversion_ratios as Record<string, string>;
      expect(pp.conversionRatios.map((r) => r.series)).toEqual(Object.keys(ratios));
      pp.conversionRatios.forEach((r) => expectSameNumber(r.ratio, ratios[r.series], `${at} ${r.series} pay-to-play ratio`));
      const rows = p2p.holders as Record<string, unknown>[];
      expect(pp.holders.map((h) => [h.holder, h.share.times(100).toFixed(6), h.participates])).toEqual(rows.map((h) => [h.holder, h.share_percent, h.participates]));
      pp.holders.forEach((h, i) => {
        const e = rows[i]!;
        expectClose(h.asConvertedShares, e.as_converted_shares, `${at} ${h.holder} as converted`);
        expectClose(h.required, e.required, `${at} ${h.holder} required`);
        expectSameNumber(h.invested, e.invested, `${at} ${h.holder} invested`);
        expectClose(h.fractionBought, e.fraction_bought, `${at} ${h.holder} fraction bought`);
        expect(h.series.map((b) => [b.series, b.shares.toNumber(), b.kept.toNumber(), b.converted.toNumber(), b.commonReceived.toNumber()])).toEqual(
          (e.series as Record<string, unknown>[]).map((b) => [b.series, b.shares, b.kept, b.converted, b.common_received]),
        );
      });
    }
  } else {
    expect(ed).toEqual({});
  }
}

describe("every locked round case", () => {
  it("is found: 37 cases with events", () => {
    expect(ROUND_CASES).toHaveLength(EXPECTED_ROUND_CASES);
  });

  it.each(Object.entries(NOT_YET))("%s is refused until 03g or 03h, naming %s", (name, term) => {
    let error: unknown;
    try {
      buildCapTables(readCaseFile(name, "inputs.json") as Inputs);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(UnsupportedTermError);
    expect(error).toMatchObject({ term, milestone: "later" });
  });

  // R25 before the 0.3.0 plan's answer 3c adjusted a series only when the round's own price was below its conversion
  // price, so the engine builds 16i without refusing it, and leaves the Seed unadjusted: the round is priced above it.
  // The locked case, testing the note's discounted conversion at its own price, adjusts it. The engine follows from 03h.
  const OLD_RULE = "edge-16i-discounted-note-in-an-up-round";
  it(`${OLD_RULE} is built under the old rule until 03h: the Seed isn't adjusted, where the case adjusts it to $0.994808`, () => {
    const seed = buildCapTables(readCaseFile(OLD_RULE, "inputs.json") as Inputs).at(-1)!.capTable.securities.find((s) => s.id === "seed");
    expect(seed?.kind === "preferred" && seed.conversionPrice.toString()).toBe("1");
  });

  describe.each(ROUND_CASES.filter((name) => !(name in NOT_YET) && name !== OLD_RULE))("%s", (name) => {
    const inputs = readCaseFile(name, "inputs.json") as Inputs;
    const expected = (readCaseFile(name, "expected.json") as { cap_tables: ExpectedTable[] }).cap_tables;

    it("builds every cap table, field by field", () => {
      const built = buildCapTables(inputs);
      expect(built).toHaveLength(expected.length);
      built.forEach((t, i) => expectSameTable(t, expected[i]!));
    });
  });
});

describe("warrants issued (R29, C15; M5d)", () => {
  // 900,000 common; a 10% pool, 100,000; warrants for 100,000 common at $1. They aren't drawn
  // from the pool, and a second 10% pool counts them like options (R2): its basis is the stock,
  // options and warrants, 900,000 + 100,000, so it is 1,000,000 × 0.1 ÷ 0.9 = 111,111.1…, rounded
  // down. Without the warrants it would be 900,000 and 100,000.
  const company = (warrants: Record<string, unknown>[]) => ({
    holders: [{ id: "a", name: "A" }, { id: "l", name: "L" }],
    events: [
      { id: "f", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "a", shares: 900000 }] },
      { id: "p", date: null, type: "create_pool", percent: "10" },
      { id: "w", date: null, type: "issue_warrants", warrants },
      { id: "p2", date: null, type: "create_pool", percent: "10" },
    ],
  });

  it("count like options, and aren't drawn from the pool", () => {
    const [, pool, warrants, second] = buildCapTables(company([{ holder: "l", shares: 100000, strike: "1", underlying: "common" }]));
    expect(warrants!.capTable.unissuedPool.eq(pool!.capTable.unissuedPool)).toBe(true);
    expect(warrants!.capTable.securities.at(-1)).toMatchObject({ id: "warrants_common_1", name: "Warrants for Common Stock ($1 strike)", kind: "warrant", underlying: "common" });
    const details = second!.details as { kind: string; basisShares: D; poolCreated: D };
    expect([details.kind, details.basisShares.toString(), details.poolCreated.toString()]).toEqual(["create_pool", "1000000", "111111"]);
  });

  it("refuse an underlying that isn't common or a preferred series already issued", () => {
    expect(() => buildCapTables(company([{ holder: "l", shares: 100000, strike: "1", underlying: "series_a" }]))).toThrow(
      "inputs.events[2].warrants[0].underlying: series_a is not common or a preferred series issued before these warrants",
    );
  });
});

describe("cumulative dividends on a round's series (R30, M5e3)", () => {
  const case23 = () => readCaseFile("edge-23-dividends-from-a-round", "inputs.json") as { holders: unknown[]; events: Record<string, unknown>[] };
  const seriesA = (inputs: { events: Record<string, unknown>[] }) => inputs.events[4]! as { date: string | null; series: Record<string, Record<string, unknown>> };

  it("accrue from the round's date, on the round's series and its series from SAFEs, each on its own issue price", () => {
    const after = buildCapTables(case23()).at(-1)!.capTable.securities;
    const terms = (id: string) => after.find((s) => s.id === id) as PreferredSeries;
    for (const id of ["series_a", "series_a_shadow"]) {
      expect(terms(id).cumulativeDividend).toMatchObject({ method: "simple", accrualStart: "2023-06-30", onConversion: "forfeited" });
      expect(terms(id).cumulativeDividend!.rate.toString()).toBe("0.08");
    }
    expect([terms("series_a").originalIssuePrice.toString(), terms("series_a_shadow").originalIssuePrice.toString()]).toEqual(["2.5", "2"]);
  });

  it("refuse an accrual start of their own, and a round with no date", () => {
    const own = case23();
    seriesA(own).series.cumulative_dividend!.accrual_start = "2023-01-01";
    expect(() => buildCapTables(own)).toThrow(
      "inputs.events[4].series.cumulative_dividend.accrual_start: a round's dividends accrue from the round's date; leave accrual_start out",
    );
    const undated = case23();
    seriesA(undated).date = null;
    expect(() => buildCapTables(undated)).toThrow(
      "inputs.events[4].date: Series A Preferred accrues cumulative dividends from the round's date, so the round needs a date",
    );
  });

  it("stay refused on a series issued outside a priced round, until a case settles when they accrue", () => {
    const issued = case23();
    issued.events.splice(1, 0, {
      id: "pref", date: "2022-02-01", type: "issue", issues: [{ holder: "founder_a", shares: 1000 }],
      security: { id: "pref", name: "Founders' Preferred", kind: "preferred", original_issue_price: "1", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "none", cumulative_dividend: { rate: "0.08", accrual_start: "2022-02-01" } },
    });
    expect(() => buildCapTables(issued)).toThrow(UnsupportedTermError);
  });
});

describe("the round cases built in full", () => {
  it("14a tops the pool up to 15% and prices the Series A at $2.50", () => {
    const series = buildCapTables(readCaseFile("edge-14a-pool-top-up", "inputs.json")).at(-1)!;
    expect(series.details).toMatchObject({ kind: "priced_round", poolTopUp: new D(500_000) });
    expect(series.details.kind === "priced_round" && series.details.price.toString()).toBe("2.5");
  });

  it("14b leaves a pool that already meets its target as it is (R16)", () => {
    const series = buildCapTables(readCaseFile("edge-14b-no-top-up", "inputs.json")).at(-1)!;
    expect(series.details.kind === "priced_round" && series.details.poolTopUp.toNumber()).toBe(0);
  });

  it("Millrace builds from all ten events: Lena's 6% (R1), the pool (R2), the SAFEs at the Seed, Harbor Lane's pro-rata, Series A's adjustment", () => {
    const built = buildCapTables(readCaseFile("millrace", "inputs.json"));
    expect(built.map((t) => t.event)).toEqual([
      "founding", "early_hire", "pre_seed_safes", "option_pool", "grants_at_pool_creation", "seed", "grants_seed_to_a", "series_a", "grants_a_to_b", "series_b",
    ]);
    expect(built[1]!.details).toMatchObject({ kind: "issue_percent", sharesIssued: new D(638_297) });
    expect(built[3]!.details).toMatchObject({ kind: "create_pool", poolCreated: new D(1_182_033) });
    const seed = built[5]!.details;
    if (seed.kind !== "priced_round") throw new Error("the Seed is a priced round");
    // The SAFEs convert at their $5,000,000 post-money cap into Seed Preferred (from SAFEs) (R4, R5).
    expect(seed.safeConversions.map((c) => [c.holder, c.method, c.shares.toNumber(), c.series])).toEqual([
      ["priya", "cap", 779_362, "seed_shadow"],
      ["marcus", "cap", 389_681, "seed_shadow"],
    ]);
    expect(built[5]!.capTable.securities.find((s) => s.id === "seed_shadow")!.name).toBe("Seed Preferred (from SAFEs)");
    expect(built[5]!.unconvertedSafes).toEqual([]);
    const seriesA = built[7]!.details;
    if (seriesA.kind !== "priced_round") throw new Error("the Series A is a priced round");
    expect(seriesA.proRata.map((p) => [p.holder, p.preRoundShare.times(100).toFixed(6), p.entitlement.toFixed(2)])).toEqual([["harbor_lane", "28.703080", "3444369.64"]]);
    // The Series B at $1.082112 is below Series A's $2.075472: broad-based weighted average (R7, R8, R10).
    const seriesB = built[9]!.details;
    if (seriesB.kind !== "priced_round") throw new Error("the Series B is a priced round");
    expect(seriesB.price.toFixed(6)).toBe("1.082112");
    const [adjustment, ...others] = seriesB.antiDilution;
    expect(others).toEqual([]);
    expect([adjustment!.series, adjustment!.rule, adjustment!.a!.toNumber(), adjustment!.c.toNumber()]).toEqual(["series_a", "broad_based", 27_372_727, 9_241_189]);
    // R8: B is what the 9,241,189 shares actually paid, $9,999,999.89, not the $10,000,000 round.
    expect(adjustment!.b!.times(adjustment!.cp1).toFixed(2)).toBe("9999999.89");
    expect([adjustment!.cp1.toFixed(6), adjustment!.cp2.toFixed(6), adjustment!.newConversionRatio.toFixed(10)]).toEqual(["2.075472", "1.824752", "1.1373992577"]);
  });

  it.each([
    ["edge-16a-broad-based", "broad_based", "2.1904762066", 2_570_652],
    ["edge-16b-narrow-based", "narrow_based", "1.6875000926", 2_740_740],
    ["edge-16c-full-ratchet", "full_ratchet", "0.8750000000", 3_428_571],
    ["edge-16d-broad-based-not-in-price", "broad_based", "2.2045454545", 2_500_000],
    ["edge-16e-broad-based-pool-in-a", "broad_based", "2.2291667225", 2_560_747],
    ["edge-16f-broad-based-cp2-rounded", "broad_based", "2.1905000000", 2_570_652],
  ])("%s: %s takes Series A's $2.50 to $%s, and Investor Y gets %i shares", (name, rule, cp2, shares) => {
    const series = buildCapTables(readCaseFile(name, "inputs.json")).at(-1)!.details;
    if (series.kind !== "priced_round") throw new Error("a priced round");
    expect(series.antiDilution.map((a) => [a.series, a.rule, a.cp2.toFixed(10)])).toEqual([["series_a", rule, cp2]]);
    expect(series.newShares.map((n) => [n.holder, n.shares.toNumber()])).toEqual([["investor_y", shares]]);
  });

  it.each([
    // [case, price, priced after the conversion, what each converting holder keeps and gets, A if Series A is adjusted]
    ["edge-17a-pay-to-play-priced-after", "1.2931034483", true, [["investor_w", "series_a", 0, 80_000]], null],
    ["edge-17b-pay-to-play-priced-before", "1.2000000000", false, [["investor_w", "series_a", 0, 80_000]], null],
    ["edge-17c-pay-to-play-partial", "1.2931034483", true, [["investor_w", "series_a", 0, 80_000]], null],
    ["edge-17d-pay-to-play-partial-proportional", "1.2448132780", true, [["investor_w", "series_a", 400_000, 40_000]], null],
    ["edge-17e-pay-to-play-anti-dilution", "1.2718818381", true, [["investor_w", "series_a", 0, 80_000]], 7_780_000],
    ["edge-17f-pay-to-play-anti-dilution-priced-before", "1.1788139430", false, [["investor_w", "series_a", 0, 80_000]], 7_780_000],
    ["edge-17g-pay-to-play-two-series", "1.2328767123", true, [["investor_x", "seed", 0, 200_000], ["investor_x", "series_a", 0, 100_000]], null],
    ["edge-17h-pay-to-play-two-series-proportional", "1.1042944785", true, [["investor_x", "seed", 500_000, 100_000], ["investor_x", "series_a", 500_000, 50_000]], null],
  ] as const)("%s prices the round at $%s (after the conversion: %s)", (name, price, after, converting, a) => {
    const series = buildCapTables(readCaseFile(name, "inputs.json")).at(-1)!.details;
    if (series.kind !== "priced_round") throw new Error("a priced round");
    expect(series.price.toFixed(10)).toBe(price);
    expect(series.payToPlay!.pricedAfterConversion).toBe(after);
    const outcomes = series.payToPlay!.holders.flatMap((h) => h.series.filter((b) => !b.converted.isZero()).map((b) => [h.holder, b.series, b.kept.toNumber(), b.commonReceived.toNumber()]));
    expect(outcomes).toEqual(converting);
    // R21: the holders who convert get no adjustment, and A counts the table after the conversion.
    expect(series.antiDilution.map((x) => x.a!.toNumber())).toEqual(a === null ? [] : [a]);
  });

  it.each([
    // [case, base, base shares, conversion price, shares]: $1,060,000 converts, a year of 6% on $1,000,000, at its $8,000,000 cap.
    ["edge-19a-note-converts-with-pool", "with_pool", 10_000_000, "0.8000000000", 1_325_000],
    ["edge-19b-note-converts-without-pool", "without_pool", 8_500_000, "0.9411764706", 1_126_250],
    ["edge-19c-note-converts-common-only", "common_only", 8_000_000, "1.0000000000", 1_060_000],
  ] as const)("%s divides the note's cap by its %s base of %i shares: $%s, %i shares (R23)", (name, base, baseShares, price, shares) => {
    const series = buildCapTables(readCaseFile(name, "inputs.json")).at(-1)!.details;
    if (series.kind !== "priced_round") throw new Error("a priced round");
    expect(series.noteConversions.map((c) => [c.conversionBase, c.baseShares.toNumber(), c.interest.toString(), c.method, c.conversionPrice.toFixed(10), c.shares.toNumber(), c.series])).toEqual([
      [base, baseShares, "60000", "cap", price, shares, "series_a_notes"],
    ]);
  });

  it("21 converts a note and a pre-money SAFE in one round, neither counting the other (R23, R24)", () => {
    const built = buildCapTables(readCaseFile("edge-21-note-and-pre-money-safe", "inputs.json")).at(-1)!;
    const series = built.details;
    if (series.kind !== "priced_round") throw new Error("a priced round");
    expect(series.safeConversions.map((c) => [c.method, c.shares.toNumber(), c.series])).toEqual([["cap", 1_102_165, "series_a_shadow"]]);
    expect(series.noteConversions.map((c) => [c.baseShares.toNumber(), c.method, c.shares.toNumber(), c.series])).toEqual([[10_000_000, "cap", 1_325_000, "series_a_notes"]]);
    expect(built.capTable.securities.map((s) => s.name)).toEqual([
      "Common Stock", "Options ($0.25 strike)", "Series A Preferred (from SAFEs)", "Series A Preferred (from notes)", "Series A Preferred",
    ]);
    expect(built.unconvertedNotes).toEqual([]);
  });

  it("18 counts the SAFE's 1,000,000 shares in Investor X's pro-rata base: $1,090,909.09, not $1,200,000 (R6)", () => {
    const series = buildCapTables(readCaseFile("edge-18-pro-rata-with-safe", "inputs.json")).at(-1)!.details;
    expect(series.kind === "priced_round" && series.proRata[0]!.entitlement.toFixed(2)).toBe("1090909.09");
  });

  it("18c issues Investor X's pro-rata and ordinary lines once: 700,000 shares, not 699,999 (R3)", () => {
    const series = buildCapTables(readCaseFile("edge-18c-pro-rata-and-more", "inputs.json")).at(-1)!.details;
    expect(series.kind === "priced_round" && series.newShares.map((n) => [n.holder, n.shares.toNumber()])).toEqual([
      ["investor_y", 1_666_666],
      ["investor_x", 700_000],
    ]);
  });
});

describe("what M4d refuses", () => {
  const case18 = () => readCaseFile("edge-18-pro-rata-with-safe", "inputs.json") as { holders: { id: string; name: string }[]; events: Record<string, unknown>[] };

  it("a pro-rata investment above the entitlement, saying what to mark as pro-rata (R6)", () => {
    const inputs = case18();
    inputs.events.at(-1)!.investments = [
      { holder: "investor_y", amount: "5000000" },
      { holder: "investor_x", amount: "1200000", pro_rata: true },
    ];
    expect(() => buildCapTables(inputs)).toThrow(
      "inputs.events[3].investments[1]: Investor X's pro-rata investment of $1,200,000.00 is more than its pro-rata entitlement of $1,127,272.72 " +
        "(18.181818% of the $6,200,000.00 round). Mark $1,127,272.72 as pro-rata and enter the other $72,727.28 as an ordinary investment in the same round.",
    );
  });

  it("a pro-rata round with a SAFE that stays outstanding (R6)", () => {
    const inputs = case18();
    inputs.events.at(-1)!.convert_safes = false;
    expect(() => buildCapTables(inputs)).toThrow(/a pro-rata round with a SAFE or note that stays outstanding is refused/);
  });

  it("a post-money SAFE converting alongside a pre-money SAFE: owed before release (R24)", () => {
    const inputs = case18();
    inputs.holders.push({ id: "investor_s", name: "Investor S" });
    inputs.events.splice(3, 0, { id: "safe_2", date: "2023-06-01", type: "safes", safes: [{ id: "safe_s", holder: "investor_s", purchase_amount: "500000", pre_money_cap: "20000000" }] });
    let error: unknown;
    try {
      buildCapTables(inputs);
    } catch (e) {
      error = e;
    }
    expect(error).toMatchObject({ term: "post_money_safe_with_pre_money_instruments", milestone: "later" });
  });

  it("gives a SAFE its cap when its cap price ties its discount price", () => {
    // 1,000 shares and no pool. A $80 pre-money SAFE capped at $800 has a cap price of $800 ÷ 1,000 = $0.80. The round
    // is $500 at $1,100 pre-money, which prices it at $1.00, so the SAFE's 20% discount price is $0.80 too: a tie, and
    // it converts at the cap.
    const built = buildCapTables({
      holders: [{ id: "a", name: "Founder A" }, { id: "s", name: "Investor S" }, { id: "x", name: "Investor X" }],
      events: [
        { id: "founding", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "a", shares: 1000 }] },
        { id: "safe", date: null, type: "safes", safes: [{ id: "safe_s", holder: "s", purchase_amount: "80", pre_money_cap: "800", discount: "0.2" }] },
        {
          id: "seed", date: null, type: "priced_round", pre_money: "1100", investments: [{ holder: "x", amount: "500" }], seniority: [["seed", "seed_shadow"]],
          series: { id: "seed", name: "Seed Preferred", kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "none" },
        },
      ],
    });
    const seed = built.at(-1)!.details;
    if (seed.kind !== "priced_round") throw new Error("a priced round");
    // The SAFE's 100 shares sit in the pre-money: $1,100 on 1,100 shares is $1.00.
    expect(seed.price.toString()).toBe("1");
    expect(seed.safeConversions.map((c) => [c.method, c.conversionPrice.toString(), c.shares.toNumber()])).toEqual([["cap", "0.8", 100]]);
  });
});

describe("anti-dilution beyond the cases (M4e)", () => {
  const case16a = () => readCaseFile("edge-16a-broad-based", "inputs.json") as { holders: { id: string; name: string }[]; events: Record<string, unknown>[] };
  const seriesOf = (built: CapTableAfterEvent[], id: string) => built.at(-1)!.capTable.securities.find((s) => s.id === id)!;

  it("adjusts nothing in a round priced exactly at the conversion price", () => {
    // 16a's company with a $25,000,000 pre-money: $28,000,000 on 11,200,000 shares is Series A's own $2.50.
    const inputs = case16a();
    inputs.events.at(-1)!.pre_money = "25000000";
    const built = buildCapTables(inputs);
    const series = built.at(-1)!.details;
    if (series.kind !== "priced_round") throw new Error("a priced round");
    expect(series.price.toFixed(10)).toBe("2.5000000000");
    expect(series.antiDilution).toEqual([]);
    expect(seriesOf(built, "series_a")).toMatchObject({ conversionPrice: new D("2.5"), conversionRatio: new D(1) });
  });

  it("adjusts two series in one round, each from the cap table before the round, as the reference calculator does", () => {
    // 8,000,000 common; a Seed of $2,000,000 at $1.00 (narrow-based), then a Series A of $10,000,000 at $3.00
    // (broad-based), then a Series B of $3,000,000 at $9,000,000 pre-money, below both. The expected values
    // come from the reference calculator.
    const pref = (id: string, name: string, antiDilution: string) => ({ id, name, kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: antiDilution });
    const built = buildCapTables({
      holders: [{ id: "a", name: "Founder A" }, { id: "s", name: "Investor S" }, { id: "x", name: "Investor X" }, { id: "y", name: "Investor Y" }],
      events: [
        { id: "founding", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "a", shares: 8000000 }] },
        { id: "seed", date: null, type: "priced_round", series: pref("seed", "Seed Preferred", "narrow_based"), pre_money: "8000000", investments: [{ holder: "s", amount: "2000000" }], seniority: [["seed"]] },
        { id: "series_a", date: null, type: "priced_round", series: pref("series_a", "Series A Preferred", "broad_based"), pre_money: "30000000", investments: [{ holder: "x", amount: "10000000" }], seniority: [["series_a"], ["seed"]] },
        { id: "series_b", date: null, type: "priced_round", series: pref("series_b", "Series B Preferred", "none"), pre_money: "9000000", investments: [{ holder: "y", amount: "3000000" }], seniority: [["series_b"], ["series_a"], ["seed"]] },
      ],
    });
    const series = built.at(-1)!.details;
    if (series.kind !== "priced_round") throw new Error("a priced round");
    expectClose(series.price, "905666612333334000000/1478814680148152037037", "price");
    expect(series.newShares.map((n) => n.shares.toNumber())).toEqual([4_898_539]);
    // Narrow-based A is the preferred only; broad-based A is everything outstanding. Neither sees the other's adjustment.
    expect(series.antiDilution.map((a) => [a.series, a.a!.toNumber(), a.c.toNumber()])).toEqual([["seed", 5_333_333, 4_898_539], ["series_a", 13_333_333, 4_898_539]]);
    expectClose(series.antiDilution[0]!.cp2, "12323454356031301747172654321/15131042518996832679501843264", "Seed CP2");
    expectClose(series.antiDilution[1]!.cp2, "63589028948624118932353962963/26961559960182048975797843264", "Series A CP2");
    expectClose(series.postMoneyFullyDilutedSolved, "2957629360296304074074/150944435388889", "post-money fully diluted, solved");
  });

  it("refuses a round that converts a SAFE and triggers anti-dilution, until a case settles it", () => {
    const inputs = case16a();
    inputs.holders.push({ id: "investor_s", name: "Investor S" });
    inputs.events.splice(4, 0, { id: "safe", date: "2024-06-01", type: "safes", safes: [{ id: "safe_s", holder: "investor_s", purchase_amount: "500000", post_money_cap: "30000000" }] });
    let error: unknown;
    try {
      buildCapTables(inputs);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(UnsupportedTermError);
    expect(error).toMatchObject({ term: "anti_dilution_with_conversions", milestone: "later" });
    expect((error as Error).message).toMatch(/converts SAFEs or notes and triggers series_a's anti-dilution/);
  });

  it("refuses a series that names the pool in A in a round that leaves it out (C10)", () => {
    const inputs = case16a();
    (inputs.events[3]!.series as Record<string, unknown>).anti_dilution_a = "outstanding_common_options_preferred_and_unissued_pool";
    expect(() => buildCapTables(inputs)).toThrow(InputError);
    expect(() => buildCapTables(inputs)).toThrow(/inputs\.events\[4\]\.anti_dilution_include_unissued_pool_in_a: series_a's anti_dilution_a/);
  });

  it("rounds CP2 half up to the step, counting a hair from halfway as halfway (R9)", () => {
    const step = new D("0.0001");
    expect(roundHalfUp(new D("2.19045"), step).toString()).toBe("2.1905");
    expect(roundHalfUp(new D("2.19045").minus("1e-35"), step).toString()).toBe("2.1905");
    expect(roundHalfUp(new D("2.190449"), step).toString()).toBe("2.1904");
    expect(roundHalfUp(new D("2.1904762066"), new D("0.01")).toString()).toBe("2.19");
  });
});

describe("pay-to-play beyond the cases (M4f)", () => {
  const pref = (id: string, name: string) => ({ id, name, kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "none" });
  // 6,000,000 common; P, Q and R each buy 1,000,000 Series A at $1.00; a Series B offers them $1,000,000 under pay-to-play.
  const company = (seriesB: Record<string, unknown>) => ({
    holders: [{ id: "a", name: "Founder A" }, { id: "p", name: "Investor P" }, { id: "q", name: "Investor Q" }, { id: "r", name: "Investor R" }, { id: "y", name: "Investor Y" }],
    events: [
      { id: "founding", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "a", shares: 6000000 }] },
      { id: "series_a", date: null, type: "priced_round", series: pref("series_a", "Series A Preferred"), pre_money: "6000000", investments: [{ holder: "p", amount: "1000000" }, { holder: "q", amount: "1000000" }, { holder: "r", amount: "1000000" }], seniority: [["series_a"]] },
      {
        id: "series_b", date: null, type: "priced_round", series: pref("series_b", "Series B Preferred"), pre_money: "9000000", seniority: [["series_b"], ["series_a"]],
        investments: [{ holder: "p", amount: "1000000/3" }, { holder: "q", amount: "333333.33" }, { holder: "y", amount: "2000000" }],
        pay_to_play: { series: ["series_a"], offered_amount: "1000000", conversion_ratio: "0.1" },
        ...seriesB,
      },
    ],
  });
  const refusal = (inputs: unknown) => {
    try {
      buildCapTables(inputs);
    } catch (e) {
      return e;
    }
    return null;
  };

  it("keeps the preferred of a holder that buys exactly its pro-rata, and converts all of one a cent short (R20, R22)", () => {
    const series = buildCapTables(company({})).at(-1)!.details;
    if (series.kind !== "priced_round") throw new Error("a priced round");
    // Each must buy a third of $1,000,000. P buys exactly that; Q buys $333,333.33; R buys nothing.
    expect(series.payToPlay!.holders.map((h) => [h.holder, h.participates, h.series[0]!.kept.toNumber(), h.series[0]!.commonReceived.toNumber()])).toEqual([
      ["p", true, 1_000_000, 0],
      ["q", false, 0, 100_000],
      ["r", false, 0, 100_000],
    ]);
  });

  it("refuses a pay-to-play round that also converts a SAFE, until a case settles it", () => {
    const inputs = company({});
    inputs.events.splice(2, 0, { id: "safe", date: null, type: "safes", safes: [{ id: "safe_s", holder: "y", purchase_amount: "100000", post_money_cap: "20000000" }] } as never);
    expect(refusal(inputs)).toMatchObject({ term: "pay_to_play_with_conversions", milestone: "later" });
  });

  it("refuses a pro-rata investment in a pay-to-play round: the requirement takes its place (R6, R17)", () => {
    const inputs = company({ investments: [{ holder: "p", amount: "400000", pro_rata: true }, { holder: "y", amount: "2000000" }] });
    const error = refusal(inputs);
    expect(error).toBeInstanceOf(InputError);
    expect((error as Error).message).toBe(
      "inputs.events[2].investments[0].pro_rata: Investor P's $400,000.00 is marked pro-rata, but in a pay-to-play round the pay-to-play " +
        "requirement takes the place of pro-rata. Enter it as an ordinary investment in the same round.",
    );
  });

  it.each([
    ["a series that doesn't exist", { series: ["series_c"], offered_amount: "1000000", conversion_ratio: "0.1" }, "inputs.events[2].pay_to_play.series[0]: series_c is not an existing preferred series"],
    ["a series named twice", { series: ["series_a", "series_a"], offered_amount: "1000000", conversion_ratio: "0.1" }, "inputs.events[2].pay_to_play.series[1]: series_a is listed twice"],
    ["a ratio for a series it doesn't name", { series: ["series_a"], offered_amount: "1000000", conversion_ratio: { series_a: "0.1", seed: "0.2" } }, "inputs.events[2].pay_to_play.conversion_ratio: give a ratio for each series the pay-to-play names, and only for those"],
    ["an unknown partial-participation rule", { series: ["series_a"], offered_amount: "1000000", conversion_ratio: "0.1", partial_participation: "convert_some" }, "inputs.events[2].pay_to_play.partial_participation: must be convert_all or convert_proportionally"],
    ["an unknown field", { series: ["series_a"], offered_amount: "1000000", conversion_ratio: "0.1", ratio: "0.1" }, "inputs.events[2].pay_to_play.ratio: unknown field"],
  ])("refuses %s", (_, payToPlay, message) => {
    const error = refusal(company({ pay_to_play: payToPlay }));
    expect(error).toBeInstanceOf(InputError);
    expect((error as Error).message).toContain(message);
  });
});

describe("notes beyond the cases (M4g)", () => {
  type Case = { holders: { id: string; name: string }[]; events: Record<string, unknown>[] };
  const case19a = () => readCaseFile("edge-19a-note-converts-with-pool", "inputs.json") as Case;
  const refusal = (inputs: unknown) => {
    try {
      buildCapTables(inputs);
    } catch (e) {
      return e;
    }
    return null;
  };

  it("converts two notes at two prices into two series, with a leap day's interest, as the reference calculator does", () => {
    // 19a's company, with the note issued on 2023-06-01 and the round on 2024-06-01: 366 days. A second note, $500,000
    // at 8% capped at $30,000,000, converts at its 20% discount instead. The expected values come from the reference calculator.
    const inputs = case19a();
    inputs.holders.push({ id: "investor_m", name: "Investor M" });
    const notes = inputs.events[3]!;
    notes.date = "2023-06-01";
    (notes.notes as Record<string, unknown>[])[0]!.issue_date = "2023-06-01";
    (notes.notes as Record<string, unknown>[]).push({
      id: "note_m", holder: "investor_m", principal: "500000", interest_rate: "0.08", interest_method: "simple", issue_date: "2023-06-01",
      valuation_cap: "30000000", cap_type: "pre_money", conversion_base: "with_pool", discount: "0.2", repayment_multiple: "2",
    });
    inputs.events[4]!.date = "2024-06-01";
    inputs.events[4]!.seniority = [["series_a", "series_a_notes", "series_a_notes_2"]];
    const built = buildCapTables(inputs).at(-1)!;
    const series = built.details;
    if (series.kind !== "priced_round") throw new Error("a priced round");
    expectClose(series.price, "227393/143448", "price");
    expect(series.noteConversions.map((c) => [c.note, c.method, c.shares.toNumber(), c.series])).toEqual([
      ["note_n", "cap", 1_325_205, "series_a_notes"],
      ["note_m", "discount", 425_901, "series_a_notes_2"],
    ]);
    // 366 days ÷ 365 of a year's interest (Actual/365).
    expectClose(series.noteConversions[0]!.interest, "4392000/73", "note_n interest");
    expectClose(series.noteConversions[1]!.interest, "2928000/73", "note_m interest");
    expectClose(series.noteConversions[1]!.conversionPrice, "227393/179310", "note_m discount price");
    expect(series.newShares.map((n) => n.shares.toNumber())).toEqual([3_154_186]);
    expect(series.poolTopUp.toNumber()).toBe(865_640);
    expect(built.capTable.securities.map((s) => s.name)).toContain("Series A Preferred (from notes) 2");
  });

  it("counts a converting note at its whole shares in a pro-rata base (R6), as the reference calculator does", () => {
    const inputs = case19a();
    inputs.events[4]!.investments = [{ holder: "investor_y", amount: "4000000" }, { holder: "founder_a", amount: "500000", pro_rata: true }];
    const series = buildCapTables(inputs).at(-1)!.details;
    if (series.kind !== "priced_round") throw new Error("a priced round");
    // Founder A's 6,000,000 of 8,500,000 outstanding plus the note's 1,325,000.
    expect(series.proRata.map((p) => [p.holder, p.preRoundShare.times(100).toFixed(6), p.entitlement.toFixed(2)])).toEqual([["founder_a", "61.068702", "2748091.60"]]);
  });

  it("refuses a round that converts notes without a date, or dated before a note was issued (R23)", () => {
    const undated = case19a();
    delete undated.events[4]!.date;
    expect(refusal(undated)).toMatchObject({ message: "inputs.events[4].date: a round that converts notes needs a date, for their interest (R23)" });
    const early = case19a();
    early.events[4]!.date = "2022-12-31";
    expect(refusal(early)).toMatchObject({ message: "inputs.events[4].date: the round is dated before note_n was issued" });
  });

  it("refuses a date that doesn't exist", () => {
    const inputs = case19a();
    inputs.events[4]!.date = "2024-02-30";
    expect(refusal(inputs)).toMatchObject({ message: "inputs.events[4].date: expected a date as YYYY-MM-DD" });
  });

  it("refuses a note converting in a down round or a pay-to-play round, until a case settles each (owed before release)", () => {
    const down = readCaseFile("edge-16a-broad-based", "inputs.json") as Case;
    down.holders.push({ id: "investor_n", name: "Investor N" });
    down.events.splice(4, 0, {
      id: "note", date: "2024-06-01", type: "notes",
      notes: [{ id: "note_n", holder: "investor_n", principal: "500000", interest_rate: "0.06", issue_date: "2024-06-01", valuation_cap: "20000000", conversion_base: "with_pool", discount: "0.2", repayment_multiple: "2" }],
    });
    down.events.at(-1)!.convert_notes = true;
    down.events.at(-1)!.seniority = [["series_b", "series_b_notes"], ["series_a"]];
    expect(refusal(down)).toMatchObject({ term: "anti_dilution_with_conversions", milestone: "later" });

    const payToPlay = readCaseFile("edge-17a-pay-to-play-priced-after", "inputs.json") as Case;
    payToPlay.holders.push({ id: "investor_n", name: "Investor N" });
    payToPlay.events.splice(4, 0, down.events[4]!);
    payToPlay.events.at(-1)!.convert_notes = true;
    expect(refusal(payToPlay)).toMatchObject({ term: "pay_to_play_with_conversions", milestone: "later" });
  });
});

describe("a round's seniority without its series from SAFEs and notes (R28)", () => {
  type Case = { holders: unknown[]; events: Record<string, unknown>[] };
  const tables = (inputs: Case) => buildCapTables(inputs).map((t) => t.capTable);

  it("ranks them alongside the round's new series: Millrace's Seed, and 21's Series A, build the same cap tables", () => {
    const millrace = readCaseFile("millrace", "inputs.json") as Case;
    const seed = millrace.events.find((e) => e.id === "seed")!;
    const written = tables(millrace);
    seed.seniority = [["seed"]];
    expect(tables(millrace)).toEqual(written);
    expect(buildCapTables(millrace)[5]!.capTable.seniority).toEqual([["seed", "seed_shadow"]]);

    const case21 = readCaseFile("edge-21-note-and-pre-money-safe", "inputs.json") as Case;
    const full = tables(case21);
    case21.events.at(-1)!.seniority = [["series_a"]];
    expect(tables(case21)).toEqual(full);
    expect(buildCapTables(case21).at(-1)!.capTable.seniority).toEqual([["series_a", "series_a_shadow", "series_a_notes"]]);
  });

  it("keeps a series from SAFEs where the seniority puts it", () => {
    const millrace = readCaseFile("millrace", "inputs.json") as Case;
    millrace.events.find((e) => e.id === "seed")!.seniority = [["seed"], ["seed_shadow"]];
    expect(buildCapTables(millrace)[5]!.capTable.seniority).toEqual([["seed"], ["seed_shadow"]]);
  });

  it("still needs the round's new series, and every earlier series", () => {
    const millrace = readCaseFile("millrace", "inputs.json") as Case;
    millrace.events.find((e) => e.id === "series_a")!.seniority = [["series_a"], ["seed"]];
    expect(() => buildCapTables(millrace)).toThrow("inputs.events[7].seniority: seed_shadow must appear in exactly one tier (it appears 0 times)");
    millrace.events.find((e) => e.id === "series_a")!.seniority = [["seed", "seed_shadow"]];
    expect(() => buildCapTables(millrace)).toThrow("inputs.events[7].seniority: series_a must appear in exactly one tier (it appears 0 times)");
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
