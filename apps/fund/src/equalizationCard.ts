// The equalization card's figures (plan, "Payouts", f03c): at each later close, what each LP in by then paid in or got
// back and the interest it paid or received (F25, F26), and from f04b each joiner's back fees, paid to the manager (F29,
// F31), then the same for all the closes together. Each amount rounded down to the cent, as it would be paid, with what
// rounding down leaves in each column, as the LPs' card has it. Nothing here is fund arithmetic: every amount is the
// engine's `equalization(fund)`, and this only rounds it and adds up. Also the card as a CSV file.

import { D, toCents } from "spillpoint-fund";
import type { Equalization, EqualizationAmounts } from "spillpoint-fund";

import { slug } from "./file.ts";
import { dateText } from "./format.ts";
import { csvText, downToCent, LEFTOVER, TOTAL } from "./lpsCard.ts";

export const EQUALIZATION_HEADINGS = ["LP", "Paid in", "Got back", "Interest paid", "Interest received", "Back fees"];

/** One block of the card: a close, or all of them. */
export interface EqualizationBlock {
  /** "1 Apr 2022: Birchwood Family Office joins", or "All the closes together". */
  heading: string;
  /** The close's date, YYYY-MM-DD, or null for all the closes. */
  date: string | null;
  /** Each LP in by then, its five amounts rounded down to the cent. */
  rows: { name: string; amounts: D[] }[];
  /** In each column, its exact total with `toCents` less its rounded amounts: never negative, at most a cent an LP. */
  leftover: D[];
  /** In each column, its exact total with `toCents`. */
  total: D[];
}

/** An LP's five amounts, in the card's order. */
function amountsOf(m: EqualizationAmounts): D[] {
  return [m.capitalPaid, m.capitalReturned, m.interestPaid, m.interestReceived, m.backFees];
}

/** "a, b and c". */
function listed(items: readonly string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** A block from each LP's exact amounts: each rounded down, and the leftover and total from the exact ones. */
function block(heading: string, date: string | null, lps: readonly EqualizationAmounts[]): EqualizationBlock {
  const rows = lps.map((m) => ({ name: m.name, amounts: amountsOf(m).map(downToCent) }));
  const total = EQUALIZATION_HEADINGS.slice(1).map((_, c) => new D(toCents(lps.reduce((sum, m) => sum.plus(amountsOf(m)[c]!), new D(0)))));
  const leftover = total.map((t, c) => rows.reduce((left, r) => left.minus(r.amounts[c]!), t));
  return { heading, date, rows, leftover, total };
}

/**
 * The card's blocks: each later close in date order, every LP in by then, then all the closes together, every LP. The
 * all-closes block rounds each LP's exact total, as the engine gives it, so a row there can be a cent more than its
 * rows above added up.
 */
export function equalizationBlocks(eq: Equalization): EqualizationBlock[] {
  return [
    ...eq.closes.map((c) => block(`${dateText(c.date)}: ${listed(c.joining)} ${c.joining.length === 1 ? "joins" : "join"}`, c.date, c.lps)),
    block("All the closes together", null, eq.lps),
  ];
}

/**
 * The card as a CSV file: each close's block, its date in the first column, then all the closes together, each block
 * with its leftover and total rows. Numbers without "$" or commas, as the LPs' card's CSV.
 */
export function equalizationCsv(blocks: readonly EqualizationBlock[]): string {
  const amounts = (xs: D[]) => xs.map((x) => x.toFixed(2));
  return csvText([
    ["Close", ...EQUALIZATION_HEADINGS],
    ...blocks.flatMap((b) => {
      const close = b.date ?? "All closes";
      return [...b.rows.map((r) => [close, r.name, ...amounts(r.amounts)]), [close, LEFTOVER, ...amounts(b.leftover)], [close, TOTAL, ...amounts(b.total)]];
    }),
  ]);
}

/** The CSV's name, as Save names its file: "two-later-closes-and-a-friends-and-family-class-equalization.csv". */
export function equalizationCsvName(fundName: string): string {
  return `${slug(fundName)}-equalization.csv`;
}
