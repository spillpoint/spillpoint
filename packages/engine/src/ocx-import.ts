// What an OCX import builds, whichever layout it read (OX3, OX6, OX11, OX12): the holders in the per-holder tab's
// order, then any made for convertibles rows; the classes, positions, SAFEs and notes; the issue order; and the report.

import type { Decimal } from "decimal.js";

import { D, ZERO } from "./decimal.ts";
import type { CapTableImport, ImportBlank } from "./imports.ts";
import { Ids, idOf, written } from "./ocx-cells.ts";
import { Notes } from "./ocf-notes.ts";

type Json = Record<string, unknown>;

export interface Holder {
  id: string;
  name: string;
}

/** A class the summary tab lists, by its section (OX7). */
export interface ShareClass {
  id: string;
  name: string;
  kind: "common" | "preferred";
  /** Its Summary row, for the `Outstanding Shares` check. */
  row: number;
  /** A preferred class's terms, once read: null where the workbook doesn't settle them (OX3). */
  terms?: Terms;
}

export interface Terms {
  original_issue_price: string | null;
  conversion_price: string | null;
  preference_multiple: string | null;
  participation: string | null;
  cap_multiple: string | null;
}

/** OX12's `read` keys, in its order, each only where there's one. */
const READ = ["stakeholders", "pool_rows", "share_classes", "certificates", "plan_grants", "warrants", "safes", "notes", "convertible_rows", "stock_plans", "financing_rounds"];
const NOT_NEEDED = ["stock_plan_history", "valuations_409a", "split_adjustments", "shareholder_groups"];

/** A dollar amount in a made holder's name: "$6,000,000". */
function dollars(x: Decimal): string {
  const [whole, fraction] = x.toFixed().split(".") as [string, string | undefined];
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? `.${fraction}` : ""}`;
}

/** OX11: a holder made for a convertibles row, named for it: its type, then its cap and its discount where given, then its count. */
export function madeHolderName(type: string, cap: Decimal | undefined, discount: Decimal | undefined, count: Decimal): string {
  const parts = [type];
  if (cap) parts.push(`${dollars(cap)} cap`);
  if (discount && !discount.isZero()) parts.push(`${written(discount.times(100))}% discount`);
  return `${parts.join(", ")} (${written(count)})`;
}

export class Draft {
  readonly notes = new Notes();
  private readonly counts = new Map<string, number>();
  private readonly holderIds = new Ids();
  private readonly classIds = new Ids();
  readonly holders: Holder[] = [];
  readonly made: Holder[] = [];
  readonly byName = new Map<string, Holder>();
  readonly classes: ShareClass[] = [];
  /** Option and warrant classes, in the order the rules make them. */
  readonly derived: Json[] = [];
  private readonly holdings = new Map<string, Map<string, Decimal>>();
  readonly safes: Json[] = [];
  readonly convertibleNotes: Json[] = [];
  private readonly safeCounts = new Map<string, number>();
  pool: Decimal = ZERO;
  /** O14: each series, SAFE and note with the date it was issued, or none, where the default puts it after every series. */
  readonly issued: { id: string; date?: string; series: boolean }[] = [];
  /** Lines that come after the cap table's own: issue order, then holders left out. */
  private readonly lateNotes: [string, string][] = [];

  count(key: string, n = 1): void {
    this.counts.set(key, (this.counts.get(key) ?? 0) + n);
  }

  /** OX6: a holder row of the per-holder tab, by its name; two of one name are refused by the caller. */
  addHolder(name: string): Holder {
    const h = { id: this.holderIds.take(idOf(name)), name };
    this.holders.push(h);
    this.byName.set(name, h);
    return h;
  }

  /** OX11: a holder made for a convertibles row, after the per-holder tab's (OX6). */
  makeHolder(name: string): Holder {
    const h = { id: this.holderIds.take(idOf(name)), name };
    this.made.push(h);
    return h;
  }

  addClass(name: string, kind: "common" | "preferred", row: number): ShareClass {
    const c: ShareClass = { id: this.classIds.take(idOf(name)), name, kind, row };
    this.classes.push(c);
    return c;
  }

  hold(holder: string, security: string, shares: Decimal): void {
    if (shares.isZero()) return;
    if (!this.holdings.has(holder)) this.holdings.set(holder, new Map());
    const h = this.holdings.get(holder)!;
    h.set(security, (h.get(security) ?? ZERO).plus(shares));
  }

  /** OX3: a SAFE's id is `safe_` and its holder's, with "_2" for a holder's second. */
  safeId(holder: string, prefix: "safe" | "note"): string {
    const key = `${prefix} ${holder}`;
    const n = (this.safeCounts.get(key) ?? 0) + 1;
    this.safeCounts.set(key, n);
    return n === 1 ? `${prefix}_${holder}` : `${prefix}_${holder}_${n}`;
  }

  late(code: string, subject: string): void {
    this.lateNotes.push([code, subject]);
  }

  /** O14, OX12: dated ones by date, a series before a SAFE or note of the same day; the rest after, by the default, each with a line. */
  private issueOrder(): string[] {
    const dated = this.issued.map((x, i) => ({ ...x, i })).filter((x) => x.date !== undefined);
    dated.sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : Number(b.series) - Number(a.series) || a.i - b.i));
    const rest = this.issued.filter((x) => x.date === undefined);
    for (const x of rest) this.notes.add("issue_order_default", x.id);
    return [...dated.map((x) => x.id), ...rest.map((x) => x.id)];
  }

  result(asOf: string): CapTableImport {
    const securities: Json[] = [
      ...this.classes.map((c) =>
        c.kind === "common" ? { id: c.id, name: c.name, kind: "common" } : { id: c.id, name: c.name, kind: "preferred", ...c.terms!, anti_dilution: "none" },
      ),
      ...this.derived,
    ];
    const preferred = this.classes.some((c) => c.kind === "preferred");
    const holding = (h: Holder) =>
      (this.holdings.get(h.id)?.size ?? 0) > 0 || this.safes.some((f) => f.holder === h.id) || this.convertibleNotes.some((n) => n.holder === h.id);
    // OX6: a holder left with nothing is left out and listed, once every rule has run.
    const kept = [...this.holders, ...this.made].filter(holding);
    const order = new Map(securities.map((s, i) => [s.id as string, i]));
    const positions = kept.flatMap((h) =>
      [...(this.holdings.get(h.id) ?? new Map<string, Decimal>())]
        .sort((a, b) => order.get(a[0])! - order.get(b[0])!)
        .map(([security, shares]) => ({ holder: h.id, security, shares: Number(shares.toFixed()) })),
    );
    const issueOrder = this.issueOrder();
    for (const [code, subject] of this.lateNotes) this.notes.add(code, subject);
    for (const h of this.holders) if (!holding(h)) this.notes.add("left_out_stakeholder", h.id);

    const capTable: Json = {
      holders: kept.map((h) => ({ id: h.id, name: h.name })),
      securities,
      seniority: preferred ? null : [],
      conversion_groups: [],
      positions,
      unissued_pool: Number(this.pool.toFixed()),
      ...(this.safes.length ? { unconverted_safes: this.safes } : {}),
      ...(this.convertibleNotes.length ? { unconverted_notes: this.convertibleNotes } : {}),
    };
    // O1: every term left null is a blank to fill, but a cap multiple, which only capped participation has; seniority last.
    const blanks = (list: Json[], key: "security" | "safe" | "note"): ImportBlank[] =>
      list.flatMap((x) => Object.entries(x).filter(([k, v]) => v === null && k !== "cap_multiple").map(([field]) => ({ [key]: x.id as string, field })));
    const toFill = [...blanks(securities, "security"), ...blanks(this.safes, "safe"), ...blanks(this.convertibleNotes, "note"), ...(preferred ? [{ field: "seniority" }] : [])];

    const read = Object.fromEntries(READ.filter((k) => this.counts.get(k)).map((k) => [k, this.counts.get(k)!]));
    const notNeeded = Object.fromEntries(NOT_NEEDED.filter((k) => this.counts.get(k)).map((k) => [k, this.counts.get(k)!]));
    return { as_of: asOf, cap_table: capTable, issue_order: issueOrder, to_fill: toFill, report: { read, not_needed: notNeeded, notes: this.notes.list() } };
  }
}

/** The engine's own name for an option class by its strike (O6): `options_0.1`, "Options ($0.1 strike)". */
export function optionClass(strike: Decimal): Json {
  const s = written(strike);
  return { id: `options_${s}`, name: `Options ($${s} strike)`, kind: "option", strike: s };
}

export const sum = (xs: Iterable<Decimal>): Decimal => [...xs].reduce((a, b) => a.plus(b), new D(0));
