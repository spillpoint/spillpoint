// M6: reading an Open Cap Format package (ASSUMPTIONS O1–O12). Each OCF case's import must equal its hand-worked
// expected.json (C16), each refusal fixture must be refused by name, and a package that writes a locked case must pay
// as that case does: within the cent its payouts are recorded to, with the same decisions and breakpoints.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { D, OcfRefusal, findBreakpoints, prepare, readCapTable, readInputs, readOcf, solve } from "../src/index.ts";
import type { Breakpoint, Decisions, OcfFile, OcfImport } from "../src/index.ts";
import { CASES_DIR, decisionsFrom, expectedPoints, readCaseFile } from "./support/cases.ts";
import { OCF_FIXTURE_CASES, OCF_PACKAGE_CASES, fixtureNames, packageFiles, withFixture } from "./support/ocf.ts";

const CENT = new D("0.01");
type Json = Record<string, unknown>;

interface PackageExpected {
  result: OcfImport;
  locked_case?: string;
  renamed?: Record<string, string>;
}
interface Adds {
  read?: Record<string, number>;
  not_needed?: Record<string, number>;
  notes?: OcfImport["report"]["notes"];
  unconverted_safes?: Json[];
  unconverted_notes?: Json[];
  to_fill?: OcfImport["to_fill"];
}
interface FixtureExpected {
  base: string;
  fixtures: Record<string, { refused?: { kind: string; term: string; subject: string }; adds?: Adds }>;
}
const expectedOf = <T>(name: string): T => JSON.parse(readFileSync(join(CASES_DIR, name, "expected.json"), "utf8")) as T;

/** C16: notes are compared as a set, in no order. */
const asSet = (r: OcfImport) => ({ ...r, report: { ...r.report, notes: r.report.notes.map((n) => JSON.stringify(n)).sort() } });

function refusalOf(files: OcfFile[]): { kind: string; term: string; subject: string } | null {
  try {
    readOcf(files);
    return null;
  } catch (e) {
    if (!(e instanceof OcfRefusal)) throw e;
    return { kind: e.kind, term: e.term, subject: e.subject };
  }
}

describe.each(OCF_PACKAGE_CASES)("OCF case %s", (name) => {
  const expected = expectedOf<PackageExpected>(name);

  it("imports to its hand-worked result", () => {
    expect(asSet(readOcf(packageFiles(name)))).toEqual(asSet(expected.result));
  });

  if (expected.locked_case) payLikeLockedCase(name, expected);
});

describe.each(OCF_FIXTURE_CASES)("OCF fixtures %s", (name) => {
  const expected = expectedOf<FixtureExpected>(name);
  const base = expectedOf<PackageExpected>(expected.base).result;
  it.each(fixtureNames(name))("%s", (fixture) => {
    const { refused, adds } = expected.fixtures[fixture]!;
    if (refused) {
      expect(refusalOf(withFixture(name, fixture))).toEqual(refused);
      return;
    }
    // C16: what a fixture adds to its base's result. SAFEs and notes come after the base's, in date order; the terms
    // to fill in, like the notes, are compared as a set.
    const sum = (a: Record<string, number>, b: Record<string, number> = {}) =>
      Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, (a[k] ?? 0) + (b[k] ?? 0)]));
    const ct = base.cap_table as Json & { unconverted_safes?: Json[]; unconverted_notes?: Json[] };
    const safes = [...(ct.unconverted_safes ?? []), ...(adds!.unconverted_safes ?? [])];
    const notes = [...(ct.unconverted_notes ?? []), ...(adds!.unconverted_notes ?? [])];
    const want: OcfImport = {
      ...base,
      cap_table: { ...ct, ...(safes.length ? { unconverted_safes: safes } : {}), ...(notes.length ? { unconverted_notes: notes } : {}) },
      to_fill: [...base.to_fill, ...(adds!.to_fill ?? [])],
      report: { read: sum(base.report.read, adds!.read), not_needed: sum(base.report.not_needed, adds!.not_needed), notes: [...base.report.notes, ...(adds!.notes ?? [])] },
    };
    const toFillAsSet = (r: OcfImport) => ({ ...asSet(r), to_fill: r.to_fill.map((f) => JSON.stringify(f)).sort() });
    expect(toFillAsSet(readOcf(withFixture(name, fixture)))).toEqual(toFillAsSet(want));
  });
});

/**
 * A package that writes a locked case pays as that case does (C16): at its listed exit values and its breakpoints,
 * every payout within a cent, the same answers and decisions, and the same breakpoints. Blanks the import leaves are
 * filled in from the locked table, as you would on the page. At a breakpoint, where both choices pay the same, decisions
 * are compared at the import's own breakpoint, since rounded prices can move it a fraction of a cent (04b2).
 */
function payLikeLockedCase(name: string, expected: PackageExpected): void {
  const locked = expected.locked_case!;
  const renamed = expected.renamed ?? {};
  const rename = (id: string) => renamed[id] ?? id;
  const lockedExit = readInputs(readCaseFile(locked, "inputs.json"));
  const lockedSecurities = new Map(lockedExit.capTable.securities.map((s) => [rename(s.id), s as unknown as Json]));

  const table = structuredClone(expected.result.cap_table) as Json & { securities: Json[] };
  for (const f of expected.result.to_fill) {
    const s = table.securities.find((x) => x.id === f.security)!;
    s[f.field] = lockedSecurities.get(s.id as string)![f.field];
  }
  const pc = prepare(readCapTable(table), lockedExit.exitDate);
  const points = expectedPoints(locked);
  const found = findBreakpoints(pc, lockedExit.range);
  const lockedBreakpoints = points.filter((p) => p.tags.includes("breakpoint"));
  const describeDecisions = (d: Decisions) => ({ converted: [...d.converted].sort(), exercised: [...d.exercised].sort() });
  const renamedDecisions = (d: Decisions) => ({ converted: new Set([...d.converted].map(rename)), exercised: new Set([...d.exercised].map(rename)) });

  it(`pays as ${locked} does, within a cent, at every exit value and breakpoint`, () => {
    for (const point of points) {
      const answers = solve(pc, point.exitValue).answers;
      expect(answers, point.label).toHaveLength(point.equilibria.length);
      answers.forEach((answer, i) => {
        const lines = new Map(answer.payout.lines.map((l) => [`${l.holder} ${l.security}`, l.amount]));
        for (const want of point.equilibria[i]!.lines) {
          const got = lines.get(`${want.holder} ${rename(want.security)}`);
          expect(got?.minus(want.amount).abs().lte(CENT), `${point.label}: ${want.holder} ${want.security}`).toBe(true);
        }
      });
    }
  });

  it(`decides as ${locked} does: at each listed exit value, and at each breakpoint its own`, () => {
    expect(found).toHaveLength(lockedBreakpoints.length);
    let b = 0;
    for (const point of points) {
      const at = point.tags.includes("breakpoint") ? found[b++]!.exitValue : point.exitValue;
      const answers = solve(pc, at).answers;
      expect(answers.map((a) => describeDecisions(a.decisions)), point.label).toEqual(
        point.equilibria.map((e) => describeDecisions(renamedDecisions(decisionsFrom(e.decisions)))),
      );
    }
  });

  it(`finds ${locked}'s breakpoints, each within a cent, with the same reasons and jumps`, () => {
    const lockedList = (readCaseFile(locked, "expected.json") as { exit: { breakpoints: { exact: string; reasons: { code: string; security?: string; securities?: string[] }[]; payouts_jump?: boolean }[] } }).exit.breakpoints;
    const reasons = (b: Breakpoint) => b.reasons.map((r) => `${r.code}: ${[...r.subject].sort().join("+")}`).sort();
    found.forEach((b, i) => {
      const want = lockedList[i]!;
      expect(b.exitValue.minus(lockedBreakpoints[i]!.exitValue).abs().lte(CENT), `${b.exitValue.toFixed(4)}`).toBe(true);
      expect(reasons(b)).toEqual(
        want.reasons.map((r) => `${r.code}: ${(r.securities ?? (r.security ? r.security.split("+") : [])).map(rename).sort().join("+")}`).sort(),
      );
      expect(b.jumps).toBe(want.payouts_jump ?? false);
    });
  });
}

// ---------- rules no case reaches, on small packages ----------

describe("rules the OCF cases don't reach", () => {
  const usd = (amount: string) => ({ amount, currency: "USD" });
  const ratio = (price: string, numerator = "1", denominator = "1") => [
    { type: "STOCK_CLASS_CONVERSION_RIGHT", converts_to_stock_class_id: "common", conversion_mechanism: { type: "RATIO_CONVERSION", conversion_price: usd(price), ratio: { numerator, denominator }, rounding_type: "NORMAL" } },
  ];
  const common = { object_type: "STOCK_CLASS", id: "common", name: "Common Stock", class_type: "COMMON", seniority: "1" };
  const seed = (overrides: Json = {}) => ({
    object_type: "STOCK_CLASS", id: "seed", name: "Seed Preferred", class_type: "PREFERRED", seniority: "2", price_per_share: usd("1.00"),
    liquidation_preference_multiple: "1", participation_cap_multiple: "1", conversion_rights: ratio("1.00"), ...overrides,
  });
  const issue = (id: string, date: string, holder: string, cls: string, quantity: string, price = "0.0001") => ({
    object_type: "TX_STOCK_ISSUANCE", id: `tx-${id}`, date, security_id: id, stakeholder_id: holder, stock_class_id: cls, share_price: usd(price), quantity,
  });
  /** A package as of Dec 31, 2025 with holders A and B and the given classes, transactions and plans. */
  const pkg = (classes: Json[], transactions: Json[], manifest: Json = {}, plans: Json[] = []): OcfFile[] => [
    {
      name: "Manifest.ocf.json",
      content: {
        file_type: "OCF_MANIFEST_FILE", ocf_version: "1.2.0", as_of: "2025-12-31", issuer: { object_type: "ISSUER", id: "issuer", legal_name: "Test Co" },
        stakeholders_files: [{ filepath: "Stakeholders.ocf.json" }], stock_classes_files: [{ filepath: "StockClasses.ocf.json" }],
        transactions_files: [{ filepath: "Transactions.ocf.json" }], ...(plans.length ? { stock_plans_files: [{ filepath: "StockPlans.ocf.json" }] } : {}), ...manifest,
      },
    },
    {
      name: "Stakeholders.ocf.json",
      content: { file_type: "OCF_STAKEHOLDERS_FILE", items: ["a", "b"].map((id) => ({ object_type: "STAKEHOLDER", id, name: { legal_name: `Holder ${id.toUpperCase()}` }, stakeholder_type: "INDIVIDUAL" })) },
    },
    { name: "StockClasses.ocf.json", content: { file_type: "OCF_STOCK_CLASSES_FILE", items: classes } },
    { name: "Transactions.ocf.json", content: { file_type: "OCF_TRANSACTIONS_FILE", items: transactions } },
    ...(plans.length ? [{ name: "StockPlans.ocf.json", content: { file_type: "OCF_STOCK_PLANS_FILE", items: plans } }] : []),
  ];
  const positions = (files: OcfFile[]) => (readOcf(files).cap_table as { positions: unknown[] }).positions;
  const notesOf = (files: OcfFile[]) => readOcf(files).report.notes;

  it("splits only what was outstanding before the split's date (O5)", () => {
    const split = { object_type: "TX_STOCK_CLASS_SPLIT", id: "tx-split", date: "2021-06-01", stock_class_id: "common", split_ratio: { numerator: "2", denominator: "1" } };
    expect(positions(pkg([common], [issue("a1", "2021-01-01", "a", "common", "1000"), split, issue("b1", "2021-06-01", "b", "common", "500")]))).toEqual([
      { holder: "a", security: "common", shares: 2000 },
      { holder: "b", security: "common", shares: 500 },
    ]);
  });

  it("refuses a split that leaves a fraction of a share", () => {
    const split = { object_type: "TX_STOCK_CLASS_SPLIT", id: "tx-split", date: "2021-06-01", stock_class_id: "common", split_ratio: { numerator: "3", denominator: "2" } };
    expect(refusalOf(pkg([common], [issue("a1", "2021-01-01", "a", "common", "1001"), split]))).toEqual({ kind: "unsupported", term: "fractional_shares", subject: "tx-split" });
  });

  it("leaves the rest with the original after a transfer without a balance security (O5)", () => {
    const transfer = { object_type: "TX_STOCK_TRANSFER", id: "tx-t", date: "2022-01-01", security_id: "a1", quantity: "300", resulting_security_ids: ["b1"] };
    expect(positions(pkg([common], [issue("a1", "2021-01-01", "a", "common", "1000"), transfer, issue("b1", "2022-01-01", "b", "common", "300")]))).toEqual([
      { holder: "a", security: "common", shares: 700 },
      { holder: "b", security: "common", shares: 300 },
    ]);
  });

  it("refuses a balance security that moves to another holder", () => {
    const transfer = { object_type: "TX_STOCK_TRANSFER", id: "tx-t", date: "2022-01-01", security_id: "a1", quantity: "300", resulting_security_ids: ["b1"], balance_security_id: "x2" };
    const files = pkg([common], [issue("a1", "2021-01-01", "a", "common", "1000"), transfer, issue("b1", "2022-01-01", "b", "common", "300"), issue("x2", "2022-01-01", "b", "common", "700")]);
    expect(refusalOf(files)).toEqual({ kind: "malformed", term: "quantities_dont_reconcile", subject: "tx-t" });
  });

  it("closes a security cancelled in full, so naming it again is refused (O5)", () => {
    const cancel = { object_type: "TX_STOCK_CANCELLATION", id: "tx-c", date: "2022-01-01", security_id: "a1", quantity: "1000" };
    expect(positions(pkg([common], [issue("a1", "2021-01-01", "a", "common", "1000"), issue("a2", "2021-01-01", "a", "common", "10"), cancel]))).toEqual([
      { holder: "a", security: "common", shares: 10 },
    ]);
    const again = { object_type: "TX_STOCK_CANCELLATION", id: "tx-c2", date: "2023-01-01", security_id: "a1", quantity: "1" };
    expect(refusalOf(pkg([common], [issue("a1", "2021-01-01", "a", "common", "1000"), cancel, again]))).toEqual({ kind: "malformed", term: "closed_security", subject: "tx-c2" });
  });

  it("leaves out a stakeholder whose only security was retracted, and lists them (O3)", () => {
    const retract = { object_type: "TX_STOCK_RETRACTION", id: "tx-r", date: "2021-02-01", security_id: "b1" };
    const files = pkg([common], [issue("a1", "2021-01-01", "a", "common", "1000"), issue("b1", "2021-01-01", "b", "common", "500"), retract]);
    expect(positions(files)).toEqual([{ holder: "a", security: "common", shares: 1000 }]);
    expect(notesOf(files)).toContainEqual({ code: "left_out_stakeholder", subject: "b" });
  });

  it("refuses a consolidation whose result doesn't equal its sources", () => {
    const consolidate = { object_type: "TX_STOCK_CONSOLIDATION", id: "tx-k", date: "2022-01-01", security_ids: ["a1", "a2"], resulting_security_id: "a3" };
    const files = pkg([common], [issue("a1", "2021-01-01", "a", "common", "100"), issue("a2", "2021-01-01", "a", "common", "200"), consolidate, issue("a3", "2022-01-01", "a", "common", "301")]);
    expect(refusalOf(files)).toEqual({ kind: "malformed", term: "quantities_dont_reconcile", subject: "tx-k" });
  });

  it("allows a ratio its own written rounding, but not a price written to fewer than 10 places (O4)", () => {
    const at = (price: string, conversion: string, numerator: string) => pkg([common, seed({ price_per_share: usd(price), conversion_rights: ratio(conversion, numerator) })], [issue("s1", "2022-01-01", "a", "seed", "100", price)]);
    // $1.00 converting at $0.75 is a ratio of 1.3333…; written 1.3333 it could be 1.33325 to 1.33335.
    expect(notesOf(at("1.00", "0.75", "1.3333"))).toContainEqual({ code: "conversion_ratio_rounded", subject: "seed" });
    expect(refusalOf(at("1.00", "0.75", "1.4"))).toEqual({ kind: "malformed", term: "conversion_ratio_mismatch", subject: "seed" });
    // Exact as written: no line.
    expect(notesOf(at("1.00", "0.80", "1.25"))).not.toContainEqual({ code: "conversion_ratio_rounded", subject: "seed" });
    // A price to fewer than 10 places is exact, so 1.0001 can't stand for 1.
    expect(refusalOf(at("1.0001", "1.0000", "1"))).toEqual({ kind: "malformed", term: "conversion_ratio_mismatch", subject: "seed" });
    // To all 10 places, a price may be off by half a unit in the tenth.
    expect(notesOf(at("1.0000000001", "1.0000000000", "1"))).toContainEqual({ code: "conversion_ratio_rounded", subject: "seed" });
  });

  it("leaves out a preferred class with nothing outstanding, and lists it (O4)", () => {
    const files = pkg([common, seed()], [issue("a1", "2021-01-01", "a", "common", "1000")]);
    expect((readOcf(files).cap_table as { securities: { id: string }[] }).securities.map((s) => s.id)).toEqual(["common"]);
    expect(notesOf(files)).toContainEqual({ code: "left_out_stock_class", subject: "seed" });
  });

  it("keeps a cap whose preference multiple is blank, and leaves participation blank (O4)", () => {
    const files = pkg([common, seed({ liquidation_preference_multiple: undefined, participation_cap_multiple: "2" })], [issue("s1", "2022-01-01", "a", "seed", "100", "1.00")]);
    const result = readOcf(files);
    expect((result.cap_table as { securities: Json[] }).securities[1]).toMatchObject({ preference_multiple: null, participation: null, cap_multiple: "2" });
    expect(result.to_fill).toEqual([{ security: "seed", field: "preference_multiple" }, { security: "seed", field: "participation" }]);
  });

  it("refuses a common class with a conversion right", () => {
    expect(refusalOf(pkg([{ ...common, conversion_rights: ratio("1.00") }], []))).toEqual({ kind: "unsupported", term: "common_conversion_right", subject: "common" });
  });

  it("reads OCF 1.0 to 1.2 and nothing later; needs one manifest; notes a file it doesn't list (O2)", () => {
    expect(refusalOf(pkg([common], [], { ocf_version: "1.0.0" }))).toBeNull();
    expect(refusalOf(pkg([common], [], { ocf_version: "1.3.0" }))).toEqual({ kind: "unsupported", term: "ocf_version", subject: "1.3.0" });
    expect(refusalOf(pkg([common], [], { ocf_version: "1.2.1-alpha+main" }))).toBeNull();
    expect(refusalOf(pkg([common], []).slice(1))).toEqual({ kind: "malformed", term: "no_manifest", subject: "" });
    const extra: OcfFile = { name: "More.ocf.json", content: { file_type: "OCF_VALUATIONS_FILE", items: [] } };
    expect(notesOf([...pkg([common], []), extra])).toContainEqual({ code: "not_in_manifest", subject: "More.ocf.json" });
    expect(refusalOf([...pkg([common], []), { name: "x.json", content: { items: [] } }])).toEqual({ kind: "malformed", term: "not_an_ocf_file", subject: "x.json" });
  });

  it("notes a field OCF doesn't have on a type it reads", () => {
    expect(notesOf(pkg([{ ...common, voting_trust: true }], []))).toContainEqual({ code: "unrecognized_field", subject: "common", field: "voting_trust" });
  });

  it("refuses an issuance of a fraction of a share", () => {
    expect(refusalOf(pkg([common], [issue("a1", "2021-01-01", "a", "common", "100.5")]))).toEqual({ kind: "unsupported", term: "fractional_shares", subject: "tx-a1" });
  });
  const plan = (behavior: string | undefined, reserved = "1000") => ({
    object_type: "STOCK_PLAN", id: "plan", plan_name: "Plan", initial_shares_reserved: reserved, stock_class_ids: ["common"],
    ...(behavior ? { default_cancellation_behavior: behavior } : {}),
  });
  const grant = (id: string, date: string, quantity: string, extra: Json = {}) => ({
    object_type: "TX_EQUITY_COMPENSATION_ISSUANCE", id: `tx-${id}`, date, security_id: id, stakeholder_id: "a", stock_plan_id: "plan",
    compensation_type: "OPTION", quantity, exercise_price: usd("0.10"), ...extra,
  });
  const cancelGrant = (id: string, quantity: string) => ({ object_type: "TX_EQUITY_COMPENSATION_CANCELLATION", id: `tx-c-${id}`, date: "2023-01-01", security_id: id, quantity });
  const poolOf = (files: OcfFile[]) => (readOcf(files).cap_table as { unissued_pool: number }).unissued_pool;

  it("keeps a cancelled grant out of the pool under a plan that retires them, and returns it under one that doesn't (O6)", () => {
    const txs = [grant("o1", "2022-01-01", "300"), cancelGrant("o1", "100")];
    expect(poolOf(pkg([common], txs, {}, [plan("RETURN_TO_POOL")]))).toBe(800);
    expect(poolOf(pkg([common], txs, {}, [plan("RETIRE")]))).toBe(700);
  });

  it("counts a grant past its expiration date as cancelled, and lists it (O6)", () => {
    const files = pkg([common], [grant("o1", "2022-01-01", "300", { expiration_date: "2025-06-30" })], {}, [plan("RETIRE")]);
    expect(poolOf(files)).toBe(700);
    expect(notesOf(files)).toContainEqual({ code: "expired_option_left_out", subject: "o1" });
  });

  it("refuses to guess whether a cancelled grant returns when the plan doesn't say", () => {
    expect(refusalOf(pkg([common], [grant("o1", "2022-01-01", "300"), cancelGrant("o1", "100")], {}, [plan(undefined)]))).toEqual({
      kind: "unsupported", term: "cancellation_behavior_missing", subject: "plan",
    });
  });

  it("refuses a grant over a preferred class", () => {
    expect(refusalOf(pkg([common, seed()], [grant("o1", "2022-01-01", "300", { stock_class_id: "seed" })], {}, [plan("RETURN_TO_POOL")]))).toEqual({
      kind: "unsupported", term: "grant_of_preferred", subject: "tx-o1",
    });
  });

  it("refuses a split of common while an option is outstanding (O5)", () => {
    const split = { object_type: "TX_STOCK_CLASS_SPLIT", id: "tx-split", date: "2023-01-01", stock_class_id: "common", split_ratio: { numerator: "2", denominator: "1" } };
    expect(refusalOf(pkg([common], [issue("a1", "2021-01-01", "a", "common", "1000"), grant("o1", "2022-01-01", "300"), split], {}, [plan("RETURN_TO_POOL")]))).toEqual({
      kind: "unsupported", term: "split_with_derivatives", subject: "tx-split",
    });
  });

  const warrant = (id: string, cls: string, quantity: string, extra: Json = {}) => ({
    object_type: "TX_WARRANT_ISSUANCE", id: `tx-${id}`, date: "2022-01-01", security_id: id, stakeholder_id: "b", quantity, exercise_price: usd("1.00"),
    exercise_triggers: [{ type: "ELECTIVE_AT_WILL", trigger_id: `${id}-x`, conversion_right: { type: "WARRANT_CONVERSION_RIGHT", converts_to_stock_class_id: cls, conversion_mechanism: { type: "FIXED_AMOUNT_CONVERSION", converts_to_quantity: quantity } } }],
    ...extra,
  });

  it("keeps a preferred class with no shares when a warrant for it is outstanding (Jordan, 04d review)", () => {
    const result = readOcf(pkg([common, seed()], [issue("a1", "2021-01-01", "a", "common", "1000"), warrant("w1", "seed", "500")]));
    expect((result.cap_table as { securities: Json[] }).securities.map((s) => s.id)).toEqual(["common", "seed", "warrants_seed_1"]);
    expect((result.cap_table as { seniority: string[][] }).seniority).toEqual([["seed"]]);
  });

  it("leaves out a warrant past its expiration date, and its class with it, and lists both (O7)", () => {
    const files = pkg([common, seed()], [issue("a1", "2021-01-01", "a", "common", "1000"), warrant("w1", "seed", "500", { warrant_expiration_date: "2024-01-01" })]);
    expect((readOcf(files).cap_table as { securities: Json[] }).securities.map((s) => s.id)).toEqual(["common"]);
    expect(notesOf(files)).toEqual(expect.arrayContaining([{ code: "expired_warrant_left_out", subject: "w1" }, { code: "left_out_stock_class", subject: "seed" }]));
  });

  const safe = (id: string, mechanism: Json) => ({
    object_type: "TX_CONVERTIBLE_ISSUANCE", id: `tx-${id}`, date: "2022-01-01", security_id: id, stakeholder_id: "b", convertible_type: "SAFE",
    investment_amount: usd("100000"), seniority: 1,
    conversion_triggers: [{ type: "AUTOMATIC_ON_CONDITION", trigger_id: "t", conversion_right: { type: "CONVERTIBLE_CONVERSION_RIGHT", conversion_mechanism: { type: "SAFE_CONVERSION", ...mechanism } } }],
  });

  it("reads a convertible's terms only if it's still outstanding (O8)", () => {
    const converted = { object_type: "TX_CONVERTIBLE_CONVERSION", id: "tx-conv", date: "2023-01-01", security_id: "s1", trigger_id: "t", resulting_security_ids: [] };
    const base = [issue("a1", "2021-01-01", "a", "common", "1000"), safe("s1", { exit_multiple: "2" })];
    expect(refusalOf(pkg([common], base))).toEqual({ kind: "unsupported", term: "safe_exit_multiple", subject: "tx-s1" });
    expect(refusalOf(pkg([common], [...base, converted]))).toBeNull();
  });

  it("refuses two files of one name in different folders", () => {
    const files = pkg([common], []);
    expect(refusalOf([...files, { name: "copy/Transactions.ocf.json", content: files[3]!.content }])).toEqual({
      kind: "malformed", term: "ambiguous_file", subject: "Transactions.ocf.json",
    });
  });
  it("reads a conversion right that doesn't give its type, as OCF's own samples write one", () => {
    const right = ratio("1.00")[0]!;
    const { type: _type, ...untyped } = right;
    expect(refusalOf(pkg([common, seed({ conversion_rights: [untyped] })], [issue("s1", "2022-01-01", "a", "seed", "100", "1.00")]))).toBeNull();
    expect(refusalOf(pkg([common, seed({ conversion_rights: [{ ...right, type: "CONVERTIBLE_CONVERSION_RIGHT" }] })], []))).toEqual({
      kind: "unsupported", term: "class_conversion_mechanism", subject: "seed",
    });
  });
  it("refuses differing seniority only among convertibles still outstanding (Jordan, 04e review)", () => {
    const converted = { object_type: "TX_CONVERTIBLE_CONVERSION", id: "tx-conv", date: "2023-01-01", security_id: "s1", trigger_id: "t", resulting_security_ids: [] };
    const outstanding = { ...safe("s2", { exit_multiple: "1" }), date: "2024-01-01" };
    const files = pkg([common], [issue("a1", "2021-01-01", "a", "common", "1000"), { ...safe("s1", { exit_multiple: "1" }), seniority: 2 }, converted, outstanding]);
    expect(notesOf(files)).toContainEqual({ code: "convertible_seniority_ignored" });
    const third = { ...safe("s3", { exit_multiple: "1" }), date: "2024-02-01", seniority: 2 };
    expect(refusalOf(pkg([common], [issue("a1", "2021-01-01", "a", "common", "1000"), outstanding, third]))).toEqual({
      kind: "unsupported", term: "convertible_seniority", subject: "tx-s3",
    });
  });

  it("checks a warrant's mechanism only if it's still outstanding (Jordan, 04e review)", () => {
    const valuation = (id: string, extra: Json = {}) => ({
      ...warrant(id, "common", "500"),
      exercise_triggers: [{ type: "ELECTIVE_AT_WILL", trigger_id: `${id}-x`, conversion_right: { type: "WARRANT_CONVERSION_RIGHT", converts_to_stock_class_id: "common", conversion_mechanism: { type: "VALUATION_BASED_CONVERSION" } } }],
      ...extra,
    });
    const exercise = { object_type: "TX_WARRANT_EXERCISE", id: "tx-x", date: "2023-01-01", security_id: "w1", trigger_id: "w1-x", resulting_security_ids: [] };
    const stock = [issue("a1", "2021-01-01", "a", "common", "1000")];
    expect(refusalOf(pkg([common], [...stock, valuation("w1"), exercise]))).toBeNull();
    expect(refusalOf(pkg([common], [...stock, valuation("w1")]))).toEqual({ kind: "unsupported", term: "warrant_mechanism", subject: "tx-w1" });
    // With no quantity, only a balance security can show what's left after part of it is cancelled.
    const cancel = { object_type: "TX_WARRANT_CANCELLATION", id: "tx-c", date: "2023-01-01", security_id: "w1", quantity: "100" };
    expect(refusalOf(pkg([common], [...stock, valuation("w1", { quantity: undefined }), cancel]))).toEqual({ kind: "unsupported", term: "warrant_mechanism", subject: "tx-w1" });
  });
});
