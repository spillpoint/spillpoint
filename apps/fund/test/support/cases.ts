// The fund cases the page's tests run (packages/fund/cases, FC2): every case with an inputs.json, less the pending
// ones. The refusal sets are the engine's to run (FC7); the page's tests never have.

import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const CASES_DIR = resolve(import.meta.dirname, "../../../../packages/fund/cases");
/** Every fund case folder. */
export const CASE_FOLDERS = readdirSync(CASES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("fund-"))
  .map((d) => d.name)
  .sort();
/**
 * Pending: spillpoint-fund 0.2.0's cases, the LPs (F19 to F21), added in f02a before the page reads them. The page's
 * case tests skip them until f02c, the LPs tab, which empties this list. test/pending.test.ts fails if a case folder
 * is neither run nor pending (nor a refusal set), or if this list names a folder that doesn't exist.
 */
export const PENDING: readonly string[] = ["fund-17-lps-three", "fund-18-lps-thirds", "fund-19-lps-clawback", "fund-20-lps-spv", "fund-21-lps-refused"];
/** The cases the page's tests run as a fund. */
export const RUN_CASES = CASE_FOLDERS.filter((d) => existsSync(join(CASES_DIR, d, "inputs.json")) && !PENDING.includes(d));
/** The refusal sets, which only the engine's tests run (FC7). */
export const REFUSAL_SETS = CASE_FOLDERS.filter((d) => existsSync(join(CASES_DIR, d, "fixtures")) && !PENDING.includes(d));
