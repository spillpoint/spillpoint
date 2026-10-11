// What the API hands back has exactly the fields its public type lists, and no others (the naming review; Jordan,
// 07c): console.log and JSON.stringify show no workings for code to come to depend on before 1.0. Each list below is
// checked against its type both ways when the tests compile, and each object the API returns against its list when
// they run, at every exit value every case lists.

import { describe, expect, it } from "vitest";

import { prepare, solve } from "../src/index.ts";
import type { Answer, CarveOutHere, Decisions, NoteHere, Payout, PayoutLine, SafeHere, SeriesHere, Solution, TierPayment } from "../src/index.ts";
import { readInputs } from "../src/case.ts";
import { EXIT_CASES, expectedPoints, readCaseFile } from "./support/cases.ts";

/** A type's field names, listed once: the compiler checks that the list names every field of T and nothing else. */
function fieldsOf<T>() {
  return <const K extends readonly (keyof T & string)[]>(keys: K & ([Exclude<keyof T, K[number]>] extends [never] ? unknown : never)): string[] =>
    [...keys].sort();
}

/** An object has its type's fields and no others; an optional field may be left out. */
function expectFields(o: object, fields: readonly string[], what: string, optional: readonly string[] = []): void {
  const keys = Object.keys(o);
  expect(keys.filter((k) => !fields.includes(k)), `${what}: fields its type doesn't list`).toEqual([]);
  expect(fields.filter((k) => !optional.includes(k) && !keys.includes(k)), `${what}: fields its type lists that it lacks`).toEqual([]);
}

const SOLUTION = fieldsOf<Solution>()(["exitValue", "answers"]);
const ANSWER = fieldsOf<Answer>()(["decisions", "payout"]);
const DECISIONS = fieldsOf<Decisions>()(["converted", "exercised"]);
const PAYOUT = fieldsOf<Payout>()([
  "exitValue", "decisions", "strikeCash", "commonPrice", "bySecurity", "series", "carveOut", "safes", "notes", "noteDebt", "safeCash", "curved",
  "lines", "holderTotals", "classTotals", "tiers", "atCap",
]);
const SERIES_HERE = fieldsOf<SeriesHere>()(["shares", "preference", "dividends", "claim", "capTotal", "asConverted"]);
const SAFE_HERE = fieldsOf<SafeHere>()(["converts", "liquidityCapitalization", "liquidityPrice", "shares"]);
const NOTE_HERE = fieldsOf<NoteHere>()(["converts", "shares"]);
const CARVE_OUT_HERE = fieldsOf<CarveOutHere>()(["claim", "paid", "band"]);
const TIER_PAYMENT = fieldsOf<TierPayment>()(["index", "series", "claim", "paid", "full"]);
const PAYOUT_LINE = fieldsOf<PayoutLine>()(["holder", "security", "amount"]);
const NOTE_DEBT = fieldsOf<NonNullable<Payout["noteDebt"]>>()(["claim", "paid", "full", "notes"]);
const SAFE_CASH = fieldsOf<NonNullable<Payout["safeCash"]>>()(["claim", "paid", "full", "safes"]);

/** A payout and everything in it. */
function expectPayout(p: Payout, what: string): void {
  expectFields(p, PAYOUT, what);
  expectFields(p.decisions, DECISIONS, `${what} decisions`);
  for (const [id, s] of p.series) expectFields(s, SERIES_HERE, `${what} series ${id}`);
  for (const [id, f] of p.safes) expectFields(f, SAFE_HERE, `${what} SAFE ${id}`);
  for (const [id, n] of p.notes) expectFields(n, NOTE_HERE, `${what} note ${id}`);
  if (p.carveOut) expectFields(p.carveOut, CARVE_OUT_HERE, `${what} carve-out`);
  for (const t of p.tiers) expectFields(t, TIER_PAYMENT, `${what} tier ${t.index}`);
  for (const l of p.lines) expectFields(l, PAYOUT_LINE, `${what} line ${l.holder} ${l.security}`);
  if (p.noteDebt) expectFields(p.noteDebt, NOTE_DEBT, `${what} note debt`);
  if (p.safeCash) expectFields(p.safeCash, SAFE_CASH, `${what} SAFE cash`);
}

describe.each(EXIT_CASES)("%s", (name) => {
  const exit = readInputs(readCaseFile(name, "inputs.json"));
  const pc = prepare(exit.capTable, exit.exitDate);

  it("solves to a solution, answers and payouts with exactly their types' fields, at every exit value it lists", () => {
    for (const point of expectedPoints(name)) {
      const solution = solve(pc, point.exitValue);
      expectFields(solution, SOLUTION, `${point.label}: the solution`);
      for (const answer of solution.answers) {
        expectFields(answer, ANSWER, `${point.label}: an answer`);
        expectPayout(answer.payout, `${point.label}: the payout`);
      }
    }
  });
});
