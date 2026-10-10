// The limits a sale puts on SAFEs and notes still outstanding (X12–X15), in plain words (Jordan, 05b3b answers): one
// sentence for each term the import review's "Use it to add a round" covers, and none for any other refusal.

import { InputError, UnsupportedTermError } from "spillpoint";
import { describe, expect, it } from "vitest";

import { saleLimitText } from "../src/saleLimits.ts";

const refusal = (term: string) => new UnsupportedTermError(term, "later", "exit.cap_table.unconverted_notes", "A term");
const POST_MONEY = { post_money_cap: "10000000" };
const PRE_MONEY = { post_money_cap: null, pre_money_cap: "10000000" };
const CAPPED = { valuation_cap: "5000000" };
const UNCAPPED = { valuation_cap: null, discount: "0.2" };
const table = (safes: number, notes: number, safe: object = POST_MONEY, note: object = CAPPED) => ({
  unconverted_safes: Array(safes).fill(safe),
  unconverted_notes: Array(notes).fill(note),
});

describe("each at-a-sale refusal, in plain words", () => {
  it.each([
    // Since 05c2 a note with a cap beside SAFEs with post-money caps is read at a sale (X18): the rest stays a limit.
    ["note_with_safe_or_carve_out", table(2, 1, POST_MONEY, UNCAPPED), "spillpoint can't yet work out a sale while SAFEs are outstanding beside a convertible note with no valuation cap."],
    ["note_with_safe_or_carve_out", table(1, 2, PRE_MONEY), "spillpoint can't yet work out a sale while convertible notes are outstanding beside a SAFE with no post-money valuation cap."],
    ["note_with_safe_or_carve_out", table(1, 1, { ...POST_MONEY, post_money_cap: "" }), "spillpoint can't yet work out a sale while a convertible note is outstanding beside a SAFE with no post-money valuation cap."],
    ["note_with_safe_or_carve_out", table(0, 1), "spillpoint can't yet work out a sale with a management carve-out while a convertible note is outstanding."],
    // SAFEs and notes all as modeled: the limit is the carve-out, which may be on the sale.
    ["note_with_safe_or_carve_out", table(2, 1), "spillpoint can't yet work out a sale with a management carve-out while a convertible note is outstanding."],
    ["pre_money_safe_with_preferred", table(1, 0), "spillpoint can't yet work out a sale while a pre-money SAFE is outstanding beside preferred stock."],
    ["several_safes", table(2, 0), "spillpoint can't yet work out a sale while several SAFEs are outstanding, unless each has a post-money valuation cap."],
    ["several_notes", table(0, 2), "spillpoint can't yet work out a sale while several convertible notes are outstanding, unless each has a valuation cap."],
  ])("%s: %#", (term, capTable, words) => {
    expect(saleLimitText(refusal(term), capTable)).toBe(words);
  });

  it("has none for any other refusal", () => {
    expect(saleLimitText(refusal("note_post_money_cap"), table(0, 1))).toBeNull();
    expect(saleLimitText(new InputError("exit.exit_date", "too early"), table(0, 1))).toBeNull();
  });
});
