// OCX 0.4 and 0.5, the Coalition's reference layout (OX14): the holdings on the per-holder tab, a series' terms in
// Context's Financing History, and convertibles only as the summary tab's rows. The checks run in OX13's order.

import type { Decimal } from "decimal.js";

import { ZERO } from "./decimal.ts";
import { type Book, asOfOf, headerRow, isBlank, isNA, label, malformed, numberAt, requireHeaders, tablesOf, unsupported, written } from "./ocx-cells.ts";
import { OCX_ADDITIONAL, OCX_HEADERS, OCX_TITLES, OCX_VOTING } from "./ocx-headers.ts";
import { type Draft, type ShareClass, sum } from "./ocx-import.ts";
import { convertibleRows, matchRounds, noteFromRow, readRound, safeFromRow, summaryClasses, totalAt, unrecognized } from "./ocx-terms.ts";
import { headNotes } from "./ocx-notes.ts";

const SUMMARY_NEEDS = ["Share Class", "Outstanding Shares", "Liquidation Preference", "Security Type", "# of Securities", "Outstanding Amount", "Discount", "Valuation Cap"];
const HOLDER_NEEDS = ["Stakeholder", "Stakeholder Group", "Total Stock (outstanding)"];
const FINANCING_NEEDS = ["Round", "Initial Closing Date", "Original Issue Price", "Adjusted Conversion Price", "Conversion Ratio", "Liquidation Multiple", "Participating (Y/N)", "Participation Cap"];
const DETAILS_NEEDS = ["Plan Name", "Outstanding RSUs", "Shares Available for Grant"];

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface Column {
  column: number;
  text: string;
  kind: "class" | "converted" | "option" | "warrant" | "awards";
  cls?: ShareClass;
}

export function read05(book: Book, draft: Draft): string {
  // 2. The layout's named tabs, then the headers each needs.
  for (const name of ["Summary Snapshot", "Stakeholder Snapshot", "Context"]) if (!book.tab(name)) malformed("missing_tab", name, "the workbook has no such tab");
  const summary = book.tab("Summary Snapshot")!;
  const holdersTab = book.tab("Stakeholder Snapshot")!;
  const context = book.tab("Context")!;
  const sumH = requireHeaders(summary, headerRow(summary, SUMMARY_NEEDS), SUMMARY_NEEDS);
  const holdH = requireHeaders(holdersTab, headerRow(holdersTab, HOLDER_NEEDS), HOLDER_NEEDS);
  const tables = tablesOf(context, OCX_TITLES);
  const financing = tables.get("Financing History");
  if (!financing?.header) malformed("missing_header", "Context: Round", "Context has no Financing History");
  requireHeaders(context, financing!.header, FINANCING_NEEDS);
  const details = tables.get("Stock Plan Details");
  if (!details?.header) malformed("missing_header", "Context: Plan Name", "Context has no Stock Plan Details");
  requireHeaders(context, details!.header, DETAILS_NEEDS);

  // 3. The as-of date, from the summary tab.
  const asOf = asOfOf(summary, book.dateSystem);

  // 4. The classes, and the holdings columns: those between `Stakeholder Group` and `Total Stock (outstanding)`.
  const classes = summaryClasses(summary, sumH, draft);
  headNotes(book, draft, classes);
  const from = holdH.at("Stakeholder Group")!;
  const to = holdH.at("Total Stock (outstanding)")!;
  const holdingCells = holdH.cells.filter((c) => c.column > from && c.column < to);
  const columns: Column[] = [];
  for (const c of classes) {
    const own = c.kind === "common"
      ? holdingCells.find((x) => x.text === c.name)
      : holdingCells.find((x) => new RegExp(`^${escape(c.name)} \\(outstanding\\) \\(~?[0-9.]+\\)$`).test(x.text));
    if (!own) unsupported("unknown_class_heading", c.name, `the Stakeholder Snapshot has no column for ${c.name}`);
    columns.push({ ...own!, kind: "class", cls: c });
    const converted = holdingCells.find((x) => x.text === `${c.name} (as converted)`);
    if (c.kind === "preferred" && converted) columns.push({ ...converted, kind: "converted", cls: c });
  }
  for (const cell of holdingCells) {
    if (columns.some((x) => x.column === cell.column)) continue;
    if (cell.text.endsWith(" Options")) columns.push({ ...cell, kind: "option" });
    else if (cell.text === "Non-Plan Awards") columns.push({ ...cell, kind: "awards" });
    else if (cell.text.endsWith(" Warrants")) {
      const name = cell.text.slice(0, -" Warrants".length);
      const cls = classes.find((c) => c.name === name);
      if (!cls) unsupported("warrant_for_unknown_class", name, `a warrant column for "${name}", a class the workbook doesn't have`);
      columns.push({ ...cell, kind: "warrant", cls: cls! });
    } else unsupported("unknown_holdings_header", cell.text, "a holdings column of a kind the reader doesn't know");
  }
  columns.sort((a, b) => a.column - b.column);

  // 5. The holders, then the pool's row and the totals' row.
  const nameColumn = holdH.at("Stakeholder")!;
  const holderRows: { row: number; name: string; id: string }[] = [];
  let poolRow: number | undefined;
  let poolLabel = "Options Remaining for Issuance";
  let totalRow: number | undefined;
  for (const row of holdersTab.rowNumbers().filter((r) => r > holdH.row)) {
    const name = holdersTab.text(row, nameColumn);
    if (!name) continue;
    const l = label(name);
    if (l === "total") {
      totalRow = row;
      break;
    }
    if (l === "options remaining for issuance") {
      poolRow = row;
      poolLabel = name;
      continue;
    }
    if (draft.byName.has(name)) malformed("duplicate_stakeholder", name, "two holder rows have this name");
    holderRows.push({ row, name, id: draft.addHolder(name).id });
  }
  draft.count("stakeholders", holderRows.length);
  if (poolRow !== undefined) draft.count("pool_rows");

  // A tab no layout names isn't read; a line says so (OX12).
  for (const t of book.tabs) if (!["Summary Snapshot", "Stakeholder Snapshot", "Voting by SH Group", "Context"].includes(t.name)) draft.notes.add("unrecognized_tab", t.name);

  // 6. The rounds: each round's class, then each preferred class's round.
  const rounds = matchRounds(context, financing!, classes, draft);

  // Headers the reader doesn't know, outside the holdings (OX12).
  const knownIn = (list: readonly string[]) => (h: string) => list.includes(h);
  unrecognized(summary, sumH.cells, knownIn(OCX_HEADERS["Summary Snapshot"]!), draft);
  const voting = (h: string) => classes.some((c) => h === `${c.name} (outstanding)`);
  const holderHeaders = OCX_HEADERS["Stakeholder Snapshot"]!;
  unrecognized(holdersTab, holdH.cells.filter((c) => c.column < from || c.column >= to), (h) => holderHeaders.includes(h) || OCX_VOTING.includes(h) || OCX_ADDITIONAL.includes(h) || voting(h), draft);
  for (const t of tables.values()) unrecognized(context, t.header?.cells, knownIn(OCX_HEADERS.Context!), draft);

  // 7. The rows, tab by tab in the workbook's order.
  const classTotals = new Map<ShareClass, Decimal | undefined>();
  const preferences = new Map<ShareClass, Decimal | undefined>();
  // A holder's values by column; an `(as converted)` check left unreadable is undefined.
  const holdings = new Map<string, Map<number, Decimal | undefined>>();
  const pooled = new Map<number, Decimal | undefined>();
  const roundDates = new Map<ShareClass, string | undefined>();
  const plans: Decimal[] = [];
  let convertibles: ReturnType<typeof convertibleRows> = [];
  for (const tab of book.tabs) {
    if (tab === summary) {
      for (const c of classes) {
        classTotals.set(c, totalAt(summary, c.row, sumH.at("Outstanding Shares"), c.name, "its outstanding shares"));
        const lp = summary.cell(c.row, sumH.at("Liquidation Preference")!);
        preferences.set(c, isNA(lp) ? undefined : totalAt(summary, c.row, sumH.at("Liquidation Preference"), c.name, "its liquidation preference"));
      }
      convertibles = convertibleRows(summary, sumH, draft);
    } else if (tab === holdersTab) {
      for (const h of holderRows) holdings.set(h.id, readRow(h.row, h.name));
      if (poolRow !== undefined) for (const [column, v] of readRow(poolRow, poolLabel)) pooled.set(column, v);
    } else if (tab === context) {
      for (const r of rounds) roundDates.set(r.cls, readRound(context, financing!.header!, r, book, draft));
      const count = (title: string, key: string) => {
        const t = tables.get(title);
        if (t?.rows.length) draft.count(key, t.rows.length);
      };
      count("409A Valuations", "valuations_409a");
      count("Stock Plan History", "stock_plan_history");
      for (const row of details!.rows) {
        const plan = context.text(row, details!.header!.at("Plan Name")!);
        if (!plan) continue;
        draft.count("stock_plans");
        const rsus = numberAt(context.cell(row, details!.header!.at("Outstanding RSUs")!), plan, "its outstanding RSUs", true);
        if (rsus?.gt(0)) unsupported("rsus_not_separated", plan, "RSUs the per-holder tab doesn't tell apart from options");
        plans.push(numberAt(context.cell(row, details!.header!.at("Shares Available for Grant")!), plan, "its shares available for grant", true) ?? ZERO);
      }
      count("Split/Combination Adjustment", "split_adjustments");
      count("Shareholder Groups", "shareholder_groups");
    }
  }

  /**
   * A holder row's holdings, column by column, left to right: whole shares. An `(as converted)` value is a check, not
   * a holding (OX14), so the export may round it, and one that's blank, "N/A" or a formula with no saved value skips
   * that holder's check, as a total's would.
   */
  function readRow(row: number, subject: string): Map<number, Decimal | undefined> {
    const values = new Map<number, Decimal | undefined>();
    for (const c of columns) {
      const cell = holdersTab.cell(row, c.column);
      if (c.kind === "converted") {
        const skipped = isBlank(cell) || isNA(cell) || (cell!.formula && cell!.text === "");
        values.set(c.column, skipped ? undefined : numberAt(cell, subject, `its ${c.text}`));
      } else values.set(c.column, numberAt(cell, subject, `its ${c.text}`, true) ?? ZERO);
    }
    return values;
  }

  // 8. The checks: totals with a saved value, each holder's (as converted), each liquidation preference, then the pool.
  const all = [...holdings.values(), ...(poolRow === undefined ? [] : [pooled])];
  if (totalRow !== undefined) {
    for (const c of columns) {
      const total = totalAt(holdersTab, totalRow, c.column, `${holdersTab.name}: ${c.text}`, "its total");
      // A column's total isn't checked where one of its values was skipped.
      if (total === undefined || all.some((m) => m.has(c.column) && m.get(c.column) === undefined)) continue;
      const added = sum(all.map((m) => m.get(c.column) ?? ZERO));
      if (!total.eq(added)) malformed("total_mismatch", `${holdersTab.name}: ${c.text}`, `the total, ${written(total)}, isn't its rows' ${written(added)}`);
    }
  }
  for (const c of classes) {
    const total = classTotals.get(c);
    const own = columns.find((x) => x.kind === "class" && x.cls === c)!;
    const held = sum([...holdings.values()].map((m) => m.get(own.column)!));
    if (total !== undefined && !total.eq(held)) malformed("total_mismatch", c.name, `the Summary gives ${written(total)} outstanding, and its holders hold ${written(held)}`);
  }
  for (const h of holderRows) {
    for (const conv of columns.filter((x) => x.kind === "converted")) {
      const t = conv.cls!.terms!;
      if (!t.original_issue_price || !t.conversion_price) continue;
      const own = columns.find((x) => x.kind === "class" && x.cls === conv.cls)!;
      const out = holdings.get(h.id)!.get(own.column)!;
      const converted = holdings.get(h.id)!.get(conv.column);
      if (converted === undefined) continue;
      const want = out.times(t.original_issue_price).div(t.conversion_price);
      if (converted.minus(want).abs().gte(1)) {
        malformed("holdings_mismatch", h.name, `its ${conv.text} isn't within a share of its outstanding shares as converted`);
      }
    }
  }
  for (const c of classes.filter((x) => x.kind === "preferred")) {
    const lp = preferences.get(c);
    const t = c.terms!;
    if (lp === undefined || !t.original_issue_price || !t.preference_multiple) continue;
    const own = columns.find((x) => x.kind === "class" && x.cls === c)!;
    const out = sum([...holdings.values()].map((m) => m.get(own.column)!));
    const want = out.times(t.original_issue_price).times(t.preference_multiple);
    if (lp.minus(want).abs().gte("0.01")) malformed("liquidation_preference_mismatch", c.name, `the Summary's ${written(lp)} isn't ${written(out)} × ${t.original_issue_price} × ${t.preference_multiple}`);
  }
  const options = columns.filter((x) => x.kind === "option");
  draft.pool = sum(options.map((o) => pooled.get(o.column) ?? ZERO));
  if (!draft.pool.eq(sum(plans))) malformed("pool_mismatch", poolLabel, `the pool row gives ${written(draft.pool)}, Context's plan details ${written(sum(plans))}`);

  // The cap table. A column no holder holds anything in makes no class; those that do are numbered in order (OX14).
  for (const h of holderRows) {
    for (const c of columns.filter((x) => x.kind === "class")) draft.hold(h.id, c.cls!.id, holdings.get(h.id)!.get(c.column)!);
  }
  const holds = (c: Column) => holderRows.some((h) => holdings.get(h.id)!.get(c.column)!.gt(0));
  const optionLike = [...options, ...columns.filter((x) => x.kind === "awards")].filter(holds);
  optionLike.forEach((c, i) => {
    const id = `options_${i + 1}`;
    draft.derived.push({ id, name: c.text, kind: "option", strike: null });
    draft.notes.add("no_strike_field", id);
    for (const h of holderRows) draft.hold(h.id, id, holdings.get(h.id)!.get(c.column)!);
  });
  columns.filter((x) => x.kind === "warrant").filter(holds).forEach((c, i) => {
    const id = `warrants_${i + 1}`;
    draft.derived.push({ id, name: `Warrants for ${c.cls!.name}`, kind: "warrant", strike: null, underlying: c.cls!.kind === "common" ? "common" : c.cls!.id });
    draft.notes.add("no_strike_field", id);
    for (const h of holderRows) draft.hold(h.id, id, holdings.get(h.id)!.get(c.column)!);
    draft.notes.add("warrant_counts_are_maximums");
  });
  for (const c of classes.filter((x) => x.kind === "preferred")) draft.notes.add("no_anti_dilution_field", c.id);
  // O14: series by their round's closing date, two on one day in Financing History's order; SAFEs and notes after, by the default.
  for (const r of rounds) {
    const date = roundDates.get(r.cls);
    draft.issued.push({ id: r.cls.id, series: true, ...(date ? { date } : {}) });
  }
  for (const r of convertibles) {
    if ((r.type === "Post-$ SAFEs" || r.type === "Pre-$ SAFEs") && r.count.gt(0)) safeFromRow(r, draft);
    else if (r.type === "Convertible Notes" && r.count.eq(1)) noteFromRow(r, draft);
  }
  return asOf;
}
