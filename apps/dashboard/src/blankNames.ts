// A field left blank, named (0.5.0 plan, 05e; Jordan, after #69): "Series B's pre-money valuation can't be blank."
// The message shows beside the field, and also away from it, on the Payouts tab and in a save's status, so it says
// which field. Where the page can't name one, as a holder not yet chosen, it says what it said before.

type Json = Record<string, unknown>;

/** What the page says for a blank field it can't name. */
export const BLANK = "Fill this in: it can't be blank.";

/** "Series B's pre-money valuation" → "Series B's pre-money valuation can't be blank." */
export function blankMessage(name: string | null): string {
  return name ? `${name.charAt(0).toUpperCase()}${name.slice(1)} can't be blank.` : BLANK;
}

/** The engine's field names, as the page's labels put them. */
const FIELD: Record<string, string> = {
  date: "date",
  pre_money: "pre-money valuation",
  pool_target_unissued_percent_post: "option pool target",
  percent: "percentage",
  purchase_amount: "amount",
  post_money_cap: "valuation cap",
  pre_money_cap: "valuation cap",
  valuation_cap: "valuation cap",
  discount: "discount",
  principal: "principal",
  interest_rate: "interest rate",
  issue_date: "issue date",
  repayment_multiple: "repayment multiple",
  strike: "strike price",
  original_issue_price: "original issue price",
  conversion_price: "conversion price",
  preference_multiple: "preference",
  cap_multiple: "participation cap",
};

/** A series' cumulative dividend's fields (C5). */
const DIVIDEND: Record<string, string> = { rate: "cumulative dividend rate", accrual_start: "dividend accrual date" };

const named = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
/** A name's possessive: one ending in "s" takes a bare apostrophe, "Harbor Lane Partners' investment" (Jordan, 05e review). */
const possessive = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);
const rows = (v: unknown) => (Array.isArray(v) ? (v as Json[]) : []);

/** A field in a cap table, by its path inside the table ("securities[2].cap_multiple"). */
export function capTableFieldName(table: Json, path: string): string | null {
  const holder = (id: unknown) => named(rows(table.holders).find((h) => h.id === id)?.name);
  const security = (id: unknown) => named(rows(table.securities).find((s) => s.id === id)?.name);
  let m: RegExpExecArray | null;
  if ((m = /^holders\[(\d+)\](?:\.name)?$/.exec(path))) return `holder ${Number(m[1]) + 1}'s name`;
  if ((m = /^securities\[(\d+)\](?:\.name)?$/.exec(path))) return `class ${Number(m[1]) + 1}'s name`;
  if ((m = /^securities\[(\d+)\]\.cumulative_dividend\.(\w+)$/.exec(path))) {
    const name = named(rows(table.securities)[Number(m[1])]?.name);
    return name && DIVIDEND[m[2]!] ? `${possessive(name)} ${DIVIDEND[m[2]!]}` : null;
  }
  if ((m = /^securities\[(\d+)\]\.(\w+)$/.exec(path))) {
    const name = named(rows(table.securities)[Number(m[1])]?.name);
    if (!name) return null;
    // C4: what a warrant buys, common or a series.
    if (m[2] === "underlying") return `what ${name} buys`;
    return FIELD[m[2]!] ? `${possessive(name)} ${FIELD[m[2]!]}` : null;
  }
  if ((m = /^positions\[(\d+)\](?:\.shares)?$/.exec(path))) {
    const p = rows(table.positions)[Number(m[1])];
    const h = holder(p?.holder);
    const s = security(p?.security);
    return h && s ? `${possessive(h)} ${s} shares` : null;
  }
  if (path === "unissued_pool") return "the unissued option pool";
  if ((m = /^unconverted_(safes|notes)\[(\d+)\]\.(\w+)$/.exec(path))) {
    const noun = m[1] === "safes" ? "SAFE" : "note";
    if (m[3] === "holder") return `${noun} ${Number(m[2]) + 1}'s holder`;
    const h = holder(rows(table[`unconverted_${m[1]}`])[Number(m[2])]?.holder);
    return h && FIELD[m[3]!] ? `${possessive(h)} ${noun} ${FIELD[m[3]!]}` : null;
  }
  if (path === "conversion_groups[0].vote_threshold_percent") return "the conversion group's vote threshold";
  if (path.startsWith("carve_out.")) return carveOutFieldName(table.carve_out as Json | undefined, holder, path.slice("carve_out.".length));
  return null;
}

/** A field in a carve-out (C6), on the sale or the cap table: each tier starts where the one before ends. */
function carveOutFieldName(carve: Json | undefined, holder: (id: unknown) => string | null, path: string): string | null {
  let m: RegExpExecArray | null;
  if ((m = /^tiers\[(\d+)\]\.(from|to|percent)$/.exec(path))) {
    const n = Number(m[1]) + 1;
    if (m[2] === "percent") return `carve-out tier ${n}'s percentage`;
    // A tier's start is the end of the one before it, which is where it's typed.
    return m[2] === "to" ? `carve-out tier ${n}'s upper end` : n > 1 ? `carve-out tier ${n - 1}'s upper end` : null;
  }
  if ((m = /^allocation\[(\d+)\]\.(holder|percent)$/.exec(path))) {
    const n = Number(m[1]) + 1;
    if (m[2] === "holder") return `carve-out recipient ${n}`;
    const h = holder(rows(carve?.allocation)[n - 1]?.holder);
    return h ? `${possessive(h)} share of the carve-out` : `carve-out recipient ${n}'s share`;
  }
  return null;
}

/** A field in the Cap table tab's input, by the engine's path ("exit.cap_table.unconverted_safes[0].purchase_amount"). */
export function exitFieldName(json: Json, path: string): string | null {
  const table = (json.cap_table ?? {}) as Json;
  if (path.startsWith("exit.cap_table.")) return capTableFieldName(table, path.slice("exit.cap_table.".length));
  if (path === "exit.range[0]") return "the lowest exit value";
  if (path === "exit.range" || path === "exit.range[1]") return "the highest exit value";
  const holder = (id: unknown) => named(rows(table.holders).find((h) => h.id === id)?.name);
  if (path.startsWith("exit.carve_out.")) return carveOutFieldName(json.carve_out as Json | undefined, holder, path.slice("exit.carve_out.".length));
  const m = /^exit\.payment_schedules\[(\d+)\]\.payments\[(\d+)\]\.(label|amount)$/.exec(path);
  if (m) {
    const n = Number(m[2]) + 1;
    if (m[3] === "label") return `payment ${n}'s label`;
    const label = named(rows(rows(json.payment_schedules)[Number(m[1])]?.payments)[n - 1]?.label);
    return label ? `the ${label} payment's amount` : `payment ${n}'s amount`;
  }
  return null;
}

/** Each event type's own fields, said of the event: "the option pool's date". */
const EVENT: Record<string, (ev: Json) => string> = {
  issue: (ev) => `the ${named((ev.security as Json | undefined)?.name) ?? "stock"} issue's`,
  issue_percent: (ev) => `the ${named((ev.security as Json | undefined)?.name) ?? "stock"} issue's`,
  create_pool: () => "the option pool's",
  grant_options: () => "the option grant's",
  issue_warrants: () => "the warrant issue's",
  safes: (ev) => (rows(ev.safes).length === 1 ? "the SAFE's" : "the SAFEs'"),
  notes: (ev) => (rows(ev.notes).length === 1 ? "the note's" : "the notes'"),
};

/**
 * A field in one of the Rounds tab's events, by its path inside the event ("investments[0].amount"). Each line's
 * holder is the draft's own key for it.
 */
export function eventFieldName(holders: readonly { key: string; name: string }[], ev: Json, path: string): string | null {
  const holder = (key: unknown) => named(holders.find((h) => h.key === key)?.name);
  let m: RegExpExecArray | null;
  if (ev.type === "priced_round") {
    // A round is named by its new series: "Series B's pre-money valuation".
    const series = named((ev.series as Json | undefined)?.name) ?? "the new series";
    if (path === "series.name") return "the new series' name";
    if ((m = /^series\.cumulative_dividend\.(\w+)$/.exec(path))) return DIVIDEND[m[1]!] ? `${possessive(series)} ${DIVIDEND[m[1]!]}` : null;
    if ((m = /^investments\[(\d+)\]\.amount$/.exec(path))) {
      const h = holder(rows(ev.investments)[Number(m[1])]?.holder);
      return h ? `${possessive(h)} investment in ${series}` : null;
    }
    if (path === "pay_to_play.offered_amount") return `${possessive(series)} pay-to-play amount`;
    const key = path.replace(/^series\./, "");
    return /^[a-z_]+$/.test(key) && FIELD[key] ? `${possessive(series)} ${FIELD[key]}` : null;
  }
  if ((m = /^(issues|grants|warrants|safes|notes)\[(\d+)\]\.(\w+)$/.exec(path))) {
    const h = holder(rows(ev[m[1]!])[Number(m[2])]?.holder);
    if (!h) return null;
    const what: Record<string, Record<string, string>> = {
      issues: { shares: "shares" },
      grants: { shares: "options", strike: "option strike price" },
      warrants: { shares: "warrant shares", strike: "warrant strike price" },
      safes: Object.fromEntries(Object.entries(FIELD).map(([k, v]) => [k, `SAFE ${v}`])),
      notes: Object.fromEntries(Object.entries(FIELD).map(([k, v]) => [k, `note ${v}`])),
    };
    const field = what[m[1]!]![m[3]!];
    return field ? `${possessive(h)} ${field}` : null;
  }
  if (path === "security.name") return "the issued class's name";
  const owner = EVENT[String(ev.type)]?.(ev);
  return owner && FIELD[path] ? `${owner} ${FIELD[path]}` : null;
}
