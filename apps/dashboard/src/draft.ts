// The cap table as the editor holds it: everything as typed, so a half-typed
// number stays on screen, and the engine reads it only when it's turned into
// an exit input (the case-file format, ASSUMPTIONS C1–C4).
//
// The editor covers what the engine supports at exit (M3 plan, answer 6):
// holders, common stock, options with strikes, preferred series with their
// preference, participation and cap, seniority tiers, one conversion group
// (E17 refuses more), the unissued pool, and the range to explore.
// Anti-dilution is kept as loaded but not edited: at exit it matters only
// through the conversion price, which is edited directly (SPEC, Anti-dilution).

import { D, InputError, UnsupportedTermError, prepare, readExit } from "spillpoint";
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
    });

export type DraftPreferred = Extract<DraftSecurity, { kind: "preferred" }>;

export interface Draft {
  holders: DraftHolder[];
  securities: DraftSecurity[];
  /** Shares as typed, by `${holder key}/${security key}`. Blank means no position. */
  shares: Record<string, string>;
  pool: string;
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

/** A draft of an exit input already in the case-file format, such as an example. */
/** A cap table the engine reads but the page can't show in full yet: refused, never shown with something left out. */
export class NotShownYet extends Error {
  override name = "NotShownYet";
}

export function draftFromExit(exit: unknown): Draft {
  const e = exit as Json;
  const ct = e.cap_table as Json;
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
  const securities = (ct.securities as Json[]).map((s, i): DraftSecurity => {
    // The editor shows common, options and preferred. Anything else is refused,
    // never turned into something it isn't: the engine pays warrants (E12,
    // R29), but the page shows them only from M5k.
    if (s.kind === "warrant") {
      throw new NotShownYet(`It has warrants, ${str(s.name)}, which this page doesn't show yet. It won't open a cap table it can't show in full.`);
    }
    if (s.kind !== "common" && s.kind !== "option" && s.kind !== "preferred") {
      throw new InputError(`cap_table.securities[${i}].kind`, `unknown security kind ${JSON.stringify(s.kind)}`);
    }
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
    if (s.kind === "preferred") {
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
      };
    }
    return { ...base, kind: "common" };
  });
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
  const range = e.range as unknown[];
  return {
    holders,
    securities,
    shares,
    pool: ct.unissued_pool == null || str(ct.unissued_pool) === "0" ? "" : grouped(ct.unissued_pool),
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
    };
  }
  return { ...d, securities: [...securities, added], nextKey: d.nextKey + 1 };
}

/** Removing a holder or a class removes its shares too, and a class leaves the conversion group. */
export function removeRow(d: Draft, key: string): Draft {
  const shares = Object.fromEntries(Object.entries(d.shares).filter(([k]) => !k.split("/").includes(key)));
  return {
    ...d,
    holders: d.holders.filter((h) => h.key !== key),
    securities: d.securities.filter((s) => s.key !== key),
    shares,
    group: { ...d.group, members: d.group.members.filter((m) => m !== key) },
  };
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
  json: { cap_table: Json; range: string[]; exit_values: string[] };
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
  shares: (holder: string, security: string) => `edit-shares-${holder}-${security}`,
  pool: "edit-pool",
  seniority: "edit-seniority",
  group: "edit-group",
  groupThreshold: "edit-group-threshold",
  groupRule: "edit-group-rule",
  rangeLow: "edit-range-low",
  rangeHigh: "edit-range-high",
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

  const securities = d.securities.map((s, i) => {
    const p = `securities[${i}]`;
    at(p, fieldId.securityName(s.key));
    const base = { id: securityIds.get(s.key)!, name: s.name.trim() };
    if (s.kind === "common") return { ...base, kind: "common" };
    if (s.kind === "option") {
      at(`${p}.strike`, fieldId.strike(s.key));
      return { ...base, kind: "option", strike: s.exact.strike ?? moneyText(s.strike) };
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

  return {
    json: {
      cap_table: {
        holders,
        securities,
        seniority,
        conversion_groups,
        positions,
        ...(d.pool.trim() ? { unissued_pool: shareText(d.pool) } : {}),
      },
      range: [moneyText(d.range[0]), moneyText(d.range[1])],
      exit_values: [],
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
    return { ok: true, exit, pc: prepare(exit.capTable) };
  } catch (e) {
    const error = e as Error;
    if (e instanceof InputError || e instanceof UnsupportedTermError) {
      const field = fieldForPath(b.fields, e.path);
      if (!field) return { ok: false, field: null, message: withoutCodes(e.message), error };
      const detail = withoutCodes(e.message.startsWith(`${e.path}: `) ? e.message.slice(e.path.length + 2) : e.message);
      return { ok: false, field, message: detail.charAt(0).toUpperCase() + detail.slice(1), error };
    }
    return { ok: false, field: null, message: withoutCodes(error.message), error };
  }
}
