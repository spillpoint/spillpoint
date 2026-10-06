// Building a company's cap tables from its rounds (M4): shares issued, a
// percentage issue, the option pool, grants, SAFEs and notes as they're
// issued, and priced rounds. Each event yields the cap table after it, in the
// same model an exit runs on.
//
// M4c builds a priced round's price, new shares and pool top-up. Converting
// SAFEs and notes, pro-rata entitlements, anti-dilution and pay-to-play come
// in later M4 PRs. Until then a round that needs one is refused, never
// skipped: a round priced without them would look right and be wrong.
//
// The reference calculator solves a round by trying every branch (topped up
// or not, and later cap or discount, anti-dilution or not) and keeping the one
// that is consistent. The engine decides each branch by its own rule (R16 for
// the top-up) and solves once, in closed form.

import type { Decimal } from "decimal.js";

import { D, ONE, ZERO } from "./decimal.ts";
import { InputError, UnsupportedTermError } from "./errors.ts";
import { array, notNegative, object, onlyKnownFields, positive, readSecurity, text, wholeShares } from "./input.ts";
import type { CapTable, Holder, Position, Security } from "./model.ts";

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

/** What a priced round worked out. */
export interface RoundDetails {
  /** Exact in arithmetic; held to 40 significant digits (E14). */
  price: Decimal;
  postMoneyValuation: Decimal;
  preRoundFullyDiluted: Decimal;
  /** The post-money fully diluted shares the price is set on, with new shares and the pool as fractions (R3). */
  postMoneyFullyDilutedSolved: Decimal;
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) throw new InputError(`${path}.issue_date`, "expected a date as YYYY-MM-DD");
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

/**
 * A priced round (SPEC, Rounds). Price = post-money valuation ÷ post-money
 * fully diluted shares, which count the stock and options outstanding, the
 * unissued pool at its target, and the new shares; the pool top-up sits in
 * the pre-money, so it dilutes only existing holders.
 *
 * Whether the pool is topped up (R16): it is, unless the unissued pool before
 * the round already meets its target share of the post-money fully diluted
 * shares counted without a top-up. Then each case solves in closed form:
 * - no top-up: x = (O + U)·V ÷ pre, so the price is pre ÷ (O + U);
 * - top-up to t: x = O·V ÷ (pre − t·V), so the price is (pre − t·V) ÷ O;
 * where O is the stock and options outstanding, U the unissued pool, V the
 * post-money valuation. Shares are worked out from those exact terms, not
 * from the rounded price, and rounded down (R3).
 */
function pricedRoundEvent(company: Company, ev: Json, path: string): EventDetails {
  const investments = array(ev.investments, `${path}.investments`).map((v, i) => {
    const at = `${path}.investments[${i}]`;
    const inv = object(v, at);
    onlyKnownFields(inv, ["holder", "amount", "pro_rata"], at);
    return { holder: text(inv.holder, `${at}.holder`), amount: positive(inv.amount, `${at}.amount`), proRata: bool(inv.pro_rata, false, `${at}.pro_rata`) };
  });

  // Terms later M4 PRs build: refused until then.
  if (ev.pay_to_play != null) throw new UnsupportedTermError("pay_to_play", "M4", `${path}.pay_to_play`, "Pay-to-play (R17–R22)");
  if (company.safes.length > 0 && bool(ev.convert_safes, true, `${path}.convert_safes`)) {
    throw new UnsupportedTermError("safe_conversion", "M4", `${path}.convert_safes`, "Converting SAFEs in a round (R4, R5, R24)");
  }
  if (company.notes.length > 0 && bool(ev.convert_notes, false, `${path}.convert_notes`)) {
    throw new UnsupportedTermError("note_conversion", "M4", `${path}.convert_notes`, "Converting notes in a round (R23)");
  }
  const proRata = investments.findIndex((inv) => inv.proRata);
  if (proRata >= 0) throw new UnsupportedTermError("pro_rata", "M4", `${path}.investments[${proRata}].pro_rata`, "Pro-rata entitlements (R6)");
  // The toggles only matter once those terms are built; they're still checked.
  bool(ev.anti_dilution_shares_in_post, true, `${path}.anti_dilution_shares_in_post`);
  bool(ev.anti_dilution_include_unissued_pool_in_a, false, `${path}.anti_dilution_include_unissued_pool_in_a`);
  bool(ev.pro_rata_base_includes_unissued_pool, false, `${path}.pro_rata_base_includes_unissued_pool`);
  const rounding = ev.anti_dilution_cp2_rounding ?? "exact";
  if (!["exact", "0.0001", "0.01"].includes(rounding as string)) {
    throw new InputError(`${path}.anti_dilution_cp2_rounding`, "must be exact, 0.0001 or 0.01");
  }

  const series = object(ev.series, `${path}.series`);
  const seriesId = text(series.id, `${path}.series.id`);
  if (company.security(seriesId)) throw new InputError(`${path}.series.id`, `${seriesId} already exists`);
  if (series.kind !== "preferred") throw new InputError(`${path}.series.kind`, "a priced round sells a preferred series");

  const pre = positive(ev.pre_money, `${path}.pre_money`);
  const money = investments.reduce((sum, inv) => sum.plus(inv.amount), ZERO);
  const post = pre.plus(money);
  const target = ev.pool_target_unissued_percent_post == null ? ZERO : fraction(ev.pool_target_unissued_percent_post, `${path}.pool_target_unissued_percent_post`, true);
  const outstanding = company.outstandingAsConverted();
  const pool0 = company.unissuedPool;
  if (outstanding.plus(pool0).isZero()) throw new InputError(path, "a priced round needs shares outstanding to price against");

  // R16: judged on the post-money fully diluted shares without a top-up.
  const withoutTopUp = outstanding.plus(pool0).times(post).div(pre);
  const topUp = target.times(withoutTopUp).gt(pool0);
  let solved: Decimal, price: Decimal, newPool: Decimal, sharesFor: (amount: Decimal) => Decimal;
  if (topUp) {
    const room = pre.minus(target.times(post));
    if (!room.isPositive() || outstanding.isZero()) {
      throw new InputError(`${path}.pool_target_unissued_percent_post`, "the pool target leaves no room for the existing shares in the pre-money");
    }
    solved = outstanding.times(post).div(room);
    price = room.div(outstanding);
    sharesFor = (amount) => roundDownShares(amount.times(outstanding).div(room));
    newPool = roundDownShares(target.times(outstanding).times(post).div(room));
  } else {
    solved = withoutTopUp;
    price = pre.div(outstanding.plus(pool0));
    sharesFor = (amount) => roundDownShares(amount.times(outstanding.plus(pool0)).div(pre));
    newPool = pool0;
  }

  // Anti-dilution is built in M4e. A series whose conversion price is above
  // this round's price would be adjusted, which would change the price too.
  const adjusted = company.securities.find((s) => s.kind === "preferred" && s.antiDilution !== "none" && price.lt(s.conversionPrice));
  if (adjusted) {
    throw new UnsupportedTermError("anti_dilution", "M4", path, `A round that triggers ${adjusted.id}'s anti-dilution (R7–R10, R15)`);
  }

  // The new series, at the round price (R3: exact, here to 40 digits).
  const newSeries = readSecurity({ ...series, original_issue_price: price.toString(), conversion_price: price.toString() }, `${path}.series`);
  company.securities.push(newSeries);

  // One issuance per holder: its lines added up, rounded down once (R3).
  const byHolder = new Map<string, Decimal>();
  for (const inv of investments) byHolder.set(inv.holder, (byHolder.get(inv.holder) ?? ZERO).plus(inv.amount));
  const newShares = [...byHolder].map(([holder, amount]) => ({ holder, shares: sharesFor(amount) }));
  newShares.forEach((n, i) => company.issue(n.holder, seriesId, n.shares, `${path}.investments[${i}].holder`));
  company.unissuedPool = newPool;
  company.seniority = readSeniority(company, ev.seniority, `${path}.seniority`);

  return {
    kind: "priced_round",
    price,
    postMoneyValuation: post,
    preRoundFullyDiluted: outstanding.plus(pool0),
    postMoneyFullyDilutedSolved: solved,
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
