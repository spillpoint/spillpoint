// The limits a sale puts on SAFEs and notes still outstanding (X12–X15), in plain words (Jordan, 05b3b answers): one
// sentence for each term the import review's "Use it to add a round" covers, and none for any other refusal.

import { InputError, UnsupportedTermError } from "spillpoint";
import { describe, expect, it } from "vitest";

import { buildExit, checkBuilt, draftFromExit, fieldId } from "../src/draft.ts";
import { fromRounds } from "../src/rounds.ts";
import { locate } from "../src/roundsDraft.ts";
import type { RoundsDraft } from "../src/roundsDraft.ts";
import { safesOwnCompanyText, saleLimitText } from "../src/saleLimits.ts";

const refusal = (term: string) => new UnsupportedTermError(term, "exit.cap_table.unconverted_notes", "A term");
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

describe("post-money SAFEs that own the whole company (X19)", () => {
  const holders = [{ id: "founder", name: "Founder" }, { id: "a", name: "Investor A" }];
  const company = {
    holders,
    events: [
      { id: "founding", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "founder", shares: "1000000" }] },
      { id: "safes", date: "2024-01-01", type: "safes", safes: [{ id: "safe_a", holder: "a", purchase_amount: "100000", post_money_cap: "8000", discount: "0" }] },
    ],
    after: "safes",
  };
  const words = "The post-money SAFEs would own the whole company at their caps: Investor A's SAFE, $100,000 at a cap of $8,000 (1,250%). That's 1,250% in all, so a cap may be mistyped.";

  it("is a sentence, without the engine's path, and no other refusal is", () => {
    const path = "import.cap_table.unconverted_safes";
    expect(safesOwnCompanyText(new InputError(path, words.replace(/^The/, "the").replace(/\.$/, "")))).toBe(words);
    expect(safesOwnCompanyText(new InputError(path, "expected an array"))).toBeNull();
    expect(safesOwnCompanyText(new InputError("import.exit_date", "the post-money SAFEs would own"))).toBeNull();
    expect(safesOwnCompanyText(refusal("several_safes"))).toBeNull();
  });

  it("isn't one of the limits a round lifts: a round couldn't convert them either (R4)", () => {
    expect(saleLimitText(new InputError("import.cap_table.unconverted_safes", "the post-money SAFEs would own the whole company"), table(1, 0))).toBeNull();
  });

  it("on rounds, is the rounds' problem, in those words, wherever the page shows it", () => {
    const built = fromRounds(company, ["0", "100000000"]);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.message).toBe(words);
    const path = (built.error as InputError).path;
    expect(path).toBe("exit.cap_table_after_event.unconverted_safes");
    expect(locate({ holders: [], events: [] } as unknown as RoundsDraft, path, built.message)).toEqual({ message: words, event: null, fields: [] });
  });

  it("in the editor, goes on the outstanding SAFEs' card, without its path", () => {
    const safe = (cap: string) => ({ id: "safe_a", holder: "a", purchase_amount: "100000", post_money_cap: cap, discount: "0" });
    const exit = (cap: string) => ({
      cap_table: {
        holders,
        securities: [{ id: "common", name: "Common Stock", kind: "common" }],
        seniority: [],
        positions: [{ holder: "founder", security: "common", shares: 1000000 }],
        unconverted_safes: [safe(cap)],
      },
      range: ["0", "100000000"],
      exit_values: [],
    });
    const checked = checkBuilt(buildExit(draftFromExit(exit("8000"))));
    expect(checked).toMatchObject({ ok: false, field: fieldId.outstanding, message: words.replace(/\.$/, "") });
    expect(checkBuilt(buildExit(draftFromExit(exit("8000000")))).ok).toBe(true);
  });
});
