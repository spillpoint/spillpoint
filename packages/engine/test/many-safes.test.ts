// Timing the breakpoint search on the made-up table of 0.8.0's plan (10j): 26 post-money SAFEs at two caps, beside 1
// to 12 option strikes, and 10 SAFEs at 3 strikes. A real founder's table can have about 26 open SAFEs and a few dozen
// option grants. Each time is printed on every run, as Larkspur's is (safes-last.test.ts).
//
// Two shapes. "Two amounts" is the plan's table: $250,000 at the $20M cap and $100,000 at the $12M one. "Each its own
// amount" gives every SAFE its own purchase amount, as founders' tables have, and it's the table the target is for
// (Jordan, 10j): under 5 seconds on CI at 5 option strikes, for every breakpoint and the answer at each, as the page
// works them out. 8 and 12 strikes are reported, and don't decide.

import { describe, expect, it } from "vitest";

import { findBreakpoints, prepare, readExit, solve } from "../src/index.ts";
import { manySafesAndStrikes } from "./support/many-safes.ts";

/** SAFEs, option strikes, the amounts, and the breakpoints the search finds: each strike adds one. */
const ROWS: [number, number, "two" | "each its own", number][] = [
  [26, 1, "two", 7],
  [26, 3, "two", 8],
  [26, 5, "two", 10],
  [26, 8, "two", 13],
  [26, 12, "two", 17],
  [10, 3, "two", 8],
  [26, 1, "each its own", 7],
  [26, 3, "each its own", 8],
  [26, 5, "each its own", 10],
  [26, 8, "each its own", 13],
  [26, 12, "each its own", 18],
];

describe("the breakpoint search on many SAFEs and option strikes (10j; 0.8.0's plan)", () => {
  // On a laptop the slowest row, 12 strikes with each its own amount, takes about 8 seconds since 10j, and took 49
  // before it. Each test has a minute: a limit near the time would fail at random on a slow runner.
  for (const [safes, strikes, amounts, breakpoints] of ROWS) {
    const what = `${safes} SAFEs at two caps${amounts === "two" ? "" : ", each its own amount"}, ${strikes} option strike${strikes === 1 ? "" : "s"}`;
    it(`${what}: every breakpoint, and the answer at each`, () => {
      const exit = readExit(manySafesAndStrikes(safes, strikes, amounts));
      const pc = prepare(exit.capTable, exit.exitDate);
      const start = performance.now();
      const found = findBreakpoints(pc, exit.range);
      for (const b of found) expect(solve(pc, b.exitValue).answers).toHaveLength(1);
      const seconds = ((performance.now() - start) / 1000).toFixed(2);
      process.stdout.write(`${what}: ${seconds}s for ${found.length} breakpoints\n`);
      expect(found).toHaveLength(breakpoints);
    }, 60_000);
  }
});
