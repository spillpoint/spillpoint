// The limits a sale puts on SAFEs and notes still outstanding (X12–X15), in plain words (Jordan, 05b3b answers). The
// engine's own message for them talks about cases and inputs; a founder needs to know what's outstanding. A round that
// converts them lifts them, so the import review offers one, and the Payouts tab says so until one does (R31).

import { UnsupportedTermError } from "spillpoint";

type Json = Record<string, unknown>;

/** The engine's terms for these limits: a refusal with any other term isn't one. */
export const SALE_LIMITS = new Set(["note_with_safe_or_carve_out", "pre_money_safe_with_preferred", "several_safes", "several_notes"]);

const some = (n: number, one: string, many: string) => (n === 1 ? one : many);

const blank = (v: unknown) => v == null || v === "";

/**
 * What a sale-limit refusal means for this cap table (C8, C9 fields), in a sentence; null for any other refusal. A
 * carve-out beside a note is the same limit as a SAFE beside one in a setup not modeled yet (X18): a note with no
 * valuation cap, or a SAFE with no post-money cap. Where the SAFEs and notes are all set up as modeled, it's the
 * carve-out, which may be on the sale rather than the cap table.
 */
export function saleLimitText(error: unknown, capTable: Json): string | null {
  if (!(error instanceof UnsupportedTermError) || !SALE_LIMITS.has(error.term)) return null;
  const safeList = (capTable.unconverted_safes as Json[] | undefined) ?? [];
  const noteList = (capTable.unconverted_notes as Json[] | undefined) ?? [];
  const safes = safeList.length;
  const notes = noteList.length;
  const note = some(notes, "a convertible note", "convertible notes");
  switch (error.term) {
    case "note_with_safe_or_carve_out":
      if (safes > 0 && noteList.some((n) => blank(n.valuation_cap))) {
        return `spillpoint can't yet work out a sale while ${some(safes, "a SAFE is", "SAFEs are")} outstanding beside a convertible note with no valuation cap.`;
      }
      if (safes > 0 && safeList.some((f) => blank(f.post_money_cap))) {
        return `spillpoint can't yet work out a sale while ${note} ${some(notes, "is", "are")} outstanding beside a SAFE with no post-money valuation cap.`;
      }
      return `spillpoint can't yet work out a sale with a management carve-out while ${note} ${some(notes, "is", "are")} outstanding.`;
    case "pre_money_safe_with_preferred":
      return "spillpoint can't yet work out a sale while a pre-money SAFE is outstanding beside preferred stock.";
    case "several_safes":
      return "spillpoint can't yet work out a sale while several SAFEs are outstanding, unless each has a post-money valuation cap.";
    default:
      return "spillpoint can't yet work out a sale while several convertible notes are outstanding, unless each has a valuation cap.";
  }
}
