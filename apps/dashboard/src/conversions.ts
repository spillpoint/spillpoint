// What a priced round's SAFEs and notes convert into, and why (11c, 11c2; ASSUMPTIONS R33, P3). For each one a round
// converts: its cap price beside its discount price, which applies, a note's interest to the round's date, its shares
// and its share of the company after the round, the series it converts into and that series' preference on them, and,
// where it's exact, the price at which its cap takes over from its discount. The Rounds tab says these under each
// conversion in the round's summary, whether the round is one the company had or one a founder is modeling.
//
// The engine gives each conversion's price, shares and series. Its cap price beside its discount price, which the
// engine compares but reports only for the one that applies, is worked out here from the round's details, by the rule
// each kind of convertible follows (R4, R23, R24); a test holds every one to the engine's price wherever it applies.
// The words say what each one's terms give at the round's price, by spillpoint's reading of them, naming each rule in
// plain words; never whether the round is a good one.

import { D } from "spillpoint";
import type { CapTable, NoteConversion, PreferredSeries, RoundDetails, SafeConversion } from "spillpoint";

import { dateText, dollars, dollarsAndCents, halfUp, sharePrice } from "./format.ts";

type Decimal = D;

/** The SAFEs and notes outstanding on a table: what a round would convert. */
export const outstanding = (t: CapTable) => ({ safes: t.unconvertedSafes ?? [], notes: t.unconvertedNotes ?? [] });

const NUMBERS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/**
 * What's outstanding on a table, in words, for the lines that point to the Rounds tab (11c2): "Two SAFEs and a
 * convertible note", and "its two SAFEs and its convertible note"; whether that's more than one. Null for none.
 */
export function outstandingWords(t: CapTable): { what: string; its: string; many: boolean } | null {
  const { safes, notes } = outstanding(t);
  if (safes.length + notes.length === 0) return null;
  const counted = (n: number, one: string, many: string, its: boolean) =>
    n === 0 ? null : n === 1 ? `${its ? "its" : "a"} ${one}` : `${its ? "its " : ""}${NUMBERS[n] ?? String(n)} ${many}`;
  const both = (its: boolean) =>
    [counted(safes.length, "SAFE", "SAFEs", its), counted(notes.length, "convertible note", "convertible notes", its)].filter((x) => x !== null).join(" and ");
  const what = both(false);
  return { what: what.charAt(0).toUpperCase() + what.slice(1), its: both(true), many: safes.length + notes.length > 1 };
}

/** One SAFE's or note's conversion in a round, with both its prices. */
export interface ConversionRow {
  kind: "safe" | "note";
  id: string;
  holder: string;
  /** What converts: a SAFE's purchase amount, or a note's principal and interest to the round's date. */
  amount: Decimal;
  principal: Decimal | null;
  interest: Decimal | null;
  /** A note's simple interest rate a year, as a fraction, and the date it runs from (R23); null for a SAFE. */
  interestRate: Decimal | null;
  issueDate: string | null;
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
 * The conversions a round worked out, SAFEs first, each in the order the engine converted them. `before` is the
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
      kind: "safe", id: c.safe, holder: c.holder, amount: f.purchaseAmount, principal: null, interest: null, interestRate: null, issueDate: null,
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
      interestRate: n.interestRate, issueDate: n.issueDate,
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

// ---------- what the Rounds tab says of each ----------

const count = (n: Decimal) => halfUp(n, 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** A share count to two places where it has a fraction, as a Company Capitalization can: "11,666,666.67". */
const shareCount = (n: Decimal) => {
  const [whole, part] = halfUp(n, 2).toFixed(2).split(".") as [string, string];
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${part === "00" ? "" : `.${part}`}`;
};
/** A holding's share of the company, to two places: small holdings would read alike at one. */
const percentOf = (fraction: Decimal) => `${halfUp(fraction.times(100), 2).toFixed(2)}%`;
/** A rate as written in the terms: "20%", "6.5%". */
const rate = (fraction: Decimal) => `${halfUp(fraction.times(100), 4).toFixed()}%`;

/**
 * The lines under a SAFE's or note's conversion in a round's summary: what its terms give at the round's price, by
 * spillpoint's reading, each rule named in words. `series` is the name of the series it converts into, and `roundDate`
 * the round's date, which a note's interest runs to (R23).
 */
export function conversionLines(r: ConversionRow, price: Decimal, roundDate: string | null, series: string): string[] {
  const discount = r.discount.isZero() ? null : rate(r.discount);
  const lines: string[] = [];
  if (r.capPrice && r.capBase && r.cap) {
    lines.push(capLine(r, r.capPrice, r.capBase, r.cap));
    lines.push(
      discount
        ? `Its discount price is ${sharePrice(r.discountPrice)}: the round's ${sharePrice(price)} less its ${discount} discount.`
        : `It has no discount, so its discount price is the round's own, ${sharePrice(price)}.`,
    );
    // The engine converts it at the lower of the two, its cap price on a tie (R4, R23, R24).
    lines.push("It converts at the lower of the two, the cap price on a tie.");
  } else {
    lines.push(
      discount
        ? `It has no cap, so it converts at its discount price, ${sharePrice(r.discountPrice)}: the round's ${sharePrice(price)} less its ${discount} discount.`
        : `It has no cap and no discount, so it converts at the round's own price, ${sharePrice(price)}.`,
    );
  }
  // R23: simple interest, Actual/365, from the note's issue date to the round's date.
  if (r.kind === "note") {
    lines.push(
      r.interestRate!.isZero()
        ? "It carries no interest, so its principal is what converts."
        : `Its ${dollarsAndCents(r.interest!)} of interest is ${rate(r.interestRate!)} a year, simple, from ${dateText(r.issueDate)} to the round's date, ${dateText(roundDate)}, each day counting as 1/365 of a year.`,
    );
  }
  lines.push(`Its ${count(r.shares)} shares, rounded down to whole shares, are ${percentOf(r.shareAfter)} of the company after the round, fully diluted.`);
  // R5, R28: the series it converts into takes the round's terms, with its own conversion price as its issue price.
  lines.push(
    `${series} has the round's terms, with its own ${sharePrice(r.conversionPrice)} as its issue price, so its preference on these shares is ` +
      `${dollarsAndCents(r.preference)}, ${halfUp(r.multiple, 4).toFixed()}x what they converted at.`,
  );
  const crossover = crossoverLine(r, price, discount);
  if (crossover) lines.push(crossover);
  return lines;
}

/** Its cap price, and what the cap divides by, as its kind counts it. */
function capLine(r: ConversionRow, capPrice: Decimal, base: NonNullable<ConversionRow["capBase"]>, cap: NonNullable<ConversionRow["cap"]>): string {
  const price = sharePrice(capPrice);
  const shares = shareCount(base.shares);
  if (base.rule === "R4") {
    return (
      `Its cap price is ${price}: its ${dollars(cap.amount)} cap ÷ the company capitalization just before the round, ${shares} shares. ` +
      "As the YC post-money SAFE counts it, that includes the SAFEs themselves and the pool before this round's increase, and leaves out the new money."
    );
  }
  if (base.rule === "R24") {
    return (
      `Its cap price is ${price}: its ${dollars(cap.amount)} cap ÷ the ${shares} shares and options outstanding with the pool after this round's increase. ` +
      "A pre-money SAFE counts them that way, leaving out every SAFE and note."
    );
  }
  const counted = { with_pool: "counting the unissued pool", without_pool: "not counting the unissued pool", common_only: "common stock only" }[base.noteBase!];
  return `Its cap price is ${price}: its ${dollars(cap.amount)} cap ÷ the ${shares} shares just before the round, ${counted}, as the note's terms count them.`;
}

/** R33: where its cap takes over, where that's exact; otherwise why there's no one price, and which sets it at this one. */
function crossoverLine(r: ConversionRow, price: Decimal, discount: string | null): string | null {
  if (r.notExact === "no_cap") return null;
  if (r.capTakesOver) {
    const below = discount ? "its discount does" : "it converts at the round's own price";
    return `At ${sharePrice(r.capTakesOver)} a share or more, its cap sets its price; below that, ${below}.`;
  }
  const why =
    r.notExact === "others_beside"
      ? "the company capitalization counts the notes and other SAFEs converting beside it, whose shares can depend on the price"
      : "it counts the pool's increase, which grows with the round";
  const sets = r.method === "cap" ? "its cap sets its price" : discount ? "its discount sets its price" : "it converts at the round's own price";
  return `Its cap price can move with the round's price here: ${why}. So there's no one price where its cap takes over. At ${sharePrice(price)}, ${sets}.`;
}
