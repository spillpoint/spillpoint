// The keyboard, taps on the chart, and narrow screens (plan step 8, f01m): every control reachable and labelled; the
// charts' drawings aren't focus stops, since their values are in the legends; Escape closes the paste box as
// "Cancel" does; a click or tap on a chart sets X, onto a breakpoint when it's near one.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D } from "spillpoint-fund";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { SNAP, xAtPixel } from "../src/Chart.tsx";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");

afterEach(() => vi.restoreAllMocks());

const xBox = () => (screen.getByLabelText(/^Distribution on/) as HTMLInputElement).value;
const tab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));
async function openCase(dir: string) {
  const text = readFileSync(resolve(casesDir, dir, "inputs.json"), "utf8");
  fireEvent.change(screen.getByLabelText("Open a saved fund"), { target: { files: [new File([text], "inputs.json", { type: "application/json" })] } });
  await vi.waitFor(() => expect(document.querySelector(".file-status")?.textContent).toBe("Opened inputs.json."));
}

// The charts are drawn 960 pixels wide where nothing is laid out, as here: the plot runs from 80 to 944.
const WIDTH = 960;
const pixelOf = (x: string, top: string) => 80 + new D(x).div(top).toNumber() * 864;

describe("a click or tap on the chart sets X", () => {
  it("picks the nearest thousandth of the range, in whole dollars, and the breakpoint exactly within 8 pixels of one", () => {
    const top = new D("20000000");
    const bps = [{ x: new D("14004383.561643835616438356164383561643836") }];
    // 0.255 of the way: $5,100,000; past either end, $0 and the top.
    expect(xAtPixel(80 + 0.2546 * 864, WIDTH, top, bps).toString()).toBe("5100000");
    expect([xAtPixel(10, WIDTH, top, bps).toString(), xAtPixel(2000, WIDTH, top, bps).toString()]).toEqual(["0", "20000000"]);
    // Near $14M, 0.19 pixels from the breakpoint: the breakpoint, every digit.
    expect(xAtPixel(pixelOf("14000000", "20000000"), WIDTH, top, bps)).toBe(bps[0]!.x);
    // Eight pixels away still lands on it; nine doesn't.
    const at = pixelOf(bps[0]!.x.toString(), "20000000");
    expect(xAtPixel(at + SNAP, WIDTH, top, bps)).toBe(bps[0]!.x);
    expect(xAtPixel(at + SNAP + 1, WIDTH, top, bps).eq(bps[0]!.x)).toBe(false);
    // Whole dollars, even on a range that doesn't divide by a thousand.
    expect(xAtPixel(80 + 0.0005 * 864, WIDTH, new D("1234567"), []).toString()).toBe("1235");
  });

  it("opens case 6's inputs.json; a click near $14M sets X to exactly $14,004,383.56, the breakpoint", async () => {
    render(<App />);
    await openCase("fund-06-full-catch-up");
    const chart = screen.getByRole("img", { name: /lines against X, from \$0 to \$20M/ });
    fireEvent.click(chart, { clientX: pixelOf("14000000", "20000000") });
    expect(xBox()).toBe("$14,004,383.56");
    expect(screen.getByRole("heading", { name: "The split at $14,004,383.56" })).toBeDefined();
    expect(screen.getAllByText("X is here")).toHaveLength(1);
    // Away from a bend: the nearest thousandth, $5,000,000.
    fireEvent.click(chart, { clientX: pixelOf("5000000", "20000000") + 0.3 });
    expect(xBox()).toBe("$5,000,000");
  });

  it("lands on NAV within 8 pixels of its line, as on a breakpoint; the nearer of the two when both are close", () => {
    const top = new D("80000000");
    const nav = { x: new D("40000000") };
    const bp = { x: new D("40500000") };
    // NAV at 512 pixels, the breakpoint 5.4 pixels to its right: each wins on its own side of the middle.
    expect(xAtPixel(pixelOf("40000000", "80000000") + 2, WIDTH, top, [bp, nav])).toBe(nav.x);
    expect(xAtPixel(pixelOf("40500000", "80000000") - 2, WIDTH, top, [bp, nav])).toBe(bp.x);
    expect(xAtPixel(pixelOf("40000000", "80000000") - 7.9, WIDTH, top, [nav]).toString()).toBe("40000000");
  });

  it("gives case 8 the NAV headline when the NAV line is tapped, from X elsewhere", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "fund-17-lps-three" } });
    fireEvent.change(screen.getByLabelText(/^Distribution on/), { target: { value: "20000000" } });
    const answer = () => screen.getByRole("region", { name: "The answer" }).querySelector(".headline__answer")!.textContent;
    expect(answer()).toBe("At a $20M distribution on 30 Sep 2026, the GP's carry is $2.57M.");
    // Seven pixels off the NAV line, about $650,000 short of NAV: it lands on NAV exactly.
    fireEvent.click(screen.getByRole("img", { name: /lines against X, from \$0 to \$80M/ }), { clientX: pixelOf("40000000", "80000000") - 7 });
    expect(xBox()).toBe("$40,000,000");
    expect(answer()).toBe("If the fund were liquidated at NAV, $40M on 30 Sep 2026, the GP would end with $6.81M of carry.");
    expect(screen.getByText("X is at NAV")).toBeDefined();
  });

  it("sets X from the clawback's chart too, onto a bend near one: case 13's $15,000,000", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "fund-19-lps-clawback" } });
    const chart = within(screen.getByRole("region", { name: "The clawback" })).getByRole("img");
    fireEvent.click(chart, { clientX: pixelOf("15100000", "40000000") });
    expect(xBox()).toBe("$15,000,000");
  });
});

/** Every control in the page that a person uses, with no name a screen reader could read. */
function unnamed(): string[] {
  return [...document.querySelectorAll<HTMLElement>("input, select, textarea, button")]
    .filter((el) => !el.closest("[hidden]"))
    .filter((el) => {
      const labels = (el as HTMLInputElement).labels;
      const name = el.getAttribute("aria-label") ?? (labels && [...labels].map((l) => l.textContent).join(" ").trim()) ?? "";
      return !(name || (el.tagName === "BUTTON" && el.textContent!.trim()));
    })
    .map((el) => el.outerHTML.slice(0, 80));
}
/** Elements the Tab key would stop on that aren't the page's own controls: a chart's drawing, or a positive tabindex. */
const strayStops = () =>
  [...document.querySelectorAll<HTMLElement>("[tabindex]")].filter((el) => !el.closest("[hidden]") && Number(el.getAttribute("tabindex")) >= 0 && !el.matches("[role=tab]")).map((el) => el.outerHTML.slice(0, 80));

describe("the keyboard", () => {
  it.each(["fund-03-gp-commitment", "fund-17-lps-three", "fund-19-lps-clawback", "fund-12-spv", "blank"])(
    "%s: every control on every tab is a labelled control the Tab key reaches, and no chart is a stop",
    (id) => {
      render(<App />);
      fireEvent.change(screen.getByLabelText("Start from"), { target: { value: id } });
      for (const name of ["Payouts", "Terms", "Cash flows"]) {
        tab(name);
        if (name === "Terms") {
          // Every term's fields shown: a pref, a partial catch-up and a GP commitment.
          const pref = screen.getByRole("checkbox", { name: "A preferred return" }) as HTMLInputElement;
          if (!pref.checked) fireEvent.click(pref);
          fireEvent.click(screen.getByRole("radio", { name: "Partial" }));
        }
        if (name === "Cash flows") fireEvent.click(screen.getByRole("button", { name: "Paste rows from a spreadsheet" }));
        expect(unnamed(), `${id} ${name}`).toEqual([]);
        expect(strayStops(), `${id} ${name}`).toEqual([]);
      }
      // The charts' drawings: one image each to assistive technology, no stop of their own.
      for (const svg of document.querySelectorAll(".chart svg")) expect(svg.getAttribute("tabindex")).toBeNull();
    },
  );

  it("closes the paste box with Escape, as Cancel, and gives the focus back to the button that opened it", () => {
    render(<App />);
    tab("Cash flows");
    const before = screen.getAllByLabelText(/^Row \d+'s date$/).length;
    const button = screen.getByRole("button", { name: "Paste rows from a spreadsheet" });
    fireEvent.click(button);
    const box = screen.getByLabelText("The rows, pasted");
    fireEvent.change(box, { target: { value: "2025-01-01\tCall\tFee\t100" } });
    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Paste rows from a spreadsheet" })).toBeNull();
    expect(screen.getAllByLabelText(/^Row \d+'s date$/)).toHaveLength(before);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
