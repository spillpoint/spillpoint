// More than one stable answer (05c5; Jordan, after #73): the page shows the engine's plain message, at the exit value
// you're looking at and for the curves and breakpoints, and pays out nothing it would have to pick. The table is one of
// 05c4's random ones: two non-participating series at the same price beside post-money SAFEs.

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../src/App.tsx";
import { RANDOM_1_149 } from "../../../packages/engine/test/support/two-answers.ts";
import { ANALYSIS_TIMEOUT } from "./analysis.ts";

const plain = (at: string) =>
  `At ${at}: Series 0 Preferred and Series 1 Preferred are at the same price, so with the SAFEs outstanding either could convert here, ` +
  "and the documents don't say which. spillpoint doesn't pick one. Adding a round that converts the SAFEs avoids this.";

describe("a cap table with two stable answers", () => {
  it("says so in plain words, and shows no payouts there", async () => {
    render(<App />);
    const exit = RANDOM_1_149 as { cap_table: unknown; range: unknown };
    const file = JSON.stringify({ format: "spillpoint", version: 6, name: "Two series", cap_table: exit.cap_table, range: exit.range, view: { exit_value: "11047000", you: "founder_a" } });
    fireEvent.change(screen.getByLabelText("Open a saved cap table"), { target: { files: [new File([file], "two-series.json", { type: "application/json" })] } });
    await screen.findByText("Opened two-series.json.");
    expect(screen.getByText(/^The engine couldn't settle on an answer at/).textContent).toBe(`The engine couldn't settle on an answer at $11M: ${plain("$11,047,000")}`);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    const searched = await screen.findByText(/^Couldn't work out the curves and breakpoints/, undefined, { timeout: ANALYSIS_TIMEOUT });
    expect(searched.textContent).toBe(`Couldn't work out the curves and breakpoints: ${plain("$10,896,153.85")}`);
  });
});
