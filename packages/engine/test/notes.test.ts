// M5h: convertible notes still outstanding at a sale (C9; X3, X10–X12, X15,
// X16). Cases 13a to 13g run through every exit test; these check what the
// cases don't reach: each note's figures against its case's report, a note
// that can only be repaid, the exit date, and the refusals.

import { describe, expect, it } from "vitest";

import { D, UnsupportedTermError, prepare, readCapTable, readExit, solve } from "../src/index.ts";
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

describe("the exit date (X3)", () => {
  it("is needed, on or after every note's issue date", () => {
    expect(() => exitOn(table({}), null)).toThrow("exit.exit_date: note accrues interest, so the exit needs an exit_date");
    expect(() => exitOn(table({}), "2022-12-31")).toThrow("exit.exit_date: 2022-12-31 is before note was issued, 2023-01-01");
  });
});

describe("what is refused, never skipped", () => {
  const second = { id: "note_m", holder: "m", principal: "50000", interest_rate: "0", issue_date: "2023-01-01", conversion_base: "with_pool", discount: "0.2", repayment_multiple: "1" };
  const capped = { id: "p", name: "Seed", kind: "preferred", original_issue_price: "1", preference_multiple: "1", participation: "participating_capped", cap_multiple: "2" };
  it.each([
    ["two notes where one has no cap (X15)", table({}, { notes: [{ ...second, valuation_cap: null }] }), "several_notes"],
    ["a note alongside a SAFE (X12)", table({}, { safes: [{ id: "s", holder: "m", purchase_amount: "100000", post_money_cap: "1000000" }] }), "note_with_safe_or_carve_out"],
    ["a note with no cap alongside capped participating preferred (X12)", table({ valuation_cap: null, discount: "0.2" }, { preferred: capped }), "uncapped_note_with_capped_participation"],
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
