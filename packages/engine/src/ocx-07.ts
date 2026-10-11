// OCX 0.7, as one Mantle export lays it out (OX4, OX6–OX13): the summary and per-holder tabs, a ledger for each class,
// each plan, warrants and SAFEs, and Context. The checks run in OX13's order, each stopping at the first refusal.

import type { Decimal } from "decimal.js";

import { D, ZERO } from "./decimal.ts";
import {
  type Book, Header, type Tab, UNKNOWN, asOfOf, dateAt, headerRow, isBlank, label, malformed, normal, numberAt, requireHeaders, tablesOf, unsupported,
  written,
} from "./ocx-cells.ts";
import { OCX_ADDITIONAL, OCX_HEADERS, OCX_TITLES, OCX_VOTING } from "./ocx-headers.ts";
import { type Draft, type ShareClass, optionClass, sum } from "./ocx-import.ts";
import { headNotes } from "./ocx-notes.ts";
import { convertibleRows, discountAt, matchRounds, noteFromRow, readRound, summaryClasses, totalAt, unrecognized } from "./ocx-terms.ts";

const SUMMARY_NEEDS = ["Share Class", "Outstanding Shares", "Security Type", "# of Securities", "Outstanding Amount", "Discount", "Valuation Cap"];
const HOLDER_NEEDS = ["Stakeholder", "Stakeholder Group", "Total Stock (outstanding)"];
const WARRANT_NEEDS = ["Convertible Holder", "Warrant No.", "Series of Stock", "Price Per Share", "Expiration Date", "Display Status"];
const WARRANT_COUNTS = ["No. Maximum Warrant Shares Issuable", "No. Warrant Shares Exercised", "No. Warrant Shares Canceled"];
const SAFE_NEEDS = ["SAFE Holder", "SAFE No.", "Issue Date", "Investment Amount", "Valuation Cap", "Discount", "Valuation Method (Pre- or Post-Money)", "Display Status"];
const CLASS_LEDGER_NEEDS = ["Stockholder", "Issue Date", "Cert No.", "Cert. Transferred From", "Price", "Certificate Outstanding (Y/N)", "No. Shares Outstanding"];
const PLAN_LEDGER_NEEDS = ["Optionholder", "Cert No.", "Type", "Exercise Price", "Expiration Date", "Shares Outstanding from Original Grant", "Share Class", "Display Status"];

/** OX5: the share counts a ledger's `Total` row is checked under, where it has a saved value. */
const SHARE_TOTALS: Record<string, string[]> = {
  class: ["No. Shares Issued", "No. Shares Outstanding"],
  plan: [
    "Shares Granted", "Amount Exercised / Purchased", "Split Adjusted Amount Exercised / Purchased", "Amount Canceled / Repurchased",
    "Split Adjusted Amount Canceled / Repurchased", "Amount Expired", "Split Adjusted Amount Expired", "Shares Outstanding from Original Grant",
    "Split Adjusted Shares Outstanding",
  ],
  warrants: [...WARRANT_COUNTS, "Warrant Shares Outstanding"],
  safes: ["No. Shares Issued in Conversion"],
};

interface Ledger {
  tab: Tab;
  kind: "class" | "plan" | "warrants" | "safes";
  header: Header;
  cls?: ShareClass;
}

interface Certificate {
  holder: string;
  cls: ShareClass;
  shares: Decimal;
  price?: Decimal;
  transfer: boolean;
  date?: string;
}

interface Grant {
  holder: string;
  cert: string;
  shares: Decimal;
  strike: Decimal | "rsu";
  expires?: string;
}

interface Warrant {
  holder: string;
  number: string;
  cls: ShareClass;
  strike: Decimal;
  shares: Decimal;
  expires?: string;
}

interface Safe {
  holder: string;
  number: string;
  amount: Decimal;
  cap?: Decimal;
  kind?: "post" | "pre";
  discount: Decimal;
  date?: string;
}

/** A ledger's data rows: below its header row, to the `Total` row. */
function dataRows(tab: Tab, header: Header): number[] {
  const first = Math.min(...header.cells.map((c) => c.column));
  const rows: number[] = [];
  for (const row of tab.rowNumbers().filter((r) => r > header.row)) {
    if (label(tab.text(row, first)) === "total") break;
    rows.push(row);
  }
  return rows;
}

const totalRow = (tab: Tab, header: Header): number | undefined => {
  const first = Math.min(...header.cells.map((c) => c.column));
  return tab.rowNumbers().find((r) => r > header.row && label(tab.text(r, first)) === "total");
};

/** OX8, OX9: a ledger named for a class or a plan is known by its header row: its kind's first header, then two more of its kind's. */
function ledgerKind(tab: Tab): { kind: "class" | "plan"; header: Header } | undefined {
  for (const row of tab.rowNumbers()) {
    const h = new Header(tab, row);
    const first = h.cells[0]?.text;
    for (const [kind, lead, list] of [["class", "Stockholder", OCX_HEADERS["class ledger"]!], ["plan", "Optionholder", OCX_HEADERS["plan ledger"]!]] as const) {
      if (first === lead && h.cells.filter((c) => list.includes(c.text)).length >= 3) return { kind, header: h };
    }
  }
  return undefined;
}

/** A currency column, where the workbook has one, must say USD (OX8). */
function usd(tab: Tab, row: number, header: Header, column: string, subject: string): void {
  const at = header.at(column);
  if (at === undefined) return;
  const text = tab.text(row, at);
  if (text && text.toUpperCase() !== "USD") unsupported("currency", subject, `its amount is in ${text}; spillpoint pays in US dollars only`);
}

export function read07(book: Book, draft: Draft): string {
  // 2. The layout's named tabs, then the headers each needs.
  for (const name of ["Summary View", "Stakeholder View", "Warrants Ledger", "SAFEs Ledger", "Context"]) {
    if (!book.tab(name)) malformed("missing_tab", name, "the workbook has no such tab");
  }
  const summary = book.tab("Summary View")!;
  const holdersTab = book.tab("Stakeholder View")!;
  const warrantsTab = book.tab("Warrants Ledger")!;
  const safesTab = book.tab("SAFEs Ledger")!;
  const context = book.tab("Context")!;
  const sumH = requireHeaders(summary, headerRow(summary, SUMMARY_NEEDS), SUMMARY_NEEDS);
  const holdH = requireHeaders(holdersTab, headerRow(holdersTab, HOLDER_NEEDS), HOLDER_NEEDS);
  const warH = requireHeaders(warrantsTab, headerRow(warrantsTab, WARRANT_NEEDS), WARRANT_NEEDS);
  if (!warH.has("Warrant Shares Outstanding")) requireHeaders(warrantsTab, warH, WARRANT_COUNTS);
  const safeH = requireHeaders(safesTab, headerRow(safesTab, SAFE_NEEDS), SAFE_NEEDS);

  // 3. The as-of date, from the summary tab.
  const asOf = asOfOf(summary, book.dateSystem);

  // 4. The classes, and the holdings columns: those between `Stakeholder Group` and `Total Stock (outstanding)`.
  const classes = summaryClasses(summary, sumH, draft);
  headNotes(book, draft, classes);
  const from = holdH.at("Stakeholder Group")!;
  const to = holdH.at("Total Stock (outstanding)")!;
  const holdingCells = holdH.cells.filter((c) => c.column > from && c.column < to);
  const classColumn = new Map<ShareClass, number>();
  for (const c of classes) {
    const cell = holdingCells.find((x) => x.text === `${c.name} Stock`);
    if (!cell) unsupported("unknown_class_heading", c.name, `the Stakeholder View has no "${c.name} Stock" column`);
    classColumn.set(c, cell!.column);
  }
  const planColumns: { plan: string; column: number }[] = [];
  let warrantColumn: number | undefined;
  let awardsColumn: number | undefined;
  for (const cell of holdingCells) {
    if ([...classColumn.values()].includes(cell.column)) continue;
    if (cell.text.endsWith(" Options")) planColumns.push({ plan: cell.text.slice(0, -" Options".length), column: cell.column });
    else if (cell.text === "Stock Warrants") warrantColumn = cell.column;
    else if (cell.text === "Non-Plan Awards") awardsColumn = cell.column;
    else unsupported("unknown_holdings_header", cell.text, "a holdings column of a kind the reader doesn't know");
  }

  // 5. The holders, then the pool's row and the totals' row.
  const nameColumn = holdH.at("Stakeholder")!;
  const holderRows: { row: number; name: string }[] = [];
  let poolRow: number | undefined;
  let holdTotalRow: number | undefined;
  for (const row of holdersTab.rowNumbers().filter((r) => r > holdH.row)) {
    const name = holdersTab.text(row, nameColumn);
    if (!name) continue;
    const l = label(name);
    if (l === "total") {
      holdTotalRow = row;
      break;
    }
    if (l === "options remaining for issuance") {
      poolRow = row;
      continue;
    }
    if (draft.byName.has(name)) malformed("duplicate_stakeholder", name, "two holder rows have this name");
    draft.addHolder(name);
    holderRows.push({ row, name });
  }
  draft.count("stakeholders", holderRows.length);
  if (poolRow !== undefined) draft.count("pool_rows");

  // 6. The ledgers: each class ledger's class, each class's ledger, then each ledger's headers.
  const named = new Set(["Summary View", "Stakeholder View", "Warrants Ledger", "SAFEs Ledger", "Context"]);
  const ledgers: Ledger[] = [];
  for (const tab of book.tabs.filter((t) => !named.has(t.name))) {
    const found = ledgerKind(tab);
    if (found) ledgers.push({ tab, kind: found.kind, header: found.header });
  }
  for (const l of ledgers.filter((x) => x.kind === "class")) {
    const byName = classes.find((c) => normal(l.tab.name) === `${c.name} Ledger`);
    const titles = [...l.tab.texts()].filter((t) => t.row < l.header.row).map((t) => normal(t.text));
    const byTitle = classes.filter((c) => titles.some((t) => t.endsWith(` ${c.name} Ledger`)));
    const cls = byName ?? (byTitle.length === 1 ? byTitle[0] : undefined);
    if (cls) l.cls = cls;
    else malformed("ledger_without_class", l.tab.name, "neither the tab's name nor its title names a class the Summary lists");
  }
  for (const c of classes) if (!ledgers.some((l) => l.cls === c)) malformed("missing_tab", `${c.name} Ledger`, "the class has no ledger");
  for (const l of ledgers) requireHeaders(l.tab, l.header, l.kind === "class" ? CLASS_LEDGER_NEEDS : PLAN_LEDGER_NEEDS);
  ledgers.push({ tab: warrantsTab, kind: "warrants", header: warH }, { tab: safesTab, kind: "safes", header: safeH });

  // Headers the reader doesn't know, outside the holdings (OX12).
  const knownIn = (list: readonly string[]) => (h: string) => list.includes(h);
  unrecognized(summary, sumH.cells, knownIn(OCX_HEADERS["Summary View"]!), draft);
  const holderHeaders = OCX_HEADERS["Stakeholder View"]!;
  const voting = (h: string) => classes.some((c) => h === `${c.name} Stock (outstanding)`);
  unrecognized(holdersTab, holdH.cells.filter((c) => c.column < from || c.column >= to), (h) => holderHeaders.includes(h) || OCX_VOTING.includes(h) || OCX_ADDITIONAL.includes(h) || voting(h), draft);
  for (const l of ledgers) {
    const list = { class: "class ledger", plan: "plan ledger", warrants: "Warrants Ledger", safes: "SAFEs Ledger" }[l.kind];
    unrecognized(l.tab, l.header.cells, knownIn(OCX_HEADERS[list]!), draft);
  }
  const contextTables = tablesOf(context, OCX_TITLES);
  for (const t of contextTables.values()) unrecognized(context, t.header?.cells, knownIn(OCX_HEADERS["Context 0.7"]!), draft);
  const financing = contextTables.get("Financing History");
  if (financing?.header) requireHeaders(context, financing.header, ["Round"]);
  const rounds = financing?.header ? matchRounds(context, financing, classes, draft) : [];

  // 7. The rows, tab by tab in the workbook's order.
  const classTotals = new Map<ShareClass, Decimal | undefined>();
  const certificates: Certificate[] = [];
  const grants: Grant[] = [];
  const warrants: Warrant[] = [];
  const safes: Safe[] = [];
  let convertibles: ReturnType<typeof convertibleRows> = [];
  const plans = new Map<string, Decimal>();
  const holderOf = (name: string, subject: string) => {
    const h = draft.byName.get(name);
    if (!h) malformed("unknown_stakeholder", subject, `"${name}" isn't on the Stakeholder View`);
    return h!.id;
  };
  const roundDates = new Map<ShareClass, string | undefined>();
  for (const tab of book.tabs) {
    if (tab === summary) {
      for (const c of classes) classTotals.set(c, totalAt(summary, c.row, sumH.at("Outstanding Shares"), c.name, "its outstanding shares"));
      convertibles = convertibleRows(summary, sumH, draft);
      for (const r of convertibles) if (r.type === "Convertible Notes" && r.count.eq(1)) noteFromRow(r, draft);
      continue;
    }
    const ledger = ledgers.find((l) => l.tab === tab);
    if (ledger) {
      readLedger(ledger);
      continue;
    }
    if (tab === context) readContext();
  }

  function readLedger(l: Ledger): void {
    const at = (row: number, h: string) => (l.header.at(h) === undefined ? undefined : l.tab.cell(row, l.header.at(h)!));
    const text = (row: number, h: string) => (l.header.at(h) === undefined ? "" : l.tab.text(row, l.header.at(h)!));
    for (const row of dataRows(l.tab, l.header)) {
      if (l.kind === "class") {
        const cert = text(row, "Cert No.");
        const who = text(row, "Stockholder");
        if (!who && !cert) continue;
        const holder = holderOf(who, cert);
        draft.count("certificates");
        // OX8: "Y" is outstanding; "N" is set aside, with nothing more read.
        const yn = label(text(row, "Certificate Outstanding (Y/N)"));
        if (yn !== "y" && yn !== "n") unsupported("unknown_status", cert, `its "Certificate Outstanding (Y/N)" is neither Y nor N`);
        if (yn === "n") continue;
        const preferred = l.cls!.kind === "preferred";
        const date = preferred ? dateAt(at(row, "Issue Date"), book.dateSystem, cert, "its issue date") : undefined;
        const price = preferred ? numberAt(at(row, "Price"), cert, "its price") : undefined;
        const shares = numberAt(at(row, "No. Shares Outstanding"), cert, "its outstanding shares", true);
        if (shares === undefined) malformed("bad_number", cert, "its outstanding shares are blank");
        usd(l.tab, row, l.header, "Price Per Share Currency", cert);
        certificates.push({
          holder, cls: l.cls!, shares: shares!, ...(price ? { price } : {}), transfer: text(row, "Cert. Transferred From") !== "",
          ...(date && date !== UNKNOWN ? { date } : {}),
        });
      } else if (l.kind === "plan") {
        const cert = text(row, "Cert No.");
        const who = text(row, "Optionholder");
        if (!who && !cert) continue;
        const holder = holderOf(who, cert);
        draft.count("plan_grants");
        // OX9: a grant's outstanding count says whether it's read; above 0 its status must say so.
        const adjusted = at(row, "Split Adjusted Shares Outstanding");
        const shares = isBlank(adjusted)
          ? numberAt(at(row, "Shares Outstanding from Original Grant"), cert, "its outstanding shares", true)
          : numberAt(adjusted, cert, "its split-adjusted outstanding shares", true);
        if (shares === undefined) malformed("bad_number", cert, "its outstanding shares are blank");
        if (shares!.isZero()) continue;
        if (label(text(row, "Display Status")) !== "outstanding") malformed("status_mismatch", cert, `it has ${written(shares!)} outstanding but says "${text(row, "Display Status")}"`);
        const type = label(text(row, "Type"));
        if (type === "sar") unsupported("stock_appreciation_right", cert, "a stock appreciation right, which pays cash spillpoint doesn't model");
        let strike: Decimal | "rsu" = "rsu";
        if (type !== "rsu") {
          const original = numberAt(at(row, "Exercise Price"), cert, "its exercise price");
          const split = numberAt(at(row, "Split Adjusted Exercise Price"), cert, "its split-adjusted exercise price");
          const s = split ?? original;
          if (s === undefined) malformed("bad_number", cert, "its exercise price is blank");
          strike = s!;
        }
        const expires = dateAt(at(row, "Expiration Date"), book.dateSystem, cert, "its expiration date");
        const shareClass = text(row, "Share Class");
        const cls = classes.find((c) => c.name === shareClass);
        if (!cls) malformed("grant_for_unknown_class", cert, `its share class, "${shareClass}", isn't one the Summary lists`);
        if (cls!.kind === "preferred") unsupported("grant_of_preferred", cert, "a grant over a preferred class; spillpoint's options are over common");
        usd(l.tab, row, l.header, "Exercise Currency", cert);
        if (strike === "rsu") draft.notes.add("rsu_as_option", cert);
        grants.push({ holder, cert, shares: shares!, strike, ...(expires && expires !== UNKNOWN ? { expires } : {}) });
      } else if (l.kind === "warrants") {
        const number = text(row, "Warrant No.");
        const who = text(row, "Convertible Holder");
        if (!who && !number) continue;
        const holder = holderOf(who, number);
        draft.count("warrants");
        let shares: Decimal | undefined;
        if (l.header.has("Warrant Shares Outstanding")) shares = numberAt(at(row, "Warrant Shares Outstanding"), number, "its outstanding warrant shares", true);
        else {
          const [max, exercised, canceled] = WARRANT_COUNTS.map((h) => numberAt(at(row, h), number, h, true) ?? ZERO) as [Decimal, Decimal, Decimal];
          shares = max.minus(exercised).minus(canceled);
        }
        if (shares === undefined) malformed("bad_number", number, "its outstanding warrant shares are blank");
        if (shares!.isZero()) continue;
        if (label(text(row, "Display Status")) !== "outstanding") malformed("status_mismatch", number, `it has ${written(shares!)} outstanding but says "${text(row, "Display Status")}"`);
        const series = text(row, "Series of Stock");
        const cls = classes.find((c) => c.name === series);
        if (!cls) unsupported("warrant_for_unknown_class", number, `a warrant for "${series}", a class the workbook doesn't have`);
        const strike = numberAt(at(row, "Price Per Share"), number, "its price per share");
        if (strike === undefined) malformed("bad_number", number, "its price per share is blank");
        const expires = dateAt(at(row, "Expiration Date"), book.dateSystem, number, "its expiration date");
        usd(l.tab, row, l.header, "Exercise Currency", number);
        warrants.push({ holder, number, cls: cls!, strike: strike!, shares: shares!, ...(expires && expires !== UNKNOWN ? { expires } : {}) });
      } else {
        const number = text(row, "SAFE No.");
        const who = text(row, "SAFE Holder");
        if (!who && !number) continue;
        const holder = holderOf(who, number);
        draft.count("safes");
        // OX11: the status says whether it's read: converted and cancelled SAFEs are set aside.
        const status = label(text(row, "Display Status"));
        if (["converted", "cancelled", "canceled"].includes(status)) continue;
        if (status !== "outstanding") unsupported("unknown_status", number, `its status, "${text(row, "Display Status")}", isn't one the reader knows`);
        const date = dateAt(at(row, "Issue Date"), book.dateSystem, number, "its issue date");
        const amount = numberAt(at(row, "Investment Amount"), number, "its investment amount");
        if (amount === undefined) malformed("bad_number", number, "its investment amount is blank");
        const cap = numberAt(at(row, "Valuation Cap"), number, "its valuation cap");
        const discount = discountAt(l.tab, row, l.header.at("Discount"), number) ?? ZERO;
        const method = text(row, "Valuation Method (Pre- or Post-Money)").toLowerCase().replace(/[\s-]+/g, "");
        usd(l.tab, row, l.header, "Investment Amount Currency", number);
        usd(l.tab, row, l.header, "Valuation Cap Currency", number);
        safes.push({
          holder, number, amount: amount!, ...(cap ? { cap } : {}), discount, ...(date && date !== UNKNOWN ? { date } : {}),
          ...(method === "postmoney" ? { kind: "post" as const } : method === "premoney" ? { kind: "pre" as const } : {}),
        });
      }
    }
  }

  function readContext(): void {
    for (const r of rounds) roundDates.set(r.cls, readRound(context, financing!.header!, r, book, draft));
    const count = (title: string, key: string) => {
      const t = contextTables.get(title);
      if (t?.rows.length) draft.count(key, t.rows.length);
    };
    count("Stock Plan History", "stock_plan_history");
    count("409A Valuations", "valuations_409a");
    count("Split/Combination Adjustment", "split_adjustments");
    count("Shareholder Groups", "shareholder_groups");
    const details = contextTables.get("Stock Plan Details");
    if (details?.header) {
      for (const row of details.rows) {
        const plan = context.text(row, details.header.at("Plan Name") ?? -1);
        if (!plan) continue;
        draft.count("stock_plans");
        const available = numberAt(context.cell(row, details.header.at("Shares Available for Grant") ?? -1), plan, "its shares available for grant", true);
        if (available !== undefined) plans.set(plan, available);
      }
    }
  }

  // 8. The per-holder tab's holdings, and the checks between tabs.
  const value = (row: number, column: number | undefined, subject: string) =>
    column === undefined ? ZERO : numberAt(holdersTab.cell(row, column), subject, "a holding on the Stakeholder View", true) ?? ZERO;
  if (awardsColumn !== undefined) {
    for (const h of holderRows) {
      if (value(h.row, awardsColumn, h.name).gt(0)) unsupported("non_plan_awards", h.name, "non-plan awards, which no ledger the reader knows holds");
    }
  }
  // Totals with a saved value, where they count shares (OX5).
  if (holdTotalRow !== undefined) {
    for (const cell of holdingCells) {
      const total = totalAt(holdersTab, holdTotalRow, cell.column, `${holdersTab.name}: ${cell.text}`, "its total");
      if (total === undefined) continue;
      const rows = [...holderRows.map((h) => h.row), ...(poolRow === undefined ? [] : [poolRow])];
      const added = sum(rows.map((r) => value(r, cell.column, holdersTab.name)));
      if (!total.eq(added)) malformed("total_mismatch", `${holdersTab.name}: ${cell.text}`, `the total, ${written(total)}, isn't its rows' ${written(added)}`);
    }
  }
  for (const l of ledgers) {
    const tr = totalRow(l.tab, l.header);
    if (tr === undefined) continue;
    for (const h of SHARE_TOTALS[l.kind]!) {
      const column = l.header.at(h);
      const total = totalAt(l.tab, tr, column, `${l.tab.name}: ${h}`, "its total");
      if (total === undefined) continue;
      const added = sum(dataRows(l.tab, l.header).map((r) => numberAt(l.tab.cell(r, column!), `${l.tab.name}: ${h}`, h) ?? ZERO));
      if (!total.eq(added)) malformed("total_mismatch", `${l.tab.name}: ${h}`, `the total, ${written(total)}, isn't its rows' ${written(added)}`);
    }
  }
  for (const c of classes) {
    const total = classTotals.get(c);
    const held = sum(certificates.filter((x) => x.cls === c).map((x) => x.shares));
    if (total !== undefined && !total.eq(held)) malformed("total_mismatch", c.name, `the Summary gives ${written(total)} outstanding, and its ledger's certificates ${written(held)}`);
  }
  // Each holder's holdings against the ledgers, before any grant or warrant is left out as expired (OX9).
  for (const h of holderRows) {
    const id = draft.byName.get(h.name)!.id;
    for (const c of classes) {
      const held = sum(certificates.filter((x) => x.holder === id && x.cls === c).map((x) => x.shares));
      if (!value(h.row, classColumn.get(c), h.name).eq(held)) malformed("holdings_mismatch", h.name, `the Stakeholder View's ${c.name} isn't what the ledger's certificates make up`);
    }
    const options = sum(planColumns.map((p) => value(h.row, p.column, h.name)));
    if (!options.eq(sum(grants.filter((g) => g.holder === id).map((g) => g.shares)))) malformed("holdings_mismatch", h.name, "the Stakeholder View's options aren't what the plan ledgers' grants make up");
    if (!value(h.row, warrantColumn, h.name).eq(sum(warrants.filter((w) => w.holder === id).map((w) => w.shares)))) {
      malformed("holdings_mismatch", h.name, "the Stakeholder View's warrants aren't what the Warrants Ledger makes up");
    }
  }
  // The pool, plan by plan, against Context's details where they're there (OX9).
  for (const p of planColumns) {
    const pooled = poolRow === undefined ? ZERO : value(poolRow, p.column, "Options remaining for issuance");
    draft.pool = draft.pool.plus(pooled);
    const available = plans.get(p.plan);
    if (available !== undefined && !available.eq(pooled)) malformed("pool_mismatch", p.plan, `the pool row gives ${written(pooled)}, Context's plan details ${written(available)}`);
  }
  // The convertibles table, where it has rows, by count and amount for each kind; a SAFE of blank kind with the SAFE rows together (OX11).
  if (convertibles.length) {
    const rows = (types: string[]) => convertibles.filter((r) => types.includes(r.type));
    const check = (label: string, rs: typeof convertibles, fs: Safe[]) => {
      const count = sum(rs.map((r) => r.count));
      const amount = sum(rs.map((r) => r.amount));
      if (!count.eq(fs.length) || !amount.eq(sum(fs.map((f) => f.amount)))) malformed("convertibles_mismatch", label, "the Summary's convertibles table doesn't agree with the SAFEs Ledger");
    };
    if (safes.some((f) => !f.kind)) check(rows(["Post-$ SAFEs", "Pre-$ SAFEs"])[0]?.type ?? "Post-$ SAFEs", rows(["Post-$ SAFEs", "Pre-$ SAFEs"]), safes);
    else {
      check("Post-$ SAFEs", rows(["Post-$ SAFEs"]), safes.filter((f) => f.kind === "post"));
      check("Pre-$ SAFEs", rows(["Pre-$ SAFEs"]), safes.filter((f) => f.kind === "pre"));
    }
  }

  // Then what expired before the as-of date is left out and listed (OX9, OX10); on the date itself it's still outstanding.
  const kept = grants.filter((g) => {
    if (g.expires && g.expires < asOf) {
      draft.notes.add("expired_option_left_out", g.cert);
      return false;
    }
    return true;
  });
  const keptWarrants = warrants.filter((w) => {
    if (w.expires && w.expires < asOf) {
      draft.notes.add("expired_warrant_left_out", w.number);
      return false;
    }
    return true;
  });

  // The cap table: classes, their terms, positions; option classes by strike; warrants by class and strike.
  for (const c of certificates) draft.hold(c.holder, c.cls.id, c.shares);
  const preferred = classes.filter((c) => c.kind === "preferred");
  if (preferred.length && !financing?.header) draft.notes.add("no_financing_history");
  for (const c of preferred) {
    if (!c.terms) {
      // OX7: no Financing History: the issue price from the ledger, when every outstanding certificate not made by a transfer has one.
      const prices = certificates.filter((x) => x.cls === c && !x.transfer && x.price).map((x) => written(x.price!));
      const one = prices.length > 0 && prices.every((p) => p === prices[0]);
      if (one) draft.notes.add("issue_price_from_ledger", c.id);
      c.terms = { original_issue_price: one ? prices[0]! : null, conversion_price: null, preference_multiple: null, participation: null, cap_multiple: null };
    }
    draft.notes.add("no_anti_dilution_field", c.id);
    // O14: a series by the earliest issue date in its ledger, or its round's when there's a Financing History.
    const dates = certificates.filter((x) => x.cls === c && x.date).map((x) => x.date!).sort();
    const date = roundDates.has(c) ? roundDates.get(c) : dates[0];
    draft.issued.push({ id: c.id, series: true, ...(date ? { date } : {}) });
  }
  const strikes = [...new Set(kept.filter((g) => g.strike !== "rsu").map((g) => written(g.strike as Decimal)))].sort((a, b) => new D(a).cmp(new D(b)));
  for (const s of strikes) draft.derived.push(optionClass(new D(s)));
  if (kept.some((g) => g.strike === "rsu")) draft.derived.push({ id: "rsus", name: "RSUs (no strike)", kind: "option", strike: "0" });
  for (const g of kept) draft.hold(g.holder, g.strike === "rsu" ? "rsus" : `options_${written(g.strike)}`, g.shares);
  for (const w of keptWarrants) {
    const under = w.cls.kind === "common" ? "common" : w.cls.id;
    const id = `warrants_${under}_${written(w.strike)}`;
    if (!draft.derived.some((s) => s.id === id)) {
      draft.derived.push({ id, name: `Warrants for ${w.cls.name} ($${written(w.strike)} strike)`, kind: "warrant", strike: written(w.strike), underlying: under });
    }
    draft.hold(w.holder, id, w.shares);
  }
  if (keptWarrants.length) draft.notes.add("warrant_counts_are_maximums");
  for (const f of safes) {
    const id = draft.safeId(f.holder, "safe");
    const amount = written(f.amount);
    const cap = f.cap ? written(f.cap) : null;
    draft.safes.push({
      id, holder: f.holder, purchase_amount: amount,
      // As OCF's import: a SAFE with no cap has no cap fields (O8).
      ...(!cap ? {} : f.kind === "post" ? { post_money_cap: cap } : f.kind === "pre" ? { pre_money_cap: cap } : { valuation_cap: cap, cap_type: null }),
      discount: written(f.discount),
    });
    draft.issued.push({ id, series: false, ...(f.date ? { date: f.date } : {}) });
  }
  // Notes from the convertibles table come after the SAFEs in the issue order: they have no date.
  draft.issued.sort((a, b) => Number(a.id.startsWith("note_")) - Number(b.id.startsWith("note_")));
  return asOf;
}
