// The "For you" line in the breakpoint list, for changes neither example has:
// jumps up and down, a bend too small to show in whole dollars, and bends
// with a curved side (X17).

import { render, screen } from "@testing-library/react";
import { D } from "spillpoint";
import { describe, expect, it } from "vitest";

import { BreakpointList } from "../src/BreakpointList.tsx";
import type { Change } from "../src/curves.ts";

const breakpoint = (exitValue: string) => ({
  exitValue,
  jumps: false,
  curveBelow: false,
  curveAbove: false,
  rates: {},
  reasons: [{ code: "other" as const, subject: [], text: "A reason." }],
});
const bend = (before: string, after: string, curvedBefore = false, curvedAfter = false): Change => ({ kind: "bend", before: new D(before), after: new D(after), curvedBefore, curvedAfter });

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
    expect(forYou(bend("204114.2", "204114.31"))).toBe(
      "For you: each extra $1M now adds $204,114.31, up from $204,114.20.",
    );
  });

  // X17's wording, approved in the M5d review for Founder A in case 10b; the case itself is checked in curves-ui.test.tsx.
  it("says \"about\" on a curved side, and why the rate keeps changing: curved on both sides", () => {
    expect(forYou(bend("104132.2", "79339.4", true, true))).toBe(
      "For you: just below here each extra $1M adds about $104,132; just above, about $79,339. The rate keeps changing on both sides, because the carve-out's claim grows with the exit value.",
    );
  });

  it("says \"about\" on a curved side, and why the rate keeps changing: curved below only", () => {
    expect(forYou(bend("84285.7", "742500", true, false))).toBe(
      "For you: each extra $1M now adds $742,500, up from about $84,286 just below. Below here the rate keeps changing, because the carve-out's claim grows with the exit value.",
    );
  });

  it("says \"about\" on a curved side, and why the rate keeps changing: curved above only", () => {
    expect(forYou(bend("500000", "84285.7", false, true))).toBe(
      "For you: just above here each extra $1M adds about $84,286, down from $500,000. Above here the rate keeps changing, because the carve-out's claim grows with the exit value.",
    );
  });

  it("says nothing when the breakpoint doesn't change your payout", () => {
    render(<BreakpointList breakpoints={[breakpoint("50000000")]} changes={[null]} yourName="Ana" exitValue={new D(0)} onExitValue={() => {}} />);
    expect(document.querySelector(".breakpoints__yours")).toBeNull();
    expect(screen.queryByText("Changes your payout")).toBeNull();
  });
});
