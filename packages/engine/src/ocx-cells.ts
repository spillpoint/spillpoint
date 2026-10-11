// Reading an OCX workbook's cells (ASSUMPTIONS OX5, OX13): tabs, header rows and tables, numbers to Excel's 15
// significant digits, dates in the forms the format writes, and the refusals, each naming the workbook's own text.

import type { Decimal } from "decimal.js";

import { D } from "./decimal.ts";
import { ImportRefusal } from "./errors.ts";
import type { OcxCell, OcxSheet, OcxWorkbook } from "./ocx.ts";

/** OX13: every refusal names the workbook's own text: a name, a row's number, a tab, or a tab and header. */
export function refuse(kind: "unsupported" | "malformed", term: string, subject: string, what: string): never {
  throw new ImportRefusal("ocx", kind, term, subject, `${subject ? `${subject}: ` : ""}${what}`);
}
export const malformed = (term: string, subject: string, what: string): never => refuse("malformed", term, subject, what);
export const unsupported = (term: string, subject: string, what: string): never => refuse("unsupported", term, subject, what);

/** OX5: a header matches once runs of spaces and line breaks are one space, the ends trimmed and trailing `*` marks dropped. */
export function normal(text: string): string {
  return text.replace(/\s+/g, " ").trim().replace(/\s*\*+$/, "").trim();
}

/** OX5: a row label (`Total`, a section's label) matches in any case. */
export const label = (text: string): string => normal(text).toLowerCase();

/** OX3: an id in the engine's style: lower case, each run of anything but letters and digits one "_", ends trimmed. */
export function idOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** OX3: ids made from names, with "_2", "_3" for a later one that comes out the same. */
export class Ids {
  private readonly used = new Set<string>();

  take(base: string): string {
    let id = base;
    for (let n = 2; this.used.has(id); n += 1) id = `${base}_${n}`;
    this.used.add(id);
    return id;
  }
}

const ADDRESS = /^([A-Z]{1,3})([1-9]\d*)$/;

/** A column's number from its letters: A is 0. */
export function columnOf(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

export class Tab {
  readonly name: string;
  /** Rows by number, each its cells by column. */
  readonly rows = new Map<number, Map<number, OcxCell>>();

  constructor(sheet: OcxSheet) {
    this.name = sheet.name;
    for (const cell of sheet.cells) {
      const m = ADDRESS.exec(cell.address);
      if (!m) continue;
      const row = Number(m[2]);
      if (!this.rows.has(row)) this.rows.set(row, new Map());
      this.rows.get(row)!.set(columnOf(m[1]!), cell);
    }
  }

  /** The rows with something in them, top to bottom. */
  rowNumbers(): number[] {
    return [...this.rows.keys()].sort((a, b) => a - b);
  }

  cell(row: number, column: number): OcxCell | undefined {
    return this.rows.get(row)?.get(column);
  }

  /** A cell's text, normalized, or "" where there's nothing written. */
  text(row: number, column: number): string {
    const c = this.cell(row, column);
    return c && c.kind === "text" ? normal(c.text) : "";
  }

  /** Every text cell, top to bottom, left to right. */
  *texts(): Generator<{ row: number; column: number; text: string }> {
    for (const row of this.rowNumbers()) {
      for (const [column, c] of [...this.rows.get(row)!].sort((a, b) => a[0] - b[0])) if (c.kind === "text") yield { row, column, text: c.text };
    }
  }
}

/** A header row: each header, normalized, by its first column. */
export class Header {
  readonly row: number;
  readonly columns = new Map<string, number>();
  readonly cells: { column: number; text: string }[] = [];

  constructor(tab: Tab, row: number) {
    this.row = row;
    for (const [column, c] of [...(tab.rows.get(row) ?? [])].sort((a, b) => a[0] - b[0])) {
      if (c.kind !== "text" || normal(c.text) === "") continue;
      const text = normal(c.text);
      this.cells.push({ column, text });
      if (!this.columns.has(text)) this.columns.set(text, column);
    }
  }

  has(header: string): boolean {
    return this.columns.has(header);
  }

  at(header: string): number | undefined {
    return this.columns.get(header);
  }
}

/** The first row with any of these headers in it: a tab's header row, which OX13's checks then hold to its headers. */
export function headerRow(tab: Tab, headers: readonly string[]): Header | undefined {
  for (const row of tab.rowNumbers()) {
    const h = new Header(tab, row);
    if (headers.some((x) => h.has(x))) return h;
  }
  return undefined;
}

/** OX13, step 2 or 6: each header a tab needs, in order (`missing_header`, naming the tab and header). */
export function requireHeaders(tab: Tab, header: Header | undefined, needed: readonly string[]): Header {
  for (const h of needed) if (!header?.has(h)) malformed("missing_header", `${tab.name}: ${h}`, `the tab has no "${h}" header`);
  return header!;
}

/** The workbook's tabs by name, in its order. */
export class Book {
  readonly tabs: Tab[];
  readonly dateSystem: 1900 | 1904;

  constructor(workbook: OcxWorkbook) {
    this.tabs = workbook.sheets.map((s) => new Tab(s));
    this.dateSystem = workbook.dateSystem;
  }

  tab(name: string): Tab | undefined {
    return this.tabs.find((t) => t.name === name);
  }

  /** OX4: the version label, "OCX Version 0.7", looked for on every tab, as written. */
  versionLabel(): string | undefined {
    for (const t of this.tabs) for (const { text } of t.texts()) {
      const m = /^OCX Version\s+(\S+)$/.exec(normal(text));
      if (m) return m[1];
    }
    return undefined;
  }

  /** Whether any formula has no value saved with it (OX5): the `formula_totals_skipped` line. */
  hasUnsavedFormula(): boolean {
    return this.tabs.some((t) => [...t.rows.values()].some((r) => [...r.values()].some((c) => c.formula && c.text === "")));
  }
}

/** A table on Context, found by its title and running to the next title in that column (OX14). */
export interface Table {
  title: string;
  header: Header | undefined;
  /** The rows under the header with something in a header's column, or for a list with no header, its names. */
  rows: number[];
}

/** Context's tables, by title, each from its title down to the next title in its column. */
export function tablesOf(tab: Tab, titles: readonly string[]): Map<string, Table> {
  const found: { title: string; row: number; column: number }[] = [];
  for (const { row, column, text } of tab.texts()) {
    const t = titles.find((x) => x.toLowerCase() === normal(text).toLowerCase());
    if (t) found.push({ title: t, row, column });
  }
  const tables = new Map<string, Table>();
  for (const f of found) {
    const next = Math.min(...found.filter((g) => g.column === f.column && g.row > f.row).map((g) => g.row), Infinity);
    const rows = tab.rowNumbers().filter((r) => r > f.row && r < next && [...tab.rows.get(r)!.keys()].some((c) => c >= f.column));
    if (f.title === "Shareholder Groups") {
      // A list of names under its title, with no header row.
      tables.set(f.title, { title: f.title, header: undefined, rows: rows.filter((r) => tab.cell(r, f.column) !== undefined) });
      continue;
    }
    const [first, ...rest] = rows;
    const header = first === undefined ? undefined : new Header(tab, first);
    const columns = new Set(header?.cells.map((c) => c.column) ?? []);
    tables.set(f.title, { title: f.title, header, rows: rest.filter((r) => [...tab.rows.get(r)!.keys()].some((c) => columns.has(c))) });
  }
  return tables;
}

// ---------- values ----------

/** OX5: a number read to Excel's 15 significant digits, trailing zeros dropped: "0.20000000000000001" is 0.2. */
export function fifteen(text: string): Decimal {
  return new D(text).toSignificantDigits(15, D.ROUND_HALF_UP);
}

/** A number as the case files write it: plainly, with no exponent and no trailing zeros. */
export const written = (x: Decimal): string => x.toFixed();

/** "N/A", in any case: a blank where a value may be absent (OX14). */
export const isNA = (c: OcxCell | undefined): boolean => c !== undefined && c.kind === "text" && normal(c.text).toLowerCase() === "n/a";

/** Whether a cell has nothing that counts: missing, or text of spaces. A formula with no value is something. */
export const isBlank = (c: OcxCell | undefined): boolean => c === undefined || (!c.formula && c.text.trim() === "");

/**
 * A number the import needs (OX5, OX13 step 7): a formula with no value saved is `formula_without_value`, anything but
 * a number cell `bad_number`, and a share count that isn't whole `fractional_shares`. A blank gives undefined, for the
 * rule to say what a blank means.
 */
export function numberAt(c: OcxCell | undefined, subject: string, what: string, whole = false): Decimal | undefined {
  if (isBlank(c)) return undefined;
  if (c!.formula && c!.text === "") malformed("formula_without_value", subject, `${what} is a formula with no value saved`);
  if (c!.kind !== "number") malformed("bad_number", subject, `${what}, "${c!.text}", isn't a number`);
  const x = fifteen(c!.text);
  if (whole && !x.isInteger()) malformed("fractional_shares", subject, `${what}, ${x.toFixed()}, isn't a whole number of shares`);
  return x;
}

/** "Unknown" where a date is needed: a blank that falls back as each rule says (OX5). */
export const UNKNOWN = "unknown";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A real calendar date, as YYYY-MM-DD, or undefined. */
function ymd(y: number, m: number, d: number): string | undefined {
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return undefined;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * OX5's date forms: a day count in a date format, from 1900 (where day 60 is Excel's 29 February 1900, which never
 * was) or 1904; ISO text; `YYYY.MM.DD` or `YYYY-MM-DD` text, followed or not by a reference in brackets; "Unknown".
 */
export function dateOf(c: OcxCell, system: 1900 | 1904): string | undefined {
  const text = c.text.trim();
  if (c.kind === "date" && /^\d+(\.\d+)?$/.test(text)) {
    const serial = Math.floor(Number(text));
    if (system === 1904) return new Date(Date.UTC(1904, 0, 1 + serial)).toISOString().slice(0, 10);
    if (serial === 60 || serial < 1) return undefined;
    return new Date(Date.UTC(1899, 11, serial < 60 ? 31 + serial : 30 + serial)).toISOString().slice(0, 10);
  }
  if (c.kind !== "text" && c.kind !== "date") return undefined;
  if (text.toLowerCase() === "unknown") return UNKNOWN;
  const m = /^(\d{4})[.-](\d{2})[.-](\d{2})(?:\s*\([^)]*\))?$/.exec(text);
  return m ? ymd(Number(m[1]), Number(m[2]), Number(m[3])) : undefined;
}

/** A date the import needs: blank gives undefined, "Unknown" UNKNOWN, anything else unreadable `bad_date`. */
export function dateAt(c: OcxCell | undefined, system: 1900 | 1904, subject: string, what: string): string | undefined {
  if (isBlank(c)) return undefined;
  if (c!.formula && c!.text === "") malformed("formula_without_value", subject, `${what} is a formula with no value saved`);
  const d = dateOf(c!, system);
  if (d === undefined) malformed("bad_date", subject, `${what}, "${c!.text}", isn't a date the reader reads`);
  return d;
}

/**
 * The as-of date (OX5, OX14): "As of " and 0.7's form, "Fri, 31 Oct 2025", its weekday checked, or any date form OX5
 * reads, the reference's dotted one among them. Read from the summary tab alone; anything else there is `bad_date`.
 */
export function asOfOf(tab: Tab, system: 1900 | 1904): string {
  for (const { text } of tab.texts()) {
    const t = normal(text);
    if (!/^As of /i.test(t)) continue;
    const rest = t.slice(6).trim();
    const m = /^([A-Z][a-z]{2}), (\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(rest);
    if (m) {
      const month = MONTHS.indexOf(m[3]!) + 1;
      const d = month ? ymd(Number(m[4]), month, Number(m[2])) : undefined;
      if (d && DAYS[new Date(`${d}T00:00:00Z`).getUTCDay()] === m[1]) return d;
      return malformed("bad_date", tab.name, `the as-of date, "${t}", isn't a real date with its weekday`);
    }
    const d = dateOf({ address: "A1", kind: "text", text: rest, formula: false }, system);
    if (d && d !== UNKNOWN) return d;
    return malformed("bad_date", tab.name, `the as-of date, "${t}", isn't a date the reader reads`);
  }
  return malformed("bad_date", tab.name, "the tab gives no as-of date");
}
