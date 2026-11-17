// Timing the breakpoint search on the made-up table of 0.8.0's plan (10j): 26 post-money SAFEs at two caps, beside 1
// to 12 option strikes, and 10 SAFEs at 3 strikes. A real founder's table can have about 26 open SAFEs and a few dozen
// option grants. Each time is printed on every run, with the most heap the row held (support/peak-heap.ts), as
// Larkspur's time is (safes-last.test.ts).
//
// Two shapes. "Two amounts" is the plan's table: $250,000 at the $20M cap and $100,000 at the $12M one. "Each its own
// amount" gives every SAFE its own purchase amount, as founders' tables have, and it's the table the target is for
// (Jordan, 10j): under 5 seconds on CI at 5 option strikes, for every breakpoint and the answer at each, as the page
// works them out. 8 and 12 strikes are reported, and don't decide.
//
// And Jordan's table at three caps, with discounts, a warrant and a senior 1.5x series: the one that ran out of memory
// in Node's default heap of 2,096 MB, where main didn't, until the search let go what it had passed (10j). It runs in a
// worker given no more than that heap, so it fails wherever the search needs more, whatever the machine's own
// default. Node sizes the heap's young part by platform, so the same old space gives 2,096 MB on a Mac and 1,952 MB
// on CI's Linux.

import { describe, expect, it } from "vitest";

import { findBreakpoints, prepare, readExit, solve } from "../src/index.ts";
import { manySafesAndStrikes } from "./support/many-safes.ts";
import { measured } from "./support/peak-heap.ts";
import { inWorker } from "./support/search-worker.ts";

/** The old space that gives a heap of 2,096 MB in all on a Mac, Node's default on a machine with 8 GB, and less on Linux. */
const DEFAULT_OLD_SPACE = 1904;

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
      const { value: found, seconds, peakHeap } = measured(() => {
        const found = findBreakpoints(pc, exit.range);
        for (const b of found) expect(solve(pc, b.exitValue).answers).toHaveLength(1);
        return found;
      });
      process.stdout.write(`${what}: ${seconds.toFixed(2)}s for ${found.length} breakpoints, peak heap ${peakHeap} MB\n`);
      expect(found).toHaveLength(breakpoints);
    }, 60_000);
  }

  // About 25 seconds on a laptop since 10j; main took about 3 minutes in this heap. Three minutes for a slow runner.
  it("Jordan's table at three caps, with discounts, a warrant and a senior 1.5x series: every breakpoint, and the answer at each, in a heap of at most 2,096 MB", async () => {
    const run = await inWorker({ threeCaps: true }, DEFAULT_OLD_SPACE);
    process.stdout.write(
      `Jordan's table at three caps: ${run.seconds.toFixed(2)}s for ${run.breakpoints} breakpoints, peak heap ${run.peakHeap} MB of ${run.heapLimit} MB\n`,
    );
    expect(run.heapLimit).toBeLessThanOrEqual(2096);
    expect(run.breakpoints).toBe(23);
    expect(run.answers.every((n) => n === 1)).toBe(true);
  }, 180_000);
});
