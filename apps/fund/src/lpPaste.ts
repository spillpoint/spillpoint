// Pasting LPs from a spreadsheet (plan, "Pasting LPs from a spreadsheet", f02c), as the cash flows paste: copied
// cells arrive as rows of tab-separated text, read here row by row into LPs, with why for each row that can't be read.
// Nothing here decides anything about the fund: the rows go into the table, and the engine runs them there.
//
// The rules:
// - Columns: name, then commitment. Cells past the second are ignored. A first row whose commitment cell isn't an
//   amount and that names a column (name, LP, investor, partner, commitment, committed or amount) is a header, and
//   skipped.
// - Commitments are read as a cash flow's amount is, digits kept exactly; never negative, never zero.
// - Names are trimmed as the page reads every name (FA17). A name already in the paste, or already in the table, is
//   refused, since no two LPs share one (F19).

import { D } from "spillpoint-fund";

import { exactDollars } from "./format.ts";
import { nameOf } from "./lps.ts";
import { cellsOf, pastedAmount } from "./paste.ts";

/** An LP the paste could read. */
export interface PastedLp {
  /** Its place in the paste, counting from 1, the header included: "Row 4". */
  line: number;
  name: string;
  commitment: D;
}

export interface LpPasteRead {
  rows: PastedLp[];
  /** Each row it can't read, with why: "Row 4: 'lots' isn't an amount". */
  unread: string[];
}

const HEADER_WORD = /\b(name|lps?|investors?|partners?|commitments?|committed|amounts?)\b/i;

/** Reads a paste of LPs. `inTable` is the names already in the table, as the page reads them. */
export function readLpPaste(text: string, inTable: readonly string[]): LpPasteRead {
  const lines = cellsOf(text);
  const filled = (cells: string[]) => cells.some((c) => c !== "");
  const first = lines.findIndex(filled);
  const header =
    first >= 0 && "why" in pastedAmount(lines[first]![1] ?? "", "") && lines[first]!.slice(0, 2).some((c) => HEADER_WORD.test(c));

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
    seen.set(name, i + 1);
    rows.push({ line: i + 1, name, commitment: read.amount });
  });
  return { rows, unread };
}

/** The rows as read, in one line: "3 LPs, $10,000,000 committed; adds them to the 2 here." */
export function lpPasteSummary(read: LpPasteRead, here: number): string {
  if (read.rows.length === 0) return "No rows read yet.";
  const total = read.rows.reduce((sum, r) => sum.plus(r.commitment), new D(0));
  const where = here === 0 ? "they'll be the table's first" : `adds them to the ${here} here`;
  return `${read.rows.length} ${read.rows.length === 1 ? "LP" : "LPs"}, ${exactDollars(total)} committed; ${where}.`;
}
