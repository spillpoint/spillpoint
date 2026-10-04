// Prints who gets what for a case at one exit value. A dev tool for checking
// the engine by hand; it reads case files, so it isn't part of the package.
//
//   pnpm payouts <case> <exit value> [--convert id,id] [--exercise id,id]
//
// With no flags the engine decides who converts and who exercises (M2c). With
// --convert or --exercise those decisions are forced instead: nothing
// converts or exercises unless named. At an exit value expected.json reports,
// expected.json's amounts are shown alongside, with whether its decisions match.

import type Decimal from "decimal.js";

import { parseExact, payout, prepare, readCase, sameAmount, solve, toCents } from "../src/index.ts";
import type { Decisions } from "../src/index.ts";
import { capTablesOf, decisionsFrom, expectedPoints, readCaseFile } from "../test/support/cases.ts";

function dollars(amount: Decimal | string): string {
  const cents = typeof amount === "string" ? amount : toCents(amount);
  const [whole, frac] = cents.split(".") as [string, string];
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${frac}`;
}

function table(rows: string[][]): string {
  const widths = rows[0]!.map((_, c) => Math.max(...rows.map((r) => r[c]!.length)));
  return rows
    .map((r) => r.map((cell, c) => (c >= 2 ? cell.padStart(widths[c]!) : cell.padEnd(widths[c]!))).join("   "))
    .join("\n");
}

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i < 0 ? null : (args[i + 1] ?? "").split(",").filter(Boolean);
};
const [caseName, exitText] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!caseName || !exitText) {
  console.error("usage: pnpm payouts <case> <exit value> [--convert id,id] [--exercise id,id]");
  process.exit(2);
}

const exit = readCase(readCaseFile(caseName, "inputs.json"), capTablesOf(caseName));
const exitValue = parseExact(exitText, "exit value");
const convert = flag("--convert");
const exercise = flag("--exercise");

const pc = prepare(exit.capTable);
const point = expectedPoints(caseName).find((p) => sameAmount(p.exitValue, exitValue) || p.label === toCents(exitValue));
// At a breakpoint expected.json reports, use its exact value rather than the cent it displays.
const at = point ? point.exitValue : exitValue;
const recordedOutcome = point && point.equilibria.length === 1 ? point.equilibria[0]! : null;
const recorded = recordedOutcome ? new Map(recordedOutcome.lines.map((l) => [`${l.holder}|${l.security}`, l.amount])) : null;

let decisions: Decisions;
let source: string;
if (convert || exercise) {
  decisions = { converted: new Set(convert ?? []), exercised: new Set(exercise ?? []) };
  source = "forced from the command line";
} else {
  const solution = solve(pc, at);
  if (solution.answers.length > 1) console.log(`Note: ${solution.answers.length} stable answers here (E8); showing the first.`);
  if (!solution.complete) console.log("Note: the list of answers may be incomplete (E15).");
  decisions = solution.answers[0]!.decisions;
  source = "solved by the engine";
  if (recordedOutcome) {
    const want = decisionsFrom(recordedOutcome.decisions);
    const same = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every((x) => b.has(x));
    const match = same(want.converted, decisions.converted) && same(want.exercised, decisions.exercised);
    source += match ? "; they match expected.json" : "; they DIFFER from expected.json";
  }
}

const result = payout(pc, at, decisions);
const name = new Map<string, string>([
  ...exit.capTable.holders.map((h) => [h.id, h.name] as [string, string]),
  ...exit.capTable.securities.map((s) => [s.id, s.name] as [string, string]),
]);

const converted = [...decisions.converted].map((id) => name.get(id)).join(", ") || "none";
const exercised = [...decisions.exercised].map((id) => name.get(id)).join(", ") || "none";
console.log(`${caseName} at $${dollars(exitValue)}`);
console.log(`Converts: ${converted}. Exercised: ${exercised}. (Decisions ${source}.)\n`);

const header = ["Holder", "Security", "Payout", ...(recorded ? ["expected.json"] : [])];
console.log(
  table([
    header,
    ...result.lines.map((l) => [
      name.get(l.holder)!,
      name.get(l.security)!,
      dollars(l.amount),
      ...(recorded ? [dollars(recorded.get(`${l.holder}|${l.security}`) ?? "—")] : []),
    ]),
  ]),
);
console.log("\nBy holder:");
console.log(table([["Holder", "", "Total"], ...[...result.holderTotals].map(([h, v]) => [name.get(h)!, "", dollars(v)])]));
console.log("\nBy class:");
console.log(table([["Class", "", "Total"], ...[...result.classTotals].map(([s, v]) => [name.get(s)!, "", dollars(v)])]));

const total = result.lines.reduce((sum, l) => sum.plus(l.amount), exitValue.minus(exitValue));
console.log(`\nCommon price per share: $${result.commonPrice.toFixed(6)}`);
console.log(`Strike cash added to proceeds: $${dollars(result.strikeCash)}`);
console.log(`Lines add up to the exit value: ${sameAmount(total, result.exitValue) ? "yes" : `NO (${total.toFixed(6)})`}`);
