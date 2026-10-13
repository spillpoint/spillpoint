// The engine's breakpoints against every fund case (F15, FC5, FC6, FC8): each at its exact value, with its reasons'
// codes, fields and text, X's own tier first, then the clawback's.

import { describe, expect, it } from "vitest";

import { D, findBreakpoints, readFund, toCents } from "../src/index.ts";
import type { Reason } from "../src/index.ts";
import { RUN_CASES, exact, readCaseFile } from "./support/cases.ts";
import type { CaseInputs } from "./support/cases.ts";

interface CaseBreakpoint {
  x: string;
  exact: string;
  reasons: Record<string, string>[];
}

/** 40 digits agree with an exact value far closer than this (FC8). */
const CLOSE = new D("1e-20");

/** FC5's numeric fields, by the engine's names. */
const NUMBERS: Record<string, string> = { amount: "amount", rate: "rate", carry: "carry", lp_multiple: "lpMultiple" };

/** Whether an engine reason is the case's: the same code, change, cause and text, and each number within CLOSE. */
function sameReason(got: Reason, want: Record<string, string>): boolean {
  const g = got as unknown as Record<string, unknown>;
  const fields = Object.keys(want).filter((k) => !["code", "text"].includes(k));
  const engineFields = Object.keys(g).filter((k) => !["code", "text"].includes(k) && !(k === "fundTotals" && g[k] === null));
  if (got.code !== want.code || got.text !== want.text || fields.length !== engineFields.length) return false;
  return fields.every((k) => {
    if (k in NUMBERS) return (g[NUMBERS[k]!] as D).minus(exact(want[k]!)).abs().lte(CLOSE);
    if (k === "change") return g.change === want.change;
    if (k === "fund_totals") return g.fundTotals === want.fund_totals;
    return false;
  });
}

describe.each(RUN_CASES)("%s", (dir) => {
  const inputs = readCaseFile<CaseInputs>(dir, "inputs.json");
  const expected = readCaseFile<{ breakpoints: CaseBreakpoint[] }>(dir, "expected.json");
  const found = findBreakpoints(readFund(inputs.fund));

  it("finds every breakpoint the case has, and no other", () => {
    expect(found.map((b) => toCents(b.x))).toEqual(expected.breakpoints.map((b) => b.x));
  });

  it.each(expected.breakpoints.map((b, i) => [b.x, i] as const))("places %s at its exact value, with the case's reasons", (_, i) => {
    const want = expected.breakpoints[i]!;
    const got = found[i]!;
    expect(got.x.minus(exact(want.exact)).abs().lte(CLOSE)).toBe(true);
    expect(got.reasons.map((r) => r.code)).toEqual(want.reasons.map((r) => r.code));
    got.reasons.forEach((r, j) => expect(sameReason(r, want.reasons[j]!), `${r.code}: ${r.text}`).toBe(true));
  });
});
