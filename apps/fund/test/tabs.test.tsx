// The page's layout, as the main page has it (f01i): the fund behind the answers in one line under the picker, then
// four tabs, Payouts, Terms, Cash flows and LPs (f02c), with the keys screen-reader users expect.

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
    const seen = ["fund-17-lps-three", "fund-19-lps-clawback", "fund-12-spv"].map((id) => {
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
      ["Investments", "false"],
      ["LPs", "false"],
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
    expect(screen.getByRole("tab", { name: "LPs" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(payouts.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(payouts, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "LPs" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(payouts.getAttribute("aria-selected")).toBe("true");
  });
});

describe("the Cash flows tab", () => {
  it("shows case 8's cash flows as entered, and the facts about D, each in its field", () => {
    open("fund-17-lps-three");
    fireEvent.click(screen.getByRole("tab", { name: "Cash flows" }));
    const panel = screen.getByRole("tabpanel", { name: "Cash flows" });
    const value = (label: string) => (within(panel).getByLabelText(label) as HTMLInputElement | HTMLSelectElement).value;
    const rows = [1, 2, 3, 4, 5].map((n) => [value(`Row ${n}'s date`), value(`Row ${n}'s type`), within(panel).queryByLabelText(`Row ${n}'s kind`) ? value(`Row ${n}'s kind`) : "—", value(`Row ${n}'s amount`)]);
    expect(rows).toEqual([
      ["2021-01-15", "call", "investment", "$8,000,000"],
      ["2021-01-15", "call", "fee", "$495,000"],
      ["2022-01-15", "call", "fee", "$495,000"],
      ["2022-06-01", "call", "investment", "$2,000,000"],
      ["2024-05-01", "distribution", "—", "$4,000,000"],
    ]);
    // D isn't given, so it's the as-of date: the field is empty, and says so.
    expect([value("As of"), value("Distribution date (D)"), value("NAV on D")]).toEqual(["2026-09-30", "", "$40,000,000"]);
    expect(within(panel).getByRole("checkbox", { name: "This is the fund's last distribution" })).toHaveProperty("checked", false);
  });
});
