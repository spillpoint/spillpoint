// M5i: escrow and earnouts (C7, X8). The takes of each payment are the
// cumulative payouts after it less before it, with every decision re-made at
// the cumulative amount.

import { describe, expect, it } from "vitest";

import { InputError, paySchedule, prepare, readExit, toCents } from "../src/index.ts";
import { readInputs } from "../src/case.ts";
import { decisionsFrom, readCaseFile } from "./support/cases.ts";

interface ExpectedPayment {
  label: string;
  amount: string;
  cumulative: string;
  decisions_at_cumulative: Record<string, string>;
  lines: { holder: string; security: string; amount: string }[];
  holder_totals: Record<string, string>;
  class_totals: Record<string, string>;
}

const sorted = (ids: ReadonlySet<string>) => [...ids].sort();

describe("case 11: an earnout", () => {
  const exit = readInputs(readCaseFile("edge-11-earnout", "inputs.json"));
  const pc = prepare(exit.capTable, exit.exitDate);
  const expected = (readCaseFile("edge-11-earnout", "expected.json") as { exit: { payment_schedules: { id: string; payments: ExpectedPayment[] }[] } }).exit
    .payment_schedules;

  it.each(exit.paymentSchedules!.map((s) => [s.id, s] as const))("%s: every take, decision and total matches to the cent", (_, schedule) => {
    const want = expected.find((e) => e.id === schedule.id)!.payments;
    const got = paySchedule(pc, schedule);
    expect(got).toHaveLength(want.length);
    got.forEach((take, i) => {
      const w = want[i]!;
      expect([take.label, toCents(take.amount), toCents(take.cumulative)]).toEqual([w.label, w.amount, w.cumulative]);
      const d = decisionsFrom(w.decisions_at_cumulative);
      expect([sorted(take.decisions.converted), sorted(take.decisions.exercised)]).toEqual([sorted(d.converted), sorted(d.exercised)]);
      expect(take.lines.map((l) => [l.holder, l.security, toCents(l.amount)])).toEqual(w.lines.map((l) => [l.holder, l.security, l.amount]));
      expect(Object.fromEntries([...take.holderTotals].map(([h, v]) => [h, toCents(v)]))).toEqual(w.holder_totals);
      expect(Object.fromEntries([...take.classTotals].map(([c, v]) => [c, toCents(v)]))).toEqual(w.class_totals);
      expect(take.lowered).toEqual([]);
    });
  });
});

describe("a negative take (X8): an earnout that crosses a group-conversion jump", () => {
  // Case 6b's company: Seed-1 and Seed-2 must convert together, and the group converts above $30M, where
  // Seed-1 jumps from $1M to $3M and common drops from $26M to $24M. A $29M closing and a $2M earnout: the
  // cumulative $31M crosses the jump, so common's running total falls with the earnout (Owed before release:
  // case 11b). Checked by hand and against the reference calculator.
  const inputs = readCaseFile("edge-06b-forced-class", "inputs.json") as { exit: Record<string, unknown> };
  inputs.exit.payment_schedules = [{ id: "jump", payments: [{ label: "closing", amount: "29000000" }, { label: "earnout", amount: "2000000" }] }];
  const exit = readInputs(inputs);
  const [closing, earnout] = paySchedule(prepare(exit.capTable, exit.exitDate), exit.paymentSchedules![0]!);

  it("pays the closing with the group staying preferred", () => {
    expect(Object.fromEntries([...closing!.holderTotals].map(([h, v]) => [h, toCents(v)]))).toEqual({
      founder_a: "18750000.00",
      founder_b: "6250000.00",
      investor_x: "1000000.00",
      investor_y: "3000000.00",
    });
  });

  it("takes $200,000 back from common in the earnout, and says whose running total falls", () => {
    expect(sorted(earnout!.decisions.converted)).toEqual(["seed_1", "seed_2"]);
    expect(Object.fromEntries([...earnout!.holderTotals].map(([h, v]) => [h, toCents(v)]))).toEqual({
      founder_a: "-150000.00",
      founder_b: "-50000.00",
      investor_x: "2100000.00",
      investor_y: "100000.00",
    });
    expect(toCents(earnout!.classTotals.get("common")!)).toBe("-200000.00");
    expect(toCents([...earnout!.holderTotals.values()].reduce((a, b) => a.plus(b)))).toBe("2000000.00");
    expect(earnout!.lowered).toEqual(["founder_a", "founder_b"]);
  });
});

describe("reading a schedule (C7)", () => {
  const exitWith = (schedules: unknown) =>
    readExit({ ...(readCaseFile("edge-11-earnout", "inputs.json") as { exit: object }).exit, payment_schedules: schedules });

  it.each([
    ["a payment of nothing", [{ id: "s", payments: [{ label: "closing", amount: "0" }] }], "payment_schedules[0].payments[0].amount"],
    ["no payments", [{ id: "s", payments: [] }], "payment_schedules[0].payments: needs at least one payment"],
    ["a schedule listed twice", [{ id: "s", payments: [{ label: "a", amount: "1" }] }, { id: "s", payments: [{ label: "b", amount: "1" }] }], "schedule s is listed twice"],
    ["a field it doesn't read", [{ id: "s", payments: [{ label: "a", amount: "1", due: "2025" }] }], "due: unknown field"],
  ])("refuses %s", (_, schedules, message) => {
    expect(() => exitWith(schedules)).toThrow(InputError);
    expect(() => exitWith(schedules)).toThrow(message);
  });
});
