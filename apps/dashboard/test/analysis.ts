// Waiting for the page's curves and breakpoints, which it works out in the
// background: in a Worker in a browser, asynchronously in place in these
// tests, and after an edit only once typing has paused for a quarter second.
// A busy CI runner can take several seconds for that, more than findBy's
// default second, so tests wait for the result itself: the "Working out"
// notice gone and the breakpoint list there.

import { screen, waitFor } from "@testing-library/react";
import { expect } from "vitest";

/**
 * As long as a test may wait for the analysis, or for anything queued behind
 * it: well within the 20-second limit every dashboard test has
 * (vite.config.ts). With no Worker here the analysis runs on the main
 * thread, so a timer the page sets, such as the one that moves focus to a new
 * event, can wait behind it for a second or more on a busy machine. In a
 * browser the analysis runs in a Worker and nothing waits.
 */
export const ANALYSIS_TIMEOUT = 15_000;

/** The breakpoint list's section, once the page has finished working it out. */
export function analysed(): Promise<HTMLElement> {
  return waitFor(
    () => {
      expect(screen.queryByText("Working out the curves and breakpoints…")).toBeNull();
      return screen.getByRole("heading", { name: "Breakpoints" }).closest("section")!;
    },
    { timeout: ANALYSIS_TIMEOUT },
  );
}
