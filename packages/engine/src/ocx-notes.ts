// The lines at the head of an OCX import's report (OX12): what no layout says, and the totals it couldn't check.

import type { Book } from "./ocx-cells.ts";
import type { Draft, ShareClass } from "./ocx-import.ts";

/** O11's four, every time: no field for dividends, conversion groups, a carve-out or the sale's date. */
export { NO_FIELD } from "./stable-names.ts";

/** Seniority, where there's preferred stock (OX3); and whether a formula has no saved value, so a total went unchecked (OX5). */
export function headNotes(book: Book, draft: Draft, classes: ShareClass[]): void {
  if (classes.some((c) => c.kind === "preferred")) draft.notes.add("no_seniority_field");
  if (book.hasUnsavedFormula()) draft.notes.add("formula_totals_skipped");
}
