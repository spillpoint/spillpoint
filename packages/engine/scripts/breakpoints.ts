// Prints every breakpoint for a case, with its reasons in plain English, and
// whether it matches expected.json. A dev tool for reading the engine's
// output; it reads case files, so it isn't part of the package.
//
//   pnpm breakpoints <case> [<low> <high>]
//
// With no range it uses the case's own.

import type { Decimal } from "decimal.js";

import { findBreakpoints, parseExact, prepare } from "../src/index.ts";
import { readInputs } from "../src/case.ts";
import { money } from "../src/reasons.ts";
import { readCaseFile } from "../test/support/cases.ts";

const [caseName, lowText, highText] = process.argv.slice(2);
if (!caseName) {
  console.error("usage: pnpm breakpoints <case> [<low> <high>]");
  process.exit(2);
}

const exit = readInputs(readCaseFile(caseName, "inputs.json"));
const range: [Decimal, Decimal] =
  lowText && highText ? [parseExact(lowText, "low"), parseExact(highText, "high")] : exit.range;
const found = findBreakpoints(prepare(exit.capTable, exit.exitDate), range);

interface Recorded {
  exit: { breakpoints: { exit_value: string; payouts_jump?: boolean }[] };
}
const recorded = lowText ? null : (readCaseFile(caseName, "expected.json") as Recorded).exit.breakpoints;

console.log(`${caseName}: ${found.length} breakpoint${found.length === 1 ? "" : "s"} between ${money(range[0])} and ${money(range[1])}`);
if (recorded) {
  const same =
    recorded.length === found.length &&
    found.every((b, i) => b.exitValue.minus(recorded[i]!.exit_value).abs().lte("0.01") && b.jumps === (recorded[i]!.payouts_jump ?? false));
  console.log(same ? "All match expected.json (to the cent, with the same jumps)." : "They DIFFER from expected.json.");
}
for (const [i, b] of found.entries()) {
  console.log(`\n${i + 1}. ${money(b.exitValue)}${b.jumps ? "  (payouts jump)" : ""}`);
  for (const r of b.reasons) console.log(`   - ${r.text}`);
}
