// Timing the breakpoint search on the made-up table of 0.8.0's plan (10j): 26 post-money SAFEs at two caps, beside 1
// to 12 option strikes, and 10 SAFEs at 3 strikes. A real founder's table can have about 26 open SAFEs and a few dozen
// option grants. Jordan's target: under 5 seconds on CI's machine at 12 strikes, for every breakpoint and the answer at
// each, as the page works them out. Each time is printed on every run, as Larkspur's is (safes-last.test.ts).

import { describe, expect, it } from "vitest";

import { findBreakpoints, prepare, readExit, solve } from "../src/index.ts";
import { manySafesAndStrikes } from "./support/many-safes.ts";

/** SAFEs, option strikes, and the breakpoints the search finds: each strike adds one. */
const ROWS: [number, number, number][] = [
  [26, 1, 7],
  [26, 3, 8],
  [26, 5, 10],
  [26, 8, 13],
  [26, 12, 17],
  [10, 3, 8],
];

describe("the breakpoint search on many SAFEs and option strikes (10j; 0.8.0's plan)", () => {
  // Before 10j, on a laptop, 12 strikes took about 12 seconds, so each test has two minutes: a limit at the target
  // would fail at random on a slow runner.
  for (const [safes, strikes, breakpoints] of ROWS) {
    it(`${safes} SAFEs at two caps and ${strikes} option strike${strikes === 1 ? "" : "s"}: every breakpoint, and the answer at each`, () => {
      const exit = readExit(manySafesAndStrikes(safes, strikes));
      const pc = prepare(exit.capTable, exit.exitDate);
      const start = performance.now();
      const found = findBreakpoints(pc, exit.range);
      for (const b of found) expect(solve(pc, b.exitValue).answers).toHaveLength(1);
      const seconds = ((performance.now() - start) / 1000).toFixed(2);
      process.stdout.write(`${safes} SAFEs at two caps, ${strikes} option strike${strikes === 1 ? "" : "s"}: ${seconds}s for ${found.length} breakpoints\n`);
      expect(found).toHaveLength(breakpoints);
    }, 120_000);
  }
});
