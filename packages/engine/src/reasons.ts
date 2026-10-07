// Plain-English reasons for a breakpoint (SPEC, Breakpoints). Each reason
// compares the answer just below the breakpoint with the answer just above,
// and explains one change: a tier paid in full, a cap reached, options or a
// warrant coming into the money, a series or a group converting, a SAFE's
// Cash-Out Amount paid in full or the SAFE switching to its Conversion
// Amount, a note repaid in full or switching to conversion, a carve-out's
// tier ending, payouts jumping, or payouts curving.

import type { Decimal } from "decimal.js";

import { D, ONE, ZERO, moreThan } from "./decimal.ts";
import type { Snapshot } from "./decisions.ts";
import { CARVE_OUT, carveOutAt, payout } from "./waterfall.ts";
import type { PreparedCapTable } from "./waterfall.ts";

export type ReasonCode =
  | "tier_fully_paid"
  | "cap_reached"
  | "option_in_the_money"
  | "warrant_in_the_money"
  | "series_converts"
  | "safe_cash_out_paid"
  | "safe_switches"
  | "note_repayment_paid"
  | "note_switches"
  | "carve_out_tier"
  | "payouts_jump"
  | "payouts_curve"
  | "other";

export interface Reason {
  code: ReasonCode;
  /** The securities it concerns: a tier's series, a series or a group's series, an option class, a warrant. */
  subject: string[];
  /** For a change that can go either way: true when it starts (converts, comes into the money). */
  starts: boolean;
  text: string;
}

// ---------- formatting ----------

function grouped(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Dollars for founders: $26,000,000 for a whole amount, $19,999,999.79 otherwise. */
export function money(amount: Decimal): string {
  const [whole, cents] = amount.toDecimalPlaces(2, 4).toFixed(2).split(".") as [string, string];
  return cents === "00" ? `$${grouped(whole)}` : `$${grouped(whole)}.${cents}`;
}

/** A price per share: up to six places, at least two. */
export function perShare(amount: Decimal): string {
  let s = amount.toDecimalPlaces(6, 4).toFixed(6).replace(/0+$/, "");
  if (/\.\d?$/.test(s)) s = amount.toFixed(2);
  const [whole, frac] = s.split(".") as [string, string];
  return `$${grouped(whole)}.${frac}`;
}

function shares(n: Decimal): string {
  if (n.isInteger()) return grouped(n.toFixed(0));
  const [whole, frac] = n.toDecimalPlaces(2, 4).toFixed(2).split(".") as [string, string];
  return `${grouped(whole)}.${frac}`;
}

/** "10%": a rate as a percentage. */
function pct(rate: Decimal): string {
  return `${rate.times(100).toString()}%`;
}

function multiple(m: Decimal): string {
  return `${m.toString()}x`;
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "half", or "60%": a vote threshold in words. */
function share(fraction: Decimal): string {
  return fraction.eq("0.5") ? "half" : `${fraction.times(100).toString()}%`;
}

// ---------- reasons ----------

/** How far above a jump its new outcome is read, when it can't be read at the jump itself: far below a cent at any slope. */
const JUST_ABOVE = new D("1e-12");

// The wording is for founders: no assumption codes in the text (they stay in
// the structured fields and in the code comments), and money in plain dollars.

export function describeChange(pc: PreparedCapTable, x: Decimal, below: Snapshot, above: Snapshot, jumps: boolean): Reason[] {
  const { capTable } = pc;
  const name = new Map<string, string>([
    ...capTable.holders.map((h) => [h.id, h.name] as [string, string]),
    ...capTable.securities.map((s) => [s.id, s.name] as [string, string]),
    [CARVE_OUT, "the management carve-out"],
  ]);
  const holderName = new Map(capTable.holders.map((h) => [h.id, h.name]));
  for (const f of pc.safes.values()) name.set(f.id, `${holderName.get(f.holder)}'s SAFE`);
  for (const t of pc.notes.values()) name.set(t.note.id, `${holderName.get(t.note.holder)}'s convertible note`);
  const before = below.answer.decisions;
  const after = above.answer.decisions;
  // Both answers paid out at the breakpoint itself: the outcome from below, and the limit of the outcome from above.
  const atBefore = payout(pc, x, before);
  const atAfter = payout(pc, x, after);
  const reasons: Reason[] = [];

  // Options coming into (or falling out of) the money.
  for (const o of pc.options.values()) {
    const was = before.exercised.has(o.id);
    const is = after.exercised.has(o.id);
    if (was === is) continue;
    const which = `Options at a ${perShare(o.strike)} strike (${shares(pc.shares.get(o.id)!)})`;
    reasons.push({
      code: "option_in_the_money",
      subject: [o.id],
      starts: is,
      text: is
        ? `${which} come into the money here. Above this, exercising pays, and the strike money joins the proceeds.`
        : `${which} fall out of the money here. Above this, exercising no longer pays.`,
    });
  }

  // A warrant coming into (or falling out of) the money (E4, E12). It decides
  // for itself: exercising pays once a share of what it buys is worth more
  // than the strike.
  for (const w of pc.warrants.values()) {
    const was = before.exercised.has(w.id);
    const is = after.exercised.has(w.id);
    if (was === is) continue;
    const what = w.underlying === "common" ? "common" : name.get(w.underlying)!;
    const which = `The warrant for ${shares(pc.shares.get(w.id)!)} ${what} shares at a ${perShare(w.strike)} strike`;
    const joins = w.underlying === "common" ? "the new shares share the residual as common" : `the new shares join ${what}, with its preference and conversion`;
    reasons.push({
      code: "warrant_in_the_money",
      subject: [w.id],
      starts: is,
      text: is
        ? `${which} comes into the money here: each ${what} share is worth the strike. Above this, exercising pays: the strike money joins the proceeds, and ${joins}.`
        : `${which} falls out of the money here. Above this, exercising no longer pays.`,
    });
  }

  // A conversion group converting or staying. E11: each holder votes for
  // conversion only if it does strictly better converting; E17: the group
  // decides first, on the two settled outcomes.
  const group = capTable.conversionGroups[0];
  const members = new Set(group?.series ?? []);
  if (group && group.series.some((sid) => before.converted.has(sid) !== after.converted.has(sid))) {
    const converts = after.converted.has(group.series[0]!);
    const rule =
      `${list(group.series.map((sid) => name.get(sid)!))} convert together if holders of ` +
      `${group.voteRule === "at_least" ? "at least" : "more than"} ${share(group.voteThreshold)} their shares vote for it.`;
    let happens: string;
    if (converts) {
      const voters = new Set<string>();
      for (const p of capTable.positions) if (members.has(p.security) && !p.shares.isZero()) voters.add(p.holder);
      const yes = [...voters].filter((h) => moreThan(above.margins.get(`vote:${h}`) ?? ZERO, ZERO)).map((h) => name.get(h)!);
      const who = yes.length === 2 ? `${list(yes)} both do` : `${list(yes)} ${yes.length === 1 ? "does" : "do"}`;
      happens = `Above ${money(x)} ${who} better converting, so the vote passes.`;
    } else {
      happens = `Above ${money(x)} the vote no longer passes, so they stay preferred.`;
    }
    reasons.push({ code: "series_converts", subject: [...group.series], starts: converts, text: `${rule} ${happens}` });
  }

  // A series deciding for itself.
  for (const s of pc.preferred.values()) {
    if (members.has(s.id) || before.converted.has(s.id) === after.converted.has(s.id)) continue;
    const converts = after.converted.has(s.id);
    let text: string;
    if (converts) {
      // E12: the series here counts the shares of any exercised warrant for it.
      const here = atAfter.series.get(s.id)!;
      // X4, X5: accrued dividends are part of the preference. Converting gives them up, unless they are paid on conversion.
      let keep: string;
      if (s.participation === "participating_capped") {
        keep = `its capped total of ${money(here.capTotal!)} (${multiple(s.capMultiple!)} its investment)`;
      } else if (here.dividends.isZero()) {
        keep = `its ${multiple(s.preferenceMultiple)} preference of ${money(here.preference)}`;
      } else if (s.cumulativeDividend!.onConversion === "paid") {
        keep =
          `its ${multiple(s.preferenceMultiple)} preference of ${money(here.preference.minus(here.dividends))}. ` +
          `Its accrued dividends, ${money(here.dividends)}, are paid either way: converting keeps them, in its tier`;
      } else {
        keep =
          `its ${multiple(s.preferenceMultiple)} preference plus ${money(here.dividends)} of accrued dividends, ` +
          `${money(here.preference)} in all, which converting gives up`;
      }
      text =
        `${s.name} converts to common here. Its ${shares(here.asConverted)} as-converted shares are worth ` +
        `${money(here.asConverted.times(atAfter.commonPrice))} at ${perShare(atAfter.commonPrice)} each, the same as ${keep}. ` +
        "Below this exit value keeping its preference pays more; above it, converting does.";
    } else {
      text = `${s.name} stops converting here: above this exit value keeping its preference pays more.`;
    }
    reasons.push({ code: "series_converts", subject: [s.id], starts: converts, text });
  }

  // Preference tiers paid in full.
  for (const [index, tier] of capTable.seniority.entries()) {
    const b = below.answer.payout.tiers.find((t) => t.index === index);
    const a = above.answer.payout.tiers.find((t) => t.index === index);
    if (!(b && !b.full && a && a.full)) continue;
    const paid = atAfter.tiers.find((t) => t.index === index) ?? atBefore.tiers.find((t) => t.index === index)!;
    // X7, X9: a carve-out or a SAFE sharing the tier is named apart: it has a claim, not a preference.
    const carveShares = paid.series.includes(CARVE_OUT);
    const safesInTier = paid.series.filter((sid) => pc.safes.has(sid));
    const names = paid.series.filter((sid) => sid !== CARVE_OUT && !pc.safes.has(sid)).map((sid) => name.get(sid)!);
    const next = above.answer.payout.tiers.find((t) => t.index > index && !t.full);
    let nextText: string;
    if (next) {
      const nextNames = next.series.map((sid) => name.get(sid)!);
      nextText = `goes to ${nextNames.length === 1 ? `${nextNames[0]}'s preference` : `the preferences of ${list(nextNames)}`}`;
    } else {
      const sharing = sharers(pc, after).map((id) => name.get(id)!);
      nextText = sharing.length === 1 ? `goes to ${sharing[0]}` : `is shared as common by ${list(sharing)}`;
    }
    // X4: a preference includes accrued dividends; a converted series' claim is only its dividends (X5).
    // A carve-out in the tier (X7) isn't a series, and has no dividends.
    const withDividends = paid.series.some((sid) => atAfter.series.get(sid)?.dividends.isZero() === false);
    const what = withDividends ? "preference, with accrued dividends," : "preference";
    let whose =
      names.length === 0 ? "" : names.length === 1 ? `${names[0]}'s ${what} is` : `The ${withDividends ? "preferences, with accrued dividends," : "preferences"} of ${list(names)} are`;
    const others = [...(carveShares ? ["the management carve-out's claim"] : []), ...safesInTier.map((id) => `${name.get(id)!}'s Cash-Out Amount`)];
    if (others.length > 0) {
      const all = [...(whose ? [whose.replace(/ (is|are)$/, "")] : []), ...others];
      whose = `${all.length === 1 ? all[0]! : list(all)} ${all.length === 1 ? "is" : "are"}`;
      whose = whose.charAt(0).toUpperCase() + whose.slice(1);
    }
    reasons.push({
      code: "tier_fully_paid",
      // A carve-out alongside the preferences shares the most senior tier (X7).
      subject: [...tier, ...(paid.series.includes(CARVE_OUT) ? [CARVE_OUT] : []), ...safesInTier],
      starts: true,
      text: `${whose} paid in full here: ${money(paid.claim)}. Above this exit value, the next dollar ${nextText}.`,
    });
  }

  // A SAFE's Cash-Out Amount paid in full, with no preferred: the SAFEs taking it share one claim, pro rata (X13).
  const cashBelow = below.answer.payout.safeCash;
  const cashAbove = above.answer.payout.safeCash;
  if (cashBelow && !cashBelow.full && cashAbove?.full) {
    const ids = cashAbove.safes;
    const next = sharers(pc, after).map((id) => name.get(id)!);
    const nextText = next.length === 1 ? `goes to ${next[0]}` : `is shared as common by ${list(next)}`;
    const text =
      ids.length === 1
        ? `${name.get(ids[0]!)} gets its full Cash-Out Amount here, its ${money(pc.safes.get(ids[0]!)!.purchaseAmount)} purchase amount, which is paid ahead of common. Above this exit value, the next dollar ${nextText}.`
        : `The Cash-Out Amounts of ${list(ids.map((id) => `${name.get(id)} (${money(pc.safes.get(id)!.purchaseAmount)})`))} are paid in full here, ` +
          `${money(cashAbove.claim)} in all. Until here they shared every dollar pro rata by purchase amount. Above this exit value, the next dollar ${nextText}.`;
    reasons.push({ code: "safe_cash_out_paid", subject: ids, starts: true, text });
  }

  // A SAFE switching between its Cash-Out Amount and its Conversion Amount (X1, X9, X13, X14).
  for (const f of pc.safes.values()) {
    const converts = after.converted.has(f.id);
    if (before.converted.has(f.id) === converts) continue;
    const who = name.get(f.id)!;
    let text: string;
    if (!converts) {
      text = `${who} switches back to its Cash-Out Amount here: above this exit value it pays more.`;
    } else if (!f.postMoneyCap && !f.preMoneyCap) {
      const worth = f.purchaseAmount.div(ONE.minus(f.discount));
      const priced = f.discount.isZero() ? "the sale's common price" : `the sale's common price less its ${pct(f.discount)} discount`;
      text =
        `${who} has no valuation cap, so it converts at ${priced}. That is worth exactly ${money(worth)} wherever it is possible, ` +
        `which is where what is left for common and the SAFE is more than that, and this is the first exit value where it is. ` +
        `Below it the SAFE takes its ${money(f.purchaseAmount)} Cash-Out Amount; above it, ${money(worth)}.`;
    } else {
      const here = atAfter.safes.get(f.id)!;
      text =
        `${who} switches from its Cash-Out Amount to its Conversion Amount here. Its ${shares(here.shares!)} conversion shares ` +
        `(${money(f.purchaseAmount)} ÷ the Liquidity Price of ${perShare(here.liquidityPrice!)}) are worth ${perShare(atAfter.commonPrice)} each, ` +
        `${money(here.shares!.times(atAfter.commonPrice))} in all, the same as its purchase amount. Below this exit value the Cash-Out Amount pays more; above it, the Conversion Amount does.`;
      // X13: one Liquidity Capitalization for every converting SAFE, so converting enlarges the count the others' shares are a fixed share of.
      const others = [...pc.safes.values()].filter((g) => g.id !== f.id && g.postMoneyCap && after.converted.has(g.id) && f.postMoneyCap);
      if (others.length > 0 && jumps) {
        const names = list(others.map((g) => name.get(g.id)!));
        text +=
          ` Converting adds its shares to the Liquidity Capitalization, and ${names} ${others.length === 1 ? "keeps its" : "keep their"} fixed share of that larger count, ` +
          `so ${others.length === 1 ? "its payout jumps" : "their payouts jump"} up just above this exit value, and common's down.`;
      }
    }
    reasons.push({ code: "safe_switches", subject: [f.id], starts: converts, text });
  }

  // Notes repaid in full (X3, X15): debt, ahead of all equity, the notes sharing a shortfall pro rata.
  const debtBelow = below.answer.payout.noteDebt;
  const debtAbove = above.answer.payout.noteDebt;
  if (debtBelow && !debtBelow.full && debtAbove?.full) {
    const ids = debtAbove.notes;
    // The next dollar goes to the most senior preference tier still owed, or else to common.
    const owed = above.answer.payout.tiers.find((t) => !t.full);
    const nextText = owed
      ? `goes to ${owed.series.length === 1 ? `${name.get(owed.series[0]!)}'s preference` : `the preferences of ${list(owed.series.map((id) => name.get(id)!))}`}`
      : (() => {
          const next = sharers(pc, after).map((id) => name.get(id)!);
          return next.length === 1 ? `goes to ${next[0]}` : `is shared as common by ${list(next)}`;
        })();
    const terms = (id: string) => pc.notes.get(id)!;
    const text =
      ids.length === 1
        ? `${name.get(ids[0]!)} is repaid in full here: ${multiple(terms(ids[0]!).note.repaymentMultiple)} its principal plus interest, ` +
          `${money(terms(ids[0]!).repayment)}, paid ahead of all equity as debt. Above this exit value, the next dollar ${nextText}.`
        : `The convertible notes are repaid in full here: ${list(ids.map((id) => `${name.get(id)} (${money(terms(id).repayment)})`))}, ` +
          `${money(debtAbove.claim)} in all, paid ahead of all equity as debt. Until here they shared every dollar pro rata by repayment. ` +
          `Above this exit value, the next dollar ${nextText}.`;
    reasons.push({ code: "note_repayment_paid", subject: ids, starts: true, text });
  }

  // A note switching between repayment and conversion (X3, X10–X12).
  for (const t of pc.notes.values()) {
    const id = t.note.id;
    const converts = after.converted.has(id);
    if (before.converted.has(id) === converts) continue;
    const who = name.get(id)!;
    let text: string;
    if (!converts) {
      text = `${who} switches back to repayment here: above this exit value it pays more.`;
    } else if (!t.note.valuationCap) {
      const worth = t.amount.div(ONE.minus(t.note.discount));
      text =
        `${who} has no valuation cap, so it converts at the sale's common price less its ${pct(t.note.discount)} discount. ` +
        `Its principal plus interest, ${money(t.amount)}, is then worth exactly ${money(worth)} wherever that is possible, which is where ` +
        `what is left for common and the note is more than that, and this is the first exit value where it is. ` +
        `Below it the note is repaid ${money(t.repayment)}; above it, ${money(worth)}.`;
    } else {
      text =
        `${who} switches from repayment to conversion here. Its principal plus interest, ${money(t.amount)}, converts at ` +
        `${perShare(t.price!)} a share (the ${money(t.note.valuationCap)} cap ÷ ${shares(t.baseShares!)} shares) into ${shares(t.shares!)} shares, ` +
        `worth ${perShare(atAfter.commonPrice)} each here, ${money(t.shares!.times(atAfter.commonPrice))} in all, the same as its ${money(t.repayment)} repayment. ` +
        "Below this exit value repayment pays more; above it, converting does.";
    }
    reasons.push({ code: "note_switches", subject: [id], starts: converts, text });
  }

  // Caps reached.
  for (const sid of above.answer.payout.atCap) {
    if (below.answer.payout.atCap.includes(sid)) continue;
    const s = pc.preferred.get(sid)!;
    reasons.push({
      code: "cap_reached",
      subject: [sid],
      starts: true,
      text:
        `${s.name} reaches its cap here: its preference and its share as common together come to ` +
        `${multiple(s.capMultiple!)} its investment, ${money(above.answer.payout.series.get(sid)!.capTotal!)}. ` +
        "Above this exit value its payout stays flat until converting pays more.",
    });
  }

  // X6, X7: one of the carve-out's tiers ends. Alongside the preferences, it
  // is a claim on a tier that may not be paid in full, so say what it gets.
  const bandBelow = below.answer.payout.carveOut?.band;
  const bandAbove = above.answer.payout.carveOut?.band;
  if (capTable.carveOut && bandBelow !== undefined && bandAbove !== undefined && bandBelow !== bandAbove) {
    const tiers = capTable.carveOut.tiers;
    const ended = tiers[bandBelow]!;
    const next = tiers[bandAbove];
    const claim = carveOutAt(capTable.carveOut, x).claim;
    const paid = atAfter.carveOut!.paid;
    const span = ended.from.isZero() ? `on exit value up to ${money(ended.to!)}` : `on exit value from ${money(ended.from)} to ${money(ended.to!)}`;
    const short = !paid.minus(claim).abs().lt("0.005");
    const opening = `The carve-out's ${pct(ended.rate)} tier, ${span}, ends here`;
    const what = short
      ? `${opening}, with its claim at ${money(claim)}. It shares the most senior tier pro rata with the preferences there, and that tier isn't paid in full, so it gets ${money(paid)}.`
      : `${opening}, with the carve-out at ${money(claim)}.`;
    const then = next
      ? ` Above this, ${short ? "its claim grows by" : "it takes"} ${pct(next.rate)} of each further dollar${next.to ? `, up to ${money(next.to)}` : ""}.`
      : ` That was its last tier: above this it stays at ${money(claim)}.`;
    reasons.push({ code: "carve_out_tier", subject: [], starts: true, text: what + then });
  }

  // E13: payouts that jump. Say what each class gets either side.
  if (jumps) {
    // The new outcome's limit, just above x: at x itself it may not exist yet, as for a SAFE with no cap,
    // which can convert only above the point where it first can (X9).
    const justAbove = payout(pc, x.plus(JUST_ABOVE), after);
    const moves: string[] = [];
    for (const [sid, was] of atBefore.classTotals) {
      const is = justAbove.classTotals.get(sid)!;
      if (was.minus(is).abs().lt("0.005")) continue;
      moves.push(`${name.get(sid)} ${is.gt(was) ? "rises" : "drops"} from ${money(was)} to ${money(is)}`);
    }
    reasons.push({
      code: "payouts_jump",
      subject: [],
      starts: true,
      text:
        `Payouts jump here instead of bending: ${list(moves)}. ` +
        `At exactly ${money(x)} the outcome from below still holds; the new one applies just above it.`,
    });
  }

  // X17: payouts that curve, either side.
  const curveBelow = below.answer.payout.curved;
  const curveAbove = above.answer.payout.curved;
  if (curveBelow || curveAbove) {
    const side = curveBelow && curveAbove ? "on both sides of" : curveBelow ? "just below" : "just above";
    reasons.push({
      code: "payouts_curve",
      subject: [],
      starts: curveAbove,
      text:
        `Payouts curve ${side} this exit value instead of following straight lines. The carve-out shares the most senior tier ` +
        "pro rata by claim while that tier isn't paid in full, and its claim grows with the exit value. On a curve, a breakpoint is where the formula changes.",
    });
  }

  if (reasons.length === 0) reasons.push({ code: "other", subject: [], starts: true, text: "Payout slopes change here." });
  return reasons;
}

/** Who shares the residual, by class: common, exercised options and warrants for common, participating or converted preferred (SPEC), and SAFEs and notes converting. */
function sharers(pc: PreparedCapTable, d: { converted: ReadonlySet<string>; exercised: ReadonlySet<string> }): string[] {
  const safes = [...pc.safes.keys(), ...pc.notes.keys()].filter((id) => d.converted.has(id));
  return pc.capTable.securities
    .filter((s) => {
      if (pc.shares.get(s.id)!.isZero()) return false;
      if (s.kind === "common") return true;
      if (s.kind === "option") return d.exercised.has(s.id);
      // A warrant for a series shares as part of that series, which is named instead.
      if (s.kind === "warrant") return s.underlying === "common" && d.exercised.has(s.id);
      return d.converted.has(s.id) || s.participation !== "non_participating";
    })
    .map((s) => s.id)
    .concat(safes);
}
