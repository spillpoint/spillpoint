// The limits a sale puts on SAFEs and notes still outstanding (X12–X15), in plain words (Jordan, 05b3b answers). The
// engine's own message for them talks about cases and inputs; a founder needs to know what's outstanding. A round that
// converts them lifts them, so the import review offers one, and the Payouts tab says so until one does (R31).

import { UnsupportedTermError } from "spillpoint";

type Json = Record<string, unknown>;

/** The engine's terms for these limits: a refusal with any other term isn't one. */
export const SALE_LIMITS = new Set(["note_with_safe_or_carve_out", "pre_money_safe_with_preferred", "several_safes", "several_notes"]);

const some = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * What a sale-limit refusal means for this cap table (C8, C9 fields), in a sentence; null for any other refusal. A
 * carve-out beside a note is the same limit as a SAFE beside one, and says so when there's no SAFE.
 */
export function saleLimitText(error: unknown, capTable: Json): string | null {
  if (!(error instanceof UnsupportedTermError) || !SALE_LIMITS.has(error.term)) return null;
  const safes = ((capTable.unconverted_safes as unknown[] | undefined) ?? []).length;
  const notes = ((capTable.unconverted_notes as unknown[] | undefined) ?? []).length;
  const note = some(notes, "a convertible note", "convertible notes");
  switch (error.term) {
    case "note_with_safe_or_carve_out":
      return safes > 0
        ? `spillpoint can't yet work out a sale while ${some(safes, "a SAFE", "SAFEs")} and ${note} are both outstanding.`
        : `spillpoint can't yet work out a sale with a management carve-out while ${note} ${some(notes, "is", "are")} outstanding.`;
    case "pre_money_safe_with_preferred":
      return "spillpoint can't yet work out a sale while a pre-money SAFE is outstanding beside preferred stock.";
    case "several_safes":
      return "spillpoint can't yet work out a sale while several SAFEs are outstanding, unless each has a post-money valuation cap.";
    default:
      return "spillpoint can't yet work out a sale while several convertible notes are outstanding, unless each has a valuation cap.";
  }
}
