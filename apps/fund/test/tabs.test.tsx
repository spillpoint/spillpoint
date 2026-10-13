// The page's layout, as the main page has it (f01i): the fund behind the answers in one line under the picker, then
// three tabs, Payouts, Terms and Cash flows, with the keys screen-reader users expect.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../src/App.tsx";

function open(id: string) {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Start from"), { target: { value: id } });
}

const summary = () => document.querySelector(".example-label")!.textContent;

describe("the fund behind the answers", () => {
  it("says what's been paid in, what's been distributed before X, the NAV, and whether X is the last distribution", () => {
    render(<App />);
    expect(summary()).toBe("This fund: $10.7M paid in over 3 calls and nothing distributed before X. X isn't its last distribution.");
    const picker = screen.getByLabelText("Start from");
    const seen = ["fund-08-carry-steps", "fund-13-clawback-steps", "fund-12-spv"].map((id) => {
      fireEvent.change(picker, { target: { value: id } });
      return summary();
    });
    expect(seen).toEqual([
      "This fund: $11M paid in over 4 calls, $4M distributed before X and a NAV of $40M on 30 Sep 2026. X isn't its last distribution.",
      "This fund: $20M paid in over 2 calls and $30M distributed before X. X is its last distribution.",
      "This fund: $2.04M paid in over 2 calls, nothing distributed before X and a NAV of $6M on 1 May 2026. X is its last distribution.",
    ]);
  });
});

describe("the tabs", () => {
  it("opens on Payouts, and shows one tab's panel at a time", () => {
    render(<App />);
    expect(screen.getAllByRole("tab").map((t) => [t.textContent, t.getAttribute("aria-selected")])).toEqual([
      ["Payouts", "true"],
      ["Terms", "false"],
      ["Cash flows", "false"],
    ]);
    expect(screen.getByRole("tabpanel").getAttribute("id")).toBe("panel-payouts");
    fireEvent.click(screen.getByRole("tab", { name: "Cash flows" }));
    expect(screen.getByRole("tabpanel").getAttribute("id")).toBe("panel-flows");
    expect(screen.queryByRole("region", { name: "The answer" })).toBeNull();
  });

  it("moves between tabs with the arrow keys, Home and End", () => {
    render(<App />);
    const payouts = screen.getByRole("tab", { name: "Payouts" });
    fireEvent.keyDown(payouts, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Terms" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Terms" }));
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(screen.getByRole("tab", { name: "Cash flows" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(payouts.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(payouts, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Cash flows" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(payouts.getAttribute("aria-selected")).toBe("true");
  });
});

describe("the Cash flows tab", () => {
  it("shows case 8's cash flows as entered, and the facts about D, read-only", () => {
    open("fund-08-carry-steps");
    fireEvent.click(screen.getByRole("tab", { name: "Cash flows" }));
    const panel = screen.getByRole("tabpanel", { name: "Cash flows" });
    const rows = within(panel)
      .getAllByRole("row")
      .slice(1)
      .map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
    expect(rows).toEqual([
      ["15 Jan 2021", "Call", "Investment", "$8,000,000.00"],
      ["15 Jan 2021", "Call", "Fee", "$495,000.00"],
      ["15 Jan 2022", "Call", "Fee", "$495,000.00"],
      ["1 Jun 2022", "Call", "Investment", "$2,000,000.00"],
      ["1 May 2024", "Distribution", "—", "$4,000,000.00"],
    ]);
    const facts = [...panel.querySelectorAll("dl div")].map((d) => [d.querySelector("dt")!.textContent, d.querySelector("dd")!.textContent]);
    expect(facts).toEqual([
      ["As of", "30 Sep 2026"],
      ["Distribution date (D)", "30 Sep 2026"],
      ["This is the fund's last distribution", "No"],
      ["NAV on D", "$40,000,000.00"],
    ]);
    expect(within(panel).queryByRole("textbox")).toBeNull();
  });
});
