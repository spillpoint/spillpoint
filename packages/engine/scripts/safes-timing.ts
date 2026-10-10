// Times the breakpoint search on Larkspur at a sale with 2 to 10 post-money SAFEs, with and without its note, as the
// page runs it: every breakpoint over the case's range, then the answer at each (05c4). A dev tool.
//
//   pnpm safes-timing [2 4 6 8 10]
//
// Before 05c4 the 10-SAFE table with its note took 204s on an M1 Pro laptop; it takes about 1.4s.

import { findBreakpoints, prepare, readExit, solve } from "../src/index.ts";
import { larkspurWithSafes } from "../test/support/larkspur.ts";

const counts = process.argv.slice(2).map(Number);
const rows: string[] = ["| SAFEs | Without the note | With the note |", "|---:|---:|---:|"];
for (const safes of counts.length > 0 ? counts : [2, 4, 6, 8, 10]) {
  const times = [false, true].map((withNote) => {
    const exit = readExit(larkspurWithSafes(safes, withNote));
    const pc = prepare(exit.capTable, exit.exitDate);
    const start = performance.now();
    const found = findBreakpoints(pc, exit.range);
    for (const b of found) solve(pc, b.exitValue);
    return `${((performance.now() - start) / 1000).toFixed(1)}s, ${found.length} breakpoints`;
  });
  rows.push(`| ${safes} | ${times[0]} | ${times[1]} |`);
  console.log(rows.at(-1));
}
console.log(`\n${rows.join("\n")}`);
