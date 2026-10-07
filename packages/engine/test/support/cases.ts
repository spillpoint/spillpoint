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

/** The exit cases the engine runs: edge cases 1 through 7 and Millrace's exit since M2, case 8's warrant since M5d, and case 9's dividends since M5e. */
export const EXIT_CASES: string[] = ALL_CASES.filter((name) => /^edge-0[1-9]/.test(name) || name === "millrace");

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

/** expected.json's decisions in the engine's form. A conversion group is named by its series joined with "+". */
export function decisionsFrom(recorded: Record<string, string>): Decisions {
  const converted = new Set<string>();
  const exercised = new Set<string>();
  for (const [player, decision] of Object.entries(recorded)) {
    if (decision === "converts") for (const sid of player.split("+")) converted.add(sid);
    else if (decision === "exercised") exercised.add(player);
    else if (decision !== "keeps_preference" && decision !== "not_exercised") throw new Error(`unknown decision ${decision}`);
  }
  return { converted, exercised };
}
