// Checks that every fund case is consistent with itself (FC2 to FC12). No engine code is involved: these tests guard
// the case files, and the engine's own case tests arrive in f01b. The LPs' cases are also held to the cases they add
// LPs to, since the engine reads LPs only from f02b. The classes' and later closes' cases (f03a) are held to their
// accounts and their equalization, since the engine reads them only from f03b.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";

import { D } from "../src/index.ts";

const CASES = resolve(import.meta.dirname, "../cases");
const FUND = readdirSync(CASES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("fund-"))
  .map((d) => d.name)
  .sort();
const RUN = FUND.filter((n) => existsSync(join(CASES, n, "inputs.json")));
const REFUSED = FUND.filter((n) => existsSync(join(CASES, n, "fixtures")));

const CENT = new D("0.01");
const TIER_CODES = ["capital_returned", "pref_met", "catch_up_done", "carry_step"];
const CLAWBACK_CODES = ["clawback_cleared", "clawback_starts", "clawback_changes"];
const TERMS = [
  "bad_number",
  "bad_date",
  "bad_field",
  "missing_field",
  "unknown_field",
  "carry_rate_not_below_one",
  "steps_out_of_order",
  "catch_up_without_pref",
  "catch_up_share_not_above_carry",
  "gp_commitment_not_below_one",
  "no_calls",
  "distribution_before_call",
  "cash_flow_after_distribution_date",
  "lp_name_repeated",
  "lp_class_name_repeated",
  "lp_class_unknown",
  "lp_close_after_distribution",
  "call_without_payers",
];

interface Step {
  class?: string | null;
  rate: string;
  from_lp_multiple?: string;
  amount: string;
}
interface Block {
  amount: string;
  gp_commitment?: string;
  lps: { capital: string; pref?: string; catch_up?: string; carry_tier: string; total: string };
  gp: { catch_up?: string; carry: Step[]; total: string };
}
interface Clawback {
  carry_paid: string;
  entitlement: string;
  owed: string;
}
interface Point {
  x: string;
  exact: string;
  tags: string[];
  distribution: Block;
  to_date: Block;
  clawback?: Clawback;
  by_account?: { class: string | null; distribution: Block; to_date: Block; clawback?: Clawback }[];
}
interface Reason {
  code: string;
  class?: string | null;
  text: string;
}
interface Expected {
  case: string;
  final: boolean;
  breakpoints: { x: string; exact: string; reasons: Reason[] }[];
  points: Point[];
}
interface InputLp {
  name: string;
  commitment: string;
  class?: string | null;
  close?: string | null;
}
interface InputClass {
  name: string;
  fee_rate?: string | null;
  carry?: unknown;
}
interface Inputs {
  case: string;
  xs: string[];
  fund: {
    nav?: string;
    final?: boolean;
    terms: { fee_rate?: string | null; equalization_rate?: string | null; lp_classes?: InputClass[] | null };
    cash_flows: { date: string; type: string; kind?: string; amount: string }[];
    lps?: InputLp[] | null;
  };
}
interface LpAmount {
  amount: string;
  exact: string;
}
interface LpPoint extends Point {
  by_lp?: { name: string; distribution: LpAmount; to_date: LpAmount; clawback?: LpAmount }[];
}
interface Moves {
  name: string;
  capital_paid: LpAmount;
  capital_returned: LpAmount;
  interest_paid: LpAmount;
  interest_received: LpAmount;
}
interface LpExpected extends Omit<Expected, "points"> {
  lps_paid_in: string;
  pref_accrued_to_d?: string;
  lps?: { name: string; class?: string; close?: string; commitment: string; share: string; paid_in: LpAmount }[];
  accounts?: { class: string | null; commitment: string; share: string; fee_share: string; paid_in: string; pref_accrued_to_d?: string }[];
  equalization?: { rate: string; closes: { date: string; joining: string[]; lps: Moves[] }[]; lps: Moves[] };
  points: LpPoint[];
}

const readJson = <T,>(...path: string[]): T => JSON.parse(readFileSync(join(CASES, ...path), "utf8")) as T;
const exact = (s: string) => (s.includes("/") ? new D(s.split("/")[0]!).div(s.split("/")[1]!) : new D(s));
const sum = (xs: (string | undefined)[]) => xs.reduce((s, x) => (x === undefined ? s : s.plus(x)), new D(0));
// Each amount is rounded to the cent on its own, so a sum of n of them can drift by half a cent each.
const near = (a: D, b: D, n: number) => a.minus(b).abs().lte(CENT.times(n).div(2));
// FC8, FA14: to the cent, half away from zero, after 20 places.
const cents = (x: D) => x.toDecimalPlaces(20, D.ROUND_HALF_UP).toDecimalPlaces(2, D.ROUND_HALF_UP).toFixed(2);
// Two ways of working out one exact amount at 40 digits agree far closer than this (FA15).
const CLOSE = new D("1e-25");

const lpsOf = (dir: string) => readJson<Inputs>(dir, "inputs.json").fund.lps ?? [];
const hasLps = (dir: string) => lpsOf(dir).length > 0;
const LP_RUN = RUN.filter(hasLps);
const firstCall = (dir: string) =>
  readJson<Inputs>(dir, "inputs.json")
    .fund.cash_flows.filter((f) => f.type === "call")
    .map((f) => f.date)
    .sort()[0]!;
/** F25: an LP whose close is after the fund's first call joins at a later close. */
const joinsLater = (dir: string, lp: InputLp) => lp.close != null && lp.close > firstCall(dir);
/** F22, F25: a case whose LPs aren't all on the fund's terms and in from the start. */
const classesOrCloses = (dir: string) => lpsOf(dir).some((lp) => lp.class != null || joinsLater(dir, lp));
const CLASS_RUN = LP_RUN.filter(classesOrCloses);

/** F23, FA22: the accounts, the fund's terms first, then each class an LP names in the input's order. */
function accountsOf(dir: string): (string | null)[] {
  const inputs = readJson<Inputs>(dir, "inputs.json").fund;
  const lps = inputs.lps ?? [];
  const named = (inputs.terms.lp_classes ?? []).map((c) => c.name).filter((n) => lps.some((lp) => lp.class === n));
  return [...(lps.some((lp) => lp.class == null) ? [null] : []), ...named];
}

describe("fund cases", () => {
  it("are twenty-five runs and three sets of refusals", () => {
    expect(RUN).toHaveLength(25);
    expect(REFUSED).toEqual(["fund-14-refused", "fund-21-lps-refused", "fund-27-classes-refused"]);
    expect([...RUN, ...REFUSED].sort()).toEqual(FUND);
  });

  it("have LPs in cases 17 to 20, 22 to 26 and 28 (F19)", () => {
    expect(LP_RUN).toEqual([
      "fund-17-lps-three",
      "fund-18-lps-thirds",
      "fund-19-lps-clawback",
      "fund-20-lps-spv",
      "fund-22-classes-fee-carry",
      "fund-23-classes-pref-catch-up",
      "fund-24-classes-clawback",
      "fund-25-later-close",
      "fund-26-closes-and-classes",
      "fund-28-classes-clawback-steps",
    ]);
  });

  it("have classes or later closes in cases 22 to 26 and 28 only (F22, F25)", () => {
    expect(CLASS_RUN).toEqual(LP_RUN.slice(4));
  });

  it("use 40 significant digits (F17)", () => {
    expect(new D(1).div(3).toString()).toBe(`0.${"3".repeat(40)}`);
  });
});

describe.each(RUN)("%s", (dir) => {
  it("has inputs.json, expected.json and DERIVATION.md, naming the same case", () => {
    for (const f of ["inputs.json", "expected.json", "DERIVATION.md"]) expect(existsSync(join(CASES, dir, f)), f).toBe(true);
    expect(readJson<Inputs>(dir, "inputs.json").case).toBe(dir);
    expect(readJson<Expected>(dir, "expected.json").case).toBe(dir);
  });

  const inputs = readJson<Inputs>(dir, "inputs.json");
  const expected = readJson<Expected>(dir, "expected.json");

  it("gives a point at every listed X, every breakpoint and the NAV point, tagged (FC4)", () => {
    const at = new Map(expected.points.map((p) => [exact(p.exact).toString(), p]));
    for (const x of inputs.xs) expect(at.get(exact(x).toString())?.tags, x).toContain("listed");
    for (const b of expected.breakpoints) expect(at.get(exact(b.exact).toString())?.tags, b.x).toContain("breakpoint");
    if (inputs.fund.nav !== undefined) expect(at.get(exact(inputs.fund.nav).toString())?.tags).toContain("nav");
    for (const p of expected.points) expect(p.x).toBe(exact(p.exact).toFixed(2));
  });

  it("lists breakpoints in order, above 0, each with F15's reasons", () => {
    let prev = new D(0);
    for (const b of expected.breakpoints) {
      const x = exact(b.exact);
      expect(x.gt(prev), b.x).toBe(true);
      expect(b.reasons.length).toBeGreaterThan(0);
      for (const r of b.reasons) {
        expect([...TIER_CODES, ...(expected.final ? CLAWBACK_CODES : [])]).toContain(r.code);
        expect(r.text.length).toBeGreaterThan(20);
      }
      prev = x;
    }
  });

  it("splits each distribution, and the fund to date, exactly by tier (F16)", () => {
    for (const p of expected.points) {
      for (const block of [p.distribution, p.to_date]) {
        const lps = [block.lps.capital, block.lps.pref, block.lps.catch_up, block.lps.carry_tier];
        const gp = [block.gp.catch_up, ...block.gp.carry.map((s) => s.amount)];
        expect(near(sum(lps), new D(block.lps.total), lps.length), `LPs at ${p.x}`).toBe(true);
        expect(near(sum(gp), new D(block.gp.total), gp.length), `GP at ${p.x}`).toBe(true);
        const all = sum([block.gp_commitment, block.lps.total, block.gp.total]);
        expect(near(all, new D(block.amount), 3), `all at ${p.x}`).toBe(true);
      }
      expect(p.distribution.amount).toBe(p.x);
    }
  });

  it("owes the carry paid less the entitlement, when positive, when final or at the NAV point (F12, F24)", () => {
    for (const p of expected.points) {
      expect(p.clawback !== undefined, p.x).toBe(expected.final || p.tags.includes("nav"));
      if (!p.clawback) continue;
      expect(p.clawback.carry_paid).toBe(p.to_date.gp.total);
      // F24, FA23: with accounts each settles on its own, and the fund owes their sum, each floored at zero first.
      const each = p.by_account?.map((a) => a.clawback!) ?? [p.clawback];
      for (const c of each) {
        const owed = D.max(0, new D(c.carry_paid).minus(c.entitlement));
        expect(near(owed, new D(c.owed), 2), p.x).toBe(true);
      }
      expect(near(sum(each.map((c) => c.owed)), new D(p.clawback.owed), each.length), p.x).toBe(true);
    }
  });
});

describe.each(RUN.filter((d) => !hasLps(d)))("%s, with no LPs", (dir) => {
  it("gives no per-LP amounts (FC9)", () => {
    const expected = readJson<LpExpected>(dir, "expected.json");
    expect(expected.lps).toBeUndefined();
    for (const p of expected.points) expect(p.by_lp, p.x).toBeUndefined();
  });
});

describe.each(RUN.filter((d) => accountsOf(d).length < 2))("%s, with one account", (dir) => {
  it("gives no accounts, and names no class (FC11)", () => {
    const expected = readJson<LpExpected>(dir, "expected.json");
    expect(expected.accounts).toBeUndefined();
    for (const b of expected.breakpoints) for (const r of b.reasons) expect(r.class, b.x).toBeUndefined();
    for (const p of expected.points) {
      expect(p.by_account, p.x).toBeUndefined();
      for (const s of [...p.distribution.gp.carry, ...p.to_date.gp.carry]) expect(s.class, p.x).toBeUndefined();
    }
  });
});

describe.each(RUN.filter((d) => !lpsOf(d).some((lp) => joinsLater(d, lp))))("%s, with no later close", (dir) => {
  it("gives no equalization (FC11)", () => {
    expect(readJson<LpExpected>(dir, "expected.json").equalization).toBeUndefined();
  });
});

describe.each(LP_RUN)("%s, its LPs", (dir) => {
  const inputs = readJson<Inputs>(dir, "inputs.json");
  const expected = readJson<LpExpected>(dir, "expected.json");
  const lps = expected.lps!;
  const shares = lps.map((lp) => exact(lp.share));
  // F23: each LP's account, by its class; with one account, the whole LPs' side.
  const accounts = accountsOf(dir);
  const accountOf = inputs.fund.lps!.map((lp) => accounts.indexOf(lp.class ?? null));
  const members = accounts.map((_, a) => lps.flatMap((_lp, i) => (accountOf[i] === a ? [i] : [])));
  // Within its account an LP's amounts are the account's times its commitment over the account's (F23).
  const ofAccount = lps.map((lp, i) => {
    const all = members[accountOf[i]!]!.reduce((s, j) => s.plus(exact(lps[j]!.commitment)), new D(0));
    return exact(lp.commitment).div(all);
  });

  it("lists each LP in the input's order, its share F19's: its commitment over all of them (F19, FC11)", () => {
    expect(lps.map((lp) => lp.name)).toEqual(inputs.fund.lps!.map((lp) => lp.name));
    lps.forEach((lp, i) => expect(exact(lp.commitment).eq(exact(inputs.fund.lps![i]!.commitment)), lp.name).toBe(true));
    const all = lps.reduce((s, lp) => s.plus(exact(lp.commitment)), new D(0));
    lps.forEach((lp, i) => expect(shares[i]!.minus(exact(lp.commitment).div(all)).abs().lte(CLOSE), lp.name).toBe(true));
    expect(shares.reduce((s, x) => s.plus(x), new D(0)).minus(1).abs().lte(CLOSE)).toBe(true);
  });

  it("gives each LP its class and later close as the input does (FC11)", () => {
    inputs.fund.lps!.forEach((lp, i) => {
      expect(lps[i]!.class, lp.name).toBe(lp.class ?? undefined);
      expect(lps[i]!.close, lp.name).toBe(joinsLater(dir, lp) ? lp.close : undefined);
    });
  });

  /** F20, F23: each LP's amount is its part of its account's LPs' amount, given to the cent and exact (FC9). */
  function divides(where: string, each: LpAmount[], lpsAmount: string, idx: number[]) {
    const total = idx.reduce((s, i) => s.plus(exact(each[i]!.exact)), new D(0));
    expect(cents(total), `${where}: the LPs' amounts add up to theirs`).toBe(lpsAmount);
    for (const i of idx) {
      const a = each[i]!;
      expect(a.amount, `${where}: ${lps[i]!.name} to the cent`).toBe(cents(exact(a.exact)));
      expect(exact(a.exact).minus(ofAccount[i]!.times(total)).abs().lte(CLOSE), `${where}: ${lps[i]!.name}'s part`).toBe(true);
    }
  }

  it("gives each LP its part of its account's paid-in (F20, F23)", () => {
    accounts.forEach((_, a) =>
      divides("paid in", lps.map((lp) => lp.paid_in), expected.accounts?.[a]!.paid_in ?? expected.lps_paid_in, members[a]!),
    );
  });

  it("gives each LP its part of its account's X, to date and any clawback, at every point (F20, F23, F24)", () => {
    for (const p of expected.points) {
      const rows = p.by_lp!;
      expect(rows.map((r) => r.name), p.x).toEqual(lps.map((lp) => lp.name));
      accounts.forEach((_, a) => {
        const acct = p.by_account?.[a] ?? { distribution: p.distribution, to_date: p.to_date, clawback: p.clawback };
        divides(`${p.x} from X`, rows.map((r) => r.distribution), acct.distribution.lps.total, members[a]!);
        divides(`${p.x} to date`, rows.map((r) => r.to_date), acct.to_date.lps.total, members[a]!);
        // When final, and at the NAV point, each LP's share of its account's clawback owed; zero when nothing is.
        for (const r of rows) expect(r.clawback !== undefined, `${p.x} ${r.name}`).toBe(p.clawback !== undefined);
        if (acct.clawback) divides(`${p.x} clawback`, rows.map((r) => r.clawback!), acct.clawback.owed, members[a]!);
      });
    }
  });

  it.runIf(!classesOrCloses(dir))("is the case it adds LPs to, the LPs aside (F20)", () => {
    const { lps: _, ...fund } = inputs.fund;
    const base = RUN.filter((d) => !hasLps(d)).find((d) => isDeepStrictEqual(readJson<Inputs>(d, "inputs.json").fund, fund));
    expect(base, "a case with the same fund and no LPs").toBeDefined();
    const was = readJson<LpExpected>(base!, "expected.json");
    const { case: _c, lps: _l, points, ...top } = expected;
    const { case: _bc, points: basePoints, ...baseTop } = was;
    expect(top).toEqual(baseTop);
    const at = new Map(basePoints.map((p) => [p.x, p]));
    let shared = 0;
    for (const { by_lp: _b, ...p } of points) {
      if (!at.has(p.x)) continue;
      expect(p, p.x).toEqual(at.get(p.x));
      shared++;
    }
    expect(shared).toBe(basePoints.length);
  });
});

describe.each(REFUSED)("%s", (dir) => {
  const expected = readJson<{ case: string; fixtures: Record<string, { refused: { kind: string; term: string; field: string } }> }>(dir, "expected.json");
  const files = readdirSync(join(CASES, dir, "fixtures")).sort();

  it("has a refusal for every fixture, and a DERIVATION.md", () => {
    expect(expected.case).toBe(dir);
    expect(Object.keys(expected.fixtures).sort()).toEqual(files);
    expect(existsSync(join(CASES, dir, "DERIVATION.md"))).toBe(true);
  });

  it.each(files)("%s changes a fund case and is refused with a kind, a term and a field (F18)", (file) => {
    const fixture = readJson<{ base: string; about: string; change: object }>(dir, "fixtures", file);
    expect(RUN).toContain(fixture.base);
    expect(fixture.about.length).toBeGreaterThan(10);
    const { kind, term, field } = expected.fixtures[file]!.refused;
    expect(["unsupported", "input"]).toContain(kind);
    if (kind === "input") expect(TERMS).toContain(term);
    expect(field.length).toBeGreaterThan(0);
  });
});

describe.each(RUN.filter((d) => accountsOf(d).length > 1))("%s, its accounts", (dir) => {
  const inputs = readJson<Inputs>(dir, "inputs.json").fund;
  const expected = readJson<LpExpected>(dir, "expected.json");
  const accounts = accountsOf(dir);
  const lps = inputs.lps!;
  const classOf = (lp: InputLp) => lp.class ?? null;
  const name = (c: string | null) => c ?? "Fund terms";

  it("lists each account, the fund's terms first, its shares of the distributions and the fee calls (F22, F23)", () => {
    expect(expected.accounts!.map((a) => a.class)).toEqual(accounts);
    const all = lps.reduce((s, lp) => s.plus(exact(lp.commitment)), new D(0));
    // F22: an LP's fee weight is its commitment times its class's fee rate over the fund's, or its commitment.
    const feeRate = (lp: InputLp) => (inputs.terms.lp_classes ?? []).find((c) => c.name === lp.class)?.fee_rate;
    const weight = (lp: InputLp) => {
      const r = feeRate(lp);
      return r == null ? exact(lp.commitment) : exact(lp.commitment).times(exact(r)).div(exact(inputs.terms.fee_rate!));
    };
    const allFees = lps.reduce((s, lp) => s.plus(weight(lp)), new D(0));
    expected.accounts!.forEach((a, i) => {
      const own = lps.filter((lp) => classOf(lp) === accounts[i]);
      const commitment = own.reduce((s, lp) => s.plus(exact(lp.commitment)), new D(0));
      expect(exact(a.commitment).eq(commitment), name(a.class)).toBe(true);
      expect(exact(a.share).minus(commitment.div(all)).abs().lte(CLOSE), name(a.class)).toBe(true);
      const fees = own.reduce((s, lp) => s.plus(weight(lp)), new D(0));
      expect(exact(a.fee_share).minus(fees.div(allFees)).abs().lte(CLOSE), name(a.class)).toBe(true);
    });
    const accts = expected.accounts!;
    expect(near(sum(accts.map((a) => a.paid_in)), new D(expected.lps_paid_in), accts.length)).toBe(true);
    if (expected.pref_accrued_to_d) expect(near(sum(accts.map((a) => a.pref_accrued_to_d)), new D(expected.pref_accrued_to_d), accts.length)).toBe(true);
  });

  it("names each reason's account, the fund's terms first (F27, FC11)", () => {
    for (const b of expected.breakpoints) {
      const order = b.reasons.map((r) => accounts.indexOf(r.class!));
      expect(order, b.x).toEqual([...order].sort((x, y) => x - y));
      for (const r of b.reasons) {
        expect(accounts, b.x).toContain(r.class);
        expect(r.text.startsWith(`${name(r.class!)}: `), r.text).toBe(true);
      }
    }
  });

  it("gives the fund's amounts as the accounts' sums, its carry by step each account's (F23, F26)", () => {
    for (const p of expected.points) {
      const by = p.by_account!;
      expect(by.map((a) => a.class), p.x).toEqual(accounts);
      for (const which of ["distribution", "to_date"] as const) {
        const fund = p[which];
        const parts = by.map((a) => a[which]);
        for (const k of ["capital", "pref", "catch_up", "carry_tier", "total"] as const) {
          if (fund.lps[k] === undefined) continue;
          expect(near(sum(parts.map((b) => b.lps[k])), new D(fund.lps[k]!), parts.length), `${p.x} ${which} ${k}`).toBe(true);
        }
        expect(near(sum(parts.map((b) => b.gp.total)), new D(fund.gp.total), parts.length), `${p.x} ${which} GP`).toBe(true);
        const all = sum([...parts.map((b) => b.amount), fund.gp_commitment]);
        expect(near(all, new D(fund.amount), parts.length + 1), `${p.x} ${which} amount`).toBe(true);
        // F26: each account's steps, in account order, each naming its class.
        const steps = parts.flatMap((b, i) => b.gp.carry.map((s) => ({ class: accounts[i], ...s })));
        expect(fund.gp.carry, `${p.x} ${which}`).toEqual(steps);
      }
      if (p.clawback) {
        expect(near(sum(by.map((a) => a.clawback!.carry_paid)), new D(p.clawback.carry_paid), by.length), p.x).toBe(true);
        expect(near(sum(by.map((a) => a.clawback!.entitlement)), new D(p.clawback.entitlement), by.length), p.x).toBe(true);
      }
    }
  });
});

describe.each(RUN.filter((d) => lpsOf(d).some((lp) => joinsLater(d, lp))))("%s, its equalization", (dir) => {
  const inputs = readJson<Inputs>(dir, "inputs.json").fund;
  const lps = inputs.lps!;
  const eq = readJson<LpExpected>(dir, "expected.json").equalization!;
  const amount = (m: Moves, k: keyof Omit<Moves, "name">) => exact(m[k].exact);
  const KEYS = ["capital_paid", "capital_returned", "interest_paid", "interest_received"] as const;

  it("has each later close in date order, the LPs joining at it, and every LP in by then (F25, FA21)", () => {
    expect(eq.rate).toBe(inputs.terms.equalization_rate);
    const dates = [...new Set(lps.filter((lp) => joinsLater(dir, lp)).map((lp) => lp.close!))].sort();
    expect(eq.closes.map((c) => c.date)).toEqual(dates);
    for (const c of eq.closes) {
      expect(c.joining, c.date).toEqual(lps.filter((lp) => lp.close === c.date).map((lp) => lp.name));
      expect(c.lps.map((m) => m.name), c.date).toEqual(lps.filter((lp) => lp.close == null || lp.close <= c.date).map((lp) => lp.name));
    }
  });

  it("balances at every close: the joiners pay in what the LPs already in get back, and the interest too (F25, FA30)", () => {
    for (const c of eq.closes) {
      for (const [paid, back] of [["capital_paid", "capital_returned"], ["interest_paid", "interest_received"]] as const) {
        const a = c.lps.reduce((s, m) => s.plus(amount(m, paid)), new D(0));
        const b = c.lps.reduce((s, m) => s.plus(amount(m, back)), new D(0));
        expect(a.minus(b).abs().lte(CLOSE), `${c.date} ${paid}`).toBe(true);
      }
      for (const m of c.lps) {
        const joining = c.joining.includes(m.name);
        expect(amount(m, joining ? "capital_returned" : "capital_paid").isZero(), `${c.date} ${m.name}`).toBe(true);
        expect(amount(m, joining ? "interest_received" : "interest_paid").isZero(), `${c.date} ${m.name}`).toBe(true);
        for (const k of KEYS) expect(m[k].amount, `${c.date} ${m.name} ${k}`).toBe(cents(amount(m, k)));
      }
    }
  });

  it("gives each LP its equalization over all the closes (F26)", () => {
    expect(eq.lps.map((m) => m.name)).toEqual(lps.map((lp) => lp.name));
    for (const m of eq.lps) {
      for (const k of KEYS) {
        const total = eq.closes.reduce((s, c) => s.plus(c.lps.find((x) => x.name === m.name)?.[k].exact ? exact(c.lps.find((x) => x.name === m.name)![k].exact) : 0), new D(0));
        expect(amount(m, k).minus(total).abs().lte(CLOSE), `${m.name} ${k}`).toBe(true);
        expect(m[k].amount, `${m.name} ${k}`).toBe(cents(amount(m, k)));
      }
    }
  });
});
