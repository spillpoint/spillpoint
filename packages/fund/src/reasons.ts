// Why a breakpoint is where it is (F15): each reason's code, its fields (FC5),
// and how FC6 writes the amounts, rates and multiples its words carry. The codes
// and the words themselves are in stable-names.ts.

import type { D } from "./decimal.ts";
import { toCents } from "./decimal.ts";
import type { ClawbackChange, ReasonCode, TierReasonCode } from "./stable-names.ts";

/**
 * Every reason's `class` (F27, from 0.3.0) is the account whose tier or clawback it's about: its class's name, or null
 * for the fund's terms. Its amounts and rates are that account's own.
 */
export type Reason = { class: string | null } & (
  /** The account's LPs' paid-in capital to date. */
  | { code: "capital_returned"; amount: D; text: string }
  /** The pref rate, and all the account's pref accrued to D, paid or not (FA4). */
  | { code: "pref_met"; rate: D; amount: D; text: string }
  /** c, the account's first carry rate, that the GP now has of its profit. */
  | { code: "catch_up_done"; carry: D; text: string }
  /** The step the account's LPs reach: its multiple and rate. */
  | { code: "carry_step"; lpMultiple: D; rate: D; text: string }
  | { code: "clawback_cleared"; text: string }
  | { code: "clawback_starts"; text: string }
  /** `fundTotals` names the totals' tier that ended when that run is the cause; null when X's own tier is. */
  | { code: "clawback_changes"; change: ClawbackChange; fundTotals: TierReasonCode | null; text: string }
);

// Every code a Reason can have is on the stable list, and every code on it is a Reason's: the compiler checks both
// ways, so a new reason can't be added without the list, nor the list grow without a reason.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const codesAreStable: Same<Reason["code"], ReasonCode> = true;
void codesAreStable;

/** A number as FC1 writes it: "0.2", "3", or "a/b" for one whose decimal doesn't end (an "a/b" input). */
function plain(x: D): string {
  if (x.decimalPlaces() <= 20) return x.toString();
  const [n, d] = x.toFraction(1e15) as [D, D];
  return `${n.toString()}/${d.toString()}`;
}

/** FC6: dollars without cents when whole ("$10,890,000"), to the cent otherwise ("$4,004,383.56"). */
export function usd(amount: D): string {
  const [whole, cents] = toCents(amount).split(".") as [string, string];
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return cents === "00" ? `$${grouped}` : `$${grouped}.${cents}`;
}

/** FC6: a rate as a percent: "8%", "7.5%". */
export function percent(rate: D): string {
  return `${plain(rate.times(100))}%`;
}

/** FC6: an LP multiple to at least one place: "3.0x", "2.25x". */
export function multiple(m: D): string {
  const s = plain(m);
  return s.includes("/") || s.includes(".") ? `${s}x` : `${s}.0x`;
}
