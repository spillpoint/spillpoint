// Pasting LPs from a spreadsheet (plan, "Pasting LPs from a spreadsheet", f02c, and "Pasting LPs", f03c), as the cash
// flows paste: copied cells arrive as rows of tab-separated text, read here row by row into LPs, with why for each row
// that can't be read. Nothing here decides anything about the fund: the rows go into the table, and the engine runs
// them there.
//
// The rules:
// - Columns: name, then commitment, then two that may be left off: class, then close. Cells past the fourth are
//   ignored. A first row whose commitment cell isn't an amount and that names a column (name, LP, investor, partner,
//   commitment, committed, amount, class or close) is a header, and skipped.
// - Commitments are read as a cash flow's amount is, digits kept exactly; never negative, never zero.
// - Names are trimmed as the page reads every name (FA17). A name already in the paste, or already in the table, is
//   refused, since no two LPs share one (F19).
// - A class is matched by its name, both trimmed (FA27); blank is the fund's terms, and so is "Fund terms", the picker's
//   word, which no class may take (f03c review, answer 3). A class that isn't in the table is refused.
// - A close is read as the cash flows' dates are, the paste's slashed dates settling their order, or asking (F25);
//   blank is in from the start.

import { D } from "spillpoint-fund";

import { exactDollars } from "./format.ts";
import { FUND_TERMS, nameOf } from "./lps.ts";
import type { DateOrder, Order } from "./paste.ts";
import { cellsOf, pastedAmount, readDate, settleOrder } from "./paste.ts";

/** An LP the paste could read. */
export interface PastedLp {
  /** Its place in the paste, counting from 1, the header included: "Row 4". */
  line: number;
  name: string;
  commitment: D;
  /** Its class's row in the table, or null for the fund's terms. */
  class: number | null;
  /** YYYY-MM-DD, or null for in from the start. */
  close: string | null;
}

export interface LpPasteRead extends DateOrder {
  rows: PastedLp[];
  /** Each row it can't read, with why: "Row 4: 'lots' isn't an amount". */
  unread: string[];
}

const HEADER_WORD = /\b(name|lps?|investors?|partners?|commitments?|committed|amounts?|class(es)?|close)\b/i;

/**
 * Reads a paste of LPs. `inTable` is the names already in the table, as the page reads them; `classes` the table's
 * classes, each by its row and its name as the page reads it. `chosen` is the order picked for dates that could be
 * either; month first until then.
 */
export function readLpPaste(text: string, inTable: readonly string[], classes: readonly { id: number; name: string }[] = [], chosen: Order = "month-first"): LpPasteRead {
  const lines = cellsOf(text);
  const filled = (cells: string[]) => cells.some((c) => c !== "");
  const first = lines.findIndex(filled);
  const header =
    first >= 0 && "why" in pastedAmount(lines[first]![1] ?? "", "") && lines[first]!.slice(0, 4).some((c) => HEADER_WORD.test(c));
  const dates = settleOrder(
    lines.map((cells, i) => ({ row: i + 1, text: cells[3] ?? "" })).filter((c, i) => c.text !== "" && !(header && i === first)),
    chosen,
  );

  const rows: PastedLp[] = [];
  const unread: string[] = [];
  const seen = new Map<string, number>();
  lines.forEach((cells, i) => {
    if (!filled(cells) || (header && i === first)) return;
    const row = `Row ${i + 1}`;
    const name = nameOf(cells[0] ?? "");
    const commitmentText = cells[1] ?? "";
    if (name === "") return void unread.push(`${row}: has no name`);
    if (commitmentText === "") return void unread.push(`${row}: has no commitment`);
    const read = pastedAmount(commitmentText, "A commitment is more than zero");
    if ("why" in read) return void unread.push(`${row}: ${read.why}`);
    // F19: no two LPs share a name, compared exactly once trimmed.
    if (seen.has(name)) return void unread.push(`${row}: '${name}' is already in this paste, in row ${seen.get(name)}`);
    if (inTable.includes(name)) return void unread.push(`${row}: '${name}' is already an LP in the table`);
    // F22, FA27: a class by its name, trimmed.
    const classText = nameOf(cells[2] ?? "");
    const fundTerms = classText === "" || classText === FUND_TERMS;
    const cls = fundTerms ? null : (classes.find((c) => c.name === classText) ?? null);
    if (!fundTerms && !cls) return void unread.push(`${row}: '${classText}' isn't one of the fund's classes`);
    // F25: a close, as the cash flows' dates are read.
    const closeText = cells[3] ?? "";
    let close: string | null = null;
    if (closeText !== "") {
      const when = readDate(closeText, dates.order);
      if ("why" in when) return void unread.push(`${row}: ${when.why}`);
      close = when.date;
    }
    seen.set(name, i + 1);
    rows.push({ line: i + 1, name, commitment: read.amount, class: cls?.id ?? null, close });
  });
  return { rows, unread, ...dates };
}

/** The rows as read, in one line: "3 LPs, $10,000,000 committed, 1 in a class and 2 with a close; adds them to the 2 here." */
export function lpPasteSummary(read: LpPasteRead, here: number): string {
  if (read.rows.length === 0) return "No rows read yet.";
  const total = read.rows.reduce((sum, r) => sum.plus(r.commitment), new D(0));
  const inClass = read.rows.filter((r) => r.class !== null).length;
  const withClose = read.rows.filter((r) => r.close !== null).length;
  const parts = [...(inClass > 0 ? [`${inClass} in a class`] : []), ...(withClose > 0 ? [`${withClose} with a close`] : [])];
  const extra = parts.length > 0 ? `, ${parts.join(" and ")}` : "";
  const where = here === 0 ? "they'll be the table's first" : `adds them to the ${here} here`;
  return `${read.rows.length} ${read.rows.length === 1 ? "LP" : "LPs"}, ${exactDollars(total)} committed${extra}; ${where}.`;
}
