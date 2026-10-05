// Plain-English reasons for a breakpoint (SPEC, Breakpoints). Each reason
// compares the answer just below the breakpoint with the answer just above,
// and explains one change: a tier paid in full, a cap reached, options coming
// into the money, a series or a group converting, or payouts jumping.

import type Decimal from "decimal.js";

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

export function money(amount: Decimal): string {
  const [whole, cents] = amount.toDecimalPlaces(2, 4).toFixed(2).split(".") as [string, string];
  return `$${grouped(whole)}.${cents}`;
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

// ---------- reasons ----------

export function describeChange(pc: PreparedCapTable, x: Decimal, below: Snapshot, above: Snapshot, jumps: boolean): Reason[] {
  const { capTable } = pc;
  const name = new Map<string, string>([
    ...capTable.holders.map((h) => [h.id, h.name] as [string, string]),
    ...capTable.securities.map((s) => [s.id, s.name] as [string, string]),
  ]);
  const before = below.answer.decisions;
  const after = above.answer.decisions;
  // Both answers paid out at the breakpoint itself, for the numbers in the text.
  const atBefore = payout(pc, x, before);
  const atAfter = payout(pc, x, after);
  const reasons: Reason[] = [];

  // Options coming into (or out of) the money.
  for (const o of pc.options.values()) {
    const was = before.exercised.has(o.id);
    const is = after.exercised.has(o.id);
    if (was === is) continue;
    const n = shares(pc.shares.get(o.id)!);
    reasons.push({
      code: "option_in_the_money",
      subject: [o.id],
      starts: is,
      text: is
        ? `A common share is worth ${perShare(o.strike)} here, the strike on the ${n} ${name.get(o.id)}. Above this exit value they're worth ` +
          "exercising: their holders pay the strike, which joins the proceeds, and share in what's left as common."
        : `A common share falls back to ${perShare(o.strike)}, the strike on the ${n} ${name.get(o.id)}; above this exit value they're no longer worth exercising.`,
    });
  }

  // A conversion group converting or staying (E11, E17).
  const group = capTable.conversionGroups[0];
  const members = new Set(group?.series ?? []);
  if (group && group.series.some((sid) => before.converted.has(sid) !== after.converted.has(sid))) {
    const converts = after.converted.has(group.series[0]!);
    const names = list(group.series.map((sid) => name.get(sid)!));
    const rule = `${group.voteRule === "at_least" ? "at least" : "more than"} ${group.voteThreshold.times(100).toString()}%`;
    let text = `${names} must convert together, by a vote of ${rule} of their as-converted shares, and each holder votes for conversion only if it does strictly better converting (E11). `;
    if (converts) {
      const weight = new Map<string, Decimal>();
      for (const p of capTable.positions) {
        if (!members.has(p.security)) continue;
        weight.set(p.holder, (weight.get(p.holder) ?? ZERO).plus(p.shares.times(pc.preferred.get(p.security)!.conversionRatio)));
      }
      const total = [...weight.values()].reduce((s, w) => s.plus(w), ZERO);
      const yes = [...weight.keys()].filter((h) => moreThan(above.margins.get(`vote:${h}`) ?? ZERO, ZERO));
      const share = yes.reduce((s, h) => s.plus(weight.get(h)!), ZERO).div(total).times(100);
      text +=
        `Just above this exit value, ${list(yes.map((h) => name.get(h)!))} ${yes.length === 1 ? "does" : "do"} better converting, ` +
        `holding ${share.toDecimalPlaces(2, 4).toString()}% of the group's shares. That carries the vote, so the group converts.`;
    } else {
      text += "Just above this exit value the vote no longer carries, so the group stays preferred.";
    }
    reasons.push({ code: "series_converts", subject: [...group.series], starts: converts, text });
  }

  // A series deciding for itself.
  for (const s of pc.preferred.values()) {
    if (members.has(s.id) || before.converted.has(s.id) === after.converted.has(s.id)) continue;
    const converts = after.converted.has(s.id);
    let text: string;
    if (converts) {
      const asConverted = pc.asConverted.get(s.id)!;
      const keep =
        s.participation === "participating_capped"
          ? `its capped total of ${money(pc.capTotal.get(s.id)!)} (${multiple(s.capMultiple!)} its original issue price)`
          : `its ${multiple(s.preferenceMultiple)} preference of ${money(pc.preference.get(s.id)!)}`;
      text =
        `${s.name} converts to common here. Its ${shares(asConverted)} as-converted shares are worth ` +
        `${money(atAfter.bySecurity.get(s.id)!)} at ${perShare(atAfter.commonPrice)} each, the same as ${keep}. ` +
        "Below this exit value keeping its preference pays more; above it, converting does.";
    } else {
      text = `${s.name} stops converting here: above this exit value keeping its preference pays more.`;
    }
    reasons.push({ code: "series_converts", subject: [s.id], starts: converts, text });
  }

  // Preference tiers paid in full.
  const fullBefore = new Map(atBefore.tiers.map((t) => [t.index, t]));
  const fullAfter = new Map(atAfter.tiers.map((t) => [t.index, t]));
  for (const [index, tier] of capTable.seniority.entries()) {
    const b = below.answer.payout.tiers.find((t) => t.index === index);
    const a = above.answer.payout.tiers.find((t) => t.index === index);
    if (!(b && !b.full && a && a.full)) continue;
    const claimants = (fullAfter.get(index) ?? fullBefore.get(index))!.series;
    const claim = (fullAfter.get(index) ?? fullBefore.get(index))!.claim;
    const names = claimants.map((sid) => name.get(sid)!);
    const next = above.answer.payout.tiers.find((t) => t.index > index && !t.full);
    const nextNames = next ? next.series.map((sid) => name.get(sid)!) : [];
    const nextText = !next
      ? "the shareholders sharing what's left as common"
      : nextNames.length === 1
        ? `${nextNames[0]}'s preference`
        : `the preferences of ${list(nextNames)}`;
    const whose = names.length === 1 ? `${names[0]}'s preference is` : `The preferences of ${list(names)} are`;
    reasons.push({
      code: "tier_fully_paid",
      subject: [...tier],
      starts: true,
      text: `${whose} paid in full here: ${money(claim)}. Above this exit value, the next dollar goes to ${nextText}.`,
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
        `${multiple(s.capMultiple!)} its original issue price, ${money(pc.capTotal.get(sid)!)}. ` +
        "Above this exit value its payout stays flat until converting pays more.",
    });
  }

  if (jumps) {
    reasons.push({
      code: "payouts_jump",
      subject: [],
      starts: true,
      text:
        "Some payouts jump here instead of bending, because the group's decision changes all at once. " +
        "At exactly this exit value the outcome from below still holds; the new one applies just above it (E13).",
    });
  }

  if (reasons.length === 0) reasons.push({ code: "other", subject: [], starts: true, text: "Payout slopes change here." });
  return reasons;
}
