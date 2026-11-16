// Times the breakpoint search on the made-up table of 0.8.0's plan: post-money SAFEs at two caps beside option strikes
// (10j), as the page runs it: every breakpoint over $0 to $200M, then the answer at each. With each time, the most heap
// the row held (test/support/peak-heap.ts). A dev tool.
//
//   pnpm many-safes-timing [strikes ...]        26 SAFEs at each count of strikes (default 1 3 5 8 12)
//   pnpm many-safes-timing --safes 10 3          10 SAFEs at 3 strikes
//   pnpm many-safes-timing --each-its-own 1 3     every SAFE its own purchase amount, as on a real table
//   pnpm many-safes-timing --three-caps          Jordan's table at three caps, with discounts, a warrant and a senior 1.5x series
//
// Rows run one after another in this process, as the timing test runs them. Jordan's table runs in a worker given at
// most Node's default heap on an 8 GB machine, 2,096 MB, as the test runs it (test/support/search-worker.ts).

import { findBreakpoints, prepare, readExit, solve } from "../src/index.ts";
import { manySafesAndStrikes } from "../test/support/many-safes.ts";
import { measured } from "../test/support/peak-heap.ts";
import { inWorker } from "../test/support/search-worker.ts";

let args = process.argv.slice(2);
const amounts = args.includes("--each-its-own") ? "each its own" : "two";
const threeCaps = args.includes("--three-caps");
args = args.filter((a) => a !== "--each-its-own" && a !== "--three-caps");
const at = args.indexOf("--safes");
const safes = at >= 0 ? Number(args[at + 1]) : 26;
const counts = (at >= 0 ? args.filter((_, i) => i !== at && i !== at + 1) : args).map(Number);

const rows: string[] = [];
if (threeCaps) {
  rows.push("| Table | Breakpoints | Seconds | Peak heap (MB) | Heap's limit (MB) |", "|---|---:|---:|---:|---:|");
  const r = await inWorker({ threeCaps: true }, 1904);
  rows.push(`| Jordan's, at three caps | ${r.breakpoints} | ${r.seconds.toFixed(2)} | ${r.peakHeap} | ${r.heapLimit} |`);
  console.log(rows.at(-1));
} else {
  rows.push(`| SAFEs (amounts: ${amounts}) | Option strikes | Breakpoints | Seconds | Peak heap (MB) |`, "|---:|---:|---:|---:|---:|");
  for (const strikes of counts.length > 0 ? counts : [1, 3, 5, 8, 12]) {
    const exit = readExit(manySafesAndStrikes(safes, strikes, amounts));
    const pc = prepare(exit.capTable, exit.exitDate);
    const { value, seconds, peakHeap } = measured(() => {
      const found = findBreakpoints(pc, exit.range);
      for (const b of found) solve(pc, b.exitValue);
      return found.length;
    });
    rows.push(`| ${safes} | ${strikes} | ${value} | ${seconds.toFixed(2)} | ${peakHeap} |`);
    console.log(rows.at(-1));
  }
}
console.log(`\n${rows.join("\n")}`);
