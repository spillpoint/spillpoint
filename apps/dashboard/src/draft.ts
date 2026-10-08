// The cap table as the editor holds it: everything as typed, so a half-typed
// number stays on screen, and the engine reads it only when it's turned into
// an exit input (the case-file format, ASSUMPTIONS C1–C4).
//
// The editor covers what the engine supports at exit (M3 plan, answer 6):
// holders, common stock, options with strikes, preferred series with their
// preference, participation and cap, seniority tiers, one conversion group
// (E17 refuses more), the unissued pool, and the range to explore. Since M5k
// it also covers SAFEs and convertible notes still outstanding at a sale (C8,
// C9), and the sale's date, which notes accrue interest up to (X3); since
// M5k2, warrants (C4, R29) and a series' cumulative dividends (C5, X2–X5),
// which accrue up to the sale's date too; and since M5k3, a management
// carve-out (C6, X6, X7).
// Anti-dilution is kept as loaded but not edited: at exit it matters only
// through the conversion price, which is edited directly (SPEC, Anti-dilution).

import { D, InputError, UnsupportedTermError, parseExact, prepare, readExit } from "spillpoint";
import type { ExitInput, Participation, PreparedCapTable } from "spillpoint";

import { parseDollars, priceText, withoutCodes } from "./format.ts";

export interface DraftHolder {
  /** The editor's own handle, stable while names change. */
  key: string;
  /** The id from a loaded file, kept so saved files and errors match it; new holders get one from their name. */
  fileId: string | null;
  name: string;
}

interface DraftClassBase {
  key: string;
  fileId: string | null;
  name: string;
}

export type PriceField = "strike" | "originalIssuePrice" | "conversionPrice";

/** A series' cumulative dividends (C5): a rate as typed, as a percentage of the issue price a year. */
export interface DraftDividend {
  rate: string;
  /** Simple, Actual/365 (X2), or compounding once a year on the accrual start's anniversaries (X5). */
  method: "simple" | "compounding";
  accrualStart: string;
  /** What a series that converts does with them: gives them up, or is still paid them, in its own tier (X5). */
  onConversion: "forfeited" | "paid";
}

/**
 * A loaded price too long to read ("3900000/1879091", as rounds produce) is
 * shown to six decimal places, and its exact value is kept here and used
 * until someone edits the field; from then on, what they typed is used.
 */
type ExactPrices = Partial<Record<PriceField, string>>;

export type DraftSecurity =
  | (DraftClassBase & { kind: "common" })
  | (DraftClassBase & { kind: "option"; strike: string; exact: ExactPrices })
  | (DraftClassBase & {
      kind: "warrant";
      strike: string;
      /** What it buys: "common", or a preferred series by key; blank once that series is removed, for someone to choose again. */
      underlying: string;
      exact: ExactPrices;
    })
  | (DraftClassBase & {
      kind: "preferred";
      exact: ExactPrices;
      originalIssuePrice: string;
      /** Blank means the original issue price: no anti-dilution adjustment. */
      conversionPrice: string;
      preferenceMultiple: string;
      participation: Participation;
      /** Only read for participating_capped (E7). */
      capMultiple: string;
      /** 1 is paid first; series with the same number are pari passu (SPEC, Tiers). */
      rank: number;
      antiDilution: string;
      antiDilutionA: string | null;
      /** Null for none. */
      dividend: DraftDividend | null;
    });

export type DraftPreferred = Extract<DraftSecurity, { kind: "preferred" }>;

/** A SAFE still outstanding at a sale (C8): paid its Cash-Out Amount or its Conversion Amount, whichever is worth more (X1, X9, X13, X14). */
export interface DraftSafe {
  key: string;
  fileId: string | null;
  /** The holder, by editor key. */
  holder: string;
  purchaseAmount: string;
  /** Post-money and pre-money SAFEs differ in what their cap divides (X1, X14). */
  cap: "post" | "pre" | "none";
  capAmount: string;
  /** As a percentage, as people type it: "20" for a fraction of 0.2. */
  discount: string;
  /** The series whose tier its Cash-Out Amount joins, by key; null for the default, the most junior tier (X9). */
  ranksWith: string | null;
}

export type ConversionBase = "with_pool" | "without_pool" | "common_only";

/**
 * A management carve-out (C6): marginal tiers of the exit value from $0, each
 * starting where the one before ends, so only where each ends is typed; and
 * the people it's split among, by percentage.
 */
export interface DraftCarveOut {
  /** Paid before all preferences (the default), or alongside them in the most senior tier (X7). */
  timing: "before_preferences" | "alongside_preferences";
  /** Blank `to`: no upper end. Percentages of the exit value, as typed. */
  tiers: { key: string; to: string; percent: string }[];
  /** Each recipient, by holder key, with their share of it as a percentage. */
  allocation: { key: string; holder: string; percent: string }[];
}

/** A convertible note still outstanding at a sale (C9): repaid as debt, or converted, whichever is worth more (X3, X10–X12, X15). */
export interface DraftNote {
  key: string;
  fileId: string | null;
  holder: string;
  principal: string;
  /** Simple interest, as a percentage a year. */
  interestRate: string;
  issueDate: string;
  /** Pre-money; blank for none. */
  valuationCap: string;
  conversionBase: ConversionBase;
  discount: string;
  repaymentMultiple: string;
}

export interface Draft {
  holders: DraftHolder[];
  securities: DraftSecurity[];
  /** Shares as typed, by `${holder key}/${security key}`. Blank means no position. */
  shares: Record<string, string>;
  pool: string;
  /** SAFEs and convertible notes still outstanding at the sale, in the order loaded or added. */
  safes: DraftSafe[];
  notes: DraftNote[];
  /** The sale's date, YYYY-MM-DD, or blank: notes accrue interest up to it (X3, C9). */
  exitDate: string;
  /** Null for none. */
  carveOut: DraftCarveOut | null;
  /** The one conversion group: series that convert together by a class vote (E11). No members, no group. */
  group: { members: string[]; threshold: string; rule: "more_than" | "at_least" };
  range: [string, string];
  /**
   * The order a loaded file listed positions and tiers in, by key, so building
   * it back gives the engine the same input: reasons name a tier's series in
   * this order. New rows follow, in the editor's order.
   */
  order: string[];
  /** Hands out keys for new rows. */
  nextKey: number;
}

export const sharesKey = (holder: string, security: string) => `${holder}/${security}`;

// ---------- reading an exit input into a draft ----------

type Json = Record<string, unknown>;

const str = (v: unknown) => (v == null ? "" : String(v));
/** Share counts are shown grouped, as founders write them. */
const grouped = (v: unknown) => {
  const s = str(v);
  return /^\d+$/.test(s) ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s;
};

/**
 * "0.2" → "20": a fraction as the percentage people type, exactly. Blank
 * stays blank; anything unreadable stays as it is. The percentage is shown in
 * full, so turning it back gives the engine the same number: even "1/3" comes
 * back as the 40-digit decimal the engine reads it as (E14).
 */
export function fractionToPercent(v: unknown): string {
  if (v == null || v === "") return "";
  try {
    return parseExact(v, "percent").times(100).toFixed();
  } catch {
    return String(v);
  }
}

/** "6.5" or "6.5%" → "0.065", exactly; blank stays blank; anything else goes through as typed, for the engine to name. */
export function percentToFraction(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const t = percentText(v);
  if (t === "") return "";
  return /^\d+(\.\d+)?$/.test(t) ? new D(t).div(100).toFixed() : t;
}

/** A cap table the page can't show in full: refused, never shown with something left out or read as something else. */
export class NotShownYet extends Error {
  override name = "NotShownYet";
  /** False for a field nobody models, such as a misspelling: then the engine's own message says more. */
  readonly known: boolean;

  constructor(message: string, known = true) {
    super(message);
    this.known = known;
  }
}

/** What the editor carries, kind by kind. Anything else on a cap table is refused, never dropped. */
const SHOWN_FIELDS: Record<string, readonly string[]> = {
  common: ["id", "name", "kind"],
  option: ["id", "name", "kind", "strike"],
  warrant: ["id", "name", "kind", "strike", "underlying"],
  preferred: [
    "id", "name", "kind", "original_issue_price", "conversion_price", "conversion_ratio", "preference_multiple",
    "participation", "cap_multiple", "anti_dilution", "anti_dilution_a", "cumulative_dividend", "approx",
  ],
};
const SHOWN_TABLE_FIELDS = [
  "holders", "securities", "seniority", "conversion_groups", "positions", "unissued_pool", "unconverted_safes", "unconverted_notes", "carve_out", "totals",
];
/** What the editor carries for each SAFE and note still outstanding (C8, C9). */
const SHOWN_OUTSTANDING_FIELDS: Record<"unconverted_safes" | "unconverted_notes", readonly string[]> = {
  unconverted_safes: ["id", "holder", "purchase_amount", "post_money_cap", "pre_money_cap", "discount", "cash_out_ranks_with"],
  unconverted_notes: [
    "id", "holder", "principal", "interest_rate", "interest_method", "issue_date", "valuation_cap", "cap_type", "conversion_base", "discount", "repayment_multiple",
  ],
};
/**
 * Terms the engine models that the page doesn't show yet, by field, as a
 * founder would name them. None is left since M5k3; the check stays for the
 * next one.
 */
const TERM_NAMES: Record<string, string> = {};

/**
 * The page shows a cap table only if it can show all of it. A security of a
 * kind it doesn't know is refused, never treated as common stock; so is a term
 * it doesn't carry, such as a series' cumulative dividends, never dropped.
 * Run before anything else reads the cap table, so a founder hears what the
 * page can't show rather than what the engine would need to run it.
 */
export function checkShown(capTable: unknown): void {
  if (capTable == null || typeof capTable !== "object") return;
  const ct = capTable as Json;
  const refuse = (what: string, known = true) => {
    throw new NotShownYet(`It has ${what}, which this page doesn't show yet. It won't open a cap table it can't show in full.`, known);
  };
  for (const field of Object.keys(ct)) {
    const value = ct[field];
    const empty = value == null || (Array.isArray(value) && value.length === 0);
    if (!SHOWN_TABLE_FIELDS.includes(field) && !empty) refuse(TERM_NAMES[field] ?? `"${field}"`, field in TERM_NAMES);
  }
  if (Array.isArray(ct.conversion_groups) && ct.conversion_groups.length > 1) refuse("more than one group of series that must convert together");
  const holderName = (id: unknown) => str((Array.isArray(ct.holders) ? (ct.holders as Json[]) : []).find((h) => h?.id === id)?.name) || str(id);
  for (const list of ["unconverted_safes", "unconverted_notes"] as const) {
    if (!Array.isArray(ct[list])) continue;
    for (const x of ct[list] as Json[]) {
      if (x == null || typeof x !== "object") continue;
      const extra = Object.keys(x).find((f) => !SHOWN_OUTSTANDING_FIELDS[list].includes(f) && x[f] != null);
      if (extra) refuse(`"${extra}" on ${holderName(x.holder)}'s ${list === "unconverted_safes" ? "SAFE" : "convertible note"}`, false);
    }
  }
  // C6: what the editor carries for a carve-out, at each level.
  const carve = ct.carve_out as Json | null | undefined;
  if (carve != null && typeof carve === "object") {
    const extra = (x: unknown, fields: string[]) => (x != null && typeof x === "object" ? Object.keys(x).find((f) => !fields.includes(f) && (x as Json)[f] != null) : undefined);
    const found =
      extra(carve, ["timing", "tiers", "allocation"]) ??
      [...(Array.isArray(carve.tiers) ? carve.tiers : []), ...(Array.isArray(carve.allocation) ? carve.allocation : [])]
        .map((x) => extra(x, ["from", "to", "percent", "holder"]))
        .find(Boolean);
    if (found) refuse(`"${found}" on its management carve-out`, false);
  }
  if (!Array.isArray(ct.securities)) return;
  for (const s of ct.securities as Json[]) {
    if (s == null || typeof s !== "object") continue;
    const name = str(s.name) || str(s.id);
    const fields = SHOWN_FIELDS[str(s.kind)];
    if (!fields) {
      throw new NotShownYet(
        `It has ${name}, a kind of security ("${str(s.kind)}") this page doesn't know. It won't open the cap table rather than treat it as something it isn't.`,
      );
    }
    const extra = Object.keys(s).find((f) => !fields.includes(f) && s[f] != null);
    if (extra) refuse(`${TERM_NAMES[extra] ?? `"${extra}"`} on ${name}`, extra in TERM_NAMES);
  }
}

/** A draft of an exit input already in the case-file format, such as an example. */
export function draftFromExit(exit: unknown): Draft {
  const e = exit as Json;
  const ct = e.cap_table as Json;
  checkShown(ct);
  let n = 0;
  const key = () => `k${++n}`;
  const holderKeys = new Map<string, string>();
  const holders = (ct.holders as Json[]).map((h) => {
    const k = key();
    holderKeys.set(str(h.id), k);
    return { key: k, fileId: str(h.id), name: str(h.name) };
  });
  const tierOf = new Map<string, number>();
  (ct.seniority as string[][]).forEach((tier, i) => tier.forEach((sid) => tierOf.set(sid, i + 1)));
  const securityKeys = new Map<string, string>();
  // checkShown has refused anything but common, options and preferred, with only the fields the editor carries.
  const securities = (ct.securities as Json[]).map((s): DraftSecurity => {
    const k = key();
    const id = str(s.id);
    securityKeys.set(id, k);
    const base = { key: k, fileId: id, name: str(s.name) };
    const exact: ExactPrices = {};
    const shown = (field: PriceField, price: string) => {
      const text = priceText(price);
      if (text !== price) exact[field] = price;
      return text;
    };
    if (s.kind === "option") return { ...base, kind: "option", strike: shown("strike", str(s.strike)), exact };
    // Its underlying is the series' id for now: the series may come later in the list. Made a key below.
    if (s.kind === "warrant") return { ...base, kind: "warrant", strike: shown("strike", str(s.strike)), underlying: str(s.underlying), exact };
    if (s.kind === "preferred") {
      const div = s.cumulative_dividend as Json | null | undefined;
      const oip = str(s.original_issue_price);
      const cp = str(s.conversion_price);
      return {
        ...base,
        kind: "preferred",
        exact,
        originalIssuePrice: shown("originalIssuePrice", oip),
        // Blank: the same as the issue price, exactly.
        conversionPrice: cp === oip || cp === "" ? "" : shown("conversionPrice", cp),
        preferenceMultiple: str(s.preference_multiple),
        participation: s.participation as Participation,
        capMultiple: str(s.cap_multiple),
        rank: tierOf.get(id) ?? 1,
        antiDilution: str(s.anti_dilution) || "none",
        antiDilutionA: s.anti_dilution_a == null ? null : str(s.anti_dilution_a),
        dividend:
          div == null
            ? null
            : {
                rate: fractionToPercent(div.rate),
                method: div.method === "compounding" ? "compounding" : "simple",
                accrualStart: str(div.accrual_start),
                onConversion: div.on_conversion === "paid" ? "paid" : "forfeited",
              },
      };
    }
    return { ...base, kind: "common" };
  });
  for (const s of securities) if (s.kind === "warrant" && s.underlying !== "common") s.underlying = securityKeys.get(s.underlying) ?? "";
  const shares: Record<string, string> = {};
  const order: string[] = (ct.seniority as string[][]).flat().map((sid) => securityKeys.get(sid)!);
  for (const p of ct.positions as Json[]) {
    const k = sharesKey(holderKeys.get(str(p.holder))!, securityKeys.get(str(p.security))!);
    shares[k] = grouped(p.shares);
    order.push(k);
  }
  // C4: a bare list is "more than 50%"; the editor shows the long form.
  const g = ((ct.conversion_groups as unknown[] | undefined) ?? [])[0];
  const group: Draft["group"] =
    g == null
      ? { members: [], threshold: "50", rule: "more_than" }
      : Array.isArray(g)
        ? { members: g.map((sid) => securityKeys.get(str(sid))!), threshold: "50", rule: "more_than" }
        : {
            members: ((g as Json).series as string[]).map((sid) => securityKeys.get(sid)!),
            threshold: str((g as Json).vote_threshold_percent) || "50",
            rule: (g as Json).vote_rule === "at_least" ? "at_least" : "more_than",
          };
  const holderKey = (id: unknown) => holderKeys.get(str(id)) ?? str(id);
  const safes = ((ct.unconverted_safes as Json[] | undefined) ?? []).map(
    (f): DraftSafe => ({
      key: key(),
      fileId: str(f.id),
      holder: holderKey(f.holder),
      purchaseAmount: str(f.purchase_amount),
      cap: f.post_money_cap != null ? "post" : f.pre_money_cap != null ? "pre" : "none",
      capAmount: str(f.post_money_cap ?? f.pre_money_cap),
      discount: fractionToPercent(f.discount),
      ranksWith: f.cash_out_ranks_with == null ? null : (securityKeys.get(str(f.cash_out_ranks_with)) ?? null),
    }),
  );
  const notes = ((ct.unconverted_notes as Json[] | undefined) ?? []).map(
    (x): DraftNote => ({
      key: key(),
      fileId: str(x.id),
      holder: holderKey(x.holder),
      principal: str(x.principal),
      interestRate: fractionToPercent(x.interest_rate),
      issueDate: str(x.issue_date),
      valuationCap: str(x.valuation_cap),
      conversionBase: (str(x.conversion_base) || "with_pool") as ConversionBase,
      discount: fractionToPercent(x.discount),
      repaymentMultiple: str(x.repayment_multiple),
    }),
  );
  const carve = ct.carve_out as Json | null | undefined;
  const carveOut: DraftCarveOut | null =
    carve == null
      ? null
      : {
          timing: carve.timing === "alongside_preferences" ? "alongside_preferences" : "before_preferences",
          // C6: each tier starts where the one before ends, which the engine checks, so only its end is kept.
          tiers: ((carve.tiers as Json[] | undefined) ?? []).map((t) => ({ key: key(), to: str(t.to), percent: str(t.percent) })),
          allocation: ((carve.allocation as Json[] | undefined) ?? []).map((a) => ({ key: key(), holder: holderKey(a.holder), percent: str(a.percent) })),
        };
  const range = e.range as unknown[];
  return {
    holders,
    securities,
    shares,
    pool: ct.unissued_pool == null || str(ct.unissued_pool) === "0" ? "" : grouped(ct.unissued_pool),
    safes,
    notes,
    exitDate: str(e.exit_date),
    carveOut,
    group,
    range: [str(range[0]), str(range[1])],
    order,
    nextKey: n + 1,
  };
}

/** Starting from scratch: one founder with all the common stock, and a range to explore. */
export function scratchDraft(): Draft {
  return {
    holders: [{ key: "k1", fileId: null, name: "Founder" }],
    securities: [{ key: "k2", fileId: null, kind: "common", name: "Common Stock" }],
    shares: { [sharesKey("k1", "k2")]: "10,000,000" },
    pool: "",
    safes: [],
    notes: [],
    exitDate: "",
    carveOut: null,
    group: { members: [], threshold: "50", rule: "more_than" },
    range: ["0", "100000000"],
    order: [],
    nextKey: 3,
  };
}

// ---------- edits ----------

/** Typing in a price field: from now on the typed price is used, not the exact one it was loaded with. */
export function setPrice(d: Draft, key: string, field: PriceField, text: string): Draft {
  return {
    ...d,
    securities: d.securities.map((s) => {
      if (s.key !== key || s.kind === "common") return s;
      const { [field]: _dropped, ...exact } = s.exact;
      return { ...s, [field]: text, exact } as DraftSecurity;
    }),
  };
}

export function addHolder(d: Draft): Draft {
  const key = `k${d.nextKey}`;
  return { ...d, holders: [...d.holders, { key, fileId: null, name: "New holder" }], nextKey: d.nextKey + 1 };
}

export function addSecurity(d: Draft, kind: DraftSecurity["kind"]): Draft {
  const key = `k${d.nextKey}`;
  const base = { key, fileId: null };
  let added: DraftSecurity;
  let securities = d.securities;
  if (kind === "common") added = { ...base, kind, name: "Common Stock" };
  else if (kind === "option") added = { ...base, kind, name: "New option class", strike: "0", exact: {} };
  else if (kind === "warrant") added = { ...base, kind, name: "New warrant class", strike: "0", underlying: "common", exact: {} };
  else {
    // A new series gets a tier of its own, paid first, as later rounds usually are; change it under "Who is paid first".
    securities = securities.map((s) => (s.kind === "preferred" ? { ...s, rank: s.rank + 1 } : s));
    added = {
      ...base,
      kind,
      name: "New preferred series",
      exact: {},
      originalIssuePrice: "1",
      conversionPrice: "",
      preferenceMultiple: "1",
      participation: "non_participating",
      capMultiple: "",
      rank: 1,
      antiDilution: "none",
      antiDilutionA: null,
      dividend: null,
    };
  }
  return { ...d, securities: [...securities, added], nextKey: d.nextKey + 1 };
}

/**
 * Removing a holder or a class removes its shares too; a holder's SAFEs and
 * notes go with it; a class leaves the conversion group, a SAFE that ranked
 * with it goes back to the default, the most junior tier (X9), and a warrant
 * for it is left asking which class it buys, never quietly given another.
 */
export function removeRow(d: Draft, key: string): Draft {
  const shares = Object.fromEntries(Object.entries(d.shares).filter(([k]) => !k.split("/").includes(key)));
  return {
    ...d,
    holders: d.holders.filter((h) => h.key !== key),
    securities: d.securities.filter((s) => s.key !== key).map((s) => (s.kind === "warrant" && s.underlying === key ? { ...s, underlying: "" } : s)),
    shares,
    safes: d.safes.filter((f) => f.holder !== key).map((f) => (f.ranksWith === key ? { ...f, ranksWith: null } : f)),
    notes: d.notes.filter((n) => n.holder !== key),
    // A holder's share of the carve-out goes with them; the shares left then don't add up to 100%, which the engine says.
    carveOut: d.carveOut && { ...d.carveOut, allocation: d.carveOut.allocation.filter((a) => a.holder !== key) },
    group: { ...d.group, members: d.group.members.filter((m) => m !== key) },
  };
}

/** How many SAFEs and notes a holder has outstanding, for the "remove?" question. */
export function outstandingHeldBy(d: Draft, key: string): { safes: number; notes: number } {
  return { safes: d.safes.filter((f) => f.holder === key).length, notes: d.notes.filter((n) => n.holder === key).length };
}

/** A new SAFE, for the first holder: a post-money cap, the YC standard, with its amounts blank for the engine to ask for. */
export function addSafe(d: Draft): Draft {
  const safe: DraftSafe = {
    key: `k${d.nextKey}`, fileId: null, holder: d.holders[0]?.key ?? "", purchaseAmount: "", cap: "post", capAmount: "", discount: "", ranksWith: null,
  };
  return { ...d, safes: [...d.safes, safe], nextKey: d.nextKey + 1 };
}

/** A new note, for the first holder: the common terms (C9's defaults), with its amounts and dates blank. */
export function addNote(d: Draft): Draft {
  const note: DraftNote = {
    key: `k${d.nextKey}`, fileId: null, holder: d.holders[0]?.key ?? "", principal: "", interestRate: "", issueDate: "", valuationCap: "",
    conversionBase: "with_pool", discount: "", repaymentMultiple: "1",
  };
  return { ...d, notes: [...d.notes, note], nextKey: d.nextKey + 1 };
}

/** One SAFE or note changed. */
export function setSafe(d: Draft, key: string, change: Partial<DraftSafe>): Draft {
  return { ...d, safes: d.safes.map((f) => (f.key === key ? { ...f, ...change } : f)) };
}
export function setNote(d: Draft, key: string, change: Partial<DraftNote>): Draft {
  return { ...d, notes: d.notes.map((n) => (n.key === key ? { ...n, ...change } : n)) };
}

/** A new carve-out, before all preferences (the default, C6), one tier with no upper end, all to the first holder. */
export function addCarveOut(d: Draft): Draft {
  const n = d.nextKey;
  return {
    ...d,
    carveOut: { timing: "before_preferences", tiers: [{ key: `k${n}`, to: "", percent: "" }], allocation: [{ key: `k${n + 1}`, holder: d.holders[0]?.key ?? "", percent: "100" }] },
    nextKey: n + 2,
  };
}

/** A new row in the carve-out: a tier after the last, or a recipient with no share yet. */
export function addCarveOutRow(d: Draft, list: "tiers" | "allocation"): Draft {
  if (!d.carveOut) return d;
  const key = `k${d.nextKey}`;
  const carveOut =
    list === "tiers"
      ? { ...d.carveOut, tiers: [...d.carveOut.tiers, { key, to: "", percent: "" }] }
      : { ...d.carveOut, allocation: [...d.carveOut.allocation, { key, holder: d.holders[0]?.key ?? "", percent: "" }] };
  return { ...d, carveOut, nextKey: d.nextKey + 1 };
}

export function removeOutstanding(d: Draft, key: string): Draft {
  return { ...d, safes: d.safes.filter((f) => f.key !== key), notes: d.notes.filter((n) => n.key !== key) };
}

/** The shares one row holds, as typed and readable, for the "remove?" question. */
export function sharesHeldBy(d: Draft, key: string): D {
  let total = new D(0);
  for (const [k, v] of Object.entries(d.shares)) {
    const n = v.replace(/[,\s]/g, "");
    if (k.split("/").includes(key) && /^\d+$/.test(n)) total = total.plus(n);
  }
  return total;
}

// ---------- building the exit input ----------

/** Keys in the loaded file's order first, then the rest as they come. */
function inLoadedOrder<T>(items: T[], key: (item: T) => string, order: readonly string[]): T[] {
  const at = new Map(order.map((k, i) => [k, i]));
  return items
    .map((item, i) => ({ item, rank: at.get(key(item)) ?? order.length + i }))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.item);
}

/** What one editor field is called in the engine's error paths, so its message lands next to it. */
export interface Built {
  /** The exit input, in the case-file format. */
  json: { cap_table: Json; range: string[]; exit_values: string[]; exit_date?: string };
  /** Engine path ("exit.cap_table.securities[2].cap_multiple") to the editor field it names. */
  fields: Map<string, string>;
  /** Each holder's id in this input, by editor key; and back. */
  holderIds: Map<string, string>;
}

/** The DOM id of an editor field. Section ids stand in where an error names no single field. */
export const fieldId = {
  holderName: (key: string) => `edit-holder-${key}`,
  securityName: (key: string) => `edit-class-${key}`,
  strike: (key: string) => `edit-strike-${key}`,
  originalIssuePrice: (key: string) => `edit-oip-${key}`,
  conversionPrice: (key: string) => `edit-cp-${key}`,
  preferenceMultiple: (key: string) => `edit-pref-${key}`,
  participation: (key: string) => `edit-part-${key}`,
  capMultiple: (key: string) => `edit-cap-${key}`,
  underlying: (key: string) => `edit-underlying-${key}`,
  dividend: (key: string) => `edit-dividend-${key}`,
  dividendRate: (key: string) => `edit-dividend-rate-${key}`,
  dividendMethod: (key: string) => `edit-dividend-method-${key}`,
  dividendStart: (key: string) => `edit-dividend-start-${key}`,
  dividendOnConversion: (key: string) => `edit-dividend-conversion-${key}`,
  shares: (holder: string, security: string) => `edit-shares-${holder}-${security}`,
  pool: "edit-pool",
  seniority: "edit-seniority",
  group: "edit-group",
  groupThreshold: "edit-group-threshold",
  groupRule: "edit-group-rule",
  rangeLow: "edit-range-low",
  rangeHigh: "edit-range-high",
  exitDate: "edit-exit-date",
  /** The card listing SAFEs and notes: where a message about them all goes. */
  outstanding: "edit-outstanding",
  carveOut: "edit-carve-out",
  carveTiming: "edit-carve-timing",
  carveTiers: "edit-carve-tiers",
  carveAllocation: "edit-carve-allocation",
  carveTier: (key: string) => `edit-carve-tier-${key}`,
  carveTo: (key: string) => `edit-carve-to-${key}`,
  carvePercent: (key: string) => `edit-carve-percent-${key}`,
  carveHolder: (key: string) => `edit-carve-holder-${key}`,
  carveShare: (key: string) => `edit-carve-share-${key}`,
  safe: (key: string) => `edit-safe-${key}`,
  safeHolder: (key: string) => `edit-safe-holder-${key}`,
  safeAmount: (key: string) => `edit-safe-amount-${key}`,
  safeCapKind: (key: string) => `edit-safe-cap-kind-${key}`,
  safeCap: (key: string) => `edit-safe-cap-${key}`,
  safeDiscount: (key: string) => `edit-safe-discount-${key}`,
  safeRanks: (key: string) => `edit-safe-ranks-${key}`,
  note: (key: string) => `edit-note-${key}`,
  noteHolder: (key: string) => `edit-note-holder-${key}`,
  notePrincipal: (key: string) => `edit-note-principal-${key}`,
  noteInterest: (key: string) => `edit-note-interest-${key}`,
  noteIssued: (key: string) => `edit-note-issued-${key}`,
  noteCap: (key: string) => `edit-note-cap-${key}`,
  noteBase: (key: string) => `edit-note-base-${key}`,
  noteDiscount: (key: string) => `edit-note-discount-${key}`,
  noteRepayment: (key: string) => `edit-note-repayment-${key}`,
} as const;

/** "Ana Ortiz" → "ana_ortiz": a readable id, since the engine's messages name ids. */
function slug(name: string, fallback: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || fallback;
}

/** Ids for every row: loaded ids as they were, new ones from the name, each unique. */
export function assignIds<T extends { key: string; fileId: string | null; name: string }>(rows: readonly T[], fallback: string): Map<string, string> {
  const taken = new Set(rows.flatMap((r) => (r.fileId ? [r.fileId] : [])));
  const ids = new Map<string, string>();
  for (const r of rows) {
    if (r.fileId) {
      ids.set(r.key, r.fileId);
      continue;
    }
    const base = slug(r.name, fallback);
    let id = base;
    for (let i = 2; taken.has(id); i++) id = `${base}_${i}`;
    taken.add(id);
    ids.set(r.key, id);
  }
  return ids;
}

// What founders type, made into the engine's exact-number strings (C1). Anything
// that still isn't a number goes through as typed, so the engine's message names it.
export const shareText = (t: string) => t.replace(/[,\s]/g, "");
export const moneyText = (t: string) => parseDollars(t)?.toString() ?? t.trim();
export const multipleText = (t: string) => t.trim().replace(/\s*[x×]$/i, "");
export const percentText = (t: string) => t.trim().replace(/\s*%$/, "");

/** The seniority tiers, most senior first (SPEC, Tiers): series with the same rank share a tier, in the loaded file's order. */
export function tiers(d: Draft): DraftPreferred[][] {
  const preferred = d.securities.filter((s): s is DraftPreferred => s.kind === "preferred");
  const ranks = [...new Set(preferred.map((s) => s.rank))].sort((a, b) => a - b);
  return ranks.map((r) =>
    inLoadedOrder(
      preferred.filter((s) => s.rank === r),
      (s) => s.key,
      d.order,
    ),
  );
}

export function buildExit(d: Draft): Built {
  const fields = new Map<string, string>();
  const at = (path: string, field: string) => fields.set(`exit.cap_table.${path}`, field);

  const holderIds = assignIds(d.holders, "holder");
  const securityIds = assignIds(d.securities, "class");
  const holders = d.holders.map((h, i) => {
    at(`holders[${i}]`, fieldId.holderName(h.key));
    return { id: holderIds.get(h.key)!, name: h.name.trim() };
  });

  /** C5's fields, the rate as the engine's fraction. A blank rate goes through as typed, for the engine to ask for. */
  const dividendJson = (s: DraftPreferred, p: string) => {
    const div = s.dividend!;
    at(p, fieldId.dividend(s.key));
    at(`${p}.rate`, fieldId.dividendRate(s.key));
    at(`${p}.method`, fieldId.dividendMethod(s.key));
    at(`${p}.accrual_start`, fieldId.dividendStart(s.key));
    at(`${p}.on_conversion`, fieldId.dividendOnConversion(s.key));
    return { rate: div.rate.trim() ? percentToFraction(div.rate) : "", method: div.method, accrual_start: div.accrualStart.trim(), on_conversion: div.onConversion };
  };
  const securities = d.securities.map((s, i) => {
    const p = `securities[${i}]`;
    at(p, fieldId.securityName(s.key));
    const base = { id: securityIds.get(s.key)!, name: s.name.trim() };
    if (s.kind === "common") return { ...base, kind: "common" };
    if (s.kind === "option") {
      at(`${p}.strike`, fieldId.strike(s.key));
      return { ...base, kind: "option", strike: s.exact.strike ?? moneyText(s.strike) };
    }
    if (s.kind === "warrant") {
      at(`${p}.strike`, fieldId.strike(s.key));
      at(`${p}.underlying`, fieldId.underlying(s.key));
      // C4: "common", or the series' id; blank, for the engine to ask for, once its series is gone.
      const underlying = s.underlying === "common" ? "common" : (securityIds.get(s.underlying) ?? "");
      return { ...base, kind: "warrant", strike: s.exact.strike ?? moneyText(s.strike), underlying };
    }
    at(`${p}.original_issue_price`, fieldId.originalIssuePrice(s.key));
    at(`${p}.conversion_price`, fieldId.conversionPrice(s.key));
    at(`${p}.preference_multiple`, fieldId.preferenceMultiple(s.key));
    at(`${p}.participation`, fieldId.participation(s.key));
    at(`${p}.cap_multiple`, fieldId.capMultiple(s.key));
    const capped = s.participation === "participating_capped";
    return {
      ...base,
      kind: "preferred",
      original_issue_price: s.exact.originalIssuePrice ?? moneyText(s.originalIssuePrice),
      ...(s.exact.conversionPrice
        ? { conversion_price: s.exact.conversionPrice }
        : s.conversionPrice.trim()
          ? { conversion_price: moneyText(s.conversionPrice) }
          : {}),
      preference_multiple: multipleText(s.preferenceMultiple),
      participation: s.participation,
      cap_multiple: capped ? multipleText(s.capMultiple) : null,
      anti_dilution: s.antiDilution,
      ...(s.antiDilutionA != null ? { anti_dilution_a: s.antiDilutionA } : {}),
      ...(s.dividend ? { cumulative_dividend: dividendJson(s, `${p}.cumulative_dividend`) } : {}),
    };
  });

  const seniority = tiers(d).map((tier) => tier.map((s) => securityIds.get(s.key)!));
  at("seniority", fieldId.seniority);

  const members = d.group.members.filter((m) => d.securities.some((s) => s.key === m));
  const conversion_groups =
    members.length === 0
      ? []
      : [{ series: members.map((m) => securityIds.get(m)!), vote_threshold_percent: percentText(d.group.threshold), vote_rule: d.group.rule }];
  at("conversion_groups", fieldId.group);
  at("conversion_groups[0]", fieldId.group);
  at("conversion_groups[0].vote_threshold_percent", fieldId.groupThreshold);
  at("conversion_groups[0].vote_rule", fieldId.groupRule);

  const cells = d.holders.flatMap((h) => d.securities.map((s) => ({ h, s, key: sharesKey(h.key, s.key) })));
  const positions: Json[] = [];
  for (const { h, s, key } of inLoadedOrder(cells, (c) => c.key, d.order)) {
    const typed = (d.shares[key] ?? "").trim();
    if (!typed) continue;
    at(`positions[${positions.length}]`, fieldId.shares(h.key, s.key));
    positions.push({ holder: holderIds.get(h.key)!, security: securityIds.get(s.key)!, shares: shareText(typed) });
  }

  at("unissued_pool", fieldId.pool);
  fields.set("exit.range", fieldId.rangeHigh);
  fields.set("exit.range[0]", fieldId.rangeLow);
  fields.set("exit.range[1]", fieldId.rangeHigh);
  fields.set("exit.exit_date", fieldId.exitDate);

  // SAFEs and notes still outstanding (C8, C9). Their ids must differ from every class's and each other's.
  const outstandingIds = new Map<string, string>();
  const taken = new Set([...securityIds.values(), ...[...d.safes, ...d.notes].flatMap((x) => (x.fileId ? [x.fileId] : []))]);
  for (const [base, rows] of [["safe", d.safes], ["note", d.notes]] as const) {
    for (const x of rows) {
      let id = x.fileId ?? base;
      for (let i = 2; !x.fileId && taken.has(id); i++) id = `${base}_${i}`;
      taken.add(id);
      outstandingIds.set(x.key, id);
    }
  }
  const holderId = (key: string) => holderIds.get(key) ?? key;
  /** A rate typed as a percentage, as the engine's fraction; blank leaves it out, for the engine's default. */
  const rate = (typed: string) => (typed.trim() ? percentToFraction(typed) : undefined);
  at("unconverted_safes", fieldId.outstanding);
  const unconverted_safes = d.safes.map((f, i) => {
    const p = `unconverted_safes[${i}]`;
    at(p, fieldId.safe(f.key));
    at(`${p}.holder`, fieldId.safeHolder(f.key));
    at(`${p}.purchase_amount`, fieldId.safeAmount(f.key));
    at(`${p}.post_money_cap`, fieldId.safeCap(f.key));
    at(`${p}.pre_money_cap`, fieldId.safeCap(f.key));
    at(`${p}.discount`, fieldId.safeDiscount(f.key));
    at(`${p}.cash_out_ranks_with`, fieldId.safeRanks(f.key));
    const discount = rate(f.discount);
    const ranksWith = f.ranksWith ? securityIds.get(f.ranksWith) : undefined;
    return {
      id: outstandingIds.get(f.key)!,
      holder: holderId(f.holder),
      purchase_amount: moneyText(f.purchaseAmount),
      ...(f.cap === "post" ? { post_money_cap: moneyText(f.capAmount) } : f.cap === "pre" ? { pre_money_cap: moneyText(f.capAmount) } : {}),
      ...(discount !== undefined ? { discount } : {}),
      ...(ranksWith ? { cash_out_ranks_with: ranksWith } : {}),
    };
  });
  at("unconverted_notes", fieldId.outstanding);
  const unconverted_notes = d.notes.map((n, i) => {
    const p = `unconverted_notes[${i}]`;
    at(p, fieldId.note(n.key));
    at(`${p}.holder`, fieldId.noteHolder(n.key));
    at(`${p}.principal`, fieldId.notePrincipal(n.key));
    at(`${p}.interest_rate`, fieldId.noteInterest(n.key));
    at(`${p}.issue_date`, fieldId.noteIssued(n.key));
    at(`${p}.valuation_cap`, fieldId.noteCap(n.key));
    at(`${p}.conversion_base`, fieldId.noteBase(n.key));
    at(`${p}.discount`, fieldId.noteDiscount(n.key));
    at(`${p}.repayment_multiple`, fieldId.noteRepayment(n.key));
    const discount = rate(n.discount);
    return {
      id: outstandingIds.get(n.key)!,
      holder: holderId(n.holder),
      principal: moneyText(n.principal),
      // A blank rate goes through as typed, so the engine asks for it: a note's interest has no default.
      interest_rate: rate(n.interestRate) ?? "",
      interest_method: "simple",
      issue_date: n.issueDate.trim(),
      valuation_cap: n.valuationCap.trim() ? moneyText(n.valuationCap) : null,
      cap_type: "pre_money",
      conversion_base: n.conversionBase,
      ...(discount !== undefined ? { discount } : {}),
      repayment_multiple: multipleText(n.repaymentMultiple),
    };
  });

  // C6: each tier starts where the one before ends, at $0 for the first; a message about where one starts names the end before it.
  const carve = d.carveOut;
  let carve_out: Json | undefined;
  if (carve) {
    at("carve_out", fieldId.carveOut);
    at("carve_out.timing", fieldId.carveTiming);
    at("carve_out.tiers", fieldId.carveTiers);
    at("carve_out.allocation", fieldId.carveAllocation);
    const tiers = carve.tiers.map((t, i) => {
      const p = `carve_out.tiers[${i}]`;
      at(p, fieldId.carveTier(t.key));
      at(`${p}.from`, i === 0 ? fieldId.carveTier(t.key) : fieldId.carveTo(carve.tiers[i - 1]!.key));
      at(`${p}.to`, fieldId.carveTo(t.key));
      at(`${p}.percent`, fieldId.carvePercent(t.key));
      const before = carve.tiers[i - 1];
      return {
        from: i === 0 ? "0" : before!.to.trim() ? moneyText(before!.to) : null,
        to: t.to.trim() ? moneyText(t.to) : null,
        percent: percentText(t.percent),
      };
    });
    const allocation = carve.allocation.map((a, i) => {
      const p = `carve_out.allocation[${i}]`;
      at(p, fieldId.carveHolder(a.key));
      at(`${p}.holder`, fieldId.carveHolder(a.key));
      at(`${p}.percent`, fieldId.carveShare(a.key));
      return { holder: holderId(a.holder), percent: percentText(a.percent) };
    });
    carve_out = { timing: carve.timing, tiers, allocation };
  }

  return {
    json: {
      cap_table: {
        holders,
        securities,
        seniority,
        conversion_groups,
        positions,
        ...(d.pool.trim() ? { unissued_pool: shareText(d.pool) } : {}),
        ...(unconverted_safes.length > 0 ? { unconverted_safes } : {}),
        ...(unconverted_notes.length > 0 ? { unconverted_notes } : {}),
        ...(carve_out ? { carve_out } : {}),
      },
      range: [moneyText(d.range[0]), moneyText(d.range[1])],
      exit_values: [],
      ...(d.exitDate.trim() ? { exit_date: d.exitDate.trim() } : {}),
    },
    fields,
    holderIds,
  };
}

/**
 * The editor field an engine error names: the field at that path, or the
 * nearest one above it ("securities[2]" for "securities[2].id"). Null when it
 * names no field the editor shows.
 */
export function fieldForPath(fields: ReadonlyMap<string, string>, path: string): string | null {
  for (let p = path; p; p = p.replace(/(\.[^.[\]]+|\[\d+\])$/, "")) {
    const f = fields.get(p);
    if (f) return f;
    if (!/(\.[^.[\]]+|\[\d+\])$/.test(p)) break;
  }
  return null;
}

// ---------- asking the engine ----------

export type Checked =
  | { ok: true; exit: ExitInput; pc: PreparedCapTable }
  | {
      ok: false;
      field: string | null;
      /** What the page shows. */
      message: string;
      /** The engine's error as thrown, path and assumption codes included, for developers. */
      error: Error;
    };

/**
 * Reads the built input as the engine would (C12). When it says no, the
 * message goes next to the field it names, without the path, which the
 * field's place already says, and without assumption codes. A message
 * naming no field keeps its path.
 */
export function checkBuilt(b: Built): Checked {
  try {
    const exit = readExit(b.json);
    return { ok: true, exit, pc: prepare(exit.capTable, exit.exitDate) };
  } catch (e) {
    const error = e as Error;
    // X2, X3: a note's interest and a series' cumulative dividends accrue up to the sale, so the payouts need its date.
    // Said plainly, without the note's id.
    if (e instanceof InputError && e.path === "exit.exit_date" && b.json.exit_date === undefined) {
      const series = /^exit\.exit_date: (.+) accrues cumulative dividends/.exec(e.message)?.[1];
      const what = series ? `${series}'s cumulative dividends accrue` : "a convertible note accrues interest";
      return { ok: false, field: fieldId.exitDate, message: `Fill this in: ${what} up to the date of the sale.`, error };
    }
    if (e instanceof InputError || e instanceof UnsupportedTermError) {
      const field = fieldForPath(b.fields, e.path);
      if (!field) return { ok: false, field: null, message: withoutCodes(e.message), error };
      const detail = withoutCodes(e.message.startsWith(`${e.path}: `) ? e.message.slice(e.path.length + 2) : e.message);
      // A field left blank, said plainly, as the rounds editor says it.
      if (/^"" is not an exact number|^expected a non-empty string$/.test(detail)) return { ok: false, field, message: "Fill this in: it can't be blank.", error };
      return { ok: false, field, message: detail.charAt(0).toUpperCase() + detail.slice(1), error };
    }
    return { ok: false, field: null, message: withoutCodes(error.message), error };
  }
}
