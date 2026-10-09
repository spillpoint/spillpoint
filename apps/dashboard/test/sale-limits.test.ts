// The limits a sale puts on SAFEs and notes still outstanding (X12–X15), in plain words (Jordan, 05b3b answers): one
// sentence for each term the import review's "Use it to add a round" covers, and none for any other refusal.

import { InputError, UnsupportedTermError } from "spillpoint";
import { describe, expect, it } from "vitest";

import { saleLimitText } from "../src/saleLimits.ts";

const refusal = (term: string) => new UnsupportedTermError(term, "later", "exit.cap_table.unconverted_notes", "A term");
const table = (safes: number, notes: number) => ({ unconverted_safes: Array(safes).fill({}), unconverted_notes: Array(notes).fill({}) });

describe("each at-a-sale refusal, in plain words", () => {
  it.each([
    ["note_with_safe_or_carve_out", table(2, 1), "spillpoint can't yet work out a sale while SAFEs and a convertible note are both outstanding."],
    ["note_with_safe_or_carve_out", table(1, 2), "spillpoint can't yet work out a sale while a SAFE and convertible notes are both outstanding."],
    ["note_with_safe_or_carve_out", table(0, 1), "spillpoint can't yet work out a sale with a management carve-out while a convertible note is outstanding."],
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
