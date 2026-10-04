// Prints who gets what for a case at one exit value. A dev tool for checking
// the engine by hand; it reads case files, so it isn't part of the package.
//
//   pnpm payouts <case> <exit value> [--convert id,id] [--exercise id,id]
//
// With no flags, at an exit value expected.json reports, it uses the
// decisions recorded there and shows expected.json's amounts alongside.
// Otherwise it uses the flags: nothing converts or exercises unless named.
// (M2c makes the engine choose the decisions itself.)

import type Decimal from "decimal.js";

import { parseExact, payout, prepare, readCase, sameAmount, toCents } from "../src/index.ts";
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

let decisions: Decisions;
let source: string;
let recorded: Map<string, string> | null = null;
const point = expectedPoints(caseName).find((p) => sameAmount(p.exitValue, exitValue) || p.label === toCents(exitValue));
if (!convert && !exercise && point && point.equilibria.length === 1) {
  const outcome = point.equilibria[0]!;
  decisions = decisionsFrom(outcome.decisions);
  recorded = new Map(outcome.lines.map((l) => [`${l.holder}|${l.security}`, l.amount]));
  source = "recorded in expected.json";
} else {
  decisions = { converted: new Set(convert ?? []), exercised: new Set(exercise ?? []) };
  source = "from the command line";
}

const result = payout(prepare(exit.capTable), point && !convert && !exercise ? point.exitValue : exitValue, decisions);
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
