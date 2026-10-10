// The cell-kinds script's report (0.6.0, 06c; ASSUMPTIONS OX2): what kinds of cell an OCX workbook's columns hold,
// with counts, so a real export can settle what its header rows can't (values or formulas, how dates are written, how
// many digits a number has) without anyone sending the file. Run by scripts/ocx-structure.mjs. It knows OCX 0.3 to 0.5
// from the Coalition's reference workbooks, and 0.7 from one Mantle export (06d), by tab names and headers only.
//
// Under O15's rule: counts and kinds, and the format's own tab names and headers, which are its interface. Never a
// value, never a header the company wrote (a class or a plan named in a heading or a tab's name), and nothing from the
// Additional Information block or a column of a holder's personal details.

import type { OcxCell, OcxSheet, OcxWorkbook } from "spillpoint";

import { columnLetters } from "./xlsx.ts";

/**
 * OCX's tabs by name: 0.3 to 0.5's, as the Coalition's reference workbooks name them, and 0.7's, as Mantle's export
 * does. 0.7 also has a ledger for each stock class and each plan, named for it, so known by its headers instead.
 */
const TABS = [
  "Summary Snapshot", "Stakeholder Snapshot", "Detailed Snapshot", "Voting by SH Group", "Context", "Summary View", "Stakeholder View", "Warrants Ledger",
  "SAFEs Ledger",
];

/**
 * Context's Financing History, each series' terms, in 0.4 and 0.5. Looked for in 0.7 too: the one 0.7 export seen,
 * with no preferred stock, hasn't it, and whether one with preferred stock does is an open question.
 */
const FINANCING = [
  "Round", "Initial Closing Date", "Most Recent Closing Date", "Original Issue Price", "Adjusted Conversion Price", "Conversion Ratio", "Liquidation Multiple",
  "Participating (Y/N)", "Participation Cap",
];
const PLAN_DETAILS = ["Total Reserved", "Total Granted", "Outstanding Shares/Exercised Options", "Outstanding Options", "Outstanding RSUs", "Shares Returned to Plan", "Shares Available for Grant"];

/** The headers each kind of tab has: the ones a reader matches, and the script looks for. */
const HEADERS: Record<string, readonly string[]> = {
  "Summary Snapshot": [
    "Share Class", "Shares Authorized/ Reserved", "Outstanding Shares", "Fully Diluted Shares", "% Fully Diluted", "Liquidation Preference",
    "Voting Multiplier", "Voting Power", "Voting %", "Security Type", "# of Securities", "Outstanding Amount", "Discount", "Valuation Cap",
  ],
  "Stakeholder Snapshot": [
    "Stakeholder", "Stakeholder Group", "Non-Plan Awards", "Total Stock (outstanding)", "Total Stock (as converted)", "Total Stock % (as converted)",
    "Fully Diluted Shares", "Fully Diluted %",
  ],
  "Detailed Snapshot": [
    "Shareholder", "Shareholder Group", "Options", "Common Stock Warrants", "Total Stock (as converted)", "Total Stock % (as converted)",
    "Fully Diluted Shares", "Fully Diluted %",
  ],
  Context: [
    ...FINANCING, "Valuation Date", "Price Per Share (Common)", "Options Outstanding at Valuation", "Valuation Firm", "Plan Name", "Date", "Action",
    "Stockholder Approval Date", "Number of Shares", "Total Shares Reserved", ...PLAN_DETAILS, "Classes/Series Affected", "Original Shares", "Resulting Shares",
  ],
  "Summary View": [
    "Share Class", "Shares Authorized/Reserved", "Outstanding Shares", "Fully Diluted Shares", "% Fully Diluted", "Liquidation Preference",
    "Voting Multiplier", "Voting Power", "Voting %", "Security Type", "# of Securities", "Outstanding Amount", "Discount", "Valuation Cap", "MFN",
  ],
  "Stakeholder View": [
    "Stakeholder", "Stakeholder Group", "Stock Warrants", "Non-Plan Awards", "Total Stock (outstanding)", "Total Stock (as converted)",
    "Total Stock % (as converted)", "Fully Diluted Shares", "Fully Diluted %",
  ],
  "Context 0.7": [...FINANCING, "Plan Name", "Date", "Action", "Stockholder Approval Date", "No. Shares", "Total Shares Reserved", ...PLAN_DETAILS],
  "class ledger": [
    "Stockholder", "Issue Date", "Board Approval Date", "Cert No.", "Cert. Transferred From", "Cert. Transferred To", "No. Shares Issued",
    "Basis of Issuance", "Price", "Cash Paid", "Debt Cancelled", "Cancellation Date", "Reason for Cancellation", "Certificate Outstanding (Y/N)",
    "No. Shares Outstanding", "Vesting Commencement Date", "Vesting Schedule", "Shares Vested", "Acceleration", "Federal Exemption", "Plan Security (Y/N)",
    "State of Residence", "Rule 144 Date", "Termination Date", "Comments", "Fully Diluted Ownership", "Equity Plan Name", "Price Per Share Currency",
    "Consolidation Currency", "Originating From", "Resulting Securities",
  ],
  "plan ledger": [
    "Optionholder", "Grant Date", "Board Approval Date", "Cert No.", "Shares Granted", "Type", "Exercisability", "Exercise Price",
    "Split Adjusted Exercise Price", "Total Purchase Price", "Vesting Commencement Date", "Vesting Schedule", "Acceleration", "Amount Exercised / Purchased",
    "Split Adjusted Amount Exercised / Purchased", "Exercise Date(s)", "Amount Canceled / Repurchased", "Split Adjusted Amount Canceled / Repurchased",
    "Cancellation / Repurchase Date", "Amount Expired", "Split Adjusted Amount Expired", "Expiration Date", "Immediate Vest Amount",
    "Vesting Length (months)", "Months from Grant Date", "Cliff Duration (months)", "Shares Outstanding from Original Grant",
    "Shares Vested from Original Grant", "Split Adjusted Shares Outstanding", "Split Adjusted Shares Vested", "% Vested",
    "Shares Unvested from Original Grant", "Split Adjusted Shares Unvested", "% Unvested", "State of Residence", "Termination Date", "Comments",
    "Share Class", "Display Status", "Stakeholder Relationship", "Exercise Currency", "Last Date to Exercise", "Resulting Securities",
  ],
  "Warrants Ledger": [
    "Convertible Holder", "Warrant No.", "Issue Date", "Board Approval Date", "No. Maximum Warrant Shares Issuable",
    "Original No. Maximum Warrant Shares Issuable (pre-split)", "Series of Stock", "Basis of Issuance", "Price Per Share",
    "Original Price Per Share (pre-split)", "No. Warrant Shares Exercised", "Original No. Warrant Shares Exercised (pre-split)", "Exercise Date(s)",
    "No. Warrant Shares Canceled", "Original No. Warrant Shares Canceled (pre-split)", "Cancellation Date", "Expiration Date", "State of Residence",
    "Federal Exemption", "Comments", "Display Status", "Stakeholder Relationship", "Exercise Currency", "Consideration", "Consideration Currency",
    "Vesting Schedule", "Vesting Commencement Date", "Warrant Shares Outstanding", "Shares Vested from Original Warrant", "Unvested Outstanding Quantity",
    "Resulting Securities",
  ],
  "SAFEs Ledger": [
    "SAFE Holder", "SAFE No.", "Issue Date", "Board Approval Date", "Investment Amount", "Basis of Issuance", "Valuation Cap", "Discount",
    "Valuation Method (Pre- or Post-Money)", "Conversion Date", "No. Shares Issued in Conversion", "Original No. Shares Issued in Conversion (pre-split)",
    "Conversion Price Per Share", "Original Conversion Price Per Share (pre-split)", "Cancellation Date", "Class of Converted Securities",
    "State of Residence", "Federal Exemption", "Comments", "Display Status", "Stakeholder Relationship", "Investment Amount Currency",
    "Valuation Cap Currency", "Most Favored Nation", "Originating From", "Resulting Securities",
  ],
};

/** 0.3's headers where 0.4 renamed them: recognized, but not looked for. */
const OLDER: Record<string, readonly string[]> = { "Summary Snapshot": ["Shares Authorized", "Amount"], Context: ["Split Date"] };

/** A ledger named for a class or a plan, known by the first header of its header row (and two more of its kind's). */
const NAMED_LEDGERS: [string, string][] = [["class ledger", "Stockholder"], ["plan ledger", "Optionholder"]];

/** The per-holder tabs, whose company-named headings are counted by the kind of column they head. */
const PER_HOLDER = ["Stakeholder Snapshot", "Detailed Snapshot", "Stakeholder View"];

/** A block on the per-holder tab that's set aside: voting power by holder. */
const VOTING = ["All Common", "All Preferred (as converted)"];
/**
 * The Additional Information block on the per-holder tab: holders' details, which nothing reads. Its last header,
 * "Notes", is also the footnotes' title, so the block is known by the others.
 */
const ADDITIONAL = [
  "Primary Stakeholder Type", "Secondary Stakeholder Types", "Mailing Address Line 1", "Mailing Address Line 2", "City", "State", "Country", "Zip Code",
  "Email Address",
];
/** A column of a holder's personal details inside a table, as 0.7's ledgers have: listed, never read. */
const PERSONAL = ["State of Residence"];
/** Titles above a table, or above the footnotes, matched in any case: a column's cells stop at the next one. */
const TITLES = [
  "Financing History", "409A Valuations", "Stock Plan History", "Stock Plan Details", "Split/Combination Adjustment", "Split Adjustment", "Shareholder Groups",
  "Notes", "Outstanding Convertible Securities", "Additional Information", "Voting Power by Stakeholder",
];
const isTitle = (text: string) => TITLES.some((t) => t.toLowerCase() === text.toLowerCase());

/** Every header the format writes, of any kind of tab. */
const HEADER_NAMES: ReadonlySet<string> = new Set([...Object.values(HEADERS).flat(), ...Object.values(OLDER).flat(), ...VOTING, ...ADDITIONAL, ...PERSONAL]);

/** Every name the format itself writes that the report may print: tab names, headers and titles. */
export const FORMAT_NAMES: ReadonlySet<string> = new Set([...TABS, ...HEADER_NAMES, ...TITLES]);

/** The headers on a per-holder tab whose text includes the company's own names, by the kind of column they head. */
const PATTERNS: [RegExp, string][] = [
  [/ \(outstanding\)(?: \(~?[0-9.]+\))?$/, "class columns (outstanding)"],
  [/ \(as converted\)$/, "class columns (as converted)"],
  [/ Non-Plan Awards$/, "non-plan award columns"],
  [/ Options$/, "option columns"],
  [/ Warrants$/, "warrant columns"],
  [/ Stock$/, "class columns"],
];

/** A header as the reader matches it: spaces and line breaks run together, ends trimmed, footnote marks dropped. */
export function normalHeader(text: string): string {
  return text.replace(/\s+/g, " ").trim().replace(/\s*\*+$/, "").trim();
}

const row = (c: OcxCell) => Number(/\d+$/.exec(c.address)![0]);
const column = (c: OcxCell) => {
  let n = 0;
  for (const ch of /^[A-Z]+/.exec(c.address)![0]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
};

/** Significant digits in a number as Excel stored it: 15 or fewer for one typed in, up to 17 for one computed. */
function digits(text: string): number {
  return text.replace(/^-/, "").replace(/[eE].*$/, "").replace(".", "").replace(/^0+/, "").replace(/0+$/, "").length;
}

interface Kinds {
  numbers: number;
  long: number;
  dayCounts: number;
  isoDates: number;
  text: number;
  dotted: number;
  dashed: number;
  booleans: number;
  errors: number;
  formulas: number;
  noValue: number;
  zeros: number;
  empty: number;
}

const none = (): Kinds => ({ numbers: 0, long: 0, dayCounts: 0, isoDates: 0, text: 0, dotted: 0, dashed: 0, booleans: 0, errors: 0, formulas: 0, noValue: 0, zeros: 0, empty: 0 });

function add(k: Kinds, c: OcxCell): void {
  if (c.formula) {
    k.formulas++;
    if (c.text === "") k.noValue++;
    // A tool that writes formulas without working them out may save 0 for each (XlsxWriter does), and that 0
    // can't be told from a real one. The count shows how many could be (Jordan, 06c review).
    else if (/^-?(?:0+\.?0*|\.0+)(?:[eE][-+]?\d+)?$/.test(c.text)) k.zeros++;
  }
  if (c.text === "") return;
  if (c.kind === "number") {
    k.numbers++;
    if (digits(c.text) > 15) k.long++;
  } else if (c.kind === "date") {
    if (/^-?[0-9.]+$/.test(c.text)) k.dayCounts++;
    else k.isoDates++;
  } else if (c.kind === "text") {
    k.text++;
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(c.text.trim())) k.dotted++;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(c.text.trim())) k.dashed++;
  } else if (c.kind === "boolean") k.booleans++;
  else k.errors++;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function describe(k: Kinds, nothing = "nothing below it"): string {
  const parts: string[] = [];
  if (k.numbers) parts.push(`${plural(k.numbers, "number")} (${k.numbers - k.long} with 15 digits or fewer, ${k.long} with 16 or 17)`);
  if (k.dayCounts || k.isoDates) parts.push(`${plural(k.dayCounts + k.isoDates, "date")} (${k.dayCounts} as day counts, ${k.isoDates} as ISO text)`);
  if (k.text) parts.push(`${k.text} text${k.dotted || k.dashed ? ` (${k.dotted} as YYYY.MM.DD, ${k.dashed} as YYYY-MM-DD, ${k.text - k.dotted - k.dashed} other)` : ""}`);
  if (k.booleans) parts.push(plural(k.booleans, "true or false", "true or false"));
  if (k.errors) parts.push(plural(k.errors, "error"));
  if (k.formulas) parts.push(`${plural(k.formulas, "formula")}${k.noValue ? `, ${k.noValue} with no saved value` : ""}${k.zeros ? `, ${k.zeros} saved as 0` : ""}`);
  if (k.empty) parts.push(`${k.empty} empty`);
  return parts.length > 0 ? parts.join(", ") : nothing;
}

function merge(into: Kinds, k: Kinds): void {
  for (const key of Object.keys(into) as (keyof Kinds)[]) into[key] += k[key];
}

/** What one tab of a kind the format names holds: each header found, with the kinds of cell below it. */
interface Findings {
  found: Map<string, Kinds>;
  kinds: Map<string, { columns: number; kinds: Kinds }>;
  personal: Set<string>;
  blocks: Set<string>;
}

/** `known` is every header recognized on the tab. */
function tabFindings(sheet: OcxSheet, known: ReadonlySet<string>, perHolder: boolean): Findings {
  const byRow = new Map<number, Map<number, OcxCell>>();
  for (const c of sheet.cells) {
    if (!byRow.has(row(c))) byRow.set(row(c), new Map());
    byRow.get(row(c))!.set(column(c), c);
  }
  const rows = [...byRow.keys()].sort((a, b) => a - b);
  const header = (c: OcxCell | undefined) => (c?.kind === "text" ? normalHeader(c.text) : null);
  const isHeaderRow = (r: number) => [...byRow.get(r)!.values()].some((c) => { const h = header(c); return h != null && (known.has(h) || VOTING.includes(h) || ADDITIONAL.includes(h)); });
  const isTitleRow = (r: number) => !isHeaderRow(r) && [...byRow.get(r)!.values()].some((c) => isTitle(header(c) ?? ""));
  const stops = rows.filter((r) => isHeaderRow(r) || isTitleRow(r));
  const last = rows.length > 0 ? rows[rows.length - 1]! : 0;

  const found = new Map<string, Kinds>();
  const personal = new Set<string>();
  const kinds = new Map<string, { columns: number; kinds: Kinds }>();
  const blocks = new Set<string>();
  for (const r of rows.filter(isHeaderRow)) {
    const cells = byRow.get(r)!;
    const stop = stops.find((s) => s > r) ?? last + 1;
    // A header row's runs of adjacent cells, each one table: a run with a known header is read.
    const columns = [...cells.keys()].sort((a, b) => a - b);
    const runs: number[][] = [];
    for (const col of columns) {
      const run = runs[runs.length - 1];
      if (run && run[run.length - 1] === col - 1) run.push(col);
      else runs.push([col]);
    }
    for (const run of runs) {
      const headers = run.map((col) => header(cells.get(col)));
      if (headers.some((h) => h != null && ADDITIONAL.includes(h))) {
        blocks.add("Additional Information: not read");
        continue;
      }
      if (headers.some((h) => h != null && VOTING.includes(h))) {
        blocks.add("Voting power by stakeholder: set aside");
        continue;
      }
      if (!headers.some((h) => h != null && known.has(h))) continue;
      const below = rows.filter((x) => x > r && x < stop && run.some((col) => byRow.get(x)!.has(col)));
      run.forEach((col, i) => {
        const h = headers[i];
        if (h != null && PERSONAL.includes(h)) {
          personal.add(h);
          return;
        }
        const k = none();
        for (const x of below) {
          const c = byRow.get(x)!.get(col);
          if (c) add(k, c);
          else k.empty++;
        }
        if (h != null && known.has(h)) {
          if (found.has(h)) merge(found.get(h)!, k);
          else found.set(h, k);
          return;
        }
        const kind = (perHolder && h != null ? PATTERNS.find(([re]) => re.test(h))?.[1] : undefined) ?? "other columns";
        const entry = kinds.get(kind) ?? { columns: 0, kinds: none() };
        entry.columns++;
        merge(entry.kinds, k);
        kinds.set(kind, entry);
      });
    }
  }

  return { found, kinds, personal, blocks };
}

/** Several tabs' findings as one: ledgers of one kind are reported together. */
function mergeFindings(all: Findings[]): Findings {
  const into: Findings = { found: new Map(), kinds: new Map(), personal: new Set(), blocks: new Set() };
  for (const f of all) {
    for (const [h, k] of f.found) {
      if (!into.found.has(h)) into.found.set(h, none());
      merge(into.found.get(h)!, k);
    }
    for (const [kind, entry] of f.kinds) {
      const sum = into.kinds.get(kind) ?? { columns: 0, kinds: none() };
      sum.columns += entry.columns;
      merge(sum.kinds, entry.kinds);
      into.kinds.set(kind, sum);
    }
    f.personal.forEach((h) => into.personal.add(h));
    f.blocks.forEach((b) => into.blocks.add(b));
  }
  return into;
}

/** A tab's lines, or a group of ledgers': the headers with something under them, those empty throughout, and what wasn't found. */
function render(label: string, f: Findings, expected: readonly string[]): string[] {
  const lines = [`${label}:`];
  const empty: string[] = [];
  for (const [h, k] of f.found) {
    if (describe({ ...k, empty: 0 }) === "nothing below it") empty.push(h);
    else lines.push(`  ${h}: ${describe(k)}`);
  }
  for (const [kind, { columns, kinds: k }] of f.kinds) lines.push(`  ${kind}: ${columns}; ${describe(k)}`);
  if (empty.length > 0) lines.push(`  empty throughout: ${empty.join(", ")}`);
  for (const h of f.personal) lines.push(`  ${h}: not read`);
  for (const b of f.blocks) lines.push(`  ${b}`);
  const missing = expected.filter((h) => !f.found.has(h) && !f.personal.has(h));
  if (f.found.size === 0) lines.push("  no known header found");
  else if (missing.length > 0) lines.push(`  not found: ${missing.join(", ")}`);
  return lines;
}

/**
 * A tab the format doesn't name, such as one of Carta's own or the securities ledger report's: named by its position,
 * never its name, which can name the company, and each column by its letter, with the kinds of cell in it. Its header
 * row is the first row with any of the format's headers in it; a title, such as "Additional Information" above a
 * block, isn't one. A column's cell there is printed as its header only when it's one of those names; any other text,
 * headings and titles included, is counted as text. A column headed by a holder's personal details isn't read (Jordan,
 * 06c review).
 */
function otherTabLines(sheet: OcxSheet, position: number): string[] {
  const lines = [`tab ${position}:`];
  if (sheet.cells.length === 0) return [...lines, "  no cells"];
  const named = (c: OcxCell) => c.kind === "text" && HEADER_NAMES.has(normalHeader(c.text));
  const headerRow = Math.min(...sheet.cells.filter(named).map(row));
  const rowsWithCells = [...new Set(sheet.cells.map(row))].sort((a, b) => a - b);
  const byColumn = new Map<number, OcxCell[]>();
  for (const c of sheet.cells) byColumn.set(column(c), [...(byColumn.get(column(c)) ?? []), c]);
  for (const [col, cells] of [...byColumn].sort(([a], [b]) => a - b)) {
    const header = cells.find((c) => row(c) === headerRow && named(c));
    const name = header ? normalHeader(header.text) : null;
    const label = `column ${columnLetters(col)}${name ? ` (${name})` : ""}`;
    if (name != null && (ADDITIONAL.includes(name) || PERSONAL.includes(name))) {
      lines.push(`  ${label}: not read`);
      continue;
    }
    const k = none();
    for (const c of cells) if (c !== header) add(k, c);
    const rows = cells.map(row).sort((a, b) => a - b);
    const have = new Set(rows);
    k.empty = rowsWithCells.filter((r) => r > rows[0]! && r < rows[rows.length - 1]! && !have.has(r)).length;
    lines.push(`  ${label}: ${describe(k, "nothing else")}`);
  }
  return lines;
}

/** A ledger named for a class or a plan, by its headers: a row with its kind's first header and two more of them. */
function ledgerKind(sheet: OcxSheet): string | null {
  const byRow = new Map<number, Set<string>>();
  for (const c of sheet.cells) if (c.kind === "text") byRow.set(row(c), (byRow.get(row(c)) ?? new Set()).add(normalHeader(c.text)));
  for (const texts of byRow.values()) {
    for (const [kind, first] of NAMED_LEDGERS) if (texts.has(first) && HEADERS[kind]!.filter((h) => texts.has(h)).length >= 3) return kind;
  }
  return null;
}

/** The report, line by line: counts, kinds and the format's own names only (O15). */
export function structureLines(book: OcxWorkbook, version: string): string[] {
  const lines = [`spillpoint ${version}: an OCX workbook's structure, in counts and kinds`];
  lines.push(`Dates: the ${book.dateSystem} system`);
  const labels = book.sheets
    .flatMap((s) => s.cells)
    .map((c) => (c.kind === "text" ? /^OCX Version\s+(\S+)$/.exec(c.text.trim()) : null))
    .filter((m) => m != null);
  lines.push(`Version label: ${labels.length === 0 ? "none" : labels.map((m) => (/^\d+(\.\d+)*$/.test(m[1]!) ? `OCX Version ${m[1]}` : "other")).join(", ")}`);
  // Each tab's kind: the format's by its name, a ledger named for a class or a plan by its headers, any other none.
  const ledgers = book.sheets.map((s) => (TABS.includes(s.name) ? null : ledgerKind(s)));
  const named = (s: OcxSheet, i: number) => (TABS.includes(s.name) ? s.name : ledgers[i] ? `tab ${i + 1} (${ledgers[i]})` : `tab ${i + 1}`);
  lines.push(`Tabs: ${book.sheets.length > 0 ? book.sheets.map(named).join(", ") : "none"}`);
  // 0.7's tabs say which Context headers to look for: its plan history, and Financing History in case it's there.
  const layout07 = book.sheets.some((s, i) => s.name === "Summary View" || s.name === "Stakeholder View" || ledgers[i] != null);
  const contextKnown = new Set([...HEADERS.Context!, ...HEADERS["Context 0.7"]!, ...OLDER.Context!]);
  const knownOf = (kind: string) => new Set([...HEADERS[kind]!, ...(OLDER[kind] ?? [])]);
  const reported = new Set<string>();
  book.sheets.forEach((sheet, i) => {
    const kind = ledgers[i];
    if (sheet.name === "Voting by SH Group") lines.push(`${sheet.name}: set aside`);
    else if (sheet.name === "Context") lines.push(...render("Context", tabFindings(sheet, contextKnown, false), HEADERS[layout07 ? "Context 0.7" : "Context"]!));
    else if (TABS.includes(sheet.name)) lines.push(...render(sheet.name, tabFindings(sheet, knownOf(sheet.name), PER_HOLDER.includes(sheet.name)), HEADERS[sheet.name]!));
    else if (kind) {
      // Every ledger of a kind together, where the first of them comes: "class ledgers (tabs 3, 4, 5)".
      if (reported.has(kind)) return;
      reported.add(kind);
      const group = book.sheets.flatMap((s, j) => (ledgers[j] === kind ? [{ s, j }] : []));
      const label = group.length === 1 ? `${kind} (tab ${group[0]!.j + 1})` : `${kind}s (tabs ${group.map(({ j }) => j + 1).join(", ")})`;
      lines.push(...render(label, mergeFindings(group.map(({ s }) => tabFindings(s, knownOf(kind), false))), HEADERS[kind]!));
    } else lines.push(...otherTabLines(sheet, i + 1));
  });
  return lines;
}
