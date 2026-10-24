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
 * Pending: spillpoint-fund 0.3.0's cases, the classes and later closes (F22 to F28), added in f03a before the page
 * reads them. The page's case tests skip them until f03c, the page's step, which empties this list.
 * test/pending.test.ts fails if a case folder is neither run nor pending (nor a refusal set), or if this list names a
 * folder that doesn't exist.
 */
export const PENDING: readonly string[] = [
  "fund-22-classes-fee-carry",
  "fund-23-classes-pref-catch-up",
  "fund-24-classes-clawback",
  "fund-25-later-close",
  "fund-26-closes-and-classes",
  "fund-27-classes-refused",
  "fund-28-classes-clawback-steps",
];
/** The cases the page's tests run as a fund. */
export const RUN_CASES = CASE_FOLDERS.filter((d) => existsSync(join(CASES_DIR, d, "inputs.json")) && !PENDING.includes(d));
/** The refusal sets, which only the engine's tests run (FC7). */
export const REFUSAL_SETS = CASE_FOLDERS.filter((d) => existsSync(join(CASES_DIR, d, "fixtures")) && !PENDING.includes(d));
