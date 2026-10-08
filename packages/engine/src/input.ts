// Reads an exit input in the case-file format (ASSUMPTIONS C1–C4) into the
// engine's model, checking everything the waterfall relies on.
//
// Two kinds of "no":
// - UnsupportedTermError for terms the engine doesn't model yet (earnouts,
//   and SAFEs and notes at exit). These are checked first and refused, never
//   skipped.
// - InputError for anything malformed. Unknown fields are errors too, so a
//   misspelt term can't be silently ignored.

import type { Decimal } from "decimal.js";

import { dayNumber } from "./dates.ts";
import { D, ONE, ZERO, parseExact } from "./decimal.ts";
import { InputError, UnsupportedTermError } from "./errors.ts";
import type {
  AntiDilution,
  CapTable,
  CarveOut,
  ConversionGroup,
  CumulativeDividend,
  ExitInput,
  Holder,
  Participation,
  Position,
  Note,
  PaymentSchedule,
  PreferredSeries,
  Safe,
  Security,
} from "./model.ts";

type Json = Record<string, unknown>;

/** Supplies the cap table an exit names by event (C2), in the case-file format: for instance the one a case's expected.json records. */
export type CapTableResolver = (eventId: string) => unknown;

// ---------- small readers ----------
// Exported for rounds.ts, which reads round events the same strict way; the
// public API (index.ts) doesn't include them.

export function object(value: unknown, path: string): Json {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InputError(path, "expected an object");
  }
  return value as Json;
}

export function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new InputError(path, "expected a list");
  return value;
}

export function text(value: unknown, path: string): string {
  if (typeof value !== "string" || value === "") throw new InputError(path, "expected a non-empty string");
  return value;
}

export function onlyKnownFields(o: Json, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(o)) {
    if (!allowed.includes(key)) {
      throw new InputError(`${path}.${key}`, `unknown field; the engine reads only ${allowed.join(", ")}`);
    }
  }
}

export function wholeShares(value: unknown, path: string): Decimal {
  const n = parseExact(value, path);
  if (!n.isInteger() || n.isNegative()) throw new InputError(path, "share counts must be whole and not negative");
  return n;
}

export function positive(value: unknown, path: string): Decimal {
  const n = parseExact(value, path);
  if (!n.isPositive() || n.isZero()) throw new InputError(path, "must be more than zero");
  return n;
}

export function notNegative(value: unknown, path: string): Decimal {
  const n = parseExact(value, path);
  if (n.isNegative()) throw new InputError(path, "must not be negative");
  return n;
}

// ---------- securities ----------

const PARTICIPATION: readonly Participation[] = ["non_participating", "participating", "participating_capped"];
const ANTI_DILUTION: readonly AntiDilution[] = ["none", "broad_based", "narrow_based", "full_ratchet"];

/** C10: the names of what A counts, per anti-dilution method. Full ratchet and none have no A. */
const ANTI_DILUTION_A: Record<AntiDilution, readonly (string | null)[]> = {
  broad_based: ["outstanding_common_options_preferred", "outstanding_common_options_preferred_and_unissued_pool"],
  narrow_based: ["outstanding_preferred"],
  full_ratchet: [null],
  none: [null],
};

const PREFERRED_FIELDS = [
  "id", "name", "kind", "original_issue_price", "conversion_price", "conversion_ratio",
  "preference_multiple", "participation", "cap_multiple", "anti_dilution", "anti_dilution_a",
  "cumulative_dividend", "approx",
] as const;

/** The as-converted ratio a cap table states must match original issue price ÷ conversion price. */
const RATIO_AGREEMENT = new D("1e-30");

/** C5: a rate, simple or compounding, an accrual start, and what happens on conversion (X2, X4, X5). */
function readDividend(value: unknown, path: string): CumulativeDividend {
  const d = object(value, path);
  onlyKnownFields(d, ["rate", "method", "accrual_start", "on_conversion"], path);
  const method = d.method ?? "simple";
  if (method !== "simple" && method !== "compounding") throw new InputError(`${path}.method`, "must be simple or compounding");
  const onConversion = d.on_conversion ?? "forfeited";
  // X5's other reading: (original issue price + accrued) ÷ conversion price converts. Refused until a case settles it.
  if (onConversion === "added_to_conversion") {
    throw new UnsupportedTermError(
      "dividends_added_to_conversion", "later", `${path}.on_conversion`, "Accrued dividends added to what converts, the other reading (X5)",
    );
  }
  if (onConversion !== "forfeited" && onConversion !== "paid") throw new InputError(`${path}.on_conversion`, "must be forfeited or paid");
  const accrualStart = text(d.accrual_start, `${path}.accrual_start`);
  dayNumber(accrualStart, `${path}.accrual_start`);
  return { rate: notNegative(d.rate, `${path}.rate`), method, accrualStart, onConversion };
}

function readPreferred(s: Json, id: string, name: string, path: string): PreferredSeries {
  onlyKnownFields(s, PREFERRED_FIELDS, path);
  const originalIssuePrice = positive(s.original_issue_price, `${path}.original_issue_price`);
  // A series' conversion price starts at its original issue price; anti-dilution lowers it.
  const conversionPrice =
    s.conversion_price == null ? originalIssuePrice : positive(s.conversion_price, `${path}.conversion_price`);
  const conversionRatio = originalIssuePrice.div(conversionPrice);
  if (s.conversion_ratio != null) {
    const stated = positive(s.conversion_ratio, `${path}.conversion_ratio`);
    if (stated.minus(conversionRatio).abs().gt(RATIO_AGREEMENT.times(D.max(ONE, conversionRatio)))) {
      throw new InputError(
        `${path}.conversion_ratio`,
        `${stated.toString()} doesn't equal original issue price ÷ conversion price (${conversionRatio.toString()})`,
      );
    }
  }
  const participation = s.participation as Participation;
  if (!PARTICIPATION.includes(participation)) {
    throw new InputError(`${path}.participation`, `must be one of ${PARTICIPATION.join(", ")}`);
  }
  // E7: a cap goes with capped participation and nothing else.
  const capped = participation === "participating_capped";
  if (capped !== (s.cap_multiple != null)) {
    throw new InputError(`${path}.cap_multiple`, "a cap multiple goes with participating_capped, and only with it");
  }
  const antiDilution = (s.anti_dilution ?? "none") as AntiDilution;
  if (!ANTI_DILUTION.includes(antiDilution)) {
    throw new InputError(`${path}.anti_dilution`, `must be one of ${ANTI_DILUTION.join(", ")}`);
  }
  const antiDilutionA = (s.anti_dilution_a ?? null) as string | null;
  if ("anti_dilution_a" in s && !ANTI_DILUTION_A[antiDilution].includes(antiDilutionA)) {
    throw new InputError(`${path}.anti_dilution_a`, `${String(antiDilutionA)} doesn't fit ${antiDilution} (C10)`);
  }
  const preferenceMultiple = notNegative(s.preference_multiple, `${path}.preference_multiple`);
  const capMultiple = capped ? positive(s.cap_multiple, `${path}.cap_multiple`) : null;
  // E7: the cap counts the preference, so it can't sit below it. A cap equal
  // to the preference leaves no room to participate (like non-participating).
  if (capMultiple && capMultiple.lt(preferenceMultiple)) {
    throw new InputError(
      `${path}.cap_multiple`,
      `the cap (${capMultiple.toString()}x) is below the preference (${preferenceMultiple.toString()}x); a cap counts the preference, so it can't be lower (E7)`,
    );
  }
  return {
    kind: "preferred",
    id,
    name,
    originalIssuePrice,
    conversionPrice,
    conversionRatio,
    preferenceMultiple,
    participation,
    capMultiple,
    antiDilution,
    antiDilutionA,
    cumulativeDividend: s.cumulative_dividend == null ? null : readDividend(s.cumulative_dividend, `${path}.cumulative_dividend`),
  };
}

export function readSecurity(value: unknown, path: string): Security {
  const s = object(value, path);
  const id = text(s.id, `${path}.id`);
  const name = text(s.name, `${path}.name`);
  switch (s.kind) {
    case "warrant":
      // C4: a strike and an underlying, "common" or a preferred series (checked against the table).
      onlyKnownFields(s, ["id", "name", "kind", "strike", "underlying"], path);
      return { kind: "warrant", id, name, strike: notNegative(s.strike, `${path}.strike`), underlying: text(s.underlying, `${path}.underlying`) };
    case "common":
      onlyKnownFields(s, ["id", "name", "kind"], path);
      return { kind: "common", id, name };
    case "option":
      onlyKnownFields(s, ["id", "name", "kind", "strike"], path);
      return { kind: "option", id, name, strike: notNegative(s.strike, `${path}.strike`) };
    case "preferred":
      return readPreferred(s, id, name, path);
    default:
      throw new InputError(`${path}.kind`, `unknown security kind ${JSON.stringify(s.kind)}`);
  }
}

// ---------- conversion groups ----------

/** C4 and E11: a bare list means "more than 50%"; the long form names the threshold and the rule. */
function readGroup(value: unknown, path: string): ConversionGroup {
  if (Array.isArray(value)) {
    return { series: value.map((v, i) => text(v, `${path}[${i}]`)), voteThreshold: new D("0.5"), voteRule: "more_than" };
  }
  const g = object(value, path);
  onlyKnownFields(g, ["series", "vote_threshold_percent", "vote_rule"], path);
  const series = array(g.series, `${path}.series`).map((v, i) => text(v, `${path}.series[${i}]`));
  const percent = g.vote_threshold_percent == null ? new D(50) : positive(g.vote_threshold_percent, `${path}.vote_threshold_percent`);
  if (percent.gt(100)) throw new InputError(`${path}.vote_threshold_percent`, "can't be more than 100");
  const rule = g.vote_rule ?? "more_than";
  if (rule !== "more_than" && rule !== "at_least") {
    throw new InputError(`${path}.vote_rule`, "must be more_than or at_least");
  }
  return { series, voteThreshold: percent.div(100), voteRule: rule };
}

// ---------- cap table ----------

const CAP_TABLE_FIELDS = [
  "holders", "securities", "seniority", "conversion_groups", "positions", "unissued_pool",
  "unconverted_safes", "unconverted_notes", "carve_out", "totals",
] as const;

export function readCapTable(value: unknown, path = "cap_table"): CapTable {
  const ct = object(value, path);

  // Terms that arrive later are refused before anything else is checked.
  onlyKnownFields(ct, CAP_TABLE_FIELDS, path);

  const holders: Holder[] = array(ct.holders, `${path}.holders`).map((v, i) => {
    const h = object(v, `${path}.holders[${i}]`);
    onlyKnownFields(h, ["id", "name"], `${path}.holders[${i}]`);
    return { id: text(h.id, `${path}.holders[${i}].id`), name: text(h.name, `${path}.holders[${i}].name`) };
  });
  const holderIds = new Set<string>();
  holders.forEach((h, i) => {
    if (holderIds.has(h.id)) throw new InputError(`${path}.holders[${i}].id`, `holder ${h.id} is listed twice`);
    holderIds.add(h.id);
  });

  const securities = array(ct.securities, `${path}.securities`).map((v, i) => readSecurity(v, `${path}.securities[${i}]`));
  const byId = new Map<string, Security>();
  securities.forEach((s, i) => {
    if (byId.has(s.id)) throw new InputError(`${path}.securities[${i}].id`, `security ${s.id} is listed twice`);
    byId.set(s.id, s);
  });
  const preferred = securities.filter((s): s is PreferredSeries => s.kind === "preferred");
  // E12: a warrant is for common or for a preferred series on this table.
  securities.forEach((s, i) => {
    if (s.kind === "warrant" && s.underlying !== "common" && byId.get(s.underlying)?.kind !== "preferred") {
      throw new InputError(`${path}.securities[${i}].underlying`, `${s.underlying} is not common or a preferred series`);
    }
  });

  // SPEC, Tiers: every preferred series sits in exactly one seniority tier.
  const seniority = array(ct.seniority, `${path}.seniority`).map((tier, i) =>
    array(tier, `${path}.seniority[${i}]`).map((v, j) => text(v, `${path}.seniority[${i}][${j}]`)),
  );
  const tiered = seniority.flat();
  for (const sid of tiered) {
    if (byId.get(sid)?.kind !== "preferred") {
      throw new InputError(`${path}.seniority`, `${sid} is not a preferred series`);
    }
  }
  for (const p of preferred) {
    const count = tiered.filter((sid) => sid === p.id).length;
    if (count !== 1) {
      throw new InputError(`${path}.seniority`, `${p.id} must appear in exactly one tier (it appears ${count} times)`);
    }
  }

  // E11: a group's members are convertible preferred series, each in at most one group.
  const conversionGroups = (ct.conversion_groups == null ? [] : array(ct.conversion_groups, `${path}.conversion_groups`)).map(
    (g, i) => readGroup(g, `${path}.conversion_groups[${i}]`),
  );
  if (conversionGroups.length > 1) {
    throw new UnsupportedTermError(
      "conversion_groups", "later", `${path}.conversion_groups`,
      "More than one conversion group (E17: the order in which groups decide isn't settled)",
    );
  }
  const grouped = new Set<string>();
  conversionGroups.forEach((g, i) => {
    for (const sid of g.series) {
      const s = byId.get(sid);
      if (s?.kind !== "preferred" || s.participation === "participating") {
        throw new InputError(
          `${path}.conversion_groups[${i}]`,
          `${sid} must be a preferred series that can convert (uncapped participating preferred never converts)`,
        );
      }
      if (grouped.has(sid)) throw new InputError(`${path}.conversion_groups[${i}]`, `${sid} is in more than one group`);
      grouped.add(sid);
    }
  });

  // E9: one line per holder × security.
  const seen = new Set<string>();
  const positions: Position[] = array(ct.positions, `${path}.positions`).map((v, i) => {
    const p = object(v, `${path}.positions[${i}]`);
    onlyKnownFields(p, ["holder", "security", "shares"], `${path}.positions[${i}]`);
    const holder = text(p.holder, `${path}.positions[${i}].holder`);
    const security = text(p.security, `${path}.positions[${i}].security`);
    if (!holderIds.has(holder)) throw new InputError(`${path}.positions[${i}].holder`, `unknown holder ${holder}`);
    if (!byId.has(security)) throw new InputError(`${path}.positions[${i}].security`, `unknown security ${security}`);
    const key = `${holder}\u0000${security}`;
    if (seen.has(key)) {
      throw new InputError(`${path}.positions[${i}]`, `${holder} already has a ${security} position; list each holder × security once`);
    }
    seen.add(key);
    return { holder, security, shares: wholeShares(p.shares, `${path}.positions[${i}].shares`) };
  });

  const safes = (ct.unconverted_safes == null ? [] : array(ct.unconverted_safes, `${path}.unconverted_safes`)).map((v, i) =>
    readSafe(v, `${path}.unconverted_safes[${i}]`),
  );
  checkSafesAtASale(safes, holderIds, byId, seniority, `${path}.unconverted_safes`);
  const notes = (ct.unconverted_notes == null ? [] : array(ct.unconverted_notes, `${path}.unconverted_notes`)).map((v, i) =>
    readNote(v, `${path}.unconverted_notes[${i}]`),
  );
  checkNotesAtASale(notes, holderIds, byId, new Set(safes.map((f) => f.id)), safes.length > 0 || ct.carve_out != null, `${path}.unconverted_notes`);

  return {
    holders,
    securities,
    seniority,
    conversionGroups,
    positions,
    ...(safes.length > 0 ? { unconvertedSafes: safes } : {}),
    ...(notes.length > 0 ? { unconvertedNotes: notes } : {}),
    unissuedPool: ct.unissued_pool == null ? ZERO : wholeShares(ct.unissued_pool, `${path}.unissued_pool`),
    // Optional (0.1.0 cap tables have no such field), so left out when there's no carve-out.
    ...(ct.carve_out == null ? {} : { carveOut: readCarveOut(ct.carve_out, holderIds, `${path}.carve_out`) }),
  };
}

/** A SAFE (C8, C14): a post-money or a pre-money cap, never both, or neither; a discount below 1; and at a sale, optionally, the series its Cash-Out Amount ranks with (X9). */
export function readSafe(value: unknown, path: string): Safe {
  const f = object(value, path);
  onlyKnownFields(f, ["id", "holder", "purchase_amount", "post_money_cap", "pre_money_cap", "discount", "cash_out_ranks_with"], path);
  const postMoneyCap = f.post_money_cap == null ? null : positive(f.post_money_cap, `${path}.post_money_cap`);
  const preMoneyCap = f.pre_money_cap == null ? null : positive(f.pre_money_cap, `${path}.pre_money_cap`);
  if (postMoneyCap && preMoneyCap) throw new InputError(path, "a SAFE has a post-money cap or a pre-money cap, not both (R24)");
  const discount = f.discount == null ? ZERO : notNegative(f.discount, `${path}.discount`);
  if (discount.gte(1)) throw new InputError(`${path}.discount`, "must be below 1");
  return {
    id: text(f.id, `${path}.id`),
    holder: text(f.holder, `${path}.holder`),
    purchaseAmount: positive(f.purchase_amount, `${path}.purchase_amount`),
    postMoneyCap,
    preMoneyCap,
    discount,
    ...(f.cash_out_ranks_with == null ? {} : { cashOutRanksWith: text(f.cash_out_ranks_with, `${path}.cash_out_ranks_with`) }),
  };
}

/**
 * SAFEs still outstanding at a sale (X9, X13, X14). Their holders must be
 * listed, their ids new, and a named ranking a preferred series in the
 * tiers. Setups no case settles yet are refused, never skipped.
 */
function checkSafesAtASale(
  safes: Safe[], holderIds: ReadonlySet<string>, byId: ReadonlyMap<string, Security>, seniority: string[][], path: string,
): void {
  const ids = new Set<string>();
  safes.forEach((f, i) => {
    const at = `${path}[${i}]`;
    if (!holderIds.has(f.holder)) throw new InputError(`${at}.holder`, `unknown holder ${f.holder}`);
    if (ids.has(f.id) || byId.has(f.id)) throw new InputError(`${at}.id`, `${f.id} is already used`);
    ids.add(f.id);
    if (f.cashOutRanksWith != null && !seniority.some((tier) => tier.includes(f.cashOutRanksWith!))) {
      throw new InputError(`${at}.cash_out_ranks_with`, `${f.cashOutRanksWith} is not a preferred series in the seniority tiers`);
    }
  });
  const preferred = [...byId.values()].filter((s): s is PreferredSeries => s.kind === "preferred");
  const preMoney = safes.find((f) => f.preMoneyCap);
  if (preMoney && preferred.length > 0) {
    throw new UnsupportedTermError(
      "pre_money_safe_with_preferred", "later", path, "A pre-money SAFE at a sale alongside preferred stock: its text ranks its cash only against other SAFEs (X14)",
    );
  }
  if (safes.length > 1 && safes.some((f) => !f.postMoneyCap)) {
    throw new UnsupportedTermError(
      "several_safes", "later", path, "More than one SAFE at a sale, unless each has a post-money cap (X13, X14)",
    );
  }
}

const NOTE_FIELDS = [
  "id", "holder", "principal", "interest_rate", "interest_method", "issue_date", "valuation_cap", "cap_type", "conversion_base", "discount", "repayment_multiple",
] as const;
const CONVERSION_BASES = ["with_pool", "without_pool", "common_only"] as const;

/** A convertible note (C9, C14): simple interest, a pre-money cap or none, a base for the cap, a discount below 1, and a repayment multiple. */
export function readNote(value: unknown, path: string): Note {
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

/**
 * Notes still outstanding at a sale (X12, X15). Their holders must be listed
 * and their ids new. Setups no case settles yet are refused, never skipped.
 */
function checkNotesAtASale(
  notes: Note[], holderIds: ReadonlySet<string>, byId: ReadonlyMap<string, Security>, safeIds: ReadonlySet<string>, withSafeOrCarveOut: boolean, path: string,
): void {
  const ids = new Set<string>();
  notes.forEach((n, i) => {
    const at = `${path}[${i}]`;
    if (!holderIds.has(n.holder)) throw new InputError(`${at}.holder`, `unknown holder ${n.holder}`);
    if (ids.has(n.id) || byId.has(n.id) || safeIds.has(n.id)) throw new InputError(`${at}.id`, `${n.id} is already used`);
    ids.add(n.id);
  });
  if (notes.length === 0) return;
  if (withSafeOrCarveOut) {
    throw new UnsupportedTermError("note_with_safe_or_carve_out", "later", path, "A convertible note at a sale alongside a SAFE or a carve-out (X12)");
  }
  if (notes.length > 1 && notes.some((n) => !n.valuationCap)) {
    throw new UnsupportedTermError("several_notes", "later", path, "More than one convertible note at a sale, unless each has a cap (X15)");
  }
}

/** C6, X6, X7: marginal tiers from $0, contiguous, and recipients among the holders whose shares add up to 100%. */
function readCarveOut(value: unknown, holderIds: ReadonlySet<string>, path: string): CarveOut {
  const c = object(value, path);
  onlyKnownFields(c, ["timing", "tiers", "allocation"], path);
  const timing = c.timing ?? "before_preferences";
  if (timing !== "before_preferences" && timing !== "alongside_preferences") {
    throw new InputError(`${path}.timing`, "must be before_preferences or alongside_preferences");
  }
  const tiers: CarveOut["tiers"] = [];
  let reached: Decimal | null = ZERO;
  for (const [i, v] of array(c.tiers, `${path}.tiers`).entries()) {
    const at = `${path}.tiers[${i}]`;
    const t = object(v, at);
    onlyKnownFields(t, ["from", "to", "percent"], at);
    if (reached === null) throw new InputError(at, "comes after a tier with no upper end");
    const from = notNegative(t.from, `${at}.from`);
    if (!from.eq(reached)) throw new InputError(`${at}.from`, `tiers start at 0 and run on without gaps: this one should start at ${reached.toString()}`);
    const to = t.to == null ? null : positive(t.to, `${at}.to`);
    if (to && !to.gt(from)) throw new InputError(`${at}.to`, "must be above where the tier starts");
    const percent = notNegative(t.percent, `${at}.percent`);
    if (percent.gt(100)) throw new InputError(`${at}.percent`, "can't be more than 100");
    tiers.push({ from, to, rate: percent.div(100) });
    reached = to;
  }
  if (tiers.length === 0) throw new InputError(`${path}.tiers`, "needs at least one tier");
  const allocation = array(c.allocation, `${path}.allocation`).map((v, i) => {
    const at = `${path}.allocation[${i}]`;
    const a = object(v, at);
    onlyKnownFields(a, ["holder", "percent"], at);
    const holder = text(a.holder, `${at}.holder`);
    if (!holderIds.has(holder)) throw new InputError(`${at}.holder`, `${holder} is not a listed holder`);
    return { holder, share: positive(a.percent, `${at}.percent`).div(100) };
  });
  const total = allocation.reduce((sum, a) => sum.plus(a.share), ZERO);
  if (!total.eq(ONE)) throw new InputError(`${path}.allocation`, `the recipients' percentages add up to ${total.times(100).toString()}, not 100`);
  return { timing, tiers, allocation };
}

// ---------- exits and cases ----------

// exit_date: dividends (X2) and notes' interest (X3) accrue to it.
// carve_out: a management carve-out, a term of the sale (C6, case 24), so it can be given here whichever cap table the
// exit runs on, one built from rounds included.
const EXIT_FIELDS = ["cap_table", "cap_table_after_event", "range", "exit_values", "exit_date", "payment_schedules", "carve_out"] as const;

export function readExit(value: unknown, resolveCapTable?: CapTableResolver, path = "exit"): ExitInput {
  return readExitOn(
    value,
    (eventId, at) => {
      // C2: the cap table comes from a round case's expected output.
      const table = resolveCapTable?.(eventId);
      if (table == null) throw new InputError(at, `this exit runs on the cap table after event ${eventId}; supply it`);
      return readCapTable(table, `cap_tables[after_event=${eventId}].cap_table`);
    },
    path,
  );
}

/** An exit whose cap table, when it names one by event (C2), comes from `tableAfter`. */
export function readExitOn(value: unknown, tableAfter: (eventId: string, path: string) => CapTable, path: string): ExitInput {
  const exit = object(value, path);
  onlyKnownFields(exit, EXIT_FIELDS, path);

  const onTable =
    exit.cap_table_after_event != null
      ? tableAfter(text(exit.cap_table_after_event, `${path}.cap_table_after_event`), `${path}.cap_table_after_event`)
      : readCapTable(exit.cap_table, `${path}.cap_table`);
  const capTable = exit.carve_out == null ? onTable : withSaleCarveOut(onTable, exit.carve_out, `${path}.carve_out`);

  const range = array(exit.range, `${path}.range`);
  if (range.length !== 2) throw new InputError(`${path}.range`, "expected [low, high]");
  const lo = notNegative(range[0], `${path}.range[0]`);
  const hi = parseExact(range[1], `${path}.range[1]`);
  if (!hi.gt(lo)) throw new InputError(`${path}.range`, "the high end must be above the low end");

  const exitValues = array(exit.exit_values, `${path}.exit_values`).map((v, i) => {
    const x = parseExact(v, `${path}.exit_values[${i}]`);
    if (x.lt(lo) || x.gt(hi)) throw new InputError(`${path}.exit_values[${i}]`, `${x.toString()} is outside the range`);
    return x;
  });

  // X2: dividends accrue to the exit date, so a table with them needs one, on or after every accrual start.
  const exitDate = exit.exit_date == null ? null : text(exit.exit_date, `${path}.exit_date`);
  if (exitDate != null) dayNumber(exitDate, `${path}.exit_date`);
  // X3: so does a note's interest, from its issue date.
  for (const n of capTable.unconvertedNotes ?? []) {
    if (exitDate == null) throw new InputError(`${path}.exit_date`, `${n.id} accrues interest, so the exit needs an exit_date`);
    if (dayNumber(exitDate, `${path}.exit_date`) < dayNumber(n.issueDate, "issue_date")) {
      throw new InputError(`${path}.exit_date`, `${exitDate} is before ${n.id} was issued, ${n.issueDate}`);
    }
  }
  for (const s of capTable.securities) {
    if (s.kind !== "preferred" || !s.cumulativeDividend) continue;
    if (exitDate == null) throw new InputError(`${path}.exit_date`, `${s.name} accrues cumulative dividends, so the exit needs an exit_date`);
    if (dayNumber(exitDate, `${path}.exit_date`) < dayNumber(s.cumulativeDividend.accrualStart, "accrual_start")) {
      throw new InputError(`${path}.exit_date`, `${exitDate} is before ${s.name}'s dividends start to accrue, ${s.cumulativeDividend.accrualStart}`);
    }
  }

  const paymentSchedules = exit.payment_schedules == null ? [] : readSchedules(exit.payment_schedules, `${path}.payment_schedules`);

  return { capTable, range: [lo, hi], exitValues, exitDate, ...(paymentSchedules.length > 0 ? { paymentSchedules } : {}) };
}

/**
 * C6: a carve-out given on the exit, as a term of the sale. A cap table may still carry its own, for compatibility, but
 * not both: which one governs would be a guess. It is paid exactly as one on the cap table, and a note at the sale
 * alongside it is refused the same way (X12).
 */
function withSaleCarveOut(capTable: CapTable, value: unknown, path: string): CapTable {
  if (capTable.carveOut) throw new InputError(path, "the carve-out is on both the cap table and the exit; give it once (C6)");
  const carveOut = readCarveOut(value, new Set(capTable.holders.map((h) => h.id)), path);
  if ((capTable.unconvertedNotes ?? []).length > 0) {
    throw new UnsupportedTermError("note_with_safe_or_carve_out", "later", path, "A convertible note at a sale alongside a SAFE or a carve-out (X12)");
  }
  return { ...capTable, carveOut };
}

/** C7: each schedule has an id, an optional description, and payments, each a label and a positive amount. */
function readSchedules(value: unknown, path: string): PaymentSchedule[] {
  const ids = new Set<string>();
  return array(value, path).map((v, i) => {
    const at = `${path}[${i}]`;
    const sched = object(v, at);
    onlyKnownFields(sched, ["id", "description", "payments"], at);
    const id = text(sched.id, `${at}.id`);
    if (ids.has(id)) throw new InputError(`${at}.id`, `schedule ${id} is listed twice`);
    ids.add(id);
    const payments = array(sched.payments, `${at}.payments`).map((p, j) => {
      const pat = `${at}.payments[${j}]`;
      const pay = object(p, pat);
      onlyKnownFields(pay, ["label", "amount"], pat);
      return { label: text(pay.label, `${pat}.label`), amount: positive(pay.amount, `${pat}.amount`) };
    });
    if (payments.length === 0) throw new InputError(`${at}.payments`, "needs at least one payment");
    return { id, description: sched.description == null ? "" : text(sched.description, `${at}.description`), payments };
  });
}
