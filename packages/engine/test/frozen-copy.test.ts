// prepare works on its own frozen copy of the cap table (10c). The quantities every waterfall run needs are worked out
// once, when a table is prepared, and kept with it; before 10c they were worked out from the caller's own table, so an
// edit to it after prepare left solve mixing old quantities with new positions. On 0.7.0, edge-02 with Founder A's
// common multiplied by 10 after prepare paid common $0.25 a share at $5M, and Founder A $15,000,000 of a $5,000,000
// sale. Now an edit to the caller's table changes nothing a prepared table gives; a table written by hand is worked
// out afresh on each call, so an edit between calls is always seen; and nothing the engine keeps is keyed by, or handed
// back as, an object a caller can still change.

import type { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import { D, findBreakpoints, paySchedule, prepare, readExit, solve, toCents } from "../src/index.ts";
import type { CapTable, PreparedCapTable } from "../src/index.ts";
import { readInputs } from "../src/case.ts";
import { EXIT_CASES, expectedPoints, readCaseFile } from "./support/cases.ts";

const edge02 = () => readInputs(readCaseFile("edge-02-non-participating", "inputs.json"));
const at = (pc: PreparedCapTable, x: string) => solve(pc, new D(x)).answers[0]!.payout;
const founderA = (t: CapTable) => t.positions.find((p) => p.holder === "founder_a" && p.security === "common")!;

/** Every object in a value, Decimals and their digits included, with where it is. */
function objectsIn(value: unknown, where = "the table"): [string, object][] {
  if (value === null || typeof value !== "object") return [];
  if (D.isDecimal(value)) return [[where, value], [`${where}'s digits`, (value as Decimal).d]];
  return [[where, value], ...Object.entries(value).flatMap(([k, v]) => objectsIn(v, `${where}.${k}`))];
}

describe("edge-02, with Founder A's common multiplied by 10 after prepare (10c)", () => {
  // 2,000,000 Seed shares with a $3M preference; 8,000,000 common, then 62,000,000 once Founder A's 6,000,000 are 60,000,000.
  it("still gives the case's own answers from the table prepared before the edit, and the new ones from a fresh prepare", () => {
    const exit = edge02();
    const pc = prepare(exit.capTable, exit.exitDate);
    founderA(exit.capTable).shares = founderA(exit.capTable).shares.times(10);
    expect(founderA(exit.capTable).shares.toString(), "the caller's table is edited").toBe("60000000");

    // The table prepared before the edit: every listed exit value as the case expects it, and its two breakpoints.
    for (const point of expectedPoints("edge-02-non-participating")) {
      const p = solve(pc, point.exitValue).answers[0]!.payout;
      expect(toCents(p.commonPrice), point.label).toBe(toCents(new D(point.equilibria[0]!.common_price_per_share)));
      for (const [holder, amount] of Object.entries(point.equilibria[0]!.holder_totals)) expect(toCents(p.holderTotals.get(holder)!), `${holder} at ${point.label}`).toBe(amount);
    }
    expect(findBreakpoints(pc, exit.range).map((b) => toCents(b.exitValue))).toEqual(["3000000.00", "15000000.00"]);
    expect(pc.capTable.positions.find((p) => p.holder === "founder_a")!.shares.toString()).toBe("6000000");

    // Prepared afresh: at $5M the Seed keeps its $3M preference and common shares $2M, $0.0323 a share.
    const fresh = at(prepare(exit.capTable, exit.exitDate), "5000000");
    expect(fresh.commonPrice.toFixed(4)).toBe("0.0323");
    expect(toCents(fresh.holderTotals.get("founder_a")!)).toBe("1935483.87"); // 60,000,000 × 2,000,000 ÷ 62,000,000
    expect(toCents(fresh.holderTotals.get("founder_b")!)).toBe("64516.13");
    // Converting would give the Seed 2 ÷ 64 of the sale, more than $3M only above $96M: outside the range.
    expect(findBreakpoints(prepare(exit.capTable, exit.exitDate), exit.range).map((b) => toCents(b.exitValue))).toEqual(["3000000.00"]);
  });

  it("refuses an assignment to the prepared table, or to anything in it, down to a Decimal", () => {
    const exit = edge02();
    const pc = prepare(exit.capTable, exit.exitDate);
    // The two fields are readonly in the type (1.0), so TypeScript refuses these; run anyway, they throw.
    // @ts-expect-error: capTable is readonly.
    expect(() => (pc.capTable = exit.capTable)).toThrow(TypeError);
    // @ts-expect-error: exitDate is readonly.
    expect(() => (pc.exitDate = "2030-01-01")).toThrow(TypeError);
    expect(() => (pc.capTable.positions[0]!.shares = new D(1))).toThrow(TypeError);
    expect(() => pc.capTable.holders.push({ id: "someone", name: "Someone" })).toThrow(TypeError);
    expect(() => pc.capTable.seniority[0]!.push("seed")).toThrow(TypeError);
    expect(() => ((pc.capTable as { unissuedPool: Decimal }).unissuedPool = new D(1))).toThrow(TypeError);
    const shares = pc.capTable.positions[0]!.shares as unknown as { s: number; e: number; d: number[] };
    expect(() => (shares.s = -1)).toThrow(TypeError);
    expect(() => (shares.e = 0)).toThrow(TypeError);
    expect(() => (shares.d = [1])).toThrow(TypeError);
    expect(at(pc, "5000000").commonPrice.toString()).toBe("0.25");
  });
});

describe("prepare's copy (10c)", () => {
  it.each(EXIT_CASES)("%s: freezes every object, list and Decimal in its copy, and nothing in the caller's table", (name) => {
    const exit = readInputs(readCaseFile(name, "inputs.json"));
    const pc = prepare(exit.capTable, exit.exitDate);
    expect(Object.isFrozen(pc)).toBe(true);
    const copy = objectsIn(pc.capTable);
    // Every object, list and Decimal frozen. A Decimal's digit array is left as it is: no decimal.js method writes to
    // it, and a frozen one slows the arithmetic (Jordan, on #112).
    const digits = (where: string) => where.endsWith("'s digits");
    expect(copy.filter(([where, o]) => !digits(where) && !Object.isFrozen(o)).map(([where]) => where)).toEqual([]);
    expect(copy.filter(([where, o]) => digits(where) && Object.isFrozen(o)).map(([where]) => where)).toEqual([]);
    expect(objectsIn(exit.capTable).filter(([, o]) => Object.isFrozen(o)).map(([where]) => where)).toEqual([]);
    // The copy holds none of the caller's objects, digit arrays included, and keeps every Decimal's own constructor.
    const theirs = new Set(objectsIn(exit.capTable).map(([, o]) => o));
    expect(copy.filter(([, o]) => theirs.has(o)).map(([where]) => where)).toEqual([]);
    for (const [where, o] of copy) if (D.isDecimal(o)) expect(o.constructor, where).toBe(D);
  });

  it("keeps a Decimal's own precision: one from the caller's own decimal.js settings is copied as it is", () => {
    const Wide = D.clone({ precision: 60 });
    const exit = edge02();
    const shares = new Wide("1").div(3).times(3000000);
    founderA(exit.capTable).shares = shares;
    const copied = founderA(prepare(exit.capTable, exit.exitDate).capTable).shares;
    expect(copied.constructor).toBe(Wide);
    expect(copied.toString()).toBe(shares.toString());
    expect(copied).not.toBe(shares);
  });
});

describe("a table written by hand (10c)", () => {
  it("is worked out afresh on each call: edited between calls, edge-02 gives the edited answer", () => {
    const exit = edge02();
    const byHand: PreparedCapTable = { capTable: exit.capTable, exitDate: null };
    expect(at(byHand, "5000000").commonPrice.toString()).toBe("0.25");
    expect(findBreakpoints(byHand, exit.range).map((b) => toCents(b.exitValue))).toEqual(["3000000.00", "15000000.00"]);
    founderA(exit.capTable).shares = new D(60000000);
    expect(at(byHand, "5000000").commonPrice.toFixed(4)).toBe("0.0323");
    expect(toCents(at(byHand, "5000000").holderTotals.get("founder_a")!)).toBe("1935483.87");
    expect(findBreakpoints(byHand, exit.range).map((b) => toCents(b.exitValue))).toEqual(["3000000.00"]);
    expect(Object.isFrozen(exit.capTable)).toBe(false);
  });

  it("sees a SAFE's purchase amount edited between calls, as a fresh prepare does (edge-12)", () => {
    // Investor X's post-money SAFE: $1M at a $10M cap, beside 9,000,000 common and 500,000 options at $5, out of the
    // money at $20M but counted in the Liquidity Capitalization (X1). It buys 1 ÷ 10 of the count: 9,500,000 ÷ 0.9,
    // 1,055,555.56 shares, and $20M × 1,055,555.56 ÷ 10,055,555.56. At $2M it buys 2 ÷ 10: 9,500,000 ÷ 0.8 × 0.2,
    // 2,375,000 shares, and $20M × 2,375,000 ÷ 11,375,000.
    const exit = readInputs(readCaseFile("edge-12-unconverted-safe", "inputs.json"));
    const byHand: PreparedCapTable = { capTable: exit.capTable, exitDate: exit.exitDate ?? null };
    const prepared = prepare(exit.capTable, exit.exitDate);
    const investorX = (pc: PreparedCapTable) => toCents(at(pc, "20000000").holderTotals.get("investor_x")!);
    expect(investorX(byHand)).toBe("2099447.51");
    exit.capTable.unconvertedSafes![0]!.purchaseAmount = new D(2000000);
    expect(investorX(byHand)).toBe("4175824.18");
    // On 0.7.0 the share it buys was kept with the SAFE's own object, so even a fresh prepare gave $2,099,447.51 here.
    expect(investorX(prepare(exit.capTable, exit.exitDate))).toBe("4175824.18");
    expect(investorX(prepared)).toBe("2099447.51");
    // The same edit read from the case file's form, with nothing shared: the same answer.
    const json = readCaseFile("edge-12-unconverted-safe", "inputs.json") as { exit: { cap_table: { unconverted_safes: { purchase_amount: string }[] } } };
    json.exit.cap_table.unconverted_safes[0]!.purchase_amount = "2000000";
    const reread = readInputs(json);
    expect(investorX(prepare(reread.capTable, reread.exitDate))).toBe("4175824.18");
  });

  it("pays a schedule as prepare's table does, and sees an edit made between schedules", () => {
    const exit = edge02();
    const byHand: PreparedCapTable = { capTable: exit.capTable, exitDate: null };
    const schedule = { id: "deal", description: "Closing and an earnout", payments: [{ label: "Closing", amount: new D(4000000) }, { label: "Earnout", amount: new D(1000000) }] };
    const takes = (pc: PreparedCapTable) => paySchedule(pc, schedule).map((t) => toCents(t.holderTotals.get("founder_a") ?? new D(0)));
    expect(takes(byHand)).toEqual(takes(prepare(exit.capTable)));
    expect(takes(byHand)).toEqual(["750000.00", "750000.00"]);
    founderA(exit.capTable).shares = new D(60000000);
    expect(takes(byHand)).toEqual(takes(prepare(exit.capTable)));
    expect(takes(byHand)).not.toEqual(["750000.00", "750000.00"]);
  });
});

describe("what solve hands back (10c)", () => {
  it("gives each answer its own decisions: an edit to one doesn't reach the next (Millrace at $20M)", () => {
    // The solver keeps the sets it settled on across exit values. On 0.7.0 an answer could hand back the set itself,
    // so adding an option class to one answer's exercised set made the next answer exercise it too.
    const exit = readInputs(readCaseFile("millrace", "inputs.json"));
    const pc = prepare(exit.capTable, exit.exitDate);
    const first = solve(pc, new D(20000000)).answers[0]!;
    expect([...first.decisions.exercised]).toEqual([]);
    (first.decisions.exercised as Set<string>).add("options_0.42");
    (first.payout.decisions.converted as Set<string>).add("seed");
    const next = solve(pc, new D(20000001)).answers[0]!;
    expect([...next.decisions.exercised]).toEqual([]);
    expect([...next.decisions.converted]).toEqual([...solve(prepare(exit.capTable, exit.exitDate), new D(20000001)).answers[0]!.decisions.converted]);
    expect(next.payout.decisions).toBe(next.decisions);
  });

  it("gives the same answers after a caller has edited the inputs it read from: readExit's table is the caller's own", () => {
    const json = readCaseFile("edge-02-non-participating", "inputs.json") as { exit: unknown };
    const exit = readExit(json.exit);
    const pc = prepare(exit.capTable, exit.exitDate);
    exit.capTable.positions.length = 0;
    exit.capTable.securities.length = 0;
    expect(toCents(at(pc, "5000000").holderTotals.get("founder_a")!)).toBe("1500000.00");
  });
});
