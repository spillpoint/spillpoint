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
 * Pending: cases the engine runs before the page reads them. From f04a, 0.4.0's management fees (F29 to F32) were here
 * until f04c emptied it; from f05a, 0.5.0's investments and carry deal by deal (F33 to F37), cases 33 to 37, until f05c
 * emptied it. test/pending.test.ts fails if a case folder is neither run nor pending (nor a refusal set), or if this
 * list names a folder that doesn't exist.
 */
export const PENDING: readonly string[] = [];
/** The cases the page's tests run as a fund. */
export const RUN_CASES = CASE_FOLDERS.filter((d) => existsSync(join(CASES_DIR, d, "inputs.json")) && !PENDING.includes(d));
/** The refusal sets, which only the engine's tests run (FC7). */
export const REFUSAL_SETS = CASE_FOLDERS.filter((d) => existsSync(join(CASES_DIR, d, "fixtures")) && !PENDING.includes(d));
