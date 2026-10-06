// The rounds as the editor holds them (M4j): each event's fields as typed,
// so a half-typed number stays on screen, read by the engine only when the
// rounds are built (C14's event format). Two things differ from the file:
// - events name holders by the editor's keys, so a holder can be renamed, or
//   added before it has a name; building gives each its id, as the cap table
//   editor does (M3c);
// - SAFE and note discounts and note interest rates, fractions in the file
//   ("0.2"), are held as the percentages people type ("20"), and turned back
//   into fractions as exact decimals, never through floating point (M4j plan,
//   answer 4): "6.5" becomes "0.065".
// Everything else is the event as loaded, so a field nobody edits is saved as
// it was.

import { D, parseExact } from "spillpoint";

import { assignIds, moneyText, multipleText, percentText, shareText } from "./draft.ts";
import type { DraftHolder } from "./draft.ts";
import type { Rounds } from "./rounds.ts";

type Json = Record<string, unknown>;

export interface EventDraft {
  /** The editor's own handle, stable while the event is edited. */
  key: string;
  json: Json;
}

export interface RoundsDraft {
  holders: DraftHolder[];
  events: EventDraft[];
  /** The event whose cap table the payouts use, by id (C2). */
  after: string;
  nextKey: number;
}

/** The list of lines each event type has, and which of their fields name a holder or are percentages. */
const LISTS: Record<string, string> = { issue: "issues", grant_options: "grants", safes: "safes", notes: "notes", priced_round: "investments" };
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

/** "6.5" or "6.5%" → "0.065", exactly; blank stays blank; anything else goes through as typed, for the engine to name. */
export function asFraction(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const t = percentText(v);
  if (t === "") return "";
  return /^\d+(\.\d+)?$/.test(t) ? new D(t).div(100).toFixed() : t;
}

/** The rounds as the editor holds them. */
export function draftFromRounds(rounds: Rounds): RoundsDraft {
  let n = 0;
  const key = () => `r${++n}`;
  const holders = rounds.holders.map((h) => ({ key: key(), fileId: String(h.id), name: String(h.name) }));
  const keyOf = (id: unknown) => holders.find((h) => h.fileId === id)?.key ?? id;
  const events = rounds.events.map((ev) => ({ key: key(), json: mapEvent(ev, keyOf, asPercent) }));
  return { holders, events, after: rounds.after, nextKey: n + 1 };
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

/** The rounds as the engine reads them, and as a save writes them. */
export function buildRounds(d: RoundsDraft): Rounds {
  const ids = assignIds(d.holders, "holder");
  const holders = d.holders.map((h) => ({ id: ids.get(h.key)!, name: h.name.trim() }));
  const events = d.events.map((e) => {
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

/** How many events name this holder: a holder still in an event can't be removed (M4j plan, answer 5). */
export function eventsNaming(d: RoundsDraft, key: string): number {
  return d.events.filter((e) => {
    const list = LISTS[String(e.json.type)];
    if (e.json.holder === key) return true;
    return list != null && Array.isArray(e.json[list]) && (e.json[list] as Json[]).some((row) => row.holder === key);
  }).length;
}

// ---------- where the engine's message goes ----------

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
}

/** Where an engine error about the rounds belongs. */
export function locate(d: RoundsDraft, path: string, message: string): RoundsProblem {
  const detail = message.startsWith(`${path}: `) ? message.slice(path.length + 2) : message;
  const text = detail.charAt(0).toUpperCase() + detail.slice(1);
  const holder = /^inputs\.holders\[(\d+)\]/.exec(path);
  if (holder) return { message: text, event: null, fields: [holderFieldId(d.holders[Number(holder[1])]?.key ?? "")] };
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
