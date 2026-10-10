// M5h: convertible notes still outstanding at a sale (C9; X3, X10–X12, X15,
// X16). Cases 13a to 13g run through every exit test; these check what the
// cases don't reach: each note's figures against its case's report, a note
// that can only be repaid, the exit date, and the refusals.

import { describe, expect, it } from "vitest";

import { D, UnsupportedTermError, payout, prepare, readCapTable, readExit, solve } from "../src/index.ts";
import { readInputs } from "../src/case.ts";
import { readCaseFile } from "./support/cases.ts";

interface ReportedNote {
  note: string;
  days: number;
  interest: string;
  repayment: string;
  conversion_base_shares?: string;
  conversion_price?: string;
  conversion_shares?: string;
}

const exact = (fraction: string) => {
  const [n, d = "1"] = fraction.split("/");
  return new D(n!).div(d);
};
const same = (a: D, b: string) => a.minus(exact(b)).abs().lt("1e-30");

describe("each note's figures (X3, X10, X11)", () => {
  it.each(["edge-13a-note-with-pool", "edge-13b-note-without-pool", "edge-13c-note-common-only", "edge-13d-note-cap-and-discount", "edge-13e-note-discount-only", "edge-13f-note-alongside-preferred", "edge-13g-two-notes"])(
    "%s: days, interest, repayment, and with a cap the base, price and shares, match the case's report",
    (name) => {
      const exit = readInputs(readCaseFile(name, "inputs.json"));
      const reported = (readCaseFile(name, "expected.json") as { exit: { unconverted_notes: ReportedNote[] } }).exit.unconverted_notes;
      const pc = prepare(exit.capTable, exit.exitDate);
      for (const r of reported) {
        const t = pc.notes.get(r.note)!;
        expect(t.days).toBe(r.days);
        expect(same(t.interest, r.interest) && same(t.repayment, r.repayment), r.note).toBe(true);
        if (r.conversion_price) {
          expect(same(t.baseShares!, r.conversion_base_shares!) && same(t.price!, r.conversion_price) && same(t.shares!, r.conversion_shares!), r.note).toBe(true);
        }
      }
    },
  );
});

const capped = { id: "p", name: "Seed", kind: "preferred", original_issue_price: "1", preference_multiple: "1", participation: "participating_capped", cap_multiple: "2" };

/** 800,000 common and a $100,000 note at 0%, repaid at 1x, with these terms. */
function table(note: Record<string, unknown>, extra: { notes?: Record<string, unknown>[]; safes?: Record<string, unknown>[]; preferred?: Record<string, unknown> } = {}) {
  return {
    holders: [{ id: "x", name: "X" }, { id: "n", name: "N" }, { id: "m", name: "M" }],
    securities: [{ id: "common", name: "Common Stock", kind: "common" }, ...(extra.preferred ? [extra.preferred] : [])],
    seniority: extra.preferred ? [["p"]] : [],
    positions: [{ holder: "x", security: "common", shares: 800000 }],
    unissued_pool: 0,
    unconverted_notes: [
      { id: "note", holder: "n", principal: "100000", interest_rate: "0", issue_date: "2023-01-01", valuation_cap: "800000", conversion_base: "with_pool", discount: "0", repayment_multiple: "1", ...note },
      ...(extra.notes ?? []),
    ],
    ...(extra.safes ? { unconverted_safes: extra.safes } : {}),
  };
}
const exitOn = (ct: unknown, exitDate: string | null = "2024-01-01") =>
  readExit({ cap_table: ct, range: ["0", "5000000"], exit_values: [], ...(exitDate ? { exit_date: exitDate } : {}) });

describe("a note with neither a cap nor a discount (X12)", () => {
  it("is only ever repaid: it decides nothing, and is paid its repayment ahead of common", () => {
    const exit = exitOn(table({ valuation_cap: null }));
    const pc = prepare(exit.capTable, exit.exitDate);
    expect(pc.notes.get("note")!.canConvert).toBe(false);
    const [answer] = solve(pc, new D(10000000)).answers;
    expect([...answer!.decisions.converted]).toEqual([]);
    expect(answer!.payout.bySecurity.get("note")!.toString()).toBe("100000");
  });
});

describe("a note with no cap beside capped participating preferred (X12, 13h)", () => {
  it("converts for exactly its amount ÷ (1 − discount), taken out first, and the Seed stops at its cap", () => {
    // 800,000 common; Investor M's 800,000-share Seed at $1.00, participating to a 2x cap; the $100,000 note at 0%, a
    // 20% discount and no cap. At $3,000,000 the Seed keeps its $800,000 preference, leaving $2,200,000. Converting is
    // worth exactly $100,000 ÷ 0.8 = $125,000, more than the $100,000 repayment, so the note takes that first. Half
    // of the other $2,075,000 would pass the Seed's cap, so it stops at $1,600,000, and common gets $1,275,000:
    // $1.59375 a share, so the note's shares are $100,000 ÷ (0.8 × $1.59375) = 78,431.37.
    const ct = table({ valuation_cap: null, discount: "0.2" }, { preferred: capped });
    ct.positions.push({ holder: "m", security: "p", shares: 800000 });
    const exit = exitOn(ct);
    const [answer] = solve(prepare(exit.capTable, exit.exitDate), new D(3000000)).answers;
    const paid = answer!.payout.bySecurity;
    expect([...answer!.decisions.converted]).toEqual(["note"]);
    expect([paid.get("p")!, paid.get("common")!, paid.get("note")!].map((v) => v.toString())).toEqual(["1600000", "1275000", "125000"]);
    expect(answer!.payout.atCap).toEqual(["p"]);
    expect(same(answer!.payout.notes.get("note")!.shares!, "4000000/51")).toBe(true);
  });
});

describe("the exit date (X3)", () => {
  it("is needed, on or after every note's issue date", () => {
    expect(() => exitOn(table({}), null)).toThrow("exit.exit_date: note accrues interest, so the exit needs an exit_date");
    expect(() => exitOn(table({}), "2022-12-31")).toThrow("exit.exit_date: 2022-12-31 is before note was issued, 2023-01-01");
  });
});

const postMoneySafe = { id: "s", holder: "m", purchase_amount: "100000", post_money_cap: "1000000" };

describe("a note with a cap beside a SAFE with a post-money cap (X18; 05c2)", () => {
  it("is read at a sale", () => {
    expect(readCapTable(table({}, { safes: [postMoneySafe] })).unconvertedNotes!.map((n) => n.id)).toEqual(["note"]);
  });

  // The SAFE buys 10% of its Liquidity Capitalization ($100,000 ÷ its $1,000,000 cap). The note's $100,000 converts at
  // its $800,000 cap ÷ 800,000 shares, $1.00, into 100,000 shares. So the count is 800,000 ÷ 0.9 with the note repaid,
  // and 900,000 ÷ 0.9 with it converting.
  it("counts in the SAFE's Liquidity Capitalization only when it converts", () => {
    const exit = exitOn(table({}, { safes: [postMoneySafe] }));
    const pc = prepare(exit.capTable, exit.exitDate);
    const lc = (converted: string[]) => payout(pc, new D(5000000), { converted: new Set(converted), exercised: new Set() }).safes.get("s")!.liquidityCapitalization!;
    expect(same(lc(["s"]), "8000000/9")).toBe(true);
    expect(same(lc(["s", "note"]), "1000000")).toBe(true);
  });
});

describe("what is refused, never skipped", () => {
  const second = { id: "note_m", holder: "m", principal: "50000", interest_rate: "0", issue_date: "2023-01-01", conversion_base: "with_pool", discount: "0.2", repayment_multiple: "1" };
  it.each([
    ["two notes where one has no cap (X15)", table({}, { notes: [{ ...second, valuation_cap: null }] }), "several_notes"],
    // X18 (05c2): beside SAFEs, only a note with a cap, and SAFEs with post-money caps.
    ["a note with no cap beside a SAFE (X18)", table({ valuation_cap: null, discount: "0.2" }, { safes: [postMoneySafe] }), "note_with_safe_or_carve_out"],
    ["a SAFE with no post-money cap beside a note (X18)", table({}, { safes: [{ ...postMoneySafe, post_money_cap: null, pre_money_cap: "1000000" }] }), "note_with_safe_or_carve_out"],
    ["a SAFE with no cap beside a note (X18)", table({}, { safes: [{ ...postMoneySafe, post_money_cap: null, discount: "0.2" }] }), "note_with_safe_or_carve_out"],
  ])("refuses %s, until a case settles it", (_, ct, term) => {
    let error: unknown;
    try {
      readCapTable(ct);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(UnsupportedTermError);
    expect(error).toMatchObject({ term, milestone: "later" });
  });

  it.each([
    ["an unknown holder", table({ holder: "z" }), "cap_table.unconverted_notes[0].holder: unknown holder z"],
    ["an id already used", table({ id: "common" }), "cap_table.unconverted_notes[0].id: common is already used"],
  ])("refuses %s, as malformed", (_, ct, message) => {
    expect(() => readCapTable(ct)).toThrow(message);
  });
});
