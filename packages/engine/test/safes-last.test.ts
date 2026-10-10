// 05c2: the SAFEs' greater-of comes last (E20), and SAFEs beside a note at a sale (X18); 05c4: the SAFEs' most
// conversions (E20) and warrant shares keeping a preference (X1). Cases 12j to 12l, 13i and 13j run through every exit
// test; these check what the cases don't pin: Jordan's check inside the band where 0.4.0's engine went round in a
// circle, one answer at every point of both bands, the count itself, and the wording.

import { describe, expect, it } from "vitest";

import { D, findBreakpoints, payout, prepare, readExit, solve } from "../src/index.ts";
import { readInputs } from "../src/case.ts";
import { readCaseFile } from "./support/cases.ts";
import { larkspurWithSafes } from "./support/larkspur.ts";

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
  });
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

describe("several SAFEs that could settle more than one way take the most conversions (E20; Jordan, after #71)", () => {
  // Case 12k: two equal SAFEs, $500,000 each at a $5M post-money cap, beside 10,000,000 common. From $5M to $5.5M
  // both taking cash and both converting are each stable. 0.4.0's engine reported both answers there, and 05c2's took
  // the cash; they convert, from $5M, where payouts bend.
  const { exit, pc } = caseTable("edge-12k-two-equal-safes");

  it("at $5,250,000, both convert: one answer", () => {
    const { answers } = solve(pc, new D(5250000));
    expect(answers).toHaveLength(1);
    expect([...answers[0]!.decisions.converted].sort()).toEqual(["safe_x", "safe_y"]);
    expect(answers[0]!.payout.bySecurity.get("safe_x")!.toString()).toBe("525000");
  });

  it("bends at $5,000,000, where converting together first pays, and says so", () => {
    const found = findBreakpoints(pc, exit.range);
    expect(found.map((b) => [b.exitValue.toFixed(2), b.jumps])).toEqual([["1000000.00", false], ["5000000.00", false]]);
    expect(found[1]!.reasons.find((r) => r.subject.includes("safe_x"))!.text).toBe(
      "Investor X's SAFE switches from its Cash-Out Amount to its Conversion Amount here. Its 1,250,000 conversion shares ($500,000 ÷ the " +
        "Liquidity Price of $0.40) are worth $0.40 each, $500,000 in all, the same as its purchase amount. Below this exit value the Cash-Out " +
        "Amount pays more; above it, the Conversion Amount does. It converts together with Investor Y's SAFE. On its own, converting would pay " +
        "it only $450,000 here, less than its cash; with both converting, each gets its fixed share of the Liquidity Capitalization, which pays " +
        "more above this exit value, so they convert.",
    );
  });
});

describe("a warrant exercised into a series keeping its preference is left out of the SAFE's count (X1; Jordan, after #71)", () => {
  // Case 12l: case 8's warrant for 200,000 Seed at $0.50, below the Seed's $1.00 preference, beside a $500,000 SAFE at a
  // $5M post-money cap. Counting the warrant's shares, the SAFE would convert at $6,990,243.90.
  const { exit, pc } = caseTable("edge-12l-warrant-below-preference-beside-a-safe");

  it("counts 8,000,000 besides the SAFE while the Seed keeps its preference and the warrant is exercised; 8,200,000 while it isn't", () => {
    const lc = (exercised: string[]) =>
      payout(pc, new D(10000000), { converted: new Set(["safe_s"]), exercised: new Set(exercised) }).safes.get("safe_s")!.liquidityCapitalization!;
    expect(lc(["warrant_seed"]).times(9).toDecimalPlaces(20).toString()).toBe("80000000");
    expect(lc([]).times(9).toDecimalPlaces(20).toString()).toBe("82000000");
  });

  it("takes the SAFE's cash at $7,000,000, and says why payouts jump where the Seed converts", () => {
    const [answer] = solve(pc, new D(7000000)).answers;
    expect([...answer!.decisions.converted]).toEqual([]);
    const jump = findBreakpoints(pc, exit.range).find((b) => b.jumps)!;
    expect(jump.reasons.find((r) => r.code === "series_converts")!.text).toMatch(
      /at \$1\.00 each, the same as its 1x preference of \$2,200,000\. .* Converting puts its shares in the Liquidity Capitalization Investor S's SAFE converts on, so its conversion shares grow with it: just above this exit value its payout jumps up and common's down\.$/,
    );
  });
});

describe("Larkspur at a sale with its note and 10 post-money SAFEs (05c4; Jordan, after #71)", () => {
  // Jordan's target: under 5 seconds on CI's 2-core machine for the breakpoint search and the answer at each
  // breakpoint, as the page works them out. The time is printed for each run to show; a limit at the target would fail
  // at random on a slow runner, so the test has 20 seconds. On a laptop it takes about 1.9s; before 05c4, 204s. On CI, after
  // 05c4, 4.6s and 4.1s on the two Node versions; 05c5's check of every combination for a second answer added about a third.
  it("works out every breakpoint, and the answer at each, and prints how long that took", () => {
    const exit = readExit(larkspurWithSafes(10, true));
    const pc = prepare(exit.capTable, exit.exitDate);
    const start = performance.now();
    const found = findBreakpoints(pc, exit.range);
    for (const b of found) expect(solve(pc, b.exitValue).answers).toHaveLength(1);
    process.stdout.write(`Larkspur with its note and 10 SAFEs: ${((performance.now() - start) / 1000).toFixed(2)}s for ${found.length} breakpoints\n`);
    expect(found.length).toBeGreaterThan(0);
  }, 20_000);
});
