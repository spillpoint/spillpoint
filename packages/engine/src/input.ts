// Reads an exit input in the case-file format (ASSUMPTIONS C1–C4) into the
// engine's model, checking everything the waterfall relies on.
//
// Two kinds of "no":
// - UnsupportedTermError for terms the engine doesn't model yet (dividends,
//   carve-outs, earnouts, and SAFEs and notes at exit). These are checked
//   first and refused, never skipped.
// - InputError for anything malformed. Unknown fields are errors too, so a
//   misspelt term can't be silently ignored.

import type { Decimal } from "decimal.js";

import { dayNumber } from "./dates.ts";
import { D, ONE, ZERO, parseExact } from "./decimal.ts";
import { InputError, UnsupportedTermError } from "./errors.ts";
import type {
  AntiDilution,
  CapTable,
  ConversionGroup,
  CumulativeDividend,
  ExitInput,
  Holder,
  Participation,
  Position,
  PreferredSeries,
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
  if (ct.carve_out != null) {
    throw new UnsupportedTermError("carve_out", "M5", `${path}.carve_out`, "Management carve-outs (X6, X7)");
  }
  if (Array.isArray(ct.unconverted_safes) && ct.unconverted_safes.length > 0) {
    throw new UnsupportedTermError("unconverted_safe", "M5", `${path}.unconverted_safes`, "SAFEs still outstanding at exit (X1)");
  }
  if (Array.isArray(ct.unconverted_notes) && ct.unconverted_notes.length > 0) {
    throw new UnsupportedTermError(
      "unconverted_note", "M5", `${path}.unconverted_notes`, "Convertible notes still outstanding at exit (X3, X10–X12)",
    );
  }
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

  return {
    holders,
    securities,
    seniority,
    conversionGroups,
    positions,
    unissuedPool: ct.unissued_pool == null ? ZERO : wholeShares(ct.unissued_pool, `${path}.unissued_pool`),
  };
}

// ---------- exits and cases ----------

// exit_date: dividends accrue to it (X2); notes, still refused at exit, will too.
const EXIT_FIELDS = ["cap_table", "cap_table_after_event", "range", "exit_values", "exit_date", "payment_schedules"] as const;

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
  if (exit.payment_schedules != null) {
    throw new UnsupportedTermError("payment_schedules", "M5", `${path}.payment_schedules`, "Escrow and earnout payment schedules (X8)");
  }
  onlyKnownFields(exit, EXIT_FIELDS, path);

  const capTable =
    exit.cap_table_after_event != null
      ? tableAfter(text(exit.cap_table_after_event, `${path}.cap_table_after_event`), `${path}.cap_table_after_event`)
      : readCapTable(exit.cap_table, `${path}.cap_table`);

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
  for (const s of capTable.securities) {
    if (s.kind !== "preferred" || !s.cumulativeDividend) continue;
    if (exitDate == null) throw new InputError(`${path}.exit_date`, `${s.name} accrues cumulative dividends, so the exit needs an exit_date`);
    if (dayNumber(exitDate, `${path}.exit_date`) < dayNumber(s.cumulativeDividend.accrualStart, "accrual_start")) {
      throw new InputError(`${path}.exit_date`, `${exitDate} is before ${s.name}'s dividends start to accrue, ${s.cumulativeDividend.accrualStart}`);
    }
  }

  return { capTable, range: [lo, hi], exitValues, exitDate };
}
