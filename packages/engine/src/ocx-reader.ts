// Reading an OCX workbook into a cap table (0.6.0; ASSUMPTIONS OX1–OX14).
//
// OCX is the Open Cap Table Coalition's Excel layout of a cap table: https://github.com/Open-Cap-Table-Coalition/ocx.
// spillpoint reads files in that format. Like an OCF import, it gives the cap table as of the workbook's as-of date,
// in the case-file format, with a blank (null) wherever the workbook doesn't settle a term, the list of those blanks,
// the issue order and a report. Anything that would change payouts and isn't read is refused by name, never skipped.
//
// Two layouts are read, told apart by their tabs (OX4, OX13 step 1): 0.4/0.5, the Coalition's reference workbooks,
// and 0.7, as one Mantle export lays it out. The engine does no I/O: the page parses the .xlsx (OX1).

import { Book, unsupported, malformed } from "./ocx-cells.ts";
import { read05 } from "./ocx-05.ts";
import { read07 } from "./ocx-07.ts";
import { Draft } from "./ocx-import.ts";
import { NO_FIELD } from "./ocx-notes.ts";
import type { CapTableImport } from "./imports.ts";
import type { OcxWorkbook } from "./ocx.ts";

const SEVEN = ["Summary View", "Stakeholder View"];
const FIVE = ["Summary Snapshot", "Stakeholder Snapshot"];

/**
 * Reads an OCX workbook, as the page's .xlsx reader gives it (OX1), into a cap table, its blanks, its issue order and
 * a report. Throws ImportRefusal, its format "ocx", naming the workbook's own text (OX13).
 */
export function readOcx(workbook: OcxWorkbook): CapTableImport {
  const book = new Book(workbook);
  const version = book.versionLabel();
  const names = book.tabs.map((t) => t.name);

  // 1. The layout: the per-holder tab sets it, or with neither, the summary tab (OX13).
  let layout: "0.7" | "0.4/0.5" | undefined;
  if (names.includes("Stakeholder View")) layout = "0.7";
  else if (names.includes("Stakeholder Snapshot")) layout = "0.4/0.5";
  else if (names.includes("Detailed Snapshot")) unsupported("ocx_layout", version ?? "", "OCX 0.3's layout, which has no preference terms, isn't read");
  else if (names.includes("Summary View")) layout = "0.7";
  else if (names.includes("Summary Snapshot")) layout = "0.4/0.5";
  if (!layout) return unsupported("ocx_layout", version ?? "", "the workbook has none of the tabs an OCX layout spillpoint reads has");
  const others = layout === "0.7" ? [...FIVE, "Detailed Snapshot"] : [...SEVEN, "Detailed Snapshot"];
  const stray = names.find((n) => others.includes(n));
  if (stray) malformed("mixed_layout", stray, `a tab of another OCX layout beside ${layout}'s`);

  const draft = new Draft();
  if (version) draft.notes.add("version_label", undefined, version);
  for (const code of NO_FIELD) draft.notes.add(code);
  const asOf = layout === "0.7" ? read07(book, draft) : read05(book, draft);
  return draft.result(asOf);
}
