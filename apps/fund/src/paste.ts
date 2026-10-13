// Pasting cash flows from a spreadsheet (plan, "Pasting rows from a spreadsheet", f01k): a GP won't type years of
// flows by hand. Cells copied from Excel, Numbers or Google Sheets arrive as rows of tab-separated text. This reads
// them, row by row, into cash flows, and says why for each row it can't read. Nothing here decides anything about the
// fund: the rows go into the table, and the engine runs them there as it runs typed ones.
//
// The rules (f01k, Jordan's answers):
// - Columns: date, type, kind, amount, in that order. A first row with no date in its first cell that names any of
//   those four is a header, and skipped. Cells past the fourth are ignored.
// - Dates: YYYY-MM-DD or YYYY/MM/DD; numbers with slashes and a four- or two-digit year (21 is 2021); or a month's name, as
//   15-Jan-2021, Jan 15, 2021 or 15 Jan 2021. Numbers with slashes could be month first (US) or day first: a date with a
//   number above 12 settles it for the whole paste; if none does and some date could be either, the page asks once,
//   month first selected. A date that can't be read in the paste's order is refused.
// - Types: Call, Capital call, Contribution or Drawdown; Distribution. Any case.
// - Kinds: Investment; Fee or Management fee; Expense or Fund expense. A call with no kind is an investment, and the
//   preview counts them. A distribution's kind cell is ignored.
// - Amounts as the cells take them, digits kept exactly; never negative, since the type says which way it goes.

import { D } from "spillpoint-fund";
import type { CallKind } from "spillpoint-fund";

import { dateText, exactDollars, parseDollars } from "./format.ts";

export type Order = "month-first" | "day-first";

/** A row the paste could read, as the table will hold it. */
export interface PastedRow {
  /** Its place in the paste, counting from 1, the header included: "Row 12". */
  line: number;
  date: string;
  type: "call" | "distribution";
  kind: CallKind;
  amount: D;
}

export interface PasteRead {
  rows: PastedRow[];
  /** Each row it can't read, with why: "Row 12: 'Q3 2021' isn't a date". */
  unread: string[];
  /** Calls with no kind, read as investments. */
  noKind: number;
  /** The first date that could be read either way, when nothing in the paste settles which: the page asks once. */
  ambiguous: string | null;
  /**
   * When any date could be read either way, which way they were read and why (f01k review, answer 1): a typo like
   * 13/1/2023 in a US paste turns every other date day first, and this line is how a GP sees it.
   */
  orderNote: string | null;
  /** The order the paste's slashed dates are read in: settled by the paste, or chosen. */
  order: Order;
}

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const TYPES: Record<string, "call" | "distribution"> = {
  call: "call",
  "capital call": "call",
  contribution: "call",
  drawdown: "call",
  distribution: "distribution",
};
const KINDS: Record<string, CallKind> = {
  investment: "investment",
  fee: "fee",
  "management fee": "fee",
  expense: "expense",
  "fund expense": "expense",
};

/** "Jan", "jan.", "January", "Sept": a month's name, three letters at least. */
function monthNamed(name: string): number | null {
  const n = name.toLowerCase().replace(/\.$/, "");
  if (n.length < 3) return null;
  const i = MONTH_NAMES.findIndex((m) => m.startsWith(n));
  return i < 0 ? null : i + 1;
}

/** A two-digit year is this century's: 21 is 2021. */
function fullYear(y: string): number {
  return y.length === 2 ? 2000 + Number(y) : Number(y);
}

/** YYYY-MM-DD if the date exists, else null. */
function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1) return null;
  const when = new Date(Date.UTC(y, m - 1, d));
  if (when.getUTCFullYear() !== y || when.getUTCMonth() !== m - 1 || when.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

type DateCell = { iso: string | null } | { slashed: [number, number, number] } | null;

/** A cell as a date: a whole date, or numbers with slashes whose order the paste settles; null if it isn't one. */
function dateCell(text: string): DateCell {
  const t = text.trim();
  // YYYY-MM-DD, or YYYY/MM/DD as some spreadsheets copy it: year first, it reads only one way.
  let m = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/.exec(t);
  if (m) return { iso: iso(Number(m[1]), Number(m[3]), Number(m[4])) };
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/.exec(t);
  if (m) return { slashed: [Number(m[1]), Number(m[2]), fullYear(m[3]!)] };
  // 15-Jan-2021, 15 Jan 2021, 15-Jan-21
  m = /^(\d{1,2})[-\s]([A-Za-z]{3,9}\.?)[-\s]+(\d{4}|\d{2})$/.exec(t);
  if (m && monthNamed(m[2]!)) return { iso: iso(fullYear(m[3]!), monthNamed(m[2]!)!, Number(m[1])) };
  // Jan 15, 2021; January 15 2021
  m = /^([A-Za-z]{3,9}\.?)\s+(\d{1,2}),?\s+(\d{4}|\d{2})$/.exec(t);
  if (m && monthNamed(m[1]!)) return { iso: iso(fullYear(m[3]!), monthNamed(m[1]!)!, Number(m[2])) };
  return null;
}

/** A slashed date, read in an order. */
function slashedIso([a, b, y]: [number, number, number], order: Order): string | null {
  return order === "month-first" ? iso(y, a, b) : iso(y, b, a);
}

/** The paste's rows: tab-separated cells, each trimmed of spaces and of the quotes a spreadsheet may put round one. */
function cellsOf(text: string): string[][] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.split("\t").map((c) => c.trim().replace(/^"(.*)"$/, "$1").trim()));
}

const HEADER_WORD = /\b(date|type|kind|amount)\b/i;

/** Reads a paste. `chosen` is the order the GP picked when the paste can't settle it; month first until then. */
export function readPaste(text: string, chosen: Order = "month-first"): PasteRead {
  const lines = cellsOf(text);
  const filled = (cells: string[]) => cells.some((c) => c !== "");
  const first = lines.findIndex(filled);
  const header = first >= 0 && dateCell(lines[first]![0] ?? "") === null && lines[first]!.some((c) => HEADER_WORD.test(c));

  // Which comes first in slashed dates: the first one with a number above 12 settles it for the paste.
  const slashed = lines
    .map((cells, i) => ({ i, cell: dateCell(cells[0] ?? "") }))
    .filter((r): r is { i: number; cell: { slashed: [number, number, number] } } => r.cell !== null && "slashed" in r.cell && !(header && r.i === first));
  const implied = ([a]: [number, number, number]): Order => (a > 12 ? "day-first" : "month-first");
  const settler = slashed.find(({ cell: { slashed: s } }) => (s[0] > 12) !== (s[1] > 12) && slashedIso(s, implied(s)) !== null);
  const order: Order = settler ? implied(settler.cell.slashed) : chosen;
  const either = settler ? undefined : slashed.find(({ cell: { slashed: [a, b] } }) => a <= 12 && b <= 12 && a !== b);
  const ambiguous = either ? lines[either.i]![0]! : null;
  const anyEither = slashed.some(({ cell: { slashed: [a, b] } }) => a <= 12 && b <= 12 && a !== b);
  const way = order === "day-first" ? "day first" : "month first";
  const orderNote = !anyEither
    ? null
    : settler
      ? `Dates read ${way}, as ${lines[settler.i]![0]} in row ${settler.i + 1} can only be read that way.`
      : `Dates read ${way}, as chosen above.`;

  const rows: PastedRow[] = [];
  const unread: string[] = [];
  let noKind = 0;
  lines.forEach((cells, i) => {
    if (!filled(cells) || (header && i === first)) return;
    const row = `Row ${i + 1}`;
    const [when = "", what = "", kindText = "", amountText] = cells;

    if (when === "") return void unread.push(`${row}: has no date`);
    const cell = dateCell(when);
    let date: string | null = null;
    if (cell && "slashed" in cell) {
      date = slashedIso(cell.slashed, order);
      // A date that reads only the other way disagrees with the paste's order.
      if (!date && slashedIso(cell.slashed, order === "month-first" ? "day-first" : "month-first")) {
        return void unread.push(`${row}: '${when}' isn't ${order === "month-first" ? "month/day/year" : "day/month/year"}, as this paste's dates are`);
      }
    } else if (cell) {
      date = cell.iso;
    }
    if (!date) return void unread.push(`${row}: '${when}' isn't a date`);

    if (what === "") return void unread.push(`${row}: has no type`);
    const type = TYPES[what.toLowerCase().replace(/\s+/g, " ")];
    if (!type) return void unread.push(`${row}: '${what}' isn't a type: Call or Distribution`);

    let kind: CallKind = "investment";
    // Counted only if the row is read.
    const kindless = type === "call" && kindText === "";
    if (type === "call") {
      if (!kindless) {
        const k = KINDS[kindText.toLowerCase().replace(/\s+/g, " ")];
        if (!k) return void unread.push(`${row}: '${kindText}' isn't a kind: Investment, Fee or Expense`);
        kind = k;
      }
    }

    if (amountText === undefined || amountText === "") return void unread.push(`${row}: has no amount; the columns are date, type, kind and amount`);
    // An accounting format's zero, "$ -" or "-", is a zero, not a negative.
    if (/^\$?\s*-$/.test(amountText)) return void unread.push(`${row}: '${amountText}' isn't an amount more than zero`);
    // "-500,000", "-$500,000", "$-500,000", "(500,000)" and "$(500,000)": the ways a spreadsheet writes a negative.
    if (/^-|^\$\s*-|^\$?\s*\(.*\)$/.test(amountText)) {
      return void unread.push(`${row}: '${amountText}' is negative. Write amounts as positive; the type says which way the money goes`);
    }
    const amount = parseDollars(amountText);
    if (amount === null) return void unread.push(`${row}: '${amountText}' isn't an amount`);
    if (!amount.gt(0)) return void unread.push(`${row}: '${amountText}' isn't an amount more than zero`);
    rows.push({ line: i + 1, date, type, kind, amount });
    if (kindless) noKind++;
  });
  return { rows, unread, noKind, ambiguous, orderNote, order };
}

/** The question when the paste can't settle the order: how its first such date reads each way. */
export function orderChoices(ambiguous: string): { order: Order; text: string }[] {
  const cell = dateCell(ambiguous) as { slashed: [number, number, number] };
  return [
    { order: "month-first", text: `Month first: ${ambiguous} is ${dateText(slashedIso(cell.slashed, "month-first")!)}` },
    { order: "day-first", text: `Day first: ${ambiguous} is ${dateText(slashedIso(cell.slashed, "day-first")!)}` },
  ];
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The rows as read, in one line: "37 cash flows: 25 calls, $41,250,000 called; 12 distributions, $58,000,000
 * distributed; adds them to the 5 here". `here` is the rows already in the table with anything in them.
 */
export function pasteSummary(read: PasteRead, here: number): string {
  if (read.rows.length === 0) return "No rows read yet.";
  const total = (rows: PastedRow[]) => rows.reduce((sum, r) => sum.plus(r.amount), new D(0));
  const calls = read.rows.filter((r) => r.type === "call");
  const distributions = read.rows.filter((r) => r.type === "distribution");
  const callPart = calls.length ? `${count(calls.length, "call", "calls")}, ${exactDollars(total(calls))} called` : "no calls";
  const distributionPart = distributions.length
    ? `${count(distributions.length, "distribution", "distributions")}, ${exactDollars(total(distributions))} distributed`
    : "no distributions";
  const where = here === 0 ? "they'll be the table's first" : `adds them to the ${here} here`;
  return `${count(read.rows.length, "cash flow", "cash flows")}: ${callPart}; ${distributionPart}; ${where}.`;
}
