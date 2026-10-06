// Building a company's cap tables from its rounds (M4): shares issued, a
// percentage issue, the option pool, grants, SAFEs and notes as they're
// issued, and priced rounds. Each event yields the cap table after it, in the
// same model an exit runs on.
//
// A priced round works out its price, new shares and pool top-up (M4c), the
// SAFEs it converts and its pro-rata entitlements (M4d), the anti-dilution
// adjustment it triggers (M4e), who converts under pay-to-play (M4f), and the
// notes it converts (M4g). A combination no case settles yet is refused,
// never skipped: a round priced without it would look right and be wrong.
//
// The reference calculator solves a round by trying every branch (topped up
// or not, cap or discount, anti-dilution triggered or not) and keeping the one
// that is consistent. The engine decides each branch by its own rule and
// solves once, in closed form.

import type { Decimal } from "decimal.js";

import { D, ONE, ZERO } from "./decimal.ts";
import { InputError, NoAnswerError, UnsupportedTermError } from "./errors.ts";
import { array, notNegative, object, onlyKnownFields, positive, readSecurity, text, wholeShares } from "./input.ts";
import type { CapTable, Holder, Position, PreferredSeries, Security } from "./model.ts";

type Json = Record<string, unknown>;

/** A SAFE, outstanding until a round converts it: post-money (R4) or pre-money (R24), never both. */
export interface Safe {
  id: string;
  holder: string;
  purchaseAmount: Decimal;
  postMoneyCap: Decimal | null;
  preMoneyCap: Decimal | null;
  discount: Decimal;
}

/** A convertible note, outstanding until a round converts it (R23) or the company is sold (C9, C14). */
export interface Note {
  id: string;
  holder: string;
  principal: Decimal;
  interestRate: Decimal;
  interestMethod: "simple";
  issueDate: string;
  valuationCap: Decimal | null;
  capType: "pre_money";
  conversionBase: "with_pool" | "without_pool" | "common_only";
  discount: Decimal;
  repaymentMultiple: Decimal;
}

/** A SAFE's conversion in a round (R4, R5, R24). */
export interface SafeConversion {
  safe: string;
  holder: string;
  /** Whether it converted at its cap price or its discount price. */
  method: "cap" | "discount";
  /** For a pre-money SAFE at its cap: its Company Capitalization, with this round's pool increase (R24). */
  companyCapitalization: Decimal | null;
  conversionPrice: Decimal;
  shares: Decimal;
  /** The series it converted into, "… (from SAFEs)". */
  series: string;
}

/** A note's conversion in a round (R23). */
export interface NoteConversion {
  note: string;
  holder: string;
  principal: Decimal;
  /** Simple interest, Actual/365, from the issue date to the round's date. */
  interest: Decimal;
  amountConverting: Decimal;
  conversionBase: Note["conversionBase"];
  /** The share count its pre-money cap divides by, just before the round (X10's conversion_base). */
  baseShares: Decimal;
  /** Whether it converted at its cap price or its discount price. */
  method: "cap" | "discount";
  conversionPrice: Decimal;
  shares: Decimal;
  /** The series it converted into, "… (from notes)". */
  series: string;
}

/** A pro-rata investor's entitlement in a round (R6). */
export interface ProRata {
  holder: string;
  /** Its share of the pro-rata base, as a fraction. */
  preRoundShare: Decimal;
  /** The most it may buy as pro-rata. */
  entitlement: Decimal;
  /** What it marked as pro-rata, its pro-rata lines together. */
  amountInvested: Decimal;
}

/** A series' anti-dilution adjustment in a down round (R7–R10, R15). */
export interface AntiDilutionAdjustment {
  series: string;
  rule: "broad_based" | "narrow_based" | "full_ratchet";
  /** The conversion price before the round. */
  cp1: Decimal;
  /** The adjusted conversion price before R9's rounding, when the round rounds it; otherwise null. */
  cp2Unrounded: Decimal | null;
  /** The adjusted conversion price. A full ratchet's is the round's price. */
  cp2: Decimal;
  /** The weighted-average formula's A, B and C (null for a full ratchet, which has none but C). */
  a: Decimal | null;
  b: Decimal | null;
  c: Decimal;
  /** Original issue price ÷ CP2. */
  newConversionRatio: Decimal;
}

/** One holder's outcome in one series named by a pay-to-play (R18, R20). */
export interface PayToPlaySeries {
  series: string;
  shares: Decimal;
  /** What it keeps as preferred. */
  kept: Decimal;
  converted: Decimal;
  /** Common shares for what converted, at the series' ratio, rounded down (R3). */
  commonReceived: Decimal;
}

/** One holder of the series a pay-to-play names (R17, R20, R22). */
export interface PayToPlayHolder {
  holder: string;
  /** Its shares of the named series, as converted and combined. */
  asConvertedShares: Decimal;
  /** Its share of all the named series' shares, as a fraction. */
  share: Decimal;
  /** Its pro-rata of the amount offered: what it must buy to keep its preferred. */
  required: Decimal;
  /** Everything it invests in the round. */
  invested: Decimal;
  /** invested ÷ required, at most 1. */
  fractionBought: Decimal;
  participates: boolean;
  series: PayToPlaySeries[];
}

/** A round's pay-to-play (C11): its terms, and who keeps and who converts. */
export interface PayToPlay {
  series: string[];
  offeredAmount: Decimal;
  /** Common shares per preferred share, for each named series. */
  conversionRatios: { series: string; ratio: Decimal }[];
  partialParticipation: "convert_all" | "convert_proportionally";
  /** R19: whether the round is priced on the cap table after the conversion. */
  pricedAfterConversion: boolean;
  holders: PayToPlayHolder[];
}

/** What a priced round worked out. */
export interface RoundDetails {
  /** Exact in arithmetic; held to 40 significant digits (E14). */
  price: Decimal;
  postMoneyValuation: Decimal;
  preRoundFullyDiluted: Decimal;
  /** The post-money fully diluted shares the price is set on, with new shares and the pool as fractions (R3). */
  postMoneyFullyDilutedSolved: Decimal;
  /** The post-money SAFEs' Company Capitalization (R4), if any converted. */
  companyCapitalization: Decimal | null;
  safeConversions: SafeConversion[];
  noteConversions: NoteConversion[];
  proRata: ProRata[];
  /** Each series the round adjusts, in the order the cap table lists them. */
  antiDilution: AntiDilutionAdjustment[];
  /** The round's pay-to-play, if it has one. */
  payToPlay: PayToPlay | null;
  /** Each investor's new shares, one issuance per holder (R3). */
  newShares: { holder: string; shares: Decimal }[];
  poolTopUp: Decimal;
  /** The fully diluted shares after the round, as actually issued. */
  postMoneyFullyDilutedActual: Decimal;
}

export type EventDetails =
  | { kind: "issue" | "grant_options" | "safes" | "notes" }
  | { kind: "issue_percent"; sharesIssued: Decimal; basisShares: Decimal }
  | { kind: "create_pool"; poolCreated: Decimal; basisShares: Decimal }
  | ({ kind: "priced_round" } & RoundDetails);

export interface CapTableAfterEvent {
  /** The event's id. */
  event: string;
  date: string | null;
  capTable: CapTable;
  /** SAFEs issued and not yet converted. */
  unconvertedSafes: Safe[];
  /** Notes issued and not yet converted. */
  unconvertedNotes: Note[];
  details: EventDetails;
}

/**
 * A share count computed at 40 digits, rounded down (SPEC, Rounding). A count
 * that is whole in exact arithmetic can come out a hair under it (463,999.99…
 * for 464,000), so a count within 10^-20 of a whole number is that whole
 * number (E19). No real count sits that close to a whole number without
 * being one.
 */
const WHOLE_TIE = new D("1e-20");
export function roundDownShares(count: Decimal): Decimal {
  const nearest = count.toDecimalPlaces(0, D.ROUND_HALF_UP);
  return nearest.minus(count).abs().lt(WHOLE_TIE) ? nearest : count.floor();
}

/** The company as the events build it. */
class Company {
  readonly holders: Holder[];
  readonly securities: Security[] = [];
  readonly positions: Position[] = [];
  seniority: string[][] = [];
  unissuedPool: Decimal = ZERO;
  safes: Safe[] = [];
  notes: Note[] = [];

  constructor(holders: Holder[]) {
    this.holders = holders;
  }

  security(id: string): Security | undefined {
    return this.securities.find((s) => s.id === id);
  }

  /** A copy to try something on: its positions are its own; its securities are the same objects. */
  clone(): Company {
    const copy = new Company(this.holders);
    copy.securities.push(...this.securities);
    copy.positions.push(...this.positions.map((p) => ({ ...p })));
    copy.seniority = this.seniority.map((t) => [...t]);
    copy.unissuedPool = this.unissuedPool;
    copy.safes = [...this.safes];
    copy.notes = [...this.notes];
    return copy;
  }

  issue(holder: string, security: string, shares: Decimal, path: string): void {
    if (!this.holders.some((h) => h.id === holder)) throw new InputError(path, `unknown holder ${holder}`);
    if (shares.isZero()) return;
    const at = this.positions.find((p) => p.holder === holder && p.security === security);
    if (at) at.shares = at.shares.plus(shares);
    else this.positions.push({ holder, security, shares });
  }

  sharesOf(security: string): Decimal {
    return this.positions.filter((p) => p.security === security).reduce((sum, p) => sum.plus(p.shares), ZERO);
  }

  /** A security's shares as common: preferred at its conversion ratio, the rest one for one. */
  asConverted(s: Security): Decimal {
    const shares = this.sharesOf(s.id);
    return s.kind === "preferred" ? shares.times(s.conversionRatio) : shares;
  }

  /** Issued stock as converted and issued options: the fully diluted count without the unissued pool or SAFEs. */
  outstandingAsConverted(): Decimal {
    return this.securities.reduce((sum, s) => sum.plus(this.asConverted(s)), ZERO);
  }

  snapshot(): CapTable {
    return {
      holders: this.holders.map((h) => ({ ...h })),
      securities: this.securities.map((s) => ({ ...s })),
      seniority: this.seniority.map((t) => [...t]),
      conversionGroups: [],
      positions: this.positions.filter((p) => !p.shares.isZero()).map((p) => ({ ...p })),
      unissuedPool: this.unissuedPool,
    };
  }
}

// ---------- reading ----------

const INPUT_FIELDS = ["case", "description", "holders", "events", "exit"] as const;
const COMMON_EVENT_FIELDS = ["id", "date", "type"];
const EVENT_FIELDS: Record<string, readonly string[]> = {
  issue: ["security", "issues"],
  issue_percent: ["security", "holder", "percent"],
  safes: ["safes"],
  notes: ["notes"],
  create_pool: ["percent"],
  grant_options: ["grants"],
  priced_round: [
    "series", "pre_money", "investments", "pool_target_unissued_percent_post", "seniority", "convert_safes", "convert_notes",
    "pay_to_play", "anti_dilution_shares_in_post", "anti_dilution_include_unissued_pool_in_a", "anti_dilution_cp2_rounding",
    "pro_rata_base_includes_unissued_pool",
  ],
};

function bool(value: unknown, fallback: boolean, path: string): boolean {
  if (value == null) return fallback;
  if (typeof value !== "boolean") throw new InputError(path, "expected true or false");
  return value;
}

/** A percentage strictly between 0 and 100, as a fraction. */
function fraction(value: unknown, path: string, allowZero = false): Decimal {
  const p = notNegative(value, path);
  if ((!allowZero && p.isZero()) || p.gte(100)) throw new InputError(path, allowZero ? "must be at least 0 and below 100" : "must be above 0 and below 100");
  return p.div(100);
}

/** Adds the security an event names, or checks it against the one already there. */
function ensureSecurity(company: Company, value: unknown, path: string): Security {
  const s = readSecurity(value, path);
  const existing = company.security(s.id);
  if (existing) {
    if (existing.kind !== s.kind) throw new InputError(`${path}.kind`, `${s.id} is already a ${existing.kind} security`);
    return existing;
  }
  company.securities.push(s);
  return s;
}

function readSafe(value: unknown, path: string): Safe {
  const f = object(value, path);
  onlyKnownFields(f, ["id", "holder", "purchase_amount", "post_money_cap", "pre_money_cap", "discount"], path);
  const postMoneyCap = f.post_money_cap == null ? null : positive(f.post_money_cap, `${path}.post_money_cap`);
  const preMoneyCap = f.pre_money_cap == null ? null : positive(f.pre_money_cap, `${path}.pre_money_cap`);
  if (postMoneyCap && preMoneyCap) throw new InputError(path, "a SAFE has a post-money cap or a pre-money cap, not both (R24)");
  const discount = f.discount == null ? ZERO : notNegative(f.discount, `${path}.discount`);
  if (discount.gte(1)) throw new InputError(`${path}.discount`, "must be below 1");
  return { id: text(f.id, `${path}.id`), holder: text(f.holder, `${path}.holder`), purchaseAmount: positive(f.purchase_amount, `${path}.purchase_amount`), postMoneyCap, preMoneyCap, discount };
}

/** A date as YYYY-MM-DD, as a whole number of days, for Actual/365 interest (X3). */
function dayNumber(value: unknown, path: string): number {
  const date = text(value, path);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const ms = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  if (!m || Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date) throw new InputError(path, "expected a date as YYYY-MM-DD");
  return ms / 86_400_000;
}

const NOTE_FIELDS = [
  "id", "holder", "principal", "interest_rate", "interest_method", "issue_date", "valuation_cap", "cap_type", "conversion_base", "discount", "repayment_multiple",
] as const;
const CONVERSION_BASES = ["with_pool", "without_pool", "common_only"] as const;

function readNote(value: unknown, path: string): Note {
  const n = object(value, path);
  onlyKnownFields(n, NOTE_FIELDS, path);
  // R23: refused until a case covers them, never skipped.
  if ((n.interest_method ?? "simple") !== "simple") {
    throw new UnsupportedTermError("note_compounding_interest", "later", `${path}.interest_method`, "Notes with interest other than simple (R23)");
  }
  if ((n.cap_type ?? "pre_money") !== "pre_money") {
    throw new UnsupportedTermError("note_post_money_cap", "later", `${path}.cap_type`, "Notes with a post-money cap (R23)");
  }
  const base = (n.conversion_base ?? "with_pool") as Note["conversionBase"];
  if (!CONVERSION_BASES.includes(base)) throw new InputError(`${path}.conversion_base`, `must be one of ${CONVERSION_BASES.join(", ")}`);
  const issueDate = text(n.issue_date, `${path}.issue_date`);
  dayNumber(issueDate, `${path}.issue_date`);
  const discount = n.discount == null ? ZERO : notNegative(n.discount, `${path}.discount`);
  if (discount.gte(1)) throw new InputError(`${path}.discount`, "must be below 1");
  return {
    id: text(n.id, `${path}.id`),
    holder: text(n.holder, `${path}.holder`),
    principal: positive(n.principal, `${path}.principal`),
    interestRate: notNegative(n.interest_rate, `${path}.interest_rate`),
    interestMethod: "simple",
    issueDate,
    valuationCap: n.valuation_cap == null ? null : positive(n.valuation_cap, `${path}.valuation_cap`),
    capType: "pre_money",
    conversionBase: base,
    discount,
    repaymentMultiple: positive(n.repayment_multiple, `${path}.repayment_multiple`),
  };
}

/** SPEC, Tiers: every preferred series in exactly one tier, and nothing else in any. */
function readSeniority(company: Company, value: unknown, path: string): string[][] {
  const tiers = array(value, path).map((tier, i) => array(tier, `${path}[${i}]`).map((v, j) => text(v, `${path}[${i}][${j}]`)));
  const listed = tiers.flat();
  for (const id of listed) {
    if (company.security(id)?.kind !== "preferred") throw new InputError(path, `${id} is not a preferred series`);
  }
  for (const s of company.securities) {
    if (s.kind !== "preferred") continue;
    const count = listed.filter((id) => id === s.id).length;
    if (count !== 1) throw new InputError(path, `${s.id} must appear in exactly one tier (it appears ${count} times)`);
  }
  return tiers;
}

// ---------- the events ----------

function issueEvent(company: Company, ev: Json, path: string): EventDetails {
  const s = ensureSecurity(company, ev.security, `${path}.security`);
  array(ev.issues, `${path}.issues`).forEach((v, i) => {
    const p = object(v, `${path}.issues[${i}]`);
    onlyKnownFields(p, ["holder", "shares"], `${path}.issues[${i}]`);
    company.issue(text(p.holder, `${path}.issues[${i}].holder`), s.id, wholeShares(p.shares, `${path}.issues[${i}].shares`), `${path}.issues[${i}].holder`);
  });
  return { kind: "issue" };
}

/**
 * R1: enough shares that the holder owns the percentage of all issued stock
 * immediately after. x ÷ (N + x) = p, so x = p·N ÷ (1 − p), rounded down. N
 * counts issued stock as converted, not options, the pool or SAFEs.
 */
function issuePercentEvent(company: Company, ev: Json, path: string): EventDetails {
  const s = ensureSecurity(company, ev.security, `${path}.security`);
  const p = fraction(ev.percent, `${path}.percent`);
  const basis = company.securities.filter((x) => x.kind !== "option").reduce((sum, x) => sum.plus(company.asConverted(x)), ZERO);
  const shares = roundDownShares(p.times(basis).div(ONE.minus(p)));
  company.issue(text(ev.holder, `${path}.holder`), s.id, shares, `${path}.holder`);
  return { kind: "issue_percent", sharesIssued: shares, basisShares: basis };
}

/**
 * R2: a pool of the percentage of fully diluted shares after it's created:
 * issued stock as converted, issued options, and the pool. P ÷ (N + P) = p,
 * so P = p·N ÷ (1 − p), rounded down. SAFEs are left out.
 */
function createPoolEvent(company: Company, ev: Json, path: string): EventDetails {
  const p = fraction(ev.percent, `${path}.percent`);
  const basis = company.outstandingAsConverted();
  const size = roundDownShares(p.times(basis).div(ONE.minus(p)));
  company.unissuedPool = company.unissuedPool.plus(size);
  return { kind: "create_pool", poolCreated: size, basisShares: basis };
}

/** R14: grants come out of the unissued pool, one option class per strike. */
function grantOptionsEvent(company: Company, ev: Json, path: string): EventDetails {
  array(ev.grants, `${path}.grants`).forEach((v, i) => {
    const at = `${path}.grants[${i}]`;
    const g = object(v, at);
    onlyKnownFields(g, ["holder", "shares", "strike"], at);
    const strike = notNegative(g.strike, `${at}.strike`);
    const shares = wholeShares(g.shares, `${at}.shares`);
    const id = `options_${strike.toString()}`;
    ensureSecurity(company, { id, name: `Options ($${strike.toString()} strike)`, kind: "option", strike: strike.toString() }, at);
    if (shares.gt(company.unissuedPool)) {
      throw new InputError(`${at}.shares`, `a grant of ${shares.toString()} options is more than the ${company.unissuedPool.toString()} left in the unissued pool`);
    }
    company.unissuedPool = company.unissuedPool.minus(shares);
    company.issue(text(g.holder, `${at}.holder`), id, shares, `${at}.holder`);
  });
  return { kind: "grant_options" };
}

/** Two prices or amounts held to 40 digits that are the same in exact arithmetic: within one part in 10^30 (E14). */
function nearlyEqual(a: Decimal, b: Decimal): boolean {
  return a.minus(b).abs().lte(new D("1e-30").times(D.max(ONE, b.abs())));
}

/**
 * R9's toggle: the adjusted conversion price to the nearest step, half up,
 * as the NVCA model charter computes it to the nearest one-hundredth of a
 * cent. A price exactly halfway in exact arithmetic can be a hair either side
 * at 40 digits, so within one part in 10^30 of halfway counts as halfway.
 */
export function roundHalfUp(price: Decimal, step: Decimal): Decimal {
  const steps = price.div(step);
  const half = steps.floor().plus("0.5");
  return (nearlyEqual(steps, half) ? half : steps).toDecimalPlaces(0, D.ROUND_HALF_UP).times(step);
}

/** "$1,234,567.89", for messages. */
function usd(amount: Decimal): string {
  const [whole, cents] = amount.toFixed(2).split(".") as [string, string];
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
}

const PAY_TO_PLAY_FIELDS = ["series", "offered_amount", "conversion_ratio", "priced_after_conversion", "partial_participation"] as const;

/**
 * Pay-to-play (SPEC, Pay-to-play): the round offers one amount to the
 * holders of the series it names. A holder's pro-rata is its share of those
 * series' shares, as converted and combined, × that amount: one total
 * requirement per holder (R17, R22), not R6's share of the whole company. A
 * holder whose total investment in the round is at least that keeps its
 * preferred. One that invests less converts all its preferred of the named
 * series to common, or under the toggle only the fraction it didn't buy,
 * keeping floor(shares × fraction bought) of each series (R20). Each series
 * converts at its own ratio, common shares per preferred share, rounded down
 * (R18, R22), into the company's one common class.
 */
function planPayToPlay(company: Company, value: unknown, investments: { holder: string; amount: Decimal }[], path: string): PayToPlay {
  const terms = object(value, path);
  onlyKnownFields(terms, PAY_TO_PLAY_FIELDS, path);
  const listed = array(terms.series, `${path}.series`).map((v, i) => text(v, `${path}.series[${i}]`));
  if (listed.length === 0) throw new InputError(`${path}.series`, "name at least one series");
  listed.forEach((id, i) => {
    if (company.security(id)?.kind !== "preferred") throw new InputError(`${path}.series[${i}]`, `${id} is not an existing preferred series`);
    if (listed.indexOf(id) !== i) throw new InputError(`${path}.series[${i}]`, `${id} is listed twice`);
  });

  // One ratio for one series, or one per series (R22).
  const given = terms.conversion_ratio;
  let conversionRatios: PayToPlay["conversionRatios"];
  if (given != null && typeof given === "object" && !Array.isArray(given)) {
    const byId = given as Json;
    if (Object.keys(byId).length !== listed.length || !listed.every((id) => id in byId)) {
      throw new InputError(`${path}.conversion_ratio`, "give a ratio for each series the pay-to-play names, and only for those");
    }
    conversionRatios = listed.map((id) => ({ series: id, ratio: positive(byId[id], `${path}.conversion_ratio.${id}`) }));
  } else {
    if (listed.length !== 1) throw new InputError(`${path}.conversion_ratio`, "a pay-to-play on several series needs a ratio for each series (R22)");
    conversionRatios = [{ series: listed[0]!, ratio: positive(given, `${path}.conversion_ratio`) }];
  }
  const partial = terms.partial_participation ?? "convert_all";
  if (partial !== "convert_all" && partial !== "convert_proportionally") {
    throw new InputError(`${path}.partial_participation`, "must be convert_all or convert_proportionally");
  }
  if (company.securities.filter((s) => s.kind === "common").length !== 1) {
    throw new InputError(path, "pay-to-play converts preferred into the company's common stock, so it needs exactly one common class");
  }
  const offered = positive(terms.offered_amount, `${path}.offered_amount`);

  const invested = new Map<string, Decimal>();
  for (const inv of investments) invested.set(inv.holder, (invested.get(inv.holder) ?? ZERO).plus(inv.amount));
  // The holders in the order they first appear in the named series.
  const holderIds: string[] = [];
  for (const id of listed) {
    for (const p of company.positions) {
      if (p.security === id && !p.shares.isZero() && !holderIds.includes(p.holder)) holderIds.push(p.holder);
    }
  }
  const held = (holder: string, id: string) => company.positions.find((p) => p.holder === holder && p.security === id)?.shares ?? ZERO;
  const asConverted = new Map(holderIds.map((h) => [h, listed.reduce((sum, id) => sum.plus(held(h, id).times((company.security(id) as PreferredSeries).conversionRatio)), ZERO)]));
  const total = [...asConverted.values()].reduce((sum, n) => sum.plus(n), ZERO);

  const holders = holderIds.map((holder): PayToPlayHolder => {
    const share = asConverted.get(holder)!.div(total);
    const required = offered.times(share);
    const paid = invested.get(holder) ?? ZERO;
    // R22: it takes its pro-rata if it invests at least the requirement; equal in exact arithmetic counts (E14).
    const participates = paid.gte(required) || nearlyEqual(paid, required);
    const fractionBought = participates ? ONE : paid.div(required);
    const series = conversionRatios
      .filter(({ series: id }) => !held(holder, id).isZero())
      .map(({ series: id, ratio }): PayToPlaySeries => {
        const shares = held(holder, id);
        const kept = participates ? shares : partial === "convert_proportionally" ? roundDownShares(shares.times(fractionBought)) : ZERO;
        const converted = shares.minus(kept);
        return { series: id, shares, kept, converted, commonReceived: roundDownShares(converted.times(ratio)) };
      });
    return { holder, asConvertedShares: asConverted.get(holder)!, share, required, invested: paid, fractionBought, participates, series };
  });
  return {
    series: listed,
    offeredAmount: offered,
    conversionRatios,
    partialParticipation: partial,
    pricedAfterConversion: bool(terms.priced_after_conversion, true, `${path}.priced_after_conversion`),
    holders,
  };
}

/** R18: what each holder didn't keep becomes common, losing the preference and every other preferred right. */
function applyPayToPlay(company: Company, payToPlay: PayToPlay, path: string): void {
  const common = company.securities.find((s) => s.kind === "common")!;
  for (const h of payToPlay.holders) {
    for (const b of h.series) {
      if (b.converted.isZero()) continue;
      const at = company.positions.findIndex((p) => p.holder === h.holder && p.security === b.series);
      if (b.kept.isZero()) company.positions.splice(at, 1);
      else company.positions[at] = { ...company.positions[at]!, shares: b.kept };
      company.issue(h.holder, common.id, b.commonReceived, path);
    }
  }
}

/**
 * A priced round (SPEC, Rounds). Price = post-money valuation ÷ post-money
 * fully diluted shares, which count the stock and options outstanding, the
 * unissued pool at its target, the SAFEs converting, and the new shares. The
 * pool top-up and the SAFEs sit in the pre-money, so they dilute only the
 * existing holders.
 *
 * Each SAFE converts at the lower of its cap price and its discount price:
 * - a post-money SAFE's cap price is its cap ÷ Company Capitalization (R4):
 *   the stock and options outstanding and the pool as it stood before the
 *   round, with the post-money SAFEs counted inside it, so
 *   CC = (O + U) ÷ (1 − Σ purchase ÷ cap);
 * - a pre-money SAFE's is its cap ÷ the stock and options outstanding and
 *   the pool including this round's increase, with no SAFE or note (R24);
 * - the discount price is the round price × (1 − discount).
 *
 * A round priced below a series' conversion price adjusts it, by the
 * series' own rule (SPEC, Anti-dilution):
 * - weighted average: CP2 = CP1 × (A + B) ÷ (A + C). Broad-based A counts the
 *   stock and options outstanding as converted, before the round, and the
 *   unissued pool only under the toggle (R7); narrow-based A counts the
 *   preferred only (R15). B = what the new shares paid ÷ CP1, C = the new
 *   shares, both as actually issued (R8);
 * - full ratchet: CP2 = the round's price.
 * The adjustment shares count in the post-money fully diluted shares the
 * round is priced on, from the new shares as fractions (R10), unless the
 * round says otherwise; CP2 is exact unless the round rounds it (R9).
 *
 * The reference calculator tries every combination of those choices and of
 * the top-up and keeps the consistent one. The engine settles them by rule
 * instead: it solves the round for its current choices, re-decides each
 * SAFE by comparing its two prices at that solution, each series' adjustment
 * by whether the price is below its conversion price, and the top-up by R16
 * (judged without a top-up), until nothing changes. For fixed choices the
 * share count is a straight line in the post-money count x, so each solve is
 * one division.
 *
 * Under pay-to-play, who converts is settled first, from what each holder
 * invests. The conversion takes effect just before closing, so the round is
 * priced on the cap table after it, unless the round says before (R19).
 * Either way anti-dilution sees the table after it: holders who convert get
 * no adjustment, and A counts what remains (R21).
 */
function pricedRoundEvent(company: Company, ev: Json, path: string): EventDetails {
  const investments = array(ev.investments, `${path}.investments`).map((v, i) => {
    const at = `${path}.investments[${i}]`;
    const inv = object(v, at);
    onlyKnownFields(inv, ["holder", "amount", "pro_rata"], at);
    return { holder: text(inv.holder, `${at}.holder`), amount: positive(inv.amount, `${at}.amount`), proRata: bool(inv.pro_rata, false, `${at}.pro_rata`) };
  });

  const convertSafes = bool(ev.convert_safes, true, `${path}.convert_safes`);
  const convertNotes = bool(ev.convert_notes, false, `${path}.convert_notes`);
  const safes = convertSafes ? company.safes : [];
  const notes = convertNotes ? company.notes : [];
  const postSafes = safes.filter((f) => f.postMoneyCap !== null);
  if (postSafes.length > 0 && (notes.length > 0 || safes.some((f) => f.preMoneyCap !== null))) {
    // R24: a post-money SAFE's Company Capitalization counts every other converting security. Owed before release.
    throw new UnsupportedTermError(
      "post_money_safe_with_pre_money_instruments", "later", `${path}.convert_safes`,
      "A post-money SAFE converting alongside notes or pre-money SAFEs (R24)",
    );
  }

  // Pay-to-play (R17–R22). No case settles whether a SAFE's Company
  // Capitalization or a note's base counts the table before or after the
  // conversion: owed before release. In a pay-to-play round its requirement
  // takes the place of pro-rata (R6), so nothing there is marked pro-rata.
  const payToPlay = ev.pay_to_play == null ? null : planPayToPlay(company, ev.pay_to_play, investments, `${path}.pay_to_play`);
  if (payToPlay && (safes.length > 0 || notes.length > 0)) {
    throw new UnsupportedTermError("pay_to_play_with_conversions", "later", `${path}.pay_to_play`, "A pay-to-play round that also converts SAFEs or notes (R17–R22)");
  }
  const proRataLine = investments.findIndex((inv) => inv.proRata);
  if (payToPlay && proRataLine >= 0) {
    const { holder, amount } = investments[proRataLine]!;
    throw new InputError(
      `${path}.investments[${proRataLine}].pro_rata`,
      `${company.holders.find((h) => h.id === holder)?.name ?? holder}'s ${usd(amount)} is marked pro-rata, but in a pay-to-play round the ` +
        "pay-to-play requirement takes the place of pro-rata. Enter it as an ordinary investment in the same round.",
    );
  }
  // R19 and R21: the table after the conversion, for anti-dilution, and for the price unless the round says before.
  const afterConversion = payToPlay ? company.clone() : company;
  if (payToPlay) applyPayToPlay(afterConversion, payToPlay, `${path}.pay_to_play`);
  if (payToPlay?.pricedAfterConversion) applyPayToPlay(company, payToPlay, `${path}.pay_to_play`);
  const adjustmentInPost = bool(ev.anti_dilution_shares_in_post, true, `${path}.anti_dilution_shares_in_post`);
  const poolInA = bool(ev.anti_dilution_include_unissued_pool_in_a, false, `${path}.anti_dilution_include_unissued_pool_in_a`);
  const poolInProRataBase = bool(ev.pro_rata_base_includes_unissued_pool, false, `${path}.pro_rata_base_includes_unissued_pool`);
  const rounding = ev.anti_dilution_cp2_rounding ?? "exact";
  if (!["exact", "0.0001", "0.01"].includes(rounding as string)) {
    throw new InputError(`${path}.anti_dilution_cp2_rounding`, "must be exact, 0.0001 or 0.01");
  }

  const series = object(ev.series, `${path}.series`);
  const seriesId = text(series.id, `${path}.series.id`);
  const seriesName = text(series.name, `${path}.series.name`);
  if (company.security(seriesId)) throw new InputError(`${path}.series.id`, `${seriesId} already exists`);
  if (series.kind !== "preferred") throw new InputError(`${path}.series.kind`, "a priced round sells a preferred series");

  const pre = positive(ev.pre_money, `${path}.pre_money`);
  const money = investments.reduce((sum, inv) => sum.plus(inv.amount), ZERO);
  const post = pre.plus(money);
  const target = ev.pool_target_unissued_percent_post == null ? ZERO : fraction(ev.pool_target_unissued_percent_post, `${path}.pool_target_unissued_percent_post`, true);
  const outstanding = company.outstandingAsConverted();
  const pool0 = company.unissuedPool;
  if (outstanding.plus(pool0).isZero()) throw new InputError(path, "a priced round needs shares outstanding to price against");

  // R4: the post-money SAFEs' Company Capitalization.
  const owned = postSafes.reduce((sum, f) => sum.plus(f.purchaseAmount.div(f.postMoneyCap!)), ZERO);
  if (owned.gte(ONE)) throw new InputError(`${path}.convert_safes`, "the post-money SAFEs would own the whole company at their caps");
  const companyCap = postSafes.length > 0 ? outstanding.plus(pool0).div(ONE.minus(owned)) : null;

  // R23: a note converts its principal plus simple interest, Actual/365, to
  // the round's date. Its pre-money cap divides by the share count just
  // before the round, as at exit (X10's conversion_base): the pool as it
  // stood before this round's top-up, and no SAFE or note converting in it.
  if (notes.length > 0 && ev.date == null) throw new InputError(`${path}.date`, "a round that converts notes needs a date, for their interest (R23)");
  const roundDay = notes.length > 0 ? dayNumber(ev.date, `${path}.date`) : null;
  const commonShares = company.securities.filter((s) => s.kind === "common").reduce((sum, s) => sum.plus(company.sharesOf(s.id)), ZERO);
  const noteTerms = notes.map((n) => {
    const days = roundDay! - dayNumber(n.issueDate, `${path}.date`);
    if (days < 0) throw new InputError(`${path}.date`, `the round is dated before ${n.id} was issued`);
    const interest = n.principal.times(n.interestRate).times(days).div(365);
    const baseShares = n.conversionBase === "with_pool" ? outstanding.plus(pool0) : n.conversionBase === "without_pool" ? outstanding : commonShares;
    if (n.valuationCap && baseShares.isZero()) throw new InputError(`${path}.convert_notes`, `${n.id}'s ${n.conversionBase} base has no shares to divide its cap by`);
    return { note: n, interest, amount: n.principal.plus(interest), baseShares, capPrice: n.valuationCap ? n.valuationCap.div(baseShares) : null };
  });

  type Choice = "cap" | "discount";
  /** A SAFE's cap price, given the pool after the round (a pre-money SAFE counts it, R24); null without a cap. */
  const capPrice = (f: Safe, pool: Decimal): Decimal | null =>
    f.postMoneyCap ? f.postMoneyCap.div(companyCap!) : f.preMoneyCap ? f.preMoneyCap.div(outstanding.plus(pool)) : null;

  // The series with anti-dilution, as they stand before the round (after any
  // pay-to-play conversion, R21). A counts the shares outstanding immediately
  // before the new issue, so every series' A comes from this table, before
  // any adjustment.
  const preferredAsConverted = afterConversion.securities.filter((s) => s.kind === "preferred").reduce((sum, s) => sum.plus(afterConversion.asConverted(s)), ZERO);
  const outstandingForA = afterConversion.outstandingAsConverted();
  const protectedSeries = afterConversion.securities
    .filter((s): s is PreferredSeries => s.kind === "preferred" && s.antiDilution !== "none")
    .map((s) => ({
      series: s,
      rule: s.antiDilution as AntiDilutionAdjustment["rule"],
      cp1: s.conversionPrice,
      /** The series' shares as converted before the round: the shares an adjustment scales. */
      asConverted: afterConversion.asConverted(s),
      // R7: broad-based A is the stock and options outstanding as converted, and the unissued pool, as it stood before the round, only under the toggle.
      // R15: narrow-based A is the preferred only. A full ratchet has no A.
      a: s.antiDilution === "broad_based" ? outstandingForA.plus(poolInA ? pool0 : ZERO) : s.antiDilution === "narrow_based" ? preferredAsConverted : null,
    }));
  // R10: a weighted average's B and C in the price come from the new shares as fractions, money ÷ price, and the money.
  const extraShares = protectedSeries.map(({ rule, cp1, asConverted, a }) => {
    if (rule === "full_ratchet") {
      // CP2 = price = post ÷ x, so the series grows by asConverted × (CP1 × x ÷ post − 1).
      return { growing: asConverted.times(cp1).div(post), fixed: asConverted.negated() };
    }
    // CP1 ÷ CP2 − 1 = (C − B) ÷ (A + B), with C = money × x ÷ post and B = money ÷ CP1.
    const b = money.div(cp1);
    return { growing: asConverted.times(money).div(post.times(a!.plus(b))), fixed: asConverted.times(b).div(a!.plus(b)).negated() };
  });

  /** The post-money fully diluted shares for these choices: x = (fixed shares) ÷ (1 − the parts that grow with x). */
  const solve = (topUp: boolean, choices: Choice[], noteChoices: Choice[], triggered: boolean[]): Decimal => {
    let fixed = outstanding.plus(topUp ? ZERO : pool0);
    let growing = money.div(post).plus(topUp ? target : ZERO);
    safes.forEach((f, i) => {
      if (choices[i] === "discount") growing = growing.plus(f.purchaseAmount.div(post.times(ONE.minus(f.discount))));
      else if (f.postMoneyCap) fixed = fixed.plus(f.purchaseAmount.times(companyCap!).div(f.postMoneyCap));
      else {
        fixed = fixed.plus(f.purchaseAmount.times(outstanding.plus(topUp ? ZERO : pool0)).div(f.preMoneyCap!));
        if (topUp) growing = growing.plus(f.purchaseAmount.times(target).div(f.preMoneyCap!));
      }
    });
    noteTerms.forEach((t, i) => {
      if (noteChoices[i] === "discount") growing = growing.plus(t.amount.div(post.times(ONE.minus(t.note.discount))));
      else fixed = fixed.plus(t.amount.times(t.baseShares).div(t.note.valuationCap!));
    });
    // R10: the adjustment shares count in the price, unless the round says otherwise.
    if (adjustmentInPost) {
      extraShares.forEach((extra, i) => {
        if (!triggered[i]) return;
        fixed = fixed.plus(extra.fixed);
        growing = growing.plus(extra.growing);
      });
    }
    if (!ONE.minus(growing).isPositive()) throw new InputError(path, "the new money, the pool target, the SAFEs and the notes leave no room for the existing shares");
    return fixed.div(ONE.minus(growing));
  };

  // Settle the choices by rule: a SAFE or note takes its cap when the cap
  // price is no higher than the discount price (a tie goes to the cap); a
  // series is adjusted when the round's price is below its conversion price.
  let choices: Choice[] = safes.map((f) => (f.postMoneyCap || f.preMoneyCap ? "cap" : "discount"));
  let noteChoices: Choice[] = noteTerms.map((t) => (t.capPrice ? "cap" : "discount"));
  let triggered: boolean[] = protectedSeries.map(() => false);
  let topUp = false;
  for (let pass = 0; ; pass++) {
    if (pass > 2 * (safes.length + notes.length + protectedSeries.length) + 4) {
      throw new NoAnswerError(`${path}: the SAFEs' and notes' conversion prices, the anti-dilution adjustments and the pool top-up don't settle on one answer.`);
    }
    const nextTopUp = target.times(solve(false, choices, noteChoices, triggered)).gt(pool0); // R16
    const x = solve(nextTopUp, choices, noteChoices, triggered);
    const price = post.div(x);
    const pool = nextTopUp ? target.times(x) : pool0;
    const next = safes.map((f): Choice => {
      const cap = capPrice(f, pool);
      const discount = price.times(ONE.minus(f.discount));
      return cap && (cap.lt(discount) || nearlyEqual(cap, discount)) ? "cap" : "discount";
    });
    const nextNotes = noteTerms.map((t): Choice => {
      const discount = price.times(ONE.minus(t.note.discount));
      return t.capPrice && (t.capPrice.lt(discount) || nearlyEqual(t.capPrice, discount)) ? "cap" : "discount";
    });
    const nextTriggered = protectedSeries.map(({ cp1 }) => price.lt(cp1) && !nearlyEqual(price, cp1));
    if (
      nextTopUp === topUp &&
      next.every((c, i) => c === choices[i]) &&
      nextNotes.every((c, i) => c === noteChoices[i]) &&
      nextTriggered.every((t, i) => t === triggered[i])
    ) break;
    topUp = nextTopUp;
    choices = next;
    noteChoices = nextNotes;
    triggered = nextTriggered;
  }
  const solved = solve(topUp, choices, noteChoices, triggered);
  const price = post.div(solved);
  const poolAfter = topUp ? target.times(solved) : pool0;

  // A round that both converts SAFEs or notes and triggers anti-dilution
  // raises questions no case settles yet: whether the conversion is itself a
  // new issue at a lower price, and whether its shares count in A, B or C.
  const firstTriggered = protectedSeries.find((_, i) => triggered[i]);
  if (firstTriggered && (safes.length > 0 || notes.length > 0)) {
    throw new UnsupportedTermError(
      "anti_dilution_with_conversions", "later", `${path}.convert_safes`,
      `A round that converts SAFEs or notes and triggers ${firstTriggered.series.id}'s anti-dilution (R7–R10)`,
    );
  }
  // C10: a series that names its definition of A must name the one the round uses.
  protectedSeries.forEach(({ series: s, rule }, i) => {
    if (!triggered[i] || rule !== "broad_based" || s.antiDilutionA == null) return;
    if ((s.antiDilutionA === "outstanding_common_options_preferred_and_unissued_pool") !== poolInA) {
      throw new InputError(
        `${path}.anti_dilution_include_unissued_pool_in_a`,
        `${s.id}'s anti_dilution_a is ${s.antiDilutionA}, which ${poolInA ? "leaves the unissued pool out of" : "counts the unissued pool in"} A; this round's toggle says otherwise (C10)`,
      );
    }
  });

  // Each pro-rata investor's lines, and its stake before the round, as converted.
  const proRataLines = new Map<string, { amount: Decimal; line: number }>();
  investments.forEach((inv, i) => {
    if (!inv.proRata) return;
    const at = proRataLines.get(inv.holder);
    proRataLines.set(inv.holder, { amount: (at?.amount ?? ZERO).plus(inv.amount), line: at?.line ?? i });
  });
  const stakes = new Map([...proRataLines.keys()].map((h) => [h, company.positions.filter((p) => p.holder === h).reduce((sum, p) => {
    const s = company.security(p.security)!;
    return sum.plus(s.kind === "preferred" ? p.shares.times(s.conversionRatio) : p.shares);
  }, ZERO)]));

  // SAFE conversions, each into a series of its own per conversion price, with the new series' rights (R5).
  const safeSeries: { price: Decimal; id: string }[] = [];
  const safeConversions: SafeConversion[] = safes.map((f, i) => {
    const capped = choices[i] === "cap";
    const conversionPrice = capped ? capPrice(f, poolAfter)! : price.times(ONE.minus(f.discount));
    // Shares from the exact terms rather than the rounded price, then rounded down (R3, E19).
    const shares = roundDownShares(
      !capped
        ? f.purchaseAmount.times(solved).div(post.times(ONE.minus(f.discount)))
        : f.postMoneyCap
          ? f.purchaseAmount.times(companyCap!).div(f.postMoneyCap)
          : f.purchaseAmount.times(outstanding.plus(poolAfter)).div(f.preMoneyCap!),
    );
    let into = safeSeries.find((x) => nearlyEqual(x.price, conversionPrice));
    if (!into) {
      const n = safeSeries.length;
      into = { price: conversionPrice, id: `${seriesId}_shadow${n === 0 ? "" : `_${n + 1}`}` };
      safeSeries.push(into);
      company.securities.push(
        readSecurity(
          {
            ...series,
            id: into.id,
            name: `${seriesName} (from SAFEs)${n === 0 ? "" : ` ${n + 1}`}`,
            original_issue_price: conversionPrice.toString(),
            conversion_price: conversionPrice.toString(),
          },
          `${path}.series`,
        ),
      );
    }
    company.issue(f.holder, into.id, shares, `${path}.convert_safes`);
    return {
      safe: f.id,
      holder: f.holder,
      method: capped ? "cap" : "discount",
      companyCapitalization: capped && f.preMoneyCap ? outstanding.plus(poolAfter) : null,
      conversionPrice,
      shares,
      series: into.id,
    };
  });
  company.safes = company.safes.filter((f) => !safes.includes(f));

  // Note conversions, each into a series of its own per conversion price,
  // "(from notes)", with the new series' rights, priced at the note's
  // conversion price, so its preference is what converted (R23).
  const noteSeries: { price: Decimal; id: string }[] = [];
  const noteConversions: NoteConversion[] = noteTerms.map((t, i) => {
    const capped = noteChoices[i] === "cap";
    const conversionPrice = capped ? t.capPrice! : price.times(ONE.minus(t.note.discount));
    // Shares from the exact terms rather than the rounded price, then rounded down (R3, E19).
    const shares = roundDownShares(
      capped ? t.amount.times(t.baseShares).div(t.note.valuationCap!) : t.amount.times(solved).div(post.times(ONE.minus(t.note.discount))),
    );
    let into = noteSeries.find((x) => nearlyEqual(x.price, conversionPrice));
    if (!into) {
      const n = noteSeries.length;
      into = { price: conversionPrice, id: `${seriesId}_notes${n === 0 ? "" : `_${n + 1}`}` };
      noteSeries.push(into);
      company.securities.push(
        readSecurity(
          {
            ...series,
            id: into.id,
            name: `${seriesName} (from notes)${n === 0 ? "" : ` ${n + 1}`}`,
            original_issue_price: conversionPrice.toString(),
            conversion_price: conversionPrice.toString(),
          },
          `${path}.series`,
        ),
      );
    }
    company.issue(t.note.holder, into.id, shares, `${path}.convert_notes`);
    return {
      note: t.note.id,
      holder: t.note.holder,
      principal: t.note.principal,
      interest: t.interest,
      amountConverting: t.amount,
      conversionBase: t.note.conversionBase,
      baseShares: t.baseShares,
      method: capped ? "cap" : "discount",
      conversionPrice,
      shares,
      series: into.id,
    };
  });
  company.notes = company.notes.filter((n) => !notes.includes(n));

  // Pro-rata entitlements (R6): the investor's share of the base × the
  // round's money. The base counts the stock and options outstanding as
  // converted, each converting SAFE or note at the whole shares it receives
  // here, and the unissued pool only under the toggle. A SAFE or note staying
  // outstanding has no settled count, so that is refused. The total a holder
  // marks as pro-rata may not exceed its entitlement (M4d).
  const proRata: ProRata[] = [];
  if (proRataLines.size > 0) {
    if (company.safes.length > 0 || company.notes.length > 0) {
      throw new InputError(`${path}.investments[${[...proRataLines.values()][0]!.line}].pro_rata`, "a pro-rata round with a SAFE or note that stays outstanding is refused (R6)");
    }
    const conversions = [...safeConversions, ...noteConversions];
    const converted = conversions.reduce((sum, c) => sum.plus(c.shares), ZERO);
    const base = outstanding.plus(converted).plus(poolInProRataBase ? pool0 : ZERO);
    for (const [holder, { amount, line }] of proRataLines) {
      const held = stakes.get(holder)!.plus(conversions.filter((c) => c.holder === holder).reduce((sum, c) => sum.plus(c.shares), ZERO));
      const share = held.div(base);
      const entitlement = share.times(money);
      if (amount.gt(entitlement) && !nearlyEqual(amount, entitlement)) {
        const allowed = entitlement.toDecimalPlaces(2, D.ROUND_DOWN);
        const name = company.holders.find((h) => h.id === holder)!.name;
        throw new InputError(
          `${path}.investments[${line}]`,
          `${name}'s pro-rata investment of ${usd(amount)} is more than its pro-rata entitlement of ${usd(allowed)} ` +
            `(${share.times(100).toFixed(6)}% of the ${usd(money)} round). Mark ${usd(allowed)} as pro-rata and enter the other ` +
            `${usd(amount.minus(allowed))} as an ordinary investment in the same round.`,
        );
      }
      proRata.push({ holder, preRoundShare: share, entitlement, amountInvested: amount });
    }
  }

  // One issuance per holder: its lines added up, rounded down once (R3).
  const byHolder = new Map<string, Decimal>();
  for (const inv of investments) byHolder.set(inv.holder, (byHolder.get(inv.holder) ?? ZERO).plus(inv.amount));
  const newShares = [...byHolder].map(([holder, amount]) => ({ holder, shares: roundDownShares(amount.times(solved).div(post)) }));

  // Anti-dilution, as the charter computes it after closing: C is the new
  // shares actually issued and B what they paid ÷ CP1 (R8). It changes the
  // conversion price and so the conversion ratio, never the preference.
  const c = newShares.reduce((sum, n) => sum.plus(n.shares), ZERO);
  const antiDilution: AntiDilutionAdjustment[] = [];
  protectedSeries.forEach(({ series: s, rule, cp1, a }, i) => {
    if (!triggered[i]) return;
    const b = a ? c.times(price).div(cp1) : null;
    const exact = rule === "full_ratchet" ? price : cp1.times(a!.plus(b!)).div(a!.plus(c));
    const cp2 = rounding === "exact" ? exact : roundHalfUp(exact, new D(rounding as string));
    const newConversionRatio = s.originalIssuePrice.div(cp2);
    company.securities[company.securities.indexOf(s)] = { ...s, conversionPrice: cp2, conversionRatio: newConversionRatio };
    antiDilution.push({ series: s.id, rule, cp1, cp2Unrounded: rounding === "exact" ? null : exact, cp2, a, b, c, newConversionRatio });
  });

  // The new series, at the round price (R3: exact, here to 40 digits).
  const newSeries = readSecurity({ ...series, original_issue_price: price.toString(), conversion_price: price.toString() }, `${path}.series`);
  company.securities.push(newSeries);
  newShares.forEach((n, i) => company.issue(n.holder, seriesId, n.shares, `${path}.investments[${i}].holder`));
  const newPool = topUp ? roundDownShares(poolAfter) : pool0;
  company.unissuedPool = newPool;
  // R19's toggle: priced before the conversion, which still happens at closing.
  if (payToPlay && !payToPlay.pricedAfterConversion) applyPayToPlay(company, payToPlay, `${path}.pay_to_play`);
  company.seniority = readSeniority(company, ev.seniority, `${path}.seniority`);

  return {
    kind: "priced_round",
    price,
    postMoneyValuation: post,
    preRoundFullyDiluted: outstanding.plus(pool0),
    postMoneyFullyDilutedSolved: solved,
    companyCapitalization: companyCap,
    safeConversions,
    noteConversions,
    proRata,
    antiDilution,
    payToPlay,
    newShares,
    poolTopUp: newPool.minus(pool0),
    postMoneyFullyDilutedActual: company.outstandingAsConverted().plus(company.unissuedPool),
  };
}

const HANDLERS: Record<string, (company: Company, ev: Json, path: string) => EventDetails> = {
  issue: issueEvent,
  issue_percent: issuePercentEvent,
  create_pool: createPoolEvent,
  grant_options: grantOptionsEvent,
  safes: (company, ev, path) => {
    array(ev.safes, `${path}.safes`).forEach((v, i) => company.safes.push(readSafe(v, `${path}.safes[${i}]`)));
    return { kind: "safes" };
  },
  notes: (company, ev, path) => {
    array(ev.notes, `${path}.notes`).forEach((v, i) => company.notes.push(readNote(v, `${path}.notes[${i}]`)));
    return { kind: "notes" };
  },
  priced_round: pricedRoundEvent,
};

/**
 * Builds a company's cap tables from its events, in the case-file format
 * (C1–C4, C11, C14): the cap table after each event, with what that event
 * worked out. A term the engine doesn't build yet is refused with an error
 * naming it, never skipped.
 */
export function buildCapTables(value: unknown, path = "inputs"): CapTableAfterEvent[] {
  const inputs = object(value, path);
  onlyKnownFields(inputs, INPUT_FIELDS, path);
  const holders: Holder[] = array(inputs.holders, `${path}.holders`).map((v, i) => {
    const h = object(v, `${path}.holders[${i}]`);
    onlyKnownFields(h, ["id", "name"], `${path}.holders[${i}]`);
    return { id: text(h.id, `${path}.holders[${i}].id`), name: text(h.name, `${path}.holders[${i}].name`) };
  });
  holders.forEach((h, i) => {
    if (holders.findIndex((x) => x.id === h.id) !== i) throw new InputError(`${path}.holders[${i}].id`, `holder ${h.id} is listed twice`);
  });

  const company = new Company(holders);
  const seen = new Set<string>();
  return array(inputs.events, `${path}.events`).map((v, i) => {
    const at = `${path}.events[${i}]`;
    const ev = object(v, at);
    const id = text(ev.id, `${at}.id`);
    if (seen.has(id)) throw new InputError(`${at}.id`, `event ${id} is listed twice`);
    seen.add(id);
    const type = text(ev.type, `${at}.type`);
    const handler = HANDLERS[type];
    if (!handler) throw new InputError(`${at}.type`, `unknown event type ${JSON.stringify(type)}; the engine reads ${Object.keys(HANDLERS).join(", ")}`);
    onlyKnownFields(ev, [...COMMON_EVENT_FIELDS, ...EVENT_FIELDS[type]!], at);
    const date = ev.date == null ? null : text(ev.date, `${at}.date`);
    const details = handler(company, ev, at);
    return {
      event: id,
      date,
      capTable: company.snapshot(),
      unconvertedSafes: company.safes.map((f) => ({ ...f })),
      unconvertedNotes: company.notes.map((n) => ({ ...n })),
      details,
    };
  });
}
