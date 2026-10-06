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
import { InputError, NoAnswerError, UnsupportedTermError } from "./errors.ts";
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
  proRata: ProRata[];
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

/** Two prices or amounts held to 40 digits that are the same in exact arithmetic: within one part in 10^30 (E14). */
function nearlyEqual(a: Decimal, b: Decimal): boolean {
  return a.minus(b).abs().lte(new D("1e-30").times(D.max(ONE, b.abs())));
}

/** "$1,234,567.89", for messages. */
function usd(amount: Decimal): string {
  const [whole, cents] = amount.toFixed(2).split(".") as [string, string];
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
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
 * The reference calculator tries every combination of those choices and of
 * the top-up and keeps the consistent one. The engine settles them by rule
 * instead: it solves the round for its current choices, re-decides each
 * SAFE by comparing its two prices at that solution, and re-decides the
 * top-up by R16 (judged without a top-up), until nothing changes. For fixed
 * choices the share count is a straight line in the post-money count x, so
 * each solve is one division.
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
  if (notes.length > 0) throw new UnsupportedTermError("note_conversion", "M4", `${path}.convert_notes`, "Converting notes in a round (R23)");
  // The anti-dilution toggles only matter once it's built (M4e); they're still checked.
  bool(ev.anti_dilution_shares_in_post, true, `${path}.anti_dilution_shares_in_post`);
  bool(ev.anti_dilution_include_unissued_pool_in_a, false, `${path}.anti_dilution_include_unissued_pool_in_a`);
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

  type Choice = "cap" | "discount";
  /** A SAFE's cap price, given the pool after the round (a pre-money SAFE counts it, R24); null without a cap. */
  const capPrice = (f: Safe, pool: Decimal): Decimal | null =>
    f.postMoneyCap ? f.postMoneyCap.div(companyCap!) : f.preMoneyCap ? f.preMoneyCap.div(outstanding.plus(pool)) : null;

  /** The post-money fully diluted shares for these choices: x = (fixed shares) ÷ (1 − the parts that grow with x). */
  const solve = (topUp: boolean, choices: Choice[]): Decimal => {
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
    if (!ONE.minus(growing).isPositive()) throw new InputError(path, "the new money, the pool target and the SAFEs leave no room for the existing shares");
    return fixed.div(ONE.minus(growing));
  };

  // Settle the choices by rule: a SAFE takes its cap when the cap price is no higher than the discount price (a tie goes to the cap).
  let choices: Choice[] = safes.map((f) => (f.postMoneyCap || f.preMoneyCap ? "cap" : "discount"));
  let topUp = false;
  for (let pass = 0; ; pass++) {
    if (pass > 2 * safes.length + 4) {
      throw new NoAnswerError(`${path}: the SAFEs' conversion prices and the pool top-up don't settle on one answer.`);
    }
    const nextTopUp = target.times(solve(false, choices)).gt(pool0); // R16
    const x = solve(nextTopUp, choices);
    const price = post.div(x);
    const pool = nextTopUp ? target.times(x) : pool0;
    const next = safes.map((f): Choice => {
      const cap = capPrice(f, pool);
      const discount = price.times(ONE.minus(f.discount));
      return cap && (cap.lt(discount) || nearlyEqual(cap, discount)) ? "cap" : "discount";
    });
    if (nextTopUp === topUp && next.every((c, i) => c === choices[i])) break;
    topUp = nextTopUp;
    choices = next;
  }
  const solved = solve(topUp, choices);
  const price = post.div(solved);
  const poolAfter = topUp ? target.times(solved) : pool0;

  // Anti-dilution is built in M4e. A series whose conversion price is above
  // this round's price would be adjusted, which would change the price too.
  const adjusted = company.securities.find((s) => s.kind === "preferred" && s.antiDilution !== "none" && price.lt(s.conversionPrice));
  if (adjusted) {
    throw new UnsupportedTermError("anti_dilution", "M4", path, `A round that triggers ${adjusted.id}'s anti-dilution (R7–R10, R15)`);
  }

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

  // Pro-rata entitlements (R6): the investor's share of the base × the
  // round's money. The base counts the stock and options outstanding as
  // converted, each converting SAFE at the whole shares it receives here, and
  // the unissued pool only under the toggle. A SAFE or note staying
  // outstanding has no settled count, so that is refused. The total a holder
  // marks as pro-rata may not exceed its entitlement (M4d).
  const proRata: ProRata[] = [];
  if (proRataLines.size > 0) {
    if (company.safes.length > 0 || company.notes.length > 0) {
      throw new InputError(`${path}.investments[${[...proRataLines.values()][0]!.line}].pro_rata`, "a pro-rata round with a SAFE or note that stays outstanding is refused (R6)");
    }
    const converted = safeConversions.reduce((sum, c) => sum.plus(c.shares), ZERO);
    const base = outstanding.plus(converted).plus(poolInProRataBase ? pool0 : ZERO);
    for (const [holder, { amount, line }] of proRataLines) {
      const held = stakes.get(holder)!.plus(safeConversions.filter((c) => c.holder === holder).reduce((sum, c) => sum.plus(c.shares), ZERO));
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

  // The new series, at the round price (R3: exact, here to 40 digits).
  const newSeries = readSecurity({ ...series, original_issue_price: price.toString(), conversion_price: price.toString() }, `${path}.series`);
  company.securities.push(newSeries);

  // One issuance per holder: its lines added up, rounded down once (R3).
  const byHolder = new Map<string, Decimal>();
  for (const inv of investments) byHolder.set(inv.holder, (byHolder.get(inv.holder) ?? ZERO).plus(inv.amount));
  const newShares = [...byHolder].map(([holder, amount]) => ({ holder, shares: roundDownShares(amount.times(solved).div(post)) }));
  newShares.forEach((n, i) => company.issue(n.holder, seriesId, n.shares, `${path}.investments[${i}].holder`));
  const newPool = topUp ? roundDownShares(poolAfter) : pool0;
  company.unissuedPool = newPool;
  company.seniority = readSeniority(company, ev.seniority, `${path}.seniority`);

  return {
    kind: "priced_round",
    price,
    postMoneyValuation: post,
    preRoundFullyDiluted: outstanding.plus(pool0),
    postMoneyFullyDilutedSolved: solved,
    companyCapitalization: companyCap,
    safeConversions,
    proRata,
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
