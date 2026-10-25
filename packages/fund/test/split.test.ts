// The engine against every point of every fund case, to the cent (FC8): X and the fund to date by tier, the GP
// commitment's line, the paid-in and the pref to D, and, when final or at the NAV point, the clawback. With LPs, each
// LP's amounts (F20, FC9), to the cent and within FA15 of exact. With two or more accounts, each account's own (F23,
// F24, FC11).

import { describe, expect, it } from "vitest";

import { D, equalization, readFund, splitAt, splitAtNav, toCents } from "../src/index.ts";
import type { AccountSplit, LpAmounts, Split } from "../src/index.ts";
import { RUN_CASES, absentTiersAreZero, asCaseBlock, exact, readCaseFile } from "./support/cases.ts";
import type { CaseExpected, CaseInputs, CaseLpAmount, CasePoint } from "./support/cases.ts";
import { randomClasses, randomFund, seeded } from "./support/random.ts";

/** FA15: two ways of working out one exact amount agree within this. */
const CLOSE = new D("1e-18");

/** An LP's amount as the engine has it against the case's: equal to the cent, and within FA15 of the exact value. */
function sameAmount(got: D, want: CaseLpAmount, what: string) {
  expect(toCents(got), what).toBe(want.amount);
  expect(got.minus(exact(want.exact)).abs().lte(CLOSE), `${what}: ${got.toString()} against ${want.exact}`).toBe(true);
}

/** F20: each LP's amounts in a split, against the case's `lps` and the point's `by_lp` (FC9). */
function sameLps(split: Split, expected: CaseExpected, p: CasePoint) {
  if (!expected.lps) {
    expect(split.byLp, p.x).toEqual([]);
    return;
  }
  expect(split.byLp.map((lp) => lp.name), p.x).toEqual(expected.lps.map((lp) => lp.name));
  split.byLp.forEach((lp: LpAmounts, i) => {
    const want = expected.lps![i]!;
    const at = p.by_lp![i]!;
    const what = `${p.x} ${lp.name}`;
    expect(lp.commitment.eq(exact(want.commitment)), `${what} commitment`).toBe(true);
    expect(lp.share.minus(exact(want.share)).abs().lte(CLOSE), `${what} share`).toBe(true);
    // FC11: the case gives a class when the LP has one, and a close when it joins at a later close.
    expect(lp.class, `${what} class`).toBe(want.class ?? null);
    if (want.close) expect(lp.close, `${what} close`).toBe(want.close);
    sameAmount(lp.paidIn, want.paid_in, `${what} paid in`);
    sameAmount(lp.distribution, at.distribution, `${what} from X`);
    sameAmount(lp.toDate, at.to_date, `${what} to date`);
    // F20: its share of the clawback when final, and at the NAV point; null where the split has none.
    if (at.clawback) sameAmount(lp.clawback!, at.clawback, `${what} clawback`);
    else expect(lp.clawback, `${what} clawback`).toBeNull();
  });
}

describe.each(RUN_CASES)("%s", (dir) => {
  const inputs = readCaseFile<CaseInputs>(dir, "inputs.json");
  const expected = readCaseFile<CaseExpected>(dir, "expected.json");
  const fund = readFund(inputs.fund);

  it("reads the fund, final or not as the case is", () => {
    expect(fund.final).toBe(expected.final);
  });

  // FC11: with two or more accounts, each step names its account.
  const named = expected.accounts !== undefined;

  it.each(expected.points.map((p) => [p.x, p] as const))("splits %s as the case does", (_, p) => {
    // F14: the NAV point is final by definition.
    const final = expected.final || p.tags.includes("nav");
    const split = splitAt(fund, p.exact, { final });
    expect(asCaseBlock(fund, split.distribution, { named })).toEqual(p.distribution);
    expect(asCaseBlock(fund, split.toDate, { named })).toEqual(p.to_date);
    expect(absentTiersAreZero(fund, split)).toBe(true);

    expect(toCents(split.lpsPaidIn)).toBe(expected.lps_paid_in);
    if (expected.gp_commitment_paid_in) expect(toCents(split.gpCommitmentPaidIn)).toBe(expected.gp_commitment_paid_in);
    else expect(split.gpCommitmentPaidIn.isZero()).toBe(true);
    expect(split.prefAccrued && toCents(split.prefAccrued)).toBe(expected.pref_accrued_to_d ?? null);
    // F10: the LP multiple is the LPs' to date over their paid-in, exactly, and reproduces the case's LP total to the
    // cent. The cases don't record the multiple itself (FC4).
    expect(split.lpMultiple.times(split.lpsPaidIn).minus(split.toDate.lps.total).abs().lte("1e-25")).toBe(true);
    expect(split.lpMultiple.times(expected.lps_paid_in).minus(p.to_date.lps.total!).abs().lte("0.005")).toBe(true);
    // Each step's LP share is the GP's × (1 − rate) ÷ rate, and the steps' add up to the carry tier, for X and to date
    // (f01f review, answer 2).
    for (const t of [split.distribution, split.toDate]) {
      for (const s of t.gp.carry) {
        if (s.rate.gt(0)) expect(s.lps.minus(s.amount.times(D.sub(1, s.rate)).div(s.rate)).abs().lte("1e-20"), `${p.x} at ${s.rate}`).toBe(true);
      }
      expect(t.gp.carry.reduce((sum, s) => sum.plus(s.lps), new D(0)).minus(t.lps.carryTier).abs().lte("1e-20")).toBe(true);
    }

    if (!p.clawback) {
      expect(split.clawback).toBeNull();
      return;
    }
    const c = split.clawback!;
    expect({ carry_paid: toCents(c.carryPaid), entitlement: toCents(c.entitlement), owed: toCents(c.owed) }).toEqual(p.clawback);
    expect(c.prefOnFundTotals && toCents(c.prefOnFundTotals)).toBe(expected.pref_on_fund_totals ?? null);
  });

  it.each(expected.points.map((p) => [p.x, p] as const))("gives each account its own split at %s as the case does (F23, F24)", (_, p) => {
    const final = expected.final || p.tags.includes("nav");
    const split = splitAt(fund, p.exact, { final });
    if (!expected.accounts) {
      expect(split.byAccount, p.x).toEqual([]);
      return;
    }
    expect(split.byAccount.map((a) => a.class)).toEqual(expected.accounts.map((a) => a.class));
    split.byAccount.forEach((a, i) => {
      const want = expected.accounts![i]!;
      const at = p.by_account![i]!;
      const what = `${p.x} ${a.class ?? "Fund terms"}`;
      expect(asCaseBlock(fund, a.distribution, { account: true }), what).toEqual(at.distribution);
      expect(asCaseBlock(fund, a.toDate, { account: true }), what).toEqual(at.to_date);
      expect(a.distribution.gp.carry.every((s) => s.class === a.class) && a.distribution.gpCommitment.isZero(), what).toBe(true);
      expect(toCents(a.paidIn), `${what} paid in`).toBe(want.paid_in);
      expect(a.prefAccrued && toCents(a.prefAccrued), `${what} pref`).toBe(want.pref_accrued_to_d ?? null);
      // F10: its own multiple, its LPs' to date over its paid-in; none with nothing paid in (FA38).
      expect(a.lpMultiple === null, `${what} multiple`).toBe(a.paidIn.isZero());
      if (a.lpMultiple) expect(a.lpMultiple.times(a.paidIn).minus(a.toDate.lps.total).abs().lte("1e-25"), `${what} multiple`).toBe(true);
      if (!at.clawback) {
        expect(a.clawback, what).toBeNull();
        return;
      }
      const c = a.clawback!;
      expect({ carry_paid: toCents(c.carryPaid), entitlement: toCents(c.entitlement), owed: toCents(c.owed) }, what).toEqual(at.clawback);
      expect(c.prefOnFundTotals && toCents(c.prefOnFundTotals), what).toBe(want.pref_on_fund_totals ?? null);
    });
    // F23, FA23: the fund's amounts are the accounts' sums; its owed sums each account's, floored first.
    const sum = (f: (a: (typeof split.byAccount)[number]) => D) => split.byAccount.reduce((t, a) => t.plus(f(a)), new D(0));
    expect(sum((a) => a.distribution.lps.total).minus(split.distribution.lps.total).abs().lte(CLOSE)).toBe(true);
    expect(sum((a) => a.distribution.gp.total).minus(split.distribution.gp.total).abs().lte(CLOSE)).toBe(true);
    if (split.clawback) expect(sum((a) => a.clawback!.owed).minus(split.clawback.owed).abs().lte(CLOSE)).toBe(true);
  });

  it.each(expected.points.map((p) => [p.x, p] as const))("gives each LP its amounts at %s as the case does (F20)", (_, p) => {
    const final = expected.final || p.tags.includes("nav");
    sameLps(splitAt(fund, p.exact, { final }), expected, p);
  });

  const nav = expected.points.find((p) => p.tags.includes("nav"));
  if (nav) {
    it("splits at NAV as at the NAV point, final", () => {
      const split = splitAtNav(fund)!;
      expect(asCaseBlock(fund, split.distribution, { named })).toEqual(nav.distribution);
      expect(split.clawback && toCents(split.clawback.owed)).toBe(nav.clawback!.owed);
      sameLps(split, expected, nav);
    });
  } else {
    it("has no NAV split without a NAV", () => {
      expect(splitAtNav(fund)).toBeNull();
    });
  }
});

describe("an account with nothing paid in (FA38)", () => {
  // A young fund that has called only management fees so far, with a class paying none: the class has nothing paid in.
  const fund = readFund({
    as_of: "2025-01-01",
    terms: { carry: { steps: [{ rate: "0.20" }, { rate: "0.30", from_lp_multiple: "2" }] }, fee_rate: "0.02", lp_classes: [{ name: "Friends and family", fee_rate: "0" }] },
    cash_flows: [
      { date: "2023-01-01", type: "call", kind: "fee", amount: "200000" },
      { date: "2024-01-01", type: "call", kind: "fee", amount: "200000" },
    ],
    lps: [
      { name: "Alder Endowment", commitment: "8000000" },
      { name: "Cedar Holdings", commitment: "2000000", class: "Friends and family" },
    ],
  });

  it("has no multiple, while the fund's and the other account's have theirs", () => {
    for (const x of ["0", "1000000"]) {
      const split = splitAt(fund, x);
      const [terms, friends] = split.byAccount as [AccountSplit, AccountSplit];
      expect([friends.class, toCents(friends.paidIn), friends.lpMultiple], x).toEqual(["Friends and family", "0.00", null]);
      expect(toCents(terms.paidIn), x).toBe("400000.00");
      expect(terms.lpMultiple!.times(terms.paidIn).minus(terms.toDate.lps.total).abs().lte("1e-25"), x).toBe(true);
      // The fund's LPs always have something paid in (call_without_payers), so its multiple is always a number.
      expect(split.lpMultiple.times(split.lpsPaidIn).minus(split.toDate.lps.total).abs().lte("1e-25"), x).toBe(true);
    }
  });

  it("takes its carry at its top rate from its first dollar, each step's threshold a multiple of nothing (F10, F11)", () => {
    // Its part of X is its commitment's, 2/10 of $1,000,000: no capital to return, so all of it is carry at 30%.
    const friends = splitAt(fund, "1000000").byAccount[1]!;
    expect(friends.distribution.gp.carry.map((s) => [s.rate.toString(), toCents(s.amount)])).toEqual([
      ["0.2", "0.00"],
      ["0.3", "60000.00"],
    ]);
    expect([toCents(friends.distribution.lps.capital), toCents(friends.distribution.lps.total)]).toEqual(["0.00", "140000.00"]);
  });
});

describe("each LP's amounts on random funds (F20)", () => {
  it("add up to the LPs' own, in the commitments' proportions, on 200 funds with 1 to 9 LPs", () => {
    const rand = seeded(20261018);
    const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
    // Whole, decimal and fraction commitments, as F17 reads any exact number.
    const commitment = () => [String(int(1, 50) * 100_000), `${int(1, 999)}.${int(1, 99)}`, `${int(1, 100)}/${int(1, 13)}`][int(0, 2)]!;
    for (let i = 0; i < 200; i++) {
      const input = randomFund(rand);
      const lps = Array.from({ length: int(1, 9) }, (_, j) => ({ name: `LP ${j}`, commitment: commitment() }));
      const fund = readFund({ ...input, lps });
      const all = fund.lps.reduce((t, lp) => t.plus(lp.commitment), new D(0));
      for (const x of ["0", String(int(1, 400) * 100_000), `${int(1, 9999)}/7`]) {
        const split = splitAt(fund, x);
        const sums: [string, (lp: LpAmounts) => D | null, D | null][] = [
          ["paid in", (lp) => lp.paidIn, split.lpsPaidIn],
          ["from X", (lp) => lp.distribution, split.distribution.lps.total],
          ["to date", (lp) => lp.toDate, split.toDate.lps.total],
          ["clawback", (lp) => lp.clawback, split.clawback?.owed ?? null],
        ];
        for (const [what, of, total] of sums) {
          if (total === null) {
            expect(split.byLp.every((lp) => of(lp) === null), `${i} ${what}`).toBe(true);
            continue;
          }
          const sum = split.byLp.reduce((t, lp) => t.plus(of(lp)!), new D(0));
          expect(sum.minus(total).abs().lte(CLOSE), `${i} at ${x}: ${what}`).toBe(true);
          for (const lp of split.byLp) expect(of(lp)!.minus(total.times(lp.share)).abs().lte(CLOSE), `${i} ${lp.name} ${what}`).toBe(true);
        }
        expect(split.byLp.reduce((t, lp) => t.plus(lp.share), new D(0)).minus(1).abs().lte(CLOSE)).toBe(true);
        expect(split.byLp.map((lp) => lp.commitment.div(all).eq(lp.share))).not.toContain(false);
      }
    }
  });
});

describe("classes and later closes on random funds (F22 to F25)", () => {
  const near = (a: D, b: D) => a.minus(b).abs().lte(CLOSE);

  it("add each account up to the fund, each LP up to its account, and balance every close, on 200 funds", () => {
    const rand = seeded(20261025);
    for (let i = 0; i < 200; i++) {
      const fund = readFund(randomClasses(rand, randomFund(rand)));
      for (const x of ["0", "3000000", "25000000"]) {
        const split = splitAt(fund, x);
        const accounts = split.byAccount.length ? split.byAccount : [{ class: fund.lps[0]!.class, distribution: split.distribution, toDate: split.toDate, paidIn: split.lpsPaidIn, clawback: split.clawback }];
        // F23, FA23: the fund's amounts are the accounts' sums, and the GP commitment's line beside them.
        const sum = (f: (a: (typeof accounts)[number]) => D) => accounts.reduce((t, a) => t.plus(f(a)), new D(0));
        expect(near(sum((a) => a.distribution.lps.total.plus(a.distribution.gp.total)).plus(split.distribution.gpCommitment), split.x), `${i} at ${x}`).toBe(true);
        expect(near(sum((a) => a.paidIn), split.lpsPaidIn), `${i} paid in`).toBe(true);
        if (split.clawback) expect(near(sum((a) => a.clawback!.owed), split.clawback.owed), `${i} owed`).toBe(true);
        // F20, F23: each LP's amounts are its part of its account's, by commitment, so they add up to the account's.
        for (const a of accounts) {
          const own = split.byLp.filter((lp) => lp.class === a.class);
          expect(near(own.reduce((t, lp) => t.plus(lp.toDate), new D(0)), a.toDate.lps.total), `${i} ${a.class} to date`).toBe(true);
          expect(near(own.reduce((t, lp) => t.plus(lp.paidIn), new D(0)), a.paidIn), `${i} ${a.class} paid in`).toBe(true);
        }
        // F19: the shares are over all the LPs' commitments, and add up to 1.
        expect(near(split.byLp.reduce((t, lp) => t.plus(lp.share), new D(0)), new D(1)), `${i} shares`).toBe(true);
      }
      // F25, FA30: at every close the joiners pay in what the LPs already in get back, and the interest too.
      for (const close of equalization(fund)?.closes ?? []) {
        const total = (f: (m: (typeof close.lps)[number]) => D) => close.lps.reduce((t, m) => t.plus(f(m)), new D(0));
        expect(near(total((m) => m.capitalPaid), total((m) => m.capitalReturned)), `${i} ${close.date}`).toBe(true);
        expect(near(total((m) => m.interestPaid), total((m) => m.interestReceived)), `${i} ${close.date} interest`).toBe(true);
      }
    }
  });

  it("give the same fund amounts with every LP in a class on the fund's terms as with no LPs at all (F23)", () => {
    const rand = seeded(20261026);
    for (let i = 0; i < 100; i++) {
      const input = randomFund(rand);
      const lps = [{ name: "A", commitment: "3" }, { name: "B", commitment: "5", class: "Same" }, { name: "C", commitment: "2", class: "Same" }];
      const plain = readFund(input);
      const classed = readFund({ ...input, terms: { ...(input.terms as object), lp_classes: [{ name: "Same" }] }, lps });
      for (const x of ["0", "4000000", "40000000"]) {
        const [a, b] = [splitAt(plain, x), splitAt(classed, x)];
        expect(b.byAccount.map((s) => s.class), `${i}`).toEqual([null, "Same"]);
        for (const [got, want] of [[b.distribution.lps.total, a.distribution.lps.total], [b.toDate.gp.total, a.toDate.gp.total], [b.lpsPaidIn, a.lpsPaidIn]] as const) {
          expect(near(got, want), `${i} at ${x}`).toBe(true);
        }
        if (a.clawback) expect(near(b.clawback!.owed, a.clawback.owed), `${i} owed at ${x}`).toBe(true);
      }
    }
  });
});
