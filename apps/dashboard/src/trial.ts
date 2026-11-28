// The SAFEs tab's trial round (11c; notes/plan-2.0.md, section 3): the next priced round as the founder gives it, on
// the cap table the payouts use, never saved. It's built as "Add a round" starts one (R31) and the engine works it out,
// at a price per share the founder gives (R32) or from a pre-money valuation (R3). For each SAFE and note it converts,
// this says what its terms give at that price: its cap price and its discount price, which one applies, its shares,
// its share of the company after the round, the series it converts into, and that series' preference on them; and, where
// it's exact, the price at which its cap takes over from its discount (R33).
//
// The engine gives each conversion's price, shares and series. Its cap price beside its discount price, which the
// engine compares but reports only for the one that applies, is worked out here from the round's details, by the rule
// each kind of convertible follows (R4, R23, R24); a test holds every one to the engine's price wherever it applies.

import { D, parseExact } from "spillpoint";
import type { CapTable, CapTableAfterEvent, NoteConversion, PreferredSeries, RoundDetails, SafeConversion } from "spillpoint";

import type { Draft } from "./draft.ts";
import { fromRounds } from "./rounds.ts";
import type { Rounds } from "./rounds.ts";
import { addEvent, buildRounds, draftFromRounds, startingRounds } from "./roundsDraft.ts";
import type { Origin, RoundsDraft } from "./roundsDraft.ts";
import { seniorityFor } from "./RoundsEditor.tsx";

type Decimal = D;
type Json = Record<string, unknown>;

/** What the founder gives for the trial round, as typed. */
export interface TrialTerms {
  /** Whether the round is given by its price per share (R32) or its pre-money valuation. */
  by: "price" | "pre_money";
  price: string;
  preMoney: string;
  amount: string;
  /** The unissued pool's target share of the company after the round, as a percentage; blank for none. */
  poolTarget: string;
  /** The round's date, which notes accrue interest to (R23). */
  date: string;
  /** Where the new series ranks: senior to every earlier series, or alongside the most senior (as "Add a round" starts). */
  rank: "senior" | "alongside";
}

/** The cap table a trial starts from: the rounds that lead to it, the table itself, and the range the payouts use. */
export interface TrialBase {
  rounds: RoundsDraft;
  capTable: CapTable;
  range: [string, string];
}

/** The holder the trial's new money comes from, added for the trial only. */
export const TRIAL_INVESTOR = "New investors";

/**
 * The table a trial starts from, the one the payouts use. A company built from rounds: its rounds as last built, up to
 * the event the payouts follow. A cap table entered directly or imported: that table, starting a company's rounds as
 * "Add a round" makes it (R31), with an import's date and issue order. Or why it can't start one.
 */
export function trialBase(draft: Draft, origin: Origin | null, rounds: Rounds | null): { ok: true; base: TrialBase } | { ok: false; message: string } {
  let d: RoundsDraft;
  if (rounds) {
    const all = draftFromRounds(rounds);
    const upTo = all.events.findIndex((e) => String(e.json.id) === rounds.after);
    d = { ...all, events: all.events.slice(0, upTo + 1) };
  } else d = startingRounds(draft, origin);
  const built = fromRounds(buildRounds(d), draft.range);
  if (!built.ok) return { ok: false, message: built.message };
  return { ok: true, base: { rounds: d, capTable: built.tables.at(-1)!.capTable, range: draft.range } };
}

/** The SAFEs and notes outstanding on a table: what a round would convert. */
export const outstanding = (t: CapTable) => ({ safes: t.unconvertedSafes ?? [], notes: t.unconvertedNotes ?? [] });

/** A price per share as typed: "$1.50", "1.082112", or a fraction "3/2" (C1). Null if it isn't one above zero. */
export function parsePrice(text: string): string | null {
  const typed = text.trim().replace(/^\$\s*/, "").replace(/,/g, "");
  if (!/^(\d+(\.\d+)?|\.\d+|\d+\/\d+)$/.test(typed)) return null;
  // ".5" as the engine reads numbers: "0.5" (C1).
  const t = typed.startsWith(".") ? `0${typed}` : typed;
  try {
    return parseExact(t, "price").gt(0) ? t : null;
  } catch {
    return null;
  }
}

/** An amount as typed, as the editors read one ("$8,000,000", "8M"): its exact text, or null if it isn't above zero. */
function parseAmount(text: string): string | null {
  const m = /^\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?|\.[0-9]+)\s*([kKmMbB]?)\s*$/.exec(text);
  if (!m) return null;
  const scale = { "": "1", k: "1e3", m: "1e6", b: "1e9" }[m[2]!.toLowerCase() as "" | "k" | "m" | "b"];
  const n = new D(m[1]!.replace(/,/g, "")).times(scale);
  return n.gt(0) ? n.toFixed() : null;
}

export type TrialField = "price" | "preMoney" | "amount" | "poolTarget" | "date";

export type Trial =
  | { ok: true; rounds: Rounds; tables: CapTableAfterEvent[]; round: RoundDetails; event: Json; draft: Draft }
  | { ok: false; field: TrialField | null; message: string };

/**
 * The trial round on its base: a priced round as "Add a round" starts one (1x non-participating, broad-based
 * anti-dilution, converting every SAFE and note still outstanding), its new money from one holder added for it, at
 * the founder's price or pre-money, amount, pool target, date and ranking. The engine builds it; nothing is saved.
 */
export function runTrial(base: TrialBase, terms: TrialTerms): Trial {
  const price = terms.by === "price" ? parsePrice(terms.price) : null;
  if (terms.by === "price" && !price) return { ok: false, field: "price", message: "Give the round's price per share, more than zero." };
  const preMoney = terms.by === "pre_money" ? parseAmount(terms.preMoney) : null;
  if (terms.by === "pre_money" && !preMoney) return { ok: false, field: "preMoney", message: "Give the round's pre-money valuation, more than zero." };
  const amount = parseAmount(terms.amount);
  if (!amount) return { ok: false, field: "amount", message: "Give the amount the round raises, more than zero." };
  const target = terms.poolTarget.trim().replace(/\s*%$/, "");
  if (target !== "" && !(/^\d+(\.\d+)?$/.test(target) && new D(target).lt(100))) {
    return { ok: false, field: "poolTarget", message: "Give the pool's target as a percentage below 100, or leave it blank." };
  }
  const notes = outstanding(base.capTable).notes.length > 0;
  if (notes && !/^\d{4}-\d{2}-\d{2}$/.test(terms.date)) {
    return { ok: false, field: "date", message: "Give the round's date: the notes accrue interest up to it." };
  }

  // The new money's holder, for the trial only; the editor gives it an id no holder has.
  const investor = `r${base.rounds.nextKey}`;
  const withInvestor: RoundsDraft = {
    ...base.rounds,
    holders: [...base.rounds.holders, { key: investor, fileId: null, name: TRIAL_INVESTOR }],
    nextKey: base.rounds.nextKey + 1,
  };
  const added = addEvent(withInvestor, "priced_round", base.capTable);
  const last = added.events.at(-1)!;
  const { pre_money: _pre, ...rest } = last.json;
  const series = String((rest.series as Json).id);
  const event: Json = {
    ...rest,
    ...(price ? { price_per_share: price } : { pre_money: preMoney }),
    date: notes ? terms.date : "",
    investments: [{ holder: investor, amount }],
    pool_target_unissued_percent_post: target,
    seniority: seniorityFor(terms.rank, series, base.capTable.seniority),
  };
  const trial: RoundsDraft = { ...added, events: [...added.events.slice(0, -1), { ...last, json: event }] };
  const rounds = buildRounds(trial);
  const built = fromRounds(rounds, base.range);
  if (!built.ok) return { ok: false, field: null, message: built.message };
  const after = built.tables.at(-1)!;
  if (after.details.kind !== "priced_round") throw new Error("the trial is a priced round");
  return { ok: true, rounds, tables: built.tables, round: after.details, event: rounds.events.at(-1)!, draft: built.draft };
}

// ---------- what each SAFE and note's terms give ----------

/** One SAFE's or note's conversion in a round, with both its prices. */
export interface ConversionRow {
  kind: "safe" | "note";
  id: string;
  holder: string;
  /** What converts: a SAFE's purchase amount, or a note's principal and interest to the round's date. */
  amount: Decimal;
  principal: Decimal | null;
  interest: Decimal | null;
  cap: { amount: Decimal; kind: "post_money" | "pre_money" } | null;
  discount: Decimal;
  /**
   * Its cap price at this round, and what it divides by, by the rule its kind follows: a post-money SAFE's cap ÷ the
   * round's Company Capitalization (R4); a pre-money SAFE's ÷ the stock and options outstanding and the pool with this
   * round's increase (R24); a note's ÷ the share count just before the round, its conversion base (R23). Null without a cap.
   */
  capPrice: Decimal | null;
  capBase: { shares: Decimal; rule: "R4" | "R23" | "R24"; noteBase: NoteConversion["conversionBase"] | null } | null;
  /** The round's price less its discount. */
  discountPrice: Decimal;
  method: "cap" | "discount";
  conversionPrice: Decimal;
  shares: Decimal;
  /** Its shares ÷ the fully diluted shares after the round, as issued (R2's count). */
  shareAfter: Decimal;
  series: string;
  /** Its series' liquidation preference on these shares: shares × that series' issue price × its multiple. */
  preference: Decimal;
  multiple: Decimal;
  /**
   * R33: the price per share at or above which its cap, not its discount, sets its conversion price, where that's
   * exact: where its cap price is the same at any round price. Otherwise null, with why.
   */
  capTakesOver: Decimal | null;
  notExact: "no_cap" | "others_beside" | "pool_increase" | null;
}

/**
 * The conversions a round worked out, SAFEs first, each in the order the table before it lists them. `before` is the
 * table the round converts on, `target` the pool's target as a fraction (0 for none), `after` the table after the round.
 */
export function conversionRows(before: CapTable, target: Decimal, round: RoundDetails, after: CapTable): ConversionRow[] {
  const { safes, notes } = outstanding(before);
  const converting = [...round.safeConversions.map((c) => c.safe), ...round.noteConversions.map((c) => c.note)];
  const series = (id: string) => after.securities.find((s) => s.id === id) as PreferredSeries;
  const pool0 = before.unissuedPool;
  // R24: a pre-money SAFE's Company Capitalization counts the pool with this round's increase: its target share of the
  // post-money count the round is priced on, if the round tops it up (R16), else the pool as it was.
  const toppedUp = target.gt(0) && target.times(round.postMoneyFullyDilutedSolved).gt(pool0);
  const poolAfter = toppedUp ? target.times(round.postMoneyFullyDilutedSolved) : pool0;
  const outstandingBefore = round.preRoundFullyDiluted.minus(pool0);
  // R33: a post-money SAFE's Company Capitalization is the same at any price when nothing but post-money SAFEs converts
  // beside it: they count each other by purchase ÷ cap, never by price (R4). Notes and pre-money or uncapped SAFEs
  // converting beside it count at shares that can depend on the price (R24).
  const onlyPostMoney = safes.filter((f) => converting.includes(f.id)).every((f) => f.postMoneyCap !== null) && round.noteConversions.length === 0;

  const rows: ConversionRow[] = [];
  for (const c of round.safeConversions) {
    const f = safes.find((x) => x.id === c.safe)!;
    const s = series(c.series);
    let capPrice: Decimal | null = null;
    let capBase: ConversionRow["capBase"] = null;
    if (f.postMoneyCap) {
      capBase = { shares: round.companyCapitalization!, rule: "R4", noteBase: null };
      capPrice = f.postMoneyCap.div(capBase.shares);
    } else if (f.preMoneyCap) {
      capBase = { shares: c.companyCapitalization ?? outstandingBefore.plus(poolAfter), rule: "R24", noteBase: null };
      capPrice = f.preMoneyCap.div(capBase.shares);
    }
    const exact = f.postMoneyCap ? onlyPostMoney : f.preMoneyCap ? target.isZero() : false;
    rows.push({
      ...common(c, f.discount, round, s),
      kind: "safe", id: c.safe, holder: c.holder, amount: f.purchaseAmount, principal: null, interest: null,
      cap: f.postMoneyCap ? { amount: f.postMoneyCap, kind: "post_money" } : f.preMoneyCap ? { amount: f.preMoneyCap, kind: "pre_money" } : null,
      capPrice, capBase,
      capTakesOver: capPrice && exact ? capPrice.div(new D(1).minus(f.discount)) : null,
      notExact: !capPrice ? "no_cap" : exact ? null : f.postMoneyCap ? "others_beside" : "pool_increase",
    });
  }
  for (const c of round.noteConversions) {
    const n = notes.find((x) => x.id === c.note)!;
    const s = series(c.series);
    const capPrice = n.valuationCap ? n.valuationCap.div(c.baseShares) : null;
    rows.push({
      ...common(c, n.discount, round, s),
      kind: "note", id: c.note, holder: c.holder, amount: c.amountConverting, principal: c.principal, interest: c.interest,
      cap: n.valuationCap ? { amount: n.valuationCap, kind: "pre_money" } : null,
      capPrice,
      capBase: n.valuationCap ? { shares: c.baseShares, rule: "R23", noteBase: c.conversionBase } : null,
      // R23: a note's base is the share count just before the round, which no price changes.
      capTakesOver: capPrice ? capPrice.div(new D(1).minus(n.discount)) : null,
      notExact: capPrice ? null : "no_cap",
    });
  }
  return rows;

  function common(c: SafeConversion | NoteConversion, discount: Decimal, d: RoundDetails, s: PreferredSeries) {
    return {
      discount,
      discountPrice: d.price.times(new D(1).minus(discount)),
      method: c.method,
      conversionPrice: c.conversionPrice,
      shares: c.shares,
      shareAfter: c.shares.div(d.postMoneyFullyDilutedActual),
      series: c.series,
      preference: c.shares.times(s.originalIssuePrice).times(s.preferenceMultiple),
      multiple: s.preferenceMultiple,
    };
  }
}
