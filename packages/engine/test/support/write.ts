// A cap table the engine built, written back out in the case-file format (C1–C4, C8, C9), as a starting table (C17)
// gives it. Every number is the engine's own 40-digit value written in full, so reading it back gives the same numbers.

import type { Decimal } from "decimal.js";

import type { CapTable } from "../../src/index.ts";

type Json = Record<string, unknown>;

const text = (d: Decimal) => d.toFixed();

export function capTableJson(ct: CapTable): Json {
  return {
    holders: ct.holders.map((h) => ({ id: h.id, name: h.name })),
    securities: ct.securities.map((s) => {
      if (s.kind === "common") return { id: s.id, name: s.name, kind: s.kind };
      if (s.kind === "option") return { id: s.id, name: s.name, kind: s.kind, strike: text(s.strike) };
      if (s.kind === "warrant") return { id: s.id, name: s.name, kind: s.kind, strike: text(s.strike), underlying: s.underlying };
      const d = s.cumulativeDividend;
      return {
        id: s.id,
        name: s.name,
        kind: s.kind,
        original_issue_price: text(s.originalIssuePrice),
        conversion_price: text(s.conversionPrice),
        preference_multiple: text(s.preferenceMultiple),
        participation: s.participation,
        cap_multiple: s.capMultiple ? text(s.capMultiple) : null,
        anti_dilution: s.antiDilution,
        ...(s.antiDilutionA != null ? { anti_dilution_a: s.antiDilutionA } : {}),
        ...(d ? { cumulative_dividend: { rate: text(d.rate), method: d.method, accrual_start: d.accrualStart, on_conversion: d.onConversion } } : {}),
      };
    }),
    seniority: ct.seniority.map((t) => [...t]),
    conversion_groups: ct.conversionGroups.map((g) => ({
      series: [...g.series],
      vote_threshold_percent: text(g.voteThreshold.times(100)),
      vote_rule: g.voteRule,
    })),
    positions: ct.positions.map((p) => ({ holder: p.holder, security: p.security, shares: text(p.shares) })),
    unissued_pool: text(ct.unissuedPool),
    ...(ct.unconvertedSafes?.length
      ? {
          unconverted_safes: ct.unconvertedSafes.map((f) => ({
            id: f.id,
            holder: f.holder,
            purchase_amount: text(f.purchaseAmount),
            ...(f.postMoneyCap ? { post_money_cap: text(f.postMoneyCap) } : {}),
            ...(f.preMoneyCap ? { pre_money_cap: text(f.preMoneyCap) } : {}),
            discount: text(f.discount),
            ...(f.cashOutRanksWith != null ? { cash_out_ranks_with: f.cashOutRanksWith } : {}),
          })),
        }
      : {}),
    ...(ct.unconvertedNotes?.length
      ? {
          unconverted_notes: ct.unconvertedNotes.map((n) => ({
            id: n.id,
            holder: n.holder,
            principal: text(n.principal),
            interest_rate: text(n.interestRate),
            interest_method: n.interestMethod,
            issue_date: n.issueDate,
            valuation_cap: n.valuationCap ? text(n.valuationCap) : null,
            cap_type: n.capType,
            conversion_base: n.conversionBase,
            discount: text(n.discount),
            repayment_multiple: text(n.repaymentMultiple),
          })),
        }
      : {}),
  };
}
