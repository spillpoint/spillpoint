// Plain-English reasons for a breakpoint (SPEC, Breakpoints). Each reason
// compares the answer just below the breakpoint with the answer just above,
// and explains one change: a tier paid in full, a cap reached, options coming
// into the money, a series or a group converting, or payouts jumping.

import type { Decimal } from "decimal.js";

import { ZERO, moreThan } from "./decimal.ts";
import type { Snapshot } from "./decisions.ts";
import { payout } from "./waterfall.ts";
import type { PreparedCapTable } from "./waterfall.ts";

export type ReasonCode =
  | "tier_fully_paid"
  | "cap_reached"
  | "option_in_the_money"
  | "series_converts"
  | "payouts_jump"
  | "other";

export interface Reason {
  code: ReasonCode;
  /** The securities it concerns: a tier's series, a series or a group's series, an option class. */
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

// The wording is for founders: no assumption codes in the text (they stay in
// the structured fields and in the code comments), and money in plain dollars.

export function describeChange(pc: PreparedCapTable, x: Decimal, below: Snapshot, above: Snapshot, jumps: boolean): Reason[] {
  const { capTable } = pc;
  const name = new Map<string, string>([
    ...capTable.holders.map((h) => [h.id, h.name] as [string, string]),
    ...capTable.securities.map((s) => [s.id, s.name] as [string, string]),
  ]);
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
      const keep =
        s.participation === "participating_capped"
          ? `its capped total of ${money(pc.capTotal.get(s.id)!)} (${multiple(s.capMultiple!)} its investment)`
          : `its ${multiple(s.preferenceMultiple)} preference of ${money(pc.preference.get(s.id)!)}`;
      text =
        `${s.name} converts to common here. Its ${shares(pc.asConverted.get(s.id)!)} as-converted shares are worth ` +
        `${money(atAfter.bySecurity.get(s.id)!)} at ${perShare(atAfter.commonPrice)} each, the same as ${keep}. ` +
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
    const names = paid.series.map((sid) => name.get(sid)!);
    const next = above.answer.payout.tiers.find((t) => t.index > index && !t.full);
    let nextText: string;
    if (next) {
      const nextNames = next.series.map((sid) => name.get(sid)!);
      nextText = `goes to ${nextNames.length === 1 ? `${nextNames[0]}'s preference` : `the preferences of ${list(nextNames)}`}`;
    } else {
      nextText = `is shared as common by ${list(sharers(pc, after).map((id) => name.get(id)!))}`;
    }
    const whose = names.length === 1 ? `${names[0]}'s preference is` : `The preferences of ${list(names)} are`;
    reasons.push({
      code: "tier_fully_paid",
      subject: [...tier],
      starts: true,
      text: `${whose} paid in full here: ${money(paid.claim)}. Above this exit value, the next dollar ${nextText}.`,
    });
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
        `${multiple(s.capMultiple!)} its investment, ${money(pc.capTotal.get(sid)!)}. ` +
        "Above this exit value its payout stays flat until converting pays more.",
    });
  }

  // E13: payouts that jump. Say what each class gets either side.
  if (jumps) {
    const moves: string[] = [];
    for (const [sid, was] of atBefore.classTotals) {
      const is = atAfter.classTotals.get(sid)!;
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

  if (reasons.length === 0) reasons.push({ code: "other", subject: [], starts: true, text: "Payout slopes change here." });
  return reasons;
}

/** Who shares the residual, by class: common, exercised options, and participating or converted preferred (SPEC). */
function sharers(pc: PreparedCapTable, d: { converted: ReadonlySet<string>; exercised: ReadonlySet<string> }): string[] {
  return pc.capTable.securities
    .filter((s) => {
      if (pc.shares.get(s.id)!.isZero()) return false;
      if (s.kind === "common") return true;
      if (s.kind === "option") return d.exercised.has(s.id);
      return d.converted.has(s.id) || s.participation !== "non_participating";
    })
    .map((s) => s.id);
}
