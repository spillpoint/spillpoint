// Times the breakpoint search on the made-up table of 0.8.0's plan: post-money SAFEs at two caps beside option strikes
// (10j), as the page runs it: every breakpoint over $0 to $200M, then the answer at each. A dev tool.
//
//   pnpm many-safes-timing [strikes ...]        26 SAFEs at each count of strikes (default 1 3 5 8 12)
//   pnpm many-safes-timing --safes 10 3          10 SAFEs at 3 strikes
//   pnpm many-safes-timing --each-its-own 1 3     every SAFE its own purchase amount, as on a real table

import { findBreakpoints, prepare, readExit, solve } from "../src/index.ts";
import { manySafesAndStrikes } from "../test/support/many-safes.ts";

let args = process.argv.slice(2);
const amounts = args.includes("--each-its-own") ? "each its own" : "two";
args = args.filter((a) => a !== "--each-its-own");
const at = args.indexOf("--safes");
const safes = at >= 0 ? Number(args[at + 1]) : 26;
const counts = (at >= 0 ? args.filter((_, i) => i !== at && i !== at + 1) : args).map(Number);
const rows: string[] = [`| SAFEs (amounts: ${amounts}) | Option strikes | Breakpoints | Seconds |`, "|---:|---:|---:|---:|"];
for (const strikes of counts.length > 0 ? counts : [1, 3, 5, 8, 12]) {
  const exit = readExit(manySafesAndStrikes(safes, strikes, amounts));
  const pc = prepare(exit.capTable, exit.exitDate);
  const start = performance.now();
  const found = findBreakpoints(pc, exit.range);
  for (const b of found) solve(pc, b.exitValue);
  rows.push(`| ${safes} | ${strikes} | ${found.length} | ${((performance.now() - start) / 1000).toFixed(2)} |`);
  console.log(rows.at(-1));
}
console.log(`\n${rows.join("\n")}`);
