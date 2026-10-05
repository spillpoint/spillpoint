// The "For you" line in the breakpoint list, for changes neither example has:
// jumps up and down, and a bend too small to show in whole dollars.

import { render, screen } from "@testing-library/react";
import { D } from "spillpoint";
import { describe, expect, it } from "vitest";

import { BreakpointList } from "../src/BreakpointList.tsx";
import type { Change } from "../src/curves.ts";

const breakpoint = (exitValue: string) => ({ exitValue, jumps: false, reasons: [{ code: "other" as const, subject: [], text: "A reason." }] });

function forYou(change: Change): string | null {
  render(<BreakpointList breakpoints={[breakpoint("50000000")]} changes={[change]} yourName="Ana" exitValue={new D(0)} onExitValue={() => {}} />);
  return document.querySelector(".breakpoints__yours")?.textContent ?? null;
}

describe("how a breakpoint changes your payout", () => {
  it("gives the size of a jump up, from and to", () => {
    expect(forYou({ kind: "jump", from: new D("1000000.4"), to: new D("3500000.6") })).toBe(
      "For you: your payout jumps $2,500,001 here, from $1,000,000 to $3,500,001.",
    );
  });

  it("says a payout drops when it jumps down", () => {
    expect(forYou({ kind: "jump", from: new D("4000000"), to: new D("2750000") })).toBe("For you: your payout drops $1,250,000 here, from $4,000,000 to $2,750,000.");
  });

  it("uses cents when whole dollars would show the same amount twice", () => {
    expect(forYou({ kind: "bend", before: new D("204114.2"), after: new D("204114.31") })).toBe(
      "For you: each extra $1M now adds $204,114.31, up from $204,114.20.",
    );
  });

  it("says nothing when the breakpoint doesn't change your payout", () => {
    render(<BreakpointList breakpoints={[breakpoint("50000000")]} changes={[null]} yourName="Ana" exitValue={new D(0)} onExitValue={() => {}} />);
    expect(document.querySelector(".breakpoints__yours")).toBeNull();
    expect(screen.queryByText("Changes your payout")).toBeNull();
  });
});
