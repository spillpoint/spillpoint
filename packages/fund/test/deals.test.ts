// The engine on investments and carry deal by deal (F33 to F37), from 0.5.0. Against every case: the investments table
// (F36, FA59) and what's due before carry on X, the fund's and each account's, at every point (FC15), to the cent and
// within FA15 of exact. Against small funds worked by hand: tier 1 at each distribution running only to what's due
// (F35), the order on one date (FA50), what X realizes (FA58), the GP commitment's part of the cost (FA60), and at the
// end all paid-in due, uninvested capital included, so the clawback is F12's (FA49). On random funds deal by deal: the
// rules' sums, the end's entitlement the whole fund's, and the split straight between breakpoints and bending at each.

import { describe, expect, it } from "vitest";

import { D, findBreakpoints, portfolio, readFund, splitAt, splitAtNav, toCents } from "../src/index.ts";
import type { AccountDue, Due, Fund, PortfolioRow, Split } from "../src/index.ts";
import { RUN_CASES, applyChange, exact, readCaseFile } from "./support/cases.ts";
import type { CaseExpected, CaseInputs, CaseLpAmount, CasePoint } from "./support/cases.ts";
import { randomClasses, randomDeals, randomFund, seeded } from "./support/random.ts";

/** FA15: two ways of working out one exact amount agree within this. */
const CLOSE = new D("1e-18");

/** FC15: what's due on X, the fund's with its cost made and realized, or an account's; `uninvested` only when some. */
interface CaseDue {
  cost_made?: CaseLpAmount;
  cost_realized?: CaseLpAmount;
  cost: CaseLpAmount;
  uninvested?: CaseLpAmount;
  fees_and_expenses: CaseLpAmount;
  total: CaseLpAmount;
}

interface CaseRow {
  name: string;
  cost_made: CaseLpAmount;
  cost_realized: CaseLpAmount;
  cost_written_off: CaseLpAmount;
  proceeds: CaseLpAmount;
  realized_multiple: string | null;
}

type DealsPoint = CasePoint & { due?: CaseDue; by_account?: { due?: CaseDue }[] };
type DealsExpected = Omit<CaseExpected, "points"> & { investments?: CaseRow[]; points: DealsPoint[] };

function sameAmount(got: D, want: CaseLpAmount, what: string) {
  expect(toCents(got), what).toBe(want.amount);
  expect(got.minus(exact(want.exact)).abs().lte(CLOSE), `${what}: ${got.toString()} against ${want.exact}`).toBe(true);
}

/** FC15: an engine due against the case's. With no `uninvested` in the case there is none: zero, within FA15. */
function sameDue(got: AccountDue | Due, want: CaseDue, what: string) {
  if ("costMade" in got) {
    sameAmount(got.costMade, want.cost_made!, `${what} cost made`);
    sameAmount(got.costRealized, want.cost_realized!, `${what} cost realized`);
  }
  sameAmount(got.cost, want.cost, `${what} cost`);
  if (want.uninvested) sameAmount(got.uninvested, want.uninvested, `${what} uninvested`);
  else expect(got.uninvested.abs().lte(CLOSE), `${what} uninvested: ${got.uninvested.toString()}`).toBe(true);
  sameAmount(got.feesAndExpenses, want.fees_and_expenses, `${what} fees and expenses`);
  sameAmount(got.total, want.total, `${what} total`);
}

describe.each(RUN_CASES)("%s", (dir) => {
  const inputs = readCaseFile<CaseInputs>(dir, "inputs.json");
  const expected = readCaseFile<DealsExpected>(dir, "expected.json");
  const fund = readFund(inputs.fund);

  it("gives the investments table as the case does, or none without investments (F36, FA59)", () => {
    const rows = portfolio(fund);
    const want = expected.investments ?? [];
    expect(rows.map((r) => r.name)).toEqual(want.map((r) => r.name));
    rows.forEach((r, i) => {
      const w = want[i]!;
      sameAmount(r.costMade, w.cost_made, `${r.name} cost made`);
      sameAmount(r.costRealized, w.cost_realized, `${r.name} cost realized`);
      sameAmount(r.costWrittenOff, w.cost_written_off, `${r.name} cost written off`);
      sameAmount(r.proceeds, w.proceeds, `${r.name} proceeds`);
      // Exact (FC1): proceeds over the cost realized, or none while nothing is realized.
      if (w.realized_multiple === null) expect(r.realizedMultiple, r.name).toBeNull();
      else expect(r.realizedMultiple!.minus(exact(w.realized_multiple)).abs().lte(CLOSE), `${r.name}: ${r.realizedMultiple!.toString()}`).toBe(true);
    });
  });

  it.each(expected.points.map((p) => [p.x, p] as const))("gives what's due on X at %s as the case does, or nothing on the whole fund (F35, F36)", (_, p) => {
    const final = expected.final || p.tags.includes("nav");
    const split = splitAt(fund, p.exact, { final });
    if (!p.due) {
      expect(split.due, p.x).toBeNull();
      for (const a of split.byAccount) expect(a.due, `${p.x} ${a.class}`).toBeNull();
      return;
    }
    sameDue(split.due!, p.due, p.x);
    split.byAccount.forEach((a, i) => sameDue(a.due!, p.by_account![i]!.due!, `${p.x} ${a.class ?? "Fund terms"}`));
  });

  const nav = expected.points.find((p) => p.tags.includes("nav"));
  if (nav) {
    it("gives what's due at NAV as at the NAV point, the end's (FA58)", () => {
      const split = splitAtNav(fund)!;
      if (nav.due) sameDue(split.due!, nav.due, "nav");
      else expect(split.due).toBeNull();
    });
  }
});

describe("what's due deal by deal, worked by hand (F35)", () => {
  // Two investments, A's $600 and B's $400, from a $1,000 investment call, and a $100 fee call. A exits for $900; X is
  // from B. 20% carry, no GP commitment.
  const call = (date: string, amount: string, kind = "investment") => ({ date, type: "call", kind, amount });
  const exit = (date: string, amount: string, investment: string, share?: string) => ({ date, type: "distribution", amount, investment, ...(share ? { share } : {}) });
  const writeOff = (date: string, investment: string) => ({ date, type: "write_off", investment });
  const BASE = {
    as_of: "2024-01-01",
    terms: { carry: "0.2", carry_basis: "deal_by_deal" },
    investments: [
      { name: "A", checks: [{ date: "2020-01-01", amount: "600" }] },
      { name: "B", checks: [{ date: "2020-01-01", amount: "400" }] },
    ],
    cash_flows: [call("2020-01-01", "1000"), call("2020-01-01", "100", "fee"), exit("2021-01-01", "900", "A")],
    distribution_from: { investment: "B" },
  };
  const fund = (change: Parameters<typeof applyChange>[1] = {}, base: Record<string, unknown> = BASE) => readFund(applyChange(base, change));
  const cents = (d: D) => toCents(d);
  const dueOf = (s: Split) => {
    const d = s.due!;
    return [d.costMade, d.costRealized, d.cost, d.uninvested, d.feesAndExpenses, d.total].map(cents);
  };
  const capitalReturned = (s: Split) => [cents(s.distribution.lps.capital), cents(s.distribution.gp.total), cents(s.toDate.lps.capital), cents(s.toDate.gp.total)];

  it("returns at an exit only what's due on what it realized, and the rest goes through the carry tier", () => {
    // A's exit realizes its $600 of the $1,000 made: $600 of cost and 60% of the $100 fee, $660 due. The other $240 of
    // the $900 is carry: $48 to the GP. X from B realizes the other $400: $1,100 due, $440 not yet back.
    const f = fund();
    expect(capitalReturned(splitAt(f, "0"))).toEqual(["0.00", "0.00", "660.00", "48.00"]);
    expect(dueOf(splitAt(f, "0"))).toEqual(["1000.00", "1000.00", "1000.00", "0.00", "100.00", "1100.00"]);
    // X of $1,000: $440 of capital, then $560 through the carry tier, $112 to the GP.
    expect(capitalReturned(splitAt(f, "1000"))).toEqual(["440.00", "112.00", "1100.00", "160.00"]);
    const points = findBreakpoints(f);
    expect(points.map((b) => [cents(b.x), b.reasons.map((r) => r.code)])).toEqual([["440.00", ["capital_returned"]]]);
    const r = points[0]!.reasons[0]!;
    expect([r.code === "capital_returned" && cents(r.amount), r.text]).toEqual(["1100.00", "LPs have their $1,100 back for the investments exited or written off, fees and expenses included"]);
  });

  it("at the end has everything paid in due, and owes back the carry the fund's totals don't earn (F12, FA49)", () => {
    // Final: all $1,100 paid in is due. The run on the totals returns it once $900 + X reaches it, at X = $200; from
    // there it earns 20%, while X's own tier 1 runs to $440. The $48 owed falls to zero by X = $440.
    const f = fund({ set: { final: true } });
    const owed = (x: string) => cents(splitAt(f, x).clawback!.owed);
    expect(["0", "200", "300", "440", "1000"].map(owed)).toEqual(["48.00", "48.00", "28.00", "0.00", "0.00"]);
    expect(dueOf(splitAt(f, "0"))).toEqual(["1000.00", "1000.00", "1000.00", "0.00", "100.00", "1100.00"]);
    const points = findBreakpoints(f);
    expect(points.map((b) => [cents(b.x), b.reasons.map((r) => r.text)])).toEqual([
      ["200.00", ["the clawback owed starts to fall: on the fund's totals, LPs have their capital back"]],
      ["440.00", ["LPs have their $1,100 of paid-in capital back", "from here the GP has earned all the carry it was paid earlier"]],
    ]);
  });

  it("returns capital called and never invested at the end, so the clawback never rises: $1,000 called, $800 invested (FA49)", () => {
    const V = { as_of: "2024-01-01", terms: { carry: "0.2", carry_basis: "deal_by_deal" }, investments: [{ name: "A", checks: [{ date: "2020-01-01", amount: "800" }] }], cash_flows: [call("2020-01-01", "1000")], distribution_from: { investment: "A" }, final: true };
    const f = fund({}, V);
    expect(dueOf(splitAt(f, "0"))).toEqual(["800.00", "800.00", "800.00", "200.00", "0.00", "1000.00"]);
    // X's tier 1 runs to all $1,000; nothing is owed back at any X.
    expect(capitalReturned(splitAt(f, "1500"))).toEqual(["1000.00", "100.00", "1000.00", "100.00"]);
    for (const x of ["0", "500", "1000", "2000"]) expect(cents(splitAt(f, x).clawback!.owed), x).toBe("0.00");
    expect(findBreakpoints(f).map((b) => [cents(b.x), b.reasons.map((r) => r.text)])).toEqual([["1000.00", ["LPs have their $1,000 of paid-in capital back"]]]);
    // Not final, only the $800 invested is due, and none of it is uninvested.
    const open = fund({ set: { final: false } }, V);
    expect(dueOf(splitAt(open, "0"))).toEqual(["800.00", "800.00", "800.00", "0.00", "0.00", "800.00"]);
    expect(findBreakpoints(open).map((b) => [cents(b.x), b.reasons.map((r) => r.text)])).toEqual([["800.00", ["LPs have their $800 back for the investments exited or written off, fees and expenses included"]]]);
  });

  it("can have less due than is back already, after a new investment: then no capital comes first, and none is taken back", () => {
    // A's $500 exits for $700 before B's $500 is made: $500 of cost and all the $100 fee, $600 due, then $20 of carry.
    // Once B is made, X from A, which has nothing left, has $500 + $50 due: less than the $600 back.
    const W = {
      ...BASE,
      investments: [
        { name: "A", checks: [{ date: "2020-01-01", amount: "500" }] },
        { name: "B", checks: [{ date: "2022-01-01", amount: "500" }] },
      ],
      cash_flows: [call("2020-01-01", "1000"), call("2020-01-01", "100", "fee"), exit("2021-01-01", "700", "A")],
      distribution_from: { investment: "A" },
    };
    const f = fund({}, W);
    expect(dueOf(splitAt(f, "0"))).toEqual(["1000.00", "500.00", "500.00", "0.00", "50.00", "550.00"]);
    expect(capitalReturned(splitAt(f, "100"))).toEqual(["0.00", "20.00", "600.00", "40.00"]);
    expect(findBreakpoints(f)).toEqual([]);
  });

  it("realizes a date's write-off before its distribution, as F4 orders them, whatever the input's order (FA50)", () => {
    // On one date A's half-share exit for $900, then A's write-off as listed: the write-off goes first and realizes all
    // A's $600, so the exit realizes nothing more. $600 of cost and 60% of the $100 fee are due: $240 of carry, $48 to
    // the GP.
    const sameDay = fund({ set: { "cash_flows[2]": exit("2021-01-01", "900", "A", "0.5"), "cash_flows[3]": writeOff("2021-01-01", "A") } });
    expect(capitalReturned(splitAt(sameDay, "0"))).toEqual(["0.00", "0.00", "660.00", "48.00"]);
    const row = (f: Fund) => portfolio(f)[0]!;
    expect([row(sameDay).costRealized, row(sameDay).costWrittenOff, row(sameDay).proceeds, row(sameDay).realizedMultiple!].map(String)).toEqual(["600", "600", "900", "1.5"]);
    // A day later, the exit comes first and realizes half of A, $300, so $300 and 30% of the fee are due, and the GP has
    // 20% of the other $570.
    const dayAfter = fund({ set: { "cash_flows[2]": exit("2021-01-01", "900", "A", "0.5"), "cash_flows[3]": writeOff("2021-01-02", "A") } });
    expect(capitalReturned(splitAt(dayAfter, "0"))).toEqual(["0.00", "0.00", "330.00", "114.00"]);
    expect([row(dayAfter).costRealized, row(dayAfter).costWrittenOff].map(String)).toEqual(["600", "300"]);
  });

  it("makes a date's checks before its write-offs and distributions (F4, F33)", () => {
    // B's $400 is made on the date of A's exit, so it's in the cost made there: A's $600 is 60% of $1,000, and $660 is
    // due, as when B was made a year earlier. Made after the exit, it would leave A all of the cost made, and all $100 of
    // the fee due.
    const sameDay = fund({ set: { "investments[1].checks[0].date": "2021-01-01" } });
    expect(capitalReturned(splitAt(sameDay, "0"))).toEqual(["0.00", "0.00", "660.00", "48.00"]);
    // A follow-on in A on the date A is written off is written off with it.
    const followOn = fund({
      set: {
        "investments[0].checks": [{ date: "2020-01-01", amount: "400" }, { date: "2022-01-01", amount: "200" }],
        "cash_flows[2]": writeOff("2022-01-01", "A"),
      },
    });
    const a = portfolio(followOn)[0]!;
    expect([a.costMade, a.costRealized, a.costWrittenOff, a.proceeds].map(String)).toEqual(["600", "600", "600", "0"]);
  });

  it("realizes a share of what's left, a follow-on adding to it, and nothing more from an investment with nothing left (F33)", () => {
    // A's $400 and B's $300. Half of A sold for $500: $200 realized and due, $60 of carry. A $300 follow-on in A leaves
    // $500 of it; all of that sold for $1,000: $700 due, $500 not yet back, $100 of carry. An escrow release of $50
    // realizes nothing: all carry, $10. X from A realizes nothing either.
    const Z = {
      ...BASE,
      terms: { carry: "0.2", carry_basis: "deal_by_deal" },
      investments: [
        { name: "A", checks: [{ date: "2020-01-01", amount: "400" }, { date: "2021-06-01", amount: "300" }] },
        { name: "B", checks: [{ date: "2020-01-01", amount: "300" }] },
      ],
      cash_flows: [call("2020-01-01", "1000"), exit("2021-01-01", "500", "A", "0.5"), exit("2022-01-01", "1000", "A"), exit("2023-01-01", "50", "A")],
      distribution_from: { investment: "A" },
    };
    const f = fund({}, Z);
    expect(capitalReturned(splitAt(f, "0"))).toEqual(["0.00", "0.00", "700.00", "170.00"]);
    expect(dueOf(splitAt(f, "0"))).toEqual(["1000.00", "700.00", "700.00", "0.00", "0.00", "700.00"]);
    expect(capitalReturned(splitAt(f, "100"))).toEqual(["0.00", "20.00", "700.00", "190.00"]);
    const [a, b] = portfolio(f) as [PortfolioRow, PortfolioRow];
    expect([a.costMade, a.costRealized, a.costWrittenOff, a.proceeds].map(String)).toEqual(["700", "700", "0", "1550"]);
    expect(a.realizedMultiple!.eq(new D(1550).div(700))).toBe(true);
    expect([b.costMade.toString(), b.costRealized.toString(), b.realizedMultiple]).toEqual(["300", "0", null]);
  });

  it("realizes X's share of what's left of its investment, and nothing from one with nothing left (FA58)", () => {
    // Half of B's $400: $800 realized of $1,000, so $800 of cost and $80 of the fee, $880 due, $220 not yet back.
    const half = fund({ set: { "distribution_from.share": "0.5" } });
    expect(dueOf(splitAt(half, "0"))).toEqual(["1000.00", "800.00", "800.00", "0.00", "80.00", "880.00"]);
    expect(findBreakpoints(half).map((b) => cents(b.x))).toEqual(["220.00"]);
    // X from A, which its exit sold whole: $660 due, all of it back already, so X is all carry.
    const fromA = fund({ set: { "distribution_from.investment": "A" } });
    expect(dueOf(splitAt(fromA, "0"))).toEqual(["1000.00", "600.00", "600.00", "0.00", "60.00", "660.00"]);
    expect(capitalReturned(splitAt(fromA, "100"))).toEqual(["0.00", "20.00", "660.00", "68.00"]);
    // When final, X realizes everything, whatever its source.
    expect(dueOf(splitAt(fromA, "0", { final: true }))).toEqual(["1000.00", "1000.00", "1000.00", "0.00", "100.00", "1100.00"]);
  });

  it("gives the LPs (1 − g) of the cost, whatever the GP commitment pays of fees and expenses (FA60)", () => {
    // A 10% GP commitment, $1,000 invested in A, a $100 fee call and a $50 expense call. X from A, which has nothing left.
    const G = (paysFees: boolean, paysExpenses: boolean) => ({
      as_of: "2024-01-01",
      terms: { carry: "0.2", carry_basis: "deal_by_deal", gp_commitment: { share: "0.1", pays_fees: paysFees, pays_expenses: paysExpenses } },
      investments: [{ name: "A", checks: [{ date: "2020-01-01", amount: "1000" }] }],
      cash_flows: [call("2020-01-01", "1000"), call("2020-01-01", "100", "fee"), call("2020-01-01", "50", "expense"), exit("2021-01-01", "2000", "A")],
      distribution_from: { investment: "A" },
    });
    // Neither: the LPs pay all $150 of fees and expenses; $900 + $150 due, all their paid-in.
    expect(dueOf(splitAt(fund({}, G(false, false)), "0"))).toEqual(["1000.00", "1000.00", "900.00", "0.00", "150.00", "1050.00"]);
    // Both: they pay 90% of them, $135, and still $900 of the cost.
    expect(dueOf(splitAt(fund({}, G(true, true)), "0"))).toEqual(["1000.00", "1000.00", "900.00", "0.00", "135.00", "1035.00"]);
  });

  it("splits exactly as on the whole fund once everything made has been realized and every call invested", () => {
    const one = {
      ...BASE,
      investments: [{ name: "A", checks: [{ date: "2020-01-01", amount: "1000" }] }],
      cash_flows: [call("2020-01-01", "1000"), call("2020-01-01", "100", "fee"), exit("2021-01-01", "3000", "A")],
      distribution_from: { investment: "A" },
    };
    for (const final of [false, true]) {
      const deals = fund({ set: { final } }, one);
      const whole = fund({ set: { final, "terms.carry_basis": "whole_fund" } }, one);
      for (const x of ["0", "500", "5000"]) {
        const [a, b] = [splitAt(deals, x), splitAt(whole, x)];
        expect(JSON.stringify([a.distribution, a.toDate, a.clawback]), `${final} ${x}`).toBe(JSON.stringify([b.distribution, b.toDate, b.clawback]));
      }
      expect(findBreakpoints(deals)).toEqual(findBreakpoints(whole));
    }
  });
});

describe("the investments table (F36)", () => {
  const input = readCaseFile<CaseInputs>("fund-35-deal-by-deal-clawback", "inputs.json").fund;

  it("is the same on either basis: the carry basis changes no investment's numbers", () => {
    const whole = readFund(applyChange(input, { set: { "terms.carry_basis": "whole_fund" } }));
    expect(JSON.stringify(portfolio(whole))).toBe(JSON.stringify(portfolio(readFund(input))));
  });

  it("is fresh each time, so what a caller does to it changes nothing the engine keeps", () => {
    const fund = readFund(input);
    const before = JSON.stringify([portfolio(fund), splitAt(fund, "1000000"), findBreakpoints(fund)]);
    const rows = portfolio(fund);
    Object.assign(rows[0]!, { name: "Someone else", costMade: new D(1) });
    rows[1]!.proceeds.d[0] = 7;
    rows.reverse();
    rows.pop();
    const [a, b] = [portfolio(fund), portfolio(fund)];
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    expect(a[0]!.costMade).not.toBe(b[0]!.costMade);
    expect(JSON.stringify([portfolio(fund), splitAt(fund, "1000000"), findBreakpoints(fund)])).toBe(before);
  });
});

describe("a Fund built by hand that readFund would refuse, deal by deal (FA62)", () => {
  const read = readFund(readCaseFile<CaseInputs>("fund-34-deal-by-deal", "inputs.json").fund);

  it("realizes nothing for a distribution or an X naming no investment it lists, and has nothing made with none", () => {
    // No investments at all: nothing made or realized, so nothing is due before carry and every dollar is carry's.
    const none = { ...read, investments: [] } as Fund;
    const split = splitAt(none, "1000000");
    expect([split.due!.costMade, split.due!.total, split.distribution.lps.capital, split.toDate.lps.capital].map(String)).toEqual(["0", "0", "0", "0"]);
    expect(portfolio(none)).toEqual([]);
    // X from an investment it doesn't list realizes nothing: what's due is what the cash flows realized.
    const unknown = { ...read, distributionFrom: { investment: "Nobody", share: new D(1) } } as Fund;
    expect(toCents(splitAt(unknown, "0").due!.costRealized)).toBe("6000000.00");
  });

  it("works one from scratch, so a change after a split shows in the next one", () => {
    const fund = { ...read, investments: read.investments.map((i) => ({ ...i, checks: [...i.checks] })) } as Fund;
    expect(toCents(splitAt(fund, "0").due!.costMade)).toBe("10000000.00");
    (fund.investments[2]!.checks as Fund["investments"][number]["checks"]).push({ date: "2023-01-01", amount: new D("1000000") });
    expect(toCents(splitAt(fund, "0").due!.costMade)).toBe("11000000.00");
  });
});

describe("on random funds deal by deal", () => {
  /** 300 funds, half of them with LPs in classes and later closes, X final in some. */
  const funds = (() => {
    const rand = seeded(20261029);
    return Array.from({ length: 300 }, () => {
      const input = randomDeals(rand, randomFund(rand));
      return readFund(rand() < 0.5 ? input : randomClasses(rand, input));
    });
  })();
  const near = (a: D, b: D, tol = "1e-20") => a.minus(b).abs().lte(tol);
  /** The same fund, paying carry on the whole fund. */
  const wholeFund = (f: Fund) => ({ ...f, terms: { ...f.terms, carryBasis: "whole_fund" } }) as Fund;

  it("give what's due as F35 adds it up, the accounts' summing to the fund's, all paid-in at the end", () => {
    let uninvested = 0;
    for (const f of funds) {
      for (const final of [false, true]) {
        const split = splitAt(f, "1000000", { final });
        const d = split.due!;
        expect(near(d.total, d.cost.plus(d.uninvested).plus(d.feesAndExpenses))).toBe(true);
        expect(d.costRealized.lte(d.costMade) && d.total.lte(split.lpsPaidIn.plus("1e-20"))).toBe(true);
        if (final) {
          expect(d.costRealized.eq(d.costMade) && d.total.eq(split.lpsPaidIn) && d.uninvested.gte(0)).toBe(true);
          // FA49: exactly zero when every dollar called for investments was invested, each account's too.
          const invested = f.investments.flatMap((i) => i.checks).reduce((t, c) => t.plus(c.amount), new D(0));
          const called = f.cashFlows.filter((c) => c.kind === "investment").reduce((t, c) => t.plus(c.amount!), new D(0));
          expect([d, ...split.byAccount.map((a) => a.due!)].every((a) => a.uninvested.isZero() === invested.eq(called))).toBe(true);
          if (d.uninvested.gt("0.005")) uninvested++;
        } else expect(d.uninvested.isZero()).toBe(true);
        if (split.byAccount.length) {
          for (const k of ["cost", "uninvested", "feesAndExpenses", "total"] as const) {
            expect(near(split.byAccount.reduce((s, a) => s.plus(a.due![k]), new D(0)), d[k]), k).toBe(true);
          }
        }
      }
    }
    // The funds reach the end with capital left uninvested often enough to mean something (FA49).
    expect(uninvested).toBeGreaterThan(50);
  });

  it("return capital first only up to what's due on X, then carry, never taking back what's returned (F35)", () => {
    for (const f of funds) {
      for (const final of [false, true]) {
        const before = splitAt(f, "0", { final });
        // An X far beyond the paid-in fills every account's tier 1: its capital to date is what's due or what's back.
        const big = splitAt(f, before.lpsPaidIn.times(20), { final });
        const accounts = big.byAccount.length ? big.byAccount : [{ ...big, due: big.due! }];
        const was = before.byAccount.length ? before.byAccount : [before];
        accounts.forEach((a, i) => expect(near(a.toDate.lps.capital, D.max(a.due!.total, was[i]!.toDate.lps.capital), "1e-18")).toBe(true));
      }
    }
  });

  it("end at the whole fund's entitlement, so the GP keeps at most what the whole fund gives it (F35, F12)", () => {
    for (const f of funds) {
      for (const x of ["0", "2500000", "40000000"]) {
        const [deals, whole] = [splitAt(f, x, { final: true }), splitAt(wholeFund(f), x, { final: true })];
        expect(near(deals.clawback!.entitlement, whole.clawback!.entitlement), x).toBe(true);
        expect(deals.clawback!.carryPaid.minus(deals.clawback!.owed).lte(deals.clawback!.entitlement.plus("1e-20"))).toBe(true);
      }
    }
  });

  it("pay flat carry no later than the whole fund does, before any clawback", () => {
    const flat = funds.filter((f) => f.terms.carry.length === 1 && f.lps.length === 0);
    expect(flat.length).toBeGreaterThan(40);
    for (const f of flat) {
      for (const x of ["0", "2500000", "40000000"]) expect(splitAt(f, x).toDate.gp.total.gte(splitAt(wholeFund(f), x).toDate.gp.total.minus("1e-20")), x).toBe(true);
    }
  });

  it("split in straight lines between breakpoints, bending at each, the clawback never rising (F15, FA9)", () => {
    // What a breakpoint bends: X's capital and the GP's part of X, and when final the clawback owed, each account's too.
    const measures = (s: Split) => [s.distribution.lps.capital, s.distribution.gp.total, s.clawback?.owed ?? new D(0), ...s.byAccount.flatMap((a) => [a.distribution.lps.capital, a.distribution.gp.total, a.clawback?.owed ?? new D(0)])];
    let bends = 0;
    for (const f of funds) {
      const points = findBreakpoints(f).map((b) => b.x);
      const xs = [new D(0), ...points, (points.at(-1) ?? new D(1_000_000)).times(2).plus(1_000_000)];
      const at = xs.map((x) => measures(splitAt(f, x)));
      for (let i = 0; i + 1 < xs.length; i++) {
        const mid = measures(splitAt(f, xs[i]!.plus(xs[i + 1]!).div(2)));
        mid.forEach((m, k) => expect(near(m.times(2), at[i]![k]!.plus(at[i + 1]![k]!), "1e-18"), `${xs[i]} to ${xs[i + 1]}`).toBe(true));
      }
      for (let i = 1; i + 1 < xs.length; i++) {
        const slope = (j: number, k: number) => at[j + 1]![k]!.minus(at[j]![k]!).div(xs[j + 1]!.minus(xs[j]!));
        expect(at[i]!.some((_, k) => !near(slope(i - 1, k), slope(i, k), "1e-15")), `${xs[i]}`).toBe(true);
        bends++;
      }
      if (f.final) for (const x of xs) expect(splitAt(f, x).clawback!.owed.gte(0)).toBe(true);
    }
    expect(bends).toBeGreaterThan(300);
  });
});
