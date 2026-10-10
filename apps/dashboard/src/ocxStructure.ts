// The cell-kinds script's report (0.6.0, 06c; ASSUMPTIONS OX2): what kinds of cell an OCX workbook's columns hold,
// with counts, so a real export can settle what its header rows can't (values or formulas, how dates are written, how
// many digits a number has) without anyone sending the file. Run by scripts/ocx-structure.mjs.
//
// Under O15's rule: counts and kinds, and the format's own tab names and headers, which are its interface. Never a
// value, never a header the company wrote (a class or a plan named in a heading), and nothing from the Additional
// Information block, where holders' addresses are.

import type { OcxCell, OcxSheet, OcxWorkbook } from "spillpoint";


/** The tabs OCX 0.3 to 0.5 have, as the Coalition's reference workbooks name them. */
const TABS = ["Summary Snapshot", "Stakeholder Snapshot", "Detailed Snapshot", "Voting by SH Group", "Context"];

/** The headers each tab's tables have in 0.4 and 0.5: the ones a reader matches, and the script looks for. */
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
    "Round", "Initial Closing Date", "Most Recent Closing Date", "Original Issue Price", "Adjusted Conversion Price", "Conversion Ratio",
    "Liquidation Multiple", "Participating (Y/N)", "Participation Cap", "Valuation Date", "Price Per Share (Common)", "Options Outstanding at Valuation",
    "Valuation Firm", "Plan Name", "Date", "Action", "Stockholder Approval Date", "Number of Shares", "Total Shares Reserved", "Total Reserved",
    "Total Granted", "Outstanding Shares/Exercised Options", "Outstanding Options", "Outstanding RSUs", "Shares Returned to Plan",
    "Shares Available for Grant", "Classes/Series Affected", "Original Shares", "Resulting Shares",
  ],
};

/** 0.3's headers where 0.4 renamed them: recognized, but not looked for. */
const OLDER: Record<string, readonly string[]> = { "Summary Snapshot": ["Shares Authorized", "Amount"], Context: ["Split Date"] };

/** A block on the per-holder tab that's set aside: voting power by holder. */
const VOTING = ["All Common", "All Preferred (as converted)"];
/**
 * The Additional Information block: holders' details, which nothing reads. Its last header, "Notes", is also the
 * footnotes' title, so the block is known by the others.
 */
const ADDITIONAL = [
  "Primary Stakeholder Type", "Secondary Stakeholder Types", "Mailing Address Line 1", "Mailing Address Line 2", "City", "State", "Country", "Zip Code",
  "Email Address",
];
/** Titles above a table, or above the footnotes: a column's cells stop at the next one. */
const TITLES = [
  "Financing History", "409A Valuations", "Stock Plan History", "Stock Plan Details", "Split/Combination Adjustment", "Split Adjustment", "Shareholder Groups",
  "Notes", "Outstanding Convertible Securities", "Additional Information",
];

/** Every name the format itself writes that the report may print: tab names, headers and titles. */
export const FORMAT_NAMES: ReadonlySet<string> = new Set([
  ...TABS, ...Object.values(HEADERS).flat(), ...Object.values(OLDER).flat(), ...VOTING, ...ADDITIONAL, ...TITLES,
]);

/** The headers on the per-holder tab whose text includes the company's own names, by the kind of column they head. */
const PATTERNS: [RegExp, string][] = [
  [/ \(outstanding\)(?: \(~?[0-9.]+\))?$/, "class columns (outstanding)"],
  [/ \(as converted\)$/, "class columns (as converted)"],
  [/ Non-Plan Awards$/, "non-plan award columns"],
  [/ Options$/, "option columns"],
  [/ Warrants$/, "warrant columns"],
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
  empty: number;
}

const none = (): Kinds => ({ numbers: 0, long: 0, dayCounts: 0, isoDates: 0, text: 0, dotted: 0, dashed: 0, booleans: 0, errors: 0, formulas: 0, noValue: 0, empty: 0 });

function add(k: Kinds, c: OcxCell): void {
  if (c.formula) {
    k.formulas++;
    if (c.text === "") k.noValue++;
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

function describe(k: Kinds): string {
  const parts: string[] = [];
  if (k.numbers) parts.push(`${plural(k.numbers, "number")} (${k.numbers - k.long} with 15 digits or fewer, ${k.long} with 16 or 17)`);
  if (k.dayCounts || k.isoDates) parts.push(`${plural(k.dayCounts + k.isoDates, "date")} (${k.dayCounts} as day counts, ${k.isoDates} as ISO text)`);
  if (k.text) parts.push(`${k.text} text${k.dotted || k.dashed ? ` (${k.dotted} as YYYY.MM.DD, ${k.dashed} as YYYY-MM-DD, ${k.text - k.dotted - k.dashed} other)` : ""}`);
  if (k.booleans) parts.push(plural(k.booleans, "true or false", "true or false"));
  if (k.errors) parts.push(plural(k.errors, "error"));
  if (k.formulas) parts.push(`${plural(k.formulas, "formula")}${k.noValue ? `, ${k.noValue} with no saved value` : ""}`);
  if (k.empty) parts.push(`${k.empty} empty`);
  return parts.length > 0 ? parts.join(", ") : "nothing below it";
}

function merge(into: Kinds, k: Kinds): void {
  for (const key of Object.keys(into) as (keyof Kinds)[]) into[key] += k[key];
}

/** One known tab's lines: each header found, with the kinds of cell below it, then what wasn't found. */
function tabLines(sheet: OcxSheet): string[] {
  const tab = sheet.name;
  const known = new Set([...(HEADERS[tab] ?? []), ...(OLDER[tab] ?? [])]);
  const perHolder = tab === "Stakeholder Snapshot" || tab === "Detailed Snapshot";
  const byRow = new Map<number, Map<number, OcxCell>>();
  for (const c of sheet.cells) {
    if (!byRow.has(row(c))) byRow.set(row(c), new Map());
    byRow.get(row(c))!.set(column(c), c);
  }
  const rows = [...byRow.keys()].sort((a, b) => a - b);
  const header = (c: OcxCell | undefined) => (c?.kind === "text" ? normalHeader(c.text) : null);
  const isHeaderRow = (r: number) => [...byRow.get(r)!.values()].some((c) => { const h = header(c); return h != null && (known.has(h) || VOTING.includes(h) || ADDITIONAL.includes(h)); });
  const isTitleRow = (r: number) => !isHeaderRow(r) && [...byRow.get(r)!.values()].some((c) => TITLES.includes(header(c) ?? ""));
  const stops = rows.filter((r) => isHeaderRow(r) || isTitleRow(r));
  const last = rows.length > 0 ? rows[rows.length - 1]! : 0;

  const found = new Map<string, Kinds>();
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
        const k = none();
        for (const x of below) {
          const c = byRow.get(x)!.get(col);
          if (c) add(k, c);
          else k.empty++;
        }
        const h = headers[i];
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

  const lines = [`${tab}:`];
  for (const [h, k] of found) lines.push(`  ${h}: ${describe(k)}`);
  for (const [kind, { columns, kinds: k }] of kinds) lines.push(`  ${kind}: ${columns}; ${describe(k)}`);
  for (const b of blocks) lines.push(`  ${b}`);
  const missing = (HEADERS[tab] ?? []).filter((h) => !found.has(h));
  if (found.size === 0) lines.push("  no known header found");
  else if (missing.length > 0) lines.push(`  not found: ${missing.join(", ")}`);
  return lines;
}

/** The report, line by line: counts, kinds and the format's own names only (O15). */
export function structureLines(book: OcxWorkbook, version: string): string[] {
  const lines = [`spillpoint ${version}: an OCX workbook's structure, in counts and kinds`];
  lines.push(`Dates: the ${book.dateSystem} system`);
  const labels = book.sheets
    .filter((s) => TABS.includes(s.name))
    .flatMap((s) => s.cells)
    .map((c) => (c.kind === "text" ? /^OCX Version\s+(\S+)$/.exec(c.text.trim()) : null))
    .filter((m) => m != null);
  lines.push(`Version label: ${labels.length === 0 ? "none" : labels.map((m) => (/^\d+(\.\d+)*$/.test(m[1]!) ? `OCX Version ${m[1]}` : "other")).join(", ")}`);
  const knownTabs = book.sheets.filter((s) => TABS.includes(s.name));
  lines.push(`Tabs: ${knownTabs.length > 0 ? knownTabs.map((s) => s.name).join(", ") : "none known"}; other tabs ${book.sheets.length - knownTabs.length}`);
  for (const sheet of knownTabs) {
    if (sheet.name === "Voting by SH Group") lines.push(`${sheet.name}: set aside`);
    else lines.push(...tabLines(sheet));
  }
  return lines;
}
