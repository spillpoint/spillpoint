// Reads the locked case files for engine tests. The engine itself does no I/O;
// tests read the JSON and hand it over.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import type { Decimal } from "decimal.js";

import { parseExact } from "../../src/index.ts";
import type { CapTableResolver, Decisions } from "../../src/index.ts";

export const CASES_DIR = resolve(import.meta.dirname, "../../../../cases");

export const ALL_CASES: string[] = readdirSync(CASES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
/** OCF cases (M6, C16): an OCF package and its import, with no inputs.json. The engine reads them from 04d. */
export const OCF_CASES: string[] = ALL_CASES.filter((name) => name.startsWith("ocf-"));

/**
 * The exit cases the engine runs: edge cases 1 through 7 and Millrace's exit since M2, case 8's warrant since M5d,
 * case 9's dividends since M5e, case 23's sale after a round with dividends (R30) since M5e3, case 10's
 * carve-outs since M5f, case 12's SAFEs at a sale since M5g, case 13's notes at a sale since M5h, and case 11's
 * earnout since M5i, and case 11b's earnout with a negative take since its case (0.3.0 work, 03a). Cases 12i and 13h,
 * a SAFE and a note with no cap beside capped participating preferred, and case 24, a carve-out given on the sale,
 * since 03e, case 8b, a warrant coming into the money on a curve, since 03f, and case 25, the cap table OCF case 12's
 * ledger leaves, since its case (04c). None is left out.
 */
export const NOT_YET: readonly string[] = [];

/**
 * Round cases whose first event is a starting cap table (R31, 0.5.0): 26 and 27, written in 05b1. The engine reads a
 * starting table from 05b2; until then each is refused, and the round tests leave them out.
 */
export const FROM_A_STARTING_TABLE: string[] = ALL_CASES.filter((name) => {
  if (name.startsWith("ocf-")) return false;
  const inputs = readCaseFile(name, "inputs.json") as { events?: { type: string }[] };
  return inputs.events?.[0]?.type === "start";
});
export const EXIT_CASES: string[] = ALL_CASES.filter(
  (name) =>
    (/^edge-(0[1-9]|1[0-3])/.test(name) || ["edge-23-dividends-from-a-round", "edge-24-carve-out-on-the-sale", "edge-25-ocf-ledger", "millrace"].includes(name)) &&
    !NOT_YET.includes(name),
);

export function readCaseFile(name: string, file: "inputs.json" | "expected.json"): unknown {
  return JSON.parse(readFileSync(join(CASES_DIR, name, file), "utf8"));
}

interface ExpectedCapTables {
  cap_tables?: { after_event: string; cap_table: unknown }[];
}

/** C2: a case whose exit names a cap table by event gets it from its own expected.json. */
export function capTablesOf(name: string): CapTableResolver {
  const expected = readCaseFile(name, "expected.json") as ExpectedCapTables;
  return (eventId) => expected.cap_tables?.find((t) => t.after_event === eventId)?.cap_table;
}

// ---------- expected payouts ----------


export interface ExpectedLine {
  holder: string;
  security: string;
  amount: string;
}

export interface ExpectedOutcome {
  decisions: Record<string, string>;
  common_price_per_share: string;
  lines: ExpectedLine[];
  holder_totals: Record<string, string>;
  class_totals: Record<string, string>;
}

export interface ExpectedPoint {
  /** The exit value as recorded, to the cent. */
  label: string;
  /** The exact exit value: a breakpoint's exact fraction, or the listed value. */
  exitValue: Decimal;
  tags: string[];
  equilibria: ExpectedOutcome[];
}

interface ExpectedExit {
  exit: {
    breakpoints: { exit_value: string; exact: string }[];
    payouts: { exit_value: string; tags: string[]; equilibria: ExpectedOutcome[] }[];
  };
}

/** Every point expected.json reports, with breakpoints at their exact value rather than the cent they display. */
export function expectedPoints(name: string): ExpectedPoint[] {
  const { exit } = readCaseFile(name, "expected.json") as ExpectedExit;
  const exact = new Map(exit.breakpoints.map((b) => [b.exit_value, b.exact]));
  return exit.payouts.map((p) => ({
    label: p.exit_value,
    exitValue: parseExact(p.tags.includes("breakpoint") ? exact.get(p.exit_value) : p.exit_value, p.exit_value),
    tags: p.tags,
    equilibria: p.equilibria,
  }));
}

/** expected.json's decisions in the engine's form. A conversion group is named by its series joined with "+"; a SAFE taking its Conversion Amount is "converted". */
export function decisionsFrom(recorded: Record<string, string>): Decisions {
  const converted = new Set<string>();
  const exercised = new Set<string>();
  for (const [player, decision] of Object.entries(recorded)) {
    if (decision === "converts") for (const sid of player.split("+")) converted.add(sid);
    else if (decision === "conversion_amount") converted.add(player);
    else if (decision === "exercised") exercised.add(player);
    else if (!["keeps_preference", "not_exercised", "cash_out_amount", "repayment"].includes(decision)) throw new Error(`unknown decision ${decision}`);
  }
  return { converted, exercised };
}
