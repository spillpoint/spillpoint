// The dashboard as you'd click through it, in a simulated browser.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../src/App.tsx";

const headline = () => screen.getByRole("heading", { level: 1 }).textContent;

describe("the founder view, on Millrace", () => {
  it("opens on Millrace, labelled fictional, with the governance note", () => {
    render(<App />);
    expect(screen.getByText("Fictional example")).toBeTruthy();
    expect(screen.getByText(/The charter and the signed documents govern, not this tool\./)).toBeTruthy();
    expect(screen.getByText(/nothing you enter is sent anywhere/)).toBeTruthy();
  });

  it("starts on the largest founder at $100M: what Ana gets, against what she owns", async () => {
    render(<App />);
    expect((screen.getByLabelText(/You are/) as HTMLSelectElement).value).toBe("ana");
    expect(headline()).toBe("At $100M you get $9.75M");
    expect(screen.getByText(/9\.8% of the proceeds, for 12\.9% of the company \(fully diluted, including the option pool\)/)).toBeTruthy();
    // Common gets nothing until Seed's preference is paid at $39,424,995.32.
    expect(await screen.findByText("You get nothing below $39.4M.")).toBeTruthy();
  });

  it("switches to another holder", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/You are/), { target: { value: "cobalt" } });
    expect(headline()).toBe("At $100M you get $36.4M");
    expect(await screen.findByText("You're paid from the first dollar.")).toBeTruthy();
  });

  it("takes a typed exit value", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/You are/), { target: { value: "cobalt" } });
    const box = screen.getByRole("textbox", { name: "Exit value" });
    fireEvent.change(box, { target: { value: "25M" } });
    fireEvent.keyDown(box, { key: "Enter" });
    // Series B's 2x preference is $19,999,999.79.
    expect(headline()).toBe("At $25M you get $20M");
  });

  it("refuses a typed value outside the range, and says why", () => {
    render(<App />);
    const box = screen.getByRole("textbox", { name: "Exit value" });
    fireEvent.change(box, { target: { value: "5B" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByText("Type an amount between $0 and $300M.")).toBeTruthy();
    expect(headline()).toBe("At $100M you get $9.75M");
  });

  it("shows who gets what by holder, with you marked, and by class", () => {
    render(<App />);
    const table = screen.getByRole("table");
    const ana = within(table).getByText("Ana Ortiz").closest("tr")!;
    expect(ana.textContent).toContain("(you)");
    expect(ana.textContent).toContain("$9,750,990");
    expect(within(table).getByText("Unissued option pool")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "By class" }));
    const seriesB = within(screen.getByRole("table")).getByText("Series B Preferred").closest("tr")!;
    expect(seriesB.textContent).toContain("$36,383,770");
    expect(screen.getByText(/Converting to common here: .*Seed Preferred/)).toBeTruthy();
  });
});

describe("the simple example", () => {
  it("switches to case 4 and starts over", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "edge-04-participating-capped" } });
    // At $40M Seed is held at its $9M cap; common shares $31M, and Founder A has 6 of the 8 million common.
    expect(headline()).toBe("At $40M you get $23.3M");
    expect(screen.getByText(/58\.1% of the proceeds, for 60\.0% of the company \(fully diluted\)\./)).toBeTruthy();
    expect(await screen.findByText("You get nothing below $3M.")).toBeTruthy();
  });
});
