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
 * Pending: cases the engine runs before the page reads them. From f04a, 0.4.0's management fees (F29 to F32): cases 25
 * and 26 worked again under F29, and the fee cases 29 to 32. f04c empties it. test/pending.test.ts fails if a case folder
 * is neither run nor pending (nor a refusal set), or if this list names a folder that doesn't exist.
 */
export const PENDING: readonly string[] = [
  "fund-25-later-close",
  "fund-26-closes-and-classes",
  "fund-29-fee-schedule",
  "fund-30-fee-step-down",
  "fund-31-fee-schedule-classes-closes",
  "fund-32-fees-refused",
];
/** The cases the page's tests run as a fund. */
export const RUN_CASES = CASE_FOLDERS.filter((d) => existsSync(join(CASES_DIR, d, "inputs.json")) && !PENDING.includes(d));
/** The refusal sets, which only the engine's tests run (FC7). */
export const REFUSAL_SETS = CASE_FOLDERS.filter((d) => existsSync(join(CASES_DIR, d, "fixtures")) && !PENDING.includes(d));
