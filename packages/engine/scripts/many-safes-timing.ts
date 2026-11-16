// Times the breakpoint search on the made-up table of 0.8.0's plan: post-money SAFEs at two caps beside option strikes
// (10j), as the page runs it: every breakpoint over $0 to $200M, then the answer at each. With each time, the most heap
// the row held. A dev tool.
//
//   pnpm many-safes-timing [strikes ...]        26 SAFEs at each count of strikes (default 1 3 5 8 12)
//   pnpm many-safes-timing --safes 10 3          10 SAFEs at 3 strikes
//   pnpm many-safes-timing --each-its-own 1 3     every SAFE its own purchase amount, as on a real table
//   pnpm many-safes-timing --three-caps          Jordan's table at three caps, with discounts, a warrant and a senior 1.5x series
//   pnpm many-safes-timing --three-caps --old-space 1904   the same in Node's default heap on an 8 GB machine, 2,096 MB
//
// Each row runs in a worker of its own (test/support/search-worker.ts), so its peak heap is its own.

import { inWorker } from "../test/support/search-worker.ts";
import type { Run } from "../test/support/search-worker.ts";

let args = process.argv.slice(2);
const amounts = args.includes("--each-its-own") ? "each its own" : "two";
const threeCaps = args.includes("--three-caps");
args = args.filter((a) => a !== "--each-its-own" && a !== "--three-caps");

/** Take `--name n` out of the arguments, and give n. */
function option(name: string): number | undefined {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  const n = Number(args[at + 1]);
  args = args.filter((_, i) => i !== at && i !== at + 1);
  return n;
}
const oldSpace = option("--old-space");
const safes = option("--safes") ?? 26;
const counts = args.map(Number);
const heap = (r: Run) => `${r.peakHeap} of ${r.heapLimit}`;

const rows: string[] = [];
if (threeCaps) {
  rows.push("| Table | Breakpoints | Seconds | Peak heap (MB of the limit) |", "|---|---:|---:|---:|");
  const r = await inWorker({ threeCaps: true }, oldSpace);
  rows.push(`| Jordan's, at three caps | ${r.breakpoints} | ${r.seconds.toFixed(2)} | ${heap(r)} |`);
  console.log(rows.at(-1));
} else {
  rows.push(`| SAFEs (amounts: ${amounts}) | Option strikes | Breakpoints | Seconds | Peak heap (MB of the limit) |`, "|---:|---:|---:|---:|---:|");
  for (const strikes of counts.length > 0 ? counts : [1, 3, 5, 8, 12]) {
    const r = await inWorker({ safes, strikes, amounts }, oldSpace);
    rows.push(`| ${safes} | ${strikes} | ${r.breakpoints} | ${r.seconds.toFixed(2)} | ${heap(r)} |`);
    console.log(rows.at(-1));
  }
}
console.log(`\n${rows.join("\n")}`);
