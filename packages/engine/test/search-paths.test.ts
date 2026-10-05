// E15's two rare paths, forced with artificial choices because no realistic
// cap table reaches them: the cycle error, and the "may be incomplete" flag
// above 12 series. settleChoice is internal: it isn't exported from the
// package, so these tests import it from its module directly.

import { describe, expect, it } from "vitest";

import { D, NoAnswerError } from "../src/index.ts";
import { MAX_CHECKED, settleChoice } from "../src/decisions.ts";
import type { Choice } from "../src/decisions.ts";

function choice(players: string[], value: (converted: ReadonlySet<string>, p: string) => number): Choice {
  const payouts = (set: ReadonlySet<string>) => players.map((p) => value(set, p));
  return {
    players,
    value: (set, p) => new D(value(set, p)),
    samePayouts: (a, b) => payouts(a).every((v, i) => v === payouts(b)[i]),
    size: (set) => set.size,
    where: "In this test",
  };
}

describe("E15: going round in a circle is an error", () => {
  it("stops instead of looping when no set of decisions is stable", () => {
    // Matching pennies: p wants to do what q does, q wants to do the opposite.
    // Every switch makes the other want to switch, so solving from either end cycles.
    const pennies = choice(["p", "q"], (c, who) =>
      who === "p" ? (c.has("p") === c.has("q") ? 1 : 0) : c.has("p") !== c.has("q") ? 1 : 0,
    );
    expect(() => settleChoice(pennies)).toThrow(NoAnswerError);
    expect(() => settleChoice(pennies)).toThrow(/went round in a circle/);
  });
});

describe("E15: two ends that disagree", () => {
  // A coordination game: a series is better off converting only if every series
  // converts. "Nobody converts" and "everyone converts" are both stable, and pay
  // differently, so the two ends disagree.
  const together = (n: number) => {
    const players = Array.from({ length: n }, (_, i) => `s${i}`);
    return choice(players, (c, p) => (c.has(p) ? (c.size === n ? 2 : 0) : 1));
  };

  it(`with ${MAX_CHECKED} series, checks every combination and finds both answers`, () => {
    const { sets, complete } = settleChoice(together(MAX_CHECKED));
    expect(complete).toBe(true);
    expect(sets.map((s) => s.size)).toEqual([0, MAX_CHECKED]);
  });

  it(`with ${MAX_CHECKED + 1} series, reports both answers it found and flags the list as possibly incomplete`, () => {
    const { sets, complete } = settleChoice(together(MAX_CHECKED + 1));
    expect(complete).toBe(false);
    expect(sets.map((s) => s.size)).toEqual([0, MAX_CHECKED + 1]);
  });
});
