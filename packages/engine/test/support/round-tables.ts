// What the round tests share: a built cap table, field by field, against a locked round case's (M4c–M4g; R32, 11b).

import type { Decimal } from "decimal.js";
import { expect } from "vitest";

import { parseExact } from "../../src/index.ts";
import type { AntiDilutionPiece, CapTableAfterEvent } from "../../src/index.ts";
import { D } from "../../src/decimal.ts";

export interface Inputs {
  holders: unknown[];
  events: { id: string; type: string }[];
}
export interface ExpectedTable {
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



/** A value the engine holds to 40 digits against the case's exact one: within one part in 10^30. */
export function expectClose(actual: Decimal, exact: unknown, what: string): void {
  const expected = parseExact(exact, what);
  const tolerance = new D("1e-30").times(D.max(1, expected.abs()));
  expect(actual.minus(expected).abs().lte(tolerance), `${what}: ${actual.toString()} against ${String(exact)}`).toBe(true);
}

export function expectSameNumber(actual: Decimal | null, exact: unknown, what: string): void {
  if (exact == null) {
    expect(actual, what).toBeNull();
    return;
  }
  expect(actual?.eq(parseExact(exact, what)), `${what}: ${String(actual)} against ${String(exact)}`).toBe(true);
}

/**
 * A built table against the case's, field by field. At a stated price (R32) the post-money valuation is the price ×
 * the post-money count, held to 40 digits, so it's compared within one part in 10^30, as the price is.
 */
export function expectSameTable(built: CapTableAfterEvent, expected: ExpectedTable, stated = false): void {
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
  const builtSafes = built.capTable.unconvertedSafes ?? [];
  expect(builtSafes.map((f) => [f.id, f.holder])).toEqual(safes.map((f) => [f.id, f.holder]));
  builtSafes.forEach((f, i) => {
    const e = safes[i]!;
    expectSameNumber(f.purchaseAmount, e.purchase_amount, `${at} ${f.id} purchase amount`);
    expectSameNumber(f.postMoneyCap, e.post_money_cap ?? null, `${at} ${f.id} post-money cap`);
    expectSameNumber(f.preMoneyCap, e.pre_money_cap ?? null, `${at} ${f.id} pre-money cap`);
    expectSameNumber(f.discount, e.discount, `${at} ${f.id} discount`);
  });
  const notes = exp.unconverted_notes ?? [];
  const builtNotes = built.capTable.unconvertedNotes ?? [];
  expect(builtNotes.map((n) => [n.id, n.holder, n.issueDate, n.conversionBase])).toEqual(
    notes.map((n) => [n.id, n.holder, n.issue_date, n.conversion_base]),
  );
  builtNotes.forEach((n, i) => {
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
    if (stated) expectClose(d.postMoneyValuation, ed.post_money_valuation, `${at} post-money valuation`);
    else expectSameNumber(d.postMoneyValuation, ed.post_money_valuation, `${at} post-money valuation`);
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
      // R25: with conversions, each piece's price, whether it counted, and its shares in A when it counted there instead.
      // The case file names a piece "new money" or by its SAFE's or note's id; the engine gives its kind and id (item 12).
      const pieces = (e.pieces ?? null) as { piece: string; price: string; counted: boolean; in_a?: number }[] | null;
      const named = (p: AntiDilutionPiece) => (p.kind === "new_money" ? "new money" : p.id);
      expect(x.pieces?.map((p) => [named(p), p.counted, p.inA?.toNumber() ?? null]) ?? null, `${what} pieces`).toEqual(
        pieces && pieces.map((p) => [p.piece, p.counted, p.in_a ?? null]),
      );
      x.pieces?.forEach((p, j) => expectClose(p.price, pieces![j]!.price, `${what} ${named(p)} price`));
      for (const p of x.pieces ?? []) expect(Object.keys(p), `${what} piece`).toEqual(["kind", "id", "price", "counted", "inA"]);
      expect(x.pieces?.map((p) => p.kind) ?? [], `${what} kinds`).toEqual(
        (pieces ?? []).map((p, j) => (j === 0 ? "new_money" : d.safeConversions.some((c) => c.safe === p.piece) ? "safe" : "note")),
      );
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
