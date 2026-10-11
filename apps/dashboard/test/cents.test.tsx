// Payouts as they'd be paid (ASSUMPTIONS P1): every payment the page shows to the cent is the engine's exact amount for
// that holder and security, rounded down to the cent, and a holder's or a class's total is the sum of its rounded
// payments. The cents left over get a row of their own, so the column adds up to the exit value, and a line under the
// table says why; neither shows when nothing is left over. And the exit value's box to the cent once it has cents.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, paySchedule, prepare, readInputs, solve, toCents } from "spillpoint";
import type { ExitInput } from "spillpoint";
import { describe, expect, it } from "vitest";

import { App } from "../src/App.tsx";
import { PaymentsView } from "../src/PaymentsView.tsx";
import { dollarsAndCents } from "../src/format.ts";
import { leftOver, paid } from "../src/paid.ts";

const casesDir = resolve(import.meta.dirname, "../../../cases");
const box = () => screen.getByRole("textbox", { name: "Exit value" }) as HTMLInputElement;
const goTo = (amount: string) => {
  fireEvent.change(box(), { target: { value: amount } });
  fireEvent.keyDown(box(), { key: "Enter" });
};
const LEFT_OVER = "Left over from rounding down";
const line = () => [...document.querySelectorAll(".footnote")].map((p) => p.textContent).find((t) => t?.startsWith("Each payment is rounded down")) ?? null;
const amountIn = (row: Element) => row.querySelectorAll("td")[0]!.textContent;

const millraceExit = () => readInputs(JSON.parse(readFileSync(resolve(casesDir, "millrace", "inputs.json"), "utf8")));
function millraceAt(x: string) {
  const exit = millraceExit();
  return solve(prepare(exit.capTable, exit.exitDate), new D(x)).answers[0]!.payout;
}

describe("the who-gets-what table, as it would be paid", () => {
  it("shows Millrace at its default view, $100M, rounded down, with the cents left over on a row and a line under the table", () => {
    render(<App />);
    const payout = millraceAt("100000000");
    const payments = paid(payout.lines);
    const left = leftOver(new D("100000000"), payments);
    expect(left.gt(0)).toBe(true);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // Each holder's row is the sum of their payments, each rounded down to the cent.
    for (const h of millraceExit().capTable.holders.filter((x) => payments.holderTotals.has(x.id))) {
      expect(amountIn(within(table).getByText(h.name).closest("tr")!)).toBe(dollarsAndCents(payments.holderTotals.get(h.id)!));
    }
    // The left-over row, last before the total, and the line under the table.
    const leftRow = within(table).getByText(LEFT_OVER).closest("tr")!;
    expect(rows.at(-2)).toBe(leftRow);
    expect(amountIn(leftRow)).toBe(dollarsAndCents(left));
    const cents = left.times(100).toNumber();
    expect(line()).toBe(`Each payment is rounded down to the cent, as payments usually are; the ${cents} cents left over aren't paid to any holder.`);
    // The column adds up to the exit value: every row's amount, the left-over row's included.
    const shown = rows.slice(1, -1).map((r) => new D(amountIn(r)!.replace(/[$,]/g, "")));
    expect(shown.reduce((t, a) => t.plus(a), new D(0)).toFixed(2)).toBe("100000000.00");
    expect(amountIn(within(table).getByText("Total").closest("tr")!)).toBe("$100,000,000.00");
    // By class too: the same payments, the same left over.
    fireEvent.click(screen.getByRole("button", { name: "By class" }));
    const byClass = within(screen.getByRole("table")).getAllByRole("row").slice(1, -1).map((r) => new D(amountIn(r)!.replace(/[$,]/g, "")));
    expect(byClass.reduce((t, a) => t.plus(a), new D(0)).toFixed(2)).toBe("100000000.00");
  });

  it("rounds down a payment that rounded up before: Ana's $9,750,989.669… is $9,750,989.66, where half-up gave .67", () => {
    render(<App />);
    const exact = millraceAt("100000000").holderTotals.get("ana")!;
    expect(toCents(exact)).toBe("9750989.67");
    const ana = within(screen.getByRole("table")).getByText("Ana Ortiz").closest("tr")!;
    expect(amountIn(ana)).toBe("$9,750,989.66");
  });

  it("shows neither the row nor the line when nothing is left over", () => {
    render(<App />);
    // $15M on Millrace: every payment comes to whole cents. ($0 would too, but says nothing.)
    const even = ["15000000", "10000000", "5000000", "2500000"].find(
      (x) => leftOver(new D(x), paid(millraceAt(x).lines)).isZero(),
    )!;
    expect(even).toBeDefined();
    goTo(even);
    expect(within(screen.getByRole("table")).queryByText(LEFT_OVER)).toBeNull();
    expect(line()).toBeNull();
  });
});

/** Every case with an exit the engine pays, and the exit values its expected.json lists, breakpoints included. */
function listedExitValues(): { name: string; exit: ExitInput; values: D[] }[] {
  return readdirSync(casesDir)
    .filter((name) => existsSync(resolve(casesDir, name, "inputs.json")))
    .flatMap((name) => {
      const expected = JSON.parse(readFileSync(resolve(casesDir, name, "expected.json"), "utf8")) as { exit?: { payouts?: { exit_value: string; tags: string[] }[]; breakpoints?: { exit_value: string; exact: string }[] } };
      if (!expected.exit?.payouts) return [];
      const exact = new Map((expected.exit.breakpoints ?? []).map((b) => [b.exit_value, b.exact]));
      const value = (s: string) => (s.includes("/") ? new D(s.split("/")[0]!).div(s.split("/")[1]!) : new D(s));
      const values = expected.exit.payouts.map((p) => value(p.tags.includes("breakpoint") ? exact.get(p.exit_value)! : p.exit_value));
      return [{ name, exit: readInputs(JSON.parse(readFileSync(resolve(casesDir, name, "inputs.json"), "utf8"))), values }];
    });
}

describe("at every exit value the cases list", () => {
  it("pays rounded payments that, with what's left over, come to the exit value, the left over under a cent a payment", () => {
    let points = 0;
    for (const { name, exit, values } of listedExitValues()) {
      const pc = prepare(exit.capTable, exit.exitDate);
      for (const x of values) {
        for (const answer of solve(pc, x).answers) {
          const payments = paid(answer.payout.lines);
          const left = x.minus(payments.total);
          const count = answer.payout.lines.filter((l) => !l.amount.isZero()).length;
          // Exactly: the rounded payments and what's left over come to the exit value, and it's under a cent a payment.
          expect(payments.total.plus(left).eq(x), `${name} at ${x.toFixed(2)}`).toBe(true);
          expect(left.gte("-1e-18") && left.lt(new D("0.01").times(Math.max(count, 1))), `${name} at ${x.toFixed(2)}: ${left.toString()}`).toBe(true);
          // As the table shows it: the left-over row is the exit value to the cent, less every payment.
          expect(payments.total.plus(leftOver(x, payments)).eq(x.toDecimalPlaces(2, D.ROUND_HALF_UP)), `${name} at ${x.toFixed(2)}: shown`).toBe(true);
          expect(leftOver(x, payments).gte(0), `${name} at ${x.toFixed(2)}: shown left over`).toBe(true);
          points++;
        }
      }
    }
    expect(points).toBeGreaterThan(300);
  });
});

describe("a payment schedule's takes, as they'd be paid", () => {
  it("rounds each take down to the cent, so a holder's takes add up to their total", () => {
    const exit = millraceExit();
    const pc = prepare(exit.capTable, exit.exitDate);
    const schedule = { id: "deal", description: "Odd amounts", payments: [{ label: "Closing", amount: new D("62400001") }, { label: "Earnout", amount: new D("7600003") }] };
    render(<PaymentsView pc={pc} schedules={[schedule]} you="ana" />);
    const takes = paySchedule(pc, schedule).map((t) => paid(t.lines));
    const table = screen.getByRole("table");
    let rounded = false;
    for (const h of exit.capTable.holders) {
      const cell = within(table).queryByText(h.name)?.closest("tr");
      if (!cell) continue;
      const shown = [...cell.querySelectorAll("td")].map((td) => td.textContent!.replace("−", "-"));
      const want = takes.map((t) => dollarsAndCents(t.holderTotals.get(h.id) ?? new D(0)));
      const all = takes.reduce((s, t) => s.plus(t.holderTotals.get(h.id) ?? 0), new D(0));
      expect(shown, h.name).toEqual([...want, dollarsAndCents(all)]);
      rounded ||= paySchedule(pc, schedule).some((t) => !(t.holderTotals.get(h.id) ?? new D(0)).eq((t.holderTotals.get(h.id) ?? new D(0)).toDecimalPlaces(2)));
    }
    expect(rounded, "some take has a fraction of a cent to round").toBe(true);
    expect(screen.getByText(/^Each take is rounded down to the cent, as payments usually are/)).toBeTruthy();
  });
});

describe("the exit value's box", () => {
  it("keeps cents once an amount with cents is typed, and whole dollars otherwise", () => {
    render(<App />);
    goTo("62,400,000.55");
    expect(box().value).toBe("$62,400,000.55");
    goTo("62.4M");
    expect(box().value).toBe("$62,400,000");
  });
});
