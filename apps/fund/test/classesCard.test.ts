// The classes card's figures (f03c), against the fund cases with two or more accounts: at every point of cases 22, 23,
// 24, 26 and 28, each row is the split's own account from `byAccount`, to the cent, and the case's by_account and
// accounts give the same; the multiple is the account's, rounded down; and "Owed back" is there exactly when the split
// is final and some class is owed something, with each account's clawback, $0.00 for a class owed nothing (f03c review,
// answer 1).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { readFund, splitAt, splitAtNav } from "spillpoint-fund";
import { describe, expect, it } from "vitest";

import { classesTable } from "../src/classesCard.ts";
import { owesSomething } from "../src/Clawback.tsx";
import { cents, lpMultipleText } from "../src/format.ts";
import { PENDING } from "./support/cases.ts";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));
// A pending case (support/cases.ts) waits for the page's step: its expected.json is ahead of the engine.
const CLASS_CASES = ["fund-22-classes-fee-carry", "fund-23-classes-pref-catch-up", "fund-24-classes-clawback", "fund-26-closes-and-classes", "fund-28-classes-clawback-steps"].filter((d) => !PENDING.includes(d));

interface Block {
  lps: { total: string };
  gp: { total: string };
}
interface Point {
  x: string;
  exact: string;
  tags: string[];
  by_account: { class: string | null; distribution: Block; to_date: Block; clawback?: { owed: string } }[];
}

/** "6930000.00" as the page writes it: "$6,930,000.00". */
const money = (s: string) => {
  const [whole, part] = s.split(".") as [string, string];
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${part}`;
};

/** How many points of the cases had each kind of "Owed back", so the last test can see the cases cover all of them. */
const seen = { "not final": 0, "final, nothing owed": 0, owed: 0, "owed, a class at $0.00": 0 };

describe.each(CLASS_CASES)("%s: the classes card at every point", (dir) => {
  const fund = readFund(caseFile(dir, "inputs.json").fund);
  const expected = caseFile(dir, "expected.json");

  it.each((expected.points as Point[]).map((p) => [p.x, p] as const))("at %s", (_, p) => {
    // The card follows the split it's shown with: at the NAV point, the NAV split, final by definition (F14).
    const split = p.tags.includes("nav") && !fund.final ? splitAtNav(fund)! : splitAt(fund, p.exact);
    const table = classesTable(split);
    const final = split.clawback !== null;
    const owed = final && p.by_account.some((a) => a.clawback!.owed !== "0.00");
    seen[final ? (owed ? (p.by_account.some((a) => a.clawback!.owed === "0.00") ? "owed, a class at $0.00" : "owed") : "final, nothing owed") : "not final"]++;
    expect(owed).toBe(final && split.byAccount.some((a) => owesSomething(a.clawback!.owed)));
    expect(table.headings).toEqual(["Class", "LPs, this distribution", "GP, this distribution", "LPs, to date", "GP, to date", "Paid in", "LP multiple", ...(owed ? ["Owed back"] : [])]);
    expect(split.byAccount.length).toBeGreaterThan(1);
    expect(table.rows.map((r) => r.name)).toEqual(split.byAccount.map((a) => a.class ?? "Fund terms"));
    split.byAccount.forEach((a, i) => {
      const want = p.by_account[i]!;
      const account = expected.accounts[i];
      const what = `${p.x} ${table.rows[i]!.name}`;
      // The split's own account, to the cent.
      expect(table.rows[i]!.cells, what).toEqual([
        cents(a.distribution.lps.total),
        cents(a.distribution.gp.total),
        cents(a.toDate.lps.total),
        cents(a.toDate.gp.total),
        cents(a.paidIn),
        a.lpMultiple ? lpMultipleText(a.lpMultiple) : "—",
        ...(owed ? [cents(a.clawback!.owed)] : []),
      ]);
      // And the case's, worked by the reference.
      expect(want.class, what).toBe(a.class);
      expect(table.rows[i]!.cells.slice(0, 5), what).toEqual([
        money(want.distribution.lps.total),
        money(want.distribution.gp.total),
        money(want.to_date.lps.total),
        money(want.to_date.gp.total),
        money(account.paid_in),
      ]);
      if (owed) expect(table.rows[i]!.cells[6], what).toBe(money(want.clawback!.owed));
    });
  });
});

describe("the classes card", () => {
  it("met, in the cases above, every kind of point: not final, final with nothing owed, and owed with a class at $0.00", () => {
    expect(Object.values(seen).every((n) => n > 0), JSON.stringify(seen)).toBe(true);
  });

  it("has no multiple for an account with nothing paid in (FA38): '—'", () => {
    const fund = readFund({
      as_of: "2025-01-01",
      terms: { carry: "0.20", fee_rate: "0.02", lp_classes: [{ name: "Friends and family", fee_rate: "0" }] },
      cash_flows: [{ date: "2024-01-01", type: "call", kind: "fee", amount: "200000" }],
      lps: [
        { name: "Alder Endowment", commitment: "8000000" },
        { name: "Cedar Holdings", commitment: "2000000", class: "Friends and family" },
      ],
    });
    // The fund terms' part of $1,000,000 is $800,000: its $200,000 back, then $600,000 at 20% carry, $680,000 to its LPs.
    expect(classesTable(splitAt(fund, "1000000")).rows.map((r) => [r.name, r.cells[4], r.cells[5]])).toEqual([
      ["Fund terms", "$200,000.00", "3.40x"],
      ["Friends and family", "$0.00", "—"],
    ]);
  });
});
