// 05c2: the SAFEs' greater-of comes last (E20), and SAFEs beside a note at a sale (X18). Cases 12j, 13i and 13j run
// through every exit test; these check what the cases don't pin: Jordan's check inside the band where 0.4.0's engine
// went round in a circle, one answer at every point of both bands, the tie among several SAFEs, and the wording.

import { describe, expect, it } from "vitest";

import { D, findBreakpoints, payout, prepare, readCapTable, solve } from "../src/index.ts";
import { readInputs } from "../src/case.ts";
import { FULL_SEARCH_TIMEOUT, readCaseFile } from "./support/cases.ts";

const caseTable = (name: string) => {
  const exit = readInputs(readCaseFile(name, "inputs.json"));
  return { exit, pc: prepare(exit.capTable, exit.exitDate) };
};
const OPTIONS = ["options_0.08", "options_0.1", "rsus"];

describe("Larkspur at a sale, where the Seed and the SAFEs went round in a circle (E20; 12j, 13j)", () => {
  it("keeps the Seed's preference at $16,545,000: converting, with the SAFEs following, would pay it $2,921,654.22", () => {
    const { pc } = caseTable("edge-12j-larkspur-safes-at-a-sale");
    const x = new D(16545000);
    const { answers } = solve(pc, x);
    expect(answers).toHaveLength(1);
    expect(answers[0]!.decisions.converted.has("cls-seed")).toBe(false);
    expect(answers[0]!.payout.bySecurity.get("cls-seed")!.toString()).toBe("2925000");
    // Converting, the Seed joins the SAFEs' count, and each SAFE's conversion shares are then worth more than its cash.
    const converting = payout(pc, x, { converted: new Set(["cls-seed", "safe-x1", "safe-s3"]), exercised: new Set(OPTIONS) });
    const cashX = payout(pc, x, { converted: new Set(["cls-seed", "safe-s3"]), exercised: new Set(OPTIONS) });
    expect(converting.bySecurity.get("safe-x1")!.gt(cashX.bySecurity.get("safe-x1")!)).toBe(true);
    expect(converting.bySecurity.get("cls-seed")!.toDecimalPlaces(2).toString()).toBe("2921654.22");
  });

  it.each([
    ["edge-12j-larkspur-safes-at-a-sale", 16_500_000, 16_600_000],
    ["edge-13j-larkspur-at-a-sale", 16_875_000, 16_950_000],
  ])("%s has one answer at every point of the old circle, $12,500 apart", (name, lo, hi) => {
    const { pc } = caseTable(name);
    for (let x = lo; x <= hi; x += 12_500) {
      const solution = solve(pc, new D(x));
      expect(solution.answers, `$${x}`).toHaveLength(1);
      expect(solution.complete).toBe(true);
    }
  });

  it("keeps the outcome from below at exactly the jump, where the Seed is indifferent", () => {
    const { pc } = caseTable("edge-12j-larkspur-safes-at-a-sale");
    const at = new D(380866000).div(23);
    const [answer] = solve(pc, at).answers;
    expect([...answer!.decisions.converted].sort()).toEqual([]);
    const [above] = solve(pc, at.plus("0.01")).answers;
    expect([...above!.decisions.converted].sort()).toEqual(["cls-seed", "safe-s3", "safe-x1"]);
  });

  it("says the SAFEs follow the Seed at the jump", () => {
    const { exit, pc } = caseTable("edge-12j-larkspur-safes-at-a-sale");
    const jump = findBreakpoints(pc, exit.range).find((b) => b.jumps)!;
    const text = (code: string, subject: string) => jump.reasons.find((r) => r.code === code && r.subject.includes(subject))!.text;
    expect(text("series_converts", "cls-seed")).toBe(
      "Seed Preferred converts to common here: with the SAFEs paid as their terms then pay them, converting pays it more above this exit value. " +
        "Converting puts it in the SAFEs' Liquidity Capitalization, so Investor X's SAFE and Investor S's SAFE then take their Conversion Amounts. " +
        "At this exit value its 3,781,250 as-converted shares that way are worth $3,025,000 at $0.80 each, the same as its 1x preference of $3,025,000. " +
        "Below it, keeping its preference pays more.",
    );
    expect(text("safe_switches", "safe-x1")).toBe(
      "Investor X's SAFE switches from its Cash-Out Amount to its Conversion Amount here, following Seed Preferred: its Liquidity Capitalization " +
        "now counts it, so its 330,244.57 conversion shares ($250,000 ÷ the Liquidity Price of $0.757015) are worth $0.80 each just above this " +
        "exit value, $264,195.65 in all, more than its $250,000 purchase amount.",
    );
  }, FULL_SEARCH_TIMEOUT);
});

describe("a note beside a SAFE (X18; 13i)", () => {
  it("says why the SAFE's payout jumps where the note converts", () => {
    const { exit, pc } = caseTable("edge-13i-note-beside-a-safe");
    const jump = findBreakpoints(pc, exit.range).find((b) => b.jumps)!;
    expect(jump.exitValue.toFixed(2)).toBe("13444444.44");
    expect(jump.reasons.find((r) => r.code === "note_switches")!.text).toMatch(
      /Converting adds its shares to the Liquidity Capitalization Investor S's SAFE converts on, so its conversion shares grow with it: just above this exit value its payout jumps up and common's down\.$/,
    );
  });
});

// Until 05c4: Jordan reversed this tie to the most conversions after #71 (E20), and edge case 12k is its case.
describe("several SAFEs that could settle more than one way take the fewest conversions (E20, E5)", () => {
  // Two equal SAFEs, $250,000 each at a $2,000,000 post-money cap, beside 1,000,000 common. Both converting, each gets
  // an eighth of the sale; one converting on its own, an eighth of what's left after the other's cash. So from
  // $2,000,000 to $2,250,000 both taking cash and both converting are each stable: 0.4.0's engine reported both
  // answers there. Converting alone doesn't pay until $2,250,000, so they take cash until then, and payouts jump.
  const ct = readCapTable({
    holders: [{ id: "f", name: "Founder" }, { id: "a", name: "Investor A" }, { id: "b", name: "Investor B" }],
    securities: [{ id: "common", name: "Common Stock", kind: "common" }],
    seniority: [],
    positions: [{ holder: "f", security: "common", shares: 1000000 }],
    unissued_pool: 0,
    unconverted_safes: [
      { id: "safe_a", holder: "a", purchase_amount: "250000", post_money_cap: "2000000" },
      { id: "safe_b", holder: "b", purchase_amount: "250000", post_money_cap: "2000000" },
    ],
  });
  const pc = prepare(ct, null);

  it.each([["2100000"], ["2250000"]])("at $%s, both take their cash: one answer", (x) => {
    const { answers } = solve(pc, new D(x));
    expect(answers).toHaveLength(1);
    expect([...answers[0]!.decisions.converted]).toEqual([]);
    expect(answers[0]!.payout.bySecurity.get("safe_a")!.toString()).toBe("250000");
  });

  it("jumps at $2,250,000, where converting alone first pays, and says so", () => {
    const found = findBreakpoints(pc, [new D(0), new D(5000000)]);
    expect(found.map((b) => [b.exitValue.toString(), b.jumps])).toEqual([["500000", false], ["2250000", true]]);
    expect(found[1]!.reasons.find((r) => r.subject.includes("safe_a"))!.text).toBe(
      "Investor A's SAFE switches from its Cash-Out Amount to its Conversion Amount here, with Investor B's SAFE. Converting on its own, " +
        "its 142,857.14 conversion shares ($250,000 ÷ the Liquidity Price of $1.75) would be worth $1.75 each, $250,000 in all, the same as its " +
        "purchase amount; above this exit value, converting pays more. With the other SAFE converting too, the Liquidity Capitalization counts its " +
        "shares, so its 166,666.67 shares are worth $1.6875 each just above this exit value, $281,250 in all.",
    );
  });
});
