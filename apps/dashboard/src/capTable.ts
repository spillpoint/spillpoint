// What the founder view says about a holder, beyond what solve() returns:
// its share of the company, fully diluted, and where its payout starts.

import { D, solve } from "spillpoint";
import type { CapTable, PreparedCapTable } from "spillpoint";

/** The engine's 40-digit Decimal. */
type Decimal = D;

const ZERO = new D(0);

/**
 * As-converted shares of one security: preferred by its conversion ratio, a
 * warrant for a series by that series' ratio (R29: it counts as converted),
 * everything else one for one.
 */
function asConverted(pc: PreparedCapTable, security: string, shares: Decimal): Decimal {
  const warrant = pc.warrants.get(security);
  const series = pc.preferred.get(warrant ? warrant.underlying : security);
  return series ? shares.times(series.conversionRatio) : shares;
}

/**
 * The fully diluted share count, including the unissued pool (M3 plan,
 * answer 1): issued stock, options and warrants, preferred as converted, and
 * the pool.
 */
export function fullyDiluted(pc: PreparedCapTable): Decimal {
  return pc.capTable.positions
    .reduce((sum, p) => sum.plus(asConverted(pc, p.security, p.shares)), ZERO)
    .plus(pc.capTable.unissuedPool);
}

/** part ÷ whole, or zero when there's nothing to divide (a cap table with no shares yet, being edited). */
export function fractionOf(part: Decimal, whole: Decimal): Decimal {
  return whole.isZero() ? ZERO : part.div(whole);
}

/** One holder's fully diluted shares. */
export function holderShares(pc: PreparedCapTable, holder: string): Decimal {
  return pc.capTable.positions
    .filter((p) => p.holder === holder)
    .reduce((sum, p) => sum.plus(asConverted(pc, p.security, p.shares)), ZERO);
}

/** One class's fully diluted shares. */
export function classShares(pc: PreparedCapTable, security: string): Decimal {
  return pc.capTable.positions
    .filter((p) => p.security === security)
    .reduce((sum, p) => sum.plus(asConverted(pc, p.security, p.shares)), ZERO);
}

/**
 * Each SAFE and note still outstanding (C8, C9), by id, named as the
 * engine's reasons name them: "Priya Shah's SAFE". Each is its own class in
 * the payouts. A holder with two of a kind has each told apart by its amount.
 */
export function outstandingNames(pc: PreparedCapTable): Map<string, string> {
  const { holders, unconvertedSafes = [], unconvertedNotes = [] } = pc.capTable;
  const holder = (id: string) => holders.find((h) => h.id === id)?.name ?? id;
  const money = (v: Decimal) => `$${v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  const names = new Map<string, string>();
  const name = (rows: { id: string; holder: string; amount: Decimal }[], kind: string) => {
    for (const r of rows) {
      const twice = rows.filter((x) => x.holder === r.holder).length > 1;
      names.set(r.id, `${holder(r.holder)}'s ${kind}${twice ? ` (${money(r.amount)})` : ""}`);
    }
  };
  name(unconvertedSafes.map((f) => ({ id: f.id, holder: f.holder, amount: f.purchaseAmount })), "SAFE");
  name(unconvertedNotes.map((n) => ({ id: n.id, holder: n.holder, amount: n.principal })), "convertible note");
  return names;
}

/** The holder the founder view opens on: whoever holds the most common stock. */
export function defaultHolder(capTable: CapTable): string {
  const common = new Set(capTable.securities.filter((s) => s.kind === "common").map((s) => s.id));
  const held = new Map<string, Decimal>();
  for (const p of capTable.positions) {
    if (common.has(p.security)) held.set(p.holder, (held.get(p.holder) ?? ZERO).plus(p.shares));
  }
  let best = capTable.holders[0]?.id ?? "";
  let most = ZERO;
  for (const [holder, shares] of held) {
    if (shares.gt(most)) {
      best = holder;
      most = shares;
    }
  }
  return best;
}

/** What one holder gets at an exit value. */
export function holderPayout(pc: PreparedCapTable, holder: string, exitValue: Decimal): Decimal {
  const answer = solve(pc, exitValue).answers[0]!;
  return answer.payout.holderTotals.get(holder) ?? ZERO;
}

export type PayoutStart =
  | { kind: "first dollar" }
  | { kind: "from"; exitValue: Decimal }
  | { kind: "never"; upTo: Decimal };

/**
 * The first exit value where this holder's payout rises above zero (M3 plan,
 * answer 1). Payouts are straight lines between breakpoints, so a payout that
 * is zero and then isn't must start at a breakpoint: check just above each.
 */
export function payoutStart(
  pc: PreparedCapTable,
  holder: string,
  range: readonly [Decimal, Decimal],
  breakpoints: readonly Decimal[],
): PayoutStart {
  const [lo, hi] = range;
  const step = new D(1);
  if (holderPayout(pc, holder, lo.plus(step)).gt(0)) return { kind: "first dollar" };
  for (const b of breakpoints) {
    if (holderPayout(pc, holder, b.plus(step)).gt(0)) return { kind: "from", exitValue: b };
  }
  return { kind: "never", upTo: hi };
}
