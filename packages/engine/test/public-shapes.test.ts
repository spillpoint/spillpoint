// What the API hands back has exactly the fields its public type lists, and no others (the naming review; Jordan,
// 07c): console.log and JSON.stringify show no workings for code to come to depend on before 1.0. Each list below is
// checked against its type both ways when the tests compile, and each object the API returns against its list when
// they run: every input every case reads, every prepared table, solution and payout at every exit value a case lists,
// every breakpoint and payment take, every table a company's events build with what each event worked out, and
// every import.

import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { D, buildCapTables, findBreakpoints, paySchedule, prepare, readOcf, readOcx, solve } from "../src/index.ts";
import type {
  AntiDilutionAdjustment, AntiDilutionPiece, Answer, Breakpoint, CapTable, CapTableAfterEvent, CapTableImport, CarveOut, CarveOutHere, CommonStock,
  ConversionGroup, CumulativeDividend, Decisions, EventDetails, ExitInput, Holder, ImportBlank, ImportNote, ImportReport, Note, NoteConversion, NoteHere,
  OcxWorkbook, OptionClass, PaymentSchedule, PaymentTake, PayToPlay, PayToPlayHolder, PayToPlaySeries, Payout, PayoutLine, Position, PreferredSeries,
  PreparedCapTable, ProRata, Reason, Safe, SafeConversion, SafeHere, SeriesHere, Solution, TierPayment, WarrantClass,
} from "../src/index.ts";
import { readInputs } from "../src/case.ts";
import { ALL_CASES, CASES_DIR, EXIT_CASES, OCX_CASES, expectedPoints, readCaseFile } from "./support/cases.ts";
import { OCF_PACKAGE_CASES, packageFiles } from "./support/ocf.ts";
import { readOcxWorkbook } from "./support/ocx.ts";

/** A type's field names, listed once: the compiler checks that the list names every field of T and nothing else. */
function fieldsOf<T>() {
  return <const K extends readonly (keyof T & string)[]>(keys: K & ([Exclude<keyof T, K[number]>] extends [never] ? unknown : never)): string[] =>
    [...keys].sort();
}

/** An object has its type's fields and no others; an optional field may be left out. */
function expectFields(o: object, fields: readonly string[], what: string, optional: readonly string[] = []): void {
  const keys = Object.keys(o);
  expect(keys.filter((k) => !fields.includes(k)), `${what}: fields its type doesn't list`).toEqual([]);
  expect(fields.filter((k) => !optional.includes(k) && !keys.includes(k)), `${what}: fields its type lists that it lacks`).toEqual([]);
}

// ---------- an input, as readExit, readInputs and buildCapTables hold it ----------

const EXIT_INPUT = fieldsOf<ExitInput>()(["capTable", "range", "exitValues", "exitDate", "paymentSchedules"]);
const CAP_TABLE = fieldsOf<CapTable>()(["holders", "securities", "seniority", "conversionGroups", "positions", "unissuedPool", "carveOut", "unconvertedSafes", "unconvertedNotes"]);
const HOLDER = fieldsOf<Holder>()(["id", "name"]);
const COMMON = fieldsOf<CommonStock>()(["kind", "id", "name"]);
const OPTION = fieldsOf<OptionClass>()(["kind", "id", "name", "strike"]);
const WARRANT = fieldsOf<WarrantClass>()(["kind", "id", "name", "strike", "underlying"]);
const PREFERRED = fieldsOf<PreferredSeries>()([
  "kind", "id", "name", "originalIssuePrice", "conversionPrice", "conversionRatio", "preferenceMultiple", "participation", "capMultiple", "antiDilution",
  "antiDilutionA", "cumulativeDividend",
]);
const DIVIDEND = fieldsOf<CumulativeDividend>()(["rate", "method", "accrualStart", "onConversion"]);
const GROUP = fieldsOf<ConversionGroup>()(["series", "voteThreshold", "voteRule"]);
const CARVE_OUT = fieldsOf<CarveOut>()(["timing", "tiers", "allocation"]);
const CARVE_OUT_TIER = fieldsOf<CarveOut["tiers"][number]>()(["from", "to", "rate"]);
const CARVE_OUT_SHARE = fieldsOf<CarveOut["allocation"][number]>()(["holder", "share"]);
const SAFE = fieldsOf<Safe>()(["id", "holder", "purchaseAmount", "postMoneyCap", "preMoneyCap", "discount", "cashOutRanksWith"]);
const NOTE = fieldsOf<Note>()([
  "id", "holder", "principal", "interestRate", "interestMethod", "issueDate", "valuationCap", "capType", "conversionBase", "discount", "repaymentMultiple",
]);
const POSITION = fieldsOf<Position>()(["holder", "security", "shares"]);
const SCHEDULE = fieldsOf<PaymentSchedule>()(["id", "description", "payments"]);
const PAYMENT = fieldsOf<PaymentSchedule["payments"][number]>()(["label", "amount"]);

function expectCapTable(ct: CapTable, what: string): void {
  expectFields(ct, CAP_TABLE, what, ["carveOut", "unconvertedSafes", "unconvertedNotes"]);
  for (const h of ct.holders) expectFields(h, HOLDER, `${what} holder ${h.id}`);
  for (const s of ct.securities) {
    const at = `${what} security ${s.id}`;
    if (s.kind === "common") expectFields(s, COMMON, at);
    else if (s.kind === "option") expectFields(s, OPTION, at);
    else if (s.kind === "warrant") expectFields(s, WARRANT, at);
    else {
      expectFields(s, PREFERRED, at, ["cumulativeDividend"]);
      if (s.cumulativeDividend) expectFields(s.cumulativeDividend, DIVIDEND, `${at} dividend`);
    }
  }
  for (const g of ct.conversionGroups) expectFields(g, GROUP, `${what} conversion group`);
  for (const p of ct.positions) expectFields(p, POSITION, `${what} position ${p.holder} ${p.security}`);
  if (ct.carveOut) {
    expectFields(ct.carveOut, CARVE_OUT, `${what} carve-out`);
    for (const t of ct.carveOut.tiers) expectFields(t, CARVE_OUT_TIER, `${what} carve-out tier`);
    for (const a of ct.carveOut.allocation) expectFields(a, CARVE_OUT_SHARE, `${what} carve-out share`);
  }
  for (const f of ct.unconvertedSafes ?? []) expectFields(f, SAFE, `${what} SAFE ${f.id}`, ["cashOutRanksWith"]);
  for (const n of ct.unconvertedNotes ?? []) expectFields(n, NOTE, `${what} note ${n.id}`);
}

// ---------- a prepared table, a solution and a payout ----------

const PREPARED = fieldsOf<PreparedCapTable>()(["capTable", "exitDate"]);
const SOLUTION = fieldsOf<Solution>()(["exitValue", "answers"]);
const ANSWER = fieldsOf<Answer>()(["decisions", "payout"]);
const DECISIONS = fieldsOf<Decisions>()(["converted", "exercised"]);
const PAYOUT = fieldsOf<Payout>()([
  "exitValue", "decisions", "strikeCash", "commonPrice", "series", "carveOut", "safes", "notes", "noteDebt", "safeCash", "curved", "lines", "holderTotals",
  "classTotals", "tiers", "atCap",
]);
const SERIES_HERE = fieldsOf<SeriesHere>()(["shares", "preference", "dividends", "claim", "capTotal", "asConverted"]);
const SAFE_HERE = fieldsOf<SafeHere>()(["converts", "liquidityCapitalization", "liquidityPrice", "shares"]);
const NOTE_HERE = fieldsOf<NoteHere>()(["converts", "shares"]);
const CARVE_OUT_HERE = fieldsOf<CarveOutHere>()(["claim", "paid", "band"]);
const TIER_PAYMENT = fieldsOf<TierPayment>()(["index", "series", "claim", "paid", "full"]);
const PAYOUT_LINE = fieldsOf<PayoutLine>()(["holder", "security", "amount"]);
const NOTE_DEBT = fieldsOf<NonNullable<Payout["noteDebt"]>>()(["claim", "paid", "full", "notes"]);
const SAFE_CASH = fieldsOf<NonNullable<Payout["safeCash"]>>()(["claim", "paid", "full", "safes"]);

/** A payout and everything in it. */
function expectPayout(p: Payout, what: string): void {
  expectFields(p, PAYOUT, what);
  expectFields(p.decisions, DECISIONS, `${what} decisions`);
  for (const [id, s] of p.series) expectFields(s, SERIES_HERE, `${what} series ${id}`);
  for (const [id, f] of p.safes) expectFields(f, SAFE_HERE, `${what} SAFE ${id}`);
  for (const [id, n] of p.notes) expectFields(n, NOTE_HERE, `${what} note ${id}`);
  if (p.carveOut) expectFields(p.carveOut, CARVE_OUT_HERE, `${what} carve-out`);
  for (const t of p.tiers) expectFields(t, TIER_PAYMENT, `${what} tier ${t.index}`);
  for (const l of p.lines) expectFields(l, PAYOUT_LINE, `${what} line ${l.holder} ${l.security}`);
  if (p.noteDebt) expectFields(p.noteDebt, NOTE_DEBT, `${what} note debt`);
  if (p.safeCash) expectFields(p.safeCash, SAFE_CASH, `${what} SAFE cash`);
}

// ---------- a breakpoint, and a payment's takes ----------

const BREAKPOINT = fieldsOf<Breakpoint>()(["exitValue", "jumps", "curveBelow", "curveAbove", "reasons"]);
const REASON = fieldsOf<Reason>()(["code", "subject", "starts", "text"]);
const TAKE = fieldsOf<PaymentTake>()(["label", "amount", "cumulative", "decisions", "lines", "holderTotals", "classTotals", "lowered"]);

describe.each(EXIT_CASES)("%s", (name) => {
  const exit = readInputs(readCaseFile(name, "inputs.json"));
  const pc = prepare(exit.capTable, exit.exitDate);

  it("reads to an input with exactly its types' fields, everything in its cap table too", () => {
    expectFields(exit, EXIT_INPUT, "the input", ["exitDate", "paymentSchedules"]);
    expectCapTable(exit.capTable, "its cap table");
    for (const s of exit.paymentSchedules ?? []) {
      expectFields(s, SCHEDULE, `schedule ${s.id}`);
      for (const p of s.payments) expectFields(p, PAYMENT, `schedule ${s.id} payment ${p.label}`);
    }
  });

  it("prepares to a table that shows its cap table and exit date, and nothing else", () => {
    expect(Object.keys(pc)).toEqual(["capTable", "exitDate"]);
    expectFields(pc, PREPARED, "the prepared table");
    const plain = (o: unknown) => JSON.parse(JSON.stringify(o, (_, v: unknown) => (v instanceof D ? v.toString() : v))) as unknown;
    expect(plain(pc)).toEqual(plain({ capTable: exit.capTable, exitDate: exit.exitDate ?? null }));
  });

  it("solves a table written by hand, not by prepare, as it solves prepare's", () => {
    const byHand: PreparedCapTable = { capTable: exit.capTable, exitDate: exit.exitDate ?? null };
    const [point] = expectedPoints(name);
    const lines = (t: PreparedCapTable) => solve(t, point!.exitValue).answers[0]!.payout.lines.map((l) => `${l.holder} ${l.security} ${l.amount.toString()}`);
    expect(lines(byHand)).toEqual(lines(pc));
  });

  it("solves to a solution, answers and payouts with exactly their types' fields, at every exit value it lists", () => {
    for (const point of expectedPoints(name)) {
      const solution = solve(pc, point.exitValue);
      expectFields(solution, SOLUTION, `${point.label}: the solution`);
      for (const answer of solution.answers) {
        expectFields(answer, ANSWER, `${point.label}: an answer`);
        expectPayout(answer.payout, `${point.label}: the payout`);
      }
    }
  });

  it("finds breakpoints, each reason too, with exactly their types' fields", () => {
    for (const b of findBreakpoints(pc, exit.range)) {
      const at = `the breakpoint at ${b.exitValue.toFixed(2)}`;
      expectFields(b, BREAKPOINT, at);
      for (const r of b.reasons) expectFields(r, REASON, `${at}: a reason`);
    }
  });

  it("pays each schedule in takes with exactly a take's fields", () => {
    for (const s of exit.paymentSchedules ?? []) {
      for (const take of paySchedule(pc, s)) {
        expectFields(take, TAKE, `${s.id} ${take.label}`);
        expectFields(take.decisions, DECISIONS, `${s.id} ${take.label} decisions`);
        for (const l of take.lines) expectFields(l, PAYOUT_LINE, `${s.id} ${take.label} line`);
      }
    }
  });
});

// ---------- a table a company's events build, and what each event worked out ----------

const BUILT = fieldsOf<CapTableAfterEvent>()(["event", "date", "capTable", "details"]);
const PLAIN_DETAILS = fieldsOf<Exclude<EventDetails, { kind: "issue_percent" | "create_pool" | "priced_round" }>>()(["kind"]);
const ISSUE_PERCENT = fieldsOf<Extract<EventDetails, { kind: "issue_percent" }>>()(["kind", "sharesIssued", "basisShares"]);
const CREATE_POOL = fieldsOf<Extract<EventDetails, { kind: "create_pool" }>>()(["kind", "poolCreated", "basisShares"]);
const PRICED_ROUND = fieldsOf<Extract<EventDetails, { kind: "priced_round" }>>()([
  "kind", "price", "postMoneyValuation", "preRoundFullyDiluted", "postMoneyFullyDilutedSolved", "companyCapitalization", "safeConversions",
  "noteConversions", "proRata", "antiDilution", "payToPlay", "newShares", "poolTopUp", "postMoneyFullyDilutedActual",
]);
const SAFE_CONVERSION = fieldsOf<SafeConversion>()(["safe", "holder", "method", "companyCapitalization", "conversionPrice", "shares", "series"]);
const NOTE_CONVERSION = fieldsOf<NoteConversion>()([
  "note", "holder", "principal", "interest", "amountConverting", "conversionBase", "baseShares", "method", "conversionPrice", "shares", "series",
]);
const PRO_RATA = fieldsOf<ProRata>()(["holder", "preRoundShare", "entitlement", "amountInvested"]);
const ANTI_DILUTION = fieldsOf<AntiDilutionAdjustment>()(["series", "rule", "cp1", "cp2Unrounded", "cp2", "a", "b", "c", "newConversionRatio", "pieces"]);
const PIECE = fieldsOf<AntiDilutionPiece>()(["kind", "id", "price", "counted", "inA"]);
const PAY_TO_PLAY = fieldsOf<PayToPlay>()(["series", "offeredAmount", "conversionRatios", "partialParticipation", "pricedAfterConversion", "holders"]);
const PAY_TO_PLAY_RATIO = fieldsOf<PayToPlay["conversionRatios"][number]>()(["series", "ratio"]);
const PAY_TO_PLAY_HOLDER = fieldsOf<PayToPlayHolder>()(["holder", "asConvertedShares", "share", "required", "invested", "fractionBought", "participates", "series"]);
const PAY_TO_PLAY_SERIES = fieldsOf<PayToPlaySeries>()(["series", "shares", "kept", "converted", "commonReceived"]);
const NEW_SHARES = fieldsOf<Extract<EventDetails, { kind: "priced_round" }>["newShares"][number]>()(["holder", "shares"]);

function expectDetails(d: EventDetails, what: string): void {
  if (d.kind === "issue_percent") return expectFields(d, ISSUE_PERCENT, what);
  if (d.kind === "create_pool") return expectFields(d, CREATE_POOL, what);
  if (d.kind !== "priced_round") return expectFields(d, PLAIN_DETAILS, what);
  expectFields(d, PRICED_ROUND, what);
  for (const c of d.safeConversions) expectFields(c, SAFE_CONVERSION, `${what} ${c.safe}`);
  for (const c of d.noteConversions) expectFields(c, NOTE_CONVERSION, `${what} ${c.note}`);
  for (const p of d.proRata) expectFields(p, PRO_RATA, `${what} pro-rata ${p.holder}`);
  for (const a of d.antiDilution) {
    expectFields(a, ANTI_DILUTION, `${what} anti-dilution ${a.series}`);
    for (const p of a.pieces ?? []) expectFields(p, PIECE, `${what} anti-dilution ${a.series} piece`);
  }
  if (d.payToPlay) {
    expectFields(d.payToPlay, PAY_TO_PLAY, `${what} pay-to-play`);
    for (const r of d.payToPlay.conversionRatios) expectFields(r, PAY_TO_PLAY_RATIO, `${what} pay-to-play ratio`);
    for (const h of d.payToPlay.holders) {
      expectFields(h, PAY_TO_PLAY_HOLDER, `${what} pay-to-play ${h.holder}`);
      for (const s of h.series) expectFields(s, PAY_TO_PLAY_SERIES, `${what} pay-to-play ${h.holder} ${s.series}`);
    }
  }
  for (const n of d.newShares) expectFields(n, NEW_SHARES, `${what} new shares`);
}

/** The cases built from a company's events (C2). */
const ROUND_CASES = ALL_CASES.filter(
  (name) => !name.startsWith("ocf-") && !name.startsWith("ocx-") && "events" in (readCaseFile(name, "inputs.json") as object),
);

describe.each(ROUND_CASES)("%s, built from its events", (name) => {
  it("builds tables with exactly a built table's fields, each event's SAFEs and notes on its cap table, and its details", () => {
    const { holders, events } = readCaseFile(name, "inputs.json") as { holders: unknown; events: unknown };
    for (const t of buildCapTables({ holders, events })) {
      expectFields(t, BUILT, `after ${t.event}`);
      expectCapTable(t.capTable, `after ${t.event}: the cap table`);
      expectDetails(t.details, `after ${t.event}: the details`);
    }
  });
});

// ---------- an import ----------

const IMPORT = fieldsOf<CapTableImport>()(["as_of", "cap_table", "issue_order", "to_fill", "report"]);
const REPORT = fieldsOf<ImportReport>()(["read", "not_needed", "notes"]);
const BLANK = fieldsOf<ImportBlank>()(["security", "safe", "note", "field"]);
const IMPORT_NOTE = fieldsOf<ImportNote>()(["code", "subject", "field"]);

function expectImport(r: CapTableImport, what: string): void {
  expectFields(r, IMPORT, what);
  expectFields(r.report, REPORT, `${what}: its report`);
  for (const b of r.to_fill) expectFields(b, BLANK, `${what}: a blank`, ["security", "safe", "note"]);
  for (const n of r.report.notes) expectFields(n, IMPORT_NOTE, `${what}: a note ${n.code}`, ["subject", "field"]);
}

const OCX_WORKBOOK_CASES = OCX_CASES.filter((name) => existsSync(join(CASES_DIR, name, "workbook.json")));

describe("imports", () => {
  it.each(OCF_PACKAGE_CASES)("readOcf reads %s to exactly an import's fields", (name) => {
    expectImport(readOcf(packageFiles(name)), name);
  });

  it.each(OCX_WORKBOOK_CASES)("readOcx reads %s to exactly an import's fields", (name) => {
    expectImport(readOcx(readOcxWorkbook(name) as OcxWorkbook), name);
  });
});
