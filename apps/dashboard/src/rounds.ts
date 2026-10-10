// A cap table built from a company's rounds (M4i): the events as loaded, the
// cap table the engine builds after each one, and what the Rounds tab says
// about each. The payouts run on the cap table after the event the exit
// names (C2), turned into the same draft the editor holds, so everything
// downstream is unchanged. The events themselves aren't edited here yet
// (M4j); the cap table they build is shown read-only until someone chooses
// to edit it directly, which drops them.

import { D, InputError, UnsupportedTermError, buildCapTables, readInputs } from "spillpoint";
import type { AntiDilutionAdjustment, CapTable, CapTableAfterEvent, RoundDetails } from "spillpoint";

import { NotShownYet, checkShown, draftFromExit } from "./draft.ts";
import type { Draft } from "./draft.ts";
import { dollars, dollarsAndCents, percent, withoutCodes } from "./format.ts";

type Decimal = D;
type Json = Record<string, unknown>;

/** A company's history, exactly as loaded: what a save keeps (file version 2). */
export interface Rounds {
  holders: Json[];
  events: Json[];
  /** The event whose cap table the exit runs on (C2). */
  after: string;
}

export type FromRounds =
  | { ok: true; tables: CapTableAfterEvent[]; draft: Draft }
  | { ok: false; message: string; error: Error };

/**
 * The sale's terms (M5 plan, item 13), as a file or an example gives them: its
 * date, its carve-out and its payment schedules. A carve-out is a term of the
 * sale, not a security, so a company built from rounds can have one: the page
 * adds it to the cap table the rounds build, as C6 places it.
 */
export interface ExitTerms {
  exit_date?: unknown;
  carve_out?: unknown;
  payment_schedules?: unknown;
}

/**
 * Builds the cap tables from the rounds, and the draft of the one the exit
 * runs on. readInputs checks the whole input as the engine reads it,
 * including the SAFEs and notes still outstanding at the sale (C8, C9). The
 * sale's terms come from the Exit terms card, like the range, and go into
 * the draft; they're checked next to their fields.
 */
export function fromRounds(rounds: Rounds, range: unknown, terms: ExitTerms = {}): FromRounds {
  const company = { holders: rounds.holders, events: rounds.events };
  try {
    const tables = buildCapTables(company);
    // What the page can't show comes before the engine's exit checks: a founder can't give
    // the exit date a table with dividends needs, so being asked for one wouldn't help.
    // A starting table is shown too, on the Cap table tab (R31).
    if (rounds.events[0]?.type === "start") checkShown(rounds.events[0].cap_table);
    const after = tables.find((t) => t.event === rounds.after);
    if (after) checkShown(capTableJson(after.capTable));
    // The rounds are checked on their own. The range and the sale's date belong to the cap table, whose
    // editor checks them next to their fields, so here they're stand-ins that pass: a date after any event.
    try {
      readInputs({ ...company, exit: { cap_table_after_event: rounds.after, range: ["0", "1"], exit_values: [], exit_date: "9999-12-31" } });
    } catch (e) {
      // The limits a sale puts on the SAFEs and notes still outstanding (X12–X15) belong to the sale, not the rounds:
      // reading the draft checks them next to the cap table, as for one entered directly.
      if (!(e instanceof UnsupportedTermError && e.path.startsWith("exit.cap_table_after_event.unconverted_"))) throw e;
    }
    const r = range as unknown[];
    const exit = {
      cap_table: capTableJson(after!.capTable),
      range: [String(r[0]), String(r[1])],
      // C6: the carve-out is a term of the sale, on the exit (0.3.0).
      ...(terms.carve_out != null ? { carve_out: terms.carve_out } : {}),
      ...(terms.exit_date != null && terms.exit_date !== "" ? { exit_date: terms.exit_date } : {}),
      ...(terms.payment_schedules != null ? { payment_schedules: terms.payment_schedules } : {}),
    };
    return { ok: true, tables, draft: draftFromExit(exit) };
  } catch (e) {
    const error = e as Error;
    if (e instanceof InputError || e instanceof UnsupportedTermError || e instanceof NotShownYet) return { ok: false, message: withoutCodes(error.message), error };
    throw e;
  }
}

/**
 * A cap table the engine built, in the case-file format (C1–C4). Prices are
 * the engine's 40-digit values written out in full, so reading them back
 * gives the same numbers, and the editor keeps them exact until edited.
 */
export function capTableJson(ct: CapTable): Json {
  const text = (d: Decimal) => d.toFixed();
  return {
    holders: ct.holders.map((h) => ({ id: h.id, name: h.name })),
    securities: ct.securities.map((s) => {
      if (s.kind === "common") return { id: s.id, name: s.name, kind: s.kind };
      if (s.kind === "option") return { id: s.id, name: s.name, kind: s.kind, strike: text(s.strike) };
      if (s.kind === "warrant") return { id: s.id, name: s.name, kind: s.kind, strike: text(s.strike), underlying: s.underlying };
      return {
        id: s.id,
        name: s.name,
        kind: s.kind,
        original_issue_price: text(s.originalIssuePrice),
        conversion_price: text(s.conversionPrice),
        preference_multiple: text(s.preferenceMultiple),
        participation: s.participation,
        cap_multiple: s.capMultiple ? text(s.capMultiple) : null,
        anti_dilution: s.antiDilution,
        ...(s.antiDilutionA != null ? { anti_dilution_a: s.antiDilutionA } : {}),
        // Written out so the page's own check (checkShown) sees the term, never drops it.
        ...(s.cumulativeDividend != null
          ? {
              cumulative_dividend: {
                rate: text(s.cumulativeDividend.rate),
                method: s.cumulativeDividend.method,
                accrual_start: s.cumulativeDividend.accrualStart,
                on_conversion: s.cumulativeDividend.onConversion,
              },
            }
          : {}),
      };
    }),
    seniority: ct.seniority.map((t) => [...t]),
    // A starting table's group, carried through its rounds (R31, 05b3); no event makes one.
    conversion_groups: ct.conversionGroups.map((g) => ({ series: [...g.series], vote_threshold_percent: text(g.voteThreshold.times(100)), vote_rule: g.voteRule })),
    positions: ct.positions.map((p) => ({ holder: p.holder, security: p.security, shares: text(p.shares) })),
    unissued_pool: text(ct.unissuedPool),
    // Written out so the page's own check (checkShown) sees SAFEs still outstanding, never drops them.
    ...(ct.unconvertedSafes && ct.unconvertedSafes.length > 0
      ? {
          unconverted_safes: ct.unconvertedSafes.map((f) => ({
            id: f.id,
            holder: f.holder,
            purchase_amount: text(f.purchaseAmount),
            ...(f.postMoneyCap ? { post_money_cap: text(f.postMoneyCap) } : {}),
            ...(f.preMoneyCap ? { pre_money_cap: text(f.preMoneyCap) } : {}),
            discount: text(f.discount),
            ...(f.cashOutRanksWith != null ? { cash_out_ranks_with: f.cashOutRanksWith } : {}),
          })),
        }
      : {}),
    // And notes, likewise.
    ...(ct.unconvertedNotes && ct.unconvertedNotes.length > 0
      ? {
          unconverted_notes: ct.unconvertedNotes.map((n) => ({
            id: n.id,
            holder: n.holder,
            principal: text(n.principal),
            interest_rate: text(n.interestRate),
            interest_method: n.interestMethod,
            issue_date: n.issueDate,
            valuation_cap: n.valuationCap ? text(n.valuationCap) : null,
            cap_type: n.capType,
            conversion_base: n.conversionBase,
            discount: text(n.discount),
            repayment_multiple: text(n.repaymentMultiple),
          })),
        }
      : {}),
  };
}

/** An example's draft, and its rounds when it's built from them: Millrace's cap table comes from its events. */
export function exampleContents(example: { exit: unknown; company?: { holders: unknown[]; events: unknown[] } }): { draft: Draft; rounds: Rounds | null } {
  if (!example.company) return { draft: draftFromExit(example.exit), rounds: null };
  const exit = example.exit as { cap_table_after_event: string; range: unknown } & ExitTerms;
  const rounds = { holders: example.company.holders as Json[], events: example.company.events as Json[], after: exit.cap_table_after_event };
  const built = fromRounds(rounds, exit.range, exit);
  // The examples are locked cases the engine builds in its own tests.
  if (!built.ok) throw built.error;
  return { draft: built.draft, rounds };
}

// ---------- what the Rounds tab says ----------

/** One row of a cap table after an event. */
export interface TableRow {
  holder: string;
  security: string;
  shares: Decimal;
  /** Of the fully diluted shares, the unissued pool included. */
  fullyDiluted: Decimal;
}

/** A sentence about what an event did, with any sentences that explain it, shown under it. */
export type Line = string | { text: string; details: string[] };

export interface EventView {
  id: string;
  /** "Jun 30, 2022", or null when the event has no date. */
  date: string | null;
  title: string;
  /** What it did, in plain sentences. */
  lines: Line[];
  rows: TableRow[];
  pool: { shares: Decimal; fullyDiluted: Decimal };
  /** Each holder's fully diluted share after it, by holder id: what the "For you" line compares. */
  stakes: Map<string, Decimal>;
  /** SAFEs and notes still waiting to convert after it. */
  outstanding: string[];
}

const ZERO = new D(0);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2022-06-30" → "Jun 30, 2022", as US founders write dates (M4i review). */
export function dateText(date: string | null): string | null {
  const m = date ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) : null;
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : date;
}

const count = (n: Decimal) => n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/**
 * A per-share price as a founder reads it: to the cent when that's exact ("$4.00"), otherwise to six places, as the
 * editor shows them ("$0.384930") (0.5.0 plan, 05e; Jordan, after #69).
 */
const price = (p: Decimal) => (p.eq(p.toFixed(2)) ? `$${p.toFixed(2)}` : `$${p.toFixed(6, D.ROUND_HALF_UP)}`);
/** A percentage as written in the input: "6%", "12.5%". */
const pct = (fraction: Decimal) => `${fraction.times(100).toDecimalPlaces(4, D.ROUND_HALF_UP).toFixed()}%`;
const money = (v: unknown) => dollars(new D(String(v)));
const list = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

const RULES = { broad_based: "broad-based weighted average", narrow_based: "narrow-based weighted average", full_ratchet: "full ratchet" } as const;

/**
 * What a round needs to know of the cap table the company starts from (R31), if it starts from one: its series, its
 * SAFEs and notes, and the order they were issued in, if it gives one.
 */
interface Starting {
  series: Set<string>;
  convertibles: Set<string>;
  order: string[] | null;
}

/**
 * R25, R31: whether a SAFE or note was issued after a starting series. One from an event after the starting table
 * was; one from the table follows the order it gives, or, with none, counts as after its series.
 */
function issuedAfter(starting: Starting, convertible: string, series: string): boolean {
  if (!starting.convertibles.has(convertible) || !starting.order) return true;
  return starting.order.indexOf(convertible) > starting.order.indexOf(series);
}

/** What the Rounds tab shows for each event: what it did, and the cap table after it. */
export function eventViews(rounds: Rounds, tables: CapTableAfterEvent[]): EventView[] {
  const first = rounds.events[0];
  const startTable = first?.type === "start" ? tables[0]?.capTable : undefined;
  const starting: Starting | null = startTable
    ? {
        series: new Set(startTable.securities.filter((s) => s.kind === "preferred").map((s) => s.id)),
        convertibles: new Set([...(startTable.unconvertedSafes ?? []), ...(startTable.unconvertedNotes ?? [])].map((x) => x.id)),
        order: Array.isArray(first!.issue_order) ? (first!.issue_order as string[]) : null,
      }
    : null;
  return tables.map((t, i) => {
    const ev = rounds.events[i]!;
    const ct = t.capTable;
    const holder = (id: unknown) => ct.holders.find((h) => h.id === id)?.name ?? String(id);
    const security = (id: unknown) => ct.securities.find((s) => s.id === id)?.name ?? String(id);
    // Preferred as converted, and a warrant for a series at that series' ratio (R29).
    const asConverted = (securityId: string, shares: Decimal): Decimal => {
      const s = ct.securities.find((x) => x.id === securityId);
      if (s?.kind === "warrant" && s.underlying !== "common") return asConverted(s.underlying, shares);
      return s?.kind === "preferred" ? shares.times(s.conversionRatio) : shares;
    };
    const total = ct.positions.reduce((sum, p) => sum.plus(asConverted(p.security, p.shares)), ct.unissuedPool);
    const share = (n: Decimal) => (total.isZero() ? ZERO : n.div(total));
    const { title, lines } = describe(ev, t, holder, security, i > 0 ? tables[i - 1]! : null, starting);
    const stakes = new Map<string, Decimal>();
    for (const p of ct.positions) stakes.set(p.holder, (stakes.get(p.holder) ?? ZERO).plus(share(asConverted(p.security, p.shares))));
    return {
      id: t.event,
      date: dateText(t.date),
      title,
      lines,
      rows: ct.positions.map((p) => ({ holder: holder(p.holder), security: security(p.security), shares: p.shares, fullyDiluted: share(asConverted(p.security, p.shares)) })),
      pool: { shares: ct.unissuedPool, fullyDiluted: share(ct.unissuedPool) },
      stakes,
      outstanding: [
        ...t.unconvertedSafes.map((f) => `${holder(f.holder)}'s SAFE, ${dollars(f.purchaseAmount)}`),
        ...t.unconvertedNotes.map((n) => `${holder(n.holder)}'s convertible note, ${dollars(n.principal)} plus interest`),
      ],
    };
  });
}

type Name = (id: unknown) => string;

/** ", with a 20% discount", or nothing without one. */
const discountText = (discount: unknown) => (discount != null && !new D(String(discount)).isZero() ? `, with a ${pct(new D(String(discount)))} discount` : "");

function describe(ev: Json, t: CapTableAfterEvent, holder: Name, security: Name, before: CapTableAfterEvent | null, starting: Starting | null): { title: string; lines: Line[] } {
  const d = t.details;
  const items = (key: string) => (ev[key] as Json[] | undefined) ?? [];
  switch (d.kind) {
    case "start":
      // R31: the cap table a company starts from, edited on the Cap table tab.
      return { title: "The cap table it starts from", lines: ["The company as it stood. Every event after it is built on it."] };
    case "issue":
      return {
        title: `${(ev.security as Json).name as string} issued`,
        lines: items("issues").map((x) => `${holder(x.holder)}: ${count(new D(String(x.shares)))} shares.`),
      };
    case "grant_options":
      return {
        title: "Options granted",
        lines: items("grants").map((g) => `${holder(g.holder)}: ${count(new D(String(g.shares)))} options at $${String(g.strike)} a share, from the pool.`),
      };
    case "issue_warrants":
      // R29: counted like options, and not drawn from the pool.
      return {
        title: "Warrants issued",
        lines: items("warrants").map(
          (w) =>
            `${holder(w.holder)}: warrants for ${count(new D(String(w.shares)))} ${w.underlying === "common" ? "common" : security(w.underlying)} shares ` +
            `at $${String(w.strike)} a share, not from the pool.`,
        ),
      };
    case "safes":
      return {
        title: items("safes").length === 1 ? "A SAFE" : "SAFEs",
        lines: items("safes").map((f) => {
          const cap =
            f.post_money_cap != null
              ? `, capped at a ${money(f.post_money_cap)} post-money valuation`
              : f.pre_money_cap != null
                ? `, capped at a ${money(f.pre_money_cap)} pre-money valuation`
                : "";
          return `${holder(f.holder)}: ${money(f.purchase_amount)}${cap}${discountText(f.discount)}. It converts in a later priced round.`;
        }),
      };
    case "notes":
      return {
        title: items("notes").length === 1 ? "A convertible note" : "Convertible notes",
        lines: items("notes").map((n) => {
          const cap = n.valuation_cap != null ? `, capped at a ${money(n.valuation_cap)} pre-money valuation` : "";
          return `${holder(n.holder)}: ${money(n.principal)} at ${pct(new D(String(n.interest_rate)))} simple interest from ${dateText(String(n.issue_date))}${cap}${discountText(n.discount)}.`;
        }),
      };
    case "issue_percent":
      return {
        title: `${security((ev.security as Json).id)} issued`,
        lines: [`${holder(ev.holder)}: ${count(d.sharesIssued)} shares, ${pct(new D(String(ev.percent)).div(100))} of the issued stock after the issue.`],
      };
    case "create_pool":
      return { title: "Option pool created", lines: [`${count(d.poolCreated)} shares set aside for options: ${pct(new D(String(ev.percent)).div(100))} of the fully diluted shares after it.`] };
    case "priced_round":
      return {
        title: `${security((ev.series as Json).id)}, a priced round`,
        lines: [...roundLines(ev, d, holder, security, starting), ...dividendLines(ev, t), ...startingLines(ev, d, t, before, starting)],
      };
  }
}

/**
 * R30: a round's cumulative dividends accrue from its date, on its series and
 * on the series its SAFEs and notes convert into, each on its own issue price.
 */
function dividendLines(ev: Json, t: CapTableAfterEvent): string[] {
  const id = String((ev.series as Json).id);
  return t.capTable.securities.flatMap((s) => {
    if (s.kind !== "preferred" || !s.cumulativeDividend || !(s.id === id || s.id.startsWith(`${id}_`)) || s.cumulativeDividend.accrualStart !== ev.date) return [];
    const div = s.cumulativeDividend;
    const conversion = div.onConversion === "paid" ? "if it converts, they're still paid" : "if it converts, it gives them up";
    return [
      `${s.name} accrues cumulative dividends of ${pct(div.rate)} a year on its ${price(s.originalIssuePrice)} issue price, ${div.method === "compounding" ? "compounding once a year" : "simple"}, ` +
        `from ${dateText(div.accrualStart)}; ${conversion}.`,
    ];
  });
}

function roundLines(ev: Json, d: RoundDetails, holder: Name, security: Name, starting: Starting | null): Line[] {
  const seriesName = security((ev.series as Json).id);
  const investments = (ev.investments as Json[]).map((inv) => ({ holder: String(inv.holder), amount: new D(String(inv.amount)) }));
  const byHolder = new Map<string, Decimal>();
  for (const inv of investments) byHolder.set(inv.holder, (byHolder.get(inv.holder) ?? ZERO).plus(inv.amount));
  const raised = investments.reduce((sum, inv) => sum.plus(inv.amount), ZERO);
  const lines: Line[] = [
    `${dollars(raised)} at a ${money(ev.pre_money)} pre-money valuation, ${dollars(d.postMoneyValuation)} post-money: ${price(d.price)} a share.`,
    ...d.newShares.map((n) => `${holder(n.holder)} invests ${dollars(byHolder.get(n.holder) ?? ZERO)} for ${count(n.shares)} shares of ${seriesName}.`),
  ];
  const target = ev.pool_target_unissued_percent_post == null ? ZERO : new D(String(ev.pool_target_unissued_percent_post)).div(100);
  if (d.poolTopUp.gt(0)) {
    lines.push(`The pool is topped up by ${count(d.poolTopUp)} shares, to ${pct(target)} of the company after the round. The top-up comes before the new money, so it dilutes only the holders before the round. Investors call this the option pool shuffle.`);
  }
  else if (target.gt(0)) lines.push(`The pool already meets its ${pct(target)} target, so it isn't topped up.`);

  for (const c of d.safeConversions) {
    lines.push(`${holder(c.holder)}'s SAFE converts at its ${c.method} price, ${price(c.conversionPrice)} a share, into ${count(c.shares)} shares of ${security(c.series)}.`);
  }
  for (const c of d.noteConversions) {
    lines.push(
      `${holder(c.holder)}'s note converts ${dollarsAndCents(c.amountConverting)} (${dollarsAndCents(c.principal)} and ${dollarsAndCents(c.interest)} interest) ` +
        `at its ${c.method} price, ${price(c.conversionPrice)} a share, into ${count(c.shares)} shares of ${security(c.series)}.`,
    );
  }
  for (const p of d.proRata) {
    // R6: the base leaves out the unissued pool unless the round says otherwise.
    const pool = ev.pro_rata_base_includes_unissued_pool === true ? "counting" : "not counting";
    lines.push(
      `${holder(p.holder)} may buy up to ${dollarsAndCents(p.entitlement)} as pro-rata: its ${percent(p.preRoundShare)} of the company before the round ` +
        `(${pool} the unissued pool), times the ${dollarsAndCents(raised)} raised. It takes ${dollarsAndCents(p.amountInvested)} of it.`,
    );
  }
  if (d.payToPlay) {
    const pp = d.payToPlay;
    lines.push(`Pay-to-play: ${dollars(pp.offeredAmount)} is offered to the holders of ${list(pp.series.map(security))}, each in proportion to what it holds.`);
    for (const h of pp.holders) {
      // To the cent: a holder a cent short of its requirement converts (R20).
      const required = `${dollarsAndCents(h.invested)} of its ${dollarsAndCents(h.required)}`;
      if (h.participates) {
        lines.push(`${holder(h.holder)} buys ${required} and keeps its preferred.`);
        continue;
      }
      const outcome = h.series.map((b) => {
        const kept = b.kept.isZero() ? "" : `, keeping ${count(b.kept)}`;
        return `${count(b.converted)} ${security(b.series)} into ${count(b.commonReceived)} common${kept}`;
      });
      lines.push(`${holder(h.holder)} buys ${required}, so it converts ${list(outcome)}.`);
    }
  }
  for (const a of d.antiDilution) {
    const text =
      `${security(a.series)}'s anti-dilution (${RULES[a.rule]}) lowers its conversion price from ${price(a.cp1)} to ${price(a.cp2)}, ` +
      `so each share converts into ${a.newConversionRatio.toFixed(6, D.ROUND_HALF_UP)} common. Its preference doesn't change.`;
    // With conversions, each piece's line goes under it, as its explanation; and for a starting series, how the
    // order its SAFEs and notes were issued in was read (R31).
    const details = [...pieceLines(a, ev, d, holder, security), ...orderLines(a, d, security, starting)];
    lines.push(details.length > 0 ? { text, details } : text);
  }
  return lines;
}

/**
 * R31: when a round adjusts a series from the starting cap table and a SAFE or note from that table converts in it,
 * whether each came before the series depends on the order the table gives. The round says how it was read: as given,
 * or, with none given, its SAFEs and notes after its series.
 */
function orderLines(a: AntiDilutionAdjustment, d: RoundDetails, security: Name, starting: Starting | null): string[] {
  if (!starting || !starting.series.has(a.series)) return [];
  const converting = [...d.safeConversions.map((c) => c.safe), ...d.noteConversions.map((c) => c.note)];
  if (!converting.some((id) => starting.convertibles.has(id))) return [];
  const series = security(a.series);
  return [
    starting.order
      ? `Whether each SAFE and note was issued before or after ${series} comes from the starting cap table.`
      : `The starting cap table doesn't give the order things were issued in, so its SAFEs and notes count as issued after ${series}: they usually bridge to the next round.`,
  ];
}

/**
 * What a round says about the cap table the company starts from (R31; 0.5.0 plan, 05b3; Jordan's wording):
 * - a starting series with no anti-dilution, which an imported series has (O11), in a round that would adjust it if it
 *   had broad-based anti-dilution (Jordan, 05b3b answers): priced below its conversion price, or converting a SAFE or
 *   note below it that counts against it under R25, issued after it and not exempt. Nothing adjusts it, so the round
 *   says so, and where to give it some;
 * - a conversion group the starting table gives: the round's new series, and those its SAFEs and notes convert into,
 *   aren't in it, and each decides on its own at a sale. Joining it is on the later list.
 */
function startingLines(ev: Json, d: RoundDetails, t: CapTableAfterEvent, before: CapTableAfterEvent | null, starting: Starting | null): string[] {
  if (!starting || !before) return [];
  const seriesId = String((ev.series as Json).id);
  const exempt = ev.anti_dilution_exempts_conversions === true;
  const pieces = [...d.safeConversions.map((c) => ({ kind: "safe", id: c.safe, price: c.conversionPrice })), ...d.noteConversions.map((c) => ({ kind: "note", id: c.note, price: c.conversionPrice }))];
  const fix = "If its charter gives it some, add it in the starting cap table.";
  const lines: string[] = [];
  for (const s of before.capTable.securities) {
    if (s.kind !== "preferred" || !starting.series.has(s.id) || s.antiDilution !== "none") continue;
    if (d.price.lt(s.conversionPrice)) {
      lines.push(`${s.name} has no anti-dilution, so this down round doesn't adjust it. ${fix}`);
      continue;
    }
    const counted = exempt ? [] : pieces.filter((p) => p.price.lt(s.conversionPrice) && issuedAfter(starting, p.id, s.id));
    if (counted.length === 0) continue;
    const safes = counted.filter((p) => p.kind === "safe").length;
    const notes = counted.length - safes;
    const what = [safes ? (safes === 1 ? "the SAFE" : "the SAFEs") : "", notes ? (notes === 1 ? "the note" : "the notes") : ""].filter(Boolean).join(" and ");
    lines.push(
      `${s.name} has no anti-dilution, so ${what} converting below its ${price(s.conversionPrice)} conversion price ${counted.length === 1 ? "doesn't" : "don't"} adjust it. ${fix}`,
    );
  }
  const name = (id: string) => before.capTable.securities.find((s) => s.id === id)?.name ?? id;
  // The round's own series first, then those its SAFEs and notes convert into.
  const made = t.capTable.securities
    .filter((s) => s.kind === "preferred" && !before.capTable.securities.some((b) => b.id === s.id))
    .sort((a, b) => Number(b.id === seriesId) - Number(a.id === seriesId))
    .map((s) => s.name);
  for (const g of before.capTable.conversionGroups) {
    if (made.length === 0) continue;
    const group = `the group of series that must convert together (${list(g.series.map(name))})`;
    lines.push(
      made.length === 1
        ? `${made[0]} isn't in ${group}, so at a sale it decides on its own whether to convert. If its charter puts it in that group, spillpoint can't model that yet.`
        : `${list(made)} aren't in ${group}, so at a sale each decides on its own whether to convert. If the charter puts them in that group, spillpoint can't model that yet.`,
    );
  }
  return lines;
}

/**
 * With SAFEs or notes converting, one plain line for each piece of the round
 * as this series' anti-dilution saw it (R25; Jordan's wording, 03h review):
 * the new money at the round's price, and each SAFE and note at the price it
 * converts at. A piece below the series' conversion price counts against it;
 * one at or above it doesn't; a conversion the round exempts, or one issued
 * before the series, counts in the starting share count instead (A).
 */
function pieceLines(a: AntiDilutionAdjustment, ev: Json, d: RoundDetails, holder: (id: unknown) => string, security: (id: unknown) => string): string[] {
  const series = security(a.series);
  const owner = (id: string) => {
    const safe = d.safeConversions.find((c) => c.safe === id);
    if (safe) return `${holder(safe.holder)}'s SAFE`;
    const note = d.noteConversions.find((c) => c.note === id);
    return note ? `${holder(note.holder)}'s note` : id;
  };
  return (a.pieces ?? []).map((p) => {
    if (p.inA) {
      const why = ev.anti_dilution_exempts_conversions === true ? "is exempt under this round's setting" : `was issued before ${series}`;
      return `${owner(p.piece)} ${why}, so it counts in the starting share count instead.`;
    }
    // To the cent, as a founder reads a price, unless that would show it equal to the conversion price it's compared with.
    const close = p.price.toFixed(2, D.ROUND_HALF_UP) === a.cp1.toFixed(2, D.ROUND_HALF_UP) && !p.price.eq(a.cp1);
    const show = (x: Decimal) => `$${x.toFixed(close ? 6 : 2, D.ROUND_HALF_UP)}`;
    const where = p.price.lt(a.cp1) ? "below" : p.price.eq(a.cp1) ? "at" : "above";
    const verdict = p.counted ? `so it counts against ${series}` : "so it doesn't count";
    return p.piece === "new money"
      ? `New money at ${show(p.price)} a share: ${where} ${series}'s ${show(a.cp1)}, ${verdict}.`
      : `${owner(p.piece)} converts at ${show(p.price)} a share: ${where} ${show(a.cp1)}, ${verdict}.`;
  });
}
