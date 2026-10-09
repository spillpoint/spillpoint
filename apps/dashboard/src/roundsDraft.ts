// The rounds as the editor holds them (M4j): each event's fields as typed,
// so a half-typed number stays on screen, read by the engine only when the
// rounds are built (C14's event format). Two things differ from the file:
// - events name holders by the editor's keys, so a holder can be renamed, or
//   added before it has a name; building gives each its id, as the cap table
//   editor does (M3c);
// - SAFE and note discounts, note interest rates and a round's dividend rate,
//   fractions in the file ("0.2"), are held as the percentages people type ("20"), and turned back
//   into fractions as exact decimals, never through floating point (M4j plan,
//   answer 4): "6.5" becomes "0.065".
// Everything else is the event as loaded, so a field nobody edits is saved as
// it was. Events can be added, moved and removed (M4k); the payouts follow the
// last event unless someone chooses an earlier one. Which SAFEs and notes are
// still outstanding, and where each converts, is read from the events as
// typed (M5k), so the page can say it even while the engine can't build them.
//
// A company can start from a cap table (R31, 0.5.0): its first event is then
// the cap table it stands at, entered directly or imported, which "Add a
// round" turns into the start of its rounds. That table is held as the cap
// table editor holds one, and edited on the Cap table tab; its holders lead
// the list the events name, under the editor's own keys.

import { parseExact } from "spillpoint";
import type { CapTable } from "spillpoint";

import { assignIds, buildExit, draftFromExit, fieldForPath, moneyText, multipleText, percentText, percentToFraction, shareText } from "./draft.ts";
import type { Draft, DraftHolder } from "./draft.ts";
import type { Rounds } from "./rounds.ts";

type Json = Record<string, unknown>;

export interface EventDraft {
  /** The editor's own handle, stable while the event is edited. */
  key: string;
  json: Json;
}

/** A holder the events can name. One from the starting table is that table's own: named, and removed, on the Cap table tab. */
export interface RoundsHolder extends DraftHolder {
  fromStart?: boolean;
}

export interface RoundsDraft {
  /** The starting table's holders first, if there is one, then the ones added here. */
  holders: RoundsHolder[];
  events: EventDraft[];
  /** The event whose cap table the payouts use, by id (C2). */
  after: string;
  nextKey: number;
  /**
   * The cap table the company starts from (R31), as typed on the Cap table tab, when its first event is one; null when
   * the events build it from founding. The start event keeps its id, date and issue order; its cap table is this.
   */
  start: Draft | null;
}

/** The list of lines each event type has, and which of their fields name a holder or are percentages. */
const LISTS: Record<string, string> = {
  issue: "issues", grant_options: "grants", issue_warrants: "warrants", safes: "safes", notes: "notes", priced_round: "investments",
};
const PERCENTS: Record<string, string[]> = { safes: ["discount"], notes: ["interest_rate", "discount"] };

function mapEvent(ev: Json, holder: (v: unknown) => unknown, percent: (v: unknown) => unknown): Json {
  const out: Json = structuredClone(ev);
  const type = String(ev.type);
  if (type === "issue_percent") out.holder = holder(out.holder);
  const list = LISTS[type];
  if (list && Array.isArray(out[list])) {
    out[list] = (out[list] as Json[]).map((row) => {
      const r: Json = { ...row, holder: holder(row.holder) };
      for (const f of PERCENTS[type] ?? []) if (r[f] != null) r[f] = percent(r[f]);
      return r;
    });
  }
  // R30: a round's series may carry cumulative dividends, its rate a fraction like the others.
  const dividend = type === "priced_round" ? ((out.series as Json | undefined)?.cumulative_dividend as Json | undefined) : undefined;
  if (dividend && dividend.rate != null) dividend.rate = percent(dividend.rate);
  return out;
}

/** "0.2" → "20": a fraction as the percentage people type, exactly. Anything unreadable stays as it is. */
function asPercent(v: unknown): unknown {
  try {
    return parseExact(v, "percent").times(100).toFixed();
  } catch {
    return v;
  }
}

/** "6.5" or "6.5%" → "0.065", exactly, as the cap table editor reads its rates. */
export const asFraction = percentToFraction;

/** The rounds as the editor holds them. A starting table the page can't show in full throws NotShownYet, as any cap table does. */
export function draftFromRounds(rounds: Rounds): RoundsDraft {
  let n = 0;
  const key = () => `r${++n}`;
  const first = rounds.events[0];
  // The range is the sale's, not the starting table's: a stand-in, never used.
  const start = first?.type === "start" ? draftFromExit({ cap_table: first.cap_table, range: ["0", "1"] }) : null;
  const fromStart = new Set((start?.holders ?? []).map((h) => h.fileId));
  const holders: RoundsHolder[] = [
    ...(start?.holders ?? []).map((h) => ({ ...h, fromStart: true })),
    ...rounds.holders.filter((h) => !fromStart.has(String(h.id))).map((h) => ({ key: key(), fileId: String(h.id), name: String(h.name) })),
  ];
  const keyOf = (id: unknown) => holders.find((h) => h.fileId === id)?.key ?? id;
  const events = rounds.events.map((ev) => {
    if (ev.type !== "start") return { key: key(), json: mapEvent(ev, keyOf, asPercent) };
    const { cap_table: _table, ...json } = ev;
    return { key: key(), json };
  });
  return { holders, events, after: rounds.after, nextKey: n + 1, start };
}

/** The rounds with their starting table as typed: its holders lead the ones the events can name, as it names them. */
export function withStart(d: RoundsDraft, table: Draft): RoundsDraft {
  const own = d.holders.filter((h) => !h.fromStart);
  return { ...d, start: table, holders: [...table.holders.map((h) => ({ ...h, fromStart: true })), ...own] };
}

/**
 * What an import says of where its cap table stands (O14): its date, and the order its series, SAFEs and notes were
 * issued in. "Add a round" starts the company's rounds there (R31); a saved cap table keeps it (C13).
 */
export interface Origin {
  date: string;
  issueOrder: string[] | null;
}

/**
 * "Add a round" (R31): a cap table entered directly or imported becomes the cap table a company built from rounds
 * starts from, dated and ordered as its import gave it, if it was imported. The sale's terms stay with the sale.
 */
export function startingRounds(table: Draft, origin: Origin | null): RoundsDraft {
  const json: Json = { id: "start", date: origin?.date ?? "", type: "start", ...(origin?.issueOrder ? { issue_order: origin.issueOrder } : {}) };
  const start = { ...table, exitDate: "", carveOut: null, schedules: [] };
  return withStart({ holders: [], events: [{ key: "r1", json }], after: "start", nextKey: 2, start: null }, start);
}

/**
 * R31: the order a starting table's series, SAFEs and notes were issued in, as its import gave it, kept to what the
 * table holds now. One taken out drops out. A series added counts as issued before every SAFE and note, and a SAFE or
 * note added after everything: what the engine reads with no order given. Without one given, there's none to keep.
 */
export function issueOrder(given: unknown, table: Json): string[] | undefined {
  if (!Array.isArray(given)) return undefined;
  const series = ((table.securities as Json[] | undefined) ?? []).filter((s) => s.kind === "preferred").map((s) => String(s.id));
  const convertibles = [...((table.unconverted_safes as Json[] | undefined) ?? []), ...((table.unconverted_notes as Json[] | undefined) ?? [])].map((x) => String(x.id));
  const now = new Set([...series, ...convertibles]);
  const kept = given.map(String).filter((id) => now.has(id));
  return [...series.filter((id) => !kept.includes(id)), ...kept, ...convertibles.filter((id) => !kept.includes(id))];
}

// ---------- building ----------

/** What a typed field becomes for the engine, by where it is in an event. Blank means not given. */
function normalise(path: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value.trim() === "") return null;
  const field = path.replace(/\[\d+\]/g, "[]");
  if (/(^|\.)(shares)$/.test(field)) return shareText(value);
  if (/(^|\.)(percent|pool_target_unissued_percent_post)$/.test(field)) return percentText(value);
  if (/(^|\.)(preference_multiple|cap_multiple|repayment_multiple)$/.test(field)) return multipleText(value);
  if (/(^|\.)(pre_money|amount|purchase_amount|post_money_cap|pre_money_cap|principal|valuation_cap|offered_amount|strike)$/.test(field)) return moneyText(value);
  return value.trim();
}

/** Every string in the event, normalised by its path. */
function normaliseAll(value: unknown, path: string): unknown {
  if (Array.isArray(value)) return value.map((v, i) => normaliseAll(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    const out: Json = {};
    for (const [k, v] of Object.entries(value)) {
      // The pay-to-play ratios are keyed by series id, not field names.
      out[k] = path.endsWith("conversion_ratio") ? normalise("conversion_ratio", v) : normaliseAll(v, path ? `${path}.${k}` : k);
    }
    return out;
  }
  return normalise(path, value);
}

/**
 * The rounds as the engine reads them, and as a save writes them. A starting table's holders keep the ids its own
 * cap table gives them, and the holders added here get ids none of them has.
 */
export function buildRounds(d: RoundsDraft): Rounds {
  const start = d.start ? buildExit(d.start) : null;
  const startIds = start?.holderIds ?? new Map<string, string>();
  const own = d.holders.filter((h) => !h.fromStart);
  const ownIds = assignIds(own, "holder", new Set(startIds.values()));
  const ids = new Map([...startIds, ...ownIds]);
  const holders = [
    ...(d.start?.holders ?? []).map((h) => ({ id: startIds.get(h.key)!, name: h.name.trim() })),
    ...own.map((h) => ({ id: ownIds.get(h.key)!, name: h.name.trim() })),
  ];
  const events = d.events.map((e) => {
    if (e.json.type === "start") {
      const { issue_order: given, ...rest } = e.json;
      const table = start?.json.cap_table ?? null;
      const order = table ? issueOrder(given, table) : undefined;
      return { ...(normaliseAll(rest, "") as Json), cap_table: table, ...(order ? { issue_order: order } : {}) };
    }
    const withIds = mapEvent(e.json, (k) => ids.get(String(k)) ?? k, asFraction);
    return normaliseAll(withIds, "") as Json;
  });
  return { holders, events, after: d.after };
}

// ---------- edits ----------

export function setEvent(d: RoundsDraft, key: string, json: Json): RoundsDraft {
  return { ...d, events: d.events.map((e) => (e.key === key ? { ...e, json } : e)) };
}

export function addHolder(d: RoundsDraft): RoundsDraft {
  return { ...d, holders: [...d.holders, { key: `r${d.nextKey}`, fileId: null, name: "New holder" }], nextKey: d.nextKey + 1 };
}

/** How many events name this holder: a holder still in an event can't be removed (M4j plan, answer 5). A starting table's holders are its own. */
export function eventsNaming(d: RoundsDraft, key: string): number {
  return d.events.filter((e) => {
    const list = LISTS[String(e.json.type)];
    if (e.json.holder === key) return true;
    return list != null && Array.isArray(e.json[list]) && (e.json[list] as Json[]).some((row) => row.holder === key);
  }).length;
}

/** The event whose cap table the payouts use follows the last event, unless an earlier one was chosen. */
function lastId(d: RoundsDraft): string {
  return String(d.events.at(-1)?.json.id ?? "");
}
function keepingAfter(before: RoundsDraft, next: RoundsDraft): RoundsDraft {
  const followed = before.after === lastId(before) || !next.events.some((e) => e.json.id === before.after);
  return followed ? { ...next, after: lastId(next) } : next;
}

export type EventType = "issue" | "issue_percent" | "create_pool" | "grant_options" | "issue_warrants" | "safes" | "notes" | "priced_round";

/** What "Add an event" offers, in the order a company usually meets them. */
export const EVENT_TYPES: { type: EventType; label: string }[] = [
  { type: "issue", label: "Shares issued" },
  { type: "issue_percent", label: "Shares issued for a percentage of the company" },
  { type: "create_pool", label: "An option pool" },
  { type: "grant_options", label: "Options granted" },
  { type: "issue_warrants", label: "Warrants issued" },
  { type: "safes", label: "SAFEs" },
  { type: "notes", label: "Convertible notes" },
  { type: "priced_round", label: "A priced round" },
];

/** An id not yet used by any event, from a base: "safes", "safes_2". */
function freshId(taken: Set<string>, base: string): string {
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}_${n}`;
  return id;
}

/**
 * A new event of a type, at the end, with its fields blank for the engine to
 * name until they're filled. A priced round's series is the next letter
 * ("Series A Preferred", then B), with the most common terms: a 1x
 * non-participating preference and broad-based weighted-average
 * anti-dilution, SPEC's default. After a starting table it's the letter after
 * the last "Series" it has: Series B, after a Series A (R31). It ranks
 * alongside the most senior earlier series (M4j plan, answer 2), and its
 * series from SAFEs and notes with it (R28). `before` is the cap table after
 * the last event, as last built: its seniority, its classes, and its common
 * stock, which a new issue of common adds to.
 */
export function addEvent(d: RoundsDraft, type: EventType, before: CapTable | null): RoundsDraft {
  const key = `r${d.nextKey}`;
  const ids = new Set(d.events.map((e) => String(e.json.id)));
  const seniority = before?.seniority ?? [];
  const holder = d.holders[0]?.key ?? "";
  const builtCommon = before?.securities.find((s) => s.kind === "common");
  const common =
    d.events.map((e) => e.json.security as Json | undefined).find((s) => s?.kind === "common") ??
    (builtCommon ? { id: builtCommon.id, name: builtCommon.name, kind: "common" } : { id: "common", name: "Common Stock", kind: "common" });
  const rows = (id: string) => ({ id, holder });
  let json: Json;
  if (type === "priced_round") {
    const typed = d.events.flatMap((e) => ((e.json.series as Json | undefined)?.id ? [e.json.series as Json] : []));
    const classes = new Set([...typed.map((x) => String(x.id)), ...(before?.securities ?? []).map((x) => x.id)]);
    const named = [...typed.map((x) => String(x.name ?? "")), ...(before?.securities ?? []).filter((x) => x.kind === "preferred").map((x) => x.name)];
    const lettered = named.map((n) => /^Series ([A-Z])\b/.exec(n)?.[1]).filter((l): l is string => l != null).map((l) => l.charCodeAt(0) - 65);
    const rounds = Math.max(d.events.filter((e) => e.json.type === "priced_round").length, ...lettered.map((i) => i + 1));
    const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[rounds] ?? String(rounds + 1);
    const series = freshId(new Set([...classes, ...ids]), `series_${letter.toLowerCase()}`);
    json = {
      id: series,
      date: "",
      type,
      series: { id: series, name: `Series ${letter} Preferred`, kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "broad_based" },
      pre_money: "",
      investments: [{ holder, amount: "" }],
      pool_target_unissued_percent_post: "",
      seniority: seniority.length === 0 ? [[series]] : [[series, ...seniority[0]!], ...seniority.slice(1)],
      // A new round converts the notes still outstanding, as it does the SAFEs (M5k review). The engine's
      // default, for a round that doesn't say, stays not converting them (C14).
      convert_notes: true,
    };
  } else {
    const id = freshId(
      ids,
      { issue: "issue", issue_percent: "issue_percent", create_pool: "option_pool", grant_options: "grants", issue_warrants: "warrants", safes: "safes", notes: "notes" }[type],
    );
    const fresh: Record<Exclude<EventType, "priced_round">, Json> = {
      issue: { security: common, issues: [{ holder, shares: "" }] },
      issue_percent: { security: common, holder, percent: "" },
      create_pool: { percent: "" },
      grant_options: { grants: [{ holder, shares: "", strike: "" }] },
      // C15: for common, until someone chooses a series.
      issue_warrants: { warrants: [{ holder, shares: "", strike: "", underlying: "common" }] },
      safes: { safes: [{ ...rows(`${id}_1`), purchase_amount: "", post_money_cap: "", discount: "" }] },
      notes: {
        notes: [
          {
            ...rows(`${id}_1`), principal: "", interest_rate: "", interest_method: "simple", issue_date: "", valuation_cap: "",
            cap_type: "pre_money", conversion_base: "with_pool", discount: "", repayment_multiple: "1",
          },
        ],
      },
    };
    json = { id, date: "", type, ...fresh[type] };
  }
  return keepingAfter(d, { ...d, events: [...d.events, { key, json }], nextKey: d.nextKey + 1 });
}

/** A starting table stays first, and stays: dropping it is "Edit the cap table directly", which drops every event. */
const isStart = (e: EventDraft | undefined) => e?.json.type === "start";

export function removeEvent(d: RoundsDraft, key: string): RoundsDraft {
  if (isStart(d.events.find((e) => e.key === key))) return d;
  return keepingAfter(d, { ...d, events: d.events.filter((e) => e.key !== key) });
}

/** Moves an event one place earlier (-1) or later (+1), never past a starting table. */
export function moveEvent(d: RoundsDraft, key: string, by: -1 | 1): RoundsDraft {
  const at = d.events.findIndex((e) => e.key === key);
  const to = at + by;
  if (at < 0 || to < 0 || to >= d.events.length || isStart(d.events[at]) || isStart(d.events[to])) return d;
  const events = [...d.events];
  [events[at], events[to]] = [events[to]!, events[at]!];
  return keepingAfter(d, { ...d, events });
}

// ---------- SAFEs and notes, as typed ----------

/** A SAFE or note one event creates, or a starting table holds, and the priced round that converts it, as the events are typed. */
export interface Convertible {
  kind: "safe" | "note";
  /** Its id, as typed or loaded. */
  id: string;
  /** The event that creates it, by key, and its line there: for a starting table, its line among the table's SAFEs or notes. */
  event: string;
  row: number;
  /** Its holder, by editor key. */
  holder: string;
  /** The priced round that converts it, by key; null if none does. */
  convertedBy: string | null;
}

/**
 * Every SAFE and note the events create, in order, each with the round that
 * converts it. As the engine builds them: a priced round converts every SAFE
 * still outstanding unless it says not to (`convert_safes`, default true),
 * and every note still outstanding only when it says so (`convert_notes`,
 * default false; R23, C14). What no round converts is outstanding at a sale
 * (C8, C9).
 */
export function convertibles(d: RoundsDraft): Convertible[] {
  const found: Convertible[] = [];
  for (const e of d.events) {
    const type = e.json.type;
    // R31: a starting table's SAFEs and notes are outstanding from the start.
    if (type === "start" && d.start) {
      d.start.safes.forEach((f, i) => found.push({ kind: "safe", id: f.fileId ?? f.key, event: e.key, row: i, holder: f.holder, convertedBy: null }));
      d.start.notes.forEach((n, i) => found.push({ kind: "note", id: n.fileId ?? n.key, event: e.key, row: i, holder: n.holder, convertedBy: null }));
    }
    if (type === "safes" || type === "notes") {
      const rows = (e.json[type] as Json[] | undefined) ?? [];
      rows.forEach((row, i) =>
        found.push({ kind: type === "safes" ? "safe" : "note", id: String(row.id ?? ""), event: e.key, row: i, holder: String(row.holder ?? ""), convertedBy: null }),
      );
    }
    if (type === "priced_round") {
      const converts = { safe: e.json.convert_safes !== false, note: e.json.convert_notes === true };
      for (const c of found) if (c.convertedBy === null && converts[c.kind]) c.convertedBy = e.key;
    }
  }
  return found;
}

/** The SAFEs and notes still outstanding just before an event: created earlier, and not converted by an earlier round. */
export function outstandingBefore(d: RoundsDraft, eventKey: string): Convertible[] {
  const at = (key: string | null) => (key === null ? Infinity : d.events.findIndex((e) => e.key === key));
  const here = at(eventKey);
  return convertibles(d).filter((c) => at(c.event) < here && at(c.convertedBy) >= here);
}

/**
 * The anti-dilution of the preferred series issued before an event, as typed:
 * by a priced round's new series, or an issue of preferred stock. A round's
 * series from SAFEs and notes carry its terms, so they add nothing new.
 */
export function antiDilutionBefore(d: RoundsDraft, eventKey: string): Set<string> {
  const rules = new Set<string>();
  for (const e of d.events) {
    if (e.key === eventKey) break;
    // R31: a starting table's series, as typed on the Cap table tab.
    if (e.json.type === "start") for (const s of d.start?.securities ?? []) if (s.kind === "preferred" && s.antiDilution && s.antiDilution !== "none") rules.add(s.antiDilution);
    const s = (e.json.series ?? e.json.security) as Json | undefined;
    if (s?.kind === "preferred" && typeof s.anti_dilution === "string" && s.anti_dilution !== "none") rules.add(s.anti_dilution);
  }
  return rules;
}

/**
 * The SAFEs and notes still outstanding at the sale: those on the cap table
 * the payouts use, after the event they name (C2). Each says why: no later
 * round converts it, or the round that does comes after that cap table.
 */
export function outstandingAtSale(d: RoundsDraft): Convertible[] {
  const at = (key: string | null) => (key === null ? Infinity : d.events.findIndex((e) => e.key === key));
  const sale = d.events.findIndex((e) => String(e.json.id) === d.after);
  return convertibles(d).filter((c) => at(c.event) <= sale && at(c.convertedBy) > sale);
}

/** A company with one holder and one issue of common stock, to build from (M4k). */
export function blankRounds(): Rounds {
  return {
    holders: [{ id: "founder", name: "Founder" }],
    events: [
      { id: "founding", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "founder", shares: "10000000" }] },
    ],
    after: "founding",
  };
}

/** What an event is called before the engine has built it: the Rounds tab's titles, from the event as typed. */
export function draftTitle(json: Json): string {
  const items = (key: string) => ((json[key] as unknown[] | undefined) ?? []).length;
  switch (json.type) {
    case "start":
      return "The cap table it starts from";
    case "issue":
    case "issue_percent":
      return `${String((json.security as Json | undefined)?.name ?? "Stock")} issued`;
    case "create_pool":
      return "Option pool created";
    case "grant_options":
      return "Options granted";
    case "issue_warrants":
      return "Warrants issued";
    case "safes":
      return items("safes") === 1 ? "A SAFE" : "SAFEs";
    case "notes":
      return items("notes") === 1 ? "A convertible note" : "Convertible notes";
    case "priced_round":
      return `${String((json.series as Json | undefined)?.name ?? "A new series")}, a priced round`;
    default:
      return String(json.type);
  }
}

// ---------- where the engine's message goes ----------

type Path = (string | number)[];

/** "investments[0].amount" → ["investments", 0, "amount"]. */
const parse = (path: string): Path => path.split(/\.|\[(\d+)\]/).filter((p) => p !== undefined && p !== "").map((p) => (/^\d+$/.test(p) ? Number(p) : p));

export function getIn(json: unknown, path: string): unknown {
  return parse(path).reduce<unknown>((v, k) => (v == null ? undefined : (v as Record<string | number, unknown>)[k]), json);
}

/** The event with one value changed, everything else as it was. null removes the field. */
export function setIn(json: Json, path: string, value: unknown): Json {
  const keys = parse(path);
  const set = (node: unknown, i: number): unknown => {
    const k = keys[i]!;
    const copy = (Array.isArray(node) ? [...node] : { ...(node as object) }) as Record<string | number, unknown>;
    if (i === keys.length - 1) {
      if (value === null && !Array.isArray(copy)) delete copy[k];
      else copy[k] = value;
    } else {
      copy[k] = set(copy[k] ?? (typeof keys[i + 1] === "number" ? [] : {}), i + 1);
    }
    return copy;
  };
  return set(json, 0) as Json;
}

/** What the page says for a field left blank. */
export const BLANK = "Fill this in: it can't be blank.";

/**
 * When the engine names a blank field, every other field in the same event it
 * also needs filled, so a new event's blanks are all marked at once (M4
 * review's polish item). The engine names one problem at a time, and many
 * blank fields are fine (no cap, no top-up), so the page doesn't guess: it
 * fills each named blank with a stand-in, in a copy only it sees, and asks
 * again, until the engine names something else. Each field found is one the
 * engine itself says can't be blank.
 */
export function otherBlanks(
  d: RoundsDraft, rounds: Rounds, first: RoundsProblem, path: string, ask: (r: Rounds) => { path: string; message: string } | null,
): string[][] {
  const found: string[][] = [];
  let events = rounds.events;
  let at = path;
  for (let i = 0; i < 40; i++) {
    const m = /^inputs\.events\[(\d+)\]\.(.+)$/.exec(at);
    if (!m) break;
    const n = Number(m[1]);
    // A stand-in the engine reads as filled: a date where it wants one, otherwise 1.
    events = events.map((e, j) => (j === n ? setIn(e as Json, m[2]!, /date$/.test(m[2]!) ? "2000-01-01" : "1") : e));
    const next = ask({ ...rounds, events });
    if (!next || next.path === at) break;
    const problem = locate(d, next.path, next.message);
    if (problem.message !== BLANK || problem.event !== first.event) break;
    found.push(problem.fields);
    at = next.path;
  }
  return found;
}

/** The DOM id of an event's field: "investments[0].amount" in event r12 → "ev-r12-investments-0-amount". */
export function eventFieldId(eventKey: string, path: string): string {
  return `ev-${eventKey}-${path.replace(/\[(\d+)\]/g, "-$1").replace(/\./g, "-")}`;
}

export const holderFieldId = (key: string) => `rounds-holder-${key}`;

export interface RoundsProblem {
  /** What the page shows: the engine's words, without the path or assumption codes. */
  message: string;
  /** The event it's in, by key, or null when it names no event. */
  event: string | null;
  /** The field it names, and the fields above it, nearest first: the page marks the first one it shows. */
  fields: string[];
  /** When it's a blank field: the event's other fields the engine also needs filled, each nearest first. */
  blanks?: string[][];
  /** In the starting table (R31): its fields are the Cap table tab's, where it's edited. */
  onTable?: boolean;
}

/** Where an engine error about the rounds belongs. */
export function locate(d: RoundsDraft, path: string, message: string): RoundsProblem {
  const detail = message.startsWith(`${path}: `) ? message.slice(path.length + 2) : message;
  // A field left blank reaches the engine as nothing at all; say so plainly.
  const blank = /^expected an exact number as a string, got null$|^expected a non-empty string$/.test(detail);
  const text = blank ? BLANK : detail.charAt(0).toUpperCase() + detail.slice(1);
  const holder = /^inputs\.holders\[(\d+)\]/.exec(path);
  if (holder) return { message: text, event: null, fields: [holderFieldId(d.holders[Number(holder[1])]?.key ?? "")] };
  // R31: the starting table's fields are the Cap table tab's, found as that tab finds its own.
  const table = /^inputs\.events\[(\d+)\]\.cap_table(.*)$/.exec(path);
  const start = table ? d.events[Number(table[1])] : undefined;
  if (table && start && d.start) {
    const field = fieldForPath(buildExit(d.start).fields, `exit.cap_table${table[2]}`);
    return { message: text, event: start.key, fields: field ? [field] : [], onTable: true };
  }
  const m = /^inputs\.events\[(\d+)\]\.?(.*)$/.exec(path);
  const event = m ? d.events[Number(m[1])] : undefined;
  if (!m || !event) return { message: withPath(path, text), event: null, fields: [] };
  const fields: string[] = [];
  for (let p = m[2]!; p; p = p.replace(/(\.[^.[\]]+|\[\d+\])$/, "")) {
    fields.push(eventFieldId(event.key, p));
    if (!/(\.[^.[\]]+|\[\d+\])$/.test(p)) break;
  }
  return { message: text, event: event.key, fields };
}

/** A message that names no field keeps its path, so it can still be found. */
const withPath = (path: string, text: string) => (path ? `${path}: ${text}` : text);
