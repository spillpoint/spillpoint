// Reads the locked case files for engine tests. The engine itself does no I/O;
// tests read the JSON and hand it over.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import type { CapTableResolver } from "../../src/index.js";

export const CASES_DIR = resolve(import.meta.dirname, "../../../../cases");

export const ALL_CASES: string[] = readdirSync(CASES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

/** The cases M2 must pass: edge cases 1 through 7 and Millrace's exit. */
export const M2_CASES: string[] = ALL_CASES.filter((name) => /^edge-0[1-7]/.test(name) || name === "millrace");

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
